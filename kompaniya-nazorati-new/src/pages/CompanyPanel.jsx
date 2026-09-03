import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import CompanyLogo from "../components/CompanyLogo";
import SidebarIcon from "../components/SidebarIcon";
import { communicationsApi, employeeApi } from "../services/api";
import { useLanguage } from "../utils/language";
import {
  addNotification,
  BANNED_WORDS,
  clearSession,
  getCompanyById,
  getCompanyEmployees,
  getCompanyMessages,
  getCompanyNews,
  getCurrentSession,
  getCurrentUser,
  readStorage,
  STORAGE_KEYS,
  PLANS,
  writeStorage,
  getCompanyMonitoring,
  checkEmployeeIdleStatus,
  isValidImageUrl,
  getEmployeeOfflineMinutes,
  createLocalEmployee,
  isMessageBlocked,
} from "../utils/storage";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_EMPLOYEE_STORAGE = AUTH_MODE === "local";
const LOCAL_MEETING_ORIGIN = "http://localhost:5173";

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const tabs = [
  { key: "overview", label: "overview" },
  { key: "employees", label: "employees" },
  { key: "chat", label: "chat" },
  { key: "meeting", label: "meeting" },
  { key: "news", label: "news" },
  { key: "tariffs", label: "tariffs" },
  { key: "settings", label: "settings" },
];

const tabIcons = { overview: "chart", employees: "users", chat: "chat", meeting: "meeting", news: "news", tariffs: "plan", settings: "settings" };

function getLocalNetworkOrigin() {
  const { protocol, port, hostname } = window.location;
  const currentOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

  if (hostname && !["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname)) {
    return currentOrigin;
  }

  if (!window.RTCPeerConnection) return currentOrigin;

  return new Promise((resolve) => {
    const candidateIps = new Set();
    const rtc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    rtc.onicecandidate = (event) => {
      if (!event.candidate) {
        const chosen = [...candidateIps].find((ip) => ip && !/^127\.|^0\.|^169\.254\./.test(ip));
        resolve(chosen ? `${protocol}//${chosen}${port ? `:${port}` : ""}` : currentOrigin);
        rtc.close();
        return;
      }

      const match = event.candidate.candidate.match(/(?:\d{1,3}\.){3}\d{1,3}/);
      if (match) {
        const ip = match[0];
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
          candidateIps.add(ip);
        }
      }
    };

    rtc.createDataChannel("");
    rtc.createOffer().then((offer) => rtc.setLocalDescription(offer)).catch(() => {
      resolve(currentOrigin);
      rtc.close();
    });
  });
}

