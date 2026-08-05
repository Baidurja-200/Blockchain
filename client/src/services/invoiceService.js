import api from "./api";
import { MOCK_INVOICES, MOCK_POS, MOCK_GRNS, appendMockBlock, saveMockState } from "./mockData";

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
      const amount = Number(formData.get ? formData.get("invoiceAmount") : formData.invoiceAmount) || 0;
      const invoiceNumber = "INV-" + Math.floor(1000 + Math.random() * 9000);

      // Perform real 3-way match validation against mock store
      const poObj = MOCK_POS.find((p) => p.poNumber === poNumber);
      const grnObj = MOCK_GRNS.find((g) => g.grnNumber === grnNumber);

      const poExists = Boolean(poObj);
      const grnLinkValid = Boolean(grnObj) && grnObj.poNumber === poNumber;
      const duplicateInvoice = MOCK_INVOICES.some((i) => i.poNumber === poNumber && (i.status === "PAID" || i.status === "APPROVED"));
      const amountMatches = poExists && poObj.totalAmount === amount;
      const quantitySufficient = poExists && grnLinkValid && Number(grnObj.receivedQuantity) >= Number(poObj.quantity);

      const steps = [
        { key: "poExists", label: "PO Exists?", passed: poExists, detail: poExists ? `${poNumber} found (₹${poObj.totalAmount})` : `PO ${poNumber} not found` },
        { key: "grnExists", label: "GRN Linked & Valid?", passed: grnLinkValid, detail: grnLinkValid ? `${grnNumber} linked to ${poNumber}` : (grnNumber ? `GRN ${grnNumber} is not linked to ${poNumber}` : "No GRN provided") },
        { key: "duplicateInvoice", label: "Duplicate Invoice?", passed: !duplicateInvoice, detail: duplicateInvoice ? `PO ${poNumber} has already been invoiced/paid` : "No duplicate detected" },
        { key: "amountMatches", label: "Amount Matches?", passed: amountMatches, detail: amountMatches ? `₹${amount} matches PO amount` : `₹${amount} does not match PO amount (₹${poObj?.totalAmount ?? 0})` },
        { key: "quantitySufficient", label: "Remaining Quantity Available?", passed: quantitySufficient, detail: quantitySufficient ? "Received quantity satisfies PO" : "Insufficient quantity received on GRN" },
      ];

      const approved = poExists && grnLinkValid && !duplicateInvoice && amountMatches && quantitySufficient;

      const reasons = [];
      if (!poExists) reasons.push(`Purchase order ${poNumber} does not exist.`);
      if (!grnLinkValid) reasons.push(grnNumber ? `GRN ${grnNumber} is not linked to PO ${poNumber}.` : `Invoice submitted without a valid Goods Receipt Note (GRN).`);
      if (duplicateInvoice) reasons.push(`Duplicate invoice submission detected for ${poNumber}.`);
      if (!amountMatches && poExists) reasons.push(`Invoice amount (₹${amount}) does not match PO total amount (₹${poObj.totalAmount}).`);
      if (!quantitySufficient && poExists && grnLinkValid) reasons.push(`Quantity received on GRN is less than quantity ordered on PO.`);
      if (approved) reasons.push("Complete three-way match verified", "GRN matches PO", "No duplicate invoice detected");

      const fraudScore = approved ? 5 : (duplicateInvoice ? 85 : (!grnLinkValid ? 75 : 60));
      const fraudRiskLevel = approved ? "LOW" : (fraudScore >= 60 ? "HIGH" : "MEDIUM");
      const status = approved ? "APPROVED" : "REJECTED";

      const newBlock = appendMockBlock("INVOICE", invoiceNumber, {
        invoiceNumber,
        poNumber,
        grnNumber,
        vendor,
        amount,
        status,
        approved,
      });

      const inv = {
        _id: "inv-" + Date.now(),
        invoiceNumber,
        poNumber,
        grnNumber,
        vendor,
        invoiceAmount: amount,
        amount,
        status,
        paymentStatus: approved ? "PENDING" : "REJECTED",
        rejectionReason: approved ? null : reasons[0],
        fraudScore,
        fraudRiskLevel,
        fraud: {
          score: fraudScore,
          recommendation: approved ? "Approve" : "Reject",
          reasons,
        },
        validation: {
          passed: approved,
          steps,
        },
        blockId: newBlock.blockNumber,
        blockNumber: newBlock.blockNumber,
        blockHash: newBlock.hash,
        txHash: newBlock.hash,
        blockTimestamp: newBlock.timestamp,
        createdAt: new Date().toISOString(),
      };

      MOCK_INVOICES.unshift(inv);
      saveMockState();
      import("./peerSyncService").then(({ broadcastInvoiceUpdatedP2P }) => broadcastInvoiceUpdatedP2P(inv)).catch(() => {});
      import("./firebaseService").then(({ syncInvoiceToFirebase }) => syncInvoiceToFirebase(inv)).catch(() => {});

      appendMockBlock("VALIDATION", invoiceNumber, {
        invoiceNumber,
        approved,
        fraudScore,
        status,
        reasons,
      });

      if (!approved) {
        const errorMsg = `Blockchain Validation Error: Transaction Restricted. Three-way match failed (${reasons.join(" ")}). Smart contract rejected invoice approval (Mined Block #${newBlock.blockNumber}).`;
        const err = new Error(errorMsg);
        err.response = {
          data: {
            message: errorMsg,
            blockNumber: newBlock.blockNumber,
            invoice: inv,
          },
        };
        throw err;
      }

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
      import("./peerSyncService").then(({ broadcastInvoiceUpdatedP2P }) => broadcastInvoiceUpdatedP2P(inv)).catch(() => {});
      import("./firebaseService").then(({ syncInvoiceToFirebase }) => syncInvoiceToFirebase(inv)).catch(() => {});
    }
    saveMockState();
    return { success: true, invoice: inv };
  });

export const payInvoice = (id) =>
  api.post(`/invoices/${id}/pay`).then((r) => r.data).catch(() => {
    const inv = MOCK_INVOICES.find((i) => i._id === id);
    if (inv) {
      if (inv.status === "REJECTED" || inv.fraudScore > 50) {
        const err = new Error(`Blockchain Validation Error: Payment Restricted. Rejected/high-risk invoice ${inv.invoiceNumber} cannot be settled on-chain.`);
        err.response = { data: { message: err.message } };
        throw err;
      }
      inv.status = "PAID";
      inv.paymentStatus = "PAID";
      appendMockBlock("PAYMENT", inv.invoiceNumber, {
        invoiceNumber: inv.invoiceNumber,
        amount: inv.invoiceAmount || inv.amount,
        status: "SETTLED",
      });
      import("./peerSyncService").then(({ broadcastInvoiceUpdatedP2P }) => broadcastInvoiceUpdatedP2P(inv)).catch(() => {});
      import("./firebaseService").then(({ syncInvoiceToFirebase }) => syncInvoiceToFirebase(inv)).catch(() => {});
    }
    saveMockState();
    return { success: true, invoice: inv };
  });
