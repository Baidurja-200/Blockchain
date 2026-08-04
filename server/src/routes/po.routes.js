import { Router } from "express";
import { listPOs, getPO, createPO, updatePO } from "../controllers/po.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
// Anyone can view — Purchase Orders are visible across the whole team.
router.get("/", listPOs);
router.get("/:id", getPO);
// Only Procurement Officers can create or edit purchase orders.
router.post("/", requireRole("Procurement Officer"), createPO);
router.put("/:id", requireRole("Procurement Officer"), updatePO);

export default router;
