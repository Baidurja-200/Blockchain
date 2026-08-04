import PurchaseOrder from "../models/PurchaseOrder.js";
import GRN from "../models/GRN.js";
import Invoice from "../models/Invoice.js";
import Block from "../models/Block.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import { ensureGenesisBlock, mineBlock } from "../services/blockchainService.js";
import { runThreeWayMatch } from "../services/threeWayMatchService.js";
import { scoreInvoice } from "../services/fraudDetectionService.js";
import { logActivity } from "../utils/activity.js";

const SETUP_ACTOR = "Demo Setup";
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/**
 * A small, hand-crafted, deterministic dataset — six purchase orders, each
 * built to demonstrate exactly one outcome of the three-way match / fraud
 * engine. This is intentionally NOT randomized: the goal is that anyone
 * looking at the Purchase Orders / Invoices tables can immediately see
 * *why* each record ended up Approved, Pending, or Rejected, which matters
 * a lot more for a live classroom walkthrough than a large realistic-looking
 * dataset would.
 */
const SCENARIOS = [
  {
    poNumber: "PO-DEMO-01",
    vendor: "NovaTech Industrial Supplies",
    product: "Server Rack Enclosures",
    quantity: 50,
    unitPrice: 100,
    scenario: "clean-paid",
    grnQuantity: 50,
    grnRemarks: "Received in good condition — full shipment",
    invoiceAmount: 5000,
  },
  {
    poNumber: "PO-DEMO-02",
    vendor: "BluePeak Electronics",
    product: "24-Port Network Switches",
    quantity: 30,
    unitPrice: 200,
    scenario: "clean-pending",
    grnQuantity: 30,
    grnRemarks: "Received in good condition — full shipment",
    invoiceAmount: 6000,
  },
  {
    poNumber: "PO-DEMO-03",
    vendor: "Meridian Steel & Alloys",
    product: "Industrial Grade Steel Sheets",
    quantity: 100,
    unitPrice: 50,
    scenario: "duplicate-invoice",
    grnQuantity: 100,
    grnRemarks: "Received in good condition — full shipment",
    invoiceAmount: 5000,
  },
  {
    poNumber: "PO-DEMO-04",
    vendor: "Vertex Office Solutions",
    product: "Ergonomic Office Chairs",
    quantity: 40,
    unitPrice: 150,
    scenario: "missing-grn",
    grnQuantity: null, // no GRN created on purpose
    invoiceAmount: 6000,
  },
  {
    poNumber: "PO-DEMO-05",
    vendor: "Solstice Packaging Co.",
    product: "Packaging Boxes (Bulk)",
    quantity: 200,
    unitPrice: 10,
    scenario: "amount-mismatch",
    grnQuantity: 200,
    grnRemarks: "Received in good condition — full shipment",
    invoiceAmount: 2600, // should be $2,000 — vendor over-billed
  },
  {
    poNumber: "PO-DEMO-06",
    vendor: "Crestline Logistics Ltd.",
    product: "Conveyor Belt Rollers",
    quantity: 60,
    unitPrice: 120,
    scenario: "quantity-mismatch",
    grnQuantity: 40, // only partially received
    grnRemarks: "Partial shipment received — remainder backordered",
    invoiceAmount: 7200, // vendor invoiced for the full order anyway
  },
];

async function createPO(scenario, index) {
  const createdAt = daysAgo(20 - index * 3);
  const totalAmount = scenario.quantity * scenario.unitPrice;

  const po = await PurchaseOrder.create({
    poNumber: scenario.poNumber,
    vendor: scenario.vendor,
    product: scenario.product,
    quantity: scenario.quantity,
    unitPrice: scenario.unitPrice,
    totalAmount,
    deliveryDate: new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000),
    createdAt,
    updatedAt: createdAt,
  });

  const { block, txHash } = await mineBlock({
    transactionType: "PURCHASE_ORDER",
    referenceId: po.poNumber,
    data: { poNumber: po.poNumber, vendor: scenario.vendor, product: scenario.product, quantity: scenario.quantity, unitPrice: scenario.unitPrice, totalAmount },
    fast: true,
    timestamp: createdAt,
  });
  po.blockId = block.blockNumber;
  po.txHash = txHash;
  po.blockTimestamp = block.timestamp;
  await po.save();

  await logActivity({
    type: "PO_CREATED",
    message: `Purchase Order ${po.poNumber} created for ${scenario.vendor} ($${totalAmount.toLocaleString()})`,
    actor: SETUP_ACTOR,
    referenceId: po.poNumber,
    severity: "success",
  });

  return po;
}

