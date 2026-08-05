import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Eye, FileText, Hash, Clock, Boxes, Blocks, Lock } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import RoleNotice from "../components/ui/RoleNotice";
import BlockLink from "../components/ui/BlockLink";
import { listPOs, createPO } from "../services/poService";
import { formatCurrency, formatDate, formatDateTime, truncateHash } from "../utils/format";
import { useAuth } from "../context/AuthContext";

const EMPTY_FORM = { vendor: "", product: "", quantity: "", unitPrice: "", deliveryDate: "" };

export default function PurchaseOrders() {
  const { user } = useAuth();
  const canManage = user?.role === "Procurement Officer";
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successPO, setSuccessPO] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    listPOs()
      .then(setPOs)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalAmount = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const po = await createPO(form);
      setPOs((prev) => [po, ...prev]);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setSuccessPO(po);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and track purchase orders anchored on the blockchain"
        action={
          canManage && (
            <button
              className="btn-primary"
              onClick={() => {
                setForm(EMPTY_FORM);
                setCreateOpen(true);
              }}
            >
              <Plus size={16} /> Create PO
            </button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-3.5 text-xs text-brand-600 dark:text-brand-300">
        <Lock size={16} className="shrink-0 text-brand-500" />
        <span>
          <strong>Immutable Ledger Protection:</strong> Once recorded on the blockchain, purchase orders, goods receipts, and invoices are permanently anchored and cannot be edited or modified. To make corrections, issue a new PO or amendment.
        </span>
      </div>

      {!canManage && <RoleNotice role={user?.role} allowedRole="Procurement Officer" capability="create purchase orders" />}

      {loading ? (
        <Loader label="Loading purchase orders..." />
      ) : pos.length === 0 ? (
        <div className="glass-card">
          <EmptyState icon={FileText} title="No purchase orders yet" subtitle="Create your first PO to get started." />
        </div>
      ) : (
        <div className="table-shell overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">PO Number</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Delivery Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Block</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pos.map((po, i) => (
                <motion.tr
                  key={po._id || po.poNumber || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.vendor}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{po.product}</td>
                  <td className="px-4 py-3">{po.quantity}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(po.totalAmount)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(po.deliveryDate)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="px-4 py-3">
                    <BlockLink blockId={po.blockId ?? po.blockNumber} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-ghost !p-1.5" onClick={() => setViewPO(po)} title="View">
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Purchase Order">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Vendor</label>
              <input required className="input-field" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. NovaTech Industrial Supplies" />
            </div>
            <div>
              <label className="field-label">Product</label>
              <input required className="input-field" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="e.g. Server Rack Enclosures" />
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input required type="number" min="1" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Unit Price ($)</label>
              <input required type="number" min="0" step="0.01" className="input-field" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Total Amount</label>
              <input disabled className="input-field opacity-70" value={formatCurrency(totalAmount)} />
            </div>
            <div>
              <label className="field-label">Delivery Date</label>
              <input required type="date" className="input-field" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm font-medium text-danger-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Anchoring on-chain..." : "Create & Anchor on Chain"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View PO Modal */}
      <Modal open={Boolean(viewPO)} onClose={() => setViewPO(null)} title={viewPO?.poNumber}>
        {viewPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Vendor" value={viewPO.vendor} />
              <Detail label="Product" value={viewPO.product} />
              <Detail label="Quantity" value={viewPO.quantity} />
              <Detail label="Unit Price" value={formatCurrency(viewPO.unitPrice)} />
              <Detail label="Total Amount" value={formatCurrency(viewPO.totalAmount)} />
              <Detail label="Delivery Date" value={formatDate(viewPO.deliveryDate)} />
              <Detail label="Status" value={<StatusBadge status={viewPO.status} />} />
              <Detail label="Created" value={formatDateTime(viewPO.createdAt)} />
            </div>

            <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                <Boxes size={13} /> Blockchain Anchor
              </p>
              <div className="space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5 mono text-slate-500 dark:text-slate-400">
                  <Hash size={12} /> Block #{viewPO.blockId ?? viewPO.blockNumber ?? "—"}
                </p>
                <p className="mono truncate text-slate-500 dark:text-slate-400">{viewPO.txHash ?? viewPO.blockHash ?? "—"}</p>
                <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock size={12} /> {formatDateTime(viewPO.blockTimestamp ?? viewPO.createdAt)}
                </p>
              </div>
              {(viewPO.blockId ?? viewPO.blockNumber) !== null && (viewPO.blockId ?? viewPO.blockNumber) !== undefined && (
                <Link to={`/blockchain?block=${viewPO.blockId ?? viewPO.blockNumber}`} className="btn-secondary mt-3 w-full !py-2 text-xs">
                  <Blocks size={14} /> View this block on the chain
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Post-create success summary */}
      <Modal open={Boolean(successPO)} onClose={() => setSuccessPO(null)} title="Purchase Order Anchored" size="sm">
        {successPO && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{successPO.poNumber}</span> has been recorded and mined
              into the blockchain.
            </p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800/60">
              <Row label="Timestamp" value={formatDateTime(successPO.blockTimestamp ?? successPO.createdAt)} />
              <Row label="Block ID" value={`#${successPO.blockId ?? successPO.blockNumber}`} />
              <Row label="Hash" value={truncateHash(successPO.txHash ?? successPO.blockHash, 14)} mono />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setSuccessPO(null)}>
                Done
              </button>
              <Link to={`/blockchain?block=${successPO.blockId ?? successPO.blockNumber}`} className="btn-primary flex-1">
                <Blocks size={15} /> View block #{successPO.blockId ?? successPO.blockNumber}
              </Link>
            </div>
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

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold text-slate-700 dark:text-slate-200 ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}
