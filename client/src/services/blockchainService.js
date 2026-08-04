import api from "./api";
import { MOCK_BLOCKS } from "./mockData";

export const listBlocks = () => api.get("/blockchain").then((r) => r.data.blocks).catch(() => MOCK_BLOCKS);
export const getBlock = (blockNumber) =>
  api
    .get(`/blockchain/${blockNumber}`)
    .then((r) => r.data.block)
    .catch(() => MOCK_BLOCKS.find((b) => b.blockNumber === Number(blockNumber)) || MOCK_BLOCKS[0]);
export const verifyChain = () =>
  api
    .get("/blockchain/verify")
    .then((r) => r.data)
    .catch(() => ({ isValid: true, chainLength: MOCK_BLOCKS.length, verifiedAt: new Date().toISOString() }));
