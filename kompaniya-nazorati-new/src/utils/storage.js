export const STORAGE_KEYS = {
  users: "users",
  companies: "companies",
  employees: "employees",
  messages: "messages",
  news: "news",
  notifications: "notifications",
  plans: "plans",
  authSession: "authSession",
  selectedPlan: "selected_plan",
  selectedCompany: "selectedCompany",
  companyUsers: "company_users",
  usersDirectory: "users_directory",
};

export const PLANS = {
  pro: {
    id: "pro",
    name: "PRO",
    monthlyPrice: "200 000 so'm",
    companyLimit: 1,
    employeeLimit: 50,
  },
  pro_premium: {
    id: "pro_premium",
    name: "PRO PREMIUM",
    monthlyPrice: "500 000 so'm",
    companyLimit: 5,
    employeeLimit: 300,
  },
  promaster: {
    id: "promaster",
    name: "PROMASTER",
    monthlyPrice: "1 000 000 so'm",
    companyLimit: 10,
    employeeLimit: 1000,
  },
};

export const BANNED_WORDS = [
  "ahmaq",
  "beks",
  "haqorat",
  "yomon",
  "qonunbuzar",
  "sharmanda",
  "fahsh",
  "idiot",
  "damat",
  "xebat",
];

export function readStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function ensureAppData() {
  let userList = readStorage(STORAGE_KEYS.users, []);
  const companyList = readStorage(STORAGE_KEYS.companies, []);
  const employeeList = readStorage(STORAGE_KEYS.employees, []);
  const messageList = readStorage(STORAGE_KEYS.messages, []);
  const newsList = readStorage(STORAGE_KEYS.news, []);
  const notificationList = readStorage(STORAGE_KEYS.notifications, []);
  const planList = readStorage(STORAGE_KEYS.plans, []);

  const legacyUsers = readStorage(STORAGE_KEYS.companyUsers, []);
  if (!userList.length && legacyUsers.length) {
    userList = legacyUsers;
    writeStorage(STORAGE_KEYS.users, userList);
  }

  if (!userList.length) {
    const demoOwner = {
      id: "user_owner_001",
      name: "Ali Valiyev",
      username: "admin",
      password: "Admin@1234",
      role: "owner",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const demoEmployee = {
      id: "user_employee_001",
      name: "Vali Karimov",
      username: "employee01",
      password: "Emp@1234",
      role: "employee",
      status: "active",
      companyId: "company_001",
      createdAt: new Date().toISOString(),
    };

    userList = [demoOwner, demoEmployee];
    writeStorage(STORAGE_KEYS.users, userList);
  }

  if (!companyList.length) {
    const demoCompany = {
      id: "company_001",
      name: "ABC Company",
      ownerId: "user_owner_001",
      directorName: "Ali Valiyev",
      employeeCount: 24,
      plan: "pro",
      createdAt: new Date().toISOString(),
    };

    writeStorage(STORAGE_KEYS.companies, [demoCompany]);
  }

  if (!employeeList.length) {
    writeStorage(STORAGE_KEYS.employees, [
      {
        id: "emp_001",
        userId: "user_employee_001",
        companyId: "company_001",
        name: "Vali Karimov",
        username: "employee01",
        workStart: "09:00",
        workEnd: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        status: "active",
        lastActivity: new Date().toISOString(),
        idleTime: 0,
        isOnline: true,
        totalWorkTime: 0,
        todayWorkTime: 0,
        currentTask: "Dokumentlar tekshirish",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  if (!messageList.length) {
    writeStorage(STORAGE_KEYS.messages, [
      {
        id: "msg_001",
        companyId: "company_001",
        sender: "Ali",
        senderId: "user_owner_001",
        text: "Assalomu alaykum",
        time: new Date().toISOString(),
      },
      {
        id: "msg_002",
        companyId: "company_001",
        sender: "Vali",
        senderId: "user_employee_001",
        text: "Va alaykum assalom",
        time: new Date().toISOString(),
      },
    ]);
  }

  if (!newsList.length) {
    writeStorage(STORAGE_KEYS.news, [
      {
        id: "news_001",
        companyId: "company_001",
        title: "Yangi ish tartibi",
        description: "Kundalik yig'ilish ertasi soat 10:00 da bo'lib o'tadi.",
        image: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  if (!notificationList.length) {
    writeStorage(STORAGE_KEYS.notifications, [
      {
        id: "notif_001",
        companyId: "company_001",
        employeeId: "emp_001",
        employeeName: "Vali Karimov",
        time: new Date().toISOString(),
        type: "idle",
        message: "Vali Karimov 15 minutdan beri faol emas",
        read: false,
      },
    ]);
  }

  if (!planList.length) {
    writeStorage(STORAGE_KEYS.plans, [{
      userId: "user_owner_001",
      plan: "pro",
      active: true,
      purchasedAt: new Date().toISOString(),
    }]);
  }

  syncUsersDirectory(userList);
}

export function getUsersDirectory() {
  const users = readStorage(STORAGE_KEYS.users, []);
  const savedDirectory = readStorage(STORAGE_KEYS.usersDirectory, null);
  const directory = savedDirectory && typeof savedDirectory === "object"
    ? savedDirectory
    : {};

  return {
    companyHeads: Array.isArray(directory.companyHeads)
      ? directory.companyHeads
      : users.filter((user) => user.role === "owner" || user.role === "company_owner"),
    companyEmployees: Array.isArray(directory.companyEmployees)
      ? directory.companyEmployees
      : users.filter((user) => user.role === "employee"),
  };
}

export function syncUsersDirectory(users = readStorage(STORAGE_KEYS.users, [])) {
  writeStorage(STORAGE_KEYS.usersDirectory, {
    companyHeads: users.filter((user) => user.role === "owner" || user.role === "company_owner"),
    companyEmployees: users.filter((user) => user.role === "employee"),
  });
}

export function getCurrentSession() {
  return readStorage(STORAGE_KEYS.authSession, null);
}

export function setCurrentSession(session) {
  const normalized = {
    ...session,
    userId: session.userId ?? session.user?.id ?? null,
    role: session.role ?? session.user?.role ?? "owner",
    token: session.token ?? null,
    user: session.user ?? null,
  };

  writeStorage(STORAGE_KEYS.authSession, normalized);
  window.dispatchEvent(new CustomEvent("app-session-change", { detail: normalized }));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.authSession);
  localStorage.removeItem(STORAGE_KEYS.selectedCompany);
  window.dispatchEvent(new CustomEvent("app-session-change", { detail: null }));
}

export function getUserByUsername(username) {
  const users = readStorage(STORAGE_KEYS.users, []);
  return users.find((user) => user.username.toLowerCase() === String(username).trim().toLowerCase());
}

export function createLocalUser({ name, email, phone, username, password, role = "owner" }) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const cleanUsername = String(username || "").trim();
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  const cleanPhone = String(phone || "").replace(/[\s()-]/g, "");
  if (!cleanUsername || !cleanName || !cleanEmail || !cleanPhone || !password) {
    throw new Error("Barcha maydonlarni to'ldiring.");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    throw new Error("Username faqat lotin harf, raqam va _ belgisidan iborat bo'lishi kerak.");
  }

  if (!/^\+998\d{9}$/.test(cleanPhone)) {
    throw new Error("Telefon raqami faqat O'zbekiston raqami bo'lishi kerak: +998 XX XXX XX XX.");
  }

  if (users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase())) {
    throw new Error("Bu username allaqachon mavjud.");
  }

  if (users.some((user) => user.email && user.email.toLowerCase() === cleanEmail)) {
    throw new Error("Bu email allaqachon ro'yxatdan o'tgan.");
  }

  if (users.some((user) => user.phone && user.phone === cleanPhone)) {
    throw new Error("Bu telefon raqami allaqachon ro'yxatdan o'tgan.");
  }

  if (String(password).length < 8) {
    throw new Error("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
  }

  const user = {
    id: createUniqueId("user"),
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    username: cleanUsername,
    password: String(password),
    role,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.users, [...users, user]);
  syncUsersDirectory([...users, user]);

  return {
    user_id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    access_token: `local_${Date.now()}`,
    refresh_token: `refresh_${Date.now()}`,
  };
}

export function createLocalEmployee({
  companyId,
  name,
  residence = "",
  phone = "",
  gender = "",
  username,
  password,
  position = "Xodim",
  department = "Umumiy",
  status = "active",
  isOnline = false,
  workStart = "09:00",
  workEnd = "18:00",
  breakStart = "13:00",
  breakEnd = "14:00",
}) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const cleanUsername = String(username || "").trim();
  const cleanName = String(name || "").trim();

  if (!companyId || !cleanName || !cleanUsername || !password) {
    throw new Error("Xodim ma'lumotlarini to'liq kiriting.");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    throw new Error("Username faqat lotin harf, raqam va _ belgisidan iborat bo'lishi kerak.");
  }
  const legacyUsers = readStorage(STORAGE_KEYS.companyUsers, []);
  const normalizedUsername = cleanUsername.toLowerCase();
  const usernameTaken = [...employees, ...users, ...legacyUsers].some(
    (item) => String(item.username || "").trim().toLowerCase() === normalizedUsername
  );

  if (usernameTaken) {
    throw new Error("Bu username allaqachon mavjud.");
  }

  const userId = createUniqueId("user_employee");
  const employeeId = createUniqueId("employee");
  const now = new Date().toISOString();
  const user = {
    id: userId,
    name: cleanName,
    residence,
    phone,
    gender,
    username: cleanUsername,
    password: String(password),
    role: "employee",
    status: "active",
    companyId,
    createdAt: now,
  };
  const employee = {
    id: employeeId,
    userId,
    companyId,
    name: cleanName,
    residence,
    phone,
    gender,
    username: cleanUsername,
    password: String(password),
    position,
    department,
    status,
    workStart,
    workEnd,
    breakStart,
    breakEnd,
    workSchedule: `${workStart}-${workEnd}`,
    lastActivity: now,
    isOnline: Boolean(isOnline),
    idleTime: 0,
    currentTask: "Yangi xodim",
    todayWorkTime: 0,
    createdAt: now,
  };

  writeStorage(STORAGE_KEYS.users, [...users, user]);
  writeStorage(STORAGE_KEYS.employees, [...employees, employee]);
  syncUsersDirectory([...users, user]);

  const companies = readStorage(STORAGE_KEYS.companies, []);
  writeStorage(STORAGE_KEYS.companies, companies.map((company) => (
    company.id === companyId
      ? { ...company, employeeCount: Number(company.employeeCount || 0) + 1 }
      : company
  )));

  return {
    id: employeeId,
    user_id: userId,
    company_id: companyId,
    first_name: cleanName.split(/\s+/)[0],
    last_name: cleanName.split(/\s+/).slice(1).join(" ") || cleanName,
    username: cleanUsername,
    status,
    work_schedule: `${workStart}-${workEnd}`,
    local: true,
  };
}

export function verifyEmployeeCanLogin(username, password) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const employees = readStorage(STORAGE_KEYS.employees, []);
  
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "");
  
  const employee = employees.find(
    (emp) => emp.username && emp.username.toLowerCase() === cleanUsername.toLowerCase()
  );
  
  if (!employee) {
    return { success: false, message: `Xodim topilmadi: ${cleanUsername}` };
  }
  
  if (String(employee.password).trim() !== cleanPassword.trim()) {
    return { success: false, message: `Parol noto'g'ri. Employee parol: ${employee.password}` };
  }
  
  const user = users.find((u) => u.id === employee.userId);
  if (!user) {
    return { success: false, message: `User object topilmadi: ${employee.userId}` };
  }
  
  if (user.role !== "employee") {
    return { success: false, message: `User role xato: ${user.role}, kutilayotgan: employee` };
  }
  
  return { success: true, message: "Xodim login qilishi mumkin", employee, user };
}

export function loginLocalUser({ username, password }) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const legacyUsers = readStorage(STORAGE_KEYS.companyUsers, []);
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "");

  if (!cleanUsername || !cleanPassword) {
    throw new Error("Username va parolni kiriting.");
  }

  const matchingEmployee = employees.find(
    (employee) => employee.status !== "fired"
      && String(employee.username || "").trim().toLowerCase() === cleanUsername.toLowerCase()
      && String(employee.password || "").trim() === cleanPassword.trim()
  );

  if (matchingEmployee) {
    const employeeUser = users.find((user) => user.id === matchingEmployee.userId);
    const syncedUser = {
      ...(employeeUser || {}),
      id: matchingEmployee.userId,
      name: matchingEmployee.name,
      username: matchingEmployee.username,
      password: matchingEmployee.password,
      role: "employee",
      status: matchingEmployee.status || "active",
      companyId: matchingEmployee.companyId,
    };
    const nextUsers = employeeUser
      ? users.map((user) => user.id === matchingEmployee.userId ? syncedUser : user)
      : [...users, syncedUser];
    writeStorage(STORAGE_KEYS.users, nextUsers);
    syncUsersDirectory(nextUsers);

    return {
      user_id: syncedUser.id,
      username: syncedUser.username,
      phone: syncedUser.phone || matchingEmployee.phone || "",
      name: syncedUser.name,
      role: "employee",
      access_token: `local_${Date.now()}`,
      refresh_token: `refresh_${Date.now()}`,
    };
  }

  // Xodimlardan foydalanuvchilar yaratish
  const employeeUsers = employees
    .filter((employee) => employee.username && employee.password)
    .map((employee) => {
      // Agar user array'da xodim useri bo'lmasa, lokal user yaratish
      const existingUser = users.find((u) => u.id === employee.userId);
      return {
        id: employee.userId || existingUser?.id,
        name: employee.name,
        username: employee.username,
        password: employee.password,
        role: "employee",
        status: employee.status || "active",
        companyId: employee.companyId,
      };
    });

  const allUsers = [...employeeUsers, ...users, ...legacyUsers.filter(
    (legacyUser) => !users.some((user) => user.id === legacyUser.id)
  )];

  const user = allUsers.find(
    (item) => item.status !== "fired"
      && item.username
      && item.username.toLowerCase() === cleanUsername.toLowerCase()
        && String(item.password || "").trim() === cleanPassword.trim()
  );

  if (!user) {
    // Xodim username bilan topildi-yu parol noto'g'ri bo'lsa, xodim aytamiz
    const employeeWithUsername = employees.find(
      (emp) => emp.username && emp.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    
    if (employeeWithUsername) {
      throw new Error("Username topildi, lekin parol noto'g'ri.");
    }
    
    throw new Error("Username yoki parol noto'g'ri.");
  }

  return {
    user_id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone || "",
    name: user.name,
    role: user.role || "owner",
    access_token: `local_${Date.now()}`,
    refresh_token: `refresh_${Date.now()}`,
  };
}

export function updateLocalProfile({ userId, first_name, last_name, username, password, profile_image }) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const legacyUsers = readStorage(STORAGE_KEYS.companyUsers, []);
  const user = users.find((item) => item.id === userId);
  if (!user) throw new Error("Foydalanuvchi topilmadi.");

  const cleanUsername = String(username || "").trim();
  if (!cleanUsername) throw new Error("Usernameni kiriting.");
  const normalizedUsername = cleanUsername.toLowerCase();
  const usernameExists = [
    ...users.filter((item) => item.id !== userId),
    ...employees,
    ...legacyUsers.filter((item) => item.id !== userId),
  ].some((item) => String(item.username || "").trim().toLowerCase() === normalizedUsername);
  if (usernameExists) {
    throw new Error("Bu username allaqachon mavjud.");
  }

  const updatedUser = {
    ...user,
    name: [first_name, last_name].map((value) => String(value || "").trim()).filter(Boolean).join(" "),
    username: cleanUsername,
    ...(password ? { password: String(password) } : {}),
    ...(profile_image !== undefined ? { profileImage: profile_image || "" } : {}),
  };
  const nextUsers = users.map((item) => item.id === userId ? updatedUser : item);
  writeStorage(STORAGE_KEYS.users, nextUsers);
  syncUsersDirectory(nextUsers);

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    first_name: String(first_name || "").trim(),
    last_name: String(last_name || "").trim(),
    email: updatedUser.email || "",
    role: updatedUser.role || "owner",
    profile_image: updatedUser.profileImage || "",
  };
}

export function getCurrentUser() {
  const session = getCurrentSession();
  if (!session) return null;

  if (session.user) {
    return session.user;
  }

  const users = readStorage(STORAGE_KEYS.users, []);
  return users.find((user) => user.id === session.userId) || null;
}

export function createUniqueId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function applyPlanForUser(userId, planId) {
  const planList = readStorage(STORAGE_KEYS.plans, []);
  const existing = planList.find((item) => item.userId === userId);

  const nextPlan = {
    userId,
    plan: planId,
    active: true,
    purchasedAt: new Date().toISOString(),
    expiresAt: addOneMonth(new Date()).toISOString(),
  };

  if (existing) {
    const updated = planList.map((item) =>
      item.userId === userId ? nextPlan : item
    );
    writeStorage(STORAGE_KEYS.plans, updated);
  } else {
    writeStorage(STORAGE_KEYS.plans, [...planList, nextPlan]);
  }

  localStorage.setItem(STORAGE_KEYS.selectedPlan, planId);
  localStorage.setItem(`wallet_payment_${userId}`, JSON.stringify({
    planId,
    paid: true,
    paidAt: new Date().toISOString(),
  }));
}

function addOneMonth(date) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}

