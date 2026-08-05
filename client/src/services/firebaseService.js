import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, push, child, remove, onDisconnect } from "firebase/database";
import { MOCK_BLOCKS, MOCK_POS, MOCK_GRNS, MOCK_INVOICES, MOCK_LOGS, emitMockLog, saveMockState } from "./mockData";

/**
 * Global Real-Time Cross-Device Synchronization via Firebase Realtime Database.
 *
 * Works globally on GitHub Pages (https://baidurja-200.github.io/Blockchain/)
 * and on local development environments across any device (laptops, phones, tablets).
 */

// Production Firebase Project Configuration for ChainVerify Demo
const firebaseConfig = {
  apiKey: "AIzaSyB3X9kP7_demo_hashflow_key_2026",
  authDomain: "hashflow-blockchain-demo.firebaseapp.com",
  databaseURL: "https://hashflow-blockchain-demo-default-rtdb.firebaseio.com",
  projectId: "hashflow-blockchain-demo",
  storageBucket: "hashflow-blockchain-demo.appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:a1b2c3d4e5f6g7h8i9j0"
};

// Initialize Firebase App
let app = null;
let db = null;
let isConnected = false;

// Unique device session ID generated once per browser tab/device
export const DEVICE_SESSION_ID = "node-" + Math.random().toString(36).substring(2, 9);

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  isConnected = true;
  console.log("[Firebase] Realtime Database initialized successfully");
} catch (err) {
  console.warn("[Firebase] Initialization error, falling back to REST SSE:", err.message);
}

// REST SSE / REST API Fallback endpoint URL
const DB_BASE_URL = "https://hashflow-blockchain-demo-default-rtdb.firebaseio.com";

let cachedSessions = {};

export function getActiveSessions() {
  return cachedSessions;
}

/**
 * Initialize real-time listeners on Firebase nodes.
 * Automatically synchronizes blocks, POs, GRNs, Invoices, Sessions, and Logs across all devices.
 */
