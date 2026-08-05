import api from "./api";
import { MOCK_POS, appendMockBlock } from "./mockData";

export const listPOs = () => api.get("/purchase-orders").then((r) => r.data.purchaseOrders).catch(() => MOCK_POS);
export const getPO = (id) => api.get(`/purchase-orders/${id}`).then((r) => r.data.purchaseOrder).catch(() => MOCK_POS.find(p => p._id === id) || MOCK_POS[0]);
export const createPO = (payload) =>
  api
    .post("/purchase-orders", payload)
    .then((r) => r.data.purchaseOrder)
    .catch(() => {
      const poNumber = "PO-" + Math.floor(1000 + Math.random() * 9000);
      const quantity = Number(payload.quantity);
      const unitPrice = Number(payload.unitPrice);
      const totalAmount = quantity * unitPrice;
      const now = new Date().toISOString();

      const newBlock = appendMockBlock("PURCHASE_ORDER", poNumber, {
        poNumber,
        vendor: payload.vendor,
        product: payload.product,
        quantity,
        unitPrice,
        totalAmount,
      });

      const newPO = {
        _id: "po-" + Date.now(),
        poNumber,
        vendor: payload.vendor,
        product: payload.product,
        quantity,
        unitPrice,
        totalAmount,
        deliveryDate: payload.deliveryDate,
        status: "ISSUED",
        blockNumber: newBlock.blockNumber,
        blockId: newBlock.blockNumber,
        blockHash: newBlock.hash,
        txHash: newBlock.hash,
        blockTimestamp: newBlock.timestamp,
        createdAt: now,
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
