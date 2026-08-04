import api from "./api";
import { MOCK_SYSTEM_STATUS } from "./mockData";

export const fetchSystemStatus = () =>
  api
    .get("/settings/status")
    .then((r) => r.data)
    .catch(() => MOCK_SYSTEM_STATUS);

export const fetchRoleMatrix = () =>
  api
    .get("/settings/roles")
    .then((r) => r.data)
    .catch(() => ({
      roles: ["Procurement Officer", "Warehouse Officer", "Finance Officer", "Vendor", "Auditor"],
      permissions: {
        "Procurement Officer": ["Create PO", "Amend PO", "View GRN", "View Invoices"],
        "Warehouse Officer": ["View PO", "Create GRN", "View Invoices"],
        "Finance Officer": ["View PO", "View GRN", "Approve Invoice", "Process Payment"],
        Vendor: ["View PO", "Submit Invoice", "View Payment Status"],
        Auditor: ["Read-only access to POs, GRNs, Invoices, Fraud logs, Blockchain"],
      },
    }));

export const resetDemoData = () =>
  api
    .post("/settings/reset")
    .then((r) => r.data)
    .catch(() => ({ success: true, message: "Demo data reset successfully" }));
