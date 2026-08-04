const STYLES = {
  Approved: "bg-success-500/10 text-success-600 dark:text-success-400",
  Closed: "bg-success-500/10 text-success-600 dark:text-success-400",
  Confirmed: "bg-success-500/10 text-success-600 dark:text-success-400",
  Paid: "bg-success-500/10 text-success-600 dark:text-success-400",
  Rejected: "bg-danger-500/10 text-danger-600 dark:text-danger-400",
  Failed: "bg-danger-500/10 text-danger-600 dark:text-danger-400",
  Pending: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  "Manual Review": "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  "Partially Received": "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  Open: "bg-brand-500/10 text-brand-600 dark:text-brand-300",
  Unpaid: "bg-slate-200/70 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  Low: "bg-success-500/10 text-success-600 dark:text-success-400",
  Medium: "bg-warning-500/10 text-warning-600 dark:text-warning-400",
  High: "bg-danger-500/10 text-danger-600 dark:text-danger-400",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-slate-200/70 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
  return (
    <span className={`badge ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