async function createGRN(scenario, po, index) {
  if (scenario.grnQuantity === null) return null; // intentionally skipped — "missing GRN" scenario

  const createdAt = daysAgo(20 - index * 3 - 2);
  const grnNumber = `GRN-DEMO-${String(index + 1).padStart(2, "0")}`;

  const grn = await GRN.create({
    grnNumber,
    purchaseOrder: po._id,
    poNumber: po.poNumber,
    quantityReceived: scenario.grnQuantity,
    warehouseOfficer: "Warehouse Team",
    remarks: scenario.grnRemarks,
    createdAt,
    updatedAt: createdAt,
  });

  po.status = scenario.grnQuantity >= po.quantity ? "Closed" : "Partially Received";
  await po.save();

  const { block, txHash } = await mineBlock({
    transactionType: "GRN",
    referenceId: grn.grnNumber,
    data: { grnNumber, poNumber: po.poNumber, quantityReceived: scenario.grnQuantity },
    fast: true,
    timestamp: createdAt,
  });
  grn.blockId = block.blockNumber;
  grn.txHash = txHash;
  grn.blockTimestamp = block.timestamp;
  await grn.save();

  await logActivity({
    type: "GRN_CREATED",
    message: `GRN ${grn.grnNumber} recorded for ${po.poNumber} (qty ${scenario.grnQuantity})`,
    actor: SETUP_ACTOR,
    referenceId: grn.grnNumber,
    severity: "success",
  });

  return grn;
}

async function submitInvoice({ po, grn, amount, invoiceNumber, offsetDays }) {
  const createdAt = daysAgo(offsetDays);

  const invoice = await Invoice.create({
    invoiceNumber,
    poNumber: po.poNumber,
    purchaseOrder: po._id,
    grnNumber: grn?.grnNumber || "",
    grn: grn?._id,
    vendor: po.vendor,
    invoiceAmount: amount,
    fileName: `${invoiceNumber}.pdf`,
    createdAt,
    updatedAt: createdAt,
  });

  const matchResult = await runThreeWayMatch(invoice, { emitLogs: false });
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

  return { invoice, matchResult, fraudResult, createdAt };
}

async function finalizeInvoice({ invoice, matchResult, fraudResult, createdAt, forceStatus, paymentStatus }) {
  if (forceStatus) {
    invoice.status = forceStatus;
  } else if (!matchResult.passed || fraudResult.recommendation === "Reject") {
    invoice.status = "Rejected";
  } else if (fraudResult.recommendation === "Manual Review") {
    invoice.status = "Manual Review";
  } else {
    invoice.status = "Pending";
  }

  if (paymentStatus) invoice.paymentStatus = paymentStatus;

  const { block, txHash } = await mineBlock({
    transactionType: "INVOICE",
    referenceId: invoice.invoiceNumber,
    data: {
      invoiceNumber: invoice.invoiceNumber,
      poNumber: invoice.poNumber,
      grnNumber: invoice.grnNumber,
      invoiceAmount: invoice.invoiceAmount,
      validationPassed: matchResult.passed,
      fraudScore: fraudResult.score,
    },
    fast: true,
    timestamp: createdAt,
  });
  invoice.blockId = block.blockNumber;
  invoice.txHash = txHash;
  invoice.blockTimestamp = block.timestamp;
  await invoice.save();

  await logActivity({
    type: "INVOICE_UPLOADED",
    message: `Invoice ${invoice.invoiceNumber} submitted (${invoice.status}) — fraud score ${fraudResult.score}`,
    actor: SETUP_ACTOR,
    referenceId: invoice.invoiceNumber,
    severity: invoice.status === "Rejected" ? "danger" : invoice.status === "Manual Review" ? "warning" : "success",
  });

  if (invoice.status === "Approved") {
    await logActivity({
      type: "INVOICE_APPROVED",
      message: `Invoice ${invoice.invoiceNumber} approved`,
      actor: SETUP_ACTOR,
      referenceId: invoice.invoiceNumber,
      severity: "success",
    });
  }
  if (invoice.paymentStatus === "Paid") {
    await logActivity({
      type: "PAYMENT_RELEASED",
      message: `Payment of $${invoice.invoiceAmount.toLocaleString()} released for ${invoice.invoiceNumber}`,
      actor: SETUP_ACTOR,
      referenceId: invoice.invoiceNumber,
      severity: "success",
    });
  }
  if (fraudResult.score >= 30) {
    await logActivity({
      type: "FRAUD_FLAGGED",
      message: `Fraud indicators detected on ${invoice.invoiceNumber}: ${fraudResult.reasons[0]}`,
      actor: "Fraud Engine",
      referenceId: invoice.invoiceNumber,
      severity: fraudResult.score >= 60 ? "danger" : "warning",
    });
  }

  return invoice;
}

