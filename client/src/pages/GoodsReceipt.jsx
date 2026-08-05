import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, PackageCheck, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import RoleNotice from "../components/ui/RoleNotice";
import BlockLink from "../components/ui/BlockLink";
import { listGRNs, createGRN } from "../services/grnService";
import { listPOs } from "../services/poService";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";

const EMPTY_FORM = { poNumber: "", quantityReceived: "", warehouseOfficer: "", remarks: "" };

export default function GoodsReceipt() {
  const { user } = useAuth();
  const canManage = user?.role === "Warehouse Officer";
  const [grns, setGrns] = useState([]);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, warehouseOfficer: user?.name || "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([listGRNs(), listPOs()])
      .then(([g, p]) => {
        setGrns(g);
        setPOs(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const selectedPO = pos.find((p) => p.poNumber === form.poNumber);
  const alreadyReceived = selectedPO
    ? grns.filter((g) => g.poNumber === selectedPO.poNumber).reduce((sum, g) => sum + g.quantityReceived, 0)
    : 0;
  const remaining = selectedPO ? selectedPO.quantity - alreadyReceived : 0;

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const grn = await createGRN(form);
      setGrns((prev) => [grn, ...prev]);
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM, warehouseOfficer: user?.name || "" });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create GRN");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Record confirmed deliveries against purchase orders"
        action={
          canManage && (
            <button
              className="btn-primary"
              onClick={() => {
                setForm({ ...EMPTY_FORM, warehouseOfficer: user?.name || "" });
                setCreateOpen(true);
              }}
            >
              <Plus size={16} /> Create GRN
            </button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-3.5 text-xs text-brand-600 dark:text-brand-300">
        <Lock size={16} className="shrink-0 text-brand-500" />
        <span>
          <strong>Immutable Ledger Protection:</strong> Goods Receipt Notes are permanently recorded on-chain once submitted and cannot be edited. Corrections require generating a new GRN entry.
        </span>
      </div>

      {!canManage && <RoleNotice role={user?.role} allowedRole="Warehouse Officer" capability="record goods receipts" />}

      {loading ? (
        <Loader label="Loading goods receipt notes..." />
      ) : grns.length === 0 ? (
        <div className="glass-card">
          <EmptyState icon={PackageCheck} title="No GRNs recorded yet" subtitle="Record a delivery once goods arrive at the warehouse." />
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">GRN Number</th>
                <th className="px-4 py-3 font-semibold">Linked PO</th>
                <th className="px-4 py-3 font-semibold">Qty Received</th>
                <th className="px-4 py-3 font-semibold">Warehouse Officer</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {grns.map((g, i) => (
                <motion.tr
                  key={g._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{g.grnNumber}</td>
                  <td className="px-4 py-3">{g.poNumber}</td>
                  <td className="px-4 py-3">
                    {g.quantityReceived}
                    {g.isOverReceipt && (
                      <span className="badge ml-2 bg-danger-500/10 text-danger-600 dark:text-danger-400">
                        <AlertTriangle size={11} /> +{g.overReceiptBy} over
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{g.warehouseOfficer}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-500 dark:text-slate-400">{g.remarks || "-"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(g.createdAt)}</td>
                  <td className="px-4 py-3">
                    <BlockLink blockId={g.blockId} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Goods Receipt Note">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="field-label">Linked Purchase Order</label>
            <select required className="input-field" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value, quantityReceived: "" })}>
              <option value="">Select a PO...</option>
              {pos.map((po) => (
                <option key={po._id} value={po.poNumber} disabled={po.status === "Cancelled"}>
                  {po.poNumber} — {po.vendor} ({po.quantity} units)
                  {po.status === "Closed" ? " — already fully received" : po.status === "Cancelled" ? " — cancelled" : ""}
                </option>
              ))}
            </select>
            {selectedPO && (
              <p className="mt-1.5 text-xs text-slate-400">
                Ordered {selectedPO.quantity} units of {selectedPO.product} — {alreadyReceived} already received,{" "}
                <strong className="text-slate-600 dark:text-slate-300">{remaining} remaining</strong>
              </p>
            )}
          </div>

          <div>
            <label className="field-label">Quantity Received</label>
            <input
              required
              type="number"
              min="1"
              className="input-field"
              value={form.quantityReceived}
              onChange={(e) => setForm({ ...form, quantityReceived: e.target.value })}
            />
            {selectedPO && Number(form.quantityReceived) > remaining && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-500">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Over-receipt: {Number(form.quantityReceived) - remaining} more than the {remaining} still outstanding. This
                will be accepted, recorded on-chain, and flagged as a fraud indicator.
              </p>
            )}
            {selectedPO && Number(form.quantityReceived) > 0 && Number(form.quantityReceived) < remaining && (
              <p className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
                Partial delivery — {remaining - Number(form.quantityReceived)} units will still be outstanding.
              </p>
            )}
            {selectedPO && Number(form.quantityReceived) > 0 && Number(form.quantityReceived) === remaining && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-success-600 dark:text-success-400">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                Completes the order exactly — this check will pass.
              </p>
            )}
          </div>

          <div>
            <label className="field-label">Warehouse Officer</label>
            <input required className="input-field" value={form.warehouseOfficer} onChange={(e) => setForm({ ...form, warehouseOfficer: e.target.value })} />
          </div>

          <div>
            <label className="field-label">Remarks</label>
            <textarea
              rows={2}
              className="input-field resize-none"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Received in good condition"
            />
          </div>

          {error && <p className="text-sm font-medium text-danger-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Anchoring on-chain..." : "Record & Anchor on Chain"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
