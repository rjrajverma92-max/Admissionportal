import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertOctagon, LogOut, Mail, PhoneCall } from "lucide-react";

export const SuspendedView: React.FC = () => {
  const { logout, instituteConfig, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Account Suspended</h2>
        <p className="text-sm font-semibold text-rose-400 mb-3">
          {instituteConfig?.name || "Institute Portal Access"}
        </p>

        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Your institute account has been temporarily suspended by the Super Administrator.
          All student enrollment, fee collection, and records access are currently locked.
        </p>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left mb-6 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="w-4 h-4 text-teal-400" />
            <span>Support: support@admissionportal.edu</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <PhoneCall className="w-4 h-4 text-teal-400" />
            <span>Helpdesk: +91 98261 00000</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Logged in as: <span className="text-slate-400">{user?.email}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};
