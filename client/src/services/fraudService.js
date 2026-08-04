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
      avgFraudScore: 85,
      highRiskCount: 1,
      mediumRiskCount: 0,
      lowRiskCount: 2,
    }));
