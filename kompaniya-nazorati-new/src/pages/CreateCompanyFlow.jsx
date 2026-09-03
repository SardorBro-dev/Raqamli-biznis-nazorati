import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { companyApi } from "../services/api";
import { useLanguage } from "../utils/language";
import { getCurrentSession, getCurrentUser, getOwnerPlan, getWalletPaymentStatus, PLANS, readStorage, STORAGE_KEYS, writeStorage, createUniqueId } from "../utils/storage";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_DATA = AUTH_MODE === "local";

function CreateCompanyFlow() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("pro");
  const [form, setForm] = useState({ name: "", industry: "", directorName: "", address: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    const isOwner = currentUser?.role === "owner" || currentUser?.role === "company_owner";
    if (!currentUser || !isOwner) {
      navigate("/");
      return;
    }

    const paymentStatus = getWalletPaymentStatus(currentUser.id);
    const activePlan = getOwnerPlan(currentUser.id) || (paymentStatus?.planId || "pro");
    setUser(currentUser);
    setPlan(activePlan);

    if (!paymentStatus?.paid) {
      navigate("/tariffs");
      return;
    }

    const companyLimit = PLANS[activePlan]?.companyLimit || PLANS.pro.companyLimit;
    if (USE_LOCAL_DATA) {
      const companyCount = readStorage(STORAGE_KEYS.companies, []).filter((item) => item.ownerId === currentUser.id).length;
      setLimitReached(companyCount >= companyLimit);
      return;
    }

    companyApi.getCompanies(getCurrentSession()?.token)
      .then((companies) => setLimitReached(companies.length >= companyLimit))
      .catch(() => setLimitReached(false));
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!user) return;

    const paymentStatus = getWalletPaymentStatus(user.id);
    if (!paymentStatus?.paid) {
      setError(t.planPaymentRequired);
      return;
    }

    const companyName = form.name.trim();
    const industry = form.industry.trim();
    const directorName = form.directorName.trim();
    const address = form.address.trim();

    if (!companyName || !industry || !directorName || !address) {
      setError(t.allFieldsRequired);
      return;
    }

    const planDetails = PLANS[plan] || PLANS.pro;

    if (USE_LOCAL_DATA) {
      const companies = readStorage(STORAGE_KEYS.companies, []);
      const ownedCompanies = companies.filter((item) => item.ownerId === user.id);
      if (ownedCompanies.length >= planDetails.companyLimit) {
        setError(t.companyLimit);
        return;
      }

      const localCompany = {
        id: createUniqueId("company"),
        ownerId: user.id,
        name: companyName,
        industry,
        directorName,
        owner_name: directorName,
        address,
        employeeCount: 0,
        plan,
        subscription_plan: plan,
        workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        workStartTime: "09:00",
        workEndTime: "18:00",
        defaultBreakTime: 60,
        createdAt: new Date().toISOString(),
      };
      writeStorage(STORAGE_KEYS.companies, [...companies, localCompany]);
      navigate("/dashboard");
      return;
    }

    const session = getCurrentSession();
    if (!session?.token) {
      setError(t.sessionExpired);
      return;
    }

    try {
      setLoading(true);
      await companyApi.create({
        name: companyName,
        industry,
        owner_name: directorName,
        address,
        working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        work_start_time: "09:00",
        work_end_time: "18:00",
        default_break_time: 60,
        subscription_plan: plan,
      }, session.token);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message || t.companyCreatedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-company-page">
      <div className="create-company-container">
        {limitReached ? (
          <div className="create-company-card limit-reached-card">
            <div className="limit-reached-icon" aria-hidden="true">!</div>
            <div className="create-company-header">
              <h1>Limitingiz tugadi</h1>
              <p>Joriy tarifingiz bo‘yicha kompaniya limiti to‘ldi.</p>
            </div>
            <button type="button" className="company-submit limit-plan-button" onClick={() => navigate("/tariffs")}>Yangi tarif tanlash</button>
          </div>
        ) : (
        <div className="create-company-card">
          <div className="create-company-header">
            <h1>{t.createNewCompany}</h1>
            <p>{t.companyIntro}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="company-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>{t.companyName}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.companyNamePlaceholder} />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>{t.director}</label>
                <input value={form.directorName} onChange={(e) => setForm({ ...form, directorName: e.target.value })} placeholder={t.directorPlaceholder} />
              </div>

              <div className="form-field">
                <label>{t.industry}</label>
                <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder={t.industryPlaceholder} />
              </div>
            </div>

            <div className="form-field">
              <label>{t.address}</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={t.addressPlaceholder} />
            </div>

            <div className="selected-plan">
              <div>
                <span>{t.selectedPlan}</span>
                <strong>{PLANS[plan]?.name || "PRO"}</strong>
              </div>
            </div>

            <div className="company-form-actions">
              <button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>
                {t.cancel}
              </button>
              <button type="submit" className="company-submit" disabled={loading}>
                {loading ? t.creating : t.createCompanyButton}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}

export default CreateCompanyFlow;
