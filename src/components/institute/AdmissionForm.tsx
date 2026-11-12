import React, { useState, useEffect } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { ReceiptModal } from "./ReceiptModal";
import { Student, Payment, PaymentMode, Lead } from "../../types";
import { isValidPhone, cleanPhone10, isValidEmail } from "../../utils/validators";
import { getTodayDateString, formatCurrency } from "../../utils/formatters";
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
  const { config, courses, batches, universities, enrollStudent } = useInstitute();
  const { success, error, warning } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
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
  const [submitting, setSubmitting] = useState(false);

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
    }
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDob("");
    setAdmissionDate(getTodayDateString());
    setPaymentNote("");
    setAffiliatedUniversity("");
    setUniversityTotalFees("");
    setUniversityAdmissionFees("");
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

    const tFees = Number(totalFees);
    const aFees = Number(admissionFees);

    if (isNaN(tFees) || tFees <= 0) {
      error("Total course fee must be greater than zero.");
      return;
    }

    if (isNaN(aFees) || aFees < 0) {
      error("Admission fee paid must be zero or more.");
      return;
    }

    if (aFees > tFees) {
      error("Admission fees paid cannot exceed total course fees.");
      return;
    }

    const hasUniversity = isUniversityCourse && Boolean(affiliatedUniversity);
    const uTotal = hasUniversity ? Number(universityTotalFees) || 0 : 0;
    const uPaid = hasUniversity ? Number(universityAdmissionFees) || 0 : 0;

    if (hasUniversity && uPaid > aFees) {
      error("University fee paid now cannot exceed total admission fees paid.");
      return;
    }

    if (hasUniversity && uPaid > uTotal) {
      error("University fee paid now cannot exceed total university fees.");
      return;
    }

    const instituteAmountReceived = aFees - (hasUniversity ? uPaid : 0);

    // DEBUG console.logs as requested
    console.log("DEBUG admission_fees_paid:", aFees);
    console.log("DEBUG university_fee_paid_now:", hasUniversity ? uPaid : 0);
    console.log("DEBUG total_fees:", tFees);
    console.log("DEBUG university_total_fees:", hasUniversity ? uTotal : 0);
    console.log(
      "DEBUG payments being created:",
      "institute:",
      instituteAmountReceived,
      "university:",
      hasUniversity ? uPaid : 0
    );

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
      total_fees: tFees,
      admission_fees: aFees,
      payment_mode: paymentMode,
      payment_note: paymentNote,
      linked_lead_id: prefillLead?.id,
      affiliated_university: hasUniversity ? affiliatedUniversity.trim() : undefined,
      university_total_fees: hasUniversity ? uTotal : 0,
      university_admission_fees: hasUniversity ? uPaid : 0,
    });

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

  // If enrollment succeeded, render congratulations & receipt trigger screen
  if (enrolledStudent && config) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
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

        {/* Official Receipt Modal */}
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-400" /> New Admission Enrollment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Student Personal Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Student Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Mobile Phone (10 digits) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9826012345"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Residential Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, colony, city, state"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Course & Batch Assignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Course & Batch Assignment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Selected Course *
              </label>
              <select
                required
                value={courseType}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Allocated Batch *
              </label>
              <select
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admission Date
              </label>
              <input
                type="date"
                required
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Batch Start Date
              </label>
              <input
                type="date"
                required
                value={batchStartDate}
                onChange={(e) => setBatchStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section: University Affiliation (Optional) - only visible when selected course has is_university_course === true */}
        {isUniversityCourse && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in duration-200">
            <div className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <span>🏛️</span> UNIVERSITY AFFILIATION (OPTIONAL)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Only for DCA, PGDCA or university-affiliated courses
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono placeholder-slate-500 focus:outline-none transition"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Fees & Initial Payment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Fee Structure & Initial Collection
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Total Course Fees (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 150000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admission Fees Paid (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={admissionFees}
                onChange={(e) => setAdmissionFees(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-mono placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Remaining Balance (Auto)
              </label>
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400">
                {formatCurrency(Math.max(0, Number(totalFees || 0) - Number(admissionFees || 0)))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Payment Transaction Note / Reference
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. UPI Ref #9482710482 or Cheque #102938"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Generating Reg No...
              </span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Complete Admission
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
