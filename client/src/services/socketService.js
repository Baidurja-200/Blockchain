import { io } from "socket.io-client";
import { emitMockLog } from "./mockData";

/**
 * Socket.IO Client Singleton for real-time cross-device data synchronisation.
 */

let socket = null;
let currentUser = null;
let pingInterval = null;

function getStoredUser() {
  if (currentUser) return currentUser;
  try {
    const raw = localStorage.getItem("cv_user");
    if (raw) return JSON.parse(raw);
  } catch (_e) {}
  return null;
}

export function initSocket() {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://blockchain-l5oh.onrender.com"
      : "http://localhost:5000");

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[WS Client] Connected to server:", socket.id);
    const u = getStoredUser();
    if (u && u.name) {
      socket.emit("register", { name: u.name, role: u.role });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS Client] Disconnected:", reason);
  });

  // 1. Live sessions update (for Backend Monitor)
  socket.on("sessions:update", (sessions) => {
    if (sessions && typeof sessions === "object") {
      try { localStorage.setItem("cv_active_sessions", JSON.stringify(sessions)); } catch (_e) {}
    }
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

  // Start ping heartbeat to keep active session alive on server
  if (!pingInterval) {
    pingInterval = setInterval(() => {
      const u = getStoredUser();
      if (socket && socket.connected && u && u.name) {
        socket.emit("ping:user", { name: u.name, role: u.role });
      }
    }, 8000);
  }

  return socket;
}

export function registerUser(user) {
  currentUser = user;
  if (!socket) initSocket();

  if (socket && user && user.name) {
    if (socket.connected) {
      socket.emit("register", { name: user.name, role: user.role });
    }
  }
}

export function unregisterUser() {
  const u = currentUser || getStoredUser();
  if (socket && socket.connected && u && u.name) {
    socket.emit("logout", { name: u.name, role: u.role });
  }
  currentUser = null;
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
