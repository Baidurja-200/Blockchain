import { useState } from "react";
import { Menu, Sun, Moon, LogOut, ChevronDown, PlusCircle, FileText, PackageCheck, Receipt } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { ROLE_COLORS } from "../../utils/roles";
import { initials } from "../../utils/format";

export default function Topbar({ onOpenMobile, title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleStyle = ROLE_COLORS[user?.role] || { bg: "bg-slate-100", text: "text-slate-600" };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onOpenMobile} className="btn-ghost !p-2 lg:hidden">
          <Menu size={20} />
        </button>
        <h2 className="hidden text-base font-extrabold text-slate-800 dark:text-slate-100 sm:block">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-1.5 border-r border-slate-200/80 dark:border-slate-800 pr-3">
          <button
            onClick={() => navigate("/purchase-orders")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-brand-500 hover:text-white transition-all dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-600"
          >
            <PlusCircle size={14} /> PO
          </button>
          <button
            onClick={() => navigate("/grn")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-brand-500 hover:text-white transition-all dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-600"
          >
            <PlusCircle size={14} /> GRN
          </button>
          <button
            onClick={() => navigate("/invoices")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-brand-500 hover:text-white transition-all dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-600"
          >
            <PlusCircle size={14} /> Invoice
          </button>
        </div>
        <button onClick={toggleTheme} className="btn-ghost !p-2.5" title="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pr-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
            >
              {initials(user?.name || "U")}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100">{user?.name}</p>
              <p className={`text-[10px] font-medium ${roleStyle.text}`}>{user?.role}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="glass-card absolute right-0 z-20 mt-2 w-56 p-2">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{user?.email}</p>
                  <span className={`badge mt-1.5 ${roleStyle.bg} ${roleStyle.text}`}>{user?.role}</span>
                </div>
                <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-500/10 dark:text-danger-400"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