function CompanyPanel() {
  const navigate = useNavigate();
  const t = useLanguage();
  const session = getCurrentSession();
  const currentUser = getCurrentUser();
  const sessionUserId = session?.userId;
  const sessionToken = session?.token;
  const currentUserId = currentUser?.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [company, setCompany] = useState(null);
  const [companyLogo, setCompanyLogo] = useState("");
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [news, setNews] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: "",
    username: "",
    password: "",
    position: "",
    department: "",
    status: "active",
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    residence: "",
    phone: "",
    gender: "",
    position: "",
    username: "",
    password: "",
    isOnline: false,
    workStart: "09:00",
    workEnd: "18:00",
    breakDuration: "60",
    breakStart: "13:00",
    breakEnd: "14:00",
  });
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    directorName: "",
    info: "",
  });
  const [newsForm, setNewsForm] = useState({
    title: "",
    description: "",
    image: "",
  });
  const [messageStatus, setMessageStatus] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [meetingActive, setMeetingActive] = useState(false);
  const [meetingCamera, setMeetingCamera] = useState(true);
  const [meetingMicrophone, setMeetingMicrophone] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingError, setMeetingError] = useState("");
  const meetingStreamRef = useRef(null);
  const meetingVideoRef = useRef(null);

  useEffect(() => {
    if (!sessionUserId || !currentUserId) {
      navigate("/");
      return;
    }

    const savedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "null");

    if (!savedCompany) {
      navigate("/dashboard");
      return;
    }

    const storedCompany = getCompanyById(savedCompany.id);
    const companyData = storedCompany || {
      ...savedCompany,
      ownerId: savedCompany.ownerId || savedCompany.owner_id,
      directorName: savedCompany.directorName || savedCompany.owner_name,
      plan: savedCompany.plan || savedCompany.subscription_plan || "trial",
      employeeCount: Number(savedCompany.employeeCount || 0),
    };
    if (!companyData) {
      navigate("/dashboard");
      return;
    }

    setCompany(companyData);
    const savedLogos = JSON.parse(localStorage.getItem("company_logos") || "{}");
    setCompanyLogo(savedLogos[companyData.id] || "");
    setSettingsForm({
      name: companyData.name,
      directorName: companyData.directorName,
      info: companyData.info || "",
    });
    if (USE_LOCAL_EMPLOYEE_STORAGE) {
      setEmployees(getCompanyEmployees(companyData.id));
    } else if (sessionToken) {
      employeeApi.list(companyData.id, sessionToken)
        .then((remoteEmployees) => {
          setEmployees(remoteEmployees.map((item) => {
            const [workStart, workEnd] = (item.work_schedule || "09:00-18:00").split("-");
            return {
              id: item.id,
              userId: item.user_id,
              companyId: item.company_id,
              name: `${item.first_name} ${item.last_name}`,
              username: item.username,
              position: item.position || "Xodim",
              department: item.department || "Umumiy",
              workStart,
              workEnd,
              status: item.status,
              isOnline: item.status !== "not_working",
              currentTask: "",
            };
          }));
        })
        .catch(() => setEmployees(getCompanyEmployees(companyData.id)));
    }
    if (USE_LOCAL_EMPLOYEE_STORAGE) {
      setMessages(getCompanyMessages(companyData.id));
      setNews(getCompanyNews(companyData.id));
    } else if (sessionToken) {
      communicationsApi.listMessages(companyData.id, sessionToken)
        .then(setMessages)
        .catch(() => setMessageStatus("Chatni yuklab bo'lmadi."));
      communicationsApi.listNews(companyData.id, sessionToken)
        .then((remoteNews) => setNews(remoteNews.map((item) => ({ ...item, createdAt: item.created_at }))))
        .catch(() => setMessageStatus("Yangiliklarni yuklab bo'lmadi."));
    }
    
  }, [navigate, sessionUserId, sessionToken, currentUserId]);

  const companyEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.status !== "fired").length,
    [employees]
  );

  const getEmployeeLiveState = (employee) => {
    const offlineMinutes = getEmployeeOfflineMinutes(employee.id);
    const isOffline = !employee.isOnline || offlineMinutes > 5;

    return {
      offlineMinutes,
      cameraLive: Boolean(employee.cameraEnabled && employee.isOnline),
      statusLabel: isOffline ? `Offline ${offlineMinutes} daqiqa` : "Tizimda",
    };
  };

  const monitoring = useMemo(() => {
    if (company) {
      checkEmployeeIdleStatus(company.id);
      const employeeIds = new Set(employees.map((employee) => employee.id));
      const nextMonitoring = getCompanyMonitoring(company.id);
      return {
        ...nextMonitoring,
        employees: nextMonitoring.employees.filter((employee) => employeeIds.has(employee.id)),
      };
    }
    return null;
  }, [company, employees]);

  const visibleMonitoringEmployees = useMemo(
    () => monitoring?.employees?.filter((monitoringEmployee) =>
      employees.some((employee) => employee.id === monitoringEmployee.id && employee.status !== "fired")
    ) || [],
    [employees, monitoring]
  );

  const visibleActiveEmployees = visibleMonitoringEmployees.filter(
    (employee) => employee.isOnline && employee.status === "active"
  ).length;
  const visibleIdleEmployees = visibleMonitoringEmployees.filter(
    (employee) => employee.status === "idle"
  ).length;
  const visibleOfflineEmployees = visibleMonitoringEmployees.length - visibleActiveEmployees - visibleIdleEmployees;

  const addEmployee = async (event) => {
    event.preventDefault();

    if (!company) return;

    const name = employeeForm.name.trim();
    const residence = employeeForm.residence.trim();
    const phone = employeeForm.phone.trim();
    const gender = employeeForm.gender;
    const position = employeeForm.position.trim();
    const username = employeeForm.username.trim();
    const password = employeeForm.password.trim();
    const workStart = employeeForm.workStart;
    const workEnd = employeeForm.workEnd;
    const breakDuration = Number(employeeForm.breakDuration);
    const breakStart = employeeForm.breakStart;
    const breakEnd = employeeForm.breakEnd;

    if (!name || !residence || !phone || !gender || !position || !username || !password || !workStart || !workEnd || !breakStart || !breakEnd) {
      setMessageStatus("Barcha maydonlarni to'ldiring.");
      return;
    }

    if (!/^[0-9+()\-\s]+$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
      setMessageStatus("Telefon raqamiga faqat raqamlar va +, -, (, ) belgilarini kiriting.");
      return;
    }

    if (!Number.isFinite(breakDuration) || breakDuration < 1 || breakDuration > 180) {
      setMessageStatus("Tanaffus davomiyligi 1 dan 180 daqiqagacha bo'lishi kerak.");
      return;
    }

    if (password.length < 8) {
      setMessageStatus("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setMessageStatus("Parol kamida bitta katta harf o'z ichiga olishi kerak.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setMessageStatus("Parol kamida bitta kichik harf o'z ichiga olishi kerak.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setMessageStatus("Parol kamida bitta raqam o'z ichiga olishi kerak.");
      return;
    }

    const companyEmployees = readStorage(STORAGE_KEYS.employees, []);
    const allUsers = readStorage(STORAGE_KEYS.users, []);
    const legacyUsers = readStorage(STORAGE_KEYS.companyUsers, []);
    const normalizedUsername = username.toLowerCase();
    const globalUsernameExists = [...companyEmployees, ...allUsers, ...legacyUsers].some(
      (item) => String(item.username || "").trim().toLowerCase() === normalizedUsername
    );

    if (globalUsernameExists) {
      setMessageStatus("Bu username tizimda mavjud. Boshqa username tanlang.");
      return;
    }

    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      const currentSession = getCurrentSession();
      if (!currentSession?.token) {
        setMessageStatus("Sessiya muddati tugagan. Qayta kiring.");
        return;
      }

      const nameParts = name.split(/\s+/);
      const firstName = nameParts.shift() || name;
      const lastName = nameParts.join(" ") || firstName;

      try {
        const response = await employeeApi.create({
          company_id: company.id,
          first_name: firstName,
          last_name: lastName,
          position,
          department: employeeForm.department || "Umumiy",
          status: employeeForm.status,
          username,
          temporary_password: password,
          work_schedule: `${workStart}-${workEnd}`,
        }, currentSession.token);

        const [responseWorkStart, responseWorkEnd] = (response.work_schedule || "09:00-18:00").split("-");
        const remoteEmployee = {
          id: response.id,
          userId: response.user_id,
          companyId: response.company_id,
          name: `${response.first_name} ${response.last_name}`,
          username: response.username,
          position: response.position || "Xodim",
          department: response.department || "Umumiy",
          workStart: responseWorkStart,
          workEnd: responseWorkEnd,
          status: response.status,
          isOnline: response.status === "working",
          lastActivity: null,
          currentTask: "Yangi xodim",
        };

        setEmployees((currentEmployees) => [...currentEmployees, remoteEmployee]);
        setShowEmployeeForm(false);
        setEmployeeForm({ name: "", residence: "", phone: "", gender: "", position: "", username: "", password: "", isOnline: false, workStart: "09:00", workEnd: "18:00", breakDuration: "60", breakStart: "13:00", breakEnd: "14:00" });
        setMessageStatus(`Xodim yaratildi. Login: ${username} | Parol: ${password}`);
      } catch (requestError) {
        setMessageStatus(requestError.message || "Xodim qo'shishda xatolik yuz berdi.");
      }
      return;
    }

    const userPlan = readStorage(STORAGE_KEYS.plans, []).find(
      (plan) => plan.userId === currentUser?.id && plan.active
    )?.plan || "pro";
    const employeeLimit = PLANS[userPlan]?.employeeLimit || PLANS.pro.employeeLimit;
    
    if (companyEmployeeCount >= employeeLimit) {
      setMessageStatus(`Xodim limiti (${employeeLimit}) da etib qoldi.`);
      return;
    }

    let response;
    try {
      response = createLocalEmployee({
        companyId: company.id,
        name,
        residence,
        phone,
        gender,
        username,
        password,
        isOnline: employeeForm.isOnline,
        workStart,
        workEnd,
        breakStart,
        breakEnd,
      });
    } catch (requestError) {
      setMessageStatus(requestError.message || "Xodim qo'shishda xatolik yuz berdi.");
      return;
    }
    const newEmployee = {
      id: response.id,
      userId: response.user_id,
      companyId: response.company_id,
      name,
      residence,
      phone,
      gender,
      username,
      password,
      position,
      department: "Umumiy",
      status: "active",
      workStart,
      workEnd,
      breakDuration,
      breakStart,
      breakEnd,
      lastActivity: new Date().toISOString(),
      isOnline: employeeForm.isOnline,
      idleTime: 0,
      currentTask: "Yangi xodim",
      todayWorkTime: 0,
      createdAt: new Date().toISOString(),
    };

    setCompany(getCompanyById(company.id) || company);

    setEmployees((currentEmployees) => [...currentEmployees, newEmployee]);
    setShowEmployeeForm(false);
    setEmployeeForm({ name: "", residence: "", phone: "", gender: "", position: "", username: "", password: "", isOnline: false, workStart: "09:00", workEnd: "18:00", breakDuration: "60", breakStart: "13:00", breakEnd: "14:00" });
    setMessageStatus(`Xodim yaratildi. Login: ${username} | Parol: ${password}`);
  };

  const updateEmployee = async (employeeId, nextData) => {
    const companyEmployees = readStorage(STORAGE_KEYS.employees, []);
    const users = readStorage(STORAGE_KEYS.users, []);

    const employee = employees.find((e) => e.id === employeeId) || companyEmployees.find((e) => e.id === employeeId);
    if (!employee) return;

    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      const currentSession = getCurrentSession();
      const nameParts = String(nextData.name || employee.name).trim().split(/\s+/);
      const firstName = nameParts.shift() || employee.name;
      const lastName = nameParts.join(" ") || firstName;
      try {
        const response = await employeeApi.update(employeeId, {
          first_name: firstName,
          last_name: lastName,
          username: nextData.username || undefined,
          temporary_password: nextData.password || undefined,
          position: nextData.position || undefined,
          department: nextData.department || undefined,
          status: nextData.status || undefined,
          is_online: nextData.isOnline,
        }, currentSession?.token);
        setEmployees((currentEmployees) => currentEmployees.map((item) => (
          item.id === employeeId
            ? {
              ...item,
              name: `${response.first_name} ${response.last_name}`,
              username: response.username,
              position: response.position,
              department: response.department,
              status: response.status,
            }
            : item
        )));
        setMessageStatus("Xodim ma'lumotlari yangilandi.");
      } catch (requestError) {
        setMessageStatus(requestError.message || "Xodimni yangilab bo'lmadi.");
      }
      return;
    }

    const nextEmployees = companyEmployees.map((emp) => {
      if (emp.id !== employeeId) return emp;
      return { ...emp, ...nextData };
    });

    const matchedUser = users.find((user) => user.id === employee.userId);
    if (matchedUser) {
      const updatedUsers = users.map((user) => {
        if (user.id !== matchedUser.id) return user;
        return { 
          ...user, 
          name: nextData.name || user.name, 
          username: nextData.username || user.username, 
          password: nextData.password || user.password 
        };
      });
      writeStorage(STORAGE_KEYS.users, updatedUsers);
    }

    writeStorage(STORAGE_KEYS.employees, nextEmployees);
    setEmployees(nextEmployees.filter((emp) => emp.companyId === company.id));
    setEditingEmployeeId(null);
  };

  const startEmployeeEdit = (employee) => {
    setEditingEmployeeId(employee.id);
    setEditEmployeeForm({
      name: employee.name || "",
      username: employee.username || "",
      password: "",
      position: employee.position || "Xodim",
      department: employee.department || "Umumiy",
      status: employee.status === "on_leave" ? "on_leave" : "active",
      isOnline: Boolean(employee.isOnline),
    });
    setMessageStatus("");
  };

  const saveEmployeeEdit = async (event, employee) => {
    event.preventDefault();
    const name = editEmployeeForm.name.trim();
    const username = editEmployeeForm.username.trim();

    if (!name || !username) {
      setMessageStatus("Ism va username majburiy.");
      return;
    }

    const normalizedUsername = username.toLowerCase();
    const usernameExists = readStorage(STORAGE_KEYS.employees, []).some(
      (item) => item.id !== employee.id
        && String(item.username || "").trim().toLowerCase() === normalizedUsername
    ) || readStorage(STORAGE_KEYS.users, []).some(
      (item) => item.id !== employee.userId
        && String(item.username || "").trim().toLowerCase() === normalizedUsername
    );

    if (usernameExists) {
      setMessageStatus("Bu username tizimda mavjud. Boshqa username tanlang.");
      return;
    }

    await updateEmployee(employee.id, {
      ...employee,
      ...editEmployeeForm,
      name,
      username,
      password: editEmployeeForm.password || employee.password,
    });
  };

  const fireEmployee = async (employee) => {
    const confirm = window.confirm("Ushbu xodimni ishdan bo'shatmoqchimisiz?");
    if (!confirm) return;

    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      const currentSession = getCurrentSession();
      try {
        await employeeApi.fire(employee.id, currentSession?.token);
        setEmployees((currentEmployees) => currentEmployees.map((item) => (
          item.id === employee.id
            ? { ...item, status: "fired", isOnline: false }
            : item
        )));
        setMessageStatus("Xodim ishdan bo'shatildi.");
      } catch (requestError) {
        setMessageStatus(requestError.message || "Xodimni ishdan bo'shatib bo'lmadi.");
      }
      return;
    }

    const companyEmployees = readStorage(STORAGE_KEYS.employees, []);
    const users = readStorage(STORAGE_KEYS.users, []);

    const updatedEmployees = companyEmployees.map((item) =>
      item.id === employee.id ? { ...item, status: "fired" } : item
    );
    const updatedUsers = users.map((user) =>
      user.id === employee.userId ? { ...user, status: "fired" } : user
    );

    writeStorage(STORAGE_KEYS.employees, updatedEmployees);
    writeStorage(STORAGE_KEYS.users, updatedUsers);
    const companies = readStorage(STORAGE_KEYS.companies, []);
    const nextCompany = companies.map((item) =>
      item.id === company.id
        ? { ...item, employeeCount: Math.max(0, Number(item.employeeCount || 0) - 1) }
        : item
    );
    writeStorage(STORAGE_KEYS.companies, nextCompany);
    setCompany(nextCompany.find((item) => item.id === company.id) || company);
    setEmployees(updatedEmployees.filter((item) => item.companyId === company.id));

    addNotification({
      companyId: company.id,
      employeeName: employee.name,
      type: "fired",
      message: `${employee.name} ishdan bo'shatildi.`,
    });
  };

  const saveSettings = (event) => {
    event.preventDefault();
    if (!company) return;

    const nextCompany = {
      ...company,
      name: settingsForm.name,
      directorName: settingsForm.directorName,
      info: settingsForm.info,
    };

    const companies = readStorage(STORAGE_KEYS.companies, []);
    writeStorage(
      STORAGE_KEYS.companies,
      companies.map((item) => (item.id === company.id ? nextCompany : item))
    );
    setCompany(nextCompany);
    localStorage.setItem("selectedCompany", JSON.stringify(nextCompany));
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    setChatStatus("");
    if (!company) {
      setChatStatus("Kompaniya topilmadi. Sahifani yangilang.");
      return;
    }

    if (!messageText.trim()) {
      setChatStatus("Xabar matnini kiriting.");
      return;
    }

    const text = messageText.trim();

    if (isMessageBlocked(currentUser)) {
      const blockedUntil = new Date(currentUser.chatBlockedUntil).toLocaleString("uz-UZ");
      setChatStatus(`❌ Sizning chatingiz bloklanib qolgan. ${blockedUntil} gacha istiqboli yo'q.`);
      return;
    }

    if (BANNED_WORDS.some((word) => text.toLowerCase().includes(word.toLowerCase()))) {
      const blockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const users = readStorage(STORAGE_KEYS.users, []);
      const updatedUsers = users.map((user) =>
        user.id === currentUser.id ? { ...user, chatBlockedUntil: blockedUntil } : user
      );
      writeStorage(STORAGE_KEYS.users, updatedUsers);
      setChatStatus("❌ Chat qoidalarini buzmang! Sizning chatingiz 1 soatga bloklanib qoldi.");
      setMessageText("");
      return;
    }

    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      try {
        const currentSession = getCurrentSession();
        if (!currentSession?.token) {
          setChatStatus("Sessiya muddati tugagan. Qayta kiring.");
          return;
        }

        const message = await communicationsApi.sendMessage({ company_id: company.id, text }, currentSession.token);
        setMessages((currentMessages) => [...currentMessages, message]);
        setMessageText("");
      } catch (requestError) {
        setChatStatus(requestError.message || "Xabar yuborilmadi.");
      }
      return;
    }

    const message = {
      id: `msg_${Date.now()}`,
      companyId: company.id,
      sender: currentUser.name || currentUser.username,
      senderId: currentUser.id,
      text,
      time: new Date().toISOString(),
    };

    const allMessages = readStorage(STORAGE_KEYS.messages, []);
    writeStorage(STORAGE_KEYS.messages, [...allMessages, message]);
    setMessages((currentMessages) => [...currentMessages, message]);
    setMessageText("");
    setChatStatus("");
  };

  const stopMeetingStream = () => {
    meetingStreamRef.current?.getTracks().forEach((track) => track.stop());
    meetingStreamRef.current = null;
    if (meetingVideoRef.current) {
      meetingVideoRef.current.srcObject = null;
    }
    setMeetingUrl("");
  };

  const toggleMeeting = async () => {
    setMeetingError("");
    if (meetingActive) {
      if (!USE_LOCAL_EMPLOYEE_STORAGE) {
        try {
          await communicationsApi.updateMeetingStatus({ company_id: company.id, started: false }, sessionToken);
        } catch (error) {
          setMeetingError(error.message || "Telegram majlisi tugatilmadi.");
        }
      }
      stopMeetingStream();
      setMeetingActive(false);
      return;
    }

    if (!window.isSecureContext) {
      setMeetingError("Kamera va mikrofon ishlashi uchun bu sahifa localhost yoki HTTPS muhitida ochilishi kerak. Iltimos, saytni localhost yoki xavfsiz HTTPS orqali qayta oching.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMeetingError("Bu brauzer kamera va mikrofonni qo'llab-quvvatlamaydi.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const roomName = `${(company?.name || "company").toLowerCase().trim().replace(/[^a-z0-9]+/gi, "-") || "company"}-${Date.now()}`;
      const nextMeetingUrl = `${LOCAL_MEETING_ORIGIN}/meeting-room?room=${encodeURIComponent(roomName)}`;

      if (!USE_LOCAL_EMPLOYEE_STORAGE) {
        try {
          await communicationsApi.updateMeetingStatus({ company_id: company.id, started: true, meeting_url: nextMeetingUrl }, sessionToken);
        } catch (error) {
          stream.getTracks().forEach((track) => track.stop());
          setMeetingError(error.message || "Telegram kanalida Live boshlanmadi.");
          return;
        }
      }
      setMeetingUrl(nextMeetingUrl);
      meetingStreamRef.current = stream;
      setMeetingActive(true);
      requestAnimationFrame(() => {
        if (meetingVideoRef.current) {
          meetingVideoRef.current.srcObject = stream;
        }
      });
    } catch {
      setMeetingError("Live boshlanmadi. Kamera va mikrofon uchun ruxsat bering.");
    }
  };

  useEffect(() => () => stopMeetingStream(), []);

  const createNews = async (event) => {
    event.preventDefault();
    if (!company) return;

    const title = newsForm.title.trim();
    const description = newsForm.description.trim();
    const image = newsForm.image.trim();

    if (!title || !description) {
      setMessageStatus("Yangilik sarlavhasi va izohi majburiy.");
      return;
    }

    if (image && !isValidImageUrl(image)) {
      setMessageStatus("Rasm faqat .png, .jpg yoki .jpeg faylidan olinishi kerak.");
      return;
    }

    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      try {
        const item = await communicationsApi.createNews({
          company_id: company.id,
          title,
          description,
          image: image || null,
        }, session?.token);
        setNews((currentNews) => [{ ...item, createdAt: item.created_at }, ...currentNews]);
        setNewsForm({ title: "", description: "", image: "" });
        setMessageStatus("Yangilik muvaffaqiyatli qo'shildi.");
      } catch (requestError) {
        setMessageStatus(requestError.message || "Yangilikni joylab bo'lmadi.");
      }
      return;
    }

    const item = {
      id: `news_${Date.now()}`,
      companyId: company.id,
      title,
      description,
      image,
      createdAt: new Date().toISOString(),
    };

    const allNews = readStorage(STORAGE_KEYS.news, []);
    writeStorage(STORAGE_KEYS.news, [...allNews, item]);
    setNews([...news, item]);
    setNewsForm({ title: "", description: "", image: "" });
    setMessageStatus("Yangilik muvaffaqiyatli qo'shildi.");
  };

  const handleNewsImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setNewsForm({ ...newsForm, image: "" });
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setMessageStatus("Faqat .png, .jpg yoki .jpeg fayllari qabul qilinadi.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewsForm({ ...newsForm, image: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  };

  const deleteNews = async (newsId) => {
    if (!USE_LOCAL_EMPLOYEE_STORAGE) {
      try {
        await communicationsApi.deleteNews(newsId, session?.token);
        setNews((currentNews) => currentNews.filter((item) => item.id !== newsId));
      } catch (requestError) {
        setMessageStatus(requestError.message || "Yangilikni o'chirib bo'lmadi.");
      }
      return;
    }

    const allNews = readStorage(STORAGE_KEYS.news, []);
    const updated = allNews.filter((item) => item.id !== newsId);
    writeStorage(STORAGE_KEYS.news, updated);
    setNews(updated.filter((item) => item.companyId === company.id));
  };

  if (!company) {
    return (
      <div className="panel-loading" role="status" aria-live="polite">
        Kompaniya ma'lumotlari yuklanmoqda...
      </div>
    );
  }

  const returnToDashboard = () => {
    localStorage.removeItem("selectedCompany");
    navigate("/dashboard");
  };

  const handleCompanyLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || !company) return;
    const logo = await readImageAsDataUrl(file);
    const savedLogos = JSON.parse(localStorage.getItem("company_logos") || "{}");
    const nextLogos = { ...savedLogos, [company.id]: logo };
    localStorage.setItem("company_logos", JSON.stringify(nextLogos));
    setCompanyLogo(logo);
    event.target.value = "";
  };

  return (
    <div className="panel-shell">
      <aside className="panel-sidebar">
        <div className="brand-box">
          <label className="company-panel-logo" title="Kompaniya logotipini yangilash">
            {companyLogo ? <img src={companyLogo} alt={`${company.name} logotipi`} /> : <CompanyLogo className="brand-icon" />}
            <input type="file" accept="image/*" onChange={handleCompanyLogoChange} />
          </label>
          <div>
            <h2>{company.name}</h2>
            <span>Company panel</span>
          </div>
        </div>

        <button type="button" className="back-dashboard-button" onClick={returnToDashboard}>
          ← Asosiy qismga qaytish
        </button>

        <nav className="panel-nav">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`nav-button ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <SidebarIcon name={tabIcons[tab.key]} />
              {t[tab.label].replace(/^(📊|👥|💬|🎥|📰|⚙️)\s*/u, "")}
            </button>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={() => {
          clearSession();
          navigate("/");
        }}>
          {t.logout}
        </button>
      </aside>

      <main className="panel-main">
        <header className="panel-header">
          <div>
            <div className="panel-kicker">
              <span className="panel-company-logo" aria-hidden="true">
                {companyLogo ? <img src={companyLogo} alt="" /> : <CompanyLogo />}
              </span>
              {company.name}
            </div>
            <h1>Rahbar: {company.directorName}</h1>
          </div>
          <div className="panel-metrics">
            <span>Xodimlar: {companyEmployeeCount}</span>
            <span>Tarif: {company.plan || "PRO"}</span>
          </div>
        </header>

        {activeTab === "overview" && (
          <section className="content-card">
            <h3>{t.companyStats}</h3>
            <div className="stats-grid company-overview-stats">
              <div className="stat-box"><strong>{companyEmployeeCount}</strong><span>{t.totalEmployees}</span></div>
              <div className="stat-box"><strong>{visibleActiveEmployees}</strong><span>{t.activeEmployees}</span></div>
              <div className="stat-box"><strong>{visibleIdleEmployees}</strong><span>{t.notStarted}</span></div>
              <div className="stat-box"><strong>{visibleOfflineEmployees}</strong><span>{t.offline}</span></div>
              <div className="stat-box"><strong>{employees.filter((row) => row.status === "fired").length}</strong><span>Ishdan bo'shatilganlar</span></div>
            </div>
            <div className="stats-grid" style={{ marginTop: "20px" }}>
              <h4 style={{ gridColumn: "1 / -1" }}>Faol xodimlarning holati</h4>
              {visibleMonitoringEmployees.map((emp) => (
                <div key={emp.id} className="stat-box" style={{ padding: "10px" }}>
                  <div style={{ fontSize: "12px" }}>
                    <strong>{emp.name}</strong><br/>
                    Status: <span style={{ color: emp.status === "active" ? "#00ff00" : emp.status === "idle" ? "#ffaa00" : "#ff0000" }}>{emp.status}</span><br/>
                    Amaliyot: {emp.currentTask}<br/>
                    Faollik yo'q: {emp.idleMinutes} min
                  </div>
                </div>
              ))}
            </div>

            {employees.filter((e) => e.status === "fired").length > 0 && (
              <div className="stats-grid" style={{ marginTop: "20px", backgroundColor: "#ffe6e6", padding: "16px", borderRadius: "12px" }}>
                <h4 style={{ gridColumn: "1 / -1", color: "#d32f2f" }}>Ishdan bo'shatilgan xodimlar</h4>
                {employees.filter((e) => e.status === "fired").map((emp) => (
                  <div key={emp.id} className="stat-box" style={{ padding: "10px", backgroundColor: "#ffcdd2" }}>
                    <div style={{ fontSize: "12px" }}>
                      <strong>{emp.name}</strong><br/>
                      Username: {emp.username}<br/>
                      Ish maqomi: {emp.position || "Xodim"}<br/>
                      Bo'lim: {emp.department || "Umumiy"}
                      <button 
                        className="danger-button" 
                        onClick={() => {
                          const confirm = window.confirm(`${emp.name} nomli xodimni butunlay o'chirib yubormoqchimisiz?`);
                          if (confirm && emp.id) {
                            const companyEmployees = readStorage(STORAGE_KEYS.employees, []);
                            const users = readStorage(STORAGE_KEYS.users, []);
                            const updatedEmployees = companyEmployees.filter((item) => (
                              !(item.id === emp.id && item.companyId === company.id)
                            ));
                            const updatedUsers = users.filter((user) => (
                              !(user.id === emp.userId && user.companyId === company.id)
                            ));
                            writeStorage(STORAGE_KEYS.employees, updatedEmployees);
                            writeStorage(STORAGE_KEYS.users, updatedUsers);
                            setEmployees(updatedEmployees.filter((item) => item.companyId === company.id));
                            setMessageStatus(`${emp.name} butunlay o'chirib yuborildi.`);
                          }
                        }}
                        style={{ marginTop: "8px", fontSize: "11px", padding: "4px 8px" }}
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "employees" && (
          <section className="content-card">
            <div className="section-row">
              <h3 className="section-title-with-icon">
                <SidebarIcon name="users" />
                {t.employees.replace(/^👥\s*/u, "")}
              </h3>
              <button className="primary-button employee-add-button" onClick={() => {
                setShowEmployeeForm((isVisible) => !isVisible);
                setMessageStatus("");
              }}>
                <SidebarIcon name="create" />
                {t.addEmployee.replace(/^\+\s*/u, "")}
              </button>
            </div>

            {showEmployeeForm && (
              <form className="inline-form" onSubmit={addEmployee}>
                <input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} placeholder="Ism familiyasi" />
                <input value={employeeForm.residence} onChange={(e) => setEmployeeForm({ ...employeeForm, residence: e.target.value })} placeholder="Turar joyi" />
                <input type="tel" inputMode="tel" pattern="[0-9+()\-\s]+" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value.replace(/[^0-9+()\-\s]/g, "") })} placeholder="Telefon raqami" />
                <select value={employeeForm.gender} onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value })} aria-label="Xodim jinsi">
                  <option value="">Jinsini tanlang</option>
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
                <input value={employeeForm.position} onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })} placeholder="Xodim lavozimi" />
                <input value={employeeForm.username} onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })} placeholder="Username" />
                <PasswordInput value={employeeForm.password} onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} placeholder="Parol" />
                <select value={employeeForm.isOnline ? "computer" : "physical"} onChange={(e) => setEmployeeForm({ ...employeeForm, isOnline: e.target.value === "computer" })} aria-label="Xodim ish turi">
                  <option value="computer">Kompyuterda ishlaydi</option>
                  <option value="physical">Jismoniy mehnat qiladi</option>
                </select>
                <label className="time-field">Ish boshlanish vaqti<input type="time" value={employeeForm.workStart} onChange={(e) => setEmployeeForm({ ...employeeForm, workStart: e.target.value })} aria-label="Ish boshlanishi" /></label>
                <label className="time-field">Ish tugash vaqti<input type="time" value={employeeForm.workEnd} onChange={(e) => setEmployeeForm({ ...employeeForm, workEnd: e.target.value })} aria-label="Ish tugashi" /></label>
                <label className="time-field">Tanaffus davomiyligi (daqiqa)<input type="number" min="1" max="180" value={employeeForm.breakDuration} onChange={(e) => setEmployeeForm({ ...employeeForm, breakDuration: e.target.value })} aria-label="Tanaffus davomiyligi" /></label>
                <label className="time-field">Obed boshlanish vaqti<input type="time" value={employeeForm.breakStart} onChange={(e) => setEmployeeForm({ ...employeeForm, breakStart: e.target.value })} aria-label="Obed boshlanishi" /></label>
                <label className="time-field">Obed tugash vaqti<input type="time" value={employeeForm.breakEnd} onChange={(e) => setEmployeeForm({ ...employeeForm, breakEnd: e.target.value })} aria-label="Obed tugashi" /></label>
                <button type="submit" className="primary-button">Xodimni qo'shish</button>
              </form>
            )}

            {showEmployeeForm && messageStatus && <div className="status-badge">{messageStatus}</div>}

            <div className="employee-list">
              {employees.filter((employee) => employee.status !== "fired").map((employee) => {
                const empStatus = monitoring?.employees?.find((m) => m.id === employee.id) || {
                  status: employee.isOnline ? "active" : "offline",
                  idleMinutes: getEmployeeOfflineMinutes(employee.id),
                  currentTask: employee.currentTask || "Faollik yo'q",
                };
                const statusColor = empStatus?.status === "active" ? "#00ff00" : empStatus?.status === "idle" ? "#ffaa00" : "#ff0000";
                const liveState = getEmployeeLiveState(employee);
                
                return (
                  <div key={employee.id} className="employee-card" style={{ borderLeft: `4px solid ${statusColor}` }}>
                    <div>
                      <h4>{employee.name}</h4>
                      <p>Username: {employee.username}</p>
                      <p>Ish maqomi: {employee.position || "Xodim"}</p>
                      <p>Bo'lim: {employee.department || "Umumiy"}</p>
                      <p>Ish vaqti: {employee.workStart} — {employee.workEnd}</p>
                      <p>Tanaffus: {employee.breakDuration || 60} daqiqa</p>
                      <p>Obed vaqti: {employee.breakStart} — {employee.breakEnd}</p>
                      <p>Xodim statusi: <span style={{ fontWeight: "bold" }}>{employee.status === "on_leave" ? "Ta'tilda" : employee.status === "fired" ? "Bo'shatilgan" : "Faol"}</span></p>
                      <p>Ish holati: <span style={{ color: statusColor, fontWeight: "bold" }}>{empStatus?.status || "unknown"}</span></p>
                      <p>📹 Kamera: {liveState.cameraLive ? "Jonli" : "Mavjud emas"}</p>
                      <p>🟢 Tizim holati: {liveState.statusLabel}</p>
                      <p>Faollik yo'q: {empStatus?.idleMinutes || liveState.offlineMinutes || 0} min</p>
                      <p>Amaliyot: {empStatus?.currentTask || employee.currentTask || "yo'q"}</p>
                    </div>
                    <div className="employee-actions">
                      {employee.status !== "fired" && (
                        <button className="secondary-button" onClick={() => startEmployeeEdit(employee)}>Tahrirlash</button>
                      )}
                      <button
                        className="danger-button"
                        onClick={() => fireEmployee(employee)}
                        disabled={employee.status === "fired"}
                      >
                        {employee.status === "fired" ? "Bo'shatilgan" : "Ishdan bo'shatish"}
                      </button>
                    </div>
                    {editingEmployeeId === employee.id && (
                      <form className="inline-form" onSubmit={(event) => saveEmployeeEdit(event, employee)}>
                        <input value={editEmployeeForm.name} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, name: event.target.value })} placeholder="Xodim ismi" />
                        <input value={editEmployeeForm.username} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, username: event.target.value })} placeholder="Username" />
                        <PasswordInput value={editEmployeeForm.password} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, password: event.target.value })} placeholder="Yangi parol (ixtiyoriy)" />
                        <input value={editEmployeeForm.position} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, position: event.target.value })} placeholder="Ish maqomi" />
                        <input value={editEmployeeForm.department} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, department: event.target.value })} placeholder="Bo'lim" />
                        <select value={editEmployeeForm.isOnline ? "computer" : "physical"} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, isOnline: event.target.value === "computer" })} aria-label="Xodim ish turi">
                          <option value="computer">Kompyuterda ishlaydi</option>
                          <option value="physical">Jismoniy mehnat qiladi</option>
                        </select>
                        <select value={editEmployeeForm.status} onChange={(event) => setEditEmployeeForm({ ...editEmployeeForm, status: event.target.value })} aria-label="Xodim statusi">
                          <option value="active">Faol</option>
                          <option value="on_leave">Ta'tilda</option>
                        </select>
                        <button type="submit" className="primary-button">Saqlash</button>
                        <button type="button" className="secondary-button" onClick={() => setEditingEmployeeId(null)}>Bekor qilish</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "chat" && (
          <section className="content-card chat-box">
            <div className="chat-list">
              {messages.map((item) => (
                <div key={item.id} className="chat-item">
                  <div className="chat-item-header">
                    <strong>{item.sender}</strong>
                    <span className="chat-item-colon">:</span>
                  </div>
                  <div className="chat-item-text">{item.text}</div>
                </div>
              ))}
            </div>
            {chatStatus && <div className="status-badge">{chatStatus}</div>}
            <form className="chat-form" onSubmit={sendMessage}>
              <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder={t.messagePlaceholder} />
              <button type="submit" className="primary-button">{t.send}</button>
            </form>
          </section>
        )}

        {activeTab === "meeting" && (
          <section className="content-card meeting-card">
            <div className="section-row">
              <div>
                <span className="panel-kicker">LIVE ONLINE</span>
                <h3 className="section-title-with-icon">
                  <SidebarIcon name="meeting" />
                  {t.meeting.replace(/^🎥\s*/u, "")}
                </h3>
              </div>
              <span className={`meeting-status ${meetingActive ? "active" : ""}`}>
                {meetingActive ? t.live : t.notStarted}
              </span>
            </div>
            <div className="meeting-stage">
              {meetingActive ? (
                <>
                  <video ref={meetingVideoRef} className="meeting-video" autoPlay muted playsInline />
                  <div className="meeting-live-dot">● Jonli majlis</div>
                  <strong>{company.name} jamoasi bilan uchrashuv</strong>
                  <span>Ishtirokchilar havola orqali qo'shilishi mumkin</span>
                  {meetingUrl && (
                    <a href={meetingUrl} target="_blank" rel="noreferrer" className="primary-button" style={{ marginTop: "12px", display: "inline-block", textAlign: "center" }}>
                      Majlisga qo'shilish
                    </a>
                  )}
                </>
              ) : (
                <>
                  <strong>Yangi onlayn majlis boshlang</strong>
                  <span>Kamera va mikrofonni yoqib, jamoangiz bilan bog'laning</span>
                </>
              )}
            </div>
            {meetingError && <div className="status-badge">{meetingError}</div>}
            <div className="meeting-controls">
              <button className="secondary-button" type="button" onClick={() => {
                const nextValue = !meetingCamera;
                setMeetingCamera(nextValue);
                meetingStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextValue; });
              }}>
                <SidebarIcon name="camera" />
                {meetingCamera ? "Kamera yoqilgan" : "Kamera o'chirilgan"}
              </button>
              <button className="secondary-button" type="button" onClick={() => {
                const nextValue = !meetingMicrophone;
                setMeetingMicrophone(nextValue);
                meetingStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = nextValue; });
              }}>
                <SidebarIcon name="speaker" />
                {meetingMicrophone ? "Karnay yoqilgan" : "Karnay o'chirilgan"}
              </button>
              <button className="primary-button" type="button" onClick={toggleMeeting}>
                {meetingActive ? t.endMeeting : t.startMeeting}
              </button>
            </div>
          </section>
        )}

        {activeTab === "news" && (
          <section className="content-card">
            {currentUser.role === "owner" && (
              <form className="news-form" onSubmit={createNews}>
                <input value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} placeholder="Sarlavha" />
                <div className="image-upload-container">
                  <label className="file-input-label">
                    <input type="file" className="file-input" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleNewsImageUpload} />
                    <span className="file-input-button">📷 Rasm yuklash</span>
                  </label>
                  {newsForm.image && (
                    <div className="image-preview-container">
                      <img src={newsForm.image} alt="Preview" className="image-preview" />
                      <button 
                        type="button" 
                        className="remove-image-button"
                        onClick={() => setNewsForm({ ...newsForm, image: "" })}
                      >
                        ✕ {t.delete}
                      </button>
                    </div>
                  )}
                </div>
                <textarea value={newsForm.description} onChange={(e) => setNewsForm({ ...newsForm, description: e.target.value })} placeholder="Izoh" />
                <button type="submit" className="primary-button">{t.postNews}</button>
              </form>
            )}

            <div className="news-list">
              {news.map((item) => (
                <div key={item.id} className="news-card">
                  {item.image && <img src={item.image} alt={item.title} />}
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  {currentUser.role === "owner" && (
                    <button className="danger-button" onClick={() => deleteNews(item.id)}>{t.delete}</button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "tariffs" && (
          <section className="content-card">
            <h3>Mavjud tariflar</h3>
            <p>Joriy tarif: {PLANS[company.plan]?.name || "PRO"}</p>
            <div className="plans">
              {Object.values(PLANS).map((plan) => (
                <div key={plan.id} className={`plan-card ${plan.id !== "pro" ? "premium" : ""}`}>
                  <div className="plan-header">
                    <div className={`plan-icon ${plan.id !== "pro" ? "purple" : "blue"}`}>◆</div>
                    <div>
                      <span className="plan-label">{plan.id === company.plan ? "JORIY TARIF" : "MAVJUD"}</span>
                      <h2>{plan.name}</h2>
                    </div>
                  </div>
                  <div className="plan-price">
                    <strong>{plan.monthlyPrice.split(" ")[0]}</strong>
                    <span>{plan.monthlyPrice.replace(plan.monthlyPrice.split(" ")[0], "")}</span>
                  </div>
                  <p className="plan-description">{plan.companyLimit} ta kompaniya / har birida {plan.employeeLimit} tagacha xodim</p>
                  <ul className="plan-features">
                    <li><span>✓</span> Xodimlar nazorati</li>
                    <li><span>✓</span> Ish vaqti monitoring</li>
                    <li><span>✓</span> Chat va yangiliklar</li>
                  </ul>
                  <button
                    className="plan-button"
                    disabled={plan.id === company.plan}
                    onClick={() => navigate("/tariffs")}
                  >
                    {plan.id === company.plan ? "Joriy tarif" : "Tarifni tanlash"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="content-card">
            <h3>{t.settings}</h3>
            <form className="settings-form" onSubmit={saveSettings}>
              <label>
                Kompaniya nomi
                <input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} />
              </label>
              <label>
                Boshliq ismi
                <input value={settingsForm.directorName} onChange={(e) => setSettingsForm({ ...settingsForm, directorName: e.target.value })} />
              </label>
              <label>
                Kompaniya ma'lumotlari
                <textarea value={settingsForm.info} onChange={(e) => setSettingsForm({ ...settingsForm, info: e.target.value })} />
              </label>
              <button type="submit" className="primary-button">{t.save}</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default CompanyPanel;
