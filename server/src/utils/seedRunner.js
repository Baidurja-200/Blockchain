import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import { seedDatabase } from "./seed.js";

connectDB()
  .then(() => seedDatabase())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Seed] Failed:", err);
    process.exit(1);
  });
