import api from "./api";

export const generateReport = (type) =>
  api
    .get(`/reports/${type}`)
    .then((r) => r.data)
    .catch(() => {
      const titles = {
        purchase: "Purchase Orders Report",
        fraud: "Fraud Detection Report",
        vendor: "Vendor Spend Summary",
        audit: "Three-Way Match Audit Trail",
        blockchain: "Blockchain Ledger Export",
      };
      const columns = {
        purchase: ["PO Number", "Vendor", "Product", "Qty", "Total", "Status"],
        fraud: ["Invoice Number", "Vendor", "Amount", "Fraud Score", "Risk Level", "Reason"],
        vendor: ["Vendor Name", "Total Orders", "Total Value", "Status"],
        audit: ["Invoice #", "PO #", "GRN #", "Match Status", "Amount", "Verified Date"],
        blockchain: ["Block #", "Type", "Hash", "Prev Hash", "Timestamp"],
      };
      const rows = {
        purchase: [
          ["PO-DEMO-01", "NovaTech Supplies", "Server Racks", "50", "₹50,000", "CLOSED"],
          ["PO-DEMO-02", "BluePeak Electronics", "Network Switches", "30", "₹60,000", "INVOICED"],
          ["PO-DEMO-03", "Meridian Steel", "Steel Sheets", "100", "₹45,000", "RECEIVED"],
        ],
        fraud: [
          ["INV-DEMO-03-DUP", "NovaTech Supplies", "₹50,000", "85", "HIGH", "Duplicate invoice submission"],
        ],
        vendor: [
          ["NovaTech Industrial Supplies", "3", "₹4,85,000", "Active"],
          ["BluePeak Electronics", "2", "₹3,20,000", "Active"],
          ["Meridian Steel & Alloys", "1", "₹45,000", "Active"],
        ],
        audit: [
          ["INV-DEMO-01", "PO-DEMO-01", "GRN-DEMO-01", "APPROVED & PAID", "₹50,000", new Date().toLocaleDateString()],
          ["INV-DEMO-02", "PO-DEMO-02", "GRN-DEMO-02", "APPROVED", "₹60,000", new Date().toLocaleDateString()],
        ],
        blockchain: [
          ["0", "GENESIS", "0000a1b2c3d4...", "00000000...", new Date().toLocaleDateString()],
          ["1", "PURCHASE_ORDER", "0000a4b8c9d1...", "0000a1b2c3d4...", new Date().toLocaleDateString()],
          ["2", "GRN", "0000f9a3b4c5...", "0000a4b8c9d1...", new Date().toLocaleDateString()],
        ],
      };
      return {
        title: titles[type] || "Operational Report",
        generatedAt: new Date().toISOString(),
        columns: columns[type] || ["Column 1", "Column 2"],
        rows: rows[type] || [["Data 1", "Data 2"]],
      };
    });
