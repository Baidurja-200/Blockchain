import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, User, Lock, Loader2, ShieldCheck, Blocks, FileCheck2, AlertTriangle, Play } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_DESCRIPTIONS } from "../utils/roles";
import IntroSplash from "../components/common/IntroSplash";

const ROLES = ["Procurement Officer", "Warehouse Officer", "Finance Officer", "Vendor", "Auditor"];
const DEMO_PASSWORD = "demo123";

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please type your name before signing in.");
      return;
    }

    try {
      await login(name, role, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check the shared password and try again.");
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-slate-950 p-4 sm:p-6">
        {/* Ambient gradient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="my-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl lg:grid-cols-2">
          {/* Left branding panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 p-10 text-white lg:flex"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                  <Link2 size={22} />
                </div>
                <span className="text-xl font-black tracking-tight">Hashflow</span>
              </div>

              <h1 className="mt-10 text-3xl font-bold leading-tight">
                Blockchain-Based
                <br /> Three-Way Invoice
                <br /> Verification
              </h1>
              <p className="mt-4 max-w-sm text-sm text-white/70">
                Eliminate invoice fraud with immutable, hash-linked verification across Purchase Orders, Goods
                Receipts, and Vendor Invoices.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: FileCheck2, text: "Automated PO ↔ GRN ↔ Invoice matching" },
                { icon: Blocks, text: "Immutable, hash-chained transaction ledger" },
                { icon: ShieldCheck, text: "Rule-based fraud detection engine" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <f.icon size={16} />
                  </div>
                  {f.text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right form panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col justify-center bg-slate-900/60 p-8 sm:p-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <Link2 size={18} />
                </div>
                <span className="text-lg font-black text-white">Hashflow</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSplash(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/10"
              >
                <Play size={12} /> Replay Intro
              </button>
            </div>

            <h2 className="text-xl font-bold text-white">Join the demo</h2>
            <p className="mb-6 text-sm text-slate-400">
              Type your name, pick a role to play, and sign in — no account needed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Your Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                    placeholder="e.g. Alex Kim"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">This is shown as your name throughout the app.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Choose a role to play
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                        role === r
                          ? "border-brand-400 bg-brand-500/20 text-white shadow-lg shadow-brand-500/10"
                          : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {r}
                      <p className="mt-0.5 truncate text-[10px] font-normal text-slate-400">{ROLE_DESCRIPTIONS[r]}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Shared Classroom Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">Everyone in the room uses this same password.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3.5 py-2.5 text-xs font-medium text-danger-400">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? <Loader2 size={16} className="animate-spin" /> : `Enter as ${role}`}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Team project footer section */}
        <footer className="mt-8 flex w-full max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md">
          <p className="mx-auto text-xs font-semibold text-slate-400 text-center">
            Group project by <span className="text-white font-bold">Baidurja Biswas</span>, <span className="text-white font-bold">Rahul Khurana</span>, <span className="text-white font-bold">Khushbu Gandhi</span>, <span className="text-white font-bold">Vanshika Maheshwari</span>, <span className="text-white font-bold">Abhishek Gore</span>
          </p>
        </footer>
      </div>
    </>
  );
}
