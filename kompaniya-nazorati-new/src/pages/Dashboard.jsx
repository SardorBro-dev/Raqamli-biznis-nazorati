import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyLogo from "../components/CompanyLogo";
import SidebarIcon from "../components/SidebarIcon";

function Dashboard() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const savedCompanies =
      JSON.parse(localStorage.getItem("companies")) || [];

    setCompanies(savedCompanies);
  }, []);

  const createCompany = () => {
    navigate("/create-company");
  };

  const openCompany = (company) => {
    localStorage.setItem(
      "selectedCompany",
      JSON.stringify(company)
    );

    navigate("/company");
  };

  const deleteCompany = (id) => {
    const confirmDelete = window.confirm(
      "Bu kompaniyani o‘chirishni xohlaysizmi?"
    );

    if (!confirmDelete) return;

    const updatedCompanies = companies.filter(
      (company) => company.id !== id
    );

    setCompanies(updatedCompanies);

    localStorage.setItem(
      "companies",
      JSON.stringify(updatedCompanies)
    );
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <CompanyLogo className="brand-icon" />

          <div>
            <h2>Kompaniya</h2>
            <span>Nazorat tizimi</span>
          </div>
        </div>


        <div className="sidebar-section">

          <span className="sidebar-title">
            ASOSIY
          </span>

          <button className="sidebar-item active">
            <SidebarIcon name="home" />

            Bosh sahifa
          </button>

          <button
            className="sidebar-item"
            onClick={createCompany}
          >
            <SidebarIcon name="create" />

            Kompaniya yaratish
          </button>

        </div>


        <div className="sidebar-section">

          <span className="sidebar-title">
            XIZMATLAR
          </span>

          <button className="sidebar-item" onClick={() => navigate("/tariffs")}>
            <SidebarIcon name="plan" />

            Tariflar
          </button>

        </div>


        <div className="sidebar-bottom">

          <div className="sidebar-help">

            <div className="help-icon">
              ?
            </div>

            <div>
              <strong>
                Yordam kerakmi?
              </strong>

              <span>
                Qo‘llab-quvvatlash
              </span>
            </div>

          </div>


          <button
            className="logout-sidebar"
            onClick={() => navigate("/")}
          >
            <span>
              ⇥
            </span>

            Chiqish
          </button>

        </div>

      </aside>


      {/* MAIN */}
      <main className="dashboard-main">

        {/* TOPBAR */}
        <header className="topbar">

          <div>
            <div className="page-location">
              Bosh sahifa
            </div>

            <h1>
              Xush kelibsiz!
            </h1>
          </div>


          <div className="topbar-right">

            <button className="topbar-icon">
              🔔
              <i></i>
            </button>


            <div className="profile">

              <div className="profile-avatar">
                B
              </div>

              <div className="profile-info">

                <strong>
                  Kompaniya boshlig‘i
                </strong>

                <span>
                  Administrator
                </span>

              </div>

              <span className="profile-arrow">
                ▾
              </span>

            </div>

          </div>

        </header>


        {/* WELCOME */}
        <section className="welcome-card">

          <div className="welcome-content">

            <span className="welcome-label">
              KOMPANIYA BOSHQARUVI
            </span>

            <h2>
              Biznesingizni
              <br />

              <strong>
                bir joydan boshqaring.
              </strong>
            </h2>

            <p>
              Xodimlaringizni boshqaring,
              ish vaqtini nazorat qiling,
              kompaniya yangiliklarini
              joylashtiring va jamoangiz bilan
              bog‘laning.
            </p>

            <button
              className="primary-action"
              onClick={createCompany}
            >
              Birinchi kompaniyani yaratish

              <span>
                →
              </span>
            </button>

          </div>


          <div className="welcome-visual">

            <div className="visual-circle circle-one"></div>
            <div className="visual-circle circle-two"></div>

            <div className="visual-building">
              🏢
            </div>

            <div className="floating-card card-one">

              <span>
                👥
              </span>

              <div>
                <strong>
                  Xodimlar
                </strong>

                <small>
                  Boshqaruv
                </small>
              </div>

            </div>


            <div className="floating-card card-two">

              <span>
                📊
              </span>

              <div>
                <strong>
                  Nazorat
                </strong>

                <small>
                  Ish vaqti
                </small>
              </div>

            </div>

          </div>

        </section>


        {/* STATISTICS */}
        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon blue"><SidebarIcon name="company" /></div>

              <span className="stat-badge">
                Faol
              </span>

            </div>

            <span className="stat-label">
              Kompaniyalar
            </span>

            <strong className="stat-number">
              {companies.length}
            </strong>

            <p>
              Siz yaratgan kompaniyalar
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon purple"><SidebarIcon name="users" /></div>

            </div>

            <span className="stat-label">
              Jami xodimlar
            </span>

            <strong className="stat-number">
              {companies.reduce(
                (total, company) =>
                  total + Number(company.employees || 0),
                0
              )}
            </strong>

            <p>
              Barcha kompaniyalardagi xodimlar
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon green">
                ✓
              </div>

            </div>

            <span className="stat-label">
              Faol kompaniyalar
            </span>

            <strong className="stat-number">
              {companies.length}
            </strong>

            <p>
              Hozirgi kompaniyalar
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-icon orange">
                💳
              </div>

            </div>

            <span className="stat-label">
              Tarif
            </span>

            <strong className="stat-number">
              {companies.length > 0
                ? companies[0].plan
                : "—"}
            </strong>

            <p>
              Joriy tarif
            </p>

          </div>

        </section>


        {/* COMPANY SECTION */}
        <section className="dashboard-grid">

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  Mening kompaniyalarim
                </h3>

                <p>
                  Siz boshqarayotgan kompaniyalar
                </p>

              </div>

              <button
                className="panel-add"
                onClick={createCompany}
              >
                + Yangi
              </button>

            </div>


            {companies.length === 0 ? (

              <div className="empty-company">

                <div className="empty-company-icon">
                  🏢
                </div>

                <h3>
                  Hali kompaniya yo‘q
                </h3>

                <p>
                  Tizimdan foydalanishni boshlash
                  uchun birinchi kompaniyangizni
                  yarating.
                </p>

                <button
                  className="secondary-action"
                  onClick={createCompany}
                >
                  Kompaniya yaratish
                  <span>→</span>
                </button>

              </div>

            ) : (

              <div className="company-list">

                {companies.map((company) => (

                  <div
                    className="company-item"
                    key={company.id}
                  >

                    <button
                      className="company-open"
                      onClick={() =>
                        openCompany(company)
                      }
                    >

                      <div className="company-avatar">
                        🏢
                      </div>

                      <div className="company-info">

                        <strong>
                          {company.name}
                        </strong>

                        <span>
                          {company.director}
                        </span>

                      </div>

                      <div className="company-count">
                        {company.employees}
                        <small>
                          xodim
                        </small>
                      </div>

                      <span className="company-arrow">
                        →
                      </span>

                    </button>


                    <button
                      className="company-delete"
                      type="button"
                      title="Kompaniyani o'chirish"
                      aria-label={`${company.name} kompaniyasini o'chirish`}
                      onClick={() =>
                        deleteCompany(company.id)
                      }
                    >
                      <svg className="company-trash-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 7h14M10 4h4l1 3H9l1-3ZM7 7l1 13h8l1-13M10 10v7M14 10v7" />
                      </svg>
                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>


          {/* ACTIVITY */}
          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <h3>
                  So‘nggi faoliyat
                </h3>

                <p>
                  Tizimdagi so‘nggi harakatlar
                </p>

              </div>

            </div>


            <div className="activity-empty">

              <div>
                🕘
              </div>

              Hozircha faoliyat mavjud emas

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;