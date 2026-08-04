import api from "./api";

export const listGRNs = () => api.get("/grns").then((r) => r.data.grns);
export const createGRN = (payload) => api.post("/grns", payload).then((r) => r.data.grn);
