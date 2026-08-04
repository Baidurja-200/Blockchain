export const ROLE_COLORS = {
  "Procurement Officer": { bg: "bg-brand-100 dark:bg-brand-500/20", text: "text-brand-700 dark:text-brand-300" },
  "Warehouse Officer": { bg: "bg-accent-500/10", text: "text-accent-600 dark:text-accent-400" },
  "Finance Officer": { bg: "bg-success-500/10", text: "text-success-600 dark:text-success-400" },
  Vendor: { bg: "bg-warning-500/10", text: "text-warning-600 dark:text-warning-400" },
  Auditor: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
};

export const ROLE_DESCRIPTIONS = {
  "Procurement Officer": "Creates and manages Purchase Orders",
  "Warehouse Officer": "Records Goods Receipt Notes on delivery",
  "Finance Officer": "Approves invoices and releases payments",
  Vendor: "Submits invoices against fulfilled orders",
  Auditor: "Read-only oversight of the entire chain",
};
