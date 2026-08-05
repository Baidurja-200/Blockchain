import { Server as SocketIOServer } from "socket.io";
import monitorBus from "./monitorBus.js";

/**
 * Manages all WebSocket (Socket.IO) connections for real-time cross-device
 * data synchronisation in the classroom demo.
 *
 * Every browser tab that connects gets tracked here. When any device creates
 * a PO, GRN, Invoice, or mines a block, we broadcast the event to ALL
 * connected clients so their UI updates instantly — no polling required.
 */

let io = null;

// sessionId → { socketId, name, role, nodeName, lastActive }
const activeSessions = new Map();

/**
 * Initialise Socket.IO on the given HTTP server.
 * Called once from server/src/index.js at startup.
 */
export function initSocketIO(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Classroom LANs can be flaky; be generous with timeouts
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Client sends this right after connecting (or after login)
    socket.on("register", (payload) => {
      const { name, role } = payload || {};
      const sessionInfo = {
        socketId: socket.id,
        name: name || "Anonymous",
        role: role || "Visitor",
        nodeName: `node-${(role || "visitor").toLowerCase().replace(/\s+/g, "-")}-${socket.id.slice(-4)}`,
        lastActive: new Date().toISOString(),
      };
      activeSessions.set(socket.id, sessionInfo);

      monitorBus.success(`[P2P] Device joined: ${sessionInfo.name} (${sessionInfo.role}) — ${sessionInfo.nodeName}`);

      // Notify all clients about the updated session list
      broadcastSessions();
    });

    socket.on("logout", () => {
      const session = activeSessions.get(socket.id);
      if (session) {
        monitorBus.info(`[P2P] Device departed: ${session.name} (${session.role})`);
      }
      activeSessions.delete(socket.id);
      broadcastSessions();
    });

    socket.on("disconnect", (reason) => {
      const session = activeSessions.get(socket.id);
      if (session) {
        monitorBus.info(`[P2P] Device disconnected: ${session.name} (${session.role}) — ${reason}`);
      }
      activeSessions.delete(socket.id);
      broadcastSessions();
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // Forward every monitorBus log to all connected WebSocket clients
  monitorBus.on("log", (entry) => {
    if (io) {
      io.emit("monitor:log", entry);
    }
  });

  console.log("[WS] Socket.IO initialised — real-time sync ready");
  return io;
}

/** Get the Socket.IO server instance. */
export function getIO() {
  return io;
}

/** Broadcast the current session list to all connected clients. */
export function broadcastSessions() {
  if (!io) return;
  const sessions = {};
  for (const [id, info] of activeSessions) {
    sessions[id] = info;
  }
  io.emit("sessions:update", sessions);
}

/** Get active sessions as a plain object (for REST endpoints). */
export function getActiveSessions() {
  const sessions = {};
  for (const [id, info] of activeSessions) {
    sessions[id] = info;
  }
  return sessions;
}

/**
 * Broadcast a data change event to all connected clients.
 * Pages listen for these events and auto-refresh their data.
 *
 * @param {'po_created'|'grn_created'|'invoice_created'|'invoice_updated'|'block_mined'} eventType
 * @param {object} data — the created/updated record
 */
export function broadcastDataChange(eventType, data) {
  if (!io) return;
  io.emit(`data:${eventType}`, data);
  // Also fire a generic event so pages can use a single listener
  io.emit("data:changed", { type: eventType, data });
}

export default {
  initSocketIO,
  getIO,
  getActiveSessions,
  broadcastSessions,
  broadcastDataChange,
};
