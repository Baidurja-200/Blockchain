// Client-side fallback & live sync dataset for static GitHub Pages hosting.

const SYNC_CHANNEL_NAME = "hashflow_p2p_sync";
let broadcastChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (err) {
  // fallback for unsupported environments
}

export const MOCK_LOGS = [];

export function emitMockLog(level, message, metadata = {}) {
  const entry = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    level: level || "info",
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };

  MOCK_LOGS.unshift(entry);
  if (MOCK_LOGS.length > 500) MOCK_LOGS.pop();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hashflow_log", { detail: entry }));
    try {
      localStorage.setItem("cv_mock_logs", JSON.stringify(MOCK_LOGS.slice(0, 50)));
    } catch (e) {}
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "LOG", entry });
    } catch (e) {}
  }

  return entry;
}

export function appendMockBlock(transactionType, referenceId, payload) {
  const nextBlockNumber = MOCK_BLOCKS.length > 0
    ? Math.max(...MOCK_BLOCKS.map((b) => Number(b.blockNumber) || 0)) + 1
    : 1;

  const previousHash = MOCK_BLOCKS.length > 0
    ? MOCK_BLOCKS[0].hash
    : "0000a1b2c3d4e5f6a7b8c9d0e1f23456789abcdef0123456789abcdef0123456";

  const newHash = "0000" + Array(60).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join("");
  const timestamp = new Date().toISOString();

  const newBlock = {
    _id: "block-" + Date.now(),
    blockNumber: nextBlockNumber,
    transactionType,
    type: transactionType,
    status: "CONFIRMED",
    referenceId,
    hash: newHash,
    previousHash: previousHash,
    dataHash: newHash,
    nonce: Math.floor(1000 + Math.random() * 9000),
    timestamp,
    payload,
  };

  MOCK_BLOCKS.unshift(newBlock);

  // Emit real-time log event
  emitMockLog(
    transactionType.includes("REJECTED") ? "error" : "success",
    `[BLOCKCHAIN] Mined Block #${nextBlockNumber} [${transactionType}] (${referenceId}) — Hash: ${newHash.slice(0, 16)}...`,
    { blockNumber: nextBlockNumber, referenceId, transactionType, payload }
  );

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "BLOCK_MINED", block: newBlock, MOCK_BLOCKS, MOCK_POS, MOCK_GRNS, MOCK_INVOICES });
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    import("./cloudLedgerService").then(({ pushGlobalLedger }) => {
      let u = null;
      try {
        const raw = localStorage.getItem("cv_user");
        if (raw) u = JSON.parse(raw);
      } catch (e) {}
      pushGlobalLedger(u);
    }).catch(() => {});
  }

  return newBlock;
}

