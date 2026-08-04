import { Router } from "express";
import { kpis, charts, recentActivity } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/kpis", kpis);
router.get("/charts", charts);
router.get("/activity", recentActivity);

export default router;
