import api from "./api";

export const fetchSystemStatus = () => api.get("/settings/status").then((r) => r.data);
export const fetchRoleMatrix = () => api.get("/settings/roles").then((r) => r.data);
export const resetDemoData = () => api.post("/settings/reset").then((r) => r.data);
