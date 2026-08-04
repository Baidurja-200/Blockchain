import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureGenesisBlock } from "./services/blockchainService.js";
import PurchaseOrder from "./models/PurchaseOrder.js";
import { seedDatabase } from "./utils/seed.js";

const PORT = process.env.PORT || 5000;

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

  app.listen(PORT, () => {
    console.log(`\n[Server] ChainVerify API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Login with any name + role — shared password: "${process.env.DEMO_PASSWORD || "demo123"}"\n`);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
