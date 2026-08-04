import api from "./api";

export const listFlaggedInvoices = () => api.get("/fraud").then((r) => r.data.invoices);
export const fraudSummary = () => api.get("/fraud/summary").then((r) => r.data);