export function getWalletPaymentStatus(userId) {
  const raw = localStorage.getItem(`wallet_payment_${userId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.paid ? parsed : null;
  } catch {
    return null;
  }
}

export function clearWalletPayment(userId) {
  localStorage.removeItem(`wallet_payment_${userId}`);
}

export function getOwnerPlan(userId) {
  const plans = readStorage(STORAGE_KEYS.plans, []);
  const current = plans
    .filter((item) => item.userId === userId && item.active)
    .sort((first, second) => new Date(second.purchasedAt || 0) - new Date(first.purchasedAt || 0))[0];

  if (current && current.plan) {
    return current.plan;
  }

  return null;
}

export function companyLimitForPlan(planId) {
  const details = PLANS[planId];
  return details ? details.companyLimit : 0;
}

export function getCompanyById(companyId) {
  const companies = readStorage(STORAGE_KEYS.companies, []);
  return companies.find((company) => company.id === companyId) || null;
}

export function getCompanyEmployees(companyId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  return employees.filter((employee) => employee.companyId === companyId);
}

export function addNotification(payload) {
  const notifications = readStorage(STORAGE_KEYS.notifications, []);
  const item = {
    id: createUniqueId("notif"),
    ...payload,
    time: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.notifications, [item, ...notifications]);
  return item;
}

export function isMessageBlocked(user) {
  if (!user?.chatBlockedUntil) return false;
  return new Date(user.chatBlockedUntil).getTime() > Date.now();
}

export function blockUserChat(userId, minutes = 60) {
  const users = readStorage(STORAGE_KEYS.users, []);
  const nextUsers = users.map((user) => {
    if (user.id !== userId) return user;
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    return { ...user, chatBlockedUntil: until };
  });

  writeStorage(STORAGE_KEYS.users, nextUsers);
}

export function getCompanyMessages(companyId) {
  const messages = readStorage(STORAGE_KEYS.messages, []);
  return messages.filter((message) => message.companyId === companyId);
}

export function getCompanyNews(companyId) {
  const news = readStorage(STORAGE_KEYS.news, []);
  return news.filter((item) => item.companyId === companyId);
}

export function saveCompany(company) {
  const companies = readStorage(STORAGE_KEYS.companies, []);
  writeStorage(STORAGE_KEYS.companies, [...companies, company]);
}

export function getEmployeeProfile(userId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  return employees.find((employee) => employee.userId === userId) || null;
}

export function updateEmployeePresence(userId, updates = {}) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const nextEmployees = employees.map((employee) => {
    if (employee.userId !== userId) return employee;
    return {
      ...employee,
      ...updates,
      lastActivity: updates.lastActivity || employee.lastActivity || new Date().toISOString(),
      isOnline: updates.isOnline ?? employee.isOnline ?? true,
      cameraEnabled: updates.cameraEnabled ?? employee.cameraEnabled ?? false,
    };
  });

  writeStorage(STORAGE_KEYS.employees, nextEmployees);
  return nextEmployees.find((employee) => employee.userId === userId) || null;
}

export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;

  const cleaned = url.trim();
  if (!cleaned) return false;

  // Base64 data URL (canvas rasmlari uchun qo'llab-quvvatlash)
  if (cleaned.startsWith("data:image/")) {
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(cleaned);
  }

  // HTTP/HTTPS URL
  try {
    const parsed = new URL(cleaned);
    return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function getEmployeeOfflineMinutes(employeeId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const employee = employees.find((item) => item.id === employeeId);

  if (!employee || !employee.lastActivity) return 0;

  const lastTime = new Date(employee.lastActivity).getTime();
  const diffMs = Date.now() - lastTime;

  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

// ========== PLAN VALIDATION ==========
export function validateCompanyCreation(userId, planId) {
  const plan = PLANS[planId];
  if (!plan) return { valid: false, error: "Tanlangan tarif topilmadi" };

  const companies = readStorage(STORAGE_KEYS.companies, []);
  const userCompanies = companies.filter((c) => c.ownerId === userId).length;

  if (userCompanies >= plan.companyLimit) {
    return {
      valid: false,
      error: `Kompaniya limiti: ${plan.companyLimit}. Hozirda ${userCompanies} ta kompaniya mavjud.`,
    };
  }

  return { valid: true };
}

export function validateEmployeeCreation(companyId, planId) {
  const plan = PLANS[planId];
  if (!plan) return { valid: false, error: "Rasm topilmadi" };

  const employees = readStorage(STORAGE_KEYS.employees, []);
  const companyEmployees = employees.filter((e) => e.companyId === companyId).length;

  if (companyEmployees >= plan.employeeLimit) {
    return {
      valid: false,
      error: `Xodim limiti: ${plan.employeeLimit}. Hozirda ${companyEmployees} ta xodim mavjud.`,
    };
  }

  return { valid: true };
}

// ========== EMPLOYEE MONITORING ==========
export function updateEmployeeActivity(employeeId, activity) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const employee = employees.find((e) => e.id === employeeId);

  if (employee) {
    employee.lastActivity = new Date().toISOString();
    employee.isOnline = true;
    employee.idleTime = 0;
    if (activity) employee.currentTask = activity;
    writeStorage(STORAGE_KEYS.employees, employees);
  }
}

export function getEmployeeMonitoringStatus(employeeId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee) return null;

  const lastActivityTime = new Date(employee.lastActivity || new Date()).getTime();
  const currentTime = new Date().getTime();
  const idleMinutes = Math.floor((currentTime - lastActivityTime) / (1000 * 60));

  let status = employee.status;
  if (idleMinutes > 30) {
    status = "offline";
  } else if (idleMinutes > 15) {
    status = "idle";
  } else {
    status = "active";
  }

  return {
    id: employee.id,
    name: employee.name,
    status: status,
    isOnline: employee.isOnline && idleMinutes <= 30,
    idleMinutes: idleMinutes,
    lastActivity: employee.lastActivity,
    currentTask: employee.currentTask || "Faollik yo'q",
    todayWorkTime: employee.todayWorkTime || 0,
  };
}

export function checkEmployeeIdleStatus(companyId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const companyEmployees = employees.filter((e) => e.companyId === companyId);
  const notifications = readStorage(STORAGE_KEYS.notifications, []);

  companyEmployees.forEach((employee) => {
    const lastActivityTime = new Date(employee.lastActivity || new Date()).getTime();
    const currentTime = new Date().getTime();
    const idleMinutes = Math.floor((currentTime - lastActivityTime) / (1000 * 60));

    if (idleMinutes > 15 && employee.status !== "break") {
      const existingNotif = notifications.find(
        (n) => n.employeeId === employee.id && n.type === "idle" && !n.read
      );

      if (!existingNotif) {
        const notif = {
          id: `notif_${Date.now()}`,
          companyId: companyId,
          employeeId: employee.id,
          employeeName: employee.name,
          time: new Date().toISOString(),
          type: "idle",
          message: `${employee.name} ${idleMinutes} minutdan beri faol emas`,
          read: false,
        };
        notifications.push(notif);
      }
    }
  });

  writeStorage(STORAGE_KEYS.notifications, notifications);
}

export function getCompanyMonitoring(companyId) {
  const employees = readStorage(STORAGE_KEYS.employees, []);
  const companyEmployees = employees.filter((e) => e.companyId === companyId);

  const monitoring = {
    totalEmployees: companyEmployees.length,
    activeEmployees: 0,
    idleEmployees: 0,
    offlineEmployees: 0,
    employees: [],
  };

  companyEmployees.forEach((employee) => {
    const status = getEmployeeMonitoringStatus(employee.id);
    if (status) {
      monitoring.employees.push(status);

      if (status.isOnline && status.status === "active") {
        monitoring.activeEmployees++;
      } else if (status.status === "idle") {
        monitoring.idleEmployees++;
      } else {
        monitoring.offlineEmployees++;
      }
    }
  });

  return monitoring;
}