/**
 * Wipes and repopulates the database with a small, deliberately simple demo
 * dataset — six purchase orders, each illustrating one clear outcome
 * (clean & paid, clean & pending, duplicate invoice, missing GRN, amount
 * mismatch, quantity mismatch). No login users are seeded: identities are
 * created on the fly when someone logs in with their name + a role (see
 * auth.controller.js), which keeps this reset-safe for repeated classroom use.
 */
export async function seedDatabase({ silent = false } = {}) {
  const log = (...args) => !silent && console.log(...args);

  log("[Seed] Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    GRN.deleteMany({}),
    Invoice.deleteMany({}),
    Block.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  log("[Seed] Creating genesis block...");
  await ensureGenesisBlock();

  log("[Seed] Creating demo scenarios (POs, GRNs, invoices, blockchain blocks)...");

  const pos = [];
  const grns = [];
  const invoices = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    const po = await createPO(scenario, i);
    pos.push(po);

    const grn = await createGRN(scenario, po, i);
    if (grn) grns.push(grn);

    const offsetDays = 20 - i * 3 - 4;

    if (scenario.scenario === "clean-paid") {
      const result = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-01", offsetDays });
      invoices.push(await finalizeInvoice({ ...result, forceStatus: "Approved", paymentStatus: "Paid" }));
    } else if (scenario.scenario === "clean-pending") {
      const result = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-02", offsetDays });
      invoices.push(await finalizeInvoice(result));
    } else if (scenario.scenario === "duplicate-invoice") {
      const first = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-03A", offsetDays });
      invoices.push(await finalizeInvoice({ ...first, forceStatus: "Approved" }));
      const dup = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-03B", offsetDays: offsetDays - 1 });
      invoices.push(await finalizeInvoice(dup));
    } else if (scenario.scenario === "missing-grn") {
      const result = await submitInvoice({ po, grn: null, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-04", offsetDays });
      invoices.push(await finalizeInvoice(result));
    } else if (scenario.scenario === "amount-mismatch") {
      const result = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-05", offsetDays });
      invoices.push(await finalizeInvoice(result));
    } else if (scenario.scenario === "quantity-mismatch") {
      const result = await submitInvoice({ po, grn, amount: scenario.invoiceAmount, invoiceNumber: "INV-DEMO-06", offsetDays });
      invoices.push(await finalizeInvoice(result));
    }
  }

  log("\n[Seed] Done!");
  log(`  Purchase Orders:  ${pos.length}`);
  log(`  GRNs:             ${grns.length}`);
  log(`  Invoices:         ${invoices.length}`);
  log(`  Blocks:           ${await Block.countDocuments()}`);
  log("\n[Seed] No login users seeded — sign in with any name + role (shared password) to get started.");

  return { pos, grns, invoices };
}

export default seedDatabase;
