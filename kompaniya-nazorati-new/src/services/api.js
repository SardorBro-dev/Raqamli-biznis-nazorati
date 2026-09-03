import {
  createLocalEmployee,
  createLocalUser,
  getCurrentSession,
  loginLocalUser,
  updateLocalProfile,
  setCurrentSession,
} from "../utils/storage";

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }

  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "localhost";
  const normalizedHost = ["0.0.0.0", "::", "[::]", "::1", "localhost", "127.0.0.1"].includes(hostname)
    ? "localhost"
    : hostname;

  return `${protocol}//${normalizedHost}:8000/api/v1`;
}

const API_BASE_URL = getApiBaseUrl();
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "backend";
const USE_LOCAL_AUTH = AUTH_MODE === "local";

function parseBody(body) {
  if (!body) return {};
  try {
    return typeof body === "string" ? JSON.parse(body) : body;
  } catch {
    return {};
  }
}

function normalizeJsonBody(body) {
  let value = body;
  for (let attempt = 0; attempt < 2 && typeof value === "string"; attempt += 1) {
    value = parseBody(value);
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function formatApiError(detail, fallback = "So'rov bajarilmadi.") {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "string") return item;
      const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : "";
      return field ? `${field}: ${item.msg || "Noto'g'ri qiymat."}` : item?.msg || "Noto'g'ri so'rov.";
    }).join("; ");
  }
  if (detail && typeof detail === "object") {
    return detail.message || detail.msg || fallback;
  }
  return fallback;
}

function createEmployeeLocally(options) {
  const payload = parseBody(options.body);
  return createLocalEmployee({
    companyId: payload.company_id,
    name: `${payload.first_name || ""} ${payload.last_name || ""}`.trim(),
    username: payload.username,
    password: payload.temporary_password,
    workStart: payload.work_schedule?.split("-")[0] || "09:00",
    workEnd: payload.work_schedule?.split("-")[1] || "18:00",
  });
}

