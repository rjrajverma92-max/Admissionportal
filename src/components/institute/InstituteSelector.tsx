import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Building2, ArrowRight, LogOut, ShieldAlert } from "lucide-react";

export const InstituteSelector: React.FC = () => {
  const { user, myInstitutes, selectInstitute, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-teal-400">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Select Institute</h1>
          <div className="text-center text-xs text-slate-500 mt-1">
            <span className="bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full">
              Pro Plan — Multi-Institute Access
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Your login email ({user?.email}) is associated with multiple institutes. Please select which institute you want to access.
          </p>
        </div>

        <div className="space-y-3 mb-6 max-h-80 overflow-y-auto pr-1">
          {myInstitutes.map((inst) => (
            <div
              key={inst.institute_id}
              onClick={() => selectInstitute(inst.institute_id)}
              className="bg-slate-950/60 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 rounded-xl p-4 transition cursor-pointer flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                {inst.logo_url ? (
                  <img
                    src={inst.logo_url}
                    alt={inst.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                    {inst.reg_prefix ? inst.reg_prefix.slice(0, 2) : "IN"}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-teal-400 transition">
                    {inst.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    City: <span className="text-slate-300">{inst.city || "N/A"}</span> • Prefix:{" "}
                    <span className="font-mono text-teal-400">{inst.reg_prefix}</span>
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {myInstitutes.length} institutes available
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
