import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center dark:bg-[#0b1120]">
      <div className="rounded-2xl bg-brand-500/10 p-4 text-brand-500">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">404 — Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