async function apiRequest(endpoint, options = {}) {
  if (USE_LOCAL_AUTH && endpoint === "/auth/register") {
    const payload = parseBody(options.body);
    return createLocalUser({
      name: payload.name || "",
      email: payload.email || "",
      phone: payload.phone || "",
      username: payload.username || "",
      password: payload.password || "",
      role: "owner",
    });
  }

  if (USE_LOCAL_AUTH && endpoint === "/auth/login") {
    const payload = parseBody(options.body);
    return loginLocalUser({
      username: payload.username || "",
      password: payload.password || "",
    });
  }

  if (USE_LOCAL_AUTH && endpoint === "/users/me") {
    const session = getCurrentSession();
    const payload = parseBody(options.body);
    return updateLocalProfile({
      userId: session?.userId,
      ...payload,
    });
  }

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  const request = async (requestConfig) => fetch(`${API_BASE_URL}${endpoint}`, requestConfig);

  if (config.body && config.headers["Content-Type"] === "application/json") {
    config.body = JSON.stringify(normalizeJsonBody(config.body));
  }

  let response;
  try {
    response = await request(config);
  } catch (error) {
    if (endpoint === "/employees" && options.method === "POST") {
      return createEmployeeLocally(options);
    }
    const connectionError = new Error(
      "Serverga ulanib bo'lmadi. Backend serveri ishga tushganini tekshiring."
    );
    connectionError.cause = error;
    connectionError.code = "API_UNAVAILABLE";
    throw connectionError;
  }

  if (response.status === 401 && endpoint !== "/auth/refresh") {
    const session = getCurrentSession();
    if (session?.refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: session.refreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json();
          setCurrentSession({
            ...session,
            userId: refreshed.user_id,
            role: refreshed.role,
            token: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            user: {
              ...(session.user || {}),
              id: refreshed.user_id,
              username: refreshed.username,
              name: refreshed.name || refreshed.username,
              email: refreshed.email || "",
              role: refreshed.role,
            },
          });
          response = await request({
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${refreshed.access_token}`,
            },
          });
        }
      } catch {
        // The original response is handled below when refresh is unavailable.
      }
    }
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(formatApiError(payload.detail || payload.message));
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const authApi = {
  register: (body) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkRegistration: (body) => apiRequest("/auth/register/check", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkTelegramPhone: (phone) => apiRequest(`/auth/telegram/check?phone=${encodeURIComponent(phone)}`, { method: "GET" }),
  verifyTelegramCode: (phone, code) => apiRequest("/auth/telegram/verify", { method: "POST", body: JSON.stringify({ phone, code }) }),
  requestTelegramCode: (phone) => apiRequest("/auth/telegram/request-code", { method: "POST", body: JSON.stringify({ phone }) }),
  requestRecoveryCode: (phone) => apiRequest("/auth/recovery/request-code", { method: "POST", body: JSON.stringify({ phone }) }),
  getRecoveryAccount: (phone) => apiRequest(`/auth/recovery/account?phone=${encodeURIComponent(phone)}`, { method: "GET" }),
  completeRecovery: (body) => apiRequest("/auth/recovery/complete", { method: "POST", body: JSON.stringify(body) }),
  getProfile: (token) =>
    apiRequest("/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  getRoles: () => apiRequest("/users/roles", { method: "GET" }),
  getBackgroundMode: (token) => apiRequest("/users/me/background-mode", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  setBackgroundMode: (mode, token) => apiRequest("/users/me/background-mode", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mode }),
  }),
  updateProfile: (body, token) => apiRequest("/users/me", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
};

export const aiApi = {
  generate: (prompt, token) => apiRequest("/ai/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
  }),
};

export const companyApi = {
  getPlans: () => apiRequest("/companies/plans", { method: "GET" }),
  getPublicCompanies: (token) => apiRequest("/companies/public", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  getCompanies: (token) => apiRequest("/companies", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  getById: (companyId, token) => apiRequest(`/companies/${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  create: (body, token) => apiRequest("/companies", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: String(body?.name || "").trim(),
      industry: String(body?.industry || "").trim(),
      owner_name: String(body?.owner_name || "").trim(),
      address: String(body?.address || "").trim(),
      working_days: Array.isArray(body?.working_days) ? body.working_days : [],
      work_start_time: body?.work_start_time || "09:00",
      work_end_time: body?.work_end_time || "18:00",
      default_break_time: Number(body?.default_break_time || 0),
      subscription_plan: body?.subscription_plan || undefined,
    }),
  }),
  upgradePlan: (planId, token) => apiRequest("/companies/upgrade-plan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan: planId }),
  }),
  delete: (companyId, token) => apiRequest(`/companies/${encodeURIComponent(companyId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }),
};

export const employeeApi = {
  getMe: (token) => apiRequest("/employees/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  list: (companyId, token) => apiRequest(`/employees?company_id=${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  create: (body, token) => apiRequest("/employees", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
  update: (employeeId, body, token) => apiRequest(`/employees/${employeeId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
  fire: (employeeId, token) => apiRequest(`/employees/${employeeId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }),
};

export const workSessionsApi = {
  start: (employeeId, token) => apiRequest("/work-sessions/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ employee_id: employeeId }),
  }),
  break: (employeeId, token) => apiRequest("/work-sessions/break", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ employee_id: employeeId }),
  }),
  resume: (employeeId, token) => apiRequest("/work-sessions/resume", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ employee_id: employeeId }),
  }),
  end: (employeeId, token) => apiRequest("/work-sessions/end", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ employee_id: employeeId }),
  }),
};

export const communicationsApi = {
  listMessages: (companyId, token) => apiRequest(`/messages?company_id=${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  sendMessage: (body, token) => apiRequest("/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
  updateMeetingStatus: (body, token) => apiRequest("/meetings/status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
  listNews: (companyId, token) => apiRequest(`/news?company_id=${encodeURIComponent(companyId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }),
  createNews: (body, token) => apiRequest("/news", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }),
  deleteNews: (newsId, token) => apiRequest(`/news/${newsId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }),
};

export default apiRequest;
