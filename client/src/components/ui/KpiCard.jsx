import { motion } from "framer-motion";

export default function KpiCard({ icon: Icon, label, value, sub, accent = "brand", delay = 0 }) {
  const accentMap = {
    brand: "from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-300",
    accent: "from-accent-500/15 to-accent-500/5 text-accent-600 dark:text-accent-400",
    success: "from-success-500/15 to-success-500/5 text-success-600 dark:text-success-400",
    warning: "from-warning-500/15 to-warning-500/5 text-warning-600 dark:text-warning-400",
    danger: "from-danger-500/15 to-danger-500/5 text-danger-600 dark:text-danger-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl bg-gradient-to-br p-2.5 ${accentMap[accent]}`}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
