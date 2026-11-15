import React, { useState } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { ReceiptModal } from "./ReceiptModal";
import { ConfirmModal } from "../shared/ConfirmModal";
import {
  Student,
  Payment,
  StudentStatus,
  PaymentMode,
  CertificateStatus,
} from "../../types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getTodayDateString,
} from "../../utils/formatters";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  CreditCard,
  Plus,
  Printer,
  History,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Building2,
  X,
  Tag,
} from "lucide-react";

interface StudentDetailProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ studentId, onBack }) => {
  const {
    config,
    students,
    payments,
    courses,
    batches,
    universities,
    sessions,
    updateStudent,
    updateStudentStatus,
    issueCertificate,
    revokeCertificate,
    deleteStudent,
    addPayment,
  } = useInstitute();
  const { success, error, info } = useToast();

  const student = students.find((s) => s.id === studentId);
  const studentPayments = payments
    .filter((p) => p.student_id === studentId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Modals state
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  // Add Payment form state
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMode, setPayMode] = useState<PaymentMode>("UPI");
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payNote, setPayNote] = useState<string>("");
  const [payPaymentFor, setPayPaymentFor] = useState<"Admission Fees" | "Exam Fees" | "Late Fees" | "">("");
  const [payUniversity, setPayUniversity] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Change Status form state
  const [newStatus, setNewStatus] = useState<StudentStatus>("Active");
  const [statusNote, setStatusNote] = useState("");
  const [dropoutReason, setDropoutReason] = useState("");

  // Edit Profile form state (Tabs: personal, course, university)
  const [activeEditTab, setActiveEditTab] = useState<"personal" | "course" | "university">("personal");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editFatherName, setEditFatherName] = useState("");
  const [editMotherName, setEditMotherName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAdmissionDate, setEditAdmissionDate] = useState("");
  const [editStatus, setEditStatus] = useState<StudentStatus>("Active");

  const [editCourse, setEditCourse] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editSession, setEditSession] = useState("");
  const [editBatchStartDate, setEditBatchStartDate] = useState("");
  const [editTotalFees, setEditTotalFees] = useState<number | "">(0);
  const [editCertificateStatus, setEditCertificateStatus] = useState<CertificateStatus>("Not Issued");

  const [editAffiliatedUniversity, setEditAffiliatedUniversity] = useState("");
  const [editUniversityTotalFees, setEditUniversityTotalFees] = useState<number | "">(0);
  const [editDiscountAmount, setEditDiscountAmount] = useState<number | "">(0);
  const [editDiscountPercent, setEditDiscountPercent] = useState<number | "">(0);
  const [editRemarks, setEditRemarks] = useState("");

  if (!student || !config) {
    return (
      <div className="py-12 text-center text-slate-400">
        <p className="text-sm">Student record not found or has been removed.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-teal-400 text-xs font-semibold"
        >
          ← Return to Registry
        </button>
      </div>
    );
  }

  // Fee calculation logic
  const totalCourseFees = Number(student.total_fees || 0);
  const universityTotalFees = Number(student.university_total_fees || 0);
  const institutePortion = totalCourseFees - universityTotalFees;

  const universityPaid = studentPayments
    .filter((p) => p.university_name && p.university_name !== "")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const institutePaid = studentPayments
    .filter((p) => !p.university_name || p.university_name === "")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalCollected = institutePaid + universityPaid;

  const outstandingBalance = totalCourseFees - totalCollected;

  const universityBalance = universityTotalFees - universityPaid;

  const instituteBalance = institutePortion - institutePaid;

  const hasAffiliatedUniv = Boolean(
    student.affiliated_university && student.affiliated_university.trim()
  );

  const percentPaid =
    totalCourseFees > 0
      ? Math.round((totalCollected / totalCourseFees) * 100)
      : 0;

  // Payment Mode Breakdown
  const instituteModeBreakdown: Record<string, number> = {};
  studentPayments
    .filter((p) => !p.university_name || p.university_name === "")
    .forEach((p) => {
      instituteModeBreakdown[p.mode] =
        (instituteModeBreakdown[p.mode] || 0) + Number(p.amount || 0);
    });

  const universityModeBreakdown: Record<string, number> = {};
  studentPayments
    .filter((p) => p.university_name && p.university_name !== "")
    .forEach((p) => {
      universityModeBreakdown[p.mode] =
        (universityModeBreakdown[p.mode] || 0) + Number(p.amount || 0);
    });

  const handleOpenEdit = () => {
    setActiveEditTab("personal");
    setEditName(student.name);
    setEditPhone(student.phone);
    setEditEmail(student.email || "");
    setEditDob(student.dob || "");
    setEditFatherName(student.father_name || "");
    setEditMotherName(student.mother_name || "");
    setEditAddress(student.address || "");
    setEditAdmissionDate(student.admission_date || "");
    setEditStatus(student.status);
    setEditRemarks(student.remarks || "");

    setEditCourse(student.course_type);
    setEditBatch(student.batch_name);
    setEditSession(student.session || "");
    setEditBatchStartDate(student.batch_start_date || "");
    setEditTotalFees(student.original_fees || student.total_fees || 0);
    setEditDiscountAmount(student.discount_amount || 0);
    setEditDiscountPercent(student.discount_percent || 0);
    setEditCertificateStatus(student.certificate_status || "Not Issued");

    setEditAffiliatedUniversity(student.affiliated_university || "");
    setEditUniversityTotalFees(student.university_total_fees || 0);

    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalFeesVal = Number(editTotalFees) || 0;
    const dAmount = Number(editDiscountAmount || 0);
    if (dAmount > originalFeesVal) {
      error("Discount cannot exceed total course fees");
      return;
    }
    const effectiveTotal = originalFeesVal - dAmount;
    const newUnivFees = Number(editUniversityTotalFees) || 0;
    const currentCollected = studentPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const newRemainingFees = Math.max(0, effectiveTotal - currentCollected);

    await updateStudent(student.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      dob: editDob,
      father_name: editFatherName.trim(),
      mother_name: editMotherName.trim(),
      address: editAddress.trim(),
      admission_date: editAdmissionDate,
      status: editStatus,
      course_type: editCourse,
      batch_name: editBatch,
      session: editSession,
      batch_start_date: editBatchStartDate,
      total_fees: effectiveTotal,
      original_fees: originalFeesVal,
      discount_amount: dAmount,
      discount_percent: Number(editDiscountPercent || 0),
      remarks: editRemarks.trim(),
      remaining_fees: newRemainingFees,
      certificate_status: editCertificateStatus,
      affiliated_university: editAffiliatedUniversity.trim(),
      university_total_fees: newUnivFees,
    });
    success("Student profile and fees updated successfully.");
    setIsEditProfileModalOpen(false);
  };

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStudentStatus(student.id, newStatus, statusNote, undefined, dropoutReason);
    success(`Student status changed to ${newStatus}`);
    setIsStatusModalOpen(false);
    setStatusNote("");
    setDropoutReason("");
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      error("Please enter a valid payment amount.");
      return;
    }

    const isUnivPay = Boolean(payPaymentFor && payUniversity.trim());
    if (!isUnivPay && amt > outstandingBalance) {
      error(`Amount cannot exceed outstanding balance of ₹${outstandingBalance}`);
      return;
    }
    if (isUnivPay && hasAffiliatedUniv && amt > universityBalance) {
      error(`Amount cannot exceed university balance of ₹${universityBalance}`);
      return;
    }

    setSubmittingPayment(true);
    const res = await addPayment({
      student_id: student.id,
      amount: amt,
      mode: payMode,
      date: payDate,
      type: isUnivPay ? "University Fee" : (payPaymentFor || "Fee Payment"),
      note: payNote,
      payment_for: payPaymentFor || "",
      university_name: payPaymentFor ? payUniversity.trim() : "",
    });
    setSubmittingPayment(false);

    if (res.success) {
      success("Payment recorded successfully!");
      setIsAddPaymentModalOpen(false);
      setPayAmount("");
      setPayNote("");
      setPayPaymentFor("");
      setPayUniversity("");
    } else {
      error(res.error || "Failed to record payment");
    }
  };

  const handleDeleteConfirmed = async () => {
    await deleteStudent(student.id, deleteMode === "hard");
    success(`Student record ${deleteMode === "hard" ? "permanently deleted" : "archived"}.`);
    onBack();
  };

  const verifyUrl = `${window.location.origin}?verify=1&inst=${config.institute_id}&reg=${student.registration_number}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Registry
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewStatus(student.status);
              setIsStatusModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
          >
            Change Status
          </button>
          <button
            onClick={handleOpenEdit}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Grid: Profile Card (left) + Fee Summary Card (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section A: Profile Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-teal-500/10">
                {student.name.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white">{student.name}</h1>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                      {
                        Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        Completed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                        Dropped: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                        "On Hold": "bg-amber-500/10 text-amber-400 border-amber-500/30",
                      }[student.status]
                    }`}
                  >
                    {student.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-teal-300 mt-1">
                  Reg No: <span className="font-bold">{student.registration_number}</span>
                </p>
              </div>
            </div>

            {student.status === "Dropped" && student.dropout_reason && (
              <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl max-w-xs">
                <span className="font-semibold block">Dropout Reason:</span>
                {student.dropout_reason} ({formatDate(student.dropout_date)})
              </div>
            )}
          </div>

          {/* Key fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Phone className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Phone Number</span>
                <span className="font-mono text-white">{student.phone}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Mail className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-500 block text-[10px] uppercase">Email Address</span>
                <span className="font-mono text-white truncate block">
                  {student.email || "Not provided"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Admission Date</span>
                <span className="text-white">{formatDate(student.admission_date)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Date of Birth</span>
                <span className="text-white">{student.dob ? formatDate(student.dob) : "Not provided"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Father's Name</span>
              <span className="text-white">{student.father_name || "Not provided"}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Mother's Name</span>
              <span className="text-white">{student.mother_name || "Not provided"}</span>
            </div>

            <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Residential Address</span>
                <span className="text-white">{student.address || "Not provided"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Course Enrolled</span>
              <span className="text-white font-semibold">{student.course_type}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Assigned Batch</span>
              <span className="text-white font-semibold">
                {student.batch_name} (Started {formatDate(student.batch_start_date)})
              </span>
            </div>

            {student.session && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Session</span>
                <span className="text-amber-300 font-medium">{student.session}</span>
              </div>
            )}

            {student.affiliated_university && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 sm:col-span-2">
                <span className="text-amber-400 block text-[10px] uppercase font-semibold flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Affiliated University & Fees
                </span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white font-medium">{student.affiliated_university}</span>
                  <span className="font-mono text-amber-300 font-bold">{formatCurrency(student.university_total_fees || 0)}</span>
                </div>
              </div>
            )}

            {Number(student.discount_amount || 0) > 0 && (
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 sm:col-span-2">
                <span className="text-violet-300 block text-[10px] uppercase font-semibold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Course Discount Applied
                </span>
                <div className="flex justify-between items-center mt-1 text-xs">
                  <span className="text-white font-medium">
                    {student.discount_percent ? `${student.discount_percent}% off` : "Custom Discount"}
                  </span>
                  <span className="font-mono text-violet-300 font-bold">
                    -{formatCurrency(student.discount_amount)}
                  </span>
                </div>
              </div>
            )}

            {student.remarks && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Admission Remarks</span>
                <span className="text-slate-200 mt-0.5 block text-xs">{student.remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section B: Fee Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Fee Summary & Ledger
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{percentPaid}% Paid</span>
            </div>

            {/* Numbers */}
            <div className="space-y-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Course Fees:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatCurrency(totalCourseFees)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Fees Paid:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(totalCollected)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Outstanding Balance:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    outstandingBalance > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>

              {hasAffiliatedUniv && (
                <>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                        <GraduationCap className="w-3.5 h-3.5" /> University Portion:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(universityTotalFees)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs">
                    <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                      <GraduationCap className="w-3.5 h-3.5" /> University Paid:
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(universityPaid)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">University Balance:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        universityBalance > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {universityBalance > 0 ? formatCurrency(universityBalance) : "₹0 (All Cleared)"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-teal-400 flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5" /> Institute Portion:
                      </span>
                    </div>
                    <span className="font-mono font-bold text-teal-400 text-sm">
                      {formatCurrency(institutePortion)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex justify-between items-center text-xs">
                    <span className="text-teal-400 flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5" /> Institute Paid:
                    </span>
                    <span className="font-mono font-bold text-teal-400 text-sm">
                      {formatCurrency(institutePaid)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Institute Balance:</span>
                    <span className="font-mono font-bold text-sm">
                      {instituteBalance < 0 ? (
                        <span className="text-rose-400">Overpaid by {formatCurrency(Math.abs(instituteBalance))}</span>
                      ) : instituteBalance > 0 ? (
                        <span className="text-amber-400">{formatCurrency(instituteBalance)}</span>
                      ) : (
                        <span className="text-emerald-400">Cleared ✓</span>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>

            {/* Payment Mode breakdown */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" /> INSTITUTE PAYMENTS BREAKDOWN
                </span>
                {Object.keys(instituteModeBreakdown).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No institute payments recorded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(instituteModeBreakdown).map(([mode, amt]) => (
                      <div key={mode} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">{mode}</span>
                        <span className="font-mono font-semibold text-teal-300">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {universityPaid > 0 && (
                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> UNIVERSITY PAYMENTS BREAKDOWN
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(universityModeBreakdown).map(([mode, amt]) => (
                      <div key={mode} className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <span className="text-amber-400/80 block text-[10px]">{mode}</span>
                        <span className="font-mono font-semibold text-amber-300">
                          {formatCurrency(amt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Payment Button */}
          {outstandingBalance > 0 || (hasAffiliatedUniv && universityBalance > 0) ? (
            <button
              onClick={() => {
                setPayAmount(outstandingBalance > 0 ? outstandingBalance : universityBalance);
                setIsAddPaymentModalOpen(true);
              }}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Record Installment / Payment
            </button>
          ) : (
            <div className="mt-6 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> All Fees Cleared in Full
            </div>
          )}
        </div>
      </div>

      {/* Section C: Payment History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            Payment History ({studentPayments.length} transactions)
          </h3>
          {student.remaining_fees > 0 && (
            <button
              onClick={() => setIsAddPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Add Payment
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment For</th>
                <th className="py-3 px-4">University</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Note / Reference</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {studentPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                studentPayments.map((p) => {
                  const isUnivPayment = Boolean(p.university_name && p.university_name.trim());
                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        isUnivPayment
                          ? "bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-l-amber-400 text-amber-200"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono">{formatDate(p.date)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`font-mono font-bold ${
                              isUnivPayment ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {formatCurrency(p.amount)}
                          </span>
                          {isUnivPayment && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              University
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {p.payment_for ? (
                          <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-medium text-slate-200">
                            {p.payment_for}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isUnivPayment ? (
                          <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            {p.university_name}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{p.mode}</td>
                      <td className="py-3 px-4">
                        {isUnivPayment ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1">
                            University Fee
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200">
                            {p.payment_for || "Payment"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{p.note || "-"}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedPaymentForReceipt(p)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-semibold transition"
                        >
                          <Printer className="w-3 h-3" /> View Receipt
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

      {/* Section E: Certificate Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Course Completion Certificate</h3>
              <p className="text-xs text-slate-400">
                Official accreditation status • Status:{" "}
                <span
                  className={`font-semibold ${
                    student.certificate_status === "Issued" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {student.certificate_status}
                </span>
                {student.certificate_issue_date && ` (Issued on ${formatDate(student.certificate_issue_date)})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {student.certificate_status === "Not Issued" ? (
              <button
                onClick={async () => {
                  await issueCertificate(student.id);
                  success("Certificate issued successfully!");
                }}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
              >
                Issue Certificate
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Public Verify Link
                </a>
                <button
                  onClick={async () => {
                    await revokeCertificate(student.id);
                    info("Certificate revoked.");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 text-rose-300 border border-slate-700 text-xs transition"
                >
                  Revoke
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section F: Status History Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
          <History className="w-4 h-4" /> Status History Timeline
        </h3>

        {(!student.status_history || student.status_history.length === 0) ? (
          <p className="text-xs text-slate-500">No status changes recorded.</p>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {student.status_history.map((entry, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-slate-900" />
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">
                      Status changed to <span className="text-teal-300">{entry.new_status}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatDate(entry.changed_date)}
                    </span>
                  </div>
                  <p className="text-slate-400">{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section G: Danger Zone (Delete) */}
      <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/10 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Danger Zone: Delete Student
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Soft delete archives the student from active lists; Hard delete permanently wipes the document.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDeleteMode("soft");
                setIsDeleteModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              Soft Delete (Archive)
            </button>
            <button
              onClick={() => {
                setDeleteMode("hard");
                setIsDeleteModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition shadow-lg shadow-rose-950"
            >
              Permanent Delete
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedPaymentForReceipt && (
        <ReceiptModal
          isOpen={true}
          onClose={() => setSelectedPaymentForReceipt(null)}
          student={student}
          payment={selectedPaymentForReceipt}
          config={config}
          allPayments={studentPayments}
        />
      )}

      {/* Add Payment Modal */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold text-white mb-1">Record Fee Installment</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pending Balance: <span className="font-mono text-amber-400 font-bold">{formatCurrency(outstandingBalance)}</span>
              {hasAffiliatedUniv && (
                <span className="ml-2 text-slate-400">
                  • Univ Balance: <span className="font-mono text-amber-300 font-bold">{formatCurrency(universityBalance)}</span>
                </span>
              )}
            </p>

            <form onSubmit={handleAddPaymentSubmit} className="space-y-3">
              {hasAffiliatedUniv &&
                (!payPaymentFor || payPaymentFor === ("" as any) || !payUniversity) &&
                universityBalance > 0 &&
                institutePaid < institutePortion && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                    ⚠️ University fee of {formatCurrency(universityBalance)} is pending for {student.affiliated_university}. Consider collecting university payment first.
                  </div>
                )}

              {hasAffiliatedUniv &&
                (!payPaymentFor || payPaymentFor === ("" as any) || !payUniversity) &&
                institutePaid >= institutePortion &&
                universityBalance > 0 && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs space-y-1">
                    <div>
                      ⚠️ Institute portion is fully collected. Remaining {formatCurrency(outstandingBalance)} should go to university ({student.affiliated_university}).
                    </div>
                    <div>Please select the university in Payment For.</div>
                  </div>
                )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Amount to Collect (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter amount"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-sm text-emerald-400 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Payment For <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <select
                  value={payPaymentFor}
                  onChange={(e) => {
                    const val = e.target.value as "Admission Fees" | "Exam Fees" | "Late Fees" | "";
                    setPayPaymentFor(val);
                    if (!val) setPayUniversity("");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Regular Institute Payment --</option>
                  <option value="Admission Fees">Admission Fees</option>
                  <option value="Exam Fees">Exam Fees</option>
                  <option value="Late Fees">Late Fees</option>
                </select>
              </div>

              {Boolean(payPaymentFor) && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    University <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={payUniversity}
                    onChange={(e) => setPayUniversity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Select University --</option>
                    {universities.filter((u) => u.active).length === 0 ? (
                      <option value="" disabled>
                        No universities added — go to Settings
                      </option>
                    ) : (
                      universities
                        .filter((u) => u.active)
                        .map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Note / Transaction ID
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Ref #89284729"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                {(() => {
                  const isSaveBlocked =
                    hasAffiliatedUniv &&
                    (!payPaymentFor || payPaymentFor === ("" as any) || !payUniversity) &&
                    institutePaid >= institutePortion &&
                    universityBalance > 0;
                  return (
                    <button
                      type="submit"
                      disabled={submittingPayment || isSaveBlocked}
                      className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isSaveBlocked ? "Institute portion is fully collected. Please select university." : ""}
                    >
                      {submittingPayment ? "Recording..." : "Save & Generate Receipt"}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold text-white mb-3">Update Enrollment Status</h3>
            <form onSubmit={handleStatusChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StudentStatus)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Dropped">Dropped</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              {newStatus === "Dropped" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Dropout Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={dropoutReason}
                    onChange={(e) => setDropoutReason(e.target.value)}
                    placeholder="e.g. Job placement, relocated, personal reasons"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Audit Note</label>
                <textarea
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Reason or notes regarding this status change..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
                >
                  Confirm Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (3 Tabs: Personal Info, Course & Fees, University) */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-400" /> Edit Student Record
              </h3>
              <button
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveEditTab("personal")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                  activeEditTab === "personal"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1. Personal Info
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab("course")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                  activeEditTab === "course"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                2. Course & Fees
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab("university")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                  activeEditTab === "university"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                3. University
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {activeEditTab === "personal" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Father's Name</label>
                      <input
                        type="text"
                        value={editFatherName}
                        onChange={(e) => setEditFatherName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mother's Name</label>
                      <input
                        type="text"
                        value={editMotherName}
                        onChange={(e) => setEditMotherName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Residential Address</label>
                    <textarea
                      rows={2}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Admission Date</label>
                      <input
                        type="date"
                        value={editAdmissionDate}
                        onChange={(e) => setEditAdmissionDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as StudentStatus)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Dropped">Dropped</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Admission Remarks</label>
                    <textarea
                      rows={2}
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      placeholder="Admission remarks or special notes..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {activeEditTab === "course" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Course *</label>
                      <select
                        value={editCourse}
                        onChange={(e) => setEditCourse(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Batch *</label>
                      <select
                        value={editBatch}
                        onChange={(e) => setEditBatch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {batches.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Session</label>
                      <select
                        value={editSession}
                        onChange={(e) => setEditSession(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">-- Select Session --</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Batch Start Date</label>
                      <input
                        type="date"
                        value={editBatchStartDate}
                        onChange={(e) => setEditBatchStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-teal-400 mb-1">
                        Original Course Fees (₹) * ✏️ Editable
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editTotalFees}
                        onChange={(e) => setEditTotalFees(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-slate-950 border border-teal-500/50 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-teal-300 font-mono focus:outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Certificate Status</label>
                      <select
                        value={editCertificateStatus}
                        onChange={(e) => setEditCertificateStatus(e.target.value as CertificateStatus)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Not Issued">Not Issued</option>
                        <option value="Issued">Issued</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300">Discount (Optional)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Discount Amount (₹)</label>
                        <input
                          type="number"
                          value={editDiscountAmount}
                          onChange={(e) => {
                            const amount = e.target.value === "" ? "" : Number(e.target.value);
                            const tFees = Number(editTotalFees) || 0;
                            const percent = amount !== "" && tFees > 0 ? Number(((Number(amount) / tFees) * 100).toFixed(2)) : "";
                            setEditDiscountAmount(amount);
                            setEditDiscountPercent(percent);
                          }}
                          className="w-full bg-slate-950 border border-violet-500/30 focus:border-violet-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Discount Percent (%)</label>
                        <input
                          type="number"
                          value={editDiscountPercent}
                          onChange={(e) => {
                            const percent = e.target.value === "" ? "" : Number(e.target.value);
                            const tFees = Number(editTotalFees) || 0;
                            const amount = percent !== "" && tFees > 0 ? Number(((Number(percent) / 100) * tFees).toFixed(0)) : "";
                            setEditDiscountPercent(percent);
                            setEditDiscountAmount(amount);
                          }}
                          className="w-full bg-slate-950 border border-violet-500/30 focus:border-violet-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeEditTab === "university" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                      University Name ✏️ Editable
                    </label>
                    <select
                      value={editAffiliatedUniversity}
                      onChange={(e) => setEditAffiliatedUniversity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- None / Direct Institute Course --</option>
                      {universities.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                      University Total Fees (₹) ✏️ Editable
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editUniversityTotalFees}
                      onChange={(e) => setEditUniversityTotalFees(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-amber-500/50 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none font-bold"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">Part of total course fees allocated to university.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirmed}
          title={
            deleteMode === "hard"
              ? `Permanently Delete ${student.name}?`
              : `Archive Student ${student.name}?`
          }
          message={
            deleteMode === "hard"
              ? "This action cannot be undone. All student details will be permanently wiped."
              : "This student will be marked as archived (soft deleted) and hidden from the registry."
          }
          confirmText={deleteMode === "hard" ? "Permanently Delete" : "Archive Student"}
          isDanger={true}
          requiredConfirmationText={student.name}
          confirmationPlaceholder="Type student name to confirm"
        />
      )}
    </div>
  );
};
