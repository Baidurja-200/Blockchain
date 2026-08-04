import { Router } from "express";
import { login, me, listRoles } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.get("/roles", listRoles);

export default router;
