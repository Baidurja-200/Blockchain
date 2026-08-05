import api from "./api";
import { MOCK_GRNS, appendMockBlock } from "./mockData";

export const listGRNs = () => api.get("/grns").then((r) => r.data.grns).catch(() => MOCK_GRNS);
export const createGRN = (payload) =>
  api
    .post("/grns", payload)
    .then((r) => r.data.grn)
    .catch(() => {
      const grnNumber = "GRN-" + Math.floor(1000 + Math.random() * 9000);
      const receivedQuantity = Number(payload.receivedQuantity);

      const newBlock = appendMockBlock("GRN", grnNumber, {
        grnNumber,
        poNumber: payload.poNumber,
        receivedQuantity,
      });

      const newGRN = {
        _id: "grn-" + Date.now(),
        grnNumber,
        poNumber: payload.poNumber,
        receivedQuantity,
        receivedDate: new Date().toISOString().split("T")[0],
        receivedBy: "Warehouse Admin",
        remarks: payload.remarks || "Goods received and inspected",
        blockNumber: newBlock.blockNumber,
        blockId: newBlock.blockNumber,
        blockHash: newBlock.hash,
        txHash: newBlock.hash,
        blockTimestamp: newBlock.timestamp,
        createdAt: new Date().toISOString(),
      };
      MOCK_GRNS.unshift(newGRN);
      return newGRN;
    });
