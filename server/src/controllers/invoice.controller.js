import Invoice from "../models/Invoice.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import { mineBlock } from "../services/blockchainService.js";
import { runThreeWayMatch } from "../services/threeWayMatchService.js";
import { scoreInvoice } from "../services/fraudDetectionService.js";
import { logActivity } from "../utils/activity.js";
import monitorBus from "../services/monitorBus.js";
import { broadcastDataChange } from "../services/socketManager.js";

export async function listInvoices(req, res, next) {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ invoice });
  } catch (err) {
    next(err);
  }
}

function nextInvoiceNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${new Date().getFullYear()}-${rand}`;
}

export async function createInvoice(req, res, next) {
  try {
    const { poNumber, grnNumber, invoiceAmount, vendor } = req.body;
    if (!poNumber || invoiceAmount === undefined) {
      return res.status(400).json({ message: "poNumber and invoiceAmount are required" });
    }

    const invoiceNumber = req.body.invoiceNumber?.trim() || nextInvoiceNumber();
    const po = await PurchaseOrder.findOne({ poNumber });

    const invoice = await Invoice.create({
      invoiceNumber,
      poNumber,
      purchaseOrder: po?._id,
      grnNumber: grnNumber || "",
      grn: grnNumber ? (await GRN.findOne({ grnNumber }))?._id : undefined,
      vendor: vendor || po?.vendor || "Unknown Vendor",
      invoiceAmount: Number(invoiceAmount),
      fileName: req.file?.originalname || req.body.fileName || "invoice.pdf",
      filePath: req.file?.filename || "",
      createdBy: req.user?._id,
    });

    monitorBus.info(`POST /api/invoices — invoice ${invoiceNumber} received from ${invoice.vendor}`, { referenceId: invoiceNumber });

    // Run three-way match (with live monitor logs for the demo effect)
    const matchResult = await runThreeWayMatch(invoice, { emitLogs: true });
    const fraudResult = await scoreInvoice(invoice, matchResult);

    invoice.validation = {
      poExists: matchResult.poExists,
      grnExists: matchResult.grnExists,
      duplicateInvoice: matchResult.duplicateInvoice,
      amountMatches: matchResult.amountMatches,
      quantitySufficient: matchResult.quantitySufficient,
      passed: matchResult.passed,
      steps: matchResult.steps,
    };
    invoice.fraud = fraudResult;

    if (!matchResult.passed || fraudResult.recommendation === "Reject") {
      invoice.status = "Rejected";
    } else if (fraudResult.recommendation === "Manual Review") {
      invoice.status = "Manual Review";
    } else {
      invoice.status = "Pending"; // passed checks, awaiting finance approval
    }

    const { block, txHash } = await mineBlock({
      transactionType: "INVOICE",
      referenceId: invoiceNumber,
      data: { invoiceNumber, poNumber, grnNumber, invoiceAmount, validationPassed: matchResult.passed, fraudScore: fraudResult.score },
    });
    invoice.blockId = block.blockNumber;
    invoice.txHash = txHash;
    invoice.blockTimestamp = block.timestamp;

    await invoice.save();

    await logActivity({
      type: "INVOICE_UPLOADED",
      message: `Invoice ${invoiceNumber} submitted (${invoice.status}) — fraud score ${fraudResult.score}`,
      actor: req.user?.name || "Vendor",
      referenceId: invoiceNumber,
      severity: invoice.status === "Rejected" ? "danger" : invoice.status === "Manual Review" ? "warning" : "success",
    });

    if (fraudResult.score >= 30) {
      await logActivity({
        type: "FRAUD_FLAGGED",
        message: `Fraud indicators detected on ${invoiceNumber}: ${fraudResult.reasons[0]}`,
        actor: "Fraud Engine",
        referenceId: invoiceNumber,
        severity: fraudResult.score >= 60 ? "danger" : "warning",
      });
    }

    broadcastDataChange("invoice_created", invoice);
    res.status(201).json({ invoice });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Invoice number already exists" });
    }
    next(err);
  }
}

export async function decideInvoice(req, res, next) {
  try {
    const { decision } = req.body; // "Approve" | "Reject"
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    invoice.status = decision === "Approve" ? "Approved" : "Rejected";
    invoice.approvedBy = req.user?._id;
    if (invoice.status === "Approved") invoice.paymentStatus = "Pending";
    await invoice.save();

    const { block } = await mineBlock({
      transactionType: "VALIDATION",
      referenceId: invoice.invoiceNumber,
      data: { invoiceNumber: invoice.invoiceNumber, decision: invoice.status, by: req.user?.name },
    });

    await logActivity({
      type: invoice.status === "Approved" ? "INVOICE_APPROVED" : "INVOICE_REJECTED",
      message: `Invoice ${invoice.invoiceNumber} ${invoice.status.toLowerCase()} by ${req.user?.name || "Finance"}`,
      actor: req.user?.name || "Finance Officer",
      referenceId: invoice.invoiceNumber,
      severity: invoice.status === "Approved" ? "success" : "danger",
    });

    broadcastDataChange("invoice_updated", invoice);
    res.json({ invoice, blockId: block.blockNumber });
  } catch (err) {
    next(err);
  }
}

export async function payInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    if (invoice.status !== "Approved") {
      return res.status(400).json({ message: "Only approved invoices can be paid" });
    }

    invoice.paymentStatus = "Paid";
    await invoice.save();

    const { block } = await mineBlock({
      transactionType: "PAYMENT",
      referenceId: invoice.invoiceNumber,
      data: { invoiceNumber: invoice.invoiceNumber, amount: invoice.invoiceAmount, vendor: invoice.vendor },
    });

    await logActivity({
      type: "PAYMENT_RELEASED",
      message: `Payment of $${invoice.invoiceAmount.toLocaleString()} released for ${invoice.invoiceNumber}`,
      actor: req.user?.name || "Finance Officer",
      referenceId: invoice.invoiceNumber,
      severity: "success",
    });

    broadcastDataChange("invoice_updated", invoice);
    res.json({ invoice, blockId: block.blockNumber });
  } catch (err) {
    next(err);
  }
}

export default { listInvoices, getInvoice, createInvoice, decideInvoice, payInvoice };
