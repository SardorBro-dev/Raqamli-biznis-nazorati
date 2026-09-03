import { useState, useEffect } from "react";
import "../styles/ColorThemeSelector.css";

const DEFAULT_COLOR = "#c9f269";
const DEFAULT_DARK = "#89a83c";

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = (red, green, blue) => `#${[red, green, blue]
  .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
  .join("")}`;

const mixColors = (first, second, amount) => {
  const firstRgb = hexToRgb(first);
  const secondRgb = hexToRgb(second);
  return rgbToHex(
    firstRgb.red + (secondRgb.red - firstRgb.red) * amount,
    firstRgb.green + (secondRgb.green - firstRgb.green) * amount,
    firstRgb.blue + (secondRgb.blue - firstRgb.blue) * amount,
  );
};

const rotateHue = (hex, degrees) => {
  const { red, green, blue } = hexToRgb(hex);
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const lightness = (max + min) / 2;
  const difference = max - min;
  if (!difference) return hex;
  const saturation = difference / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === red / 255) hue = ((green - blue) / 255 / difference) % 6;
  else if (max === green / 255) hue = (blue - red) / 255 / difference + 2;
  else hue = (red - green) / 255 / difference + 4;
  hue = ((hue * 60 + degrees) % 360 + 360) % 360;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = lightness - chroma / 2;
  const channels = hue < 60 ? [chroma, second, 0] : hue < 120 ? [second, chroma, 0] : hue < 180 ? [0, chroma, second] : hue < 240 ? [0, second, chroma] : hue < 300 ? [second, 0, chroma] : [chroma, 0, second];
  return rgbToHex((channels[0] + match) * 255, (channels[1] + match) * 255, (channels[2] + match) * 255);
};

const darkenColor = (hex) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = 50;
  const usePound = true;

  let R = (num >> 16) & 255;
  let G = (num >> 8) & 255;
  let B = num & 255;

  R = Math.max(0, R - amt);
  G = Math.max(0, G - amt);
  B = Math.max(0, B - amt);

  return (usePound ? "#" : "") + (0x1000000 + R * 0x10000 + G * 0x100 + B)
    .toString(16)
    .slice(1);
};

export default function ColorThemeSelector() {
  const [customColor, setCustomColor] = useState(DEFAULT_COLOR);
  const [showMenu, setShowMenu] = useState(false);
  const isDefaultColor = customColor.toLowerCase() === DEFAULT_COLOR;

  useEffect(() => {
    const savedCustom = localStorage.getItem("app-custom-color");
    
    if (savedCustom) {
      setCustomColor(savedCustom);
      applyCustomTheme(savedCustom);
    } else {
      applyCustomTheme(DEFAULT_COLOR);
    }
  }, []);

  const applyCustomTheme = (color) => {
    const root = document.documentElement;
    const darkColor = darkenColor(color);
    const tealColor = rotateHue(mixColors(color, "#111513", .62), 155);
    const orangeColor = rotateHue(color, 330);
    const rgb = hexToRgb(color);
    root.style.setProperty("--lime", color);
    root.style.setProperty("--lime-dark", darkColor);
    root.style.setProperty("--teal", tealColor);
    root.style.setProperty("--orange", orangeColor);
    root.style.setProperty("--lime-rgb", `${rgb.red}, ${rgb.green}, ${rgb.blue}`);
    localStorage.setItem("app-custom-color", color);
    setCustomColor(color);
  };

  const handleCustomColor = (e) => {
    const color = e.target.value;
    applyCustomTheme(color);
  };

  const handleReset = () => {
    applyCustomTheme(DEFAULT_COLOR);
    setShowMenu(false);
  };

  return (
    <div className="color-theme-selector">
      <button
        type="button"
        className={`color-theme-button ${showMenu ? "is-active" : ""}`}
        aria-label="Rangni o‘zgartirish"
        title="Rangni o‘zgartirish"
        onClick={() => {
          setShowMenu(!showMenu);
        }}
      >
        <span className="color-theme-button-icon" aria-hidden="true">
          <img src="/assets/RangTugmaLogosi.png" alt="" draggable="false" onError={(event) => { event.currentTarget.style.display = "none"; }} />
        </span>
        <span className="color-theme-button-label">Rangni o‘zgartirish</span>
      </button>

      {showMenu && (
        <div className="color-theme-menu">
          <div className="color-theme-menu-heading">
            <span className="color-theme-menu-icon" aria-hidden="true" />
            <div>
              <strong>Sayt rangi</strong>
              <span>Ko‘rinishni moslang</span>
            </div>
          </div>

          <div className="color-theme-picker-row">
            <input
              type="color"
              value={customColor}
              onChange={handleCustomColor}
              className="color-theme-picker"
              title="Rang tanlang"
            />
            <div className="color-theme-value">
              <span>Tanlangan rang</span>
              <div className="color-theme-preview" style={{ backgroundColor: customColor }} />
              <strong>Rangni tanlang</strong>
            </div>
          </div>

          {!isDefaultColor && (
            <button
              type="button"
              onClick={handleReset}
              className="color-theme-reset"
            >
              <span aria-hidden="true">↺</span>
              Standart rangga qaytarish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
