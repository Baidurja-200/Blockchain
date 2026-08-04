import Block from "../models/Block.js";
import { verifyChain, ensureGenesisBlock } from "../services/blockchainService.js";

export async function listBlocks(req, res, next) {
  try {
    await ensureGenesisBlock();
    const blocks = await Block.find().sort({ blockNumber: -1 });
    res.json({ blocks });
  } catch (err) {
    next(err);
  }
}

export async function getBlock(req, res, next) {
  try {
    const block = await Block.findOne({ blockNumber: Number(req.params.blockNumber) });
    if (!block) return res.status(404).json({ message: "Block not found" });
    res.json({ block });
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const result = await verifyChain();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default { listBlocks, getBlock, verify };
