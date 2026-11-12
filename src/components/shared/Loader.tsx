import React from "react";
import { Loader2 } from "lucide-react";

interface LoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export const Loader: React.FC<LoaderProps> = ({ message = "Loading...", size = "md" }) => {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-teal-400">
      <Loader2 className={`${iconSizes[size]} animate-spin text-teal-500`} />
      {message && <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{message}</p>}
    </div>
  );
};

export const FullPageLoader: React.FC<{ message?: string }> = ({ message = "Loading Portal..." }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-200">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shadow-2xl shadow-teal-500/20">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 opacity-20 blur-md -z-10" />
      </div>
      <h2 className="text-base font-semibold text-white tracking-wide">{message}</h2>
      <p className="text-xs text-slate-500 mt-1">Multi-Institute Admission & Fees Management</p>
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-slate-800 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-slate-800 rounded w-2/3"></div>
    </div>
  );
};
