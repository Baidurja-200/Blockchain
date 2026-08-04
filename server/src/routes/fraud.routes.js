import { Router } from "express";
import { listFlagged, fraudSummary } from "../controllers/fraud.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listFlagged);
router.get("/summary", fraudSummary);

export default router;
