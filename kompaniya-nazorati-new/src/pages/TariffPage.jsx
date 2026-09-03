import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applyPlanForUser, getCurrentUser, getCurrentSession, getWalletPaymentStatus, readStorage, STORAGE_KEYS } from "../utils/storage";
import { companyApi } from "../services/api";
import { useLanguage } from "../utils/language";
import CompanyLogo from "../components/CompanyLogo";

const CLICK_P2P_LINK = "https://my.click.uz/clickp2p/C59D87388859917EE260D6070AA0BB9B6BE99D793AB036750F4F0EAEFCE9458B";
const CLICK_WALLET_ID = "C59D87388859917EE260D6070AA0BB9B6BE99D793AB036750F4F0EAEFCE9458B";

const plans = [
  {
    id: "pro",
    name: "PRO",
    price: "200 000 so'm / oy",
    capacity: "1 ta kompaniya / 50 tagacha xodim",
    label: "PRO",
    badge: "BOSHLANG'ICH",
  },
  {
    id: "pro_premium",
    name: "PRO PREMIUM",
    price: "500 000 so'm / oy",
    capacity: "5 ta kompaniya / 300 tagacha xodim",
    label: "PRO PREMIUM",
    badge: "KENGAYTIRILGAN",
  },
  {
    id: "promaster",
    name: "PROMASTER",
    price: "1 000 000 so'm / oy",
    capacity: "10 ta kompaniya / har birida 1000 tagacha xodim",
    label: "PROMASTER",
    badge: "KORPORATIV",
  },
];

