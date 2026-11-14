import React, { useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { StatCard } from "../shared/StatCard";
import {
  Users,
  CreditCard,
  AlertTriangle,
  UserPlus,
  UserX,
  Award,
  ArrowUpRight,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate, getDaysDifference } from "../../utils/formatters";
import { Student } from "../../types";

interface DashboardProps {
  onNavigate: (tab: string, studentId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { config, students, payments, courses } = useInstitute();

  // Metrics computation
  const metrics = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === "Active");
    const dropouts = students.filter((s) => s.status === "Dropped");
    const certificatesIssued = students.filter((s) => s.certificate_status === "Issued");

    // Total Course Fees across Active & Completed students
    const totalCourseFees = students
      .filter((s) => s.status === "Active" || s.status === "Completed")
      .reduce((sum, s) => sum + Number(s.total_fees || 0), 0);

    // Total Collected from payments collection directly
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Total Pending Fees
    const totalPending = totalCourseFees - totalRevenue;
    const pendingFees = totalPending > 0 ? totalPending : 0;

    // Recovery Percent
    const recoveryPercent = totalCourseFees > 0
      ? Math.round((totalRevenue / totalCourseFees) * 100)
      : 0;

    // New admissions this month
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newAdmissionsMonth = students.filter((s) => s.admission_date?.startsWith(currentMonthPrefix)).length;

    // Monthly admissions for last 6 months
    const monthlyAdmissions: { monthLabel: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short" });
      const count = students.filter((s) => s.admission_date?.startsWith(prefix)).length;
      monthlyAdmissions.push({ monthLabel: label, count });
    }

    // Course distribution
    const courseCounts: Record<string, number> = {};
    activeStudents.forEach((s) => {
      const c = s.course_type || "Other";
      courseCounts[c] = (courseCounts[c] || 0) + 1;
    });

    // Students with fee due > 30 days
    const dueStudents = activeStudents
      .filter((s) => s.remaining_fees > 0)
      .map((s) => {
        // Find last payment date or fallback to admission_date
        const stdPayments = payments.filter((p) => p.student_id === s.id);
        const lastDate = stdPayments.length > 0 ? stdPayments[0].date : s.admission_date;
        const days = getDaysDifference(lastDate);
        return { student: s, daysOverdue: days };
      })
      .filter((item) => item.daysOverdue >= 30)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Recent 5 admissions
    const recentAdmissions = [...students]
      .sort((a, b) => new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime())
      .slice(0, 5);

    // Recent 5 payments
    const recentPayments = [...payments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return {
      activeCount: activeStudents.length,
      dropoutsCount: dropouts.length,
      certsCount: certificatesIssued.length,
      totalRevenue,
      pendingFees,
      recoveryPercent,
      newAdmissionsMonth,
      monthlyAdmissions,
      courseCounts,
      dueStudents: dueStudents.slice(0, 5),
      recentAdmissions,
      recentPayments,
    };
  }, [students, payments]);

  const maxMonthCount = Math.max(1, ...metrics.monthlyAdmissions.map((m) => m.count));
  const collectionRate = metrics.recoveryPercent;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
            {config?.reg_prefix} Portal Dashboard
          </span>
          <h1 className="text-2xl font-bold text-white mt-1.5 tracking-tight">
            {config?.name || "Institute Management"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time admissions, fee collection records, and batch analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("enroll")}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> New Admission
          </button>
          <button
            onClick={() => onNavigate("registry")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            Student Directory
          </button>
        </div>
      </div>

      {/* 6 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Students"
          value={metrics.activeCount}
          icon={Users}
          badge="Enrolled"
          badgeColor="teal"
          onClick={() => onNavigate("registry")}
        />

        <StatCard
          title="Collected Fees"
          value={formatCurrency(metrics.totalRevenue)}
          icon={CreditCard}
          badge={`${collectionRate}% Paid`}
          badgeColor="emerald"
          onClick={() => onNavigate("finance")}
        />

        <StatCard
          title="Pending Fees"
          value={formatCurrency(metrics.pendingFees)}
          icon={AlertTriangle}
          badge="Outstanding"
          badgeColor="amber"
          onClick={() => onNavigate("reminders")}
        />

        <StatCard
          title="New This Month"
          value={metrics.newAdmissionsMonth}
          icon={UserPlus}
          badge="Admissions"
          badgeColor="blue"
          onClick={() => onNavigate("enroll")}
        />

        <StatCard
          title="Certificates"
          value={metrics.certsCount}
          icon={Award}
          badge="Issued"
          badgeColor="teal"
        />

        <StatCard
          title="Dropouts"
          value={metrics.dropoutsCount}
          icon={UserX}
          badge="Archived"
          badgeColor="rose"
        />
      </div>

      {/* Visual Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Admissions Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Admissions Trend
                </h3>
                <p className="text-xs text-slate-400">Monthly enrollments over past 6 months</p>
              </div>
              <TrendingUp className="w-4 h-4 text-teal-400" />
            </div>

            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {metrics.monthlyAdmissions.map((item, idx) => {
                const heightPct = Math.max(12, Math.round((item.count / maxMonthCount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-mono font-bold text-teal-400 opacity-80 group-hover:opacity-100 transition">
                      {item.count}
                    </span>
                    <div className="w-full bg-slate-950 rounded-t-lg overflow-hidden h-32 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-md group-hover:from-teal-500 group-hover:to-teal-300 transition-all duration-300"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">{item.monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fee Collection vs Pending Donut Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Fee Recovery Ratio
                </h3>
                <p className="text-xs text-slate-400">Total collection against pending dues</p>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="flex items-center justify-center py-4">
              {/* Radial circle representation */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress stroke */}
                  <path
                    className="text-teal-400"
                    strokeDasharray={`${collectionRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-2xl font-bold text-white font-mono">{collectionRate}%</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Recovered
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Received</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {formatCurrency(metrics.totalRevenue)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Outstanding</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {formatCurrency(metrics.pendingFees)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Course-Wise Student Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Course Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-4">Active enrolled students by domain</p>

            <div className="space-y-3">
              {Object.keys(metrics.courseCounts).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No students currently enrolled.</p>
              ) : (
                Object.entries(metrics.courseCounts).map(([courseName, count]) => {
                  const pct = Math.round((count / (metrics.activeCount || 1)) * 100);
                  return (
                    <div key={courseName} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-[200px]">
                          {courseName}
                        </span>
                        <span className="font-mono text-teal-400 font-semibold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Sections (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last 5 Admissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Recent Admissions
            </h3>
            <button
              onClick={() => onNavigate("registry")}
              className="text-[11px] text-teal-400 hover:text-teal-300 transition"
            >
              View Roster →
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.recentAdmissions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No admissions yet.</p>
            ) : (
              metrics.recentAdmissions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onNavigate("student_detail", s.id)}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-teal-500/40 cursor-pointer transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-teal-300 transition">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {s.course_type} • <span className="font-mono text-teal-400">{s.registration_number}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatDate(s.admission_date)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                      {formatCurrency(s.admission_fees)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Last 5 Payments Received */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Recent Payments Received
            </h3>
            <button
              onClick={() => onNavigate("finance")}
              className="text-[11px] text-teal-400 hover:text-teal-300 transition"
            >
              Finance Ledger →
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.recentPayments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No payments recorded.</p>
            ) : (
              metrics.recentPayments.map((p) => {
                const s = students.find((std) => std.id === p.student_id);
                return (
                  <div
                    key={p.id}
                    onClick={() => s && onNavigate("student_detail", s.id)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition">
                        {s ? s.name : "Student"}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {p.type} • <span className="text-slate-300">{p.mode}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold block">
                        +{formatCurrency(p.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{formatDate(p.date)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Fee Due > 30 Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Overdue Fees (&gt;30d)
            </h3>
            <button
              onClick={() => onNavigate("reminders")}
              className="text-[11px] text-teal-400 hover:text-teal-300 transition"
            >
              Reminders →
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.dueStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No students overdue &gt; 30 days.</p>
            ) : (
              metrics.dueStudents.map(({ student, daysOverdue }) => (
                <div
                  key={student.id}
                  onClick={() => onNavigate("student_detail", student.id)}
                  className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 hover:border-amber-500/50 cursor-pointer transition flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition">
                      {student.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {student.phone} • <span className="text-rose-400 font-bold">{daysOverdue} days</span> overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-amber-400 font-bold block">
                      {formatCurrency(student.remaining_fees)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Balance</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
