import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Trash2, Wifi, WifiOff, Activity, ShieldCheck, Globe } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import useMonitorStream from "../hooks/useMonitorStream";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { fetchGlobalLedger, getActiveSessions } from "../services/cloudLedgerService";

const LEVEL_STYLES = {
  info: { text: "text-sky-400", tag: "INFO", tagCls: "bg-sky-500/15 text-sky-400" },
  success: { text: "text-emerald-400", tag: "OK", tagCls: "bg-emerald-500/15 text-emerald-400" },
  warning: { text: "text-amber-400", tag: "WARN", tagCls: "bg-amber-500/15 text-amber-400" },
  error: { text: "text-rose-400", tag: "ERROR", tagCls: "bg-rose-500/15 text-rose-400" },
};

function formatClock(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) + `.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export default function BackendMonitor() {
  const { user } = useAuth();
  const { logs, connected, clear } = useMonitorStream();
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeSessions, setActiveSessions] = useState(() => {
    // Initialize from localStorage or cached service data
    try {
      const stored = localStorage.getItem("cv_active_sessions");
      if (stored) return JSON.parse(stored);
    } catch (_e) {}
    return getActiveSessions();
  });
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  useEffect(() => {
    // 1. Listen to instant WebSocket session updates from server
    const handleSocketSessions = (e) => {
      if (e.detail && typeof e.detail === "object") {
        setActiveSessions({ ...e.detail });
      }
    };
    window.addEventListener("hashflow_socket_sessions", handleSocketSessions);

    // 2. Listen to cloud sync events
    const handleCloudSync = (e) => {
      const sessions = e.detail?.sessions || e.detail?.cloud?.sessions;
      if (sessions && typeof sessions === "object") {
        setActiveSessions({ ...sessions });
      }
    };
    window.addEventListener("hashflow_cloud_sync", handleCloudSync);

    // 3. Fetch canonical sessions from server REST API
    const updatePeers = async () => {
      try {
        const res = await api.get("/monitor/sessions");
        if (res.data?.sessions && typeof res.data.sessions === "object") {
          setActiveSessions({ ...res.data.sessions });
          return;
        }
      } catch (_e) {}

      const data = await fetchGlobalLedger();
      if (data && data.sessions && typeof data.sessions === "object") {
        setActiveSessions({ ...data.sessions });
      }
    };
    updatePeers();
    const timer = setInterval(updatePeers, 10000);

    return () => {
      window.removeEventListener("hashflow_socket_sessions", handleSocketSessions);
      window.removeEventListener("hashflow_cloud_sync", handleCloudSync);
      clearInterval(timer);
    };
  }, []);

  const counts = logs.reduce(
    (acc, l) => {
      acc[l.level] = (acc[l.level] || 0) + 1;
      return acc;
    },
    { info: 0, success: 0, warning: 0, error: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Backend Monitor"
        subtitle="Live developer console — watch every hash, DB write, and smart contract call in real time"
        action={
          <div className="flex items-center gap-2">
            <span className={`badge ${connected ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />} {connected ? "Live Node" : "Disconnected"}
            </span>
            <button className="btn-secondary" onClick={clear}>
              <Trash2 size={15} /> Clear
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">Network Consensus Node:</span>
            <span className="text-brand-600 dark:text-brand-400 font-semibold">node-us-east-1 (P2P Global Sync Active)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <ShieldCheck size={14} className="text-emerald-500" />
            Active User: <strong className="text-slate-900 dark:text-slate-100">{user?.name || "Guest User"}</strong> ({user?.role || "Visitor"})
          </div>
        </div>
      </div>

      <div className="mb-4 glass-card p-4">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          <Globe size={14} /> Classroom Peers & Devices Connected ({Object.keys(activeSessions).length || 1})
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(activeSessions).length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{user?.name || "Local Device"} ({user?.role || "Visitor"}) &middot; Active Node</span>
            </div>
          ) : (
            Object.entries(activeSessions).map(([sId, s]) => (
              <div key={sId} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-slate-700 dark:text-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold">{s.name}</span>
                <span className="text-[10px] text-slate-400">({s.role})</span>
                <span className="mono text-[10px] font-bold text-brand-500">{s.nodeName}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Info", value: counts.info, cls: "text-sky-500" },
          { label: "Success", value: counts.success, cls: "text-emerald-500" },
          { label: "Warnings", value: counts.warning, cls: "text-amber-500" },
          { label: "Errors", value: counts.error, cls: "text-rose-500" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3.5 text-center">
            <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0e17] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Terminal size={13} /> chainverify-api &mdash; live logs
            </span>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="accent-brand-500" />
            Auto-scroll
          </label>
        </div>

        <div className="mono h-[32rem] overflow-y-auto scrollbar-thin px-4 py-4 text-[12.5px] leading-relaxed">
          {logs.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600">
              <Activity size={28} />
              <p>Waiting for backend activity... try creating a PO, GRN, or Invoice.</p>
            </div>
          )}
          {logs.map((log) => {
            const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.info;
            return (
              <div key={log.id} className="flex items-start gap-2.5 py-0.5">
                <span className="shrink-0 text-slate-600">{formatClock(log.timestamp)}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${style.tagCls}`}>{style.tag}</span>
                <span className={`break-all ${style.text}`}>{log.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </motion.div>
    </div>
  );
}
