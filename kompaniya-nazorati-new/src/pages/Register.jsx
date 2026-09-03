import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import { apiRequest } from "../services/api";
import "../App.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername) {
      setError("Username kiriting.");
      setLoading(false);
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username kamida 3 ta belgidan iborat bo''lishi kerak.");
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setError("Username faqat lotin harflari, raqam va _ belgisidan iborat bo''lishi kerak.");
      setLoading(false);
      return;
    }

    if (!cleanEmail) {
      setError("Email kiriting.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("To''g''ri email manzilini kiriting.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Parol kamida 8 ta belgidan iborat bo''lishi kerak.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Parollar bir xil emas.");
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError("Shartlar va xizmat qoidalarini qabul qiling.");
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          username: cleanUsername,
          email: cleanEmail,
          password: password,
          confirm_password: confirmPassword,
          name: "",
          accept_terms: acceptTerms,
        },
      });

      if (response.error) {
        setError(response.error || "Ro''yxatdan o''tishda xato yuz berdi.");
        setLoading(false);
        return;
      }

      setSuccess("Hisob muvaffaqiyatli yaratildi! Kirish sahifasiga o''tkazilmoqda...");

      if (response.access_token) {
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);
      }

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      console.error("Register error:", err);
      if (err.detail) {
        setError(typeof err.detail === "string" ? err.detail : "Ro''yxatdan o''tishda xato yuz berdi.");
      } else {
        setError(err.message || "Ro''yxatdan o''tishda xato yuz berdi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <CompanyLogo className="auth-logo" />
        <h1>Raqamli biznes nazorati</h1>
        <p className="auth-subtitle">Yangi rahbar hisobini yarating</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masalan: kompaniya_admin"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masalan: admin@kompaniya.uz"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label>Parol</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 8 belgidan iborat parol"
              autoComplete="new-password"
              disabled={loading}
            />
            <small className="password-hint">Parol kamida 8 belgi bo''lishi kerak</small>
          </div>

          <div className="input-group">
            <label>Parolni tasdiqlang</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Parolni qayta kiriting"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="terms-group">
            <input
              type="checkbox"
              id="accept-terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="accept-terms">
              Shartlar va xizmat qoidalarini qabul qilaman
            </label>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "O''tilmoqda..." : "Ro''yxatdan o''tish"}
          </button>
        </form>

        <div className="auth-bottom">
          Hisobingiz bormi?
          <Link to="/">Kirish</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
