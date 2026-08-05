import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Blocks, ShieldCheck, ShieldAlert, Link2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import { listBlocks, verifyChain } from "../services/blockchainService";
import { formatDateTime, truncateHash } from "../utils/format";

const TYPE_COLORS = {
  GENESIS: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  PURCHASE_ORDER: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  PO_AMENDED: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  GRN: "bg-accent-500/10 text-accent-600 dark:text-accent-400",
  INVOICE: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  VALIDATION: "bg-success-500/10 text-success-600 dark:text-success-400",
  PAYMENT: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

export default function BlockchainExplorer() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchBlocks = () => {
      listBlocks()
        .then((data) => setBlocks([...data]))
        .finally(() => setLoading(false));
    };

    fetchBlocks();

    const handleSync = () => fetchBlocks();
    window.addEventListener("hashflow_cloud_sync", handleSync);
    window.addEventListener("hashflow_data_changed", handleSync);

    return () => {
      window.removeEventListener("hashflow_cloud_sync", handleSync);
      window.removeEventListener("hashflow_data_changed", handleSync);
    };
  }, []);

  /**
   * Deep link support: /blockchain?block=19 opens that block's details
   * directly, so a PO / GRN / invoice can link straight to its own block.
   */
  useEffect(() => {
    const target = searchParams.get("block");
    if (!target || blocks.length === 0) return;
    const match = blocks.find((b) => b.blockNumber === Number(target));
    if (match) setSelected(match);
  }, [searchParams, blocks]);

  const closeDetails = () => {
    setSelected(null);
    if (searchParams.has("block")) {
      searchParams.delete("block");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyChain();
      setVerification(result);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Blockchain Explorer"
        subtitle="Every transaction, permanently chained and hash-linked"
        action={
          <button className="btn-secondary" onClick={handleVerify} disabled={verifying}>
            <ShieldCheck size={16} /> {verifying ? "Verifying chain..." : "Verify Chain Integrity"}
          </button>
        }
      />

      {verification && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium ${
            verification.valid
              ? "border-success-500/30 bg-success-500/10 text-success-600 dark:text-success-400"
              : "border-danger-500/30 bg-danger-500/10 text-danger-600 dark:text-danger-400"
          }`}
        >
          {verification.valid ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          {verification.valid
            ? `Chain verified — all ${verification.totalBlocks} blocks are intact and correctly linked.`
            : `Chain integrity issue detected across ${verification.issues.length} block(s).`}
        </motion.div>
      )}

      {loading ? (
        <Loader label="Loading blockchain..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {blocks.map((block, i) => {
            const txType = block.transactionType || block.type || "GENESIS";
            const displayType = String(txType).replace(/_/g, " ");
            const status = block.status || "CONFIRMED";
            const refId = block.referenceId || block.payload?.poNumber || block.payload?.invoiceNumber || block.payload?.grnNumber || "SYS-00";

            return (
              <motion.button
                key={block._id || block.blockNumber || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
                onClick={() => setSelected(block)}
                className="glass-card group p-5 text-left transition-transform hover:-translate-y-1"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      <Blocks size={15} />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Block #{block.blockNumber}</span>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <span className={`badge mb-3 ${TYPE_COLORS[txType] || "bg-slate-100 text-slate-600"}`}>
                  {displayType}
                </span>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 text-slate-400">
                    <Link2 size={11} /> Ref: <span className="font-medium text-slate-600 dark:text-slate-300">{refId}</span>
                  </p>
                  <p className="mono text-slate-400">Hash: {truncateHash(block.hash, 12)}</p>
                  <p className="mono text-slate-400">Prev: {truncateHash(block.previousHash, 12)}</p>
                  <p className="text-slate-400">{formatDateTime(block.timestamp)}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={closeDetails} title={`Block #${selected?.blockNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <Detail label="Type" value={selected.transactionType || selected.type || "GENESIS"} />
              <Detail label="Status" value={<StatusBadge status={selected.status || "CONFIRMED"} />} />
              <Detail label="Reference" value={selected.referenceId || selected.payload?.poNumber || selected.payload?.invoiceNumber || selected.payload?.grnNumber || "SYS-00"} />
              <Detail label="Nonce" value={selected.nonce ?? 0} />
              <Detail label="Timestamp" value={formatDateTime(selected.timestamp)} />
            </div>

            <div>
              <p className="field-label">Current Hash</p>
              <p className="mono break-all rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selected.hash}</p>
            </div>
            <div>
              <p className="field-label">Previous Hash</p>
              <p className="mono break-all rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selected.previousHash}</p>
            </div>

            <div>
              <p className="field-label">Full Block JSON</p>
              <pre className="mono max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-emerald-300">
                {JSON.stringify(selected, null, 2)}
              </pre>
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
