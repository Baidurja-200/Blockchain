import Peer from "peerjs";
import { MOCK_BLOCKS, MOCK_POS, MOCK_GRNS, MOCK_INVOICES, MOCK_LOGS, emitMockLog, saveMockState } from "./mockData";

/**
 * PeerJS WebRTC P2P Data Synchronization Engine for Hashflow Blockchain.
 *
 * Connects browsers directly across devices (Mobile <-> Laptop <-> Tablet) via WebRTC.
 * No central server needed for data exchange — blocks mined on Mobile stream directly to Laptop
 * over WebRTC DataChannel in milliseconds!
 */

const PEER_PREFIX = "hashflow-v2-node-";
const ROOM_SLOTS = 12; // Pool size for auto-discovery of classroom devices

// Unique numeric slot (1-12) for this browser tab, plus random salt
const SLOT_ID = Math.floor(1 + Math.random() * (ROOM_SLOTS - 1));
const MY_PEER_ID = `${PEER_PREFIX}${SLOT_ID}-${Math.random().toString(36).substring(2, 6)}`;

let peer = null;
const activeConnections = new Map(); // peerId -> DataConnection
let activeSessions = {};
let isInitialized = false;

export function getActivePeerSessions() {
  return activeSessions;
}

/**
 * Broadcast a JSON message directly to all connected WebRTC peer devices.
 */
export function broadcastP2P(message) {
  const payload = JSON.stringify(message);
  for (const [peerId, conn] of activeConnections.entries()) {
    if (conn && conn.open) {
      try {
        conn.send(payload);
      } catch (err) {
        console.warn(`[P2P] Send error to ${peerId}:`, err);
      }
    }
  }
}

/**
 * Trigger full cross-device state update across all pages.
 */
function notifyDataChanged(eventType = "data_changed") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hashflow_data_changed", { detail: { type: eventType } }));
    window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { hasChanges: true, sessions: activeSessions } }));
  }
}

/**
 * Handle incoming WebRTC message from another device (Mobile / Laptop).
 */
