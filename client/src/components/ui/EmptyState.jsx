export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {Icon && (
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
          <Icon size={26} />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
