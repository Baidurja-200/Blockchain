import api from "./api";
import { MOCK_INVOICES } from "./mockData";

export const listFlaggedInvoices = () =>
  api
    .get("/fraud")
    .then((r) => r.data.invoices)
    .catch(() => MOCK_INVOICES.filter((i) => i.fraudRiskLevel === "HIGH" || i.status === "REJECTED"));
export const fraudSummary = () =>
  api
    .get("/fraud/summary")
    .then((r) => r.data)
    .catch(() => ({
      totalFlagged: 1,
      avgScore: 85,
      avgFraudScore: 85,
      high: 1,
      highRiskCount: 1,
      medium: 0,
      mediumRiskCount: 0,
      low: 2,
      lowRiskCount: 2,
    }));
