import api from "./api";
import { MOCK_GRNS } from "./mockData";

export const listGRNs = () => api.get("/grns").then((r) => r.data.grns).catch(() => MOCK_GRNS);
export const createGRN = (payload) =>
  api
    .post("/grns", payload)
    .then((r) => r.data.grn)
    .catch(() => {
      const newGRN = {
        _id: "grn-" + Date.now(),
        grnNumber: "GRN-" + Math.floor(1000 + Math.random() * 9000),
        poNumber: payload.poNumber,
        receivedQuantity: Number(payload.receivedQuantity),
        receivedDate: new Date().toISOString().split("T")[0],
        receivedBy: "Warehouse Admin",
        remarks: payload.remarks || "Goods received and inspected",
        blockNumber: 16,
        blockHash: "0000" + Array(60).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join(""),
        createdAt: new Date().toISOString(),
      };
      MOCK_GRNS.unshift(newGRN);
      return newGRN;
    });