function TariffPage() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [user, setUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [walletPaid, setWalletPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    const isOwner = currentUser?.role === "owner" || currentUser?.role === "company_owner";
    if (!currentUser || !isOwner) {
      navigate("/");
      return;
    }

    setUser(currentUser);

    const paymentStatus = getWalletPaymentStatus(currentUser.id);
    const activePlanRecord = readStorage(STORAGE_KEYS.plans, []).find((item) => item.userId === currentUser.id && item.active);
    const activePlan = activePlanRecord?.plan;

    setWalletPaid(Boolean(paymentStatus && paymentStatus.paid));
    const currentPlan = activePlan || paymentStatus?.planId || null;
    setSelectedPlan(paymentStatus && paymentStatus.paid ? currentPlan : null);
    setActivePlanId(paymentStatus && paymentStatus.paid ? currentPlan : null);

    const purchasedAt = activePlanRecord?.purchasedAt || paymentStatus?.paidAt;
    const expiresAt = activePlanRecord?.expiresAt || (purchasedAt ? addOneMonth(new Date(purchasedAt)).toISOString() : null);
    setTimeLeft(expiresAt ? getTimeLeft(expiresAt) : null);
  }, [navigate]);

  const openClickWallet = () => {
    window.open(CLICK_P2P_LINK, "_blank", "noopener,noreferrer");
    setPaymentMessage("To'lovni amalga oshiring. To'lov qilingandan so'ng 'Men to'lov qildim' tugmasini bosing.");
  };

  const copyWalletId = async () => {
    try {
      await navigator.clipboard.writeText(CLICK_WALLET_ID);
      setPaymentMessage("Click hamyon ID nusxalandi.");
    } catch {
      setPaymentMessage("Hamyon ID: " + CLICK_WALLET_ID);
    }
  };

  const handlePurchase = async (planId) => {
    if (!user) return;

    const plan = plans.find((item) => item.id === planId);
    if (!plan) return;

    setSelectedPlan(planId);

    if (!walletPaid) {
      const payNow = window.confirm(`Tarifni olishdan oldin Click hamyonga ${plan.name} uchun to'lov qilish kerak. Hamyonni ochib to'lovni bajarasizmi?`);
      if (payNow) {
        openClickWallet();
      }
      return;
    }

    const confirmPurchase = window.confirm(`To'lov tasdiqlandi. ${plan.name} tarifini faollashtirishni xohlaysizmi?`);
    if (!confirmPurchase) return;

    if (import.meta.env.VITE_AUTH_MODE !== "local") {
      try {
        const companies = await companyApi.getCompanies(getCurrentSession()?.token);
        if (companies.length > 0) {
          await companyApi.upgradePlan(planId, getCurrentSession()?.token);
        }
      } catch (error) {
        setPaymentMessage(error.message || "Tarifni faollashtirib bo'lmadi.");
        return;
      }
    }
    applyPlanForUser(user.id, planId);
    setSelectedPlan(planId);
    setActivePlanId(planId);
    setPaymentMessage(`${plan.name} tarifini to'lov orqali faollashtirdingiz.`);
  };

  const confirmPayment = async () => {
    if (!user) return;

    if (walletPaid) {
      setPaymentMessage("Yangi tarifga o'tish uchun tarif kartasidagi tugmani bosing.");
      return;
    }

    if (!selectedPlan) {
      setPaymentMessage("Avval o'zingizga mos tarifni tanlang.");
      return;
    }

    const currentPlan = selectedPlan;
    const isConfirmed = window.confirm("To'lovni amalga oshirdingizmi? Bu holat tarifni aktivatsiya qilish uchun kerak.");
    if (!isConfirmed) return;

    applyPlanForUser(user.id, currentPlan);
    setWalletPaid(true);
    setSelectedPlan(currentPlan);
    setActivePlanId(currentPlan);
    setPaymentMessage("To'lov tasdiqlandi. Tarif faollashtirildi.");
  };


  function addOneMonth(date) {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  function getTimeLeft(expiresAt) {
    const difference = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const totalSeconds = Math.floor(difference / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      expired: difference === 0,
    };
  }

  return (
    <div className="tariffs-page">
      <header className="tariffs-topbar">
        <button className="back-button" onClick={() => navigate("/dashboard")}>←</button>
        <div className="tariffs-brand">
          <CompanyLogo className="tariffs-brand-icon" />
          <div>
            <strong>Raqamli biznes nazorati</strong>
            <span>Tariflar</span>
          </div>
        </div>
      </header>

      <main className="tariffs-content">
        <div className="tariffs-heading">
            <span>{t.choosePlan}</span>
          <h1>{t.chooseBusinessPlan}</h1>
          {selectedPlan && timeLeft && (
            <p className="plan-expiry">
              Tanlangan tarif muddati: {timeLeft.expired
                ? "tugagan"
                : `${timeLeft.days} kun ${timeLeft.hours} soat ${timeLeft.minutes} daqiqa ${timeLeft.seconds} soniya qoldi`}
            </p>
          )}
        </div>

        <section className="wallet-payment-box">
          <div className="wallet-header-row">
            <div>
              <span className="wallet-label">{t.paymentMethod}</span>
              <h3>Click Wallet / ClickP2P</h3>
            </div>
            <span className="wallet-status">{t.securePayment}</span>
          </div>

          <div className="wallet-details">
            <div>
              <span>{t.walletLink}</span>
              <strong>{CLICK_P2P_LINK}</strong>
            </div>
            <div>
              <span>{t.walletId}</span>
              <strong>{CLICK_WALLET_ID}</strong>
            </div>
          </div>

          <div className="wallet-actions">
            <button type="button" className="secondary-wallet-button" onClick={openClickWallet}>{t.openWallet}</button>
            <button className="secondary-wallet-button" onClick={copyWalletId}>{t.copyId}</button>
            <button className="secondary-wallet-button" onClick={confirmPayment}>{t.paid}</button>
          </div>

          {paymentMessage && <div className="wallet-message">{paymentMessage}</div>}
        </section>

        <div className="plans">
          {plans.map((plan) => (
            <div key={plan.id} className={`plan-card ${plan.id !== "pro" ? "premium" : ""}`}>
              {plan.id === "pro_premium" && <div className="popular-badge">{t.popular}</div>}

              <div className="plan-header">
                <div className={`plan-icon ${plan.id !== "pro" ? "purple" : "blue"}`}>◆</div>
                <div>
                  <span className="plan-label">{plan.badge}</span>
                  <h2>{plan.name}</h2>
                </div>
              </div>

              <div className="plan-price">
                <strong>{plan.price.split(" ")[0]}</strong>
                <span>{plan.price.replace(plan.price.split(" ")[0], "")}</span>
              </div>

              <p className="plan-description">{plan.capacity}</p>

              <div className="plan-divider" />

              <ul className="plan-features">
                <li><span>✓</span> {plan.id === "pro" ? "1 ta kompaniya" : plan.id === "pro_premium" ? "5 ta kompaniya" : "10 ta kompaniya"}</li>
                <li><span>✓</span> {plan.id === "pro" ? "50 tagacha xodim" : plan.id === "pro_premium" ? "300 tagacha xodim" : "Har bir kompaniyada 1000 tagacha xodim"}</li>
                <li><span>✓</span> Xodimlar nazorati</li>
                <li><span>✓</span> Ish vaqti monitoring</li>
                <li><span>✓</span> Kompaniya chat tizimi</li>
                <li><span>✓</span> Yangiliklar bo'limi</li>
              </ul>

              <button
                className={`plan-button ${plan.id !== "pro" ? "premium-button" : ""}`}
                onClick={() => handlePurchase(plan.id)}
                disabled={plan.id === activePlanId}
                style={{ opacity: plan.id === activePlanId ? 0.6 : 1, cursor: plan.id === activePlanId ? "not-allowed" : "pointer" }}
              >
                {!walletPaid ? `${plan.label} tanlash` : plan.id === activePlanId ? t.currentPlan : `${plan.label} ${t.activatePlan}`}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default TariffPage;
