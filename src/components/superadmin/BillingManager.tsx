import React, { useState, useEffect } from "react";
import { InstituteConfig, SubscriptionPayment, SubscriptionOverride, PLAN_PRICING, DURATION_DAYS, DURATION_LABELS } from "../../types";
import { db, isFirebaseConfigured, cleanFirestoreData } from "../../firebase";
import { collection, getDocs, getDoc, doc, updateDoc, setDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../shared/Toast";
import { formatDate } from "../../utils/formatters";
import { getPlanFeatures, PlanType } from "../../utils/planFeatures";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileSpreadsheet,
  Trash2,
  FileText,
} from "lucide-react";

interface BillingManagerProps {
  institutes: InstituteConfig[];
  onRefresh: () => void;
}

export const BillingManager: React.FC<BillingManagerProps> = ({ institutes, onRefresh }) => {
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [overrides, setOverrides] = useState<SubscriptionOverride[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "history" | "overrides">("subscriptions");

  // Filters for Subscriptions tab
  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState<"all" | "expiring_week" | "expired" | "trial" | "active">("all");

  // Filters for History tab
  const [historySearch, setHistorySearch] = useState("");
  const [historyPlanFilter, setHistoryPlanFilter] = useState<string>("all");

  // Record Payment Modal State
  const [selectedInst, setSelectedInst] = useState<InstituteConfig | null>(null);
  const [newPlan, setNewPlan] = useState<"standard" | "pro">("standard");
  const [duration, setDuration] = useState<"monthly" | "quarterly" | "half-yearly" | "annual">("monthly");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState<SubscriptionPayment["payment_mode"]>("UPI");
  const [amount, setAmount] = useState<number>(499);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delete payment modal state
  const [paymentToDelete, setPaymentToDelete] = useState<SubscriptionPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manual Expiry Override modal state
  const [overrideInstitute, setOverrideInstitute] = useState<InstituteConfig | null>(null);
  const [overrideNewPlan, setOverrideNewPlan] = useState<"trial" | "standard" | "pro">("standard");
  const [overrideNewEndDate, setOverrideNewEndDate] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchOverrides();
  }, []);

  const fetchPayments = async () => {
    if (!isFirebaseConfigured || !db) {
      setLoadingPayments(false);
      return;
    }
    try {
      const snap = await getDocs(collection(db, "subscription_payments"));
      const list: SubscriptionPayment[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SubscriptionPayment);
      });
      list.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      setPayments(list);
    } catch (err: any) {
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchOverrides = async () => {
    if (!isFirebaseConfigured || !db) {
      setLoadingOverrides(false);
      return;
    }
    try {
      const snap = await getDocs(collection(db, "subscription_overrides"));
      const list: SubscriptionOverride[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as SubscriptionOverride);
      });
      list.sort((a, b) => new Date(b.created_timestamp?.toDate?.() || 0).getTime() - new Date(a.created_timestamp?.toDate?.() || 0).getTime());
      setOverrides(list);
    } catch (err: any) {
      setOverrides([]);
    } finally {
      setLoadingOverrides(false);
    }
  };

  // Helper: calculate days left for subscription
  const getDaysLeft = (inst: InstituteConfig): number => {
    const endStr = inst.subscription_end_date || inst.trial_end_date;
    if (!endStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Revenue calculations
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthRevenue = payments
    .filter((p) => p.payment_date?.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const activeCount = institutes.filter((i) => i.status === "active").length;
  const expiringWeekCount = institutes.filter((i) => {
    const dl = getDaysLeft(i);
    return dl >= 0 && dl <= 7;
  }).length;

  // Open Record Payment Modal
  const handleOpenPaymentModal = (inst: InstituteConfig) => {
    setSelectedInst(inst);
    const p = (inst.plan === "pro" ? "pro" : "standard") as "standard" | "pro";
    setNewPlan(p);
    setDuration("monthly");
    setAmount((PLAN_PRICING as any)[p]?.monthly || 499);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("UPI");
    setReference("");
    setNote("");
  };

  // When plan or duration changes in modal, update amount
  useEffect(() => {
    if (newPlan && duration) {
      const pr = (PLAN_PRICING as any)[newPlan]?.[duration] || 0;
      setAmount(pr);
    }
  }, [newPlan, duration]);

  // Calculate new end date helper
  const calculateNewEndDate = (currentEndDate: string, durationDays: number): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const current = new Date(currentEndDate);
    current.setHours(0, 0, 0, 0);

    const baseDate = current > today ? current : today;
    const newEnd = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    return newEnd.toISOString().split("T")[0];
  };

  // Calculate new end date preview
  const calculateNewExpiryPreview = () => {
    if (!selectedInst) return { currentEnd: "", newEnd: "", days: 30 };
    const currentEnd = selectedInst.subscription_end_date || selectedInst.trial_end_date || new Date().toISOString().split("T")[0];
    const days = (DURATION_DAYS as any)[duration] || 30;
    const newEndStr = calculateNewEndDate(currentEnd, days);

    return { currentEnd, newEnd: newEndStr, days };
  };

  const preview = calculateNewExpiryPreview();

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !db) return;

    setSubmittingPayment(true);
    try {
      const paymentId = `subpay_${Date.now().toString(36)}`;
      const paymentData: SubscriptionPayment = {
        id: paymentId,
        institute_id: selectedInst.institute_id,
        institute_name: selectedInst.name,
        amount: Number(amount),
        payment_mode: paymentMode,
        payment_date: paymentDate,
        duration,
        duration_days: preview.days,
        plan: newPlan,
        previous_end_date: preview.currentEnd,
        new_end_date: preview.newEnd,
        reference: reference.trim(),
        note: note.trim(),
        recorded_by: user?.email || "superadmin",
        created_timestamp: serverTimestamp(),
      };

      // Update institute config
      const updatedConfig = {
        ...selectedInst,
        plan: newPlan,
        status: "active" as const,
        subscription_start_date: paymentDate,
        subscription_end_date: preview.newEnd,
        subscription_duration: duration,
        subscription_expired: false,
        trial_expired: false,
        features: getPlanFeatures(newPlan as PlanType),
      };

      await setDoc(doc(db, "subscription_payments", paymentId), cleanFirestoreData(paymentData));
      await updateDoc(doc(db, "institutes", selectedInst.institute_id), {
        config: cleanFirestoreData(updatedConfig),
      });

      success(`Payment recorded! ${selectedInst.name} access extended to ${formatDate(preview.newEnd)}.`);
      setSelectedInst(null);
      onRefresh();
      fetchPayments();
    } catch (err: any) {
      error(err.message || "Failed to record payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Recalculate institute expiry helper
  const recalculateInstituteExpiry = async (instituteId: string) => {
    if (!db) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "subscription_payments"),
          where("institute_id", "==", instituteId)
        )
      );

      const paymentsList = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SubscriptionPayment)
      );

      console.log("Remaining payments after delete:", paymentsList.length, paymentsList);

      if (paymentsList.length === 0) {
        await updateDoc(doc(db, "institutes", instituteId), {
          "config.subscription_expired": true,
          "config.status": "suspended",
          "config.subscription_end_date": new Date().toISOString().split("T")[0],
        });
        return;
      }

      paymentsList.sort(
        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let baseDate = new Date(paymentsList[0].payment_date);
      baseDate.setHours(0, 0, 0, 0);

      if (baseDate < today) {
        baseDate = new Date(today);
      }

      const totalDays = paymentsList.reduce((sum, p) => sum + p.duration_days, 0);
      const newEndDate = new Date(baseDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
      const newEndDateStr = newEndDate.toISOString().split("T")[0];
      const isExpired = newEndDate < today;

      const latestPayment = paymentsList[paymentsList.length - 1];

      console.log("Recalculated expiry:", {
        totalDays,
        baseDate: baseDate.toISOString().split("T")[0],
        newEndDate: newEndDateStr,
        isExpired,
        plan: latestPayment.plan,
      });

      await updateDoc(doc(db, "institutes", instituteId), {
        "config.subscription_end_date": newEndDateStr,
        "config.subscription_expired": isExpired,
        "config.status": isExpired ? "suspended" : "active",
        "config.plan": latestPayment.plan,
        "config.subscription_duration": latestPayment.duration,
        "config.features": getPlanFeatures(latestPayment.plan as PlanType),
      });
    } catch (err) {
      console.error("Recalculate expiry error:", err);
      throw err;
    }
  };

  // Delete Payment & Recalculate Expiry
  const handleDeletePayment = async (payment: SubscriptionPayment) => {
    if (!db) return;
    setDeleting(true);
    try {
      const paymentRef = doc(db, "subscription_payments", payment.id);
      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        error("Payment record not found in database. Refreshing list...");
        await fetchPayments();
        setPaymentToDelete(null);
        setDeleting(false);
        return;
      }

      await deleteDoc(paymentRef);

      const verifySnap = await getDoc(paymentRef);
      if (verifySnap.exists()) {
        error("Delete failed — document still exists. Please try again.");
        setDeleting(false);
        return;
      }

      await recalculateInstituteExpiry(payment.institute_id);

      success("Payment deleted and expiry recalculated.");
      setPaymentToDelete(null);

      await fetchPayments();
      onRefresh();
    } catch (err: any) {
      console.error("Delete error:", err);
      error(err.message || "Delete failed. Check Firestore rules.");
    } finally {
      setDeleting(false);
    }
  };

  // Open Manual Override Modal
  const handleOpenOverrideModal = (inst: InstituteConfig) => {
    setOverrideInstitute(inst);
    setOverrideNewPlan(inst.plan || "standard");
    setOverrideNewEndDate(inst.subscription_end_date || inst.trial_end_date || new Date().toISOString().split("T")[0]);
    setOverrideReason("");
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideInstitute || !db) return;

    setSubmittingOverride(true);
    try {
      const overrideId = `subover_${Date.now().toString(36)}`;
      const prevEnd = overrideInstitute.subscription_end_date || overrideInstitute.trial_end_date || "N/A";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newEndObj = new Date(overrideNewEndDate);
      newEndObj.setHours(0, 0, 0, 0);
      const isExpired = newEndObj < today;

      const overrideData: SubscriptionOverride = {
        id: overrideId,
        institute_id: overrideInstitute.institute_id,
        institute_name: overrideInstitute.name,
        previous_end_date: prevEnd,
        new_end_date: overrideNewEndDate,
        plan_change: `${overrideInstitute.plan} → ${overrideNewPlan}`,
        reason: overrideReason.trim() || "Manual override by Super Admin",
        done_by: user?.email || "superadmin",
        created_timestamp: serverTimestamp(),
      };

      const updatedConfig = {
        ...overrideInstitute,
        plan: overrideNewPlan,
        status: isExpired ? ("suspended" as const) : ("active" as const),
        subscription_end_date: overrideNewEndDate,
        subscription_expired: isExpired,
        features: getPlanFeatures(overrideNewPlan as PlanType),
      };

      await setDoc(doc(db, "subscription_overrides", overrideId), cleanFirestoreData(overrideData));
      await updateDoc(doc(db, "institutes", overrideInstitute.institute_id), {
        config: cleanFirestoreData(updatedConfig),
      });

      success(`Expiry overridden for ${overrideInstitute.name} to ${formatDate(overrideNewEndDate)}.`);
      setOverrideInstitute(null);
      await fetchOverrides();
      onRefresh();
    } catch (err: any) {
      error(err.message || "Failed to update expiry override");
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Export CSV helper
  const exportHistoryCSV = () => {
    const headers = ["Date", "Institute", "Plan", "Duration", "Amount", "Mode", "Reference", "Recorded By", "Note"];
    const rows = payments.map((p) => [
      p.payment_date,
      `"${p.institute_name}"`,
      p.plan,
      p.duration,
      p.amount,
      p.payment_mode,
      `"${p.reference || ""}"`,
      p.recorded_by,
      `"${p.note || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subscription_payments_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered institutes for subscription table
  const filteredInstitutes = (institutes || []).filter((inst) => {
    const term = subSearch.toLowerCase().trim();
    const matchesSearch = !term || inst.name?.toLowerCase().includes(term) || inst.city?.toLowerCase().includes(term) || inst.admin_email?.toLowerCase().includes(term);

    const dl = getDaysLeft(inst);
    let matchesFilter = true;
    if (subFilter === "expiring_week") {
      matchesFilter = dl >= 0 && dl <= 7;
    } else if (subFilter === "expired") {
      matchesFilter = dl <= 0 || Boolean(inst.subscription_expired) || Boolean(inst.trial_expired);
    } else if (subFilter === "trial") {
      matchesFilter = inst.plan === "trial";
    } else if (subFilter === "active") {
      matchesFilter = inst.status === "active" && dl > 7;
    }

    return matchesSearch && matchesFilter;
  });

  const filteredHistory = payments.filter((p) => {
    const term = historySearch.toLowerCase().trim();
    const matchesSearch = !term || p.institute_name?.toLowerCase().includes(term) || p.reference?.toLowerCase().includes(term) || p.recorded_by?.toLowerCase().includes(term);
    const matchesPlan = historyPlanFilter === "all" || p.plan === historyPlanFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-bold text-white mt-1">₹{totalRevenue.toLocaleString()}</h3>
            <p className="text-[11px] text-teal-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> All-time collections
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">This Month Revenue</p>
            <h3 className="text-2xl font-bold text-white mt-1">₹{thisMonthRevenue.toLocaleString()}</h3>
            <p className="text-[11px] text-emerald-400 mt-1">Current calendar month</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Institutes</p>
            <h3 className="text-2xl font-bold text-white mt-1">{activeCount}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Operational tenants</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setSubFilter("expiring_week")}
          className="bg-slate-900 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 shadow-xl flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Expiring This Week</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{expiringWeekCount}</h3>
            <p className="text-[11px] text-amber-300/80 mt-1">Requires renewal</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "subscriptions"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            📋 Subscriptions Overview
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "history"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            💳 Payment History ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("overrides")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "overrides"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            ✏️ Overrides ({overrides.length})
          </button>
        </div>

        {activeTab === "subscriptions" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search institute..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Subscriptions</option>
              <option value="expiring_week">Expiring This Week</option>
              <option value="expired">Expired</option>
              <option value="trial">Trial Only</option>
              <option value="active">Active Only</option>
            </select>
          </div>
        ) : activeTab === "history" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history by institute, ref..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <select
              value={historyPlanFilter}
              onChange={(e) => setHistoryPlanFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Plans</option>
              <option value="trial">Trial</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>

            <button
              onClick={exportHistoryCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        ) : null}
      </div>

      {/* TAB CONTENT 1: SUBSCRIPTIONS OVERVIEW */}
      {activeTab === "subscriptions" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Institute</th>
                  <th className="py-3.5 px-4">Plan & Duration</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">End Date</th>
                  <th className="py-3.5 px-4">Days Left</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInstitutes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No institutes found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInstitutes.map((inst) => {
                    const dl = getDaysLeft(inst);
                    const isExpired = dl <= 0 || inst.subscription_expired || inst.trial_expired;
                    const instPaymentsCount = payments.filter((p) => p.institute_id === inst.institute_id).length;

                    let daysColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                    if (isExpired) {
                      daysColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                    } else if (dl <= 7) {
                      daysColor = "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse";
                    } else if (dl <= 30) {
                      daysColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                    }

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active ✅
                      </span>
                    );
                    if (inst.status === "suspended") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Suspended 🚫
                        </span>
                      );
                    } else if (isExpired) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Expired ❌
                        </span>
                      );
                    } else if (dl <= 7) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Expiring Soon ⚠️
                        </span>
                      );
                    }

                    return (
                      <tr key={inst.institute_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {inst.reg_prefix?.slice(0, 2) || "IN"}
                            </div>
                            <div>
                              <div>{inst.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{inst.admin_email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-semibold text-teal-300 uppercase">
                            {inst.plan} {inst.subscription_duration ? `• ${inst.subscription_duration}` : ""}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {formatDate(inst.subscription_start_date || inst.created_date)}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-white">
                          <div>{formatDate(inst.subscription_end_date || inst.trial_end_date || "-")}</div>
                          <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                            {instPaymentsCount} payment(s) on record
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${daysColor}`}>
                            {isExpired ? "EXPIRED" : `${dl} days left`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">{statusBadge}</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPaymentModal(inst)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
                              title="Record subscription payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Record Payment
                            </button>
                            <button
                              onClick={() => handleOpenOverrideModal(inst)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                              title="Manual expiry override"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PAYMENT HISTORY */}
      {activeTab === "history" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Institute</th>
                  <th className="py-3.5 px-4">Plan & Duration</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Mode</th>
                  <th className="py-3.5 px-4">Reference / Note</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(p.payment_date)}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{p.institute_name}</td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-300 font-semibold">
                          {p.plan} • {p.duration} ({p.duration_days}d)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold text-sm">₹{p.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-slate-300">{p.payment_mode}</td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-mono">{p.reference || "-"}</div>
                        {p.note && <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.note}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">{p.recorded_by}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setPaymentToDelete(p)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                          title="Delete payment record"
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
      )}

      {/* TAB CONTENT 3: OVERRIDES */}
      {activeTab === "overrides" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Institute</th>
                  <th className="py-3.5 px-4">Previous → New Expiry</th>
                  <th className="py-3.5 px-4">Plan Change</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Done By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No manual overrides recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  overrides.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {formatDate(o.created_timestamp?.toDate?.() ? o.created_timestamp.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0])}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">{o.institute_name}</td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-rose-400">{formatDate(o.previous_end_date)}</span>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="text-teal-400 font-bold">{formatDate(o.new_end_date)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-amber-300 font-semibold">
                          {o.plan_change}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">{o.reason}</td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">{o.done_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
            <button
              onClick={() => setSelectedInst(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Record Subscription Payment</h2>
                <p className="text-xs text-slate-400 truncate max-w-xs">
                  Institute: <span className="text-teal-300 font-semibold">{selectedInst.name}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Plan
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    <option value="standard">Standard Plan</option>
                    <option value="pro">Pro Plan ⭐</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    <option value="monthly">1 Month (₹{PLAN_PRICING[newPlan].monthly})</option>
                    <option value="quarterly">3 Months — Quarterly (₹{PLAN_PRICING[newPlan].quarterly})</option>
                    <option value="half-yearly">6 Months — Half-Yearly (₹{PLAN_PRICING[newPlan]["half-yearly"]})</option>
                    <option value="annual">1 Year — Annual (₹{PLAN_PRICING[newPlan].annual})</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Amount (₹) — Editable
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Reference No (Optional)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="UPI ref # / Cheque no"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Remarks..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Preview Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Previous Expiry:</span>
                  <span className="text-slate-300 font-mono">{formatDate(preview.currentEnd)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">New Expiry:</span>
                  <span className="text-teal-400 font-bold font-mono">
                    {formatDate(preview.newEnd)} (+{preview.days} days)
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="text-white font-bold text-base font-mono">₹{amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedInst(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {submittingPayment ? "Recording Payment..." : "Confirm & Extend Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PAYMENT CONFIRMATION MODAL */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Delete Payment Record?</h3>
                <p className="text-slate-400 text-sm mt-1">{paymentToDelete.institute_name}</p>
              </div>
            </div>

            {/* Payment details */}
            <div className="bg-slate-800 rounded-xl p-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount:</span>
                <span className="text-white font-semibold">₹{paymentToDelete.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Duration:</span>
                <span className="text-white">
                  {paymentToDelete.duration} ({paymentToDelete.duration_days} days)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Date:</span>
                <span className="text-white">{paymentToDelete.payment_date}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Deleting this payment will automatically recalculate the institute's subscription expiry date based on remaining payments.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPaymentToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePayment(paymentToDelete)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-sm font-semibold transition"
              >
                {deleting ? "Deleting..." : "Delete & Recalculate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL EXPIRY OVERRIDE MODAL */}
      {overrideInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
            <button
              onClick={() => setOverrideInstitute(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Manual Expiry Override</h2>
                <p className="text-xs text-slate-400 truncate max-w-xs">
                  Institute: <span className="text-amber-300 font-semibold">{overrideInstitute.name}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Plan
                  </label>
                  <select
                    value={overrideNewPlan}
                    onChange={(e) => setOverrideNewPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                  >
                    <option value="trial">Trial</option>
                    <option value="standard">Standard Plan</option>
                    <option value="pro">Pro Plan ⭐</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    New Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideNewEndDate}
                    onChange={(e) => setOverrideNewEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Reason / Notes for Override
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Granted 1 month extension due to special request..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOverrideInstitute(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {submittingOverride ? "Saving Override..." : "Save Expiry Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
