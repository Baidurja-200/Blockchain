import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import Invoice from "../models/Invoice.js";
import Block from "../models/Block.js";

/**
 * Generates a report payload by type. Each report returns a `columns` +
 * `rows` shape so the frontend can render a table and export CSV generically.
 */
export async function generateReport(req, res, next) {
  try {
    const { type } = req.params;

    switch (type) {
      case "purchase": {
        const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
        return res.json({
          title: "Purchase Report",
          generatedAt: new Date(),
          columns: ["PO Number", "Vendor", "Product", "Qty", "Unit Price", "Total", "Status", "Delivery Date"],
          rows: pos.map((p) => [p.poNumber, p.vendor, p.product, p.quantity, p.unitPrice, p.totalAmount, p.status, p.deliveryDate.toISOString().slice(0, 10)]),
        });
      }
      case "fraud": {
        const invoices = await Invoice.find({ "fraud.score": { $gt: 0 } }).sort({ "fraud.score": -1 });
        return res.json({
          title: "Fraud Report",
          generatedAt: new Date(),
          columns: ["Invoice #", "Vendor", "PO", "Amount", "Fraud Score", "Level", "Recommendation", "Reasons"],
          rows: invoices.map((i) => [i.invoiceNumber, i.vendor, i.poNumber, i.invoiceAmount, i.fraud.score, i.fraud.level, i.fraud.recommendation, i.fraud.reasons.join("; ")]),
        });
      }
      case "vendor": {
        const pos = await PurchaseOrder.find();
        const map = new Map();
        pos.forEach((p) => {
          const cur = map.get(p.vendor) || { vendor: p.vendor, orders: 0, totalSpend: 0 };
          cur.orders += 1;
          cur.totalSpend += p.totalAmount;
          map.set(p.vendor, cur);
        });
        const rows = Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
        return res.json({
          title: "Vendor Report",
          generatedAt: new Date(),
          columns: ["Vendor", "Orders", "Total Spend"],
          rows: rows.map((r) => [r.vendor, r.orders, Math.round(r.totalSpend)]),
        });
      }
      case "audit": {
        const invoices = await Invoice.find().sort({ createdAt: -1 });
        return res.json({
          title: "Audit Report",
          generatedAt: new Date(),
          columns: ["Invoice #", "PO", "GRN", "Status", "PO Exists", "GRN Exists", "Duplicate", "Amount Match", "Qty Sufficient", "Block #"],
          rows: invoices.map((i) => [
            i.invoiceNumber,
            i.poNumber,
            i.grnNumber || "-",
            i.status,
            i.validation.poExists ? "Yes" : "No",
            i.validation.grnExists ? "Yes" : "No",
            i.validation.duplicateInvoice ? "Yes" : "No",
            i.validation.amountMatches ? "Yes" : "No",
            i.validation.quantitySufficient ? "Yes" : "No",
            i.blockId ?? "-",
          ]),
        });
      }
      case "blockchain": {
        const blocks = await Block.find().sort({ blockNumber: -1 });
        return res.json({
          title: "Blockchain Report",
          generatedAt: new Date(),
          columns: ["Block #", "Type", "Reference", "Status", "Hash", "Previous Hash", "Timestamp"],
          rows: blocks.map((b) => [b.blockNumber, b.transactionType, b.referenceId, b.status, b.hash, b.previousHash, b.timestamp.toISOString()]),
        });
      }
      default:
        return res.status(400).json({ message: `Unknown report type: ${type}` });
    }
  } catch (err) {
    next(err);
  }
}

export default { generateReport };
