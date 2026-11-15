import React, { useState, useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { StatCard } from "../shared/StatCard";
import { ExpenseCategory, PaymentMode, Payment } from "../../types";
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
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Users,
  Clock,
  Search,
  X,
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

  // Tab inside Finance: "revenue" | "outstanding" | "expenses" | "pnl"
  const [activeFinanceTab, setActiveFinanceTab] = useState<
    "revenue" | "outstanding" | "expenses" | "pnl"
  >("revenue");

  // Expanded students in Fee Collections table
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  const toggleExpandStudent = (studentId: string) => {
    setExpandedStudents((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  // Fee Collections Table Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [outstandingFilter, setOutstandingFilter] = useState("");

  const uniqueCourses = useMemo(() => {
    return [...new Set(students.map((s) => s.course_type).filter(Boolean))].sort();
  }, [students]);

  const uniqueSessions = useMemo(() => {
    return [...new Set(students.map((s) => s.session).filter(Boolean))].sort();
  }, [students]);

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

  // Fee-type specific collected in period
  const admissionCollected = filteredPayments
    .filter((p) => p.payment_for === "Admission Fees" && !p.university_name)
    .reduce((s, p) => s + Number(p.amount), 0);

  const examCollected = filteredPayments
    .filter((p) => p.payment_for === "Exam Fees" && !p.university_name)
    .reduce((s, p) => s + Number(p.amount), 0);

  const lateCollected = filteredPayments
    .filter((p) => p.payment_for === "Late Fees" && !p.university_name)
    .reduce((s, p) => s + Number(p.amount), 0);

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

  // Grouped students data for fee collections table (students who have payments in period or overall)
  const studentsWithPaymentsData = useMemo(() => {
    // Find all student IDs that have filtered payments in the period
    const activeStudentIds = new Set(filteredPayments.map((p) => p.student_id));
    return students
      .filter((s) => activeStudentIds.has(s.id))
      .map((student) => {
        const studentPayments = filteredPayments.filter((p) => p.student_id === student.id);
        const admissionFees = studentPayments
          .filter((p) => p.payment_for === "Admission Fees" && !p.university_name)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const examFees = studentPayments
          .filter((p) => p.payment_for === "Exam Fees" && !p.university_name)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const lateFees = studentPayments
          .filter((p) => p.payment_for === "Late Fees" && !p.university_name)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const regularFees = studentPayments
          .filter(
            (p) =>
              (!p.payment_for || (p.payment_for as string) === "" || p.payment_for === "Regular Payment") &&
              !p.university_name
          )
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const totalPaid = admissionFees + examFees + lateFees + regularFees;

        const universityPaid = studentPayments
          .filter((p) => p.university_name && p.university_name !== "")
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const outstanding = Math.max(0, student.total_fees - (totalPaid + universityPaid));

        return {
          student,
          studentPayments,
          admissionFees,
          examFees,
          lateFees,
          regularFees,
          totalPaid,
          universityPaid,
          outstanding,
        };
      });
  }, [students, filteredPayments]);

  const filteredStudents = useMemo(() => {
    return studentsWithPaymentsData.filter((s) => {
      const matchSearch =
        !searchTerm ||
        s.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student.course_type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCourse = !courseFilter || s.student.course_type === courseFilter;
      const matchSession = !sessionFilter || s.student.session === sessionFilter;
      const matchStatus = !statusFilter || s.student.status === statusFilter;

      const matchOutstanding =
        !outstandingFilter ||
        (outstandingFilter === "pending" && s.outstanding > 0) ||
        (outstandingFilter === "cleared" && s.outstanding <= 0);

      return matchSearch && matchCourse && matchSession && matchStatus && matchOutstanding;
    });
  }, [studentsWithPaymentsData, searchTerm, courseFilter, sessionFilter, statusFilter, outstandingFilter]);

  // Totals for summary row
  const tableTotals = useMemo(() => {
    return filteredStudents.reduce(
      (acc, curr) => {
        acc.admission += curr.admissionFees;
        acc.regular += curr.regularFees;
        acc.exam += curr.examFees;
        acc.late += curr.lateFees;
        acc.totalFees += Number(curr.student.total_fees || 0);
        acc.totalPaid += curr.totalPaid;
        acc.outstanding += curr.outstanding;
        return acc;
      },
      { admission: 0, regular: 0, exam: 0, late: 0, totalFees: 0, totalPaid: 0, outstanding: 0 }
    );
  }, [filteredStudents]);

  // Export handlers
  const exportPaymentsCsv = () => {
    const data = filteredStudents.map((item) => ({
      Student: item.student.name,
      Course: item.student.course_type,
      Discount: item.student.discount_amount ? `-${item.student.discount_amount} (${item.student.discount_percent || 0}%)` : "0",
      "Admission Date": item.student.admission_date,
      "Admission Fees": item.admissionFees,
      "Regular Fees": item.regularFees,
      "Exam Fees": item.examFees,
      "Late Fees": item.lateFees,
      "Total Fees": item.student.total_fees,
      "Total Paid": item.totalPaid,
      Outstanding: item.outstanding,
    }));
    downloadCsv(data, "Fee_Collections_Grouped");
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
    URL.revokeObjectURL(url);
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
              <Download className="w-3.5 h-3.5" /> Export Grouped CSV
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

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard
          title="Today's Collection"
          value={formatCurrency(todayCollection)}
          icon={CreditCard}
          badge="Live"
          badgeColor="teal"
        />
        <StatCard
          title="This Week"
          value={formatCurrency(weekCollection)}
          icon={TrendingUp}
          badge="7 Days"
          badgeColor="emerald"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(monthCollection)}
          icon={Calendar}
          badge="MTD"
          badgeColor="blue"
        />
        <StatCard
          title="Admission Collected"
          value={formatCurrency(admissionCollected)}
          icon={Users}
          badge="Period"
          badgeColor="teal"
        />
        <StatCard
          title="Exam Fees"
          value={formatCurrency(examCollected)}
          icon={FileText}
          badge="Period"
          badgeColor="amber"
        />
        <StatCard
          title="Late Fees"
          value={formatCurrency(lateCollected)}
          icon={Clock}
          badge="Period"
          badgeColor="rose"
        />
        <StatCard
          title="All-Time Total"
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

      {/* VIEW: Fee Collections Grouped Table */}
      {activeFinanceTab === "revenue" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* 1. Global Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by student name, reg number, course..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* 2. Course Filter */}
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 min-w-[150px]"
            >
              <option value="">All Courses</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* 3. Session Filter */}
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 min-w-[160px]"
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* 4. Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Dropped">Dropped</option>
              <option value="On Hold">On Hold</option>
            </select>

            {/* 5. Outstanding Filter */}
            <select
              value={outstandingFilter}
              onChange={e => setOutstandingFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-sm text-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Payments</option>
              <option value="pending">Has Outstanding</option>
              <option value="cleared">Fully Cleared</option>
            </select>

            {/* Clear Filters button */}
            {(searchTerm || courseFilter || sessionFilter || statusFilter || outstandingFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCourseFilter("");
                  setSessionFilter("");
                  setStatusFilter("");
                  setOutstandingFilter("");
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-sm transition flex items-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${Boolean(searchTerm || courseFilter || sessionFilter || statusFilter || outstandingFilter) ? "text-amber-400" : "text-white"}`}>
                Fee Collections ({filteredStudents.length} of {studentsWithPaymentsData.length} students {Boolean(searchTerm || courseFilter || sessionFilter || statusFilter || outstandingFilter) ? "— filtered" : ""})
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Total Period Income: {formatCurrency(periodIncome)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Admission Date</th>
                    <th className="py-3.5 px-4">Admission</th>
                    <th className="py-3.5 px-4">Regular</th>
                    <th className="py-3.5 px-4">Exam</th>
                    <th className="py-3.5 px-4">Late</th>
                    <th className="py-3.5 px-4">Total Fees</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-500">
                        No fee collections recorded matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((item) => {
                      const isExpanded = Boolean(expandedStudents[item.student.id]);
                      return (
                        <React.Fragment key={item.student.id}>
                          <tr
                            onClick={() => toggleExpandStudent(item.student.id)}
                            className="hover:bg-slate-800/40 transition cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                              <span>{isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-teal-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}</span>
                              <div>
                                <div>{item.student.name}</div>
                                <div className="text-[10px] font-mono text-slate-500">{item.student.registration_number}</div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">{item.student.course_type}</td>
                            <td className="py-3.5 px-4 font-mono">
                              {Number(item.student.discount_amount || 0) > 0 ? (
                                <span className="text-violet-300 font-semibold">
                                  -{formatCurrency(item.student.discount_amount)} {item.student.discount_percent ? `(${item.student.discount_percent}%)` : ""}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 text-sm font-mono">{formatDate(item.student.admission_date)}</td>
                            <td className="py-3.5 px-4 font-mono">
                              {item.admissionFees > 0 ? (
                                <span className="text-teal-400">{formatCurrency(item.admissionFees)}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {item.regularFees > 0 ? (
                                <span className="text-teal-400">{formatCurrency(item.regularFees)}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {item.examFees > 0 ? (
                                <span className="text-amber-400">{formatCurrency(item.examFees)}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {item.lateFees > 0 ? (
                                <span className="text-rose-400">{formatCurrency(item.lateFees)}</span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-white">
                              {formatCurrency(item.student.total_fees)}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                              {formatCurrency(item.totalPaid)}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {item.outstanding > 0 ? (
                                <span className="text-rose-400 font-bold">{formatCurrency(item.outstanding)}</span>
                              ) : (
                                <span className="text-emerald-400 font-semibold">Cleared ✓</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded transaction rows */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={11} className="bg-slate-950/80 p-4 border-y border-slate-800">
                                <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                  Transaction History for {item.student.name} ({item.studentPayments.length} transactions):
                                </div>
                                <div className="space-y-1.5 pl-4 border-l-2 border-teal-500/40">
                                  {item.studentPayments.map((p) => {
                                    const isUniv = Boolean(p.university_name && p.university_name.trim());
                                    return (
                                      <div
                                        key={p.id}
                                        className={`flex items-center justify-between text-xs font-mono p-2 rounded-lg ${
                                          isUniv
                                            ? "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                                            : "bg-slate-900 border border-slate-800 text-slate-300"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-slate-500">{formatDate(p.date)}</span>
                                          <span className={`font-bold ${isUniv ? "text-amber-400" : "text-emerald-400"}`}>
                                            {formatCurrency(p.amount)}
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                                            {p.mode}
                                          </span>
                                          <span className="text-slate-400">
                                            {p.payment_for || p.type} {isUniv ? `(${p.university_name})` : ""}
                                          </span>
                                        </div>
                                        <div className="text-slate-500 text-[11px] truncate max-w-xs">
                                          {p.note || "-"}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
                {/* Summary Row at Bottom */}
                {filteredStudents.length > 0 && (
                  <tfoot className="bg-slate-950 text-white font-bold text-xs border-t-2 border-slate-800">
                    <tr>
                      <td className="py-3.5 px-4">TOTAL ({filteredStudents.length} students)</td>
                      <td className="py-3.5 px-4">-</td>
                      <td className="py-3.5 px-4">-</td>
                      <td className="py-3.5 px-4">-</td>
                      <td className="py-3.5 px-4 font-mono text-teal-300">{formatCurrency(tableTotals.admission)}</td>
                      <td className="py-3.5 px-4 font-mono text-teal-300">{formatCurrency(tableTotals.regular)}</td>
                      <td className="py-3.5 px-4 font-mono text-amber-300">{formatCurrency(tableTotals.exam)}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-300">{formatCurrency(tableTotals.late)}</td>
                      <td className="py-3.5 px-4 font-mono text-white font-semibold">{formatCurrency(tableTotals.totalFees)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 text-sm">{formatCurrency(tableTotals.totalPaid)}</td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">{formatCurrency(tableTotals.outstanding)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
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

          <div className="lg:col-span-2 space-y-6">
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
