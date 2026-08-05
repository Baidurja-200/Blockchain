import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Sparkles } from "lucide-react";

export default function IntroSplash({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-slate-950 p-6 text-white"
    >
      {/* Background ambient radial glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-brand-600/30 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-accent-500/25 blur-[120px]"
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Top indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md"
      >
        <Sparkles size={14} className="animate-pulse text-brand-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
          Cryptographic Ledger
        </span>
      </motion.div>

      {/* Main Logo & Title Animation */}
      <div className="z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-brand-500 via-indigo-600 to-accent-500 p-0.5 shadow-2xl shadow-brand-500/40"
        >
          <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-slate-950/80 backdrop-blur-md">
            <Link2 size={44} className="text-white" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-3xl border border-dashed border-accent-400/40"
          />
        </motion.div>

        {/* Brand Name reveal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 bg-gradient-to-r from-white via-slate-100 to-accent-300 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl"
        >
          Hashflow
        </motion.h1>

        {/* Tagline reveal */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-2 text-sm font-semibold uppercase tracking-widest text-brand-400 sm:text-base"
        >
          Blockchain Three-Way Match &amp; Verification
        </motion.p>

        {/* Animated Progress Bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "16rem" }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/10"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-accent-400"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
        <span className="mt-2 text-[10px] font-mono text-slate-400">Initialising Ledger Engine... {progress}%</span>
      </div>

      {/* Team Credits Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="z-10 text-center"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-300">
            Group project by{" "}
            <span className="font-bold text-white">Baidurja Biswas</span>,{" "}
            <span className="font-bold text-white">Rahul Khurana</span>,{" "}
            <span className="font-bold text-white">Khushbu Gandhi</span>,{" "}
            <span className="font-bold text-white">Vanshika Maheshwari</span>,{" "}
            <span className="font-bold text-white">Abhishek Gore</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
