import { Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import "../App.css";

function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">

        <CompanyLogo className="auth-logo" />

        <h1>Hisobni tiklash</h1>

        <p className="auth-subtitle">
          Hisobingiz ma'lumotlarini kiriting
        </p>

        <form>

          <div className="input-group">
            <label>Username</label>

            <input
              type="text"
              placeholder="Usernameingizni kiriting"
            />
          </div>

          <div className="input-group">
            <label>Parol</label>

            <PasswordInput
              value=""
              onChange={() => {}}
              placeholder="Eski parolingizni kiriting"
            />
          </div>

          <button className="auth-button">
            Hisobni tiklash
          </button>

        </form>

        <div className="auth-bottom">

          <Link to="/">
            ← Kirish sahifasiga qaytish
          </Link>

        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;