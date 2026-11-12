import React, { useState, useEffect, useMemo } from "react";
import { InstituteConfig } from "../../types";
import { StatCard } from "../shared/StatCard";
import {
  Building2,
  Users,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Shield,
  Layers,
  Bug,
} from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { db, isFirebaseConfigured } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

interface SuperAdminDashboardProps {
  institutes: InstituteConfig[];
  onOpenAddModal: () => void;
  onSelectTab: (tab: "institutes" | "dashboard" | "debug") => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  institutes,
  onOpenAddModal,
  onSelectTab,
}) => {
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  // Status breakdown
  const { activeCount, suspendedCount, trialCount } = useMemo(() => {
    let active = 0;
    let suspended = 0;
    let trial = 0;

    institutes.forEach((i) => {
      if (i.status === "active") active++;
      else if (i.status === "suspended") suspended++;
      else if (i.status === "trial") trial++;
    });

    return { activeCount: active, suspendedCount: suspended, trialCount: trial };
  }, [institutes]);

  // Aggregate student and revenue telemetry from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !db || institutes.length === 0) {
      setTotalStudents(0);
      setTotalRevenue(0);
      return;
    }

    let isMounted = true;

    async function loadTelemetry() {
      try {
        let studentsCount = 0;
        let revSum = 0;

        await Promise.all(
          institutes.map(async (inst) => {
            if (!db) return;
            try {
              const studentsSnap = await getDocs(
                collection(db, "institutes", inst.institute_id, "students")
              );
              studentsSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (!data?.is_deleted) studentsCount++;
              });

              const paymentsSnap = await getDocs(
                collection(db, "institutes", inst.institute_id, "payments")
              );
              paymentsSnap.forEach((docSnap) => {
                const data = docSnap.data();
                revSum += Number(data?.amount || 0);
              });
            } catch (instErr) {
              // Silently handle per-institute permission notices
            }
          })
        );

        if (isMounted) {
          setTotalStudents(studentsCount);
          setTotalRevenue(revSum);
        }
      } catch (err) {
        console.warn("Telemetry fetch notice:", err);
      }
    }

    loadTelemetry();

    return () => {
      isMounted = false;
    };
  }, [institutes]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" /> Super Admin Master Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Network Overview & Multi-Tenant Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Manage all autonomous institutes, provision new branches, monitor global fee collections,
              and enforce compliance across all isolated tenant partitions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/25 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" /> Add New Institute
            </button>
            <button
              onClick={() => onSelectTab("institutes")}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-2"
            >
              <Layers className="w-4 h-4" /> Manage Institutes
            </button>
            <button
              onClick={() => onSelectTab("debug")}
              className="px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition flex items-center gap-2"
            >
              <Bug className="w-4 h-4" /> Debug Tools
            </button>
          </div>
        </div>

        {/* Glow Background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Institutes"
          value={institutes.length}
          icon={Building2}
          subtext={`${activeCount} active • ${suspendedCount} suspended`}
          badge={`${activeCount} Online`}
          badgeColor="teal"
          variant="gradient"
        />

        <StatCard
          title="Global Students"
          value={totalStudents}
          icon={Users}
          subtext="Enrolled across all subcollections"
          badge="Live Roster"
          badgeColor="emerald"
        />

        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={CreditCard}
          subtext="Aggregate collections to date"
          badge="Gross"
          badgeColor="blue"
        />

        <StatCard
          title="Active Subscriptions"
          value={`${activeCount} / ${institutes.length}`}
          icon={CheckCircle2}
          subtext={`${trialCount} in trial evaluation`}
          badge={suspendedCount > 0 ? `${suspendedCount} Suspended` : "All Healthy"}
          badgeColor={suspendedCount > 0 ? "rose" : "teal"}
        />
      </div>

      {/* Plan Breakdown & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
            <span>Tier Distribution</span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </h3>
          <div className="space-y-3">
            {[
              {
                name: "Pro Tier",
                plan: "pro",
                count: institutes.filter((i) => i.plan === "pro").length,
                color: "bg-teal-500",
                desc: "Full features, unlimited courses & finance",
              },
              {
                name: "Standard Tier",
                plan: "standard",
                count: institutes.filter((i) => i.plan === "standard").length,
                color: "bg-blue-500",
                desc: "Core admission, reminders & certs",
              },
              {
                name: "Basic Tier",
                plan: "basic",
                count: institutes.filter((i) => i.plan === "basic").length,
                color: "bg-slate-600",
                desc: "Basic registration & student list",
              },
            ].map((tier) => {
              const pct = institutes.length > 0 ? Math.round((tier.count / institutes.length) * 100) : 0;
              return (
                <div key={tier.plan} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-white">{tier.name}</span>
                    <span className="font-mono text-slate-400 font-bold">
                      {tier.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${tier.color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500">{tier.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Institutes Quick Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Active Institute Directory
            </h3>
            <button
              onClick={() => onSelectTab("institutes")}
              className="text-xs text-teal-400 hover:text-teal-300 transition"
            >
              View All ({institutes.length}) →
            </button>
          </div>

          <div className="space-y-2.5">
            {institutes.slice(0, 5).map((inst) => (
              <div
                key={inst.institute_id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">
                    {inst.reg_prefix.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{inst.name}</h4>
                    <p className="text-xs text-slate-400">
                      {inst.city} • Prefix: <span className="font-mono text-teal-300">{inst.reg_prefix}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                      inst.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {inst.status}
                  </span>
                  <span className="text-[11px] text-slate-400 uppercase font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {inst.plan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
