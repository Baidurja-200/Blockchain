import api from "./api";

export const listInvoices = () => api.get("/invoices").then((r) => r.data.invoices);
export const getInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data.invoice);

export const createInvoice = (formData) =>
  api
    .post("/invoices", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.invoice);

export const decideInvoice = (id, decision) => api.post(`/invoices/${id}/decision`, { decision }).then((r) => r.data);
export const payInvoice = (id) => api.post(`/invoices/${id}/pay`).then((r) => r.data);
