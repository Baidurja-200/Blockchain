import api from "./api";

export const fetchKpis = () => api.get("/dashboard/kpis").then((r) => r.data);
export const fetchCharts = () => api.get("/dashboard/charts").then((r) => r.data);
export const fetchRecentActivity = (limit = 12) => api.get(`/dashboard/activity?limit=${limit}`).then((r) => r.data.activities);