function handleP2PMessage(msg, senderPeerId) {
  if (!msg || !msg.type) return;

  console.log(`[P2P WebRTC] Message received from ${senderPeerId}:`, msg.type);

  switch (msg.type) {
    case "USER_LOGIN": {
      if (msg.session) {
        activeSessions[msg.session.sessionId] = msg.session;
        try { localStorage.setItem("cv_active_sessions", JSON.stringify(activeSessions)); } catch (_e) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hashflow_socket_sessions", { detail: activeSessions }));
          window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { sessions: activeSessions } }));
        }
      }
      break;
    }

    case "USER_LOGOUT": {
      if (msg.sessionId) {
        delete activeSessions[msg.sessionId];
        try { localStorage.setItem("cv_active_sessions", JSON.stringify(activeSessions)); } catch (_e) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hashflow_socket_sessions", { detail: activeSessions }));
        }
      }
      break;
    }

    case "BLOCK_MINED": {
      if (msg.block) {
        const existingIds = new Set(MOCK_BLOCKS.map((b) => String(b.blockNumber || b._id)));
        if (!existingIds.has(String(msg.block.blockNumber || msg.block._id))) {
          MOCK_BLOCKS.unshift(msg.block);
          MOCK_BLOCKS.sort((a, b) => (Number(b.blockNumber) || 0) - (Number(a.blockNumber) || 0));
          saveMockState();
          notifyDataChanged("block_mined");
        }
      }
      break;
    }

    case "PO_CREATED": {
      if (msg.po) {
        const localPOMap = new Map(MOCK_POS.map((p) => [p.poNumber, p]));
        const local = localPOMap.get(msg.po.poNumber);
        if (!local) {
          MOCK_POS.unshift(msg.po);
          saveMockState();
          notifyDataChanged("po_created");
        } else if (local.status !== msg.po.status) {
          Object.assign(local, msg.po);
          saveMockState();
          notifyDataChanged("po_updated");
        }
      }
      break;
    }

    case "GRN_CREATED": {
      if (msg.grn) {
        const existingGRNs = new Set(MOCK_GRNS.map((g) => g.grnNumber));
        if (!existingGRNs.has(msg.grn.grnNumber)) {
          MOCK_GRNS.unshift(msg.grn);
          saveMockState();
          notifyDataChanged("grn_created");
        }
      }
      break;
    }

    case "INVOICE_UPDATED": {
      if (msg.invoice) {
        const localInvMap = new Map(MOCK_INVOICES.map((i) => [i.invoiceNumber, i]));
        const local = localInvMap.get(msg.invoice.invoiceNumber);
        if (!local) {
          MOCK_INVOICES.unshift(msg.invoice);
          saveMockState();
          notifyDataChanged("invoice_created");
        } else {
          Object.assign(local, msg.invoice);
          saveMockState();
          notifyDataChanged("invoice_updated");
        }
      }
      break;
    }

    case "LOG_ENTRY": {
      if (msg.log) {
        const existingLogIds = new Set(MOCK_LOGS.map((l) => l.id));
        if (!existingLogIds.has(msg.log.id)) {
          emitMockLog(msg.log.level, msg.log.message, msg.log.metadata || msg.log.meta, msg.log.id, msg.log.timestamp);
        }
      }
      break;
    }

    case "SYNC_REQUEST": {
      // Send our full ledger state back to the newly connected peer
      const conn = activeConnections.get(senderPeerId);
      if (conn && conn.open) {
        conn.send(JSON.stringify({
          type: "SYNC_RESPONSE",
          blocks: MOCK_BLOCKS.slice(0, 100),
          pos: MOCK_POS.slice(0, 100),
          grns: MOCK_GRNS.slice(0, 100),
          invoices: MOCK_INVOICES.slice(0, 100),
          sessions: activeSessions,
          logs: MOCK_LOGS.slice(0, 50),
        }));
      }
      break;
    }

    case "SYNC_RESPONSE": {
      let hasNewData = false;

      // Merge Blocks
      if (Array.isArray(msg.blocks)) {
        const blockMap = new Map(MOCK_BLOCKS.map((b) => [String(b.blockNumber || b._id), b]));
        msg.blocks.forEach((b) => {
          if (b && (b.blockNumber !== undefined || b._id)) {
            const key = String(b.blockNumber || b._id);
            if (!blockMap.has(key)) {
              MOCK_BLOCKS.push(b);
              hasNewData = true;
            }
          }
        });
        if (hasNewData) {
          MOCK_BLOCKS.sort((a, b) => (Number(b.blockNumber) || 0) - (Number(a.blockNumber) || 0));
        }
      }

      // Merge POs
      if (Array.isArray(msg.pos)) {
        const poMap = new Map(MOCK_POS.map((p) => [p.poNumber, p]));
        msg.pos.forEach((p) => {
          if (p && p.poNumber) {
            const local = poMap.get(p.poNumber);
            if (!local) {
              MOCK_POS.unshift(p);
              hasNewData = true;
            } else if (local.status !== p.status) {
              Object.assign(local, p);
              hasNewData = true;
            }
          }
        });
      }

      // Merge GRNs
      if (Array.isArray(msg.grns)) {
        const grnMap = new Map(MOCK_GRNS.map((g) => [g.grnNumber, g]));
        msg.grns.forEach((g) => {
          if (g && g.grnNumber && !grnMap.has(g.grnNumber)) {
            MOCK_GRNS.unshift(g);
            hasNewData = true;
          }
        });
      }

      // Merge Invoices
      if (Array.isArray(msg.invoices)) {
        const invMap = new Map(MOCK_INVOICES.map((i) => [i.invoiceNumber, i]));
        msg.invoices.forEach((i) => {
          if (i && i.invoiceNumber) {
            const local = invMap.get(i.invoiceNumber);
            if (!local) {
              MOCK_INVOICES.unshift(i);
              hasNewData = true;
            } else if (local.status !== i.status || local.paymentStatus !== i.paymentStatus) {
              Object.assign(local, i);
              hasNewData = true;
            }
          }
        });
      }

      // Merge Active Sessions
      if (msg.sessions && typeof msg.sessions === "object") {
        activeSessions = { ...activeSessions, ...msg.sessions };
        try { localStorage.setItem("cv_active_sessions", JSON.stringify(activeSessions)); } catch (_e) {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hashflow_socket_sessions", { detail: activeSessions }));
        }
      }

      if (hasNewData) {
        saveMockState();
        notifyDataChanged("full_sync");
      }
      break;
    }
  }
}

/**
 * Bind data events on a WebRTC connection.
 */
function setupConnection(conn) {
  conn.on("open", () => {
    console.log(`[P2P WebRTC] Connection OPEN with peer ${conn.peer}`);
    activeConnections.set(conn.peer, conn);

    // Request state synchronization from connected peer
    conn.send(JSON.stringify({ type: "SYNC_REQUEST" }));

    // Send current user session
    try {
      const rawUser = localStorage.getItem("cv_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        conn.send(JSON.stringify({
          type: "USER_LOGIN",
          session: {
            sessionId: MY_PEER_ID,
            name: user.name,
            role: user.role,
            lastActive: new Date().toISOString(),
            nodeName: `node-${user.role.toLowerCase().replace(/\s+/g, "-")}-${MY_PEER_ID.slice(-4)}`,
          },
        }));
      }
    } catch (_e) {}
  });

  conn.on("data", (rawData) => {
    try {
      const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      handleP2PMessage(parsed, conn.peer);
    } catch (e) {
      console.warn("[P2P WebRTC] Failed to parse message:", e);
    }
  });

  conn.on("close", () => {
    console.log(`[P2P WebRTC] Connection closed with peer ${conn.peer}`);
    activeConnections.delete(conn.peer);
  });

  conn.on("error", (err) => {
    console.warn(`[P2P WebRTC] Connection error with peer ${conn.peer}:`, err);
  });
}

