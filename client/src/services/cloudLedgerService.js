// Global Real-Time Cross-Device Sync Service for Hashflow Blockchain Demo.
// Enables real-time synchronization of mined blocks, purchase orders, GRNs, invoices,
// active user sessions, and live logs across different physical devices (laptops, phones, tablets).

import { MOCK_BLOCKS, MOCK_POS, MOCK_GRNS, MOCK_INVOICES, MOCK_LOGS, emitMockLog } from "./mockData";

const CLOUD_LEDGER_URL = "https://api.restful-api.dev/objects/ff8081819f7e10ae019fd335b7b27bf8";

// Unique device session ID generated once per browser tab/device
export const DEVICE_SESSION_ID = "node-" + Math.random().toString(36).substring(2, 9);

let isSyncing = false;
let syncListeners = [];

export function subscribeCloudSync(listener) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifySync(data) {
  syncListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {}
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: data }));
  }
}

export async function fetchGlobalLedger() {
  try {
    const res = await fetch(CLOUD_LEDGER_URL, { cache: "no-cache" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    return null;
  }
}

export async function pushGlobalLedger(currentUser) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const currentData = (await fetchGlobalLedger()) || { blocks: [], pos: [], grns: [], invoices: [], sessions: {}, logs: [] };

    // Merge blocks (union by blockNumber or _id)
    const blockMap = new Map();
    [...(currentData.blocks || []), ...MOCK_BLOCKS].forEach((b) => {
      if (b && (b.blockNumber || b._id)) {
        blockMap.set(String(b.blockNumber || b._id), b);
      }
    });

    const mergedBlocks = Array.from(blockMap.values()).sort(
      (a, b) => (Number(b.blockNumber) || 0) - (Number(a.blockNumber) || 0)
    );

    // Merge POs
    const poMap = new Map();
    [...(currentData.pos || []), ...MOCK_POS].forEach((p) => {
      if (p && p.poNumber) poMap.set(p.poNumber, p);
    });
    const mergedPOs = Array.from(poMap.values());

    // Merge GRNs
    const grnMap = new Map();
    [...(currentData.grns || []), ...MOCK_GRNS].forEach((g) => {
      if (g && g.grnNumber) grnMap.set(g.grnNumber, g);
    });
    const mergedGRNs = Array.from(grnMap.values());

    // Merge Invoices
    const invMap = new Map();
    [...(currentData.invoices || []), ...MOCK_INVOICES].forEach((i) => {
      if (i && i.invoiceNumber) invMap.set(i.invoiceNumber, i);
    });
    const mergedInvoices = Array.from(invMap.values());

    // Merge sessions
    const activeSessions = currentData.sessions || {};
    if (currentUser) {
      activeSessions[DEVICE_SESSION_ID] = {
        sessionId: DEVICE_SESSION_ID,
        name: currentUser.name,
        role: currentUser.role,
        lastActive: new Date().toISOString(),
        nodeName: `node-${currentUser.role.toLowerCase().replace(/\s+/g, "-")}-${DEVICE_SESSION_ID.slice(-4)}`,
      };
    }

    // Clean old sessions (older than 10 mins)
    const now = Date.now();
    Object.keys(activeSessions).forEach((sId) => {
      const last = new Date(activeSessions[sId].lastActive).getTime();
      if (now - last > 600000) delete activeSessions[sId];
    });

    const payload = {
      name: "Hashflow Global Ledger",
      data: {
        blocks: mergedBlocks.slice(0, 100),
        pos: mergedPOs.slice(0, 50),
        grns: mergedGRNs.slice(0, 50),
        invoices: mergedInvoices.slice(0, 50),
        sessions: activeSessions,
        logs: MOCK_LOGS.slice(0, 50),
        lastUpdated: new Date().toISOString(),
      },
    };

    await fetch(CLOUD_LEDGER_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Cloud push error silent fallback
  } finally {
    isSyncing = false;
  }
}

export function startGlobalSyncLoop(getCurrentUser) {
  if (typeof window === "undefined") return;

  const pullAndMerge = async () => {
    const cloud = await fetchGlobalLedger();
    if (!cloud) return;

    let hasChanges = false;

    // Merge blocks into local MOCK_BLOCKS
    if (Array.isArray(cloud.blocks)) {
      const existingIds = new Set(MOCK_BLOCKS.map((b) => String(b.blockNumber || b._id)));
      cloud.blocks.forEach((b) => {
        if (!existingIds.has(String(b.blockNumber || b._id))) {
          MOCK_BLOCKS.push(b);
          hasChanges = true;
        }
      });
      MOCK_BLOCKS.sort((a, b) => (Number(b.blockNumber) || 0) - (Number(a.blockNumber) || 0));
    }

    // Merge POs
    if (Array.isArray(cloud.pos)) {
      const existingPOs = new Set(MOCK_POS.map((p) => p.poNumber));
      cloud.pos.forEach((p) => {
        if (!existingPOs.has(p.poNumber)) {
          MOCK_POS.unshift(p);
          hasChanges = true;
        }
      });
    }

    // Merge GRNs
    if (Array.isArray(cloud.grns)) {
      const existingGRNs = new Set(MOCK_GRNS.map((g) => g.grnNumber));
      cloud.grns.forEach((g) => {
        if (!existingGRNs.has(g.grnNumber)) {
          MOCK_GRNS.unshift(g);
          hasChanges = true;
        }
      });
    }

    // Merge Invoices
    if (Array.isArray(cloud.invoices)) {
      const existingInvoices = new Set(MOCK_INVOICES.map((i) => i.invoiceNumber));
      cloud.invoices.forEach((i) => {
        if (!existingInvoices.has(i.invoiceNumber)) {
          MOCK_INVOICES.unshift(i);
          hasChanges = true;
        }
      });
    }

    // Merge Logs
    if (Array.isArray(cloud.logs)) {
      const existingLogIds = new Set(MOCK_LOGS.map((l) => l.id));
      cloud.logs.forEach((l) => {
        if (!existingLogIds.has(l.id)) {
          MOCK_LOGS.push(l);
          emitMockLog(l.level, l.message, l.metadata);
          hasChanges = true;
        }
      });
    }

    // Push local heartbeat session
    const u = getCurrentUser ? getCurrentUser() : null;
    await pushGlobalLedger(u);

    notifySync({ cloud, hasChanges });
  };

  // Run initial pull immediately
  pullAndMerge();

  // Poll every 3.5 seconds
  const intervalId = setInterval(pullAndMerge, 3500);
  return () => clearInterval(intervalId);
}
