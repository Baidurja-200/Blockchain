import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldX, Gauge, AlertOctagon } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import Card from "../components/ui/Card";
import KpiCard from "../components/ui/KpiCard";
import RiskGauge from "../components/ui/RiskGauge";
import EmptyState from "../components/ui/EmptyState";
import { listFlaggedInvoices, fraudSummary } from "../services/fraudService";
import { formatCurrency } from "../utils/format";

export default function FraudDetection() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    Promise.all([listFlaggedInvoices(), fraudSummary()])
      .then(([inv, sum]) => {
        setInvoices(inv);
        setSummary(sum);
        if (inv.length) setSelectedId(inv[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading fraud detection data..." />;

  const selected = invoices.find((i) => i._id === selectedId);
  const recIcon = { Approve: ShieldCheck, "Manual Review": ShieldAlert, Reject: ShieldX };
  const recColor = { Approve: "text-success-500", "Manual Review": "text-warning-500", Reject: "text-danger-500" };

  return (
    <div>
      <PageHeader title="Fraud Detection" subtitle="Rule-based fraud scoring across all submitted invoices" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Gauge} label="Average Fraud Score" value={summary?.avgScore ?? 0} accent="brand" />
        <KpiCard icon={ShieldCheck} label="Low Risk" value={summary?.low ?? 0} accent="success" />
        <KpiCard icon={ShieldAlert} label="Medium Risk" value={summary?.medium ?? 0} accent="warning" />
        <KpiCard icon={ShieldX} label="High Risk" value={summary?.high ?? 0} accent="danger" />
      </div>

      {invoices.length === 0 ? (
        <div className="glass-card mt-6">
          <EmptyState icon={ShieldCheck} title="No fraud indicators found" subtitle="All invoices currently pass three-way match cleanly." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card title="Flagged Invoices" className="xl:col-span-1" delay={0.05}>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto scrollbar-thin pr-1">
              {invoices.map((inv) => {
                const score = inv.fraud?.score ?? inv.fraudScore ?? 0;
                const amount = inv.invoiceAmount ?? inv.amount ?? 0;
                return (
                  <button
                    key={inv._id || inv.invoiceNumber}
                    onClick={() => setSelectedId(inv._id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedId === inv._id
                        ? "border-brand-400 bg-brand-500/5 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{inv.invoiceNumber}</span>
                      <span
                        className={`text-xs font-bold ${
                          score >= 60 ? "text-danger-500" : score >= 30 ? "text-warning-500" : "text-success-500"
                        }`}
                      >
                        {score}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {inv.vendor} &middot; {formatCurrency(amount)}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {selected && (() => {
            const score = selected.fraud?.score ?? selected.fraudScore ?? 0;
            const amount = selected.invoiceAmount ?? selected.amount ?? 0;
            const recommendation = selected.fraud?.recommendation || (score >= 60 ? "Reject" : score >= 30 ? "Manual Review" : "Approve");
            const RecIcon = recIcon[recommendation] || ShieldAlert;
            const recColorClass = recColor[recommendation] || "text-warning-500";
            const reasons = selected.fraud?.reasons || (selected.rejectionReason ? [selected.rejectionReason] : ["Automated rule check performed"]);

            return (
              <motion.div
                key={selected._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card xl:col-span-2 p-6"
              >
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <RiskGauge score={score} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Invoice</p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selected.invoiceNumber}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selected.vendor} &middot; {formatCurrency(amount)} &middot; PO {selected.poNumber}
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <RecIcon size={18} className={recColorClass} />
                      <span className={`text-sm font-bold ${recColorClass}`}>
                        Recommendation: {recommendation}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <AlertOctagon size={13} /> Fraud Indicators
                  </p>
                  <ul className="space-y-2">
                    {reasons.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-warning-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
