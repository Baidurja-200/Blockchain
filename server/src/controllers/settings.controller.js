import mongoose from "mongoose";
import Block from "../models/Block.js";
import User, { ROLES } from "../models/User.js";
import { seedDatabase } from "../utils/seed.js";
import monitorBus from "../services/monitorBus.js";

const PERMISSIONS = {
  "Procurement Officer": ["Create PO", "View PO", "Edit PO", "View Dashboard", "View Reports"],
  "Warehouse Officer": ["Create GRN", "View GRN", "View PO", "View Dashboard"],
  "Finance Officer": ["Approve Invoice", "Reject Invoice", "Release Payment", "View Reports", "View Dashboard"],
  Vendor: ["Upload Invoice", "View Own Invoices"],
  Auditor: ["View Blockchain Explorer", "View Reports", "View Fraud Detection", "View Dashboard"],
};

export async function systemStatus(req, res, next) {
  try {
    const dbState = mongoose.connection.readyState; // 1 = connected
    const totalBlocks = await Block.countDocuments();
    const lastBlock = await Block.findOne().sort({ blockNumber: -1 });
    const totalUsers = await User.countDocuments();

    res.json({
      api: "Online",
      database: dbState === 1 ? "Connected" : "Disconnected",
      blockchainNode: "Simulated Chain — Active",
      totalBlocks,
      lastBlockNumber: lastBlock?.blockNumber ?? 0,
      lastBlockTime: lastBlock?.timestamp ?? null,
      totalUsers,
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (err) {
    next(err);
  }
}

export async function roleMatrix(req, res) {
  res.json({ roles: ROLES, permissions: PERMISSIONS });
}

/**
 * Wipes everything (including every classroom login identity) and
 * repopulates the small demo scenario dataset. Meant to be run between
 * groups/sessions during a live class so the app doesn't accumulate clutter.
 * Anyone who was logged in, including the caller, will be signed out since
 * their User record no longer exists.
 */
export async function resetDemoData(req, res, next) {
  try {
    monitorBus.warning(`Reset Demo Data triggered by ${req.user?.name || "someone"} — wiping and reseeding...`);
    const { pos, grns, invoices } = await seedDatabase({ silent: true });
    monitorBus.success(`Demo data reset complete — ${pos.length} POs, ${grns.length} GRNs, ${invoices.length} invoices`);
    res.json({
      message: "Demo data has been reset. Everyone will need to log in again.",
      purchaseOrders: pos.length,
      grns: grns.length,
      invoices: invoices.length,
    });
  } catch (err) {
    next(err);
  }
}

export default { systemStatus, roleMatrix, resetDemoData };
