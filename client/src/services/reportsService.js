import api from "./api";

export const generateReport = (type) => api.get(`/reports/${type}`).then((r) => r.data);
