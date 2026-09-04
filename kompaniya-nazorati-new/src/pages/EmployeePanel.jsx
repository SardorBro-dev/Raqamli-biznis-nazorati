import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  addNotification,
  clearSession,
  getCompanyById,
  getCurrentSession,
  getCurrentUser,
  getEmployeeProfile,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "../utils/storage";
import { companyApi, employeeApi, workSessionsApi } from "../services/api";
import { useLanguage } from "../utils/language";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_DATA = AUTH_MODE === "local";
const IS_ANDROID = Capacitor.getPlatform() === "android";

function EmployeePanel() {
  const navigate = useNavigate();
  const t = useLanguage();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [cameraStatus, setCameraStatus] = useState("Kamera uchun ruxsat kutilmoqda...");
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [micStatus, setMicStatus] = useState("Mikrofon uchun ruxsat kutilmoqda...");
  const [screenStatus, setScreenStatus] = useState("Ekran ulashish hozircha mavjud emas.");
  const [reason, setReason] = useState("");
  const [showReasonBox, setShowReasonBox] = useState(false);
  const [faceMessage, setFaceMessage] = useState("");
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [workStatus, setWorkStatus] = useState("not_working");
  const [workMessage, setWorkMessage] = useState("");
  const mediaStreamsRef = useRef([]);
  const mediaStreamTypesRef = useRef(new Map());
  const animationFrameRef = useRef(null);

  const registerMediaStream = (stream, type) => {
    mediaStreamsRef.current.push(stream);
    mediaStreamTypesRef.current.set(stream, type);
  };

  const stopMediaStreams = (type = null) => {
    const streamsToStop = mediaStreamsRef.current.filter(
      (stream) => type === null || mediaStreamTypesRef.current.get(stream) === type
    );

    streamsToStop.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamTypesRef.current.delete(stream);
    });
    mediaStreamsRef.current = mediaStreamsRef.current.filter(
      (stream) => !streamsToStop.includes(stream)
    );

    if (type === null || type === "screen") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    const previewIds = type === "camera"
      ? ["camera-preview"]
      : type === "screen"
        ? ["screen-preview"]
        : type === null
          ? ["camera-preview", "screen-preview"]
          : [];
    previewIds.forEach((id) => {
      const video = document.getElementById(id);
      if (video) video.srcObject = null;
    });
  };

  useEffect(() => {
    const session = getCurrentSession();
    const currentUser = getCurrentUser();

    if (IS_ANDROID && currentUser?.role === "employee") {
      clearSession();
      navigate("/");
      return;
    }

    // Xodim panel faqat employee roli uchun
    if (!session || !currentUser) {
      navigate("/");
      return;
    }

    // Xodim roli tekshiruvi
    if (currentUser.role !== "employee") {
      console.warn("Xodim panel: Roli 'employee' emas, rolni:", currentUser.role);
      navigate("/");
      return;
    }

    const loadEmployee = async () => {
      if (USE_LOCAL_DATA) {
        const profile = getEmployeeProfile(currentUser.id);
        const targetCompany = profile ? getCompanyById(profile.companyId) : null;

        if (!profile) {
          setFaceMessage(`Xodim profili topilmadi. ID: ${currentUser.id}`);
          return;
        }

        if (!targetCompany) {
          setFaceMessage("Kompaniya topilmadi.");
          return;
        }

        if (currentUser.status === "fired") {
          setAccessRevoked(true);
          setFaceMessage("Siz ushbu kompaniyada faol xodim emassiz.");
          return;
        }

        if (profile.status === "fired") {
          setAccessRevoked(true);
          setFaceMessage("Siz ishdan bo'shatilgansiz. Xodim panelidan foydalanish yopildi.");
          return;
        }

        setUser(currentUser);
        setEmployee(profile);
        setCompany(targetCompany);
        return;
      }

      if (!session.token) {
        navigate("/");
        return;
      }

      try {
        const response = await employeeApi.getMe(session.token);
        const targetCompany = await companyApi.getById(response.company_id, session.token);
        const [workStart, workEnd] = (response.work_schedule || "09:00-18:00").split("-");

        setUser(currentUser);
        setEmployee({
          id: response.id,
          userId: response.user_id,
          companyId: response.company_id,
          name: `${response.first_name} ${response.last_name}`.trim(),
          username: response.username,
          position: response.position,
          department: response.department,
          status: response.status,
          workStart,
          workEnd,
          breakStart: "13:00",
          breakEnd: "14:00",
          workType: response.work_type || "computer",
          isOnline: response.status === "working",
          backend: true,
        });
        setWorkStatus(response.status || "not_working");
        setCompany({
          ...targetCompany,
          ownerId: targetCompany.owner_id,
          directorName: targetCompany.owner_name,
        });
      } catch {
        setFaceMessage("Xodim ma'lumotlarini yuklab bo'lmadi.");
      }
    };

    loadEmployee();
  }, [navigate]);

  useEffect(() => {
    const session = getCurrentSession();
    const currentUser = getCurrentUser();
    if (!session || !currentUser || currentUser.role !== "employee") return undefined;

    const revokeAccess = () => {
      setAccessRevoked(true);
      setFaceMessage("Siz ishdan bo'shatilgansiz. Xodim panelidan foydalanish yopildi.");
      stopMediaStreams();
    };

    if (USE_LOCAL_DATA) {
      const handleStorageChange = (event) => {
        if (event.key !== STORAGE_KEYS.employees) return;
        const profile = getEmployeeProfile(currentUser.id);
        if (profile?.status === "fired") revokeAccess();
      };
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }

    const checkAccess = async () => {
      try {
        const profile = await employeeApi.getMe(session.token);
        if (profile.status === "fired") revokeAccess();
      } catch (error) {
        if (error.status === 403) revokeAccess();
      }
    };

    const accessTimer = window.setInterval(checkAccess, 5000);
    return () => window.clearInterval(accessTimer);
  }, []);

  useEffect(() => () => stopMediaStreams(), []);

  const persistPresence = (overrides = {}) => {
    const now = new Date().toISOString();
    const nextState = {
      lastActivity: now,
      isOnline: true,
      cameraEnabled: false,
      ...overrides,
    };

    const employeeProfile = getEmployeeProfile(user?.id);
    if (!employeeProfile) return;

    const updated = {
      ...employeeProfile,
      ...nextState,
    };

    const employees = readStorage(STORAGE_KEYS.employees, []);
    writeStorage(
      STORAGE_KEYS.employees,
      employees.map((item) => (item.id === employeeProfile.id ? updated : item))
    );
    setEmployee(updated);
  };

  const requestCamera = async () => {
    if (!window.isSecureContext) {
      setCameraStatus("Kamera ishlashi uchun localhost yoki HTTPS muhitida bo'lish kerak. Iltimos, ilovani localhost/https orqali oching.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("Kamera qo'llab-quvvatlanmayapti.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      if (!videoDevices.length) {
        persistPresence({ cameraEnabled: false, isOnline: true });
        setCameraStatus("Kamera topilmadi. Xona kamerasini USB/DVR orqali ulang.");
        return false;
      }
      stopMediaStreams("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
      });
      registerMediaStream(stream, "camera");
      const video = document.getElementById("camera-preview");
      if (video) {
        video.srcObject = stream;
      }
      persistPresence({ cameraEnabled: true, isOnline: true });
      const refreshedDevices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === "videoinput");
      setCameraDevices(refreshedDevices);
      const activeDeviceId = stream.getVideoTracks()[0]?.getSettings?.().deviceId;
      if (activeDeviceId) setSelectedCameraId(activeDeviceId);
      setCameraStatus("Xona kamerasi ulandi. Rahbaringiz hozir kamerani ko'ra oladi.");
      return true;
      
    } catch (error) {
      persistPresence({ cameraEnabled: false, isOnline: true });
      setCameraStatus(error.name === "NotFoundError"
        ? "Kamera topilmadi. Xona kamerasini USB/DVR orqali ulang."
        : `Kamera ruxsati berilmagan: ${error.name}`);
      return false;
    }
  };

  const requestMicrophone = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus("Mikrofon qo'llab-quvvatlanmayapti.");
      return;
    }

    try {
      stopMediaStreams("microphone");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      registerMediaStream(stream, "microphone");
      persistPresence({ isOnline: true });
      setMicStatus("Mikrofon ulandi va faoldir.");
      
    } catch (error) {
      setMicStatus(`Mikrofon ruxsati berilmadi: ${error.name}. Android sozlamalarida Mikrofon ruxsatini yoqing.`);
    }
  };

  const shareScreen = async () => {
    if (window.Capacitor?.getPlatform?.() === "android") {
      setScreenStatus("Android APK ichida real ekran uzatish qo'llab-quvvatlanmaydi. Bu funksiya Windows yoki HTTPS brauzerda ishlaydi.");
      return;
    }

    // HTTPS yoki localhost tekshirish
    const isSecureContext = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    
    if (!isSecureContext) {
      setScreenStatus("❌ Ekran ulashish uchun HTTPS kerak yoki localhost-da bo'lishi kerak.");
      return;
    }

    // Agar getDisplayMedia mavjud bo'lsa, real ekrani share qil
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        stopMediaStreams("screen");
        // User-ga ekran tanlash uchun dialog ko'rsatish
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            cursor: "always" 
          },
          audio: false 
        });
        registerMediaStream(stream, "screen");

        const screen = document.getElementById("screen-preview");
        if (screen) {
          screen.srcObject = stream;
          screen.play().catch(err => {
            console.warn("Video play xatosi:", err);
          });
        }

        // Stream to'xtarsa notifikatsiya jo'natish
        stream.getVideoTracks()[0].onended = () => {
          setScreenStatus("Ekran ulashish to'xtatildi.");
          mediaStreamsRef.current = mediaStreamsRef.current.filter((item) => item !== stream);
          mediaStreamTypesRef.current.delete(stream);
          if (screen) {
            screen.srcObject = null;
          }
        };

        persistPresence({ isOnline: true });
        setScreenStatus("✅ Ekran ko'rsatilmoqda! Manager ekraningizni ko'ra oladi.");
        
      } catch (error) {
        if (error.name === "NotAllowedError") {
          setScreenStatus("⚠️ Ekran ulashish bekor qilindi (siz ruxsat bermadingiz).");
        } else if (error.name === "NotFoundError") {
          setScreenStatus("⚠️ Display/monitor topilmadi.");
        } else if (error.name === "SystemError") {
          setScreenStatus("⚠️ Tizim xatosi: ekran ulashish vaqtincha mumkin emas.");
        } else {
          console.warn("getDisplayMedia xatosi, simulyatsion rejimga o'tish:", error.name);
          setScreenStatus(`Ekran uzatib bo'lmadi: ${error.name}. Bu qurilma yoki browser ekran uzatishni qo'llamaydi.`);
        }
      }
    } else {
      setScreenStatus("Bu qurilma real ekran uzatishni qo'llab-quvvatlamaydi. Windows yoki HTTPS brauzerdan foydalaning.");
    }
  };

  const simulatePresence = () => {
    persistPresence({ isOnline: true, cameraEnabled: true });
    setFaceMessage("Xush kelibsiz. Ish joyingizga qaytdingiz.");
    setShowReasonBox(true);
  };

  const simulateAbsence = () => {
    const companyId = company?.id;
    const offlineSince = employee?.lastActivity || new Date().toISOString();
    const offlineMinutes = Math.max(0, Math.floor((Date.now() - new Date(offlineSince).getTime()) / (1000 * 60)));

    persistPresence({ isOnline: false, cameraEnabled: false, lastActivity: new Date().toISOString() });

    const notification = {
      companyId,
      employeeName: user?.name || user?.username,
      type: "away",
      message: `${user?.name || user?.username} tizimdan chiqib, ${offlineMinutes} daqiqa oflayn bo'ldi.`,
    };
    addNotification(notification);
    setFaceMessage(`Diqqat! Ishchi tizimdan chiqdi. Offline vaqt: ${offlineMinutes} daqiqa.`);
    setShowReasonBox(true);
  };

  const sendReason = () => {
    if (!reason.trim()) return;
    const companyId = company?.id;
    const items = readStorage(STORAGE_KEYS.notifications, []);
    const notif = {
      id: `notif_${Date.now()}`,
      companyId,
      employeeName: user?.name || user?.username,
      type: "reason",
      message: "Tushuntirish xati yuborildi.",
      detail: reason,
      time: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.notifications, [notif, ...items]);
    setReason("");
    setShowReasonBox(false);
    setFaceMessage("Tushuntirish xati rahbar paneliga yuborildi.");
  };

  const changeWorkStatus = async (action) => {
    if (!employee) return;

    try {
      if (action === "start" && employee.workType === "physical") {
        const cameraReady = await requestCamera();
        if (!cameraReady) return;
      }
      if (employee.backend) {
        const response = await workSessionsApi[action](employee.id, getCurrentSession()?.token);
        setWorkStatus(response.status);
        setEmployee((currentEmployee) => currentEmployee
          ? { ...currentEmployee, isOnline: response.status !== "not_working" }
          : currentEmployee);
      } else {
        const nextStatus = {
          start: "working",
          break: "on_break",
          resume: "working",
          end: "not_working",
        }[action];
        setWorkStatus(nextStatus);
        persistPresence({
          isOnline: nextStatus !== "not_working",
          status: nextStatus,
        });
      }
      setWorkMessage("");
    } catch (error) {
      setWorkMessage(error.message || "Ish holatini o'zgartirib bo'lmadi.");
    }
  };

  const logout = () => {
    clearSession();
    navigate("/");
  };

  if (accessRevoked) {
    return (
      <div className="employee-page">
        <div className="employee-access-revoked" role="alert">
          <h2>Siz ishdan bo'shatilgansiz</h2>
          <p>Xodim panelidan foydalanish to'xtatildi.</p>
          <button className="logout-button" onClick={logout}>Kirish sahifasiga qaytish</button>
        </div>
      </div>
    );
  }

  if (!user || !employee || !company) {
    return <div className="empty-state">{faceMessage || "Xodim ma'lumotlari yuklanmoqda..."}</div>;
  }

  return (
    <div className="employee-page">
      <div className="employee-shell">
        <header className="employee-header">
          <div>
            <div className="panel-kicker">👤 {user.name}</div>
            <h1>{company.name}</h1>
          </div>
          <button className="logout-button" onClick={logout}>{t.logout}</button>
        </header>

        <div className="employee-grid">
          <div className="content-card">
            <h3>{t.employee}</h3>
            <div className="info-list">
              <p>👤 Xodim ismi: {user.name}</p>
              <p>🏢 Kompaniya: {company.name}</p>
              <p>⏰ Ish vaqti: {employee.workStart} — {employee.workEnd}</p>
              <p>☕ Abed vaqti: {employee.breakStart} — {employee.breakEnd}</p>
              <p>📋 Bugungi holat: {employee.isOnline ? "Faol" : "Ishlamayapti"}</p>
            </div>
            <div className="media-controls">
              {workStatus === "not_working" || workStatus === "completed" ? (
                <button className="primary-button" onClick={() => changeWorkStatus("start")}>Ishga kirish</button>
              ) : null}
              {workStatus === "working" ? (
                <button className="secondary-button" onClick={() => changeWorkStatus("break")}>{t.notStarted}</button>
              ) : null}
              {workStatus === "on_break" ? (
                <button className="primary-button" onClick={() => changeWorkStatus("resume")}>{t.continue}</button>
              ) : null}
              {workStatus === "working" || workStatus === "on_break" ? (
                <button className="danger-button" onClick={() => changeWorkStatus("end")}>{t.endMeeting}</button>
              ) : null}
            </div>
            <p>Ish sessiyasi: {workStatus}</p>
            {workMessage && <div className="auth-error">{workMessage}</div>}
          </div>

          <div className="content-card">
            <h3>{t.settings}</h3>
            <div className="media-controls">
              <button className="primary-button" onClick={requestCamera}>Kamera ruxsatini so'rash</button>
              <button className="primary-button" onClick={requestMicrophone}>Mikrofonni yoqish</button>
              <button className="primary-button" onClick={shareScreen}>Ekranni ulashish</button>
            </div>
            {cameraDevices.length > 1 && <label className="input-group">Xona kamerasini tanlang
              <select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>
                {cameraDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${index + 1}`}</option>)}
              </select>
            </label>}
            <p>{cameraStatus}</p>
            <p>{micStatus}</p>
            <p>{screenStatus}</p>
            <video id="camera-preview" autoPlay muted playsInline className="preview-video" />
            <video id="screen-preview" autoPlay playsInline className="preview-video" />
          </div>
        </div>

        <div className="content-card">
          <div className="section-row">
            <h3>{t.monitoring}</h3>
            <button className="secondary-button" onClick={simulatePresence}>Ish joyiga qaytdim</button>
            <button className="danger-button" onClick={simulateAbsence}>Yuz aniqlanmagan</button>
          </div>
          {faceMessage && <div className="status-badge">{faceMessage}</div>}
          {showReasonBox && (
            <div className="reason-box">
              <label>Tushuntirish xati</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sababni yozing..." />
              <button className="primary-button" onClick={sendReason}>{t.send}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeePanel;
