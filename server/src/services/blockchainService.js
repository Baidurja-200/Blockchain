import crypto from "crypto";
import Block from "../models/Block.js";
import monitorBus from "./monitorBus.js";
import { broadcastDataChange } from "./socketManager.js";

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Computes a SHA-256 hash for a block, chaining it to the previous block's
 * hash so any tampering with historical data breaks the chain — the
 * fundamental "immutability" property we demonstrate in the Blockchain
 * Explorer page.
 */
function computeHash({ blockNumber, previousHash, timestamp, transactionType, referenceId, data, nonce }) {
  const payload = JSON.stringify({ blockNumber, previousHash, timestamp, transactionType, referenceId, data, nonce });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** Ensures a genesis block (#0) exists so every chain has a well-defined root. */
export async function ensureGenesisBlock() {
  const existing = await Block.findOne({ blockNumber: 0 });
  if (existing) return existing;

  const timestamp = new Date();
  const genesisData = { message: "ChainVerify Genesis Block — Three-Way Invoice Verification System" };
  const hash = computeHash({
    blockNumber: 0,
    previousHash: GENESIS_PREVIOUS_HASH,
    timestamp,
    transactionType: "GENESIS",
    referenceId: "GENESIS",
    data: genesisData,
    nonce: 0,
  });

  return Block.create({
    blockNumber: 0,
    previousHash: GENESIS_PREVIOUS_HASH,
    hash,
    timestamp,
    transactionType: "GENESIS",
    status: "Confirmed",
    referenceId: "GENESIS",
    data: genesisData,
    nonce: 0,
  });
}

/**
 * Mines (creates + persists) a new block, simulating the lifecycle of a
 * blockchain transaction end-to-end, publishing progress to the Backend
 * Monitor bus as it goes. This is the core "smart contract call" simulation
 * used by PO / GRN / Invoice creation flows.
 */
export async function mineBlock({ transactionType, referenceId, data, endpoint, fast = false, timestamp: forcedTimestamp }) {
  const wait = (ms) => (fast ? Promise.resolve() : sleep(ms));

  if (endpoint) monitorBus.info(`POST ${endpoint}`, { referenceId });

  monitorBus.info("Generating SHA-256 hash of transaction payload...", { referenceId });
  await wait(280);

  const last = await Block.findOne().sort({ blockNumber: -1 });
  const genesis = last || (await ensureGenesisBlock());
  const blockNumber = genesis.blockNumber + 1;
  const previousHash = genesis.hash;
  const timestamp = forcedTimestamp || new Date();
  const nonce = Math.floor(Math.random() * 100000);

  const hash = computeHash({ blockNumber, previousHash, timestamp, transactionType, referenceId, data, nonce });

  monitorBus.info("Saving transaction record to MongoDB...", { referenceId });
  await wait(260);

  monitorBus.warning("Calling Smart Contract: ThreeWayMatch.recordTransaction()...", { referenceId });
  await wait(320);

  const txHash = `0x${hash.slice(0, 40)}`;
  monitorBus.warning(`Transaction sent -> ${txHash}`, { referenceId });
  await wait(300);

  monitorBus.info("Waiting for block confirmation...", { referenceId });
  await wait(350);

  const block = await Block.create({
    blockNumber,
    previousHash,
    hash,
    timestamp,
    transactionType,
    status: "Confirmed",
    referenceId,
    data,
    nonce,
  });

  monitorBus.success(`Block #${blockNumber} added to chain (hash ${hash.slice(0, 16)}...)`, { referenceId, blockNumber });
  monitorBus.success(`SUCCESS — ${transactionType} anchored on-chain`, { referenceId, blockNumber });

  broadcastDataChange("block_mined", block);

  return { block, txHash };
}

/** Verifies the full chain's integrity by recomputing hashes and checking links. */
export async function verifyChain() {
  const blocks = await Block.find().sort({ blockNumber: 1 });
  const issues = [];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const recomputed = computeHash({
      blockNumber: b.blockNumber,
      previousHash: b.previousHash,
      timestamp: b.timestamp,
      transactionType: b.transactionType,
      referenceId: b.referenceId,
      data: b.data,
      nonce: b.nonce,
    });

    if (recomputed !== b.hash) {
      issues.push({ blockNumber: b.blockNumber, reason: "Hash mismatch — data may have been tampered with" });
    }
    if (i > 0 && b.previousHash !== blocks[i - 1].hash) {
      issues.push({ blockNumber: b.blockNumber, reason: "Previous hash does not match preceding block" });
    }
  }

  return { valid: issues.length === 0, issues, totalBlocks: blocks.length };
}

export default { ensureGenesisBlock, mineBlock, verifyChain };
