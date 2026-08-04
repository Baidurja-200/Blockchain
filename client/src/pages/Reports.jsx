import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, ShieldAlert, Building2, ClipboardCheck, Blocks, Download, BarChart3 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import { generateReport } from "../services/reportsService";
import { formatDateTime } from "../utils/format";

const REPORT_TYPES = [
  { type: "purchase", label: "Purchase Report", icon: FileText, desc: "All purchase orders and their status" },
  { type: "fraud", label: "Fraud Report", icon: ShieldAlert, desc: "Invoices with fraud indicators" },
  { type: "vendor", label: "Vendor Report", icon: Building2, desc: "Spend breakdown by vendor" },
  { type: "audit", label: "Audit Report", icon: ClipboardCheck, desc: "Full three-way match audit trail" },
  { type: "blockchain", label: "Blockchain Report", icon: Blocks, desc: "Every block on the chain" },
];

function toCsv(columns, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [columns.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  return lines.join("\n");
}

export default function Reports() {
  const [activeType, setActiveType] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (type) => {
    setActiveType(type);
    setLoading(true);
    setReport(null);
    try {
      const data = await generateReport(type);
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const csv = toCsv(report.columns, report.rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export operational, financial, and audit reports" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {REPORT_TYPES.map((r, i) => (
          <motion.button
            key={r.type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => handleGenerate(r.type)}
            className={`glass-card p-5 text-left transition-all hover:-translate-y-1 ${
              activeType === r.type ? "border-brand-400 ring-2 ring-brand-500/20" : ""
            }`}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <r.icon size={19} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.label}</p>
            <p className="mt-1 text-xs text-slate-400">{r.desc}</p>
          </motion.button>
        ))}
      </div>

      <div className="mt-6">
        {loading && <Loader label="Generating report..." />}

        {!loading && !report && (
          <div className="glass-card">
            <EmptyState icon={BarChart3} title="No report generated yet" subtitle="Select a report type above to generate it." />
          </div>
        )}

        {!loading && report && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{report.title}</h3>
                <p className="text-xs text-slate-400">Generated {formatDateTime(report.generatedAt)} &middot; {report.rows.length} records</p>
              </div>
              <button className="btn-secondary" onClick={handleDownload}>
                <Download size={15} /> Export CSV
              </button>
            </div>

            <div className="table-shell overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.rows.length === 0 && (
                    <tr>
                      <td colSpan={report.columns.length} className="px-3 py-6 text-center text-slate-400">
                        No records found.
                      </td>
                    </tr>
                  )}
                  {report.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {row.map((cell, ci) => (
                        <td key={ci} className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
