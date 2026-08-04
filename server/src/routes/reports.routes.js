import { Router } from "express";
import { generateReport } from "../controllers/reports.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/:type", generateReport);

export default router;
