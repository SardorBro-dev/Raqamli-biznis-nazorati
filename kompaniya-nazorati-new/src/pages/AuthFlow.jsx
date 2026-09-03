import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import { authApi } from "../services/api";
import { useLanguage } from "../utils/language";
import { clearSession, ensureAppData, getCurrentSession, getCurrentUser, setCurrentSession } from "../utils/storage";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_AUTH = AUTH_MODE === "local";
const IS_ANDROID = Capacitor.getPlatform() === "android";
const PORTAL_ROLE = import.meta.env.VITE_PORTAL_ROLE || "all";

const formatUzbekPhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const groups = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return `+998${groups.length ? ` ${groups.join(" ")}` : ""}`;
};

const handleUzbekPhoneKeyDown = (event) => {
  const input = event.currentTarget;
  const prefixLength = 5;
  const selectionStart = input.selectionStart || 0;
  const selectionEnd = input.selectionEnd || 0;
  const isEditingPrefix = selectionStart < prefixLength
    || selectionEnd < prefixLength
    || (event.key === "Backspace" && selectionStart === prefixLength);
  if (isEditingPrefix && ["Backspace", "Delete"].includes(event.key)) event.preventDefault();
};

const isAllowedPortalRole = (role) => PORTAL_ROLE === "all" || normalizeRole(role) === PORTAL_ROLE;

const normalizeRole = (role) => {
  if (!role) return "owner";
  if (role === "company_owner" || role === "system_admin") return "owner";
  return role;
};

const saveAuthSession = ({ user_id, username, email, phone, name, last_name, role, access_token, refresh_token }) => {
  const fullName = [name, last_name].filter(Boolean).join(" ") || username;
  setCurrentSession({
    userId: user_id,
    role: normalizeRole(role),
    token: access_token,
    refreshToken: refresh_token,
    user: {
      id: user_id,
      username,
      role: normalizeRole(role),
      name: fullName,
      firstName: name || "",
      lastName: last_name || "",
      email: email || "",
      phone: phone || "",
    },
  });
};