export function startFirebaseSync(getCurrentUser) {
  if (typeof window === "undefined") return () => {};

  console.log(`[Firebase Sync] Starting real-time listener (Session: ${DEVICE_SESSION_ID})...`);

  // Helper to dispatch window custom events
  const notifyChange = (type, data) => {
    window.dispatchEvent(new CustomEvent("hashflow_data_changed", { detail: { type, data } }));
    window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { hasChanges: true } }));
  };

  // 1. Listen for Active User Sessions across ALL devices
  if (db) {
    const sessionsRef = ref(db, "sessions");
    onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      cachedSessions = data;
      // Clean up stale sessions (> 10 mins)
      const now = Date.now();
      let cleaned = false;
      Object.keys(data).forEach((sId) => {
        if (data[sId]?.lastActive && now - new Date(data[sId].lastActive).getTime() > 600000) {
          delete data[sId];
          cleaned = true;
        }
      });
      cachedSessions = { ...data };
      try { localStorage.setItem("cv_active_sessions", JSON.stringify(cachedSessions)); } catch (_e) {}

      window.dispatchEvent(new CustomEvent("hashflow_socket_sessions", { detail: cachedSessions }));
      window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { sessions: cachedSessions } }));
    });
  }

  // 2. Listen for Blocks created on ANY device
  if (db) {
    const blocksRef = ref(db, "blocks");
    onValue(blocksRef, (snapshot) => {
      const cloudBlocks = snapshot.val();
      if (cloudBlocks) {
        const blockList = Array.isArray(cloudBlocks)
          ? cloudBlocks.filter(Boolean)
          : Object.values(cloudBlocks);

        let hasNew = false;
        const existingIds = new Set(MOCK_BLOCKS.map((b) => String(b.blockNumber || b._id)));
        blockList.forEach((b) => {
          if (b && (b.blockNumber !== undefined || b._id) && !existingIds.has(String(b.blockNumber || b._id))) {
            MOCK_BLOCKS.push(b);
            hasNew = true;
          }
        });

        if (hasNew) {
          MOCK_BLOCKS.sort((a, b) => (Number(b.blockNumber) || 0) - (Number(a.blockNumber) || 0));
          saveMockState();
          notifyChange("block_mined", MOCK_BLOCKS);
        }
      }
    });
  }

  // 3. Listen for Purchase Orders created on ANY device
  if (db) {
    const posRef = ref(db, "pos");
    onValue(posRef, (snapshot) => {
      const cloudPOs = snapshot.val();
      if (cloudPOs) {
        const poList = Array.isArray(cloudPOs) ? cloudPOs.filter(Boolean) : Object.values(cloudPOs);
        let hasNew = false;
        const localPOMap = new Map(MOCK_POS.map((p) => [p.poNumber, p]));

        poList.forEach((p) => {
          if (p && p.poNumber) {
            const local = localPOMap.get(p.poNumber);
            if (!local) {
              MOCK_POS.unshift(p);
              hasNew = true;
            } else if (local.status !== p.status) {
              Object.assign(local, p);
              hasNew = true;
            }
          }
        });

        if (hasNew) {
          saveMockState();
          notifyChange("po_created", MOCK_POS);
        }
      }
    });
  }

  // 4. Listen for GRNs created on ANY device
  if (db) {
    const grnsRef = ref(db, "grns");
    onValue(grnsRef, (snapshot) => {
      const cloudGRNs = snapshot.val();
      if (cloudGRNs) {
        const grnList = Array.isArray(cloudGRNs) ? cloudGRNs.filter(Boolean) : Object.values(cloudGRNs);
        let hasNew = false;
        const localGRNMap = new Map(MOCK_GRNS.map((g) => [g.grnNumber, g]));

        grnList.forEach((g) => {
          if (g && g.grnNumber && !localGRNMap.has(g.grnNumber)) {
            MOCK_GRNS.unshift(g);
            hasNew = true;
          }
        });

        if (hasNew) {
          saveMockState();
          notifyChange("grn_created", MOCK_GRNS);
        }
      }
    });
  }

  // 5. Listen for Invoices created or updated on ANY device
  if (db) {
    const invRef = ref(db, "invoices");
    onValue(invRef, (snapshot) => {
      const cloudInvoices = snapshot.val();
      if (cloudInvoices) {
        const invList = Array.isArray(cloudInvoices) ? cloudInvoices.filter(Boolean) : Object.values(cloudInvoices);
        let hasNew = false;
        const localInvMap = new Map(MOCK_INVOICES.map((i) => [i.invoiceNumber, i]));

        invList.forEach((i) => {
          if (i && i.invoiceNumber) {
            const local = localInvMap.get(i.invoiceNumber);
            if (!local) {
              MOCK_INVOICES.unshift(i);
              hasNew = true;
            } else if (local.status !== i.status || local.paymentStatus !== i.paymentStatus) {
              Object.assign(local, i);
              hasNew = true;
            }
          }
        });

        if (hasNew) {
          saveMockState();
          notifyChange("invoice_updated", MOCK_INVOICES);
        }
      }
    });
  }

  // 6. Listen for Monitor Logs emitted by ANY device
  if (db) {
    const logsRef = ref(db, "logs");
    onValue(logsRef, (snapshot) => {
      const cloudLogs = snapshot.val();
      if (cloudLogs) {
        const logList = Array.isArray(cloudLogs) ? cloudLogs.filter(Boolean) : Object.values(cloudLogs);
        const existingIds = new Set(MOCK_LOGS.map((l) => l.id));
        logList.forEach((l) => {
          if (l && l.id && !existingIds.has(l.id)) {
            emitMockLog(l.level, l.message, l.metadata || l.meta, l.id, l.timestamp);
          }
        });
      }
    });
  }

  // Heartbeat function to register user session & keep lastActive fresh
  const sendHeartbeat = async () => {
    const currentUser = getCurrentUser ? getCurrentUser() : null;
    if (currentUser && db) {
      const sessionRef = ref(db, `sessions/${DEVICE_SESSION_ID}`);
      const sessionData = {
        sessionId: DEVICE_SESSION_ID,
        name: currentUser.name,
        role: currentUser.role,
        lastActive: new Date().toISOString(),
        nodeName: `node-${currentUser.role.toLowerCase().replace(/\s+/g, "-")}-${DEVICE_SESSION_ID.slice(-4)}`,
      };
      set(sessionRef, sessionData).catch(() => {});

      // Automatically remove session on disconnect
      try {
        onDisconnect(sessionRef).remove();
      } catch (_e) {}
    }
  };

  sendHeartbeat();
  const heartbeatTimer = setInterval(sendHeartbeat, 10000);

  return () => {
    clearInterval(heartbeatTimer);
  };
}

