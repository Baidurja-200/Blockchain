import { motion } from "framer-motion";

/** Semi-circular risk score gauge (0-100), color-coded by severity band. */
export default function RiskGauge({ score = 0, size = 220 }) {
  const radius = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const color = clamped >= 60 ? "#ef4444" : clamped >= 30 ? "#f59e0b" : "#22c55e";
  const label = clamped >= 60 ? "High Risk" : clamped >= 30 ? "Medium Risk" : "Low Risk";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-800 dark:fill-white" style={{ fontSize: 34, fontWeight: 800 }}>
          {clamped}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11, fontWeight: 600 }}>
          / 100
        </text>
      </svg>
      <span className="mt-1 rounded-full px-3 py-1 text-xs font-bold" style={{ color, backgroundColor: `${color}1a` }}>
        {label}
      </span>
    </div>
  );
}
