import api from "./api";

export const listPOs = () => api.get("/purchase-orders").then((r) => r.data.purchaseOrders);
export const getPO = (id) => api.get(`/purchase-orders/${id}`).then((r) => r.data.purchaseOrder);
export const createPO = (payload) => api.post("/purchase-orders", payload).then((r) => r.data.purchaseOrder);
export const updatePO = (id, payload) => api.put(`/purchase-orders/${id}`, payload).then((r) => r.data.purchaseOrder);
