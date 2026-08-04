import { EventEmitter } from "events";

/**
 * In-process pub/sub bus for the Backend Monitor page.
 * Every meaningful backend step (hashing, DB writes, "smart contract" calls,
 * block confirmations) publishes a log line here. The SSE route
 * (routes/monitor.routes.js) streams these to connected clients in real time.
 */
class MonitorBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.history = []; // keep a rolling buffer so late-connecting clients see recent logs
    this.maxHistory = 200;
  }

  log(level, message, meta = {}) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level, // 'info' | 'success' | 'warning' | 'error'
      message,
      meta,
      timestamp: new Date().toISOString(),
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.emit("log", entry);
    return entry;
  }

  info(message, meta) {
    return this.log("info", message, meta);
  }
  success(message, meta) {
    return this.log("success", message, meta);
  }
  warning(message, meta) {
    return this.log("warning", message, meta);
  }
  error(message, meta) {
    return this.log("error", message, meta);
  }
}

const monitorBus = new MonitorBus();
export default monitorBus;
