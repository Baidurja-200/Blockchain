// Global Real-Time Cross-Device Sync Service for Hashflow Blockchain Demo.
// Enables real-time synchronization of mined blocks, purchase orders, GRNs, invoices,
// active user sessions, and live logs across different physical devices (laptops, phones, tablets).

import { MOCK_BLOCKS, MOCK_POS, MOCK_GRNS, MOCK_INVOICES, MOCK_LOGS, emitMockLog, saveMockState } from "./mockData";

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

let lastPushTime = 0;

export async function pushGlobalLedger(currentUser, force = false) {
  const now = Date.now();
  // Throttle regular heartbeats to max once per 12s unless forced by block creation
  if (!force && now - lastPushTime < 12000) return;
  if (isSyncing) return;
  isSyncing = true;
  lastPushTime = now;

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

    // Merge active user sessions
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

    // Clean stale sessions (older than 10 mins)
    const curTime = Date.now();
    Object.keys(activeSessions).forEach((sId) => {
      const last = new Date(activeSessions[sId].lastActive).getTime();
      if (curTime - last > 600000) delete activeSessions[sId];
    });

    // Merge Logs from all active devices
    const logMap = new Map();
    [...(currentData.logs || []), ...MOCK_LOGS].forEach((l) => {
      if (l && l.id) logMap.set(l.id, l);
    });
    const mergedLogs = Array.from(logMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);

    const payload = {
      name: "Hashflow Global Ledger",
      data: {
        blocks: mergedBlocks.slice(0, 150),
        pos: mergedPOs.slice(0, 100),
        grns: mergedGRNs.slice(0, 100),
        invoices: mergedInvoices.slice(0, 100),
        sessions: activeSessions,
        logs: mergedLogs,
        lastUpdated: new Date().toISOString(),
      },
    };

    await fetch(CLOUD_LEDGER_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Silent failover for high concurrency network spikes
  } finally {
    isSyncing = false;
  }
}

export function startGlobalSyncLoop(getCurrentUser) {
  if (typeof window === "undefined") return;

  let active = true;

  const pullAndMerge = async () => {
    if (!active) return;
    try {
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

      // Merge Logs from all classmate devices
      if (Array.isArray(cloud.logs)) {
        const existingLogIds = new Set(MOCK_LOGS.map((l) => l.id));
        cloud.logs.forEach((l) => {
          if (!existingLogIds.has(l.id)) {
            MOCK_LOGS.push(l);
            emitMockLog(l.level, l.message, l.metadata, l.id, l.timestamp);
            hasChanges = true;
          }
        });
      }

      if (hasChanges) {
        saveMockState();
      }

      // Push local heartbeat session
      const u = getCurrentUser ? getCurrentUser() : null;
      await pushGlobalLedger(u);

      notifySync({ cloud, hasChanges });
    } catch (e) {
      // High concurrency shield
    }
  };

  // Run initial pull
  pullAndMerge();

  // Jittered recursive timeout between 3000ms and 5000ms for 45+ concurrent devices
  let timerId = null;
  const scheduleNext = () => {
    const jitter = Math.floor(3000 + Math.random() * 2500);
    timerId = setTimeout(async () => {
      await pullAndMerge();
      if (active) scheduleNext();
    }, jitter);
  };

  scheduleNext();

  return () => {
    active = false;
    if (timerId) clearTimeout(timerId);
  };
}
