import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  badge?: string;
  badgeColor?: "teal" | "emerald" | "amber" | "rose" | "blue";
  variant?: "default" | "gradient" | "highlight";
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  badge,
  badgeColor = "teal",
  variant = "default",
  onClick,
}) => {
  const badgeClasses = {
    teal: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  }[badgeColor];

  const variantClasses = {
    default: "bg-slate-900 border-slate-800 hover:border-slate-700",
    gradient: "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 hover:border-teal-500/40",
    highlight: "bg-slate-900/90 border-teal-500/30 shadow-lg shadow-teal-500/5",
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl border transition-all duration-200 group ${variantClasses} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 group-hover:bg-teal-500/10 border border-slate-700/60 group-hover:border-teal-500/30 flex items-center justify-center text-slate-300 group-hover:text-teal-400 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  );
};