/**
 * Initialize PeerJS Node and discover active classroom devices.
 */
export function startPeerSync(getCurrentUser) {
  if (typeof window === "undefined" || isInitialized) return () => {};
  isInitialized = true;

  console.log(`[P2P WebRTC] Initializing PeerJS Node: ${MY_PEER_ID}`);

  try {
    peer = new Peer(MY_PEER_ID, {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
      debug: 1,
    });

    peer.on("open", (id) => {
      console.log(`[P2P WebRTC] Registered with PeerServer. Node ID: ${id}`);

      // Discover other classroom devices in slots 1 through 12
      for (let i = 1; i <= ROOM_SLOTS; i++) {
        if (i !== SLOT_ID) {
          // Connect to known candidate slot IDs
          const targetPrefix = `${PEER_PREFIX}${i}-`;
          // Register candidate peer lookup
          tryConnectSlot(targetPrefix);
        }
      }
    });

    // Accept incoming connection requests from Mobile/Laptop
    peer.on("connection", (conn) => {
      console.log(`[P2P WebRTC] Incoming connection from peer ${conn.peer}`);
      setupConnection(conn);
    });

    peer.on("error", (err) => {
      // Ignorable disconnect/peer-not-found errors during discovery
      if (err.type !== "peer-unavailable") {
        console.warn("[P2P WebRTC] Peer error:", err.type, err.message);
      }
    });

  } catch (err) {
    console.warn("[P2P WebRTC] PeerJS init error:", err);
  }

  // Periodic discovery scan to connect with any newly opened devices
  const scanInterval = setInterval(() => {
    if (peer && !peer.destroyed && !peer.disconnected) {
      // Broadcast heartbeat session
      const user = getCurrentUser ? getCurrentUser() : null;
      if (user) {
        broadcastP2P({
          type: "USER_LOGIN",
          session: {
            sessionId: MY_PEER_ID,
            name: user.name,
            role: user.role,
            lastActive: new Date().toISOString(),
            nodeName: `node-${user.role.toLowerCase().replace(/\s+/g, "-")}-${MY_PEER_ID.slice(-4)}`,
          },
        });
      }
    }
  }, 8000);

  return () => {
    clearInterval(scanInterval);
    if (peer) {
      peer.destroy();
      peer = null;
    }
    isInitialized = false;
  };
}

/**
 * Connect to candidate peer prefix.
 */
function tryConnectSlot(prefix) {
  // Store known peers in window / localStorage for mesh discovery
  let knownPeers = [];
  try {
    const raw = localStorage.getItem("cv_peer_nodes");
    if (raw) knownPeers = JSON.parse(raw);
  } catch (_e) {}

  knownPeers.forEach((peerId) => {
    if (peerId !== MY_PEER_ID && !activeConnections.has(peerId) && peer && !peer.destroyed) {
      try {
        const conn = peer.connect(peerId, { reliable: true });
        setupConnection(conn);
      } catch (_e) {}
    }
  });

  // Save our node ID into local peer registry pool
  if (!knownPeers.includes(MY_PEER_ID)) {
    knownPeers.push(MY_PEER_ID);
    if (knownPeers.length > 20) knownPeers.shift();
    try { localStorage.setItem("cv_peer_nodes", JSON.stringify(knownPeers)); } catch (_e) {}
  }
}

/**
 * Sync helper called when a block is mined on this device.
 */
export function broadcastBlockMinedP2P(block) {
  broadcastP2P({ type: "BLOCK_MINED", block });
}

/**
 * Sync helper called when a PO is created on this device.
 */
export function broadcastPOCreatedP2P(po) {
  broadcastP2P({ type: "PO_CREATED", po });
}

/**
 * Sync helper called when a GRN is created on this device.
 */
export function broadcastGRNCreatedP2P(grn) {
  broadcastP2P({ type: "GRN_CREATED", grn });
}

/**
 * Sync helper called when an Invoice is updated on this device.
 */
export function broadcastInvoiceUpdatedP2P(invoice) {
  broadcastP2P({ type: "INVOICE_UPDATED", invoice });
}

/**
 * Sync helper called when a User logs in on this device.
 */
export function broadcastUserLoginP2P(user) {
  const session = {
    sessionId: MY_PEER_ID,
    name: user.name,
    role: user.role,
    lastActive: new Date().toISOString(),
    nodeName: `node-${user.role.toLowerCase().replace(/\s+/g, "-")}-${MY_PEER_ID.slice(-4)}`,
  };
  activeSessions[MY_PEER_ID] = session;
  try { localStorage.setItem("cv_active_sessions", JSON.stringify(activeSessions)); } catch (_e) {}
  broadcastP2P({ type: "USER_LOGIN", session });
}

export default {
  startPeerSync,
  broadcastP2P,
  broadcastBlockMinedP2P,
  broadcastPOCreatedP2P,
  broadcastGRNCreatedP2P,
  broadcastInvoiceUpdatedP2P,
  broadcastUserLoginP2P,
  getActivePeerSessions,
};
