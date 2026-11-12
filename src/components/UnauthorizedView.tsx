import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { ShieldAlert, LogOut, ArrowLeft } from "lucide-react";
import { SUPER_ADMIN_EMAIL } from "../firebase";

export const UnauthorizedView: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Unauthorized Access</h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          You are authenticated with <span className="text-slate-200 font-mono">{user?.email}</span>,
          but this email address is not mapped to any active institute or the Super Admin role.
        </p>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs mb-6 text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-300">How to resolve:</p>
          <p>• If you are an Institute Admin, ask Super Admin to register your email.</p>
          <p>• If you are Super Admin, ensure your email matches: <span className="text-teal-400 font-mono">{SUPER_ADMIN_EMAIL}</span>.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign In with Different Email
          </button>
        </div>
      </div>
    </div>
  );
};
