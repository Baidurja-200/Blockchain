import { Router } from "express";
import { listBlocks, getBlock, verify } from "../controllers/blockchain.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listBlocks);
router.get("/verify", verify);
router.get("/:blockNumber", getBlock);

export default router;
