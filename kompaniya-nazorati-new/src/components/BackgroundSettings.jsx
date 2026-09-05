import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../utils/language";
import { getCurrentUser } from "../utils/storage";
import { authApi } from "../services/api";
import { getBackgroundMedia, removeBackgroundMedia, saveBackgroundMedia } from "../utils/backgroundStorage";
import SolarSystemBackground from "./SolarSystemBackground";

const BACKGROUND_KEY_PREFIX = "app_background_media_";
const BACKGROUND_MODE_KEY_PREFIX = "app_background_mode_";
const backgroundEvent = "app-background-change";

function getBackgroundKey(userId) {
  return `${BACKGROUND_KEY_PREFIX}${userId}`;
}

function getBackgroundModeKey(userId) {
  return `${BACKGROUND_MODE_KEY_PREFIX}${userId}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export function getSavedBackground(userId = getCurrentUser()?.id) {
  if (!userId) return null;
  try {
    return JSON.parse(localStorage.getItem(getBackgroundKey(userId)) || "null");
  } catch {
    return null;
  }
}

export async function getStoredBackground(userId) {
  if (!userId) return null;
  const stored = await getBackgroundMedia(getBackgroundKey(userId));
  return stored || getSavedBackground(userId);
}

function BackgroundSettings() {
  const t = useLanguage();
  const location = useLocation();
  const userId = getCurrentUser()?.id;
  const isDashboard = ["/dashboard", "/company-panel", "/employee-panel"].includes(location.pathname);
  const [open, setOpen] = useState(false);
  const [background, setBackground] = useState(() => getSavedBackground(userId));
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const handleBackgroundChange = (event) => setBackground(event.detail || null);
    window.addEventListener(backgroundEvent, handleBackgroundChange);
    return () => window.removeEventListener(backgroundEvent, handleBackgroundChange);
  }, []);

  useEffect(() => {
    setOpen(false);
    getStoredBackground(userId).then(setBackground).catch(() => setBackground(getSavedBackground(userId)));
  }, [location.pathname, userId]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app-background-settings", { detail: { open } }));
  }, [open]);

  const chooseBackground = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError(t.backgroundTypeError);
      return;
    }

    try {
      localStorage.removeItem(getBackgroundModeKey(userId));
      const token = JSON.parse(localStorage.getItem("authSession") || "null")?.token;
      if (token) await authApi.setBackgroundMode("", token);
      const media = { type: file.type.startsWith("video/") ? "video" : "image", src: await readFileAsDataUrl(file) };
      await saveBackgroundMedia(getBackgroundKey(userId), media);
      if (media.type === "image") localStorage.setItem(getBackgroundKey(userId), JSON.stringify(media));
      setBackground(media);
      window.dispatchEvent(new CustomEvent(backgroundEvent, { detail: media }));
      setError("");
    } catch {
      setError(t.backgroundReadError);
    }
  };

  const resetBackground = async () => {
    localStorage.removeItem(getBackgroundKey(userId));
    localStorage.removeItem(getBackgroundModeKey(userId));
    await removeBackgroundMedia(getBackgroundKey(userId)).catch(() => {});
    const token = JSON.parse(localStorage.getItem("authSession") || "null")?.token;
    if (token) await authApi.setBackgroundMode("", token).catch(() => {});
    setBackground(null);
    window.dispatchEvent(new CustomEvent(backgroundEvent, { detail: null }));
    setOpen(false);
  };

  if (!isDashboard || !userId) return null;

  return (
    <>
      <button className="background-settings-button" type="button" title={t.backgroundButton} aria-label={t.backgroundButton} onClick={() => setOpen(true)}>
        <span className="background-settings-icon" aria-hidden="true">
          <span className="background-settings-sun" />
          <span className="background-settings-mountain background-settings-mountain-back" />
          <span className="background-settings-mountain background-settings-mountain-front" />
        </span>
        <span className="background-settings-label">{t.backgroundShort}</span>
      </button>
      {open && createPortal(
        <div className="background-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="background-modal" role="dialog" aria-modal="true" aria-labelledby="background-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="background-modal-header">
              <div><span className="page-location">RBN / MEDIA</span><h2 id="background-modal-title">{t.backgroundTitle}</h2></div>
              <button className="modal-close" type="button" aria-label={t.close} onClick={(event) => { event.stopPropagation(); setOpen(false); }}>×</button>
            </div>
            <p className="background-modal-description">{t.backgroundDescription}</p>
            <input ref={inputRef} className="file-input" type="file" accept="image/*,video/*" onChange={chooseBackground} />
            <button className="auth-button" type="button" onClick={() => inputRef.current?.click()}>{t.backgroundChoose}</button>
            {background && (
              <div className="standard-animation-option">
                <SolarSystemBackground preview />
                <button className="background-reset-button" type="button" onClick={resetBackground}>{t.backgroundReset}</button>
              </div>
            )}
            {background && <p className="background-current">{t.backgroundCurrent}</p>}
            {error && <div className="auth-error">{error}</div>}
          </section>
        </div>,
        document.body
      )}
    </>
  );
}

export function CustomBackground() {
  const [userId, setUserId] = useState(() => getCurrentUser()?.id || null);
  const [background, setBackground] = useState(() => getSavedBackground(userId));

  useEffect(() => {
    const handleBackgroundChange = (event) => setBackground(event.detail || null);
    const handleSessionChange = (event) => {
      const nextUserId = event.detail?.userId || event.detail?.user?.id || null;
      setUserId(nextUserId);
      getStoredBackground(nextUserId).then(setBackground).catch(() => setBackground(null));
    };
    window.addEventListener(backgroundEvent, handleBackgroundChange);
    window.addEventListener("app-session-change", handleSessionChange);
    return () => {
      window.removeEventListener(backgroundEvent, handleBackgroundChange);
      window.removeEventListener("app-session-change", handleSessionChange);
    };
  }, []);

  useEffect(() => {
    getStoredBackground(userId).then(setBackground).catch(() => setBackground(null));
  }, [userId]);

  if (!background?.src) return null;
  if (background.type === "video") {
    return <video className="custom-background-media" src={background.src} autoPlay loop muted playsInline aria-hidden="true" />;
  }
  return <img className="custom-background-media" src={background.src} alt="" aria-hidden="true" />;
}

export default BackgroundSettings;
