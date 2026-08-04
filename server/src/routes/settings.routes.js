import { Router } from "express";
import { systemStatus, roleMatrix, resetDemoData } from "../controllers/settings.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/status", systemStatus);
router.get("/roles", roleMatrix);
router.post("/reset", resetDemoData);

export default router;