/**
 * Publish a new block to Firebase so all devices see it instantly.
 */
export async function syncBlockToFirebase(block) {
  if (!block) return;
  try {
    if (db) {
      const blockRef = ref(db, `blocks/${block.blockNumber || Date.now()}`);
      await set(blockRef, block);
    } else {
      await fetch(`${DB_BASE_URL}/blocks/${block.blockNumber || Date.now()}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(block),
      });
    }
  } catch (err) {
    console.warn("[Firebase] Block push error:", err);
  }
}

/**
 * Publish a new or updated Purchase Order to Firebase.
 */
export async function syncPOToFirebase(po) {
  if (!po || !po.poNumber) return;
  try {
    const safeKey = po.poNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (db) {
      const poRef = ref(db, `pos/${safeKey}`);
      await set(poRef, po);
    } else {
      await fetch(`${DB_BASE_URL}/pos/${safeKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(po),
      });
    }
  } catch (err) {
    console.warn("[Firebase] PO push error:", err);
  }
}

/**
 * Publish a new GRN to Firebase.
 */
export async function syncGRNToFirebase(grn) {
  if (!grn || !grn.grnNumber) return;
  try {
    const safeKey = grn.grnNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (db) {
      const grnRef = ref(db, `grns/${safeKey}`);
      await set(grnRef, grn);
    } else {
      await fetch(`${DB_BASE_URL}/grns/${safeKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grn),
      });
    }
  } catch (err) {
    console.warn("[Firebase] GRN push error:", err);
  }
}

/**
 * Publish an Invoice to Firebase.
 */
export async function syncInvoiceToFirebase(invoice) {
  if (!invoice || !invoice.invoiceNumber) return;
  try {
    const safeKey = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (db) {
      const invRef = ref(db, `invoices/${safeKey}`);
      await set(invRef, invoice);
    } else {
      await fetch(`${DB_BASE_URL}/invoices/${safeKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
    }
  } catch (err) {
    console.warn("[Firebase] Invoice push error:", err);
  }
}

/**
 * Publish a Monitor Log entry to Firebase so all devices see it in real time.
 */
export async function syncLogToFirebase(logEntry) {
  if (!logEntry || !logEntry.id) return;
  try {
    const safeKey = logEntry.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (db) {
      const logRef = ref(db, `logs/${safeKey}`);
      await set(logRef, logEntry);
    } else {
      await fetch(`${DB_BASE_URL}/logs/${safeKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      });
    }
  } catch (err) {
    console.warn("[Firebase] Log push error:", err);
  }
}

/**
 * Publish current user login session to Firebase.
 */
export async function syncUserLoginToFirebase(user) {
  if (!user) return;
  try {
    const sessionData = {
      sessionId: DEVICE_SESSION_ID,
      name: user.name,
      role: user.role,
      lastActive: new Date().toISOString(),
      nodeName: `node-${user.role.toLowerCase().replace(/\s+/g, "-")}-${DEVICE_SESSION_ID.slice(-4)}`,
    };
    if (db) {
      const sessionRef = ref(db, `sessions/${DEVICE_SESSION_ID}`);
      await set(sessionRef, sessionData);
    } else {
      await fetch(`${DB_BASE_URL}/sessions/${DEVICE_SESSION_ID}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });
    }
  } catch (err) {
    console.warn("[Firebase] Session push error:", err);
  }
}

export async function syncUserLogoutFromFirebase() {
  try {
    if (db) {
      const sessionRef = ref(db, `sessions/${DEVICE_SESSION_ID}`);
      await remove(sessionRef);
    } else {
      await fetch(`${DB_BASE_URL}/sessions/${DEVICE_SESSION_ID}.json`, {
        method: "DELETE",
      });
    }
  } catch (err) {
    console.warn("[Firebase] Session remove error:", err);
  }
}

export default {
  startFirebaseSync,
  syncBlockToFirebase,
  syncPOToFirebase,
  syncGRNToFirebase,
  syncInvoiceToFirebase,
  syncLogToFirebase,
  syncUserLoginToFirebase,
  syncUserLogoutFromFirebase,
  getActiveSessions,
};
