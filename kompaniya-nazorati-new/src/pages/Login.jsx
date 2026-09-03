import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import "../App.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Username va parolni kiriting.");
      return;
    }

    const users = JSON.parse(
      localStorage.getItem("company_users") || "[]"
    );

    const user = users.find(
      (item) =>
        item.username.toLowerCase() ===
          cleanUsername.toLowerCase() &&
        item.password === password
    );

    if (!user) {
      setError("Username yoki parol noto‘g‘ri.");
      return;
    }

    // Hozir tizimga kirgan foydalanuvchini saqlaymiz
    localStorage.setItem(
      "current_user",
      JSON.stringify(user)
    );

    // Rahbar paneliga o'tish
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <CompanyLogo className="auth-logo" />

        <h1>Raqamli biznes nazorati</h1>

        <p className="auth-subtitle">
          Hisobingizga kiring
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <div className="input-group">

            <label>Username</label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usernameingizni kiriting"
              autoComplete="username"
            />

          </div>

          <div className="input-group">

            <label>Parol</label>

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolingizni kiriting"
              autoComplete="current-password"
            />

          </div>

          <div className="forgot-link">

            <Link to="/forgot-password">
              Parolni unutdingizmi?
            </Link>

          </div>

          <button
            type="submit"
            className="auth-button"
          >
            Kirish
          </button>

        </form>

        <div className="auth-bottom">

          Hisobingiz yo‘qmi?

          <Link to="/register">
            Ro‘yxatdan o‘tish
          </Link>

        </div>

      </div>

    </div>
  );
}

export default Login;