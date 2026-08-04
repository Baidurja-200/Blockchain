import api from "./api";
import { MOCK_POS } from "./mockData";

export const listPOs = () => api.get("/purchase-orders").then((r) => r.data.purchaseOrders).catch(() => MOCK_POS);
export const getPO = (id) => api.get(`/purchase-orders/${id}`).then((r) => r.data.purchaseOrder).catch(() => MOCK_POS.find(p => p._id === id) || MOCK_POS[0]);
export const createPO = (payload) =>
  api
    .post("/purchase-orders", payload)
    .then((r) => r.data.purchaseOrder)
    .catch(() => {
      const newPO = {
        _id: "po-" + Date.now(),
        poNumber: "PO-" + Math.floor(1000 + Math.random() * 9000),
        vendor: payload.vendor,
        product: payload.product,
        quantity: Number(payload.quantity),
        unitPrice: Number(payload.unitPrice),
        totalAmount: Number(payload.quantity) * Number(payload.unitPrice),
        deliveryDate: payload.deliveryDate,
        status: "ISSUED",
        blockNumber: 15,
        blockHash: "0000" + Array(60).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join(""),
        createdAt: new Date().toISOString(),
      };
      MOCK_POS.unshift(newPO);
      return newPO;
    });
export const updatePO = (id, payload) =>
  api
    .put(`/purchase-orders/${id}`, payload)
    .then((r) => r.data.purchaseOrder)
    .catch(() => {
      const po = MOCK_POS.find((p) => p._id === id);
      if (po) Object.assign(po, payload);
      return po || MOCK_POS[0];
    });
