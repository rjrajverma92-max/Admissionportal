import React, { useState, useEffect, useCallback, useMemo } from "react";
import { InstituteConfig, Student, Payment } from "../../types";
import { db, isFirebaseConfigured } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useToast } from "../shared/Toast";
import {
  Bug,
  Search,
  Trash2,
  RefreshCw,
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  GraduationCap,
  Calendar,
  X,
  Filter,
} from "lucide-react";

interface SuperAdminDebugToolsProps {
  institutes: InstituteConfig[];
}

interface FirestoreStudentRecord extends Student {
  instituteId: string;
  instituteName: string;
}

interface FirestorePaymentRecord extends Payment {
  instituteId: string;
  instituteName: string;
  studentName?: string;
  studentRegNo?: string;
}

export const SuperAdminDebugTools: React.FC<SuperAdminDebugToolsProps> = ({ institutes }) => {
  const { success, error } = useToast();
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"students" | "payments">("students");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [students, setStudents] = useState<FirestoreStudentRecord[]>([]);
  const [payments, setPayments] = useState<FirestorePaymentRecord[]>([]);

  // Deletion state
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<FirestoreStudentRecord | null>(null);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<FirestorePaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [alsoDeletePayments, setAlsoDeletePayments] = useState<boolean>(true);

  // Fetch all students and payments from Firestore across institutes
  const loadFirestoreData = useCallback(async () => {
    if (!isFirebaseConfigured || !db || institutes.length === 0) {
      setStudents([]);
      setPayments([]);
      return;
    }

    setLoading(true);
    try {
      const targetInsts =
        selectedInstituteId === "all"
          ? institutes
          : institutes.filter((i) => i.institute_id === selectedInstituteId);

      const allFetchedStudents: FirestoreStudentRecord[] = [];
      const allFetchedPayments: FirestorePaymentRecord[] = [];

      await Promise.all(
        targetInsts.map(async (inst) => {
          if (!db) return;
          try {
            // 1. Fetch Students
            const studentsSnap = await getDocs(
              collection(db, "institutes", inst.institute_id, "students")
            );
            const studentMap: Record<string, { name: string; regNo: string }> = {};

            studentsSnap.forEach((docSnap) => {
              const data = docSnap.data() as Student;
              const record: FirestoreStudentRecord = {
                ...data,
                id: docSnap.id,
                instituteId: inst.institute_id,
                instituteName: inst.name,
              };
              allFetchedStudents.push(record);
              studentMap[docSnap.id] = {
                name: data.name || "Unknown",
                regNo: data.registration_number || "",
              };
            });

            // 2. Fetch Payments
            const paymentsSnap = await getDocs(
              collection(db, "institutes", inst.institute_id, "payments")
            );
            paymentsSnap.forEach((docSnap) => {
              const pData = docSnap.data() as Payment;
              const sInfo = studentMap[pData.student_id];
              const pRecord: FirestorePaymentRecord = {
                ...pData,
                id: docSnap.id,
                instituteId: inst.institute_id,
                instituteName: inst.name,
                studentName: sInfo?.name,
                studentRegNo: sInfo?.regNo,
              };
              allFetchedPayments.push(pRecord);
            });
          } catch (err) {
            console.warn(`Could not load data for institute ${inst.name}:`, err);
          }
        })
      );

      // Sort students by admission_date descending
      allFetchedStudents.sort((a, b) => (b.admission_date || "").localeCompare(a.admission_date || ""));
      // Sort payments by date descending
      allFetchedPayments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      setStudents(allFetchedStudents);
      setPayments(allFetchedPayments);
    } catch (err: any) {
      console.error("Error loading debug tools data:", err);
      error("Failed to load Firestore data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [institutes, selectedInstituteId, error]);

  useEffect(() => {
    loadFirestoreData();
  }, [loadFirestoreData]);

  // Handle single payment deletion
  const handleDeletePayment = async () => {
    if (!deleteTargetPayment || !db) return;
    setIsDeleting(true);
    try {
      await deleteDoc(
        doc(db, "institutes", deleteTargetPayment.instituteId, "payments", deleteTargetPayment.id)
      );
      setPayments((prev) => prev.filter((p) => p.id !== deleteTargetPayment.id));
      success(`Payment ${deleteTargetPayment.id} deleted from Firestore.`);
      setDeleteTargetPayment(null);
    } catch (err: any) {
      console.error("Payment deletion error:", err);
      error("Failed to delete payment: " + (err.message || "Firestore error"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async () => {
    if (!deleteTargetStudent || !db) return;
    setIsDeleting(true);
    try {
      // 1. Delete student doc
      await deleteDoc(
        doc(db, "institutes", deleteTargetStudent.instituteId, "students", deleteTargetStudent.id)
      );

      // 2. Optionally delete linked payments
      if (alsoDeletePayments) {
        const studentPayments = payments.filter(
          (p) =>
            p.instituteId === deleteTargetStudent.instituteId &&
            p.student_id === deleteTargetStudent.id
        );
        for (const p of studentPayments) {
          try {
            await deleteDoc(
              doc(db, "institutes", deleteTargetStudent.instituteId, "payments", p.id)
            );
          } catch (e) {
            console.warn("Error deleting payment sub-item:", e);
          }
        }
        setPayments((prev) =>
          prev.filter(
            (p) =>
              !(
                p.instituteId === deleteTargetStudent.instituteId &&
                p.student_id === deleteTargetStudent.id
              )
          )
        );
      }

      setStudents((prev) => prev.filter((s) => s.id !== deleteTargetStudent.id));
      success(`Student ${deleteTargetStudent.name} (${deleteTargetStudent.registration_number}) deleted.`);
      setDeleteTargetStudent(null);
    } catch (err: any) {
      console.error("Student deletion error:", err);
      error("Failed to delete student: " + (err.message || "Firestore error"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.registration_number.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.course_type && s.course_type.toLowerCase().includes(q)) ||
        (s.affiliated_university && s.affiliated_university.toLowerCase().includes(q)) ||
        s.instituteName.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.studentName && p.studentName.toLowerCase().includes(q)) ||
        (p.studentRegNo && p.studentRegNo.toLowerCase().includes(q)) ||
        (p.university_name && p.university_name.toLowerCase().includes(q)) ||
        (p.payment_for && p.payment_for.toLowerCase().includes(q)) ||
        (p.mode && p.mode.toLowerCase().includes(q)) ||
        p.instituteName.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  // Summary Metrics
  const totalRevenue = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments]
  );
  const universityPaymentsCount = useMemo(
    () => payments.filter((p) => p.university_name && p.university_name.trim() !== "").length,
    [payments]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Firestore Debug & Data Clean-Up</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wide uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect raw student records and payment documents directly from Firestore. Clean up corrupted test entries safely.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFirestoreData()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Refreshing..." : "Refresh Live Data"}</span>
            </button>
          </div>
        </div>

        {/* Telemetry quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Total Students
            </span>
            <span className="text-lg font-bold text-white font-mono">{students.length}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Total Payment Docs
            </span>
            <span className="text-lg font-bold text-white font-mono">{payments.length}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              University Payments
            </span>
            <span className="text-lg font-bold text-amber-400 font-mono">{universityPaymentsCount}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Total Revenue Sum
            </span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter by Institute & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Institute selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Institute:</span>
          <select
            value={selectedInstituteId}
            onChange={(e) => setSelectedInstituteId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Institutes ({institutes.length})</option>
            {institutes.map((inst) => (
              <option key={inst.institute_id} value={inst.institute_id}>
                {inst.name} ({inst.institute_id})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === "students"
                ? "Search student name, reg no, phone, university..."
                : "Search payment ID, student, university, mode..."
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab("students")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === "students"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Students ({filteredStudents.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("payments")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === "payments"
                ? "bg-teal-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments ({filteredPayments.length})</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      {activeSubTab === "students" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> Firestore Students Subcollection
            </h3>
            <span className="text-xs text-slate-400">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student & Reg No</th>
                  <th className="py-3 px-4">Institute</th>
                  <th className="py-3 px-4">Course & Batch</th>
                  <th className="py-3 px-4 text-right">Total Fees</th>
                  <th className="py-3 px-4 text-right">Adm. Fees</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4">University Details</th>
                  <th className="py-3 px-4">Admission Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      {loading ? "Fetching Firestore documents..." : "No students found matching current filters."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{st.name}</div>
                        <div className="text-[11px] font-mono text-teal-400">{st.registration_number}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {st.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{st.instituteName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{st.instituteId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{st.course_type}</div>
                        <div className="text-[11px] text-slate-400">{st.batch_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {formatCurrency(st.total_fees || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400">
                        {formatCurrency(st.admission_fees || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-rose-400">
                        {formatCurrency(st.remaining_fees || 0)}
                      </td>
                      <td className="py-3.5 px-4">
                        {st.affiliated_university ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                              <GraduationCap className="w-3 h-3" /> {st.affiliated_university}
                            </span>
                            <div className="text-[10px] font-mono text-amber-400">
                              Univ Fees: {formatCurrency(st.university_total_fees || 0)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(st.admission_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDeleteTargetStudent(st)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                          title="Delete student document from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Firestore Payments Subcollection
            </h3>
            <span className="text-xs text-slate-400">
              Showing {filteredPayments.length} of {payments.length} payments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Payment ID & Date</th>
                  <th className="py-3 px-4">Institute</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Payment For</th>
                  <th className="py-3 px-4">University Name</th>
                  <th className="py-3 px-4">Type / Note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      {loading ? "Fetching Firestore documents..." : "No payment documents found matching filters."}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isUniv = Boolean(p.university_name && p.university_name.trim() !== "");
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-300 font-semibold">{p.id}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {formatDate(p.date)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-300 font-medium">{p.instituteName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.instituteId}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-white font-semibold">{p.studentName || "Linked Student"}</div>
                          <div className="text-[10px] text-teal-400 font-mono">
                            {p.studentRegNo || p.student_id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span className={isUniv ? "text-amber-400" : "text-emerald-400"}>
                            {formatCurrency(p.amount || 0)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                            {p.mode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.payment_for ? (
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200">
                              {p.payment_for}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isUniv ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                              <GraduationCap className="w-3 h-3" /> {p.university_name}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-[11px] text-slate-300 font-medium">{p.type}</div>
                          {p.note && <div className="text-[10px] text-slate-500 truncate">{p.note}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setDeleteTargetPayment(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                            title="Delete this payment document from Firestore"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
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
      )}

      {/* Student Deletion Confirmation Modal */}
      {deleteTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setDeleteTargetStudent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">Delete Student Document?</h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              You are about to permanently delete student{" "}
              <span className="text-white font-semibold">{deleteTargetStudent.name}</span> (
              <span className="text-teal-400 font-mono">{deleteTargetStudent.registration_number}</span>) from
              institute <span className="text-white">{deleteTargetStudent.instituteName}</span>.
            </p>

            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={alsoDeletePayments}
                  onChange={(e) => setAlsoDeletePayments(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500"
                />
                <span>Also delete all payment documents associated with this student</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetStudent(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete from Firestore"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Deletion Confirmation Modal */}
      {deleteTargetPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setDeleteTargetPayment(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">Delete Payment Document?</h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              You are about to permanently delete payment record{" "}
              <span className="text-teal-400 font-mono font-semibold">{deleteTargetPayment.id}</span> of{" "}
              <span className="text-emerald-400 font-bold font-mono">
                {formatCurrency(deleteTargetPayment.amount)}
              </span>{" "}
              from Firestore.
            </p>

            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Student:</span>
                <span className="text-white font-medium">{deleteTargetPayment.studentName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Institute:</span>
                <span className="text-white">{deleteTargetPayment.instituteName}</span>
              </div>
              {deleteTargetPayment.university_name && (
                <div className="flex justify-between">
                  <span>University:</span>
                  <span className="text-amber-400 font-medium">{deleteTargetPayment.university_name}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetPayment(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePayment}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete from Firestore"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
