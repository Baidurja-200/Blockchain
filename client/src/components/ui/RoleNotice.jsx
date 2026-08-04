import { Eye } from "lucide-react";

/**
 * Small banner shown on pages where the current role can look but not act —
 * e.g. a Vendor viewing Purchase Orders, or an Auditor viewing Invoices.
 */
export default function RoleNotice({ role, allowedRole, capability }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-xs font-medium text-brand-700 dark:text-brand-300">
      <Eye size={14} className="shrink-0" />
      You're signed in as <strong>{role}</strong> — only <strong>{allowedRole}</strong> can {capability}. You can still
      view everything below.
    </div>
  );
}
