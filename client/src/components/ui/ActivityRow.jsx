import { FileText, FilePenLine, PackageCheck, Receipt, CheckCircle2, XCircle, Wallet, ShieldAlert } from "lucide-react";
import { formatDateTime } from "../../utils/format";

const ICONS = {
  PO_CREATED: FileText,
  PO_AMENDED: FilePenLine,
  GRN_CREATED: PackageCheck,
  INVOICE_UPLOADED: Receipt,
  INVOICE_APPROVED: CheckCircle2,
  INVOICE_REJECTED: XCircle,
  PAYMENT_RELEASED: Wallet,
  FRAUD_FLAGGED: ShieldAlert,
};

const SEVERITY_COLORS = {
  info: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  success: "bg-success-500/10 text-success-600 dark:text-success-400",
  warning: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  danger: "bg-danger-500/10 text-danger-600 dark:text-danger-400",
};

export default function ActivityRow({ activity }) {
  const Icon = ICONS[activity.type] || FileText;
  const colorCls = SEVERITY_COLORS[activity.severity] || SEVERITY_COLORS.info;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorCls}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{activity.message}</p>
        <p className="text-xs text-slate-400">
          {activity.actor} &middot; {formatDateTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}
