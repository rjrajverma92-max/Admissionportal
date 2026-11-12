import React, { useState, useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { StatCard } from "../shared/StatCard";
import { ExpenseCategory, PaymentMode } from "../../types";
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
} from "../../utils/formatters";
import { cleanPhone10 } from "../../utils/validators";
import { getCurrentFinancialYearKey } from "../../utils/financialYear";
import Papa from "papaparse";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Plus,
  Trash2,
  MessageCircle,
  PieChart,
  FileText,
  Filter,
} from "lucide-react";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Faculty Salary",
  "Staff Salary",
  "Rent",
  "Electricity",
  "Internet",
  "Marketing",
  "Software Subscription",
  "Equipment Purchase",
  "Maintenance",
  "Miscellaneous",
];

export const Finance: React.FC = () => {
  const { config, students, payments, expenses, addExpense, deleteExpense } = useInstitute();
  const { success, error } = useToast();

  const [dateRangePreset, setDateRangePreset] = useState<
    "today" | "week" | "month" | "fy" | "custom"
  >("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Add Expense form state
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Miscellaneous");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expDate, setExpDate] = useState<string>(getTodayDateString());
  const [expNote, setExpNote] = useState<string>("");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Tab inside Finance: "overview" | "revenue" | "outstanding" | "expenses" | "pnl"
  const [activeFinanceTab, setActiveFinanceTab] = useState<
    "revenue" | "outstanding" | "expenses" | "pnl"
  >("revenue");

  // Compute date range limits
  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date();
    const todayStr = getTodayDateString();

    if (dateRangePreset === "today") {
      return { rangeStart: todayStr, rangeEnd: todayStr };
    }
    if (dateRangePreset === "week") {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { rangeStart: d.toISOString().split("T")[0], rangeEnd: todayStr };
    }
    if (dateRangePreset === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      return { rangeStart: start, rangeEnd: todayStr };
    }
    if (dateRangePreset === "fy") {
      const m = today.getMonth() + 1;
      const y = m >= 4 ? today.getFullYear() : today.getFullYear() - 1;
      const start = `${y}-04-01`;
      return { rangeStart: start, rangeEnd: todayStr };
    }
    return {
      rangeStart: customStart || "2000-01-01",
      rangeEnd: customEnd || "2099-12-31",
    };
  }, [dateRangePreset, customStart, customEnd]);

  // Overall collection summaries
  const todayStr = getTodayDateString();
  const todayCollection = payments
    .filter((p) => p.date === todayStr)
    .reduce((s, p) => s + Number(p.amount), 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekStartStr = sevenDaysAgo.toISOString().split("T")[0];
  const weekCollection = payments
    .filter((p) => p.date >= weekStartStr && p.date <= todayStr)
    .reduce((s, p) => s + Number(p.amount), 0);

  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthCollection = payments
    .filter((p) => p.date >= monthStartStr && p.date <= todayStr)
    .reduce((s, p) => s + Number(p.amount), 0);

  const totalAllTimeCollection = payments.reduce((s, p) => s + Number(p.amount), 0);

  // Filtered payments & expenses for current period
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => p.date >= rangeStart && p.date <= rangeEnd)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, rangeStart, rangeEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date >= rangeStart && e.date <= rangeEnd)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, rangeStart, rangeEnd]);

  const periodIncome = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
  const periodExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfitLoss = periodIncome - periodExpenses;

  // Outstanding fees list
  const outstandingStudents = useMemo(() => {
    return students
      .filter((s) => s.status === "Active" && s.remaining_fees > 0)
      .sort((a, b) => b.remaining_fees - a.remaining_fees);
  }, [students]);

  const totalOutstanding = outstandingStudents.reduce((s, std) => s + Number(std.remaining_fees), 0);

  // Monthly Expense category breakdown
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return map;
  }, [filteredExpenses]);

  // Month-wise P&L breakdown
  const monthlyPnl = useMemo(() => {
    const monthMap: Record<string, { income: number; expenses: number }> = {};

    payments.forEach((p) => {
      const monthKey = p.date.slice(0, 7); // YYYY-MM
      if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0 };
      monthMap[monthKey].income += Number(p.amount);
    });

    expenses.forEach((e) => {
      const monthKey = e.date.slice(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0 };
      monthMap[monthKey].expenses += Number(e.amount);
    });

    return Object.entries(monthMap)
      .map(([monthKey, val]) => ({
        month: monthKey,
        income: val.income,
        expenses: val.expenses,
        net: val.income - val.expenses,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [payments, expenses]);

  // Handle Add Expense
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expAmount);
    if (!amt || amt <= 0) {
      error("Please enter a valid expense amount.");
      return;
    }

    setSubmittingExpense(true);
    await addExpense({
      category: expCategory,
      amount: amt,
      date: expDate,
      note: expNote,
    });
    setSubmittingExpense(false);

    success("Expense recorded successfully!");
    setExpAmount("");
    setExpNote("");
  };

  // WhatsApp Reminder
  const handleWhatsAppReminder = (student: (typeof students)[0]) => {
    const clean = cleanPhone10(student.phone);
    const msg = encodeURIComponent(
      `Hi ${student.name}, this is a reminder from ${config?.name || "Institute"} that your fee of ₹${student.remaining_fees} is pending (Reg: ${student.registration_number}). Please pay at earliest. - Team ${config?.name || "Institute"}`
    );
    window.open(`https://wa.me/91${clean}?text=${msg}`, "_blank");
  };

  // Export handlers
  const exportPaymentsCsv = () => {
    const data = filteredPayments.map((p) => {
      const std = students.find((s) => s.id === p.student_id);
      return {
        "Payment ID": p.id,
        "Student Name": std?.name || "Unknown",
        "Reg Number": std?.registration_number || "-",
        Course: std?.course_type || "-",
        Amount: p.amount,
        Mode: p.mode,
        Type: p.type,
        Date: p.date,
        Note: p.note || "",
      };
    });
    downloadCsv(data, "Fee_Collections");
  };

  const exportExpensesCsv = () => {
    const data = filteredExpenses.map((e) => ({
      "Expense ID": e.id,
      Category: e.category,
      Amount: e.amount,
      Date: e.date,
      Note: e.note || "",
    }));
    downloadCsv(data, "Expenses");
  };

  const exportOutstandingCsv = () => {
    const data = outstandingStudents.map((s) => ({
      "Reg Number": s.registration_number,
      "Student Name": s.name,
      Phone: s.phone,
      Course: s.course_type,
      "Total Fees": s.total_fees,
      "Admission Fees Paid": s.admission_fees,
      "Outstanding Balance": s.remaining_fees,
    }));
    downloadCsv(data, "Outstanding_Fees");
  };

  const exportPnlCsv = () => {
    const data = monthlyPnl.map((m) => ({
      Month: m.month,
      Income: m.income,
      Expenses: m.expenses,
      "Net Profit Loss": m.net,
    }));
    downloadCsv(data, "PnL_Report");
  };

  const downloadCsv = (data: any[], prefix: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${config?.reg_prefix || "Institute"}_${prefix}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Top Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-400" /> Financial Intelligence & P&L
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ledger tracking, expense categorization, and net surplus reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeFinanceTab === "revenue" && (
            <button
              onClick={exportPaymentsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Payments CSV
            </button>
          )}
          {activeFinanceTab === "outstanding" && (
            <button
              onClick={exportOutstandingCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Outstanding CSV
            </button>
          )}
          {activeFinanceTab === "expenses" && (
            <button
              onClick={exportExpensesCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Expenses CSV
            </button>
          )}
          {activeFinanceTab === "pnl" && (
            <button
              onClick={exportPnlCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export P&L CSV
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Collection"
          value={formatCurrency(todayCollection)}
          icon={CreditCard}
          badge="Live"
          badgeColor="teal"
        />
        <StatCard
          title="This Week's Collection"
          value={formatCurrency(weekCollection)}
          icon={TrendingUp}
          badge="Last 7 Days"
          badgeColor="emerald"
        />
        <StatCard
          title="This Month's Collection"
          value={formatCurrency(monthCollection)}
          icon={Calendar}
          badge="MTD"
          badgeColor="blue"
        />
        <StatCard
          title="All-Time Total Collections"
          value={formatCurrency(totalAllTimeCollection)}
          icon={DollarSign}
          badge="Gross"
          badgeColor="teal"
          variant="gradient"
        />
      </div>

      {/* Sub-Tabs & Date Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "revenue", label: "Fee Collections" },
            { id: "outstanding", label: `Outstanding (${outstandingStudents.length})` },
            { id: "expenses", label: "Expense Manager" },
            { id: "pnl", label: "P&L Statement" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFinanceTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFinanceTab === tab.id
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">This Month</option>
            <option value="fy">This Financial Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {dateRangePreset === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg px-2 py-1 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* VIEW: Fee Collections Table */}
      {activeFinanceTab === "revenue" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Fee Collections ({filteredPayments.length} transactions in period)
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Total: {formatCurrency(periodIncome)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No collections recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const s = students.find((std) => std.id === p.student_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono">{formatDate(p.date)}</td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {s ? s.name : "Student"}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{s?.course_type || "-"}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-4">{p.mode}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{p.note || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: Outstanding Fees Section */}
      {activeFinanceTab === "outstanding" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-amber-300">
            <div>
              <h4 className="text-sm font-bold">Total Outstanding Uncollected Fees</h4>
              <p className="text-xs text-amber-200/80">
                Pending across {outstandingStudents.length} active students
              </p>
            </div>
            <span className="text-xl font-bold font-mono text-amber-400">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Registration No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Total Fees</th>
                    <th className="py-3 px-4">Paid So Far</th>
                    <th className="py-3 px-4">Balance Remaining</th>
                    <th className="py-3 px-4 text-right">Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {outstandingStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Awesome! Zero outstanding fees across all enrolled students.
                      </td>
                    </tr>
                  ) : (
                    outstandingStudents.map((s) => {
                      const paid = Math.max(0, s.total_fees - s.remaining_fees);
                      return (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-teal-300">
                            {s.registration_number}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">{s.name}</td>
                          <td className="py-3 px-4 font-mono">{s.phone}</td>
                          <td className="py-3 px-4 text-slate-300">{s.course_type}</td>
                          <td className="py-3 px-4 font-mono">{formatCurrency(s.total_fees)}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400">{formatCurrency(paid)}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                            {formatCurrency(s.remaining_fees)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleWhatsAppReminder(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Remind on WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Expense Management */}
      {activeFinanceTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Expense Form (left) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Operational Expense
            </h3>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 25000"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Note / Vendor</label>
                <input
                  type="text"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  placeholder="e.g. Oct Faculty Salary or CSPDCL electricity"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingExpense}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {submittingExpense ? "Recording..." : "Save Expense"}
              </button>
            </form>
          </div>

          {/* Expenses Table & Breakdown (right) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category breakdown bar cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Period Expense Breakdown by Category
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {Object.entries(expenseByCategory).map(([cat, amt]) => (
                  <div key={cat} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block truncate">{cat}</span>
                    <span className="font-mono font-bold text-rose-400">{formatCurrency(amt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Note</th>
                      <th className="py-3 px-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No expenses recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono">{formatDate(exp.date)}</td>
                          <td className="py-3 px-4 font-semibold text-white">{exp.category}</td>
                          <td className="py-3 px-4 font-mono font-bold text-rose-400">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{exp.note || "-"}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: P&L Statement */}
      {activeFinanceTab === "pnl" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Total Period Income
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(periodIncome)}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Total Period Expenses
              </span>
              <span className="text-2xl font-bold font-mono text-rose-400">
                {formatCurrency(periodExpenses)}
              </span>
            </div>

            <div
              className={`p-5 rounded-2xl border ${
                netProfitLoss >= 0
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/20 border-rose-500/30 text-rose-300"
              }`}
            >
              <span className="text-xs uppercase tracking-wider block mb-1">
                {netProfitLoss >= 0 ? "Net Operational Profit" : "Net Operational Deficit"}
              </span>
              <span className="text-2xl font-bold font-mono">
                {formatCurrency(Math.abs(netProfitLoss))}
              </span>
            </div>
          </div>

          {/* Month-Wise P&L Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Month-by-Month Profit & Loss Performance
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Financial Month</th>
                    <th className="py-3 px-4">Collections (Income)</th>
                    <th className="py-3 px-4">Expenses Incurred</th>
                    <th className="py-3 px-4">Net Surplus / Loss</th>
                    <th className="py-3 px-4">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {monthlyPnl.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No financial transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    monthlyPnl.map((row) => {
                      const margin = row.income > 0 ? Math.round((row.net / row.income) * 100) : 0;
                      return (
                        <tr key={row.month} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-white">{row.month}</td>
                          <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                            {formatCurrency(row.income)}
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-400 font-semibold">
                            {formatCurrency(row.expenses)}
                          </td>
                          <td
                            className={`py-3 px-4 font-mono font-bold ${
                              row.net >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {row.net >= 0 ? `+${formatCurrency(row.net)}` : formatCurrency(row.net)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                margin >= 0
                                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                              }`}
                            >
                              {margin}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
