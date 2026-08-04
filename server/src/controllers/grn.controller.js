import GRN from "../models/GRN.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import { mineBlock } from "../services/blockchainService.js";
import { logActivity } from "../utils/activity.js";
import monitorBus from "../services/monitorBus.js";

export async function listGRNs(req, res, next) {
  try {
    const grns = await GRN.find().sort({ createdAt: -1 });
    res.json({ grns });
  } catch (err) {
    next(err);
  }
}

function nextGrnNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GRN-${new Date().getFullYear()}-${rand}`;
}

export async function createGRN(req, res, next) {
  try {
    const { poNumber, quantityReceived, warehouseOfficer, remarks } = req.body;
    if (!poNumber || quantityReceived === undefined || !warehouseOfficer) {
      return res.status(400).json({ message: "poNumber, quantityReceived, warehouseOfficer are required" });
    }

    const qty = Number(quantityReceived);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity received must be a positive number" });
    }

    const po = await PurchaseOrder.findOne({ poNumber });
    if (!po) {
      monitorBus.error(`GRN rejected — PO ${poNumber} not found`);
      return res.status(404).json({ message: `No purchase order found with number ${poNumber}` });
    }

    if (po.status === "Cancelled") {
      monitorBus.error(`GRN rejected — PO ${poNumber} is cancelled`, { referenceId: poNumber });
      return res.status(409).json({ message: `${poNumber} was cancelled — it cannot receive goods.` });
    }

    // A PO can be delivered across multiple partial shipments, so we track the
    // RUNNING TOTAL received, not just this one submission.
    const priorGrns = await GRN.find({ poNumber });
    const alreadyReceived = priorGrns.reduce((sum, g) => sum + g.quantityReceived, 0);
    const remaining = po.quantity - alreadyReceived;

    // Receiving more than was ordered is a genuine red flag (warehouse error,
    // or collusion to justify an inflated invoice). We deliberately ACCEPT it
    // and flag it rather than blocking it: the whole premise of this system is
    // that irregularities get detected and recorded on-chain, not silently
    // prevented at the keyboard. It is fed into the fraud score later.
    const isOverReceipt = qty > remaining;
    const overReceiptBy = isOverReceipt ? qty - Math.max(remaining, 0) : 0;

    if (isOverReceipt) {
      monitorBus.warning(
        `Over-receipt detected — ${poNumber} ordered ${po.quantity}, already received ${alreadyReceived}, now receiving ${qty} (${overReceiptBy} over)`,
        { referenceId: poNumber }
      );
    }

    const grnNumber = req.body.grnNumber?.trim() || nextGrnNumber();

    const grn = await GRN.create({
      grnNumber,
      purchaseOrder: po._id,
      poNumber: po.poNumber,
      quantityReceived: qty,
      warehouseOfficer,
      remarks: remarks || "",
      isOverReceipt,
      overReceiptBy,
      createdBy: req.user?._id,
    });

    const totalReceived = alreadyReceived + qty;
    po.status = totalReceived >= po.quantity ? "Closed" : "Partially Received";
    await po.save();

    const { block, txHash } = await mineBlock({
      transactionType: "GRN",
      referenceId: grn.grnNumber,
      endpoint: "/api/grns",
      data: { grnNumber, poNumber, quantityReceived: qty, warehouseOfficer, totalReceived, orderedQuantity: po.quantity, isOverReceipt },
    });

    grn.blockId = block.blockNumber;
    grn.txHash = txHash;
    grn.blockTimestamp = block.timestamp;
    await grn.save();

    await logActivity({
      type: "GRN_CREATED",
      message: `GRN ${grn.grnNumber} recorded for ${po.poNumber} (qty ${qty}, total received ${totalReceived}/${po.quantity})`,
      actor: req.user?.name || "Warehouse Officer",
      referenceId: grn.grnNumber,
      severity: isOverReceipt ? "warning" : "success",
    });

    if (isOverReceipt) {
      await logActivity({
        type: "FRAUD_FLAGGED",
        message: `Over-receipt on ${po.poNumber} — ${totalReceived} units received against ${po.quantity} ordered (${overReceiptBy} over)`,
        actor: "Fraud Engine",
        referenceId: grn.grnNumber,
        severity: "danger",
      });
    }

    res.status(201).json({ grn });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "GRN number already exists" });
    }
    next(err);
  }
}

export default { listGRNs, createGRN };
