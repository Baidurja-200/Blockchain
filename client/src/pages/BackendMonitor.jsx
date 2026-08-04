import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Terminal, Trash2, Wifi, WifiOff, Activity } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import useMonitorStream from "../hooks/useMonitorStream";

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
  const { logs, connected, clear } = useMonitorStream();
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

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
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />} {connected ? "Live" : "Disconnected"}
            </span>
            <button className="btn-secondary" onClick={clear}>
              <Trash2 size={15} /> Clear
            </button>
          </div>
        }
      />

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
