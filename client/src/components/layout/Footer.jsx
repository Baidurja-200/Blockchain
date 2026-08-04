import { Link } from "react-router-dom";
import { Sparkles, Code2, ArrowRight } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Baidurja Biswas", color: "from-indigo-500 to-purple-600" },
  { name: "Rahul Khurana", color: "from-cyan-500 to-blue-600" },
  { name: "Khushbu Gandhi", color: "from-emerald-500 to-teal-600" },
  { name: "Vanshika Maheshwari", color: "from-rose-500 to-pink-600" },
  { name: "Abhishek Gore", color: "from-amber-500 to-orange-600" },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/60 py-8 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Main credits banner */}
        <div className="flex flex-col items-center text-center">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-600 transition-all hover:bg-brand-500 hover:text-white dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
          >
            <Sparkles size={14} className="animate-pulse" />
            Group Project — Read About Us <ArrowRight size={12} />
          </Link>
          <h3 className="mt-2 text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            Hashflow — Blockchain Three-Way Verification Platform
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Developed by
          </p>
        </div>

        {/* Team member pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="group flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-brand-500/50"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr ${member.color} text-[10px] font-black text-white shadow-sm`}
              >
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <span className="text-xs font-bold text-slate-700 transition-colors group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">
                {member.name}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom copyright / info row */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/60 pt-4 text-center text-xs text-slate-500 dark:border-slate-800/60 dark:text-slate-500 sm:w-full sm:flex-row">
          <div className="flex items-center gap-1.5 font-medium">
            <Code2 size={14} className="text-brand-500" />
            <span>Blockchain & Enterprise Systems Project</span>
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">
            Group project by Baidurja Biswas, Rahul Khurana, Khushbu Gandhi, Vanshika Maheshwari, Abhishek Gore
          </p>
        </div>
      </div>
    </footer>
  );
}
