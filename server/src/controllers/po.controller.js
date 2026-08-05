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

export async function updatePO(req, res) {
  return res.status(403).json({
    message: "Blockchain Immutability Violation: Purchase orders recorded on the blockchain are permanently anchored into a block and cannot be edited. To make a correction, issue a new purchase order.",
  });
}

export default { listPOs, getPO, createPO, updatePO };
