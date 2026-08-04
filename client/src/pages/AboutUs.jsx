import { motion } from "framer-motion";
import {
  ShieldCheck,
  Blocks,
  FileCheck2,
  Users,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";

const TEAM = [
  {
    name: "Baidurja Biswas",
    role: "Project Lead & Full-Stack Architect",
    color: "from-indigo-500 to-purple-600",
    description: "Designed core system architecture, React UI, state management, and API integrations.",
  },
  {
    name: "Rahul Khurana",
    role: "Blockchain & Smart Contract Engineer",
    color: "from-cyan-500 to-blue-600",
    description: "Engineered SHA-256 hash-chained ledger and Hardhat/Solidity ThreeWayMatch contract.",
  },
  {
    name: "Khushbu Gandhi",
    role: "AI & Fraud Detection Lead",
    color: "from-emerald-500 to-teal-600",
    description: "Architected rule-based fraud scoring engine and automated anomaly risk detection.",
  },
  {
    name: "Vanshika Maheshwari",
    role: "Frontend & UX Specialist",
    color: "from-rose-500 to-pink-600",
    description: "Crafted glassmorphic UI components, theme systems, and responsive layout styling.",
  },
  {
    name: "Abhishek Gore",
    role: "Backend & Database Architect",
    color: "from-amber-500 to-orange-600",
    description: "Built Express API controllers, MongoDB schema persistence, and zero-setup demo fallback.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Purchase Order Issuance",
    desc: "Procurement officer issues an official PO detailing item quantities and prices. The record is hashed and anchored to the ledger.",
    icon: FileCheck2,
  },
  {
    num: "02",
    title: "Goods Receipt (GRN) Logging",
    desc: "Warehouse officer inspects delivered goods and logs a physical GRN, verifying quantities actually received against the PO.",
    icon: Layers,
  },
  {
    num: "03",
    title: "Vendor Invoice Submission",
    desc: "Vendor submits digital invoice for payment. Hashflow immediately initiates automated cryptographic cross-checks.",
    icon: Zap,
  },
  {
    num: "04",
    title: "Smart Contract & AI Validation",
    desc: "Solidity rules and AI fraud engine check 5 critical criteria: PO match, GRN match, Duplicate check, Amount equality, and Quantity check.",
    icon: Cpu,
  },
  {
    num: "05",
    title: "Blockchain Block Mining",
    desc: "Approved invoices are appended to the immutable block ledger with SHA-256 hash chaining, guaranteeing auditability.",
    icon: Blocks,
  },
];

export default function AboutUs() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="About Hashflow"
        subtitle="Blockchain-Anchored Three-Way Match & Fraud Prevention Platform"
      />

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-700 to-slate-900 p-8 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-400 backdrop-blur-md">
            <Sparkles size={14} className="animate-pulse" /> Enterprise Procurement Security
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-4xl sm:leading-tight">
            Eliminating Procurement Fraud Through Immutable Blockchain Verification
          </h2>
          <p className="text-sm text-white/80 sm:text-base">
            Hashflow bridges physical inventory receiving with financial disbursement using an automated
            three-way matching engine. By binding Purchase Orders, Goods Receipt Notes, and Invoices onto a
            cryptographic blockchain ledger, Hashflow prevents overbilling, phantom deliveries, and duplicate payments.
          </p>
        </div>
      </motion.div>

      {/* Group Project Credits Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Group Project Team</h3>
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              Group project by Baidurja Biswas, Rahul Khurana, Khushbu Gandhi, Vanshika Maheshwari, Abhishek Gore
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Users size={14} /> 5 Team Members
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TEAM.map((m, idx) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="glass-card flex flex-col justify-between p-5 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${m.color} text-base font-black text-white shadow-md shadow-brand-500/20`}
                >
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <h4 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">{m.name}</h4>
                <p className="mt-1 text-xs font-bold text-brand-600 dark:text-brand-400">{m.role}</p>
                <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Problem & Solution Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="The Problem" subtitle="Why traditional enterprise procurement fails" delay={0.1}>
          <div className="space-y-4">
            {[
              {
                title: "Duplicate & Double Billing",
                desc: "Vendors accidentally or maliciously re-submit invoices for orders already settled.",
                icon: AlertTriangle,
                color: "text-danger-500 bg-danger-500/10",
              },
              {
                title: "Invoices Without Received Goods (GRN)",
                desc: "Invoices are approved and paid before goods arrive at the warehouse or without proof of delivery.",
                icon: AlertTriangle,
                color: "text-warning-500 bg-warning-500/10",
              },
              {
                title: "Quantity & Price Inflation",
                desc: "Invoice totals exceed agreed PO amounts or claim higher quantities than physically received.",
                icon: AlertTriangle,
                color: "text-amber-500 bg-amber-500/10",
              },
              {
                title: "Manual Audit Bottlenecks",
                desc: "Siloed ERP databases make cross-referencing POs, GRNs, and invoices slow, error-prone, and vulnerable to fraud.",
                icon: AlertTriangle,
                color: "text-red-500 bg-red-500/10",
              },
            ].map((p) => (
              <div key={p.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.color}`}>
                  <p.icon size={18} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.title}</h5>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="The Hashflow Solution" subtitle="Automated smart contract matching & AI scoring" delay={0.15}>
          <div className="space-y-4">
            {[
              {
                title: "Cryptographic 3-Way Matching",
                desc: "Automated real-time verification matching PO total, line items, and GRN receiving notes.",
                icon: ShieldCheck,
                color: "text-success-500 bg-success-500/10",
              },
              {
                title: "Immutable SHA-256 Ledger",
                desc: "Transactions are hash-chained into a tamper-proof block ledger persisted across sessions.",
                icon: Lock,
                color: "text-brand-500 bg-brand-500/10",
              },
              {
                title: "EVM Smart Contract Rules",
                desc: "Solidity ThreeWayMatch contract enforces strict rules on-chain before approving disbursement.",
                icon: Cpu,
                color: "text-accent-500 bg-accent-500/10",
              },
              {
                title: "Multi-Factor Fraud Detection",
                desc: "Rule-based AI engine calculates risk scores based on price variance, duplicate velocity, and PO anomalies.",
                icon: Zap,
                color: "text-purple-500 bg-purple-500/10",
              },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">{s.title}</h5>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* How Hashflow Works Step-by-Step */}
      <Card title="How Hashflow Works" subtitle="Step-by-step verification pipeline" delay={0.2}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/70 p-4 transition-all hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-brand-600 dark:text-brand-400">{step.num}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                    <step.icon size={16} />
                  </div>
                </div>
                <h5 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</h5>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight size={16} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-300 dark:text-slate-700 lg:block" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
