import React, { useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { Student } from "../../types";
import { calculateAge, formatDate } from "../../utils/formatters";
import { cleanPhone10 } from "../../utils/validators";
import { sendBirthdayGreetingEmail } from "../../services/emailService";
import {
  Cake,
  MessageCircle,
  Mail,
  Sparkles,
  Calendar,
  Gift,
  Smile,
} from "lucide-react";

export const Birthdays: React.FC = () => {
  const { config, students } = useInstitute();
  const { success, error, info } = useToast();

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate();

  // Categorize students by birthday
  const { todayBirthdays, thisWeekBirthdays, thisMonthBirthdays } = useMemo(() => {
    const todayList: Student[] = [];
    const weekList: Student[] = [];
    const monthList: Student[] = [];

    students.forEach((s) => {
      if (!s.dob) return;
      const parts = s.dob.split("-");
      if (parts.length !== 3) return;
      const bMonth = Number(parts[1]);
      const bDay = Number(parts[2]);

      if (bMonth === currentMonth) {
        monthList.push(s);
        if (bDay === currentDay) {
          todayList.push(s);
        } else if (bDay > currentDay && bDay <= currentDay + 7) {
          weekList.push(s);
        }
      }
    });

    return {
      todayBirthdays: todayList,
      thisWeekBirthdays: weekList,
      thisMonthBirthdays: monthList,
    };
  }, [students, currentMonth, currentDay]);

  const handleSendWhatsApp = (student: Student) => {
    if (!config) return;
    const clean = cleanPhone10(student.phone);
    const msg = encodeURIComponent(
      `Happy Birthday ${student.name}! 🎉 Wishing you a wonderful day from Team ${config.name}! 🎂`
    );
    window.open(`https://wa.me/91${clean}?text=${msg}`, "_blank");
  };

  const handleSendEmail = async (student: Student) => {
    if (!config) return;
    if (!student.email) {
      error(`No email registered for ${student.name}`);
      return;
    }
    const res = await sendBirthdayGreetingEmail(config, student);
    if (res.success) {
      success(`Birthday greeting dispatched to ${student.name}! 🎂`);
    } else {
      error(res.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Cake className="w-5 h-5 text-teal-400" /> Student Birthday Desk & Celebrations
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Strengthen student community engagement with automated WhatsApp and email greetings
        </p>
      </div>

      {/* TODAY'S BIRTHDAYS (Highlighted Banner) */}
      <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 animate-bounce" /> Today's Celebrations ({todayBirthdays.length})
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {todayBirthdays.length > 0
            ? `${todayBirthdays.length} Student${todayBirthdays.length > 1 ? "s" : ""} Celebrating Today!`
            : "No student birthdays today."}
        </h2>

        {todayBirthdays.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {todayBirthdays.map((student) => {
              const ageTurning = calculateAge(student.dob) + 1;
              return (
                <div
                  key={student.id}
                  className="p-4 rounded-2xl bg-slate-950/90 border border-teal-500/40 flex items-center justify-between gap-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-400 flex items-center justify-center font-bold text-xl">
                      🎂
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{student.name}</h4>
                      <p className="text-xs text-slate-400">
                        {student.course_type} • Turning{" "}
                        <span className="text-teal-300 font-bold">{ageTurning}</span> years
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSendWhatsApp(student)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Wish on WA
                    </button>
                    <button
                      onClick={() => handleSendEmail(student)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 transition"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Upcoming This Week & This Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This Week */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
            <span>Upcoming This Week ({thisWeekBirthdays.length})</span>
            <Gift className="w-4 h-4 text-teal-400" />
          </h3>

          <div className="space-y-3">
            {thisWeekBirthdays.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No upcoming birthdays in next 7 days.</p>
            ) : (
              thisWeekBirthdays.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{student.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {student.course_type} • Birthday:{" "}
                      <span className="text-teal-300 font-mono">{formatDate(student.dob)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendWhatsApp(student)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSendEmail(student)}
                      className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition text-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* This Month */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
            <span>All Birthdays This Month ({thisMonthBirthdays.length})</span>
            <Calendar className="w-4 h-4 text-teal-400" />
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {thisMonthBirthdays.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No birthdays recorded for this month.</p>
            ) : (
              thisMonthBirthdays.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{student.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {student.course_type} • {formatDate(student.dob)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendWhatsApp(student)}
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSendEmail(student)}
                      className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
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
