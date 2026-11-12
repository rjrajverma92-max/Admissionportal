import React, { useState, useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { Student } from "../../types";
import { formatCurrency, formatDate, getDaysDifference } from "../../utils/formatters";
import { cleanPhone10 } from "../../utils/validators";
import { sendFeeReminderEmail } from "../../services/emailService";
import {
  Bell,
  MessageCircle,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";

interface ReminderItem {
  student: Student;
  remaining: number;
  daysSinceLastPayment: number;
  urgency: "overdue" | "due_soon" | "recent";
}

export const FeeReminders: React.FC = () => {
  const { config, students, payments, updateStudent } = useInstitute();
  const { success, error, info } = useToast();

  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "overdue" | "due_soon" | "recent">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingBulk, setSendingBulk] = useState(false);

  // Grouped students with pending fees
  const reminderItems: ReminderItem[] = useMemo(() => {
    return students
      .filter((s) => s.status === "Active" && s.remaining_fees > 0)
      .map((s) => {
        const studentPayments = payments.filter((p) => p.student_id === s.id);
        const lastDate = studentPayments.length > 0 ? studentPayments[0].date : s.admission_date;
        const days = getDaysDifference(lastDate);

        let urgency: "overdue" | "due_soon" | "recent" = "recent";
        if (days > 60) urgency = "overdue";
        else if (days >= 30) urgency = "due_soon";

        return {
          student: s,
          remaining: s.remaining_fees,
          daysSinceLastPayment: days,
          urgency,
        };
      })
      .sort((a, b) => b.daysSinceLastPayment - a.daysSinceLastPayment);
  }, [students, payments]);

  const filteredItems = useMemo(() => {
    return reminderItems.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        item.student.name.toLowerCase().includes(q) ||
        item.student.phone.includes(q) ||
        item.student.registration_number.toLowerCase().includes(q);

      const matchesUrgency = urgencyFilter === "all" || item.urgency === urgencyFilter;

      return matchesSearch && matchesUrgency;
    });
  }, [reminderItems, searchTerm, urgencyFilter]);

  const overdueCount = reminderItems.filter((i) => i.urgency === "overdue").length;
  const dueSoonCount = reminderItems.filter((i) => i.urgency === "due_soon").length;
  const recentCount = reminderItems.filter((i) => i.urgency === "recent").length;

  const handleSendWhatsApp = (item: ReminderItem) => {
    if (!config) return;
    const cleanPhone = cleanPhone10(item.student.phone);
    const msg = encodeURIComponent(
      `Hi ${item.student.name}, this is a reminder from ${config.name} that your fee of ₹${item.remaining} is pending (Reg: ${item.student.registration_number}). Please pay at earliest. - Team ${config.name}`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleSendEmail = async (item: ReminderItem) => {
    if (!config) return;
    if (!item.student.email) {
      error(`No email address registered for ${item.student.name}`);
      return;
    }
    const res = await sendFeeReminderEmail(config, item.student);
    if (res.success) {
      success(`Email reminder sent to ${item.student.name}`);
      // Mark as notified
      const today = new Date().toISOString().split("T")[0];
      await updateStudent(item.student.id, { last_notified_date: today });
    } else {
      error(res.message);
    }
  };

  const handleMarkNotified = async (studentId: string) => {
    const today = new Date().toISOString().split("T")[0];
    await updateStudent(studentId, { last_notified_date: today });
    success("Marked student as notified today.");
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.student.id)));
    }
  };

  // Bulk WhatsApp Dispatch
  const handleBulkWhatsApp = () => {
    if (selectedIds.size === 0) return;
    const targets = filteredItems.filter((i) => selectedIds.has(i.student.id));

    if (
      !confirm(
        `Open WhatsApp chat for ${targets.length} selected students? Your browser will open chat tabs.`
      )
    ) {
      return;
    }

    setSendingBulk(true);
    targets.forEach((item, index) => {
      setTimeout(() => {
        handleSendWhatsApp(item);
      }, index * 400);
    });
    setTimeout(() => {
      setSendingBulk(false);
      info(`Dispatched ${targets.length} WhatsApp reminders.`);
    }, targets.length * 400 + 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" /> Pending Fee Dues & Reminder Desk
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated urgency categorization, WhatsApp message dispatch, and EmailJS notices
          </p>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkWhatsApp}
            disabled={sendingBulk}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send Bulk WhatsApp ({selectedIds.size})</span>
          </button>
        )}
      </div>

      {/* Urgency Classification Filter Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setUrgencyFilter("all")}
          className={`p-3.5 rounded-2xl border text-left transition ${
            urgencyFilter === "all"
              ? "bg-slate-900 border-teal-500/40 text-white shadow-md shadow-teal-500/5"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block mb-1">
            All Pending
          </span>
          <span className="text-xl font-bold font-mono text-white">{reminderItems.length}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Students with balance</span>
        </button>

        <button
          onClick={() => setUrgencyFilter("overdue")}
          className={`p-3.5 rounded-2xl border text-left transition ${
            urgencyFilter === "overdue"
              ? "bg-rose-950/30 border-rose-500/50 text-white shadow-md shadow-rose-500/10"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" /> Overdue (&gt;60d)
          </span>
          <span className="text-xl font-bold font-mono text-rose-400">{overdueCount}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">High priority recovery</span>
        </button>

        <button
          onClick={() => setUrgencyFilter("due_soon")}
          className={`p-3.5 rounded-2xl border text-left transition ${
            urgencyFilter === "due_soon"
              ? "bg-amber-950/30 border-amber-500/50 text-white shadow-md shadow-amber-500/10"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Due Soon (30-60d)
          </span>
          <span className="text-xl font-bold font-mono text-amber-400">{dueSoonCount}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Standard follow-up</span>
        </button>

        <button
          onClick={() => setUrgencyFilter("recent")}
          className={`p-3.5 rounded-2xl border text-left transition ${
            urgencyFilter === "recent"
              ? "bg-emerald-950/30 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Recent (&lt;30d)
          </span>
          <span className="text-xl font-bold font-mono text-emerald-400">{recentCount}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">Within normal cycle</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter reminder queue by student name, phone, or reg number..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-sm"
        />
      </div>

      {/* Reminder Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button onClick={selectAll} className="p-0.5 text-slate-400 hover:text-white">
                    {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Student Name & Reg No</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Pending Fee</th>
                <th className="py-3 px-4">Days Since Payment</th>
                <th className="py-3 px-4">Last Notified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No pending fees found under this urgency filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.student.id);
                  const urgencyBadges = {
                    overdue: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    due_soon: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                    recent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                  }[item.urgency];

                  return (
                    <tr
                      key={item.student.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? "bg-teal-500/5" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelect(item.student.id)}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.student.name}</div>
                        <div className="font-mono text-[11px] text-teal-300">
                          {item.student.registration_number}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">{item.student.phone}</td>

                      <td className="py-3 px-4 text-slate-300">{item.student.course_type}</td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                        {formatCurrency(item.remaining)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${urgencyBadges}`}
                        >
                          {item.daysSinceLastPayment} days ago
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {item.student.last_notified_date
                          ? formatDate(item.student.last_notified_date)
                          : "Never"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            title="Send WhatsApp Reminder"
                            onClick={() => handleSendWhatsApp(item)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-xs flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px]">WhatsApp</span>
                          </button>

                          <button
                            title="Send Email Reminder"
                            onClick={() => handleSendEmail(item)}
                            className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition text-xs flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px]">Email</span>
                          </button>

                          <button
                            title="Mark as Notified"
                            onClick={() => handleMarkNotified(item.student.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
