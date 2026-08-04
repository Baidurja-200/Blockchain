import { useEffect, useRef, useState } from "react";

/**
 * Subscribes to the backend's Server-Sent Events log stream and keeps a
 * rolling buffer of the most recent entries for the Backend Monitor page.
 */
export function useMonitorStream({ maxLogs = 400 } = {}) {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef(new Set());

  useEffect(() => {
    const token = localStorage.getItem("cv_token");
    const url = `/api/monitor/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const source = new EventSource(url);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        if (seenIds.current.has(entry.id)) return;
        seenIds.current.add(entry.id);
        setLogs((prev) => {
          const next = [...prev, entry];
          if (next.length > maxLogs) next.splice(0, next.length - maxLogs);
          return next;
        });
      } catch {
        // ignore malformed / keep-alive events
      }
    };

    return () => source.close();
  }, [maxLogs]);

  const clear = () => setLogs([]);

  return { logs, connected, clear };
}

export default useMonitorStream;