export function LoginPage() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginCodeRequested, setLoginCodeRequested] = useState(false);
  const [pendingLoginResponse, setPendingLoginResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (USE_LOCAL_AUTH) {
      ensureAppData();
    }
    const currentSession = getCurrentSession();
    if (!USE_LOCAL_AUTH && currentSession?.token?.startsWith("local_")) {
      clearSession();
      return;
    }
    if (!USE_LOCAL_AUTH && currentSession && !currentSession.token) {
      clearSession();
      return;
    }
    if (!USE_LOCAL_AUTH && currentSession?.token) {
      authApi.getProfile(currentSession.token).then((profile) => {
        if (!isAllowedPortalRole(profile.role) || (IS_ANDROID && normalizeRole(profile.role) === "employee")) {
          clearSession();
          return;
        }
        navigate(normalizeRole(profile.role) === "owner" ? "/dashboard" : "/employee-panel");
      }).catch((error) => {
        if (error.code === "API_UNAVAILABLE") {
          const role = normalizeRole(currentSession.user?.role || currentSession.role);
          navigate(role === "owner" ? "/dashboard" : "/employee-panel");
          return;
        }
        clearSession();
      });
      return;
    }
    const currentUser = getCurrentUser();
    if (currentUser) {
      if (!isAllowedPortalRole(currentUser.role) || (IS_ANDROID && normalizeRole(currentUser.role) === "employee")) {
        clearSession();
        return;
      }
      navigate(normalizeRole(currentUser.role) === "owner" ? "/dashboard" : "/employee-panel");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError(`${t.username} va ${t.password}ni kiriting.`);
      return;
    }

    try {
      setLoading(true);
      if (loginCodeRequested && pendingLoginResponse) {
        const normalizedPhone = String(pendingLoginResponse.phone || "").replace(/[\s()-]/g, "");
        await authApi.verifyTelegramCode(normalizedPhone, loginCode);
        saveAuthSession(pendingLoginResponse);
        navigate(normalizeRole(pendingLoginResponse.role) === "owner" ? "/dashboard" : "/employee-panel");
        return;
      }
      const response = await authApi.login({ username: cleanUsername, password });
      if (IS_ANDROID && normalizeRole(response.role) === "employee") {
        throw new Error(t.employee + " Android ilovasidan foydalana olmaydi. Windows versiyasidan kiring.");
      }
      if (!isAllowedPortalRole(response.role)) {
        throw new Error(PORTAL_ROLE === "employee"
          ? "Bu web manzil faqat xodimlar uchun. Xodim username va parolini kiriting."
          : "Bu web manzil faqat kompaniya boshliqlari uchun.");
      }
      const normalizedPhone = String(response.phone || "").replace(/[\s()-]/g, "");
      if (!/^\+998\d{9}$/.test(normalizedPhone)) {
        throw new Error("Hisobingizga telefon raqami biriktirilmagan.");
      }
      const telegramCheck = await authApi.checkTelegramPhone(normalizedPhone);
      if (!telegramCheck.linked) {
        throw new Error("Avval ushbu telefon raqamini Telegram botga yuboring.");
      }
      await authApi.requestTelegramCode(normalizedPhone);
      setPendingLoginResponse(response);
      setLoginCodeRequested(true);
      setError("Telegram botga 12 belgili kod yuborildi. Kodni kiriting.");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <CompanyLogo className="auth-logo" />
        <h1>
          RAQAMLI BIZNES
          <span className="small">NAZORATI</span>
        </h1>
        <p className="auth-subtitle">{t.loginTitle}</p>
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>{t.username}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.usernamePlaceholder} autoComplete="username" />
          </div>
          <div className="input-group">
            <label>{t.password}</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} autoComplete="current-password" />
          </div>
          <button type="submit" className="auth-button login-button" disabled={loading}>
            {loading ? "..." : t.login}
          </button>
        </form>

        <div className="auth-bottom">
          {t.noAccount}
          <Link to="/register">{t.register}</Link>
        </div>
        {loginCodeRequested && <div className="telegram-code-backdrop" role="presentation">
          <form className="telegram-code-modal" onSubmit={handleLogin}>
            <span className="telegram-code-kicker">TELEGRAM</span>
            <h2>Tasdiqlash kodi</h2>
            <p>Bot yuborgan 12 belgili kodni kiriting.</p>
            <input type="text" value={loginCode} onChange={(e) => setLoginCode(e.target.value.slice(0, 12))} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} autoFocus />
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-button" disabled={loading}>{loading ? "Tekshirilmoqda..." : "Tasdiqlash"}</button>
          </form>
        </div>}
        <div className="auth-bottom">
          {t.accountProblem}
          <Link to="/recover-account">{t.recover}</Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [form, setForm] = useState({ fullName: "", firstName: "", lastName: "", email: "", phone: "+998 ", username: "", password: "", confirmPassword: "", acceptTerms: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");
    const name = `${firstName} ${lastName}`.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const username = form.username.trim();
    const password = form.password;

    if (!fullName || !email || !phone || !username || !password || !form.confirmPassword) {
      setError(t.allFieldsRequired);
      return;
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^\+998\d{9}$/.test(normalizedPhone)) {
      setError("Telefon raqami faqat O‘zbekiston raqami bo‘lishi kerak: +998 XX XXX XX XX.");
      return;
    }

    if (!/^[\w.-]+@([\w-]+\.)+[A-Za-z]{2,}$/.test(email)) {
      setError(t.invalidEmail);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t.invalidUsername);
      return;
    }

    if (password.length < 8) {
      setError(t.passwordMin);
      return;
    }

    if (password !== form.confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }

    if (!form.acceptTerms) {
      setError(t.acceptTerms);
      return;
    }

    try {
      setLoading(true);
      await authApi.checkRegistration({ username, email, phone: normalizedPhone });
      const telegramCheck = await authApi.checkTelegramPhone(normalizedPhone);
      if (!telegramCheck.verified) {
        if (!telegramCheck.linked) {
          const botLink = telegramCheck.bot_username ? ` https://t.me/${telegramCheck.bot_username}` : "";
          throw new Error(`Avval Telegram botga /start bosing va telefon raqamingizni yuboring.${botLink}`);
        }
        if (!telegramCode.trim()) {
          await authApi.requestTelegramCode(normalizedPhone);
          setCodeRequested(true);
          throw new Error("Telegram botga 12 belgili tasdiqlash kodi yuborildi. Kodni shu yerga kiriting.");
        }
        await authApi.verifyTelegramCode(normalizedPhone, telegramCode);
      }
      const response = await authApi.register({
        name,
        email,
        phone: normalizedPhone,
        username,
        password,
        confirm_password: form.confirmPassword,
        accept_terms: true,
      });

      saveAuthSession(response);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || t.companyCreatedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <CompanyLogo className="auth-logo" />
        <h1>
          RAQAMLI BIZNES
          <span className="small">NAZORATI</span>
        </h1>
        <p className="auth-subtitle">{t.registerTitle}</p>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Ism va familiya</label>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ism va familiyangizni kiriting"
              autoComplete="name"
            />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@mail.com" autoComplete="email" />
          </div>
          <div className="input-group">
            <label>Telefon raqami</label>
            <input type="tel" value={form.phone} onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (!digits.startsWith("998") && digits.length < 3) return;
              setForm({ ...form, phone: formatUzbekPhone(e.target.value) });
            }} onKeyDown={handleUzbekPhoneKeyDown} placeholder="+998 90 123 45 67" autoComplete="tel" inputMode="numeric" />
          </div>
          <div className="input-group">
            <label>Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" autoComplete="username" />
          </div>
          <div className="input-group">
            <label>Parol</label>
            <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Parolingizni kiriting" autoComplete="new-password" />
          </div>
          <div className="input-group">
            <label>Parolni tasdiqlash</label>
            <PasswordInput value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Parolni qayta kiriting" autoComplete="new-password" />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
            />
            <span>{t.agreeTerms} <button type="button" className="terms-link" onClick={() => setTermsOpen(true)}>Foydalanish shartlari</button></span>
          </label>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t.creating : t.register}
          </button>
        </form>

        <div className="auth-bottom">
          {t.hasAccount}
          <Link to="/">{t.login}</Link>
        </div>
      </div>
      {termsOpen && <div className="terms-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setTermsOpen(false);
      }}>
        <section className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <button type="button" className="terms-close" aria-label="Shartlarni yopish" onClick={() => setTermsOpen(false)}>×</button>
          <div className="terms-content">
            <span className="terms-kicker">RAQAMLI BEZNIS NAZORATI</span>
            <h2 id="terms-title">FOYDALANISH SHARTLARI</h2>
            <p className="terms-date">Oxirgi yangilanish: 2026-yil 3-sentabr</p>
            <p>“Raqamli Beznis Nazorati” platformasidan foydalanish orqali Siz ushbu Foydalanish shartlariga rozilik bildirasiz. Agar ushbu shartlarga rozi bo‘lmasangiz, platformadan foydalanmasligingiz kerak.</p>
            <h3>1. Platforma haqida</h3>
            <p>“Raqamli Beznis Nazorati” — kompaniya va tashkilotlarda ish jarayonlarini raqamli kuzatish, nazorat qilish va boshqarishga yordam beruvchi platforma.</p>
            <p>Platformaning asosiy maqsadi:</p>
            <ul><li>ish jarayonlarini nazorat qilish;</li><li>xodimlarning ish faoliyati haqida ma’lumot olish;</li><li>rahbarlarga boshqaruvni soddalashtirish;</li><li>ish samaradorligini oshirish;</li><li>kompaniyadagi muammolar haqida o‘z vaqtida xabar berish.</li></ul>
            <h3>2. Foydalanuvchi hisobi</h3>
            <p>Platformadan foydalanish uchun foydalanuvchi ro‘yxatdan o‘tishi va zarur ma’lumotlarni taqdim etishi mumkin.</p>
            <p>Foydalanuvchi:</p>
            <ul><li>taqdim etgan ma’lumotlarining to‘g‘riligini ta’minlashi;</li><li>hisob ma’lumotlarini himoya qilishi;</li><li>o‘z hisobidan amalga oshirilgan harakatlar uchun javobgar bo‘lishi kerak.</li></ul>
            <p>Boshqa shaxsning hisobidan ruxsatsiz foydalanish taqiqlanadi.</p>
            <h3>3. Kompaniya rahbari va xodimlar</h3>
            <p>Platformadan foydalanuvchi kompaniya rahbari yoki administrator xodimlarni tizimga qo‘shishi mumkin.</p>
            <p>Xodimlarni kuzatish yoki ular haqida ma’lumot yig‘ish amaldagi qonunchilikka muvofiq va tegishli huquqiy asoslar mavjud bo‘lgan holda amalga oshirilishi kerak.</p>
            <p>Platforma xodimlarning shaxsiy hayotiga noqonuniy aralashish uchun ishlatilmasligi kerak.</p>
            <h3>4. Ma’lumotlardan foydalanish</h3>
            <p>Platforma orqali olingan ma’lumotlar faqat qonuniy va platformaning belgilangan maqsadlari doirasida ishlatilishi kerak.</p>
            <p>Foydalanuvchi boshqa shaxslarning ma’lumotlarini:</p>
            <ul><li>noqonuniy tarqatmasligi;</li><li>sotmasligi;</li><li>ruxsatsiz uchinchi shaxslarga bermasligi;</li><li>shaxsga zarar yetkazish maqsadida ishlatmasligi kerak.</li></ul>
            <h3>5. Taqiqlangan foydalanish</h3>
            <p>Platformadan quyidagi maqsadlarda foydalanish taqiqlanadi:</p>
            <ul><li>noqonuniy faoliyatni amalga oshirish;</li><li>boshqa foydalanuvchilarga zarar yetkazish;</li><li>tizim xavfsizligini buzishga urinish;</li><li>ruxsatsiz ma’lumot olish;</li><li>platformaga zarar yetkazuvchi dasturlar yoki kodlarni joylashtirish;</li><li>boshqa shaxslarning hisoblariga ruxsatsiz kirish;</li><li>platformadan firibgarlik yoki aldov maqsadida foydalanish.</li></ul>
            <h3>6. Xizmatning ishlashi</h3>
            <p>“Raqamli Beznis Nazorati” xizmatni imkon qadar barqaror ishlashini ta’minlashga harakat qiladi.</p>
            <p>Texnik xizmat, yangilanish, nosozlik yoki boshqa holatlar sababli platforma vaqtincha ishlamasligi mumkin.</p>
            <p>Platforma ma’lumotlarning mutlaq va uzluksiz saqlanishini kafolatlamaydi. Muhim ma’lumotlarning zaxira nusxasini saqlash foydalanuvchining ham mas’uliyatidir.</p>
            <h3>7. Hisobni cheklash yoki to‘xtatish</h3>
            <p>Agar foydalanuvchi ushbu shartlarni buzsa yoki platformadan noqonuniy foydalansa, “Raqamli Beznis Nazorati” tegishli choralarni ko‘rishi, jumladan hisobni vaqtincha cheklashi yoki to‘xtatishi mumkin.</p>
            <h3>8. Intellektual mulk</h3>
            <p>Platformaning dizayni, dasturiy kodi, logotipi, nomi va boshqa original materiallari tegishli huquq egalarining intellektual mulki hisoblanadi.</p>
            <p>Ruxsatsiz nusxalash, o‘zgartirish, tarqatish yoki tijorat maqsadida foydalanish taqiqlanadi.</p>
            <h3>9. Foydalanuvchining javobgarligi</h3>
            <p>Foydalanuvchi platformadan foydalanish jarayonida o‘z harakatlari va taqdim etgan ma’lumotlari uchun javobgar hisoblanadi.</p>
            <p>“Raqamli Beznis Nazorati” platformadan noto‘g‘ri, noqonuniy yoki ushbu shartlarga zid foydalanish natijasida yuzaga keladigan oqibatlar uchun qonunchilikda belgilangan doirada javobgar bo‘ladi.</p>
            <h3>10. Shartlarga o‘zgartirish kiritish</h3>
            <p>Platforma rivojlanishi, yangi funksiyalar qo‘shilishi yoki qonunchilikdagi o‘zgarishlar sababli ushbu Foydalanish shartlari yangilanishi mumkin.</p>
            <p>Yangilangan shartlar platformada e’lon qilingan kundan boshlab kuchga kiradi.</p>
            <h3>11. Aloqa</h3>
            <p>Platforma, hisob yoki foydalanish shartlari bo‘yicha savollar yuzaga kelganda, foydalanuvchi “Raqamli Beznis Nazorati”ning rasmiy aloqa kanallari orqali murojaat qilishi mumkin.</p>
            <h3>12. Shartlarni qabul qilish</h3>
            <p>“Ro‘yxatdan o‘tish”, “Kirish”, “Davom etish” yoki platformadan foydalanishni davom ettirish orqali foydalanuvchi ushbu Foydalanish shartlarini o‘qiganini va ularga roziligini tasdiqlaydi.</p>
            <p>“Raqamli Beznis Nazorati” — biznesingizni raqamli nazorat qilish va boshqarishni soddalashtirish uchun.</p>
          </div>
        </section>
      </div>}
      {codeRequested && <div className="telegram-code-backdrop" role="presentation">
        <form className="telegram-code-modal" onSubmit={handleRegister}>
          <span className="telegram-code-kicker">TELEGRAM</span>
          <h2>Tasdiqlash kodi</h2>
          <p>Bot yuborgan 12 belgili murakkab kodni kiriting.</p>
          <input
            type="text"
            value={telegramCode}
            onChange={(e) => setTelegramCode(e.target.value.slice(0, 12))}
            placeholder="A7b@9Kx#2Lm!"
            autoComplete="one-time-code"
            inputMode="text"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
          </button>
        </form>
      </div>}
    </div>
  );
}

