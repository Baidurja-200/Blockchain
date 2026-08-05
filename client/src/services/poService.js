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

      if (!payload.vendor || !payload.product || quantity <= 0 || unitPrice <= 0 || !payload.deliveryDate) {
        const err = new Error("Blockchain Validation Error: Transaction Restricted. Purchase order contains invalid vendor, zero quantity, or negative unit price. Smart contract rejected transaction.");
        err.response = { data: { message: err.message } };
        throw err;
      }

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
        createdAt: new Date().toISOString(),
      };
      MOCK_POS.unshift(newPO);
      return newPO;
    });
export const updatePO = () =>
  Promise.reject(new Error("Blockchain Immutability Error: Records anchored on the blockchain cannot be edited or modified. To make a correction, issue a new purchase order."));
