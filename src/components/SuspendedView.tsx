import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertOctagon, LogOut, Mail, PhoneCall, Clock, CheckCircle2 } from "lucide-react";

export const SuspendedView: React.FC = () => {
  const { logout, instituteConfig, user } = useAuth();

  const isTrialExpired = instituteConfig?.plan === "trial" && (instituteConfig?.trial_expired || instituteConfig?.subscription_expired);
  const isSubExpired = instituteConfig?.subscription_expired && instituteConfig?.plan !== "trial";

  if (isTrialExpired || isSubExpired) {
    const planName = isTrialExpired ? "Trial" : (instituteConfig?.plan === "pro" ? "Pro" : "Standard");
    const endDate = instituteConfig?.subscription_end_date || instituteConfig?.trial_end_date || "";
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100">
          
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {isTrialExpired ? "Free Trial Ended" : "Subscription Expired"}
          </h1>
          
          <p className="text-slate-400 mb-2 text-xs sm:text-sm">
            Your {planName} plan for
            <span className="text-white font-semibold">
              {" "}{instituteConfig?.name}{" "}
            </span>
            expired on{" "}
            <span className="text-amber-400">
              {endDate ? new Date(endDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric"
              }) : "recently"}
            </span>.
          </p>

          <p className="text-slate-400 mb-6 text-xs">
            Your data is safe and will remain accessible once you renew.
          </p>

          {/* Upgrade options */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left">
              <p className="text-white font-bold text-base">₹499<span className="text-slate-400 text-[11px] font-normal">/mo</span></p>
              <p className="text-teal-400 font-semibold text-xs mt-0.5">Standard Plan</p>
              <p className="text-slate-500 text-[10px] mt-1">₹4,999/yr (Save 17%)</p>
            </div>
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-left">
              <p className="text-white font-bold text-base">₹999<span className="text-slate-400 text-[11px] font-normal">/mo</span></p>
              <p className="text-teal-400 font-semibold text-xs mt-0.5">Pro Plan ⭐</p>
              <p className="text-slate-500 text-[10px] mt-1">₹9,999/yr (Save 17%)</p>
            </div>
          </div>

          <p className="text-slate-400 text-xs mb-4">
            Contact your administrator to renew access:
          </p>

          <a 
            href="https://wa.me/919669887124" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full gap-2 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-green-500/20 mb-3"
          >
            WhatsApp to Renew →
          </a>
          
          <button
            onClick={logout}
            className="block mx-auto text-slate-500 hover:text-slate-300 text-xs transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

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
