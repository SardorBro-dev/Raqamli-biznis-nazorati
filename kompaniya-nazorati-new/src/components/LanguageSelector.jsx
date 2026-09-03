import { useState } from "react";
import { getLanguage, setLanguage, useLanguage } from "../utils/language";

const LANGUAGES = [
  { value: "uz", label: "O'zbek" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

function getSavedLanguage() {
  const savedLanguage = getLanguage();
  return LANGUAGES.some((language) => language.value === savedLanguage) ? savedLanguage : "uz";
}

function LanguageSelector() {
  const t = useLanguage();
  const [language, setSelectedLanguage] = useState(getSavedLanguage);

  const handleChange = (event) => {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    setLanguage(nextLanguage);
  };

  return (
    <label className="language-selector">
      <span>{t.language}</span>
      <select value={language} onChange={handleChange} aria-label={t.chooseLanguage}>
        {LANGUAGES.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelector;
