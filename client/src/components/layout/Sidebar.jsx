import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Blocks,
  ShieldAlert,
  Terminal,
  BarChart3,
  Settings,
  Info,
  Link2,
  X,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/purchase-orders", label: "Purchase Orders", icon: FileText },
  { to: "/grn", label: "Goods Receipt", icon: PackageCheck },
  { to: "/invoices", label: "Invoices", icon: Receipt },
  { to: "/validation", label: "Smart Contract Validation", icon: ShieldCheck },
  { to: "/blockchain", label: "Blockchain Explorer", icon: Blocks },
  { to: "/fraud", label: "Fraud Detection", icon: ShieldAlert },
  { to: "/monitor", label: "Backend Monitor", icon: Terminal },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About Us", icon: Info },
];

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/70 bg-white/90 backdrop-blur-xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/90 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-indigo-600 to-accent-500 text-white shadow-lg shadow-brand-500/30">
              <Link2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-base font-black tracking-tight leading-none text-slate-900 dark:text-white">Hashflow</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">3-Way Verification</p>
            </div>
          </div>
          <button onClick={onCloseMobile} className="btn-ghost !p-1.5 lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 pb-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70"
                )
              }
            >
              <item.icon size={18} strokeWidth={2.1} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 p-4 dark:from-brand-500/15 dark:to-accent-500/15">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Blockchain Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Chain Active &amp; Syncing</span>
          </div>
        </div>
      </aside>
    </>
  );
}
