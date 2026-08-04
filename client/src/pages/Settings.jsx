import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ShieldCheck, Palette, Sun, Moon, RefreshCw, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Loader from "../components/ui/Loader";
import { fetchRoleMatrix, fetchSystemStatus, resetDemoData } from "../services/settingsService";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ROLE_COLORS, ROLE_DESCRIPTIONS } from "../utils/roles";
import { formatDateTime } from "../utils/format";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [roleData, setRoleData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      "This wipes ALL purchase orders, GRNs, invoices, blockchain blocks, and every logged-in identity, then reloads the small demo scenario set. Everyone will need to log in again. Continue?"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      await resetDemoData();
      logout();
      navigate("/login");
    } finally {
      setResetting(false);
    }
  };

  const loadStatus = () => {
    setRefreshing(true);
    fetchSystemStatus()
      .then(setStatus)
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    Promise.all([fetchRoleMatrix(), fetchSystemStatus()])
      .then(([roles, sys]) => {
        setRoleData(roles);
        setStatus(sys);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading settings..." />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Role management, permissions, appearance, and system health" />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card
          title="Role Management"
          subtitle="Roles configured in this system"
          delay={0.02}
        >
          <div className="space-y-2.5">
            {roleData.roles.map((role) => {
              const style = ROLE_COLORS[role] || { bg: "bg-slate-100", text: "text-slate-600" };
              return (
                <div key={role} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.bg} ${style.text}`}>
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{role}</p>
                    <p className="text-xs text-slate-400">{ROLE_DESCRIPTIONS[role]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Permissions Matrix" subtitle="What each role can do" delay={0.06}>
          <div className="space-y-4">
            {roleData.roles.map((role) => (
              <div key={role}>
                <p className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{role}</p>
                <div className="flex flex-wrap gap-1.5">
                  {roleData.permissions[role]?.map((perm) => (
                    <span key={perm} className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <ShieldCheck size={11} /> {perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Theme" subtitle="Choose your preferred appearance" delay={0.1}>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                theme === "light" ? "bg-white text-brand-600 shadow-sm dark:bg-slate-700" : "text-slate-500"
              }`}
            >
              <Sun size={16} /> Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                theme === "dark" ? "bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-400" : "text-slate-500"
              }`}
            >
              <Moon size={16} /> Dark
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Palette size={13} /> Applies instantly across the entire application.
          </div>
        </Card>

        <Card
          title="System Status"
          subtitle="Live backend & blockchain health"
          delay={0.14}
          action={
            <button className="btn-ghost !p-2" onClick={loadStatus} title="Refresh">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          }
        >
          <div className="space-y-3">
            <StatusRow label="API Server" value={status.api} ok />
            <StatusRow label="Database" value={status.database} ok={status.database === "Connected"} />
            <StatusRow label="Blockchain Node" value={status.blockchainNode} ok />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <MiniStat label="Total Blocks" value={status.totalBlocks} />
              <MiniStat label="Last Block #" value={status.lastBlockNumber} />
              <MiniStat label="Total Users" value={status.totalUsers} />
              <MiniStat label="Uptime" value={`${Math.floor(status.uptimeSeconds / 60)}m ${status.uptimeSeconds % 60}s`} />
            </div>
            <p className="pt-1 text-xs text-slate-400">Last block mined {formatDateTime(status.lastBlockTime)}</p>
          </div>
        </Card>

        <Card title="Classroom Demo" subtitle="Reset everything back to the starting scenarios" delay={0.18} className="border-warning-500/30">
          <div className="flex items-start gap-3 rounded-xl bg-warning-500/10 p-3.5 text-xs text-warning-700 dark:text-warning-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              Wipes every purchase order, GRN, invoice, blockchain block, and logged-in identity created during this
              session, then reloads the six starter scenarios (clean approval, duplicate invoice, missing GRN, amount
              mismatch, quantity mismatch). Use this between groups or demo runs.
            </p>
          </div>
          <button className="btn-secondary mt-3 w-full !border-warning-500/40 !text-warning-600 dark:!text-warning-400" onClick={handleReset} disabled={resetting}>
            <RotateCcw size={15} className={resetting ? "animate-spin" : ""} /> {resetting ? "Resetting..." : "Reset Demo Data"}
          </button>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/50">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-bold ${ok ? "text-success-500" : "text-danger-500"}`}>
        <CheckCircle2 size={13} /> {value}
      </span>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
