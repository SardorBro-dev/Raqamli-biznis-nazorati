import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentSession, getCurrentUser } from "../utils/storage";

function MeetingRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const room = params.get("room")?.trim();
  const session = getCurrentSession();
  const currentUser = getCurrentUser();
  const [fallbackMessage, setFallbackMessage] = useState("");

  useEffect(() => {
    if (!session?.token || !currentUser) {
      navigate("/", { replace: true });
      return;
    }

    if (!room) {
      setFallbackMessage("Majlis xonasi topilmadi. Iltimos, Telegramdagi havolani qayta oching.");
      return;
    }

    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01]))\./.test(window.location.hostname);

    if (!isLocalHost) {
      setFallbackMessage("Majlisga kirish uchun lokal localhost yoki shu Wi‑Fi tarmog‘idagi manzil kerak. Iltimos, localhost yoki LAN URL orqali oching.");
      return;
    }

    setFallbackMessage("Majlis shu loyiha ichida, localhost link orqali ochiladi. Browserda kamera va mikrofon ruxsatini bering.");
  }, [currentUser, navigate, room, session]);

  if (!room) {
    return <div className="empty-state">Majlis xonasi topilmadi. Iltimos, Telegramdagi havolani qayta oching.</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "grid", placeItems: "center", background: "#0d1117", color: "#fff", fontFamily: "sans-serif", padding: "24px" }}>
      <div style={{ maxWidth: 620, textAlign: "center", lineHeight: 1.6 }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Majlisga kirish</h2>
        <p style={{ margin: 0, color: "#d0d7de" }}>
          {fallbackMessage || "Majlis localhost orqali ochiladi."}
        </p>
        <p style={{ marginTop: 16, color: "#c5e7d1" }}>
          Bu havola ochiladi: <strong>http://localhost:5173</strong>
        </p>
      </div>
    </div>
  );
}

export default MeetingRoom;
