import PurchaseOrder from "../models/PurchaseOrder.js";
import Invoice from "../models/Invoice.js";
import { mineBlock } from "../services/blockchainService.js";
import { logActivity } from "../utils/activity.js";
import monitorBus from "../services/monitorBus.js";

export async function listPOs(req, res, next) {
  try {
    const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.json({ purchaseOrders: pos });
  } catch (err) {
    next(err);
  }
}

export async function getPO(req, res, next) {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    res.json({ purchaseOrder: po });
  } catch (err) {
    next(err);
  }
}

function nextPoNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${new Date().getFullYear()}-${rand}`;
}

export async function createPO(req, res, next) {
  try {
    const { vendor, product, quantity, unitPrice, deliveryDate } = req.body;
    if (!vendor || !product || !quantity || !unitPrice || !deliveryDate) {
      return res.status(400).json({ message: "vendor, product, quantity, unitPrice, deliveryDate are required" });
    }

    const totalAmount = Number(quantity) * Number(unitPrice);
    const poNumber = req.body.poNumber?.trim() || nextPoNumber();

    const po = await PurchaseOrder.create({
      poNumber,
      vendor,
      product,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount,
      deliveryDate,
      createdBy: req.user?._id,
    });

    const { block, txHash } = await mineBlock({
      transactionType: "PURCHASE_ORDER",
      referenceId: po.poNumber,
      endpoint: "/api/purchase-orders",
      data: { poNumber: po.poNumber, vendor, product, quantity, unitPrice, totalAmount },
    });

    po.blockId = block.blockNumber;
    po.txHash = txHash;
    po.blockTimestamp = block.timestamp;
    await po.save();

    await logActivity({
      type: "PO_CREATED",
      message: `Purchase Order ${po.poNumber} created for ${vendor} ($${totalAmount.toLocaleString()})`,
      actor: req.user?.name || "Procurement Officer",
      referenceId: po.poNumber,
      severity: "success",
    });

    res.status(201).json({ purchaseOrder: po });
  } catch (err) {
    if (err.code === 11000) {
      monitorBus.error(`Duplicate PO number rejected: ${req.body.poNumber}`);
      return res.status(409).json({ message: "PO number already exists" });
    }
    next(err);
  }
}

export async function updatePO(req, res, next) {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });

    // A PO that has already been billed against must not be silently
    // re-priced — that is exactly the "modified PO" fraud this system exists
    // to prevent. Once an invoice references it, only cancellation is allowed.
    const linkedInvoices = await Invoice.countDocuments({ poNumber: po.poNumber });
    const onlyCancelling = Object.keys(req.body).every((k) => k === "status") && req.body.status === "Cancelled";
    if (linkedInvoices > 0 && !onlyCancelling) {
      monitorBus.error(`PO ${po.poNumber} edit blocked — ${linkedInvoices} invoice(s) already reference it`, {
        referenceId: po.poNumber,
      });
      return res.status(409).json({
        message: `${po.poNumber} already has ${linkedInvoices} invoice(s) raised against it and can no longer be edited. This protects the audit trail.`,
      });
    }

    // Capture the "before" state so the amendment block records what changed.
    const before = {
      vendor: po.vendor,
      product: po.product,
      quantity: po.quantity,
      unitPrice: po.unitPrice,
      totalAmount: po.totalAmount,
      deliveryDate: po.deliveryDate,
      status: po.status,
    };

    const editable = ["vendor", "product", "quantity", "unitPrice", "deliveryDate", "status"];
    editable.forEach((field) => {
      if (req.body[field] !== undefined) po[field] = req.body[field];
    });
    if (req.body.quantity !== undefined || req.body.unitPrice !== undefined) {
      po.totalAmount = Number(po.quantity) * Number(po.unitPrice);
    }

    const changes = {};
    editable.concat("totalAmount").forEach((field) => {
      if (String(before[field]) !== String(po[field])) {
        changes[field] = { from: before[field], to: po[field] };
      }
    });

    await po.save();

    // Every amendment gets its own block, so the chain records not just the
    // original PO but the full history of how it was changed and by whom.
    if (Object.keys(changes).length > 0) {
      await mineBlock({
        transactionType: "PO_AMENDED",
        referenceId: po.poNumber,
        endpoint: `/api/purchase-orders/${po._id}`,
        data: { poNumber: po.poNumber, changes, amendedBy: req.user?.name || "Procurement Officer" },
      });
    }

    const summary = Object.entries(changes)
      .map(([f, c]) => `${f}: ${c.from} → ${c.to}`)
      .join(", ");
    await logActivity({
      type: "PO_AMENDED",
      message: `Purchase Order ${po.poNumber} amended${summary ? ` (${summary})` : ""}`,
      actor: req.user?.name || "Procurement Officer",
      referenceId: po.poNumber,
      severity: "warning",
    });

    res.json({ purchaseOrder: po });
  } catch (err) {
    next(err);
  }
}

export default { listPOs, getPO, createPO, updatePO };