export function RecoverAccountPage() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [phone, setPhone] = useState("+998 ");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecover = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^\+998\d{9}$/.test(normalizedPhone)) {
      setError("Telefon raqami faqat O‘zbekiston raqami bo‘lishi kerak: +998 XX XXX XX XX.");
      return;
    }

    try {
      setLoading(true);
      if (!codeRequested) {
        await authApi.requestRecoveryCode(normalizedPhone);
        setCodeRequested(true);
        setMessage("Telegram botga 12 belgili kod yuborildi. Kodni kiriting.");
        return;
      }

      if (code.length !== 12) {
        setError("Telegram kodini to‘liq kiriting.");
        return;
      }

      if (!codeVerified) {
        await authApi.verifyTelegramCode(normalizedPhone, code);
        const account = await authApi.getRecoveryAccount(normalizedPhone);
        setUsername(account.username || "");
        setCodeVerified(true);
        setMessage("Kod tasdiqlandi. Endi yangi username yoki parolni kiriting.");
        return;
      }

      if (!username.trim() && !password) {
        setError("Username yoki yangi parol kiriting.");
        return;
      }
      if (username.trim() && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        setError("Username faqat lotin harflari, raqam va _ belgisidan iborat bo‘lishi kerak.");
        return;
      }
      if (password && password.length < 8) {
        setError("Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak.");
        return;
      }
      if (password && password !== confirmPassword) {
        setError("Yangi parollar bir xil emas.");
        return;
      }

      await authApi.completeRecovery({
        phone: normalizedPhone,
        username: username.trim() || null,
        password: password || null,
        confirm_password: password ? confirmPassword : null,
      });
      setMessage("Hisob ma’lumotlari yangilandi. Kirish sahifasiga o‘tkazilmoqda...");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err.message || "Hisobni tiklashda xato yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <CompanyLogo className="auth-logo" />
        <h1>
          RAQAMLI BIZNES
          <span className="small">NAZORATI</span>
        </h1>
        <p className="auth-subtitle">Telefon raqamingiz orqali hisobingizni tiklang</p>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <form onSubmit={handleRecover}>
          <div className="input-group">
            <label>Ro‘yxatdan o‘tgan telefon raqami</label>
            <input value={phone} onChange={(e) => setPhone(formatUzbekPhone(e.target.value))} onKeyDown={handleUzbekPhoneKeyDown} placeholder="+998 90 123 45 67" autoComplete="tel" inputMode="numeric" disabled={loading || codeRequested} />
          </div>
          {codeRequested && !codeVerified && <div className="input-group">
            <label>Telegram kodi</label>
            <input value={code} onChange={(e) => setCode(e.target.value.slice(0, 12))} placeholder="Telegram yuborgan 12 belgili kod" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} disabled={loading} />
          </div>}
          {codeVerified && <>
            <div className="recovery-edit-heading">Ma’lumotlarni o‘zgartirish</div>
            <div className="input-group">
              <label>Username <span className="optional-label">(ixtiyoriy)</span></label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Yangi username" autoComplete="username" disabled={loading} />
            </div>
            <div className="input-group">
              <label>Yangi parol <span className="optional-label">(ixtiyoriy)</span></label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 8 belgidan iborat parol" autoComplete="new-password" disabled={loading} />
            </div>
            {password && <div className="input-group">
              <label>Yangi parolni tasdiqlash</label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Parolni qayta kiriting" autoComplete="new-password" disabled={loading} />
            </div>}
          </>}
          <button type="submit" className="auth-button" disabled={loading}>{loading ? "Tekshirilmoqda..." : (!codeRequested ? "Telegram kodini olish" : (!codeVerified ? "Kodni tasdiqlash" : "Ma’lumotlarni saqlash"))}</button>
        </form>
        <div className="auth-bottom">
          <Link to="/">{t.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
