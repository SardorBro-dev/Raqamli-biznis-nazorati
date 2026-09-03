import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import SidebarIcon from "../components/SidebarIcon";
import { authApi, companyApi } from "../services/api";
import { useLanguage } from "../utils/language";
import { clearSession, getCurrentSession, getCurrentUser, getOwnerPlan, getWalletPaymentStatus, readStorage, setCurrentSession, STORAGE_KEYS } from "../utils/storage";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_DATA = AUTH_MODE === "local";

function getOwnerDetails(company, users, currentUser) {
  const owner = users.find((savedUser) => (
    savedUser.id === (company.ownerId || company.owner_id)
  ));
  const isCurrentUserOwner = company.ownerId === currentUser?.id || company.owner_id === currentUser?.id;
  const userName = owner?.name || [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") || owner?.username || (isCurrentUserOwner ? currentUser?.name || currentUser?.username : "");
  const companyOwnerName = [company.owner_name, company.ownerName, company.directorName]
    .find((name) => name && name !== "Noma'lum egasi" && name !== "Egasi ko'rsatilmagan" && name !== "Kompaniya egasi");
  return {
    name: userName || companyOwnerName || "Egasi ko'rsatilmagan",
    profileImage: company.owner_profile_image || owner?.profileImage || owner?.profile_image || "",
  };
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatUzbekPhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return `+998${groups.length ? ` ${groups.join(" ")}` : ""}`;
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const t = useLanguage();
    const [user, setUser] = useState(getCurrentUser());
    const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [companyLogos, setCompanyLogos] = useState(() => JSON.parse(localStorage.getItem("company_logos") || "{}"));
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [publicCompanies, setPublicCompanies] = useState([]);
  const [companySearch, setCompanySearch] = useState("");
  const [publicCompaniesLoading, setPublicCompaniesLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    profile_image: "",
  });
  const hasLoadedCompanies = useRef(false);

  const activePlanRecord = readStorage(STORAGE_KEYS.plans, []).find((item) => item.userId === user?.id && item.active);
  const planDaysLeft = activePlanRecord?.expiresAt
    ? Math.ceil((new Date(activePlanRecord.expiresAt).getTime() - Date.now()) / 86400000)
    : null;
  const notifications = [
    { type: "update", title: "Sayt yangilanishi", text: "Kompaniya boshqaruvi uchun yangi imkoniyatlar qo‘shildi." },
    { type: "update", title: "Yangi imkoniyat", text: "Kompaniyalarim bo‘limidan kompaniya yaratish va boshqarish mumkin." },
    ...(planDaysLeft === null ? [] : planDaysLeft <= 0
      ? [{ type: "danger", title: "Tarif muddati tugagan", text: "Xizmatlardan foydalanishni davom ettirish uchun tarifni yangilang." }]
      : (() => {
        const alertDays = [10, 5, 3, 1].find((days) => planDaysLeft <= days);
        return alertDays ? [{
          type: "warning",
          title: `Tarif tugashiga ${alertDays} kun qoldi`,
          text: "Xizmatlar uzilib qolmasligi uchun tarifni oldindan yangilang.",
        }] : [];
      })()),
  ];

  useEffect(() => {
    if (hasLoadedCompanies.current) return undefined;
    hasLoadedCompanies.current = true;
    let active = true;
    const currentUser = getCurrentUser();
    const isOwner = currentUser?.role === "owner" || currentUser?.role === "company_owner";
    if (!currentUser || !isOwner) {
      navigate("/");
      return;
    }

    setUser(currentUser);

    const loadCompanies = async () => {
      if (USE_LOCAL_DATA) {
        const savedCompanies = readStorage(STORAGE_KEYS.companies, []);
        const savedEmployees = readStorage(STORAGE_KEYS.employees, []);
        const ownerCompanies = savedCompanies.filter((company) => company.ownerId === currentUser.id);
        if (active) {
          setCompanies(ownerCompanies.map((company) => ({
            ...company,
            employeeCount: savedEmployees.filter((employee) => (
              employee.companyId === company.id && employee.status !== "fired"
            )).length,
          })));
          setLoading(false);
        }
        return;
      }

      const session = getCurrentSession();
      if (!session?.token) {
        navigate("/");
        return;
      }

      try {
        const remoteCompanies = await companyApi.getCompanies(session.token);
        if (active) {
          setCompanies(remoteCompanies.map((company) => ({
            ...company,
            ownerId: company.owner_id,
            directorName: company.owner_name,
            employeeCount: Number(company.employee_count || 0),
            plan: company.subscription_plan,
          })));
          setLoading(false);
        }
      } catch (error) {
        if (active) {
          setLoading(false);
          if (error.status === 401) {
            clearSession();
            navigate("/");
            return;
          }
          setLoadError(t.dashboardLoadError);
        }
      }
    };

    loadCompanies();
    return () => { active = false; };
  }, [navigate]);

  if (!user || loading) {
    return <div className="empty-state">{t.loading}</div>;
  }

  if (loadError) {
    return (
      <div className="empty-state dashboard-load-error">
        <strong>{loadError}</strong>
        <button type="button" className="logout-button" onClick={() => {
          clearSession();
          navigate("/");
        }}>{t.backToLogin}</button>
      </div>
    );
  }

  const openCompany = (company) => {
    localStorage.setItem("selectedCompany", JSON.stringify(company));
    navigate("/company-panel");
  };

  const openCreateCompany = () => {
    if (!getWalletPaymentStatus(user?.id)?.paid) {
      navigate("/tariffs");
      return;
    }
    navigate("/create-company");
  };

  const openOtherCompanies = async () => {
    setActiveView("other-companies");
    setCompanySearch("");
    setPublicCompaniesLoading(true);
    try {
      if (USE_LOCAL_DATA) {
        const savedCompanies = readStorage(STORAGE_KEYS.companies, []);
        const savedEmployees = readStorage(STORAGE_KEYS.employees, []);
        const savedUsers = readStorage(STORAGE_KEYS.users, []);
        setPublicCompanies(savedCompanies.map((company) => ({
          ...company,
          owner_name: getOwnerDetails(company, savedUsers, user).name,
          owner_profile_image: getOwnerDetails(company, savedUsers, user).profileImage || user.profileImage || "",
          company_logo: companyLogos[company.id] || "",
          employee_count: Number(company.employeeCount || savedEmployees.filter((employee) => employee.companyId === company.id && employee.status !== "fired").length),
        })));
      } else {
        const remoteCompanies = await companyApi.getPublicCompanies(getCurrentSession()?.token);
        const publicCompanyList = remoteCompanies.map((company) => ({
          ...company,
          owner_name: [
            company.owner_name,
            companies.find((ownCompany) => ownCompany.id === company.id)?.owner_name,
            companies.find((ownCompany) => ownCompany.id === company.id)?.directorName,
          ].find((name) => name && name !== "Noma'lum egasi" && name !== "Egasi ko'rsatilmagan" && name !== "Kompaniya egasi") || (company.owner_id === user?.id ? user.name || user.username : "Egasi ma'lumoti mavjud emas"),
          owner_profile_image: company.owner_profile_image || (company.owner_id === user?.id ? user.profileImage || "" : ""),
        }));
        const ownCompanyList = companies.map((company) => ({
          ...company,
          owner_id: company.owner_id || company.ownerId || user?.id,
          owner_name: company.owner_name || company.directorName || user?.name || user?.username,
          owner_profile_image: company.owner_profile_image || (company.ownerId === user?.id ? user.profileImage || "" : ""),
          employee_count: Number(company.employee_count || company.employeeCount || 0),
          company_logo: companyLogos[company.id] || "",
        }));
        const publicCompanyIds = new Set(publicCompanyList.map((company) => company.id));
        setPublicCompanies([...publicCompanyList, ...ownCompanyList.filter((company) => !publicCompanyIds.has(company.id))]);
      }
    } catch {
      setPublicCompanies(companies.map((company) => ({
        ...company,
        owner_id: company.owner_id || company.ownerId || user?.id,
        owner_name: company.owner_name || company.directorName || user?.name || user?.username,
        owner_profile_image: company.owner_profile_image || user?.profileImage || "",
        employee_count: Number(company.employee_count || company.employeeCount || 0),
        company_logo: companyLogos[company.id] || "",
      })));
    } finally {
      setPublicCompaniesLoading(false);
    }
  };

  const openProfile = () => {
    const nameParts = String(user.name || "").trim().split(/\s+/);
    setProfileForm({
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" "),
      username: user.username || "",
      password: "",
      profile_image: user.profileImage || "",
      phone: formatUzbekPhone(user.phone || ""),
    });
    setProfileError("");
    setPhoneCode("");
    setPhoneCodeRequested(false);
    setProfileOpen(true);
  };

  const handleProfileImage = (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Faqat rasm faylini tanlang.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Rasm hajmi 2 MB dan oshmasligi kerak.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfileForm((current) => ({ ...current, profile_image: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const session = getCurrentSession();
    if (!session?.token) return;
    setProfileLoading(true);
    setProfileError("");
    try {
      const currentPhone = session.user?.phone || user.phone || "";
      const nextPhone = String(profileForm.phone || "").replace(/[\s()-]/g, "");
      if (nextPhone && nextPhone !== currentPhone) {
        if (!/^\+998\d{9}$/.test(nextPhone)) throw new Error("Telefon raqami noto'g'ri.");
        if (!phoneCodeRequested) {
          const check = await authApi.checkTelegramPhone(nextPhone);
          if (!check.linked) throw new Error("Sizning ushbu raqamingiz faol emas. Telegram botga kirib kontaktni ulashib, qayta urinib ko'ring.");
          await authApi.requestTelegramCode(nextPhone);
          setPhoneCodeRequested(true);
          throw new Error("Telegram botga kod yuborildi. Kodni shu oynaga kiriting.");
        }
        if (phoneCode.trim().length !== 12) {
          throw new Error("Tasdiqlash kodini to'liq 12 ta belgida kiriting.");
        }
        await authApi.verifyTelegramCode(nextPhone, phoneCode);
      }
      const updated = await authApi.updateProfile({
        ...profileForm,
        phone: nextPhone,
        password: profileForm.password.trim() || null,
      }, session.token);
      const nextUser = {
        ...(session.user || user),
        id: updated.id,
        username: updated.username,
        name: [updated.first_name, updated.last_name].filter(Boolean).join(" "),
        role: updated.role,
        email: updated.email,
        phone: updated.phone || nextPhone,
        profileImage: updated.profile_image || "",
      };
      setCurrentSession({
        ...session,
        userId: updated.id,
        token: updated.access_token || session.token,
        refreshToken: updated.refresh_token || session.refreshToken,
        user: nextUser,
      });
      setUser(nextUser);
      setProfileOpen(false);
    } catch (error) {
      setProfileError(error.message || "Profilni saqlab bo'lmadi.");
    } finally {
      setProfileLoading(false);
    }
  };

  const deleteCompany = async (company) => {
    if (!window.confirm(`"${company.name}" kompaniyasini o'chirmoqchimisiz?`)) return;

    try {
      if (USE_LOCAL_DATA) {
        const savedCompanies = readStorage(STORAGE_KEYS.companies, []);
        writeStorage(STORAGE_KEYS.companies, savedCompanies.filter((item) => item.id !== company.id));
        writeStorage(STORAGE_KEYS.employees, readStorage(STORAGE_KEYS.employees, []).map((item) => (
          item.companyId === company.id ? { ...item, status: "fired", isOnline: false } : item
        )));
      } else {
        const session = getCurrentSession();
        await companyApi.delete(company.id, session?.token);
      }
      setCompanies((currentCompanies) => currentCompanies.filter((item) => item.id !== company.id));
    } catch (requestError) {
      window.alert(requestError.message || "Kompaniyani o'chirib bo'lmadi.");
    }
  };

  const activePlan = user ? getOwnerPlan(user.id) : "pro";
  const activePlanLabel = activePlan === "promaster"
    ? "PROMASTER"
    : activePlan === "pro_premium"
      ? "PRO PREMIUM"
      : activePlan === "pro"
        ? "PRO"
        : "Tanlanmagan";
  const activeEmployeeCount = companies.reduce((sum, company) => sum + Number(company.employeeCount || 0), 0);
  const employeeResultLabel = activeEmployeeCount >= 100
    ? "Yulduzli natija"
    : activeEmployeeCount >= 50
      ? "Ajoyib"
      : activeEmployeeCount >= 10
        ? "Yaxshi"
        : activeEmployeeCount > 0
          ? "Faol natija"
          : "Natija kutilmoqda";

  const logout = () => {
    clearSession();
    navigate("/");
  };

  const handleCompanyLogoChange = async (companyId, event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const logo = await readImageAsDataUrl(file);
    setCompanyLogos((currentLogos) => {
      const nextLogos = { ...currentLogos, [companyId]: logo };
      localStorage.setItem("company_logos", JSON.stringify(nextLogos));
      return nextLogos;
    });
    event.target.value = "";
  };

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <CompanyLogo className="brand-icon" />
          <div>
            <h2>Raqamli biznes</h2>
            <span>nazorati</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-title">{t.main}</span>
          <button type="button" className={`sidebar-item ${activeView === "home" ? "active" : ""}`} onClick={() => setActiveView("home")}><SidebarIcon name="home" />{t.home}</button>
          <button className="sidebar-item" onClick={openCreateCompany}><SidebarIcon name="create" />{t.createCompany}</button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-title">{t.services}</span>
          <button type="button" title={t.myCompanies} aria-label={t.myCompanies} className={`sidebar-item companies-nav-item ${activeView === "companies" ? "active" : ""}`} onClick={() => setActiveView("companies")}><span className="companies-nav-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 17h14M5 17V7l5-3 5 3v10M8 9h1M11 9h1M8 12h1M11 12h1M9 17v-3h2v3" /></svg></span>{t.myCompanies}</button>
          <button type="button" className="sidebar-item" onClick={() => navigate("/tariffs")}><SidebarIcon name="plan" />{t.tariffs}</button>
          <button type="button" className="sidebar-item" onClick={() => navigate("/monetization")}><SidebarIcon name="chart" />{t.monetization}</button>
          <button type="button" className={`sidebar-item notification-nav-item ${activeView === "notifications" ? "active" : ""}`} onClick={() => setActiveView("notifications")}><SidebarIcon name="notification" />Bildirishnomalar</button>
          <button type="button" className={`sidebar-item other-companies-nav-item ${activeView === "other-companies" ? "active" : ""}`} onClick={openOtherCompanies}><SidebarIcon name="company" />Boshqa Kompaniyalar</button>
        </div>

        <div className="sidebar-bottom">
          <button className="logout-sidebar" onClick={logout}><SidebarIcon name="logout" />{t.logout}</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          {!['companies', 'other-companies'].includes(activeView) && <div className="dashboard-greeting">
            <div className="page-location">{t.home}</div>
            <h1>Salom, {user.name}</h1>
          </div>}
          <div className="topbar-right">
            {!['companies', 'other-companies'].includes(activeView) && (
            <button className="profile profile-button" type="button" onClick={openProfile}>
              <div className="profile-avatar">
                {user.profileImage ? <img src={user.profileImage} alt="Profil rasmi" /> : user.name.slice(0, 1)}
              </div>
              <div className="profile-info">
                <strong>{user.name}</strong>
                <span>{t.owner}</span>
              </div>
            </button>
            )}
          </div>
        </header>

        <div className="dashboard-content-scroll">
        {activeView === "home" && <section className="welcome-card">
          <div className="welcome-content">
            <span className="welcome-label">RAQAMLI BIZNES NAZORATI</span>
            <h2>Kompaniyangizni <span>raqamli boshqaruv</span> bilan nazorat qiling</h2>
            <p>Jamoangizni kuzatish, xodimlar holatini ko‘rish va kompaniya faoliyatini bir joydan boshqarish.</p>
            <button className="primary-action" onClick={openCreateCompany}><SidebarIcon name="create" />{t.createCompany}</button>
          </div>
          <div className="welcome-visual">
            <div className="visual-badge badge-one">● Faol tizim</div>
            <div className="visual-badge badge-two">{companies.reduce((sum, company) => sum + Number(company.employeeCount || 0), 0)} ta xodim</div>
            <div className="visual-panel">
              <span>Monitoring</span>
              <strong>{companies.length || 0} kompaniya</strong>
            </div>
          </div>
        </section>}

        {activeView === "home" && <section className="insight-grid">
          <div className="metric-card blue">
            <span>{t.createCompany}</span>
            <strong>{companies.length}</strong>
            <small>faol tizim</small>
          </div>
          <div className="metric-card green">
            <span>{t.activeEmployees}</span>
            <strong>{activeEmployeeCount}</strong>
            <small>{employeeResultLabel}</small>
          </div>
          <div className="metric-card purple">
            <span>{t.currentPlan}</span>
            <strong>{activePlanLabel}</strong>
            <small>{activePlanLabel === "Tanlanmagan" ? "Tarif tanlanmagan" : "Faol tarif"}</small>
          </div>
        </section>}

        {activeView === "notifications" && <section className="notifications-view">
          <div className="notifications-heading">
            <div><span className="page-location">XIZMATLAR / BILDIRISHNOMALAR</span><h2>Bildirishnomalar</h2></div>
            {planDaysLeft !== null && <span className={`notification-plan-status ${planDaysLeft <= 0 ? "expired" : ""}`}>{planDaysLeft <= 0 ? "Tarif tugagan" : `${planDaysLeft} kun qoldi`}</span>}
          </div>
          <div className="notifications-list">
            {notifications.map((notification, index) => <article className={`notification-card ${notification.type}`} key={`${notification.title}-${index}`}><span className="notification-card-icon"><SidebarIcon name={notification.type === "update" ? "news" : "notification"} /></span><div><strong>{notification.title}</strong><p>{notification.text}</p></div></article>)}
          </div>
        </section>}

        {activeView === "other-companies" && <section className="other-companies-view">
          <div className="other-companies-toolbar">
            <div className="other-companies-heading"><div><span className="page-location">XIZMATLAR / UMUMIY REYTING</span><h2>Boshqa Kompaniyalar</h2></div><span className="other-companies-count">{publicCompanies.length} ta kompaniya</span></div>
            <input className="company-search-input" type="search" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Kompaniyalarni qidirish..." aria-label="Kompaniyalarni qidirish" />
          </div>
          {publicCompaniesLoading ? <p className="other-companies-empty">Kompaniyalar yuklanmoqda...</p> : (() => {
            const search = companySearch.trim().toLowerCase();
            const filteredCompanies = publicCompanies.filter((company) => `${company.name} ${company.industry}`.toLowerCase().includes(search)).sort((first, second) => Number(second.employee_count || 0) - Number(first.employee_count || 0));
            return filteredCompanies.length ? <div className="other-companies-list">{filteredCompanies.map((company, index) => <article className="other-company-card" key={company.id}><span className="other-company-rank">#{index + 1}</span><div className="other-company-identity"><div className="other-company-company-summary"><div className="other-company-media"><span>Kompaniya</span><div className="other-company-logo">{company.company_logo ? <img src={company.company_logo} alt={`${company.name} rasmi`} /> : <SidebarIcon name="company" />}</div></div><div className="other-company-details"><span className="other-company-details-label">Kompaniya ma’lumotlari</span><h3>{company.name}</h3><p>Kompaniya sohasi: {company.industry || "Ko‘rsatilmagan"}</p></div></div><div className="other-company-owner-summary"><div className="other-company-media"><span>Account</span><div className="other-company-owner-avatar">{company.owner_profile_image ? <img src={company.owner_profile_image} alt={`${company.owner_name || "Egasi"} rasmi`} /> : <SidebarIcon name="users" />}</div></div><div><span className="other-company-details-label">Egasi</span><strong className="other-company-owner-name">{company.owner_name || "Kompaniya egasi"}</strong></div></div></div><div className="other-company-employee"><span>Xodimlar</span><strong>{Number(company.employee_count || 0)}</strong></div></article>)}</div> : <p className="other-companies-empty">Qidiruv bo‘yicha kompaniya topilmadi.</p>;
          })()}
        </section>}

        {activeView === "companies" && <section className="dashboard-view-heading"><div><span className="page-location">{t.services}</span><h2>{t.myCompanies}</h2></div><button type="button" className="primary-button companies-create-button" onClick={openCreateCompany}><SidebarIcon name="create" />{t.createCompany}</button></section>}
        {activeView === "companies" && companies.length > 0 && <section className="company-grid">
          {companies.map((company) => (
            <div key={company.id} className="company-card">
              <button
                className="company-delete-button"
                type="button"
                title="Kompaniyani o'chirish"
                aria-label={`${company.name} kompaniyasini o'chirish`}
                onClick={() => deleteCompany(company)}
              >
                <svg className="company-trash-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 7h14M10 4h4l1 3H9l1-3ZM7 7l1 13h8l1-13M10 10v7M14 10v7" />
                </svg>
              </button>
              <div className="company-card-header">
                <label className="company-avatar-mini" title="Kompaniya logotipini yuklash">
                  {companyLogos[company.id] ? <img src={companyLogos[company.id]} alt={`${company.name} logotipi`} /> : <SidebarIcon name="company" />}
                  <input type="file" accept="image/*" onChange={(event) => handleCompanyLogoChange(company.id, event)} />
                </label>
                <span className="company-chip">{company.plan || "PRO"}</span>
              </div>
              <h3>{company.name}</h3>
              <p>Rahbar: {company.directorName}</p>
              <p>Xodimlar: {company.employeeCount || 0}</p>
              <p>Tarif: {company.plan || "PRO"}</p>
              <button className="primary-button" onClick={() => openCompany(company)}>{t.openCompany} →</button>
            </div>
          ))}
        </section>}
        {activeView === "companies" && companies.length === 0 && <section className="companies-empty-state">
          <button type="button" className="companies-empty-icon" title={t.createCompany} aria-label={t.createCompany} onClick={openCreateCompany}><SidebarIcon name="create" /></button>
          <h3>{t.noCompanies}</h3>
          <p>{t.noCompaniesDescription}</p>
          <button type="button" className="primary-button" onClick={() => setActiveView("home")}><SidebarIcon name="home" />{t.backToHome}</button>
        </section>}
        </div>
      </main>
      {profileOpen && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProfileOpen(false);
        }}>
          <form className="profile-modal" onSubmit={saveProfile}>
            <div className="profile-modal-header">
              <div>
                <span className="page-location">PROFIL</span>
                <h2>{t.editProfile}</h2>
              </div>
              <button className="modal-close" type="button" aria-label={t.close} onClick={() => setProfileOpen(false)}>×</button>
            </div>
            {profileError && <div className="auth-error">{profileError}</div>}
            <div className="profile-image-editor">
              <div className="profile-avatar profile-avatar-large">
                {profileForm.profile_image ? <img src={profileForm.profile_image} alt="Profil rasmi" /> : (profileForm.first_name || "A").slice(0, 1).toUpperCase()}
              </div>
              <label className="file-input-button" htmlFor="profile-image">{t.uploadImage}</label>
              <input id="profile-image" className="file-input" type="file" accept="image/*" onChange={handleProfileImage} />
            </div>
            <div className="form-row">
                <div className="input-group"><label>{t.firstName}</label><input value={profileForm.first_name} onChange={(event) => setProfileForm({ ...profileForm, first_name: event.target.value })} required /></div>
            </div>
            <div className="input-group"><label>Username</label><input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} required /></div>
            <div className="input-group"><label>Telefon raqami</label><input type="tel" value={profileForm.phone || "+998 "} onChange={(event) => setProfileForm({ ...profileForm, phone: formatUzbekPhone(event.target.value) })} placeholder="+998 90 123 45 67" inputMode="numeric" /></div>
            <div className="input-group"><label>{t.password}</label><PasswordInput value={profileForm.password} onChange={(event) => setProfileForm({ ...profileForm, password: event.target.value })} placeholder={t.passwordPlaceholder} autoComplete="new-password" maxLength="128" /></div>
            <button className="auth-button" type="submit" disabled={profileLoading}>{profileLoading ? t.creating : t.save}</button>
          </form>
        </div>
      )}
      {profileOpen && phoneCodeRequested && <div className="telegram-code-backdrop" role="presentation">
        <form className="telegram-code-modal" onSubmit={saveProfile}>
          <span className="telegram-code-kicker">TELEGRAM</span>
          <h2>Raqamni tasdiqlash</h2>
          <p>Yangi raqamga yuborilgan 12 belgili kodni kiriting.</p>
          <input type="text" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.slice(0, 12))} autoComplete="one-time-code" autoFocus />
          {profileError && <div className="auth-error">{profileError}</div>}
          <button type="submit" className="auth-button" disabled={profileLoading}>{profileLoading ? "Tekshirilmoqda..." : "Tasdiqlash"}</button>
        </form>
      </div>}
    </div>
  );
}

export default OwnerDashboard;
