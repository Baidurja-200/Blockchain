import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, PlayCircle, RotateCcw, ArrowDown, FileCheck2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import { listInvoices } from "../services/invoiceService";
import { formatCurrency } from "../utils/format";

const STEP_LABELS = [
  { key: "submitted", label: "Invoice Submitted" },
  { key: "poExists", label: "PO Exists?" },
  { key: "grnExists", label: "GRN Exists?" },
  { key: "duplicateInvoice", label: "Duplicate Invoice?" },
  { key: "amountMatches", label: "Amount Matches?" },
  { key: "quantitySufficient", label: "Remaining Quantity Available?" },
];

export default function SmartContractValidation() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [running, setRunning] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [done, setDone] = useState(false);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    listInvoices()
      .then((data) => {
        const safeData = data || [];
        setInvoices(safeData);
        if (safeData.length) setSelectedId(safeData[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const safeInvoices = invoices || [];
  const invoice = safeInvoices.find((i) => i?._id === selectedId);

  const steps = invoice
    ? [
        { key: "submitted", label: "Invoice Submitted", passed: true, detail: `${invoice.invoiceNumber} received from ${invoice.vendor}` },
        ...(invoice.validation?.steps || []),
      ]
    : [];

  const runAnimation = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setRunning(true);
    setDone(false);
    setRevealedCount(0);

    steps.forEach((_, idx) => {
      const t = setTimeout(() => {
        setRevealedCount(idx + 1);
        if (idx === steps.length - 1) {
          const finalT = setTimeout(() => {
            setDone(true);
            setRunning(false);
          }, 500);
          timeoutsRef.current.push(finalT);
        }
      }, 650 * (idx + 1));
      timeoutsRef.current.push(t);
    });
  };

  const reset = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setRevealedCount(0);
    setDone(false);
    setRunning(false);
  };

  useEffect(() => reset, [selectedId]);

  if (loading) return <Loader label="Loading invoices..." />;

  return (
    <div>
      <PageHeader title="Smart Contract Validation" subtitle="Watch the three-way match execute step by step, exactly as the blockchain sees it" />

      <div className="glass-card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="field-label">Select Invoice to Validate</label>
          <select
            className="input-field"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
            }}
          >
            {invoices.map((inv) => (
              <option key={inv._id} value={inv._id}>
                {inv.invoiceNumber} — {inv.vendor} ({formatCurrency(inv.invoiceAmount)})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={reset} disabled={running}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="btn-primary" onClick={runAnimation} disabled={running || !invoice}>
            <PlayCircle size={16} /> {running ? "Validating..." : "Run Validation"}
          </button>
        </div>
      </div>

      {!invoice ? (
        <div className="glass-card p-10 text-center text-sm text-slate-400">No invoices available to validate.</div>
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center">
          {steps.map((step, idx) => {
            const revealed = revealedCount > idx;
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.key} className="flex w-full flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={revealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.35, scale: 0.97, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`glass-card flex w-full items-center gap-3 p-4 ${
                    revealed ? (step.passed ? "border-success-500/40" : "border-danger-500/40") : ""
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      !revealed
                        ? "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600"
                        : step.passed
                        ? "bg-success-500/15 text-success-500"
                        : "bg-danger-500/15 text-danger-500"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {revealed ? (
                        <motion.div key="icon" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                          {step.passed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        </motion.div>
                      ) : (
                        <motion.div key="pending" className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.label}</p>
                    {revealed && <p className="text-xs text-slate-500 dark:text-slate-400">{step.detail}</p>}
                  </div>
                </motion.div>

                {!isLast && (
                  <motion.div
                    animate={{ opacity: revealed ? 1 : 0.25 }}
                    className="py-1 text-slate-300 dark:text-slate-700"
                  >
                    <ArrowDown size={18} />
                  </motion.div>
                )}
              </div>
            );
          })}

          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
                className="mt-6 w-full"
              >
                <div className="py-1 text-center text-slate-300 dark:text-slate-700">
                  <ArrowDown size={18} className="mx-auto" />
                </div>
                <div
                  className={`flex items-center justify-center gap-3 rounded-2xl border-2 p-6 text-center shadow-lg ${
                    invoice.validation.passed
                      ? "border-success-500 bg-success-500/10 shadow-success-500/20"
                      : "border-danger-500 bg-danger-500/10 shadow-danger-500/20"
                  }`}
                >
                  <FileCheck2 size={28} className={invoice.validation.passed ? "text-success-500" : "text-danger-500"} />
                  <div>
                    <p className={`text-xl font-extrabold ${invoice.validation.passed ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"}`}>
                      {invoice.validation.passed ? "APPROVED" : "REJECTED"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Three-way match {invoice.validation.passed ? "passed" : "failed"} for {invoice.invoiceNumber}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
