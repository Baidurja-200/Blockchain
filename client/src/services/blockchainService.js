import api from "./api";

export const listBlocks = () => api.get("/blockchain").then((r) => r.data.blocks);
export const getBlock = (blockNumber) => api.get(`/blockchain/${blockNumber}`).then((r) => r.data.block);
export const verifyChain = () => api.get("/blockchain/verify").then((r) => r.data);
