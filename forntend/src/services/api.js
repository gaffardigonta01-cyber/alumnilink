// -----------------------------------------------------------------------------
// src/services/api.js - Central API client, auto-attaches JWT Bearer token
// -----------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// -- Token helpers -------------------------------------------------------------
// If remember is true: stored in localStorage (persists across browser restarts)
// If remember is false: stored in sessionStorage (cleared when browser closes)
export const getToken = () => {
  return localStorage.getItem("al_token") || sessionStorage.getItem("al_token");
};

export const setToken = (token, remember = false) => {
  if (remember) {
    localStorage.setItem("al_token", token);
    sessionStorage.removeItem("al_token");
  } else {
    sessionStorage.setItem("al_token", token);
    localStorage.removeItem("al_token");
  }
};

export const clearToken = () => {
  localStorage.removeItem("al_token");
  sessionStorage.removeItem("al_token");
};

// -- Core fetch wrapper --------------------------------------------------------
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// -- Auth ----------------------------------------------------------------------
export const authAPI = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  forgotPassword: (body) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }),
  resetPassword: (body) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
};

// -- User (profile) ------------------------------------------------------------
export const userAPI = {
  getProfile: () => request("/users/profile"),
  updateProfile: (body) => request("/users/profile", { method: "PUT", body: JSON.stringify(body) }),
  uploadAvatar: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch(`${BASE_URL}/users/avatar`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to upload avatar");
    }
    return res.json();
  },
  changePassword: (body) => request("/users/change-password", { method: "PUT", body: JSON.stringify(body) }),
};

// -- Alumni directory ----------------------------------------------------------
export const alumniAPI = {
  getAll: (params = {}) => request(`/alumni?${new URLSearchParams(params)}`),
  getById: (id) => request(`/alumni/${id}`),
};

// -- Mentorship sessions -------------------------------------------------------
export const sessionAPI = {
  getAll: (params = {}) => request(`/sessions?${new URLSearchParams(params)}`),
  getById: (id) => request(`/sessions/${id}`),
  create: (body) => request("/sessions", { method: "POST", body: JSON.stringify(body) }),
  updateStatus: (id, status) => request(`/sessions/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  cancel: (id) => request(`/sessions/${id}/cancel`, { method: "PUT" }),
  start: (id, meetingLink) => request(`/sessions/${id}/start`, { method: "PUT", body: JSON.stringify({ meetingLink }) }),
  delete: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  join: (id) => request(`/sessions/${id}/join`, { method: "PUT" }),
};

// -- Messages ------------------------------------------------------------------
export const messageAPI = {
  getThreads: () => request("/messages"),
  getThread: (otherUserId) => request(`/messages/${otherUserId}`),
  getConversation: (otherUserId) => request(`/messages/${otherUserId}`),
  send: (partnerId, text) =>
    request(`/messages/${partnerId}`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  sendMessage: (arg1, arg2) => {
    if (typeof arg1 === "object" && arg1 !== null) {
      const pid = arg1.receiverId || arg1.partnerId || arg1.recipientId;
      if (pid) {
        return request(`/messages/${pid}`, {
          method: "POST",
          body: JSON.stringify(arg1),
        });
      }
      return request("/messages", { method: "POST", body: JSON.stringify(arg1) });
    }
    return request(`/messages/${arg1}`, {
      method: "POST",
      body: JSON.stringify({ text: arg2 }),
    });
  },
  markAsRead: (otherUserId) => request(`/messages/${otherUserId}/read`, { method: "PUT" }),
};

// -- Resources -----------------------------------------------------------------
export const resourceAPI = {
  getAll: (params = {}) => request(`/resources?${new URLSearchParams(params)}`),
  getById: (id) => request(`/resources/${id}`),
  create: async (body) => {
    if (body instanceof FormData) {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/resources`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create resource");
      return data;
    }
    return request("/resources", { method: "POST", body: JSON.stringify(body) });
  },
  uploadAttachment: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/resources/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to upload file.");
    return data;
  },
  download: (id) => request(`/resources/${id}/download`, { method: "POST" }),
  toggleSave: (id) => request(`/resources/${id}/toggle-save`, { method: "POST" }),
  delete: (id) => request(`/resources/${id}`, { method: "DELETE" }),
  getViewUrl: (id, fileUrl) => {
    if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
      return fileUrl;
    }
    return `${BASE_URL}/resources/${id}/view.pdf`;
  },
};

// -- Referrals -----------------------------------------------------------------
export const referralAPI = {
  getAll: () => request("/referrals"),
  create: (body) => request("/referrals", { method: "POST", body: JSON.stringify(body) }),
  updateStatus: (id, status) => request(`/referrals/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  uploadAttachment: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/referrals/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to upload attachment.");
    return data;
  },
  getDownloadUrl: (filename, originalName) => {
    return `${BASE_URL}/referrals/download/${encodeURIComponent(filename)}?name=${encodeURIComponent(originalName || filename)}`;
  },
  getFileUrl: (relativeUrl) => {
    if (!relativeUrl) return "";
    if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) return relativeUrl;
    const base = BASE_URL.replace("/api", "");
    return `${base}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  },
};

// -- Notifications -------------------------------------------------------------
export const notificationAPI = {
  getAll: () => request("/notifications"),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => request("/notifications/read-all", { method: "PUT" }),
  delete: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
};

// -- Jobs ----------------------------------------------------------------------
export const jobAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.append("search", params.search);
    if (params.type && params.type !== "All") qs.append("type", params.type);
    if (params.workplaceType && params.workplaceType !== "All") qs.append("workplaceType", params.workplaceType);
    const q = qs.toString();
    return request(`/jobs${q ? `?${q}` : ""}`);
  },
  getMyJobs: () => request("/jobs/my-jobs"),
  getMyApplications: () => request("/jobs/my-applications"),
  create: (data) => request("/jobs", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  apply: (id, data) => request(`/jobs/${id}/apply`, { method: "POST", body: JSON.stringify(data) }),
  updateAppStatus: (id, status) => request(`/jobs/applications/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
};

export default request;


