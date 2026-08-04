import { Router } from "express";
import { listGRNs, createGRN } from "../controllers/grn.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
// Anyone can view — GRNs are visible across the whole team.
router.get("/", listGRNs);
// Only Warehouse Officers record goods receipts.
router.post("/", requireRole("Warehouse Officer"), createGRN);

export default router;
