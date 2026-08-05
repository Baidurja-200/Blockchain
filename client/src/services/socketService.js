import { io } from "socket.io-client";
import { emitMockLog } from "./mockData";

/**
 * Socket.IO Client Singleton for real-time cross-device data synchronisation.
 *
 * Connects to the Express backend server (via WebSocket / HTTP long-polling).
 * Dispatches custom window events so React components can update automatically.
 */

let socket = null;
let currentUser = null;

export function initSocket() {
  if (socket) return socket;

  // Determine backend URL:
  // If hosted on GitHub Pages or external domain, connect to window.location.origin or relative path if proxied
  const socketUrl = window.location.port === "5173"
    ? "http://localhost:5000"
    : window.location.origin;

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[WS Client] Connected to server:", socket.id);
    if (currentUser) {
      registerUser(currentUser);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS Client] Disconnected:", reason);
  });

  // 1. Live sessions update (for Backend Monitor)
  socket.on("sessions:update", (sessions) => {
    window.dispatchEvent(new CustomEvent("hashflow_socket_sessions", { detail: sessions }));
    window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { sessions } }));
  });

  // 2. Real-time log from backend (for Backend Monitor)
  socket.on("monitor:log", (entry) => {
    if (entry && entry.message) {
      emitMockLog(entry.level, entry.message, entry.meta || entry.metadata, entry.id, entry.timestamp);
    }
  });

  // 3. Real-time data changes (POs, GRNs, Invoices, Blocks)
  socket.on("data:changed", (event) => {
    console.log("[WS Client] Data changed event received:", event);
    window.dispatchEvent(new CustomEvent("hashflow_data_changed", { detail: event }));
    window.dispatchEvent(new CustomEvent("hashflow_cloud_sync", { detail: { hasChanges: true, data: event } }));
  });

  return socket;
}

export function registerUser(user) {
  currentUser = user;
  if (!socket) initSocket();
  if (socket && socket.connected && user) {
    socket.emit("register", { name: user.name, role: user.role });
  }
}

export function unregisterUser() {
  currentUser = null;
  if (socket && socket.connected) {
    socket.emit("logout");
  }
}

export function getSocket() {
  if (!socket) initSocket();
  return socket;
}

export default {
  initSocket,
  registerUser,
  unregisterUser,
  getSocket,
};
