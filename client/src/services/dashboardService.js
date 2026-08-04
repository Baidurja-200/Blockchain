import api from "./api";
import { MOCK_KPIS, MOCK_CHARTS, MOCK_ACTIVITIES } from "./mockData";

export const fetchKpis = () => api.get("/dashboard/kpis").then((r) => r.data).catch(() => MOCK_KPIS);
export const fetchCharts = () => api.get("/dashboard/charts").then((r) => r.data).catch(() => MOCK_CHARTS);
export const fetchRecentActivity = (limit = 12) =>
  api
    .get(`/dashboard/activity?limit=${limit}`)
    .then((r) => r.data.activities)
    .catch(() => MOCK_ACTIVITIES);
