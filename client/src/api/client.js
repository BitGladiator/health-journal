const BASE_URL = import.meta.env.VITE_API_URL;

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw error;
  }
  return res.json();
};

export const getMe = () => apiFetch("/auth/me");
export const logout = () => apiFetch("/auth/logout", { method: "POST" });

export const getEntries = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/symptoms?${q}`);
};
export const getEntry = (id) => apiFetch(`/symptoms/${id}`);
export const createEntry = (data) =>
  apiFetch("/symptoms", { method: "POST", body: JSON.stringify(data) });
export const updateEntry = (id, data) =>
  apiFetch(`/symptoms/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteEntry = (id) =>
  apiFetch(`/symptoms/${id}`, { method: "DELETE" });
export const getAllTags = () => apiFetch("/symptoms/tags/all");
