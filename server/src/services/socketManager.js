import { Server as SocketIOServer } from "socket.io";
import monitorBus from "./monitorBus.js";

/**
 * Manages all WebSocket (Socket.IO) connections and user session tracking
 * for real-time cross-device data synchronisation.
 */

let io = null;

// sessionKey (e.g. "Rahul (Vendor)") -> { sessionId, name, role, nodeName, lastActive, socketId }
const activeSessions = new Map();

/**
 * Clean up stale user sessions older than 15 minutes.
 */
function cleanupStaleSessions() {
  const now = Date.now();
  let changed = false;
  for (const [key, session] of activeSessions.entries()) {
    if (session.lastActive) {
      const last = new Date(session.lastActive).getTime();
      if (now - last > 900000) { // 15 mins
        activeSessions.delete(key);
        changed = true;
      }
    }
  }
  if (changed) {
    broadcastSessions();
  }
}

/**
 * Register or refresh a user session on the server.
 * Can be called from WebSockets or HTTP REST API controllers.
 */
export function registerUserSession(user, socketId = null) {
  if (!user || !user.name) return;

  cleanupStaleSessions();

  const name = user.name.trim();
  const role = user.role || "Visitor";
  const sessionKey = `${name}-${role}`.toLowerCase();

  const existing = activeSessions.get(sessionKey);
  const nodeSuffix = socketId ? socketId.slice(-4) : (existing?.nodeName?.slice(-4) || Math.random().toString(36).slice(2, 6));

  const sessionInfo = {
    sessionId: sessionKey,
    name,
    role,
    nodeName: `node-${role.toLowerCase().replace(/\s+/g, "-")}-${nodeSuffix}`,
    lastActive: new Date().toISOString(),
    socketId: socketId || existing?.socketId || null,
  };

  activeSessions.set(sessionKey, sessionInfo);
  console.log(`[WS] Active Session Registered: ${name} (${role}) — ${sessionInfo.nodeName}`);

  broadcastSessions();
  return sessionInfo;
}

/**
 * Initialise Socket.IO on the HTTP server.
 */
export function initSocketIO(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Client registers user right after connecting or logging in
    socket.on("register", (payload) => {
      if (payload && payload.name) {
        const sessionInfo = registerUserSession(payload, socket.id);
        monitorBus.success(`[P2P] Device joined: ${sessionInfo.name} (${sessionInfo.role}) — ${sessionInfo.nodeName}`);
      }
    });

    socket.on("ping:user", (payload) => {
      if (payload && payload.name) {
        registerUserSession(payload, socket.id);
      }
    });

    socket.on("logout", (payload) => {
      if (payload && payload.name) {
        const key = `${payload.name}-${payload.role || "Visitor"}`.toLowerCase();
        if (activeSessions.has(key)) {
          const s = activeSessions.get(key);
          activeSessions.delete(key);
          monitorBus.info(`[P2P] Device departed: ${s.name} (${s.role})`);
          broadcastSessions();
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
      let removed = false;
      for (const [key, session] of activeSessions.entries()) {
        if (session.socketId === socket.id) {
          activeSessions.delete(key);
          monitorBus.info(`[P2P] Device departed: ${session.name} (${session.role})`);
          removed = true;
        }
      }
      if (removed) {
        broadcastSessions();
      }
    });
  });

  // Forward every monitorBus log to all connected WebSocket clients
  monitorBus.on("log", (entry) => {
    if (io) {
      io.emit("monitor:log", entry);
    }
  });

  // Run session cleanup every 2 minutes
  setInterval(cleanupStaleSessions, 120000);

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
  cleanupStaleSessions();
  const sessions = {};
  for (const [id, info] of activeSessions) {
    sessions[id] = info;
  }
  return sessions;
}

/**
 * Broadcast a data change event to all connected clients.
 */
export function broadcastDataChange(eventType, data) {
  if (!io) return;
  io.emit(`data:${eventType}`, data);
  io.emit("data:changed", { type: eventType, data });
  // Also send current sessions so peer list refreshes on every data change
  broadcastSessions();
}

export default {
  initSocketIO,
  getIO,
  registerUserSession,
  getActiveSessions,
  broadcastSessions,
  broadcastDataChange,
};
