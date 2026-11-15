import React, { useState, useEffect } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { ReceiptModal } from "./ReceiptModal";
import { Student, Payment, PaymentMode, Lead } from "../../types";
import { isValidPhone, cleanPhone10, isValidEmail } from "../../utils/validators";
import { getTodayDateString, formatCurrency } from "../../utils/formatters";
import { db } from "../../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  UserPlus,
  CheckCircle2,
  Printer,
  Calendar,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Users,
  CreditCard,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  Building2,
  Tag,
} from "lucide-react";

interface AdmissionFormProps {
  prefillLead?: Lead | null;
  onClearPrefillLead?: () => void;
  onNavigateToRegistry: () => void;
}

export const AdmissionForm: React.FC<AdmissionFormProps> = ({
  prefillLead,
  onClearPrefillLead,
  onNavigateToRegistry,
}) => {
  const { config, courses, batches, universities, sessions, enrollStudent, instituteId } = useInstitute();
  const { success, error, warning } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [dob, setDob] = useState("");
  const [admissionDate, setAdmissionDate] = useState(getTodayDateString());
  const [courseType, setCourseType] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchStartDate, setBatchStartDate] = useState(getTodayDateString());
  const [totalFees, setTotalFees] = useState<number | "">("");
  const [admissionFees, setAdmissionFees] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [paymentNote, setPaymentNote] = useState("");
  const [affiliatedUniversity, setAffiliatedUniversity] = useState<string>("");
  const [universityTotalFees, setUniversityTotalFees] = useState<number | "">("");
  const [universityAdmissionFees, setUniversityAdmissionFees] = useState<number | "">("");
  const [session, setSession] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Late Fees State
  const [hasLateFees, setHasLateFees] = useState(false);
  const [lateFeesAmount, setLateFeesAmount] = useState<number | "">("");
  const [lateFeesReason, setLateFeesReason] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");

  // Success state for after submission
  const [enrolledStudent, setEnrolledStudent] = useState<Student | null>(null);
  const [initialPayment, setInitialPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Active courses, batches & universities
  const activeCourses = courses.filter((c) => c.active);
  const activeBatches = batches.filter((b) => b.active);
  const activeUniversities = universities.filter((u) => u.active);

  const selectedCourseObj = activeCourses.find((c) => c.name === courseType);
  const isUniversityCourse = Boolean(selectedCourseObj?.is_university_course);

  // Pre-fill from Lead if navigated from leads table
  useEffect(() => {
    if (prefillLead) {
      setName(prefillLead.name || "");
      setPhone(prefillLead.phone || "");
      setEmail(prefillLead.email || "");
      if (prefillLead.course_interest) {
        setCourseType(prefillLead.course_interest);
      }
    }
  }, [prefillLead]);

  // Set default course/batch if not chosen
  useEffect(() => {
    if (!courseType && activeCourses.length > 0) {
      handleCourseChange(activeCourses[0].name);
    }
    if (!batchName && activeBatches.length > 0) {
      setBatchName(activeBatches[0].name);
    }
  }, [activeCourses, activeBatches, courseType, batchName]);

  const handleCourseChange = (selectedName: string) => {
    setCourseType(selectedName);
    const matched = activeCourses.find((c) => c.name === selectedName);
    if (matched && matched.fees) {
      setTotalFees(matched.fees);
      setAdmissionFees(Math.round(matched.fees * 0.4));
    }
    if (!matched?.is_university_course) {
      setAffiliatedUniversity("");
      setUniversityTotalFees("");
      setUniversityAdmissionFees("");
      setSession("");
    }
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setFatherName("");
    setMotherName("");
    setDob("");
    setAdmissionDate(getTodayDateString());
    setPaymentNote("");
    setAffiliatedUniversity("");
    setUniversityTotalFees("");
    setUniversityAdmissionFees("");
    setSession("");
    setHasLateFees(false);
    setLateFeesAmount("");
    setLateFeesReason("");
    setDiscountAmount("");
    setDiscountPercent("");
    setRemarks("");
    if (activeCourses.length > 0) {
      handleCourseChange(activeCourses[0].name);
    }
    if (onClearPrefillLead) {
      onClearPrefillLead();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error("Full Name is required.");
      return;
    }

    if (!isValidPhone(phone)) {
      error("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    if (email && !isValidEmail(email)) {
      error("Please enter a valid email address.");
      return;
    }

    if (!courseType) {
      error("Please select a course for admission.");
      return;
    }

    if (!batchName) {
      error("Please select an active batch.");
      return;
    }

    const selectedCourseObj = activeCourses.find((c) => c.name === courseType);
    const isUniversityCourse = Boolean(selectedCourseObj?.is_university_course);

    if (isUniversityCourse && !session) {
      error("Please select a session for university course.");
      return;
    }

    const tFees = Number(totalFees);
    const dAmount = Number(discountAmount || 0);
    if (dAmount > tFees) {
      error("Discount cannot exceed total course fees");
      return;
    }
    const effectiveTotalFees = tFees - dAmount;
    const aFees = Number(admissionFees);
    const lateAmt = hasLateFees ? Number(lateFeesAmount || 0) : 0;
    const finalTotalFees = effectiveTotalFees + lateAmt;

    if (isNaN(tFees) || tFees <= 0) {
      error("Total course fee must be greater than zero.");
      return;
    }

    if (isNaN(aFees) || aFees < 0) {
      error("Admission fee paid must be zero or more.");
      return;
    }

    if (aFees > finalTotalFees) {
      error("Admission fees paid cannot exceed total course fees.");
      return;
    }

    const hasUniversity = isUniversityCourse && Boolean(affiliatedUniversity);
    const uTotal = hasUniversity ? Number(universityTotalFees) || 0 : 0;
    const uPaid = hasUniversity ? Number(universityAdmissionFees) || 0 : 0;

    if (hasUniversity && uTotal > finalTotalFees) {
      error("University fees cannot exceed total course fees.");
      return;
    }

    if (hasUniversity && uPaid > uTotal) {
      error("University payment cannot exceed university total fees.");
      return;
    }

    const institutePortion = finalTotalFees - uTotal;

    if (hasUniversity && (aFees - uPaid) > institutePortion) {
      error("Institute payment exceeds institute portion. Please check amounts.");
      return;
    }

    const instituteAmountReceived = aFees - (hasUniversity ? uPaid : 0);

    setSubmitting(true);

    const res = await enrollStudent({
      name,
      phone: cleanPhone10(phone),
      email,
      address,
      dob,
      admission_date: admissionDate,
      course_type: courseType,
      batch_name: batchName,
      batch_start_date: batchStartDate,
      total_fees: finalTotalFees,
      original_fees: tFees,
      discount_amount: dAmount,
      discount_percent: Number(discountPercent || 0),
      remarks: remarks.trim(),
      admission_fees: aFees,
      payment_mode: paymentMode,
      payment_note: paymentNote,
      linked_lead_id: prefillLead?.id,
      affiliated_university: hasUniversity ? affiliatedUniversity.trim() : undefined,
      university_total_fees: hasUniversity ? uTotal : 0,
      university_admission_fees: hasUniversity ? uPaid : 0,
      institute_portion: institutePortion,
      father_name: fatherName,
      mother_name: motherName,
      session: isUniversityCourse ? session : undefined,
    });

    if (res.success && res.student && db && instituteId) {
      if (hasLateFees && lateAmt > 0) {
        try {
          const lateFeesPaymentRef = doc(collection(db, `institutes/${instituteId}/payments`));
          await setDoc(lateFeesPaymentRef, {
            id: lateFeesPaymentRef.id,
            student_id: res.student.id,
            amount: lateAmt,
            mode: paymentMode,
            date: admissionDate || getTodayDateString(),
            type: "Late Fee",
            payment_for: "Late Fees",
            university_name: "",
            note: lateFeesReason.trim() || "Late admission fees",
            timestamp: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to record late fee payment:", err);
        }
      }
    }

    setSubmitting(false);

    if (res.success && res.student) {
      success(`Student enrolled successfully! Reg No: ${res.student.registration_number}`);
      setEnrolledStudent(res.student);
      if (res.initialPayment) {
        setInitialPayment(res.initialPayment);
      } else if (instituteAmountReceived > 0) {
        setInitialPayment({
          id: `pay_${Date.now()}`,
          student_id: res.student.id,
          amount: instituteAmountReceived,
          mode: paymentMode,
          date: admissionDate,
          type: "Admission Fee",
          note: paymentNote || "Initial admission fee collection",
          payment_for: "Admission Fees",
          university_name: "",
          timestamp: { seconds: Math.floor(Date.now() / 1000) },
        });
      } else {
        setInitialPayment(null);
      }
      if (onClearPrefillLead) {
        onClearPrefillLead();
      }
    } else {
      error(res.error || "Admission enrollment failed.");
    }
  };

  const dAmount = Number(discountAmount || 0);
  const effectiveTotalFees = Number(totalFees || 0) - dAmount;
  const totalWithLateFees = effectiveTotalFees + (hasLateFees ? Number(lateFeesAmount || 0) : 0);
  const remainingBalance = totalWithLateFees - Number(admissionFees || 0);

  if (enrolledStudent && config) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500" />

          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/20">
            <CheckCircle2 className="w-8 h-8 text-teal-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Admission Successful!</h2>
          <p className="text-xs text-slate-400 mb-6">
            The student record and initial payment voucher have been generated.
          </p>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left mb-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <span className="text-xs text-slate-400">Registration Number</span>
              <span className="font-mono font-bold text-teal-300 text-sm">
                {enrolledStudent.registration_number}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Student Name</span>
              <span className="font-semibold text-white">{enrolledStudent.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Course & Batch</span>
              <span className="text-slate-200">
                {enrolledStudent.course_type} ({enrolledStudent.batch_name})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Fees</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(enrolledStudent.total_fees)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Initial Paid Amount</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(enrolledStudent.admission_fees)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Remaining Balance</span>
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency(enrolledStudent.remaining_fees)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {initialPayment && (
              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Fee Receipt
              </button>
            )}
            <button
              onClick={() => {
                setEnrolledStudent(null);
                setInitialPayment(null);
                handleReset();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Enroll Another
            </button>
          </div>

          <button
            onClick={onNavigateToRegistry}
            className="mt-4 text-xs text-slate-400 hover:text-teal-400 transition inline-flex items-center gap-1"
          >
            View Student Roster <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {initialPayment && (
          <ReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            student={enrolledStudent}
            payment={initialPayment}
            config={config}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-400" /> New Admission Enrollment
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Atomically generates next registration number under prefix:{" "}
            <span className="font-mono text-teal-300 font-bold">{config?.reg_prefix}</span>
          </p>
        </div>

        {prefillLead && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-filled from Lead Inquiry</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Student Personal Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-400" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Student Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mobile Phone (10 digits) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9826012345"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Father's Name (Optional)
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mother's Name (Optional)
              </label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="e.g. Sunita Sharma"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Residential Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, colony, city, state"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Course & Batch Assignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-teal-400" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Course & Batch Assignment
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Selected Course *
              </label>
              <select
                required
                value={courseType}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              >
                {activeCourses.length === 0 ? (
                  <option value="">No active courses found (add in Settings)</option>
                ) : (
                  activeCourses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.is_university_course ? "(University)" : ""} {c.fees ? `(₹${c.fees.toLocaleString()})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Allocated Batch *
              </label>
              <select
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              >
                {activeBatches.length === 0 ? (
                  <option value="">No active batches found (add in Settings)</option>
                ) : (
                  activeBatches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedCourseObj?.is_university_course && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Session *
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
                  required
                >
                  <option value="">-- Select Session --</option>
                  {sessions
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
                {sessions.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠️ No sessions added yet. Go to Settings → Sessions to add.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admission Date
              </label>
              <input
                type="date"
                required
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Batch Start Date
              </label>
              <input
                type="date"
                required
                value={batchStartDate}
                onChange={(e) => setBatchStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section: University Affiliation (Optional) */}
        {isUniversityCourse && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-400" />
              </div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                University Affiliation (Optional)
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Affiliated University
                </label>
                <select
                  value={affiliatedUniversity}
                  onChange={(e) => {
                    setAffiliatedUniversity(e.target.value);
                    if (!e.target.value) {
                      setUniversityTotalFees("");
                      setUniversityAdmissionFees("");
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
                >
                  <option value="">-- Not Applicable --</option>
                  {activeUniversities.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {affiliatedUniversity && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      University Fees (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={universityTotalFees}
                      onChange={(e) =>
                        setUniversityTotalFees(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-amber-300 font-mono placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      University Fee Paid Now (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={Number(universityTotalFees) || undefined}
                      value={universityAdmissionFees}
                      onChange={(e) =>
                        setUniversityAdmissionFees(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-amber-300 font-mono placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>
                </>
              )}

              {affiliatedUniversity && (
                <div className="col-span-2 p-3.5 rounded-xl bg-slate-800 border border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Institute Fee (Auto):</span>
                  <span className="font-mono font-bold text-teal-300 text-sm">
                    {formatCurrency(Math.max(0, Number(totalFees || 0) - Number(universityTotalFees || 0)))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Fees & Initial Payment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-teal-400" />
            </div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Fee Structure & Initial Collection
            </h2>
          </div>

          {/* Late Fees & Discount Side by Side */}
          <div className="col-span-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* LEFT — Late Fees */}
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  {/* Toggle */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      onClick={() => setHasLateFees(!hasLateFees)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        hasLateFees ? "bg-rose-500" : "bg-slate-700"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          hasLateFees ? "translate-x-5 left-0.5" : "left-0.5"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-rose-300">
                      Add Late Fees
                    </span>
                    <span className="text-xs text-slate-500">
                      (For delayed admissions)
                    </span>
                  </div>

                  {/* Fields — only when toggle ON */}
                  {hasLateFees && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-rose-500/20">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Late Fees Amount (₹)</label>
                        <input
                          type="number"
                          value={lateFeesAmount}
                          onChange={(e) => setLateFeesAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="e.g. 500"
                          className="w-full bg-slate-800 border border-rose-500/30 focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Reason (Optional)</label>
                        <input
                          type="text"
                          value={lateFeesReason}
                          onChange={(e) => setLateFeesReason(e.target.value)}
                          placeholder="e.g. Admission after last date"
                          className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {hasLateFees && Number(lateFeesAmount || 0) > 0 && (
                  <div className="bg-slate-800/60 rounded-lg p-2.5 text-[11px] text-slate-400 mt-3">
                    <span className="text-white">Late fees ₹{Number(lateFeesAmount).toLocaleString()}</span> added.
                  </div>
                )}
              </div>

              {/* RIGHT — Discount */}
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">
                      Discount (Optional)
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => {
                            const amount = e.target.value === "" ? "" : Number(e.target.value);
                            const tFees = Number(totalFees) || 0;
                            const percent = amount !== "" && tFees > 0 ? Number(((Number(amount) / tFees) * 100).toFixed(2)) : "";
                            setDiscountAmount(amount);
                            setDiscountPercent(percent);
                          }}
                          placeholder="e.g. 1000"
                          min="0"
                          max={Number(totalFees) || undefined}
                          className="w-full bg-slate-800 border border-violet-500/30 focus:border-violet-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Percent (%)</label>
                        <input
                          type="number"
                          value={discountPercent}
                          onChange={(e) => {
                            const percent = e.target.value === "" ? "" : Number(e.target.value);
                            const tFees = Number(totalFees) || 0;
                            const amount = percent !== "" && tFees > 0 ? Number(((Number(percent) / 100) * tFees).toFixed(0)) : "";
                            setDiscountPercent(percent);
                            setDiscountAmount(amount);
                          }}
                          placeholder="e.g. 10"
                          min="0"
                          max="100"
                          className="w-full bg-slate-800 border border-violet-500/30 focus:border-violet-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {Number(discountAmount || 0) > 0 && (
                  <div className="text-xs text-violet-300 bg-slate-800/60 rounded-lg px-3 py-2 mt-3 flex justify-between items-center">
                    <span>After Discount:</span>
                    <span className="font-semibold font-mono">₹{(Number(totalFees || 0) - Number(discountAmount || 0)).toLocaleString()}</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Total Course Fees (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 150000"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admission Fees Paid (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={admissionFees}
                onChange={(e) => setAdmissionFees(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Remaining Balance (Auto)
              </label>
              <div className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-amber-400">
                {formatCurrency(Math.max(0, remainingBalance))}
              </div>
              {hasLateFees && Number(lateFeesAmount || 0) > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Course: ₹{effectiveTotalFees} + Late: ₹{lateFeesAmount} = ₹{totalWithLateFees} total
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Payment Transaction Note / Reference
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. UPI Ref #9482710482 or Cheque #102938"
                className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-4 h-4 text-slate-400" />
            <label className="text-sm font-semibold text-white">
              Remarks
              <span className="text-slate-500 font-normal ml-2">(Optional)</span>
            </label>
          </div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Any additional notes about this admission... e.g. Referred by alumni, special arrangement, scholarship details, etc."
            className="w-full bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-slate-500 mt-2">
            This note is for internal reference only.
          </p>
        </div>

        {/* Full width submit button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-4 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-base transition shadow-xl shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Generating Reg No...
              </span>
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> Complete Admission
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