export const MOCK_POS = [
  {
    _id: "po-101",
    poNumber: "PO-DEMO-01",
    vendor: "NovaTech Industrial Supplies",
    product: "Server Rack Enclosures",
    quantity: 50,
    unitPrice: 100,
    totalAmount: 5000,
    deliveryDate: "2026-07-20",
    status: "CLOSED",
    blockNumber: 1,
    blockId: 1,
    blockHash: "0000a4b8c9d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123",
    txHash: "0000a4b8c9d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123",
    blockTimestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    _id: "po-102",
    poNumber: "PO-DEMO-02",
    vendor: "BluePeak Electronics",
    product: "24-Port Network Switches",
    quantity: 30,
    unitPrice: 200,
    totalAmount: 6000,
    deliveryDate: "2026-07-22",
    status: "INVOICED",
    blockNumber: 1,
    blockId: 1,
    blockHash: "0000b5c9d0e1f2a3b4c5d6e7f8a90123456789abcdef0123456789abcdef0124",
    txHash: "0000b5c9d0e1f2a3b4c5d6e7f8a90123456789abcdef0123456789abcdef0124",
    blockTimestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    _id: "po-103",
    poNumber: "PO-DEMO-03",
    vendor: "Meridian Steel & Alloys",
    product: "Industrial Grade Steel Sheets",
    quantity: 100,
    unitPrice: 45,
    totalAmount: 4500,
    deliveryDate: "2026-07-25",
    status: "RECEIVED",
    blockNumber: 1,
    blockId: 1,
    blockHash: "0000c6d0e1f2a3b4c5d6e7f8a9b0123456789abcdef0123456789abcdef0125",
    txHash: "0000c6d0e1f2a3b4c5d6e7f8a9b0123456789abcdef0123456789abcdef0125",
    blockTimestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    _id: "po-104",
    poNumber: "PO-DEMO-04",
    vendor: "Apex Logistics & Freight",
    product: "Heavy Cargo Containers",
    quantity: 10,
    unitPrice: 1200,
    totalAmount: 12000,
    deliveryDate: "2026-07-28",
    status: "ISSUED",
    blockNumber: 1,
    blockId: 1,
    blockHash: "0000d7e1f2a3b4c5d6e7f8a9b0c123456789abcdef0123456789abcdef0126",
    txHash: "0000d7e1f2a3b4c5d6e7f8a9b0c123456789abcdef0123456789abcdef0126",
    blockTimestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    _id: "po-105",
    poNumber: "PO-DEMO-05",
    vendor: "Vanguard Tech Solutions",
    product: "Enterprise Workstations",
    quantity: 15,
    unitPrice: 1500,
    totalAmount: 22500,
    deliveryDate: "2026-07-30",
    status: "INVOICED",
    blockNumber: 1,
    blockId: 1,
    blockHash: "0000e8f2a3b4c5d6e7f8a9b0c1d23456789abcdef0123456789abcdef0127",
    txHash: "0000e8f2a3b4c5d6e7f8a9b0c1d23456789abcdef0123456789abcdef0127",
    blockTimestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const MOCK_GRNS = [
  {
    _id: "grn-201",
    grnNumber: "GRN-DEMO-01",
    poNumber: "PO-DEMO-01",
    receivedQuantity: 50,
    receivedDate: "2026-07-21",
    receivedBy: "Warehouse Admin",
    remarks: "Received in good condition — full shipment",
    blockNumber: 2,
    blockId: 2,
    blockHash: "0000f9a3b4c5d6e7f8a9b0c1d2e3456789abcdef0123456789abcdef0128",
    txHash: "0000f9a3b4c5d6e7f8a9b0c1d2e3456789abcdef0123456789abcdef0128",
    blockTimestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    _id: "grn-202",
    grnNumber: "GRN-DEMO-02",
    poNumber: "PO-DEMO-02",
    receivedQuantity: 30,
    receivedDate: "2026-07-23",
    receivedBy: "Warehouse Admin",
    remarks: "Received in good condition — full shipment",
    blockNumber: 2,
    blockId: 2,
    blockHash: "0000a0b1c2d3e4f5a6b7c8d9e0f123456789abcdef0123456789abcdef0129",
    txHash: "0000a0b1c2d3e4f5a6b7c8d9e0f123456789abcdef0123456789abcdef0129",
    blockTimestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    _id: "grn-203",
    grnNumber: "GRN-DEMO-03",
    poNumber: "PO-DEMO-03",
    receivedQuantity: 100,
    receivedDate: "2026-07-26",
    receivedBy: "Warehouse Admin",
    remarks: "Full delivery verified at Loading Dock 4",
    blockNumber: 2,
    blockId: 2,
    blockHash: "0000b1c2d3e4f5a6b7c8d9e0f1a23456789abcdef0123456789abcdef0130",
    txHash: "0000b1c2d3e4f5a6b7c8d9e0f1a23456789abcdef0123456789abcdef0130",
    blockTimestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export const MOCK_INVOICES = [
  {
    _id: "inv-301",
    invoiceNumber: "INV-DEMO-01",
    poNumber: "PO-DEMO-01",
    grnNumber: "GRN-DEMO-01",
    vendor: "NovaTech Industrial Supplies",
    invoiceAmount: 5000,
    amount: 5000,
    status: "PAID",
    paymentStatus: "PAID",
    fraudScore: 5,
    fraudRiskLevel: "LOW",
    fraud: {
      score: 5,
      recommendation: "Approve",
      reasons: ["Complete three-way match verified", "Vendor PO history verified", "No duplicate invoices detected"],
    },
    validation: {
      passed: true,
      steps: [
        { key: "poExists", label: "PO Exists?", passed: true, detail: "PO-DEMO-01 found ($5,000)" },
        { key: "grnExists", label: "GRN Exists?", passed: true, detail: "GRN-DEMO-01 found (50 received)" },
        { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: true, detail: "No duplicate detected" },
        { key: "amountMatches", label: "Amount Matches?", passed: true, detail: "$5,000 = $5,000" },
        { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: true, detail: "50 received >= 50 invoiced" },
      ],
    },
    blockId: 10,
    blockNumber: 10,
    blockHash: "0000c2d3e4f5a6b7c8d9e0f1a2b3456789abcdef0123456789abcdef0131",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    _id: "inv-302",
    invoiceNumber: "INV-DEMO-02",
    poNumber: "PO-DEMO-02",
    grnNumber: "GRN-DEMO-02",
    vendor: "BluePeak Electronics",
    invoiceAmount: 6000,
    amount: 6000,
    status: "APPROVED",
    paymentStatus: "PENDING",
    fraudScore: 8,
    fraudRiskLevel: "LOW",
    fraud: {
      score: 8,
      recommendation: "Approve",
      reasons: ["Three-way match verified", "GRN matched", "Vendor PO history verified"],
    },
    validation: {
      passed: true,
      steps: [
        { key: "poExists", label: "PO Exists?", passed: true, detail: "PO-DEMO-02 found ($6,000)" },
        { key: "grnExists", label: "GRN Exists?", passed: true, detail: "GRN-DEMO-02 found (30 received)" },
        { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: true, detail: "No duplicate detected" },
        { key: "amountMatches", label: "Amount Matches?", passed: true, detail: "$6,000 = $6,000" },
        { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: true, detail: "30 received >= 30 invoiced" },
      ],
    },
    blockId: 11,
    blockNumber: 11,
    blockHash: "0000d3e4f5a6b7c8d9e0f1a2b3c456789abcdef0123456789abcdef0132",
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    _id: "inv-303",
    invoiceNumber: "INV-DEMO-03-DUP",
    poNumber: "PO-DEMO-01",
    grnNumber: "GRN-DEMO-01",
    vendor: "NovaTech Industrial Supplies",
    invoiceAmount: 5000,
    amount: 5000,
    status: "REJECTED",
    paymentStatus: "REJECTED",
    rejectionReason: "Duplicate invoice submission detected for PO-DEMO-01",
    fraudScore: 85,
    fraudRiskLevel: "HIGH",
    fraud: {
      score: 85,
      recommendation: "Reject",
      reasons: [
        "Duplicate invoice submission detected for PO-DEMO-01",
        "PO-DEMO-01 already paid under INV-DEMO-01",
        "Remaining quantity available is 0",
      ],
    },
    validation: {
      passed: false,
      steps: [
        { key: "poExists", label: "PO Exists?", passed: true, detail: "PO-DEMO-01 found ($5,000)" },
        { key: "grnExists", label: "GRN Exists?", passed: true, detail: "GRN-DEMO-01 found" },
        { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: false, detail: "PO-DEMO-01 already paid on INV-DEMO-01" },
        { key: "amountMatches", label: "Amount Matches?", passed: true, detail: "$5,000 = $5,000" },
        { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: false, detail: "0 remaining quantity" },
      ],
    },
    blockId: 12,
    blockNumber: 12,
    blockHash: "0000e4f5a6b7c8d9e0f1a2b3c4d56789abcdef0123456789abcdef0133",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const MOCK_BLOCKS = [
  {
    _id: "block-0",
    blockNumber: 0,
    transactionType: "GENESIS",
    type: "GENESIS",
    status: "CONFIRMED",
    referenceId: "GENESIS-00",
    hash: "0000a1b2c3d4e5f6a7b8c9d0e1f23456789abcdef0123456789abcdef0123456",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    dataHash: "0000000000000000000000000000000000000000000000000000000000000000",
    nonce: 1000,
    timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
    payload: { message: "Genesis Block - Hashflow Ledger Initialised" },
  },
  {
    _id: "block-1",
    blockNumber: 1,
    transactionType: "PURCHASE_ORDER",
    type: "PURCHASE_ORDER",
    status: "CONFIRMED",
    referenceId: "PO-DEMO-01",
    hash: "0000a4b8c9d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123",
    previousHash: "0000a1b2c3d4e5f6a7b8c9d0e1f23456789abcdef0123456789abcdef0123456",
    dataHash: "0000b2c3d4e5f6a7b8c9d0e1f2a3456789abcdef0123456789abcdef0123457",
    nonce: 1001,
    timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    payload: { poNumber: "PO-DEMO-01", vendor: "NovaTech Industrial Supplies", amount: 5000 },
  },
  {
    _id: "block-2",
    blockNumber: 2,
    transactionType: "GRN",
    type: "GRN",
    status: "CONFIRMED",
    referenceId: "GRN-DEMO-01",
    hash: "0000f9a3b4c5d6e7f8a9b0c1d2e3456789abcdef0123456789abcdef0128",
    previousHash: "0000a4b8c9d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef0123",
    dataHash: "0000c3d4e5f6a7b8c9d0e1f2a3b456789abcdef0123456789abcdef0123458",
    nonce: 1002,
    timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
    payload: { grnNumber: "GRN-DEMO-01", poNumber: "PO-DEMO-01", receivedQuantity: 50 },
  },
  {
    _id: "block-3",
    blockNumber: 3,
    transactionType: "INVOICE",
    type: "INVOICE",
    status: "CONFIRMED",
    referenceId: "INV-DEMO-01",
    hash: "0000c2d3e4f5a6b7c8d9e0f1a2b3456789abcdef0123456789abcdef0131",
    previousHash: "0000f9a3b4c5d6e7f8a9b0c1d2e3456789abcdef0123456789abcdef0128",
    dataHash: "0000d4e5f6a7b8c9d0e1f2a3b4c56789abcdef0123456789abcdef0123459",
    nonce: 1003,
    timestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
    payload: { invoiceNumber: "INV-DEMO-01", amount: 5000, status: "PAID" },
  },
];

export const MOCK_KPIS = {
  totalPOs: 6,
  totalGRNs: 5,
  totalInvoices: 6,
  approvedInvoices: 2,
  rejectedInvoices: 4,
  fraudAlerts: 4,
  pendingPayments: 1,
  pendingPaymentsAmount: 6000,
  blockchainTransactions: 16,
};

export const MOCK_CHARTS = {
  monthlyProcurement: [
    { month: "Jan", amount: 45000 },
    { month: "Feb", amount: 62000 },
    { month: "Mar", amount: 78000 },
    { month: "Apr", amount: 95000 },
    { month: "May", amount: 110000 },
    { month: "Jun", amount: 138500 },
  ],
  invoiceStatus: [
    { status: "Approved & Paid", count: 1 },
    { status: "Approved, Awaiting Payment", count: 1 },
    { status: "Rejected - Duplicate", count: 1 },
    { status: "Rejected - Missing GRN", count: 1 },
    { status: "Rejected - Amount Mismatch", count: 1 },
    { status: "Rejected - Quantity Mismatch", count: 1 },
  ],
  vendorSpend: [
    { vendor: "NovaTech Industrial Supplies", amount: 48500 },
    { vendor: "BluePeak Electronics", amount: 32000 },
    { vendor: "Meridian Steel & Alloys", amount: 28000 },
    { vendor: "Apex Logistics & Freight", amount: 18000 },
    { vendor: "Vanguard Tech Solutions", amount: 12000 },
  ],
  fraudTrend: [
    { month: "Jan", avgScore: 12, alerts: 0 },
    { month: "Feb", avgScore: 18, alerts: 1 },
    { month: "Mar", avgScore: 25, alerts: 1 },
    { month: "Apr", avgScore: 32, alerts: 2 },
    { month: "May", avgScore: 45, alerts: 3 },
    { month: "Jun", avgScore: 68, alerts: 4 },
  ],
};

export const MOCK_ACTIVITIES = [
  {
    _id: "act-1",
    action: "INVOICE_PAID",
    actor: "Finance Manager",
    details: "INV-DEMO-01 settled ($5,000)",
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    _id: "act-2",
    action: "VALIDATION_FAILED",
    actor: "Smart Contract",
    details: "INV-DEMO-03-DUP rejected — duplicate invoice",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    _id: "act-3",
    action: "GRN_CREATED",
    actor: "Warehouse Officer",
    details: "GRN-DEMO-03 logged for PO-DEMO-03",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export const MOCK_SYSTEM_STATUS = {
  api: "Online (Demo Mode)",
  database: "Connected",
  blockchainNode: "Active & Syncing",
  totalBlocks: 16,
  lastBlockNumber: 15,
  lastBlockTime: new Date().toISOString(),
  totalUsers: 5,
  uptimeSeconds: 3840,
};
