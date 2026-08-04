import Invoice from "../models/Invoice.js";

/**
 * Rule-based fraud detection engine.
 *
 * Architecture note: this module exposes a single `scoreInvoice()` entry
 * point that returns a normalized { score, level, reasons, recommendation }
 * shape. A future ML model (e.g. a gradient-boosted classifier trained on
 * historical fraud labels) can be swapped in behind the same interface
 * without touching any caller — see `scoreInvoiceML()` stub below.
 */

const WEIGHTS = {
  DUPLICATE_INVOICE: 40,
  MISSING_GRN: 40,
  AMOUNT_MISMATCH: 25,
  QUANTITY_MISMATCH: 15,
  MODIFIED_PO: 20,
  REPEATED_VENDOR: 10,
  INVOICE_BEFORE_DELIVERY: 20,
  MISSING_PO: 40,
  OVER_RECEIPT: 30,
};

export async function scoreInvoice(invoiceDoc, matchResult) {
  const reasons = [];
  let score = 0;

  const { po, grn, duplicateInvoice, amountMatches, quantitySufficient, grnExists, poExists } = matchResult;

  if (duplicateInvoice) {
    score += WEIGHTS.DUPLICATE_INVOICE;
    reasons.push("Duplicate Invoice — this PO/invoice has already been processed on-chain");
  }

  // Billing against a purchase order that does not exist at all is the most
  // severe signal there is — there is no agreement to pay against.
  if (!poExists) {
    score += WEIGHTS.MISSING_PO;
    reasons.push(`Missing PO — no purchase order found matching "${invoiceDoc.poNumber}"`);
  }

  // Billing for goods nobody confirmed receiving. Weighted high enough on its
  // own to force at least a manual review, since the three-way match will
  // always reject this case and the recommendation must not contradict that.
  if (!grnExists) {
    score += WEIGHTS.MISSING_GRN;
    reasons.push("Missing GRN — no goods receipt note found, so nobody has confirmed these goods arrived");
  }

  if (po && !amountMatches) {
    const diffPct = Math.abs(invoiceDoc.invoiceAmount - po.totalAmount) / po.totalAmount;
    const weight = diffPct > 0.2 ? WEIGHTS.AMOUNT_MISMATCH : Math.round(WEIGHTS.AMOUNT_MISMATCH * 0.6);
    score += weight;
    reasons.push(
      `Amount Mismatch — invoice ($${invoiceDoc.invoiceAmount.toLocaleString()}) differs from PO ($${po.totalAmount.toLocaleString()}) by ${(diffPct * 100).toFixed(1)}%`
    );
  }

  if (po && grn && !quantitySufficient) {
    score += WEIGHTS.QUANTITY_MISMATCH;
    reasons.push(`Quantity Mismatch — received ${grn.quantityReceived} of ${po.quantity} ordered units`);
  }

  // More goods booked in than were ever ordered — either a warehouse error or
  // collusion to justify an inflated invoice.
  if (grn?.isOverReceipt) {
    score += WEIGHTS.OVER_RECEIPT;
    reasons.push(
      `Over-receipt — goods receipt booked ${grn.quantityReceived} units against a purchase order for ${po?.quantity ?? "fewer"} (${grn.overReceiptBy} more than ordered)`
    );
  }

  if (po && Number((po.quantity * po.unitPrice).toFixed(2)) !== Number(po.totalAmount.toFixed(2))) {
    score += WEIGHTS.MODIFIED_PO;
    reasons.push("Modified PO — total amount does not equal quantity × unit price, PO data may have been altered");
  }

  // Repeated vendor: 3+ invoices from same vendor flagged (score>0) in the last 30 days
  const recentVendorInvoices = await Invoice.find({
    vendor: invoiceDoc.vendor,
    _id: { $ne: invoiceDoc._id },
    "fraud.score": { $gt: 20 },
  }).limit(5);
  if (recentVendorInvoices.length >= 2) {
    score += WEIGHTS.REPEATED_VENDOR;
    reasons.push(`Repeated Vendor — ${invoiceDoc.vendor} has ${recentVendorInvoices.length} other flagged invoices`);
  }

  // Suspicious timing: the vendor billed for goods BEFORE anyone confirmed
  // they arrived. In a legitimate process the goods receipt always comes
  // first, so this ordering is a genuine red flag. (We deliberately do not
  // flag "invoice submitted soon after receipt" — that is normal, and in a
  // live demo every invoice would trip it.)
  if (grn && invoiceDoc.createdAt) {
    const deltaMs = new Date(invoiceDoc.createdAt) - new Date(grn.createdAt);
    if (deltaMs < 0) {
      score += WEIGHTS.INVOICE_BEFORE_DELIVERY;
      reasons.push("Suspicious Timing — invoice was raised before the goods were recorded as received");
    }
  }

  score = Math.min(100, score);

  let level = "Low";
  if (score >= 60) level = "High";
  else if (score >= 30) level = "Medium";

  let recommendation = "Approve";
  if (score >= 60) recommendation = "Reject";
  else if (score >= 30) recommendation = "Manual Review";

  // The recommendation must never contradict the hard three-way match. If the
  // match failed, "Approve" is not a valid suggestion regardless of score.
  if (!matchResult.passed && recommendation === "Approve") {
    recommendation = "Manual Review";
  }

  if (reasons.length === 0) {
    reasons.push("No fraud indicators detected — all three-way match checks passed cleanly");
  }

  return { score, level, reasons, recommendation };
}

// Placeholder for future ML-based scoring — same signature as scoreInvoice().
export async function scoreInvoiceML(invoiceDoc, matchResult) {
  // TODO: replace rule-based scoring with a trained model's prediction.
  return scoreInvoice(invoiceDoc, matchResult);
}

export default { scoreInvoice, scoreInvoiceML };
