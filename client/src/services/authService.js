import api from "./api";

export const login = (payload) => api.post("/auth/login", payload).then((r) => r.data);
export const fetchMe = () => api.get("/auth/me").then((r) => r.data);
export const fetchRoles = () => api.get("/auth/roles").then((r) => r.data);
