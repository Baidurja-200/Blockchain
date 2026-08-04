import api from "./api";
import { MOCK_INVOICES } from "./mockData";

export const listInvoices = () => api.get("/invoices").then((r) => r.data.invoices).catch(() => MOCK_INVOICES);
export const getInvoice = (id) => api.get(`/invoices/${id}`).then((r) => r.data.invoice).catch(() => MOCK_INVOICES.find(i => i._id === id) || MOCK_INVOICES[0]);

export const createInvoice = (formData) =>
  api
    .post("/invoices", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.invoice)
    .catch(() => {
      const inv = {
        _id: "inv-" + Date.now(),
        invoiceNumber: "INV-" + Math.floor(1000 + Math.random() * 9000),
        poNumber: formData.get ? formData.get("poNumber") : "PO-DEMO-01",
        grnNumber: formData.get ? formData.get("grnNumber") : "GRN-DEMO-01",
        vendor: "NovaTech Industrial Supplies",
        amount: 5000,
        status: "APPROVED",
        fraudScore: 5,
        fraudRiskLevel: "LOW",
        validation: {
          passed: true,
          steps: [
            { key: "poExists", label: "PO Exists?", passed: true, detail: "PO found ($5,000)" },
            { key: "grnExists", label: "GRN Exists?", passed: true, detail: "GRN found" },
            { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: true, detail: "No duplicate" },
            { key: "amountMatches", label: "Amount Matches?", passed: true, detail: "$5,000 = $5,000" },
            { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: true, detail: "Quantity satisfied" },
          ],
        },
        blockNumber: 17,
        blockHash: "0000" + Array(60).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join(""),
        createdAt: new Date().toISOString(),
      };
      MOCK_INVOICES.unshift(inv);
      return inv;
    });

export const decideInvoice = (id, decision) =>
  api.post(`/invoices/${id}/decision`, { decision }).then((r) => r.data).catch(() => {
    const inv = MOCK_INVOICES.find((i) => i._id === id);
    if (inv) inv.status = decision;
    return { success: true, invoice: inv };
  });

export const payInvoice = (id) =>
  api.post(`/invoices/${id}/pay`).then((r) => r.data).catch(() => {
    const inv = MOCK_INVOICES.find((i) => i._id === id);
    if (inv) inv.status = "PAID";
    return { success: true, invoice: inv };
  });
