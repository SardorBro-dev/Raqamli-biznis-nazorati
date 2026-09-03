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
            <span>{t.agreeTerms}</span>
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
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const handleRecover = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setMessage(t.recoverTitle);
      return;
    }

    setMessage(t.recoverMessage);
    setTimeout(() => navigate("/"), 1200);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <CompanyLogo className="auth-logo" />
        <h1>
          RAQAMLI BIZNES
          <span className="small">NAZORATI</span>
        </h1>
        <p className="auth-subtitle">{t.recoverTitle}</p>
        {message && <div className="auth-error">{message}</div>}
        <form onSubmit={handleRecover}>
          <div className="input-group">
            <label>{t.username}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t.username} />
          </div>
          <button type="submit" className="auth-button">{t.continue}</button>
        </form>
        <div className="auth-bottom">
          <Link to="/">{t.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
