import { Router } from "express";
import { listInvoices, getInvoice, createInvoice, decideInvoice, payInvoice } from "../controllers/invoice.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(requireAuth);
// Anyone can view — invoices and their fraud/validation results are visible across the whole team.
router.get("/", listInvoices);
router.get("/:id", getInvoice);
// Only Vendors submit invoices.
router.post("/", requireRole("Vendor"), upload.single("file"), createInvoice);
// Only Finance Officers approve/reject and release payment.
router.post("/:id/decision", requireRole("Finance Officer"), decideInvoice);
router.post("/:id/pay", requireRole("Finance Officer"), payInvoice);

export default router;
