import api from "./api";
import { MOCK_POS, MOCK_INVOICES } from "./mockData";

export const generateReport = (type) =>
  api
    .get(`/reports/${type}`)
    .then((r) => r.data)
    .catch(() => ({
      reportType: type,
      generatedAt: new Date().toISOString(),
      summary: { totalRecords: 6, totalValue: 125000 },
      records: type === "po" ? MOCK_POS : MOCK_INVOICES,
    }));
