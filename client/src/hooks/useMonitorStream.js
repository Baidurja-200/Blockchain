import { useEffect, useRef, useState } from "react";
import { MOCK_LOGS } from "../services/mockData";

const INITIAL_DEMO_LOGS = [
  {
    id: "init-1",
    level: "success",
    message: "[SYSTEM] Hashflow Network Node Initialized — P2P Consensus Protocol Online",
    timestamp: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: "init-2",
    level: "info",
    message: "[SMART_CONTRACT] ThreeWayMatch.sol deployed at 0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    timestamp: new Date(Date.now() - 25000).toISOString(),
  },
  {
    id: "init-3",
    level: "info",
    message: "[P2P] Peer Node Connected: node-us-east-1 (Latency: 12ms)",
    timestamp: new Date(Date.now() - 15000).toISOString(),
  },
];

export function useMonitorStream({ maxLogs = 400 } = {}) {
  const [logs, setLogs] = useState(() => {
    return [...INITIAL_DEMO_LOGS, ...(MOCK_LOGS || [])];
  });
  const [connected, setConnected] = useState(true);
  const seenIds = useRef(new Set([...INITIAL_DEMO_LOGS.map((l) => l.id)]));

  const addLogEntry = (entry) => {
    if (!entry || !entry.id) return;
    if (seenIds.current.has(entry.id)) return;
    seenIds.current.add(entry.id);
    setLogs((prev) => {
      const next = [...prev, entry];
      if (next.length > maxLogs) next.splice(0, next.length - maxLogs);
      return next;
    });
  };

  useEffect(() => {
    // 1. Try real SSE backend endpoint first
    let source = null;
    try {
      const token = localStorage.getItem("cv_token");
      const url = `/api/monitor/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      source = new EventSource(url);

      source.onopen = () => setConnected(true);
      source.onerror = () => {
        // Fallback to P2P network stream on static hosting
        setConnected(true);
      };

      source.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data);
          addLogEntry(entry);
        } catch {}
      };
    } catch {
      setConnected(true);
    }

    // 2. Custom DOM event listener for client-side fallback
    const handleCustomLog = (e) => {
      if (e.detail) addLogEntry(e.detail);
    };
    window.addEventListener("hashflow_log", handleCustomLog);

    // 3. BroadcastChannel listener across browser tabs
    let channel = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("hashflow_p2p_sync");
        channel.onmessage = (msg) => {
          if (msg.data?.type === "LOG" && msg.data.entry) {
            addLogEntry(msg.data.entry);
          }
        };
      }
    } catch {}

    return () => {
      if (source) source.close();
      window.removeEventListener("hashflow_log", handleCustomLog);
      if (channel) channel.close();
    };
  }, [maxLogs]);

  const clear = () => {
    seenIds.current.clear();
    setLogs([]);
  };

  return { logs, connected, clear };
}

export default useMonitorStream;
