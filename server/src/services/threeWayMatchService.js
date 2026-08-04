import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import Invoice from "../models/Invoice.js";
import monitorBus from "./monitorBus.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the deterministic three-way match used by both the Smart Contract
 * Validation animation and the actual approve/reject decision:
 *
 *   PO exists AND GRN exists AND NOT duplicate AND amount matches AND
 *   remaining quantity is available => APPROVED, else REJECTED.
 *
 * Returns an ordered `steps` array so the frontend can replay each check
 * with the exact pass/fail result the backend computed (no fake randomness).
 */
export async function runThreeWayMatch(invoiceDoc, { emitLogs = false } = {}) {
  const steps = [];
  const ref = invoiceDoc.invoiceNumber;

  const pushStep = (key, label, passed, detail) => {
    steps.push({ key, label, passed, detail });
    if (emitLogs) {
      monitorBus[passed ? "success" : "error"](`[${ref}] ${label}: ${passed ? "PASS" : "FAIL"} — ${detail}`, { referenceId: ref });
    }
  };

  if (emitLogs) {
    monitorBus.info(`Smart contract validation started for invoice ${ref}`, { referenceId: ref });
    await sleep(200);
  }

  // 1. PO Exists?
  const po = invoiceDoc.poNumber ? await PurchaseOrder.findOne({ poNumber: invoiceDoc.poNumber }) : null;
  const poExists = Boolean(po);
  pushStep("poExists", "PO Exists?", poExists, poExists ? `Found PO ${po.poNumber} (${po.vendor})` : `No PO found for ${invoiceDoc.poNumber}`);
  if (emitLogs) await sleep(220);

  // 2. GRN Exists?
  const grn = invoiceDoc.grnNumber ? await GRN.findOne({ grnNumber: invoiceDoc.grnNumber }) : null;
  const grnExists = Boolean(grn);
  pushStep("grnExists", "GRN Exists?", grnExists, grnExists ? `Found GRN ${grn.grnNumber} (qty ${grn.quantityReceived})` : "No matching goods receipt note");
  if (emitLogs) await sleep(220);

  // 3. Duplicate Invoice?
  const duplicate = await Invoice.findOne({
    invoiceNumber: invoiceDoc.invoiceNumber,
    _id: { $ne: invoiceDoc._id },
  });
  const otherApprovedForSamePO = await Invoice.findOne({
    poNumber: invoiceDoc.poNumber,
    status: "Approved",
    _id: { $ne: invoiceDoc._id },
  });
  const isDuplicate = Boolean(duplicate) || Boolean(otherApprovedForSamePO);
  pushStep(
    "duplicateInvoice",
    "Duplicate Invoice?",
    !isDuplicate,
    isDuplicate ? "This invoice or PO has already been processed" : "No duplicate found"
  );
  if (emitLogs) await sleep(220);

  // 4. Amount Matches?
  const amountMatches = poExists && Number(po.totalAmount.toFixed(2)) === Number(invoiceDoc.invoiceAmount.toFixed(2));
  pushStep(
    "amountMatches",
    "Amount Matches PO?",
    amountMatches,
    poExists ? `Invoice $${invoiceDoc.invoiceAmount.toLocaleString()} vs PO $${po.totalAmount.toLocaleString()}` : "Cannot compare — PO missing"
  );
  if (emitLogs) await sleep(220);

  // 5. Remaining Quantity Available?
  const quantitySufficient = poExists && grnExists && grn.quantityReceived >= po.quantity;
  pushStep(
    "quantitySufficient",
    "Remaining Quantity Available?",
    quantitySufficient,
    poExists && grnExists
      ? `Received ${grn.quantityReceived} / Ordered ${po.quantity}`
      : "Cannot verify quantity — PO or GRN missing"
  );
  if (emitLogs) await sleep(220);

  const passed = poExists && grnExists && !isDuplicate && amountMatches && quantitySufficient;

  if (emitLogs) {
    monitorBus[passed ? "success" : "error"](
      `Three-way match ${passed ? "PASSED" : "FAILED"} for invoice ${ref}`,
      { referenceId: ref }
    );
  }

  return {
    poExists,
    grnExists,
    duplicateInvoice: isDuplicate,
    amountMatches,
    quantitySufficient,
    passed,
    steps,
    po,
    grn,
  };
}

export default { runThreeWayMatch };
