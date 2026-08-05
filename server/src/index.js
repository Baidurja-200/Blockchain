import dotenv from "dotenv";
dotenv.config();

import http from "http";
import os from "os";
import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureGenesisBlock } from "./services/blockchainService.js";
import { initSocketIO } from "./services/socketManager.js";
import PurchaseOrder from "./models/PurchaseOrder.js";
import { seedDatabase } from "./utils/seed.js";

const PORT = process.env.PORT || 5000;

/**
 * Detect LAN IPv4 addresses so the instructor can share the URL
 * with the classroom (e.g. "http://192.168.1.45:5173").
 */
function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        addresses.push(info.address);
      }
    }
  }
  return addresses;
}

async function start() {
  const { mode } = await connectDB();
  await ensureGenesisBlock();

  // Seed only when there's no demo data yet — not based on user accounts,
  // since classroom logins create a User record on the fly and shouldn't
  // by themselves prevent re-seeding of a fresh (e.g. in-memory) database.
  const poCount = await PurchaseOrder.countDocuments();
  if (poCount === 0) {
    console.log(`[Server] No demo data found (${mode} DB) — auto-seeding...`);
    await seedDatabase();
  }

  // Create HTTP server from Express app (required for Socket.IO)
  const httpServer = http.createServer(app);

  // Initialise Socket.IO on the same HTTP server
  initSocketIO(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`\n[Server] ChainVerify API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Login with any name + role — shared password: "${process.env.DEMO_PASSWORD || "demo123"}"`);

    // Print LAN addresses for classroom sharing
    const lanIPs = getLanAddresses();
    if (lanIPs.length > 0) {
      console.log(`\n[Server] ╔══════════════════════════════════════════════════════════╗`);
      console.log(`[Server] ║  SHARE WITH YOUR CLASS (connect via WiFi/LAN):          ║`);
      for (const ip of lanIPs) {
        const url = `http://${ip}:5173`;
        const padded = url.padEnd(50);
        console.log(`[Server] ║  → ${padded}  ║`);
      }
      console.log(`[Server] ╚══════════════════════════════════════════════════════════╝\n`);
    }

    console.log(`[Server] WebSocket real-time sync: ENABLED\n`);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
