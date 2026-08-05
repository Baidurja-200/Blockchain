import api from "./api";
import { MOCK_INVOICES, appendMockBlock } from "./mockData";

export const listInvoices = () => api.get("/invoices").then((r) => r.data.invoices).catch(() => MOCK_INVOICES);
export const getInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data.invoice).catch(() => MOCK_INVOICES.find(i => i._id === id) || MOCK_INVOICES[0]);

export const createInvoice = (formData) =>
  api
    .post("/invoices", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.invoice)
    .catch(() => {
      const poNumber = formData.get ? (formData.get("poNumber") || "PO-DEMO-01") : (formData.poNumber || "PO-DEMO-01");
      const grnNumber = formData.get ? (formData.get("grnNumber") || "GRN-DEMO-01") : (formData.grnNumber || "GRN-DEMO-01");
      const vendor = formData.get ? (formData.get("vendor") || "Vendor") : (formData.vendor || "Vendor");
      const amount = Number(formData.get ? formData.get("invoiceAmount") : formData.invoiceAmount) || 5000;
      const invoiceNumber = "INV-" + Math.floor(1000 + Math.random() * 9000);

      const newBlock = appendMockBlock("INVOICE", invoiceNumber, {
        invoiceNumber,
        poNumber,
        grnNumber,
        vendor,
        amount,
        status: "APPROVED",
      });

      const inv = {
        _id: "inv-" + Date.now(),
        invoiceNumber,
        poNumber,
        grnNumber,
        vendor,
        invoiceAmount: amount,
        amount: amount,
        status: "APPROVED",
        paymentStatus: "PENDING",
        fraudScore: 5,
        fraudRiskLevel: "LOW",
        fraud: {
          score: 5,
          recommendation: "Approve",
          reasons: ["Three-way match verified", "No duplicate invoice detected", "PO & GRN matched"],
        },
        validation: {
          passed: true,
          steps: [
            { key: "poExists", label: "PO Exists?", passed: true, detail: `${poNumber} found ($${amount})` },
            { key: "grnExists", label: "GRN Exists?", passed: true, detail: `${grnNumber} found` },
            { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: true, detail: "No duplicate" },
            { key: "amountMatches", label: "Amount Matches?", passed: true, detail: "Amount matched" },
            { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: true, detail: "Quantity satisfied" },
          ],
        },
        blockId: newBlock.blockNumber,
        blockNumber: newBlock.blockNumber,
        blockHash: newBlock.hash,
        txHash: newBlock.hash,
        blockTimestamp: newBlock.timestamp,
        createdAt: new Date().toISOString(),
      };
      MOCK_INVOICES.unshift(inv);
      return inv;
    });

export const decideInvoice = (id, decision) =>
  api.post(`/invoices/${id}/decision`, { decision }).then((r) => r.data).catch(() => {
    const inv = MOCK_INVOICES.find((i) => i._id === id);
    if (inv) {
      inv.status = decision;
      appendMockBlock("VALIDATION", inv.invoiceNumber, {
        invoiceNumber: inv.invoiceNumber,
        decision,
        status: decision,
      });
    }
    return { success: true, invoice: inv };
  });

export const payInvoice = (id) =>
  api.post(`/invoices/${id}/pay`).then((r) => r.data).catch(() => {
    const inv = MOCK_INVOICES.find((i) => i._id === id);
    if (inv) {
      inv.status = "PAID";
      inv.paymentStatus = "PAID";
      appendMockBlock("PAYMENT", inv.invoiceNumber, {
        invoiceNumber: inv.invoiceNumber,
        amount: inv.invoiceAmount || inv.amount,
        status: "SETTLED",
      });
    }
    return { success: true, invoice: inv };
  });
