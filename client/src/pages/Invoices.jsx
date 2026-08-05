import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Receipt, CheckCircle2, XCircle, Wallet, Eye, FileUp } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import RoleNotice from "../components/ui/RoleNotice";
import BlockLink from "../components/ui/BlockLink";
import { listInvoices, createInvoice, decideInvoice, payInvoice } from "../services/invoiceService";
import { listPOs } from "../services/poService";
import { listGRNs } from "../services/grnService";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";

const TABS = ["All", "Pending", "Manual Review", "Approved", "Rejected"];
const EMPTY_FORM = { poNumber: "", grnNumber: "", invoiceAmount: "", vendor: "" };

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [pos, setPOs] = useState([]);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([listInvoices(), listPOs(), listGRNs()])
      .then(([i, p, g]) => {
        setInvoices(i || []);
        setPOs(p || []);
        setGrns(g || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const safeInvoices = invoices || [];
  const filtered = tab === "All" ? safeInvoices : safeInvoices.filter((i) => i?.status === tab);
  const availableGrns = (grns || []).filter((g) => g?.poNumber === form.poNumber);
  const selectedPO = (pos || []).find((p) => p?.poNumber === form.poNumber);

  const handleUpload = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      const invoice = await createInvoice(fd);
      setInvoices((prev) => [invoice, ...prev]);
      setUploadOpen(false);
      setForm(EMPTY_FORM);
      setFile(null);
      setViewInvoice(invoice);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (invoice, decision) => {
    const { invoice: updated } = await decideInvoice(invoice._id, decision);
    setInvoices((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    setViewInvoice(updated);
  };

  const handlePay = async (invoice) => {
    const { invoice: updated } = await payInvoice(invoice._id);
    setInvoices((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    setViewInvoice(updated);
  };

  const canDecide = user?.role === "Finance Officer";
  const canUpload = user?.role === "Vendor";

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Vendor invoice submissions validated via three-way matching"
        action={
          canUpload && (
            <button
              className="btn-primary"
              onClick={() => {
                setForm({ ...EMPTY_FORM, vendor: user.company });
                setUploadOpen(true);
              }}
            >
              <Upload size={16} /> Upload Invoice
            </button>
          )
        }
      />

      {!canUpload && !canDecide && (
        <RoleNotice role={user?.role} allowedRole="Vendor / Finance Officer" capability="upload, approve, reject, or pay invoices" />
      )}
      {canUpload && (
        <RoleNotice role={user?.role} allowedRole="Finance Officer" capability="approve, reject, or pay invoices" />
      )}
      {canDecide && (
        <RoleNotice role={user?.role} allowedRole="Vendor" capability="upload invoices" />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === t
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                : "bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {t}
            <span className="ml-1.5 opacity-70">
              ({t === "All" ? invoices.length : invoices.filter((i) => i.status === t).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Loading invoices..." />
      ) : filtered.length === 0 ? (
        <div className="glass-card">
          <EmptyState icon={Receipt} title="No invoices in this category" subtitle="Try a different filter or upload a new invoice." />
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">PO / GRN</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Fraud Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Block</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((inv, i) => {
                const amount = inv.invoiceAmount ?? inv.amount ?? 0;
                const fraudScore = inv.fraud?.score ?? inv.fraudScore ?? 0;
                const paymentStatus = inv.paymentStatus ?? inv.status ?? "PENDING";
                const blockId = inv.blockId ?? inv.blockNumber ?? "—";
                return (
                  <motion.tr
                    key={inv._id || inv.invoiceNumber || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{inv.vendor}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {inv.poNumber} / {inv.grnNumber || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          fraudScore >= 60 ? "text-danger-500" : fraudScore >= 30 ? "text-warning-500" : "text-success-500"
                        }`}
                      >
                        {fraudScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={paymentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <BlockLink blockId={blockId} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-ghost !p-1.5" onClick={() => setViewInvoice(inv)} title="View">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Invoice Modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Vendor Invoice">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="field-label">Linked Purchase Order</label>
            <select required className="input-field" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value, grnNumber: "" })}>
              <option value="">Select a PO...</option>
              {pos.map((po) => (
                <option key={po._id} value={po.poNumber}>
                  {po.poNumber} — {po.vendor} ({formatCurrency(po.totalAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Linked GRN (optional)</label>
            <select className="input-field" value={form.grnNumber} onChange={(e) => setForm({ ...form, grnNumber: e.target.value })}>
              <option value="">No GRN linked</option>
              {availableGrns.map((g) => (
                <option key={g._id} value={g.grnNumber}>
                  {g.grnNumber} (received {g.quantityReceived})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Vendor</label>
            <input
              required
              className="input-field"
              value={form.vendor || selectedPO?.vendor || ""}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="Vendor / company name"
            />
          </div>

          <div>
            <label className="field-label">Invoice Amount ($)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.invoiceAmount}
              onChange={(e) => setForm({ ...form, invoiceAmount: e.target.value })}
              placeholder="Enter invoice amount"
            />
          </div>

          <div>
            <label className="field-label">Upload PDF</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-slate-700 dark:text-slate-400">
              <FileUp size={18} />
              {file ? file.name : "Click to select a PDF invoice"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>

          {error && <p className="text-sm font-medium text-danger-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Validating on-chain..." : "Submit Invoice"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal open={Boolean(viewInvoice)} onClose={() => setViewInvoice(null)} title={viewInvoice?.invoiceNumber} size="lg">
        {viewInvoice && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Detail label="Vendor" value={viewInvoice.vendor} />
              <Detail label="PO" value={viewInvoice.poNumber} />
              <Detail label="GRN" value={viewInvoice.grnNumber || "—"} />
              <Detail label="Amount" value={formatCurrency(viewInvoice.invoiceAmount)} />
              <Detail label="Status" value={<StatusBadge status={viewInvoice.status} />} />
              <Detail label="Payment" value={<StatusBadge status={viewInvoice.paymentStatus} />} />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Three-Way Match Result</p>
              <div className="space-y-2">
                {viewInvoice.validation.steps.map((s) => (
                  <div key={s.key} className="flex items-center gap-2 text-xs">
                    {s.passed ? <CheckCircle2 size={14} className="text-success-500" /> : <XCircle size={14} className="text-danger-500" />}
                    <span className="font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
                    <span className="text-slate-400">— {s.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                viewInvoice.fraud.score >= 60
                  ? "border-danger-500/30 bg-danger-500/5"
                  : viewInvoice.fraud.score >= 30
                  ? "border-warning-500/30 bg-warning-500/5"
                  : "border-success-500/30 bg-success-500/5"
              }`}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fraud Score: {viewInvoice.fraud.score} / 100 — {viewInvoice.fraud.recommendation}
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {viewInvoice.fraud.reasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>

            {canDecide && (viewInvoice.status === "Pending" || viewInvoice.status === "Manual Review") && (
              <div className="flex gap-2">
                <button className="btn-primary flex-1 !bg-none !bg-success-600" onClick={() => handleDecision(viewInvoice, "Approve")}>
                  <CheckCircle2 size={16} /> Approve
                </button>
                <button className="btn-primary flex-1 !bg-none !bg-danger-600" onClick={() => handleDecision(viewInvoice, "Reject")}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}

            {canDecide && viewInvoice.status === "Approved" && viewInvoice.paymentStatus !== "Paid" && (
              <button className="btn-primary w-full" onClick={() => handlePay(viewInvoice)}>
                <Wallet size={16} /> Release Payment
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
