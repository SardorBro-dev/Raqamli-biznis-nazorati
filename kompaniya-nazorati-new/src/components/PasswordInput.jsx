import { useState } from "react";

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
  name,
  id,
  disabled,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        disabled={disabled}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
      >
        <span className={`eye-icon ${showPassword ? "is-visible" : ""}`} aria-hidden="true">
          <svg viewBox="0 0 24 16" focusable="false">
            <path className="eye-outline" d="M1.5 8S5.2 2.5 12 2.5 22.5 8 22.5 8 18.8 13.5 12 13.5 1.5 8 1.5 8Z" />
            <circle className="eye-iris" cx="12" cy="8" r="3.3" />
            <circle className="eye-pupil" cx="12" cy="8" r="1.5" />
            {!showPassword && <path className="eye-slash" d="M3 2.5 21 13.5" />}
          </svg>
        </span>
      </button>
    </div>
  );
}

export default PasswordInput;
