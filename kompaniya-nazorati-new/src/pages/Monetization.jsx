import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../utils/storage";
import { useLanguage } from "../utils/language";
import CompanyLogo from "../components/CompanyLogo";
import SidebarIcon from "../components/SidebarIcon";

function getRandomDigit() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % 10;
  }
  return Math.floor(Math.random() * 10);
}

function isValidCardNumber(number) {
  let sum = 0;
  let shouldDouble = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = Number(number[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function getStoredCardNumbers() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith("card_order_"))
    .map((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}").cardNumber;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function createUniqueCardNumber() {
  const existingNumbers = new Set(getStoredCardNumbers());
  let cardNumber = "";
  do {
    const digits = Array.from({ length: 15 }, getRandomDigit);
    let sum = 0;
    digits.slice().reverse().forEach((digit, index) => {
      const value = index % 2 === 0 ? digit * 2 : digit;
      sum += value > 9 ? value - 9 : value;
    });
    digits.push((10 - (sum % 10)) % 10);
    cardNumber = digits.join("");
  } while (existingNumbers.has(cardNumber) || !isValidCardNumber(cardNumber));
  return cardNumber;
}

function formatCardNumber(cardNumber = "") {
  return cardNumber.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function getExpiryDate(createdAt) {
  const createdDate = new Date(createdAt);
  const expiryDate = new Date(createdDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
  return `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`;
}

function isValidPhone(phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, "");
  return /^[+]?[\d\s()-]+$/.test(phoneNumber.trim()) && digits.length >= 9 && digits.length <= 15;
}

function MonetizationPage() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [showOrder, setShowOrder] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  const userId = getCurrentUser()?.id;

  useEffect(() => {
    if (userId) {
      const savedCard = localStorage.getItem(`card_order_${userId}`);
      setHasCard(Boolean(savedCard));
      const parsedCard = savedCard ? JSON.parse(savedCard) : null;
      if (parsedCard && !parsedCard.cardNumber) {
        parsedCard.cardNumber = createUniqueCardNumber();
        parsedCard.createdAt = parsedCard.createdAt || new Date().toISOString();
        parsedCard.expiresAt = new Date(new Date(parsedCard.createdAt).setFullYear(new Date(parsedCard.createdAt).getFullYear() + 5)).toISOString();
        localStorage.setItem(`card_order_${userId}`, JSON.stringify(parsedCard));
      }
      setCardDetails(parsedCard);
      setCardFrozen(parsedCard ? Boolean(parsedCard.frozen) : false);
    }
  }, [userId]);

  const submitOrder = (event) => {
    event.preventDefault();
    const user = getCurrentUser();
    if (user && localStorage.getItem(`card_order_${user.id}`)) {
      setMessage("Sizda allaqachon bitta Company Card mavjud.");
      setShowOrder(false);
      setShowCards(true);
      return;
    }
    if (!ownerName.trim() || !phone.trim() || !address.trim() || !user) {
      setMessage("Ism-familiya, telefon raqami va manzilni kiriting.");
      return;
    }
    if (!isValidPhone(phone)) {
      setMessage("Telefon raqamini faqat raqamlar bilan kiriting.");
      return;
    }

    const createdAt = new Date().toISOString();
    const cardNumber = createUniqueCardNumber();
    localStorage.setItem(`card_order_${user.id}`, JSON.stringify({
      cardType: "Company Card",
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      frozen: false,
      cardNumber,
      createdAt,
      expiresAt: new Date(new Date(createdAt).setFullYear(new Date(createdAt).getFullYear() + 5)).toISOString(),
    }));
    setCardDetails({ cardNumber, createdAt, ownerName: ownerName.trim() });
    setHasCard(true);
    setShowOrder(false);
    setShowCards(true);
    setMessage("");
  };

  const openCardOrder = () => {
    const user = getCurrentUser();
    if (user && localStorage.getItem(`card_order_${user.id}`)) {
      setMessage("");
      setShowCards(true);
      return;
    }
    setShowOrder(true);
  };

  const toggleCardFreeze = () => {
    const user = getCurrentUser();
    if (!user) return;

    const savedCard = JSON.parse(localStorage.getItem(`card_order_${user.id}`) || "{}");
    const nextFrozen = !cardFrozen;
    localStorage.setItem(`card_order_${user.id}`, JSON.stringify({ ...savedCard, frozen: nextFrozen }));
    setCardFrozen(nextFrozen);
  };

  const deleteCard = () => {
    const user = getCurrentUser();
    if (!user || !window.confirm("Kartani o'chirishni xohlaysizmi?")) return;

    localStorage.removeItem(`card_order_${user.id}`);
    setHasCard(false);
    setCardDetails(null);
    setCardFrozen(false);
    setShowCardDetails(false);
  };

  return (
    <div className="monetization-page">
      <main className="monetization-board">
        {!showCards && (
          <button type="button" className="monetization-back-button" onClick={() => navigate("/dashboard")}>
            {t.back}
          </button>
        )}
        <header className="monetization-header">
          <div className="monetization-brand"><CompanyLogo className="monetization-mark" /><div><strong>Raqamli biznes nazorati</strong><span>Ichki to'lov tizimi</span></div></div>
          <div className="monetization-security"><span>✓</span><div><strong>{t.securePayment}</strong><small>100% himoyalangan tizim</small></div></div>
        </header>
        {showCards ? (
          <section className="my-cards-view">
            {showCardDetails && hasCard ? (
              <>
                <button type="button" className="monetization-back-button" onClick={() => setShowCardDetails(false)}>
                  ← {t.myCards}
                </button>
                <span className="monetization-kicker">KARTA SOZLAMALARI</span>
                <h1>Company Card</h1>
                <p>{cardFrozen ? "Karta muzlatilgan." : "Karta faol va foydalanishga tayyor."}</p>
                <div className="card-number-details">
                  <strong>{formatCardNumber(cardDetails?.cardNumber)}</strong>
                  <span>Amal qilish muddati: {cardDetails ? getExpiryDate(cardDetails.createdAt) : "--/--"}</span>
                </div>
                <div className="card-management-actions">
                  <button type="button" className="card-freeze-button" onClick={toggleCardFreeze}>
                    <span>❄</span> {cardFrozen ? "Kartani faollashtirish" : "Kartani muzlatish"}
                  </button>
                  <button type="button" className="card-delete-button" onClick={deleteCard}>
                    <span>⌫</span> {t.delete}
                  </button>
                </div>
              </>
            ) : hasCard ? (
              <>
                <button type="button" className="monetization-back-button" onClick={() => setShowCards(false)}>
                  ← {t.monetization}
                </button>
                <span className="monetization-kicker">KARTALARIM</span>
                <h1>Company Card</h1>
                  <p>{t.card} virtual kartangiz muvaffaqiyatli ochildi.</p>
                <button type="button" className="my-card-item" onClick={() => setShowCardDetails(true)}>
                  <div className="my-card-item-top"><span>COMPANY CARD</span><CompanyLogo className="card-logo-mark" /></div>
                  <div className="card-qr-space" aria-label="QR kod uchun bo'sh joy" />
                  <div className="card-preview-number">{formatCardNumber(cardDetails?.cardNumber)}</div>
                  <div className="my-card-item-bottom"><span>VIRTUAL CARD</span><span>{cardDetails ? getExpiryDate(cardDetails.createdAt) : "--/--"}</span></div>
                  <div className="cardholder-name">{cardDetails?.ownerName || "CARD HOLDER"}</div>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="monetization-back-button" onClick={() => setShowCards(false)}>
                  ← {t.monetization}
                </button>
                <div className="empty-cards-state">
                  <p>{t.card} mavjud emas</p>
                  <button type="button" className="primary-wallet-button monetization-card-button" onClick={openCardOrder}>
                    <SidebarIcon name="card" /> {t.openCard}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
        <div className="monetization-layout">
          <section className="monetization-options">
            <div className="monetization-option"><b>◈</b><div><span>BALANS</span><strong>••••••</strong></div></div>
            <div className="monetization-option"><b>●</b><div><span>KARTA EGASI</span><strong>••••••</strong></div></div>
            <div className="monetization-option"><b>▣</b><div><span>KARTANI TO'LDIRISH</span><strong>To'lov usulini tanlang</strong></div></div>
            <div className="monetization-trust"><span>✓</span> Ma'lumotlaringiz maxfiy va xavfsiz tarzda himoyalangan.</div>
          </section>
          <section className="monetization-action">
            <span className="monetization-kicker">COMPANY CARD</span>
            <h1>Company Card virtual kartasi</h1>
            <p className="monetization-subtitle">{t.companyName} xarajatlarini qulay va ishonchli boshqaring.</p>
            <div className="payment-qr-panel monetization-empty-qr" aria-label="QR kod uchun bo'sh maydon">
              <div className="payment-qr-placeholder" />
            </div>
            <div className="monetization-card-actions">
              <button type="button" className="primary-wallet-button monetization-card-button" onClick={openCardOrder}>
                <SidebarIcon name="card" /> {t.openCard}
              </button>
              <button type="button" className="secondary-wallet-button monetization-card-button" onClick={() => setShowCards(true)}>
                <SidebarIcon name="card" /> {t.myCards}
              </button>
            </div>
            {message && <div className="wallet-message monetization-card-message">{message}</div>}
          </section>
        </div>
        )}
      </main>

      {showOrder && (
        <div className="card-order-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowOrder(false);
        }}>
          <form className="card-order-modal" onSubmit={submitOrder}>
            <div className="section-row">
              <h2>{t.openCard}</h2>
              <button type="button" className="modal-close" onClick={() => setShowOrder(false)} aria-label={t.close}>×</button>
            </div>
            <label className="form-field">
              Karta egasi ism-familiyasi
              <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Ism Familiya" required />
            </label>
            <label className="form-field">
              Telefon raqami
              <input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d+() -]/g, ""))} placeholder="+998 90 123 45 67" required />
            </label>
            <label className="form-field">
              Manzil
              <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Shahar, ko'cha va uy" required />
            </label>
            <button type="submit" className="primary-wallet-button">{t.openCard}</button>
            {message && <div className="wallet-message">{message}</div>}
          </form>
        </div>
      )}
    </div>
  );
}

export default MonetizationPage;
