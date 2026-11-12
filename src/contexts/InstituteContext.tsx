import React, { createContext, useContext, useEffect, useState } from "react";
import {
  db,
  isFirebaseConfigured,
  cleanFirestoreData,
} from "../firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  InstituteConfig,
  Student,
  Payment,
  Expense,
  CourseOption,
  BatchOption,
  UniversityOption,
  Lead,
  StudentStatus,
  PaymentMode,
  ExpenseCategory,
} from "../types";
import { generateRegistrationNumber } from "../services/registrationService";
import {
  sendAdmissionConfirmationEmail,
  sendPaymentReceiptEmail,
} from "../services/emailService";
import { useAuth } from "./AuthContext";

const DEFAULT_UNIVERSITIES = [
  "Pt. Ravishankar Shukla University",
  "CVRU (C.V. Raman University)",
  "Kalinga University",
  "Durg Vishwavidyalaya",
];

interface InstituteContextType {
  instituteId: string | null;
  config: InstituteConfig | null;
  students: Student[];
  payments: Payment[];
  expenses: Expense[];
  courses: CourseOption[];
  batches: BatchOption[];
  universities: UniversityOption[];
  leads: Lead[];
  loadingData: boolean;
  enrollStudent: (data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    dob?: string;
    admission_date: string;
    course_type: string;
    batch_name: string;
    batch_start_date: string;
    total_fees: number;
    admission_fees: number;
    payment_mode: PaymentMode;
    payment_note?: string;
    linked_lead_id?: string;
    affiliated_university?: string;
    university_total_fees?: number;
    university_admission_fees?: number;
  }) => Promise<{ success: boolean; student?: Student; initialPayment?: Payment; error?: string }>;
  updateStudent: (studentId: string, partial: Partial<Student>) => Promise<void>;
  updateStudentStatus: (
    studentId: string,
    newStatus: StudentStatus,
    note?: string,
    dropoutDate?: string,
    dropoutReason?: string
  ) => Promise<void>;
  issueCertificate: (studentId: string) => Promise<void>;
  revokeCertificate: (studentId: string) => Promise<void>;
  deleteStudent: (studentId: string, hardDelete?: boolean) => Promise<void>;
  addPayment: (data: {
    student_id: string;
    amount: number;
    mode: PaymentMode;
    date: string;
    type: string;
    note?: string;
    payment_for?: "Admission Fees" | "Exam Fees" | "Late Fees" | "";
    university_name?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  addExpense: (data: {
    category: ExpenseCategory;
    amount: number;
    date: string;
    note?: string;
  }) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addCourse: (data: {
    name: string;
    fees?: number;
    duration_months?: number;
    is_university_course?: boolean;
  }) => Promise<void>;
  updateCourse: (courseId: string, partial: Partial<CourseOption>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<{ success: boolean; error?: string }>;
  addBatch: (name: string) => Promise<void>;
  updateBatch: (batchId: string, partial: Partial<BatchOption>) => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
  addUniversity: (name: string) => Promise<void>;
  updateUniversity: (universityId: string, partial: Partial<UniversityOption>) => Promise<void>;
  deleteUniversity: (universityId: string) => Promise<{ success: boolean; error?: string }>;
  seedDefaultUniversitiesIfEmpty: () => Promise<void>;
  updateConfig: (partial: Partial<InstituteConfig>) => Promise<void>;
  addLeads: (newLeads: Omit<Lead, "id" | "created_at">[]) => void;
  deleteLead: (leadId: string) => void;
  clearAllLeads: () => void;
  backupDataAsJson: () => string;
  restoreDataFromJson: (jsonStr: string) => Promise<{ success: boolean; message: string }>;
  clearAllInstituteData: () => Promise<void>;
}

const InstituteContext = createContext<InstituteContextType | undefined>(undefined);

export const InstituteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeInstituteId, instituteConfig: authConfig } = useAuth();
  const [config, setConfig] = useState<InstituteConfig | null>(authConfig);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Sync leads from Firestore subcollection
  useEffect(() => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) {
      setLeads([]);
      return;
    }

    const unsubLeads = onSnapshot(
      collection(db, "institutes", activeInstituteId, "leads"),
      (snap) => {
        const list: Lead[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Lead));
        setLeads(list);
      },
      (err) => {
        console.warn("Leads stream notice:", err.message);
      }
    );

    return () => unsubLeads();
  }, [activeInstituteId]);

  // Real-time Firestore synchronization for all subcollections
  useEffect(() => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) {
      setConfig(null);
      setStudents([]);
      setPayments([]);
      setExpenses([]);
      setCourses([]);
      setBatches([]);
      setUniversities([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);

    const unsubConfig = onSnapshot(
      doc(db, "institutes", activeInstituteId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig(data.config ? (data.config as InstituteConfig) : (data as InstituteConfig));
        }
      },
      (err) => {
        console.warn("Config stream notice:", err.message);
      }
    );

    const unsubStudents = onSnapshot(
      collection(db, "institutes", activeInstituteId, "students"),
      (snap) => {
        const list: Student[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Student));
        setStudents(list.filter((s) => !s.is_deleted));
        setLoadingData(false);
      },
      (err) => {
        console.warn("Students stream notice:", err.message);
        setLoadingData(false);
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, "institutes", activeInstituteId, "payments"),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Payment));
        setPayments(list);
      },
      (err) => {
        console.warn("Payments stream notice:", err.message);
      }
    );

    const unsubExpenses = onSnapshot(
      collection(db, "institutes", activeInstituteId, "expenses"),
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as Expense));
        setExpenses(list);
      },
      (err) => {
        console.warn("Expenses stream notice:", err.message);
      }
    );

    const unsubCourses = onSnapshot(
      collection(db, "institutes", activeInstituteId, "courses"),
      (snap) => {
        const list: CourseOption[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as CourseOption));
        setCourses(list);
      },
      (err) => {
        console.warn("Courses stream notice:", err.message);
      }
    );

    const unsubBatches = onSnapshot(
      collection(db, "institutes", activeInstituteId, "batches"),
      (snap) => {
        const list: BatchOption[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as BatchOption));
        setBatches(list);
      },
      (err) => {
        console.warn("Batches stream notice:", err.message);
      }
    );

    const unsubUniversities = onSnapshot(
      collection(db, "institutes", activeInstituteId, "universities"),
      (snap) => {
        const list: UniversityOption[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as UniversityOption));
        setUniversities(list);
      },
      (err) => {
        console.warn("Universities stream notice:", err.message);
      }
    );

    return () => {
      unsubConfig();
      unsubStudents();
      unsubPayments();
      unsubExpenses();
      unsubCourses();
      unsubBatches();
      unsubUniversities();
    };
  }, [activeInstituteId]);

  // Pre-seed default universities if empty
  const seedDefaultUniversitiesIfEmpty = async () => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    try {
      const snap = await getDocs(collection(db, "institutes", activeInstituteId, "universities"));
      if (snap.empty) {
        for (const univName of DEFAULT_UNIVERSITIES) {
          const id = `univ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const univDoc: UniversityOption = {
            id,
            name: univName,
            active: true,
            created_timestamp: serverTimestamp(),
          };
          await setDoc(doc(db, "institutes", activeInstituteId, "universities", id), cleanFirestoreData(univDoc));
        }
      }
    } catch (err) {
      console.warn("Seeding universities notice:", err);
    }
  };

  // Enroll Student
  const enrollStudent = async (data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    dob?: string;
    admission_date: string;
    course_type: string;
    batch_name: string;
    batch_start_date: string;
    total_fees: number;
    admission_fees: number;
    payment_mode: PaymentMode;
    payment_note?: string;
    linked_lead_id?: string;
    affiliated_university?: string;
    university_total_fees?: number;
    university_admission_fees?: number;
  }): Promise<{ success: boolean; student?: Student; initialPayment?: Payment; error?: string }> => {
    if (!activeInstituteId || !config) {
      return { success: false, error: "Institute not active" };
    }
    if (!isFirebaseConfigured || !db) {
      return { success: false, error: "Firestore not configured" };
    }

    try {
      const regNumber = await generateRegistrationNumber(
        activeInstituteId,
        config.reg_prefix || "INST",
        data.admission_date
      );

      const studentId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const totalAdmissionPaid = Number(data.admission_fees || 0);
      const hasUniv = Boolean(data.affiliated_university && data.affiliated_university.trim());
      const univPaidNow = hasUniv ? Number(data.university_admission_fees || 0) : 0;
      const instituteAmountReceived = Math.max(0, totalAdmissionPaid - univPaidNow);
      const remaining = Math.max(0, Number(data.total_fees) - totalAdmissionPaid);

      const newStudent: Student = {
        id: studentId,
        registration_number: regNumber,
        linked_lead_id: data.linked_lead_id,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: (data.email || "").trim(),
        address: (data.address || "").trim(),
        dob: data.dob || "",
        admission_date: data.admission_date,
        course_type: data.course_type,
        batch_name: data.batch_name,
        batch_start_date: data.batch_start_date,
        total_fees: Number(data.total_fees),
        admission_fees: instituteAmountReceived,
        remaining_fees: remaining,
        affiliated_university: (data.affiliated_university || "").trim(),
        university_total_fees: data.university_total_fees ? Number(data.university_total_fees) : 0,
        status: "Active",
        certificate_status: "Not Issued",
        created_timestamp: serverTimestamp(),
        status_history: [
          {
            previous_status: "Active",
            new_status: "Active",
            changed_date: data.admission_date,
            note: `Enrolled into ${data.course_type}`,
          },
        ],
      };

      await setDoc(doc(db, "institutes", activeInstituteId, "students", studentId), cleanFirestoreData(newStudent));

      let primaryReceiptPayment: Payment | null = null;

      // DOCUMENT 1 — Institute Payment (ONLY if instituteAmountReceived > 0)
      if (instituteAmountReceived > 0) {
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newPayment: Payment = {
          id: paymentId,
          student_id: studentId,
          amount: instituteAmountReceived,
          mode: data.payment_mode,
          date: data.admission_date,
          type: "Admission Fee",
          note: data.payment_note || "Initial admission fee collection",
          payment_for: "Admission Fees",
          university_name: "",
          timestamp: serverTimestamp(),
        };
        await setDoc(doc(db, "institutes", activeInstituteId, "payments", paymentId), cleanFirestoreData(newPayment));
        primaryReceiptPayment = newPayment;
      }

      // DOCUMENT 2 — University Payment (ONLY if university_fee_paid_now > 0)
      if (univPaidNow > 0 && data.affiliated_university && data.affiliated_university.trim()) {
        const univPaymentId = `pay_univ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const univPayment: Payment = {
          id: univPaymentId,
          student_id: studentId,
          amount: univPaidNow,
          mode: data.payment_mode,
          date: data.admission_date,
          type: "University Admission Fee",
          note: `University admission fee - ${data.affiliated_university.trim()}`,
          payment_for: "Admission Fees",
          university_name: data.affiliated_university.trim(),
          timestamp: serverTimestamp(),
        };
        await setDoc(doc(db, "institutes", activeInstituteId, "payments", univPaymentId), cleanFirestoreData(univPayment));
        if (!primaryReceiptPayment) {
          primaryReceiptPayment = univPayment;
        }
      }

      // Trigger EmailJS admission confirmation if any payment exists
      if (primaryReceiptPayment) {
        sendAdmissionConfirmationEmail(config, newStudent, primaryReceiptPayment).catch((e) =>
          console.warn("Async email notification notice:", e)
        );
      }

      // If linked lead exists, remove from leads
      if (data.linked_lead_id) {
        deleteLead(data.linked_lead_id);
      }

      return { success: true, student: newStudent, initialPayment: primaryReceiptPayment || undefined };
    } catch (err: any) {
      console.error("Enrollment failed:", err);
      return { success: false, error: err.message || "Failed to process admission" };
    }
  };

  const updateStudent = async (studentId: string, partial: Partial<Student>) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await updateDoc(
      doc(db, "institutes", activeInstituteId, "students", studentId),
      cleanFirestoreData(partial)
    );
  };

  const updateStudentStatus = async (
    studentId: string,
    newStatus: StudentStatus,
    note?: string,
    dropoutDate?: string,
    dropoutReason?: string
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const today = new Date().toISOString().split("T")[0];
    const historyEntry = {
      previous_status: student.status,
      new_status: newStatus,
      changed_date: today,
      note: note || `Status changed from ${student.status} to ${newStatus}`,
    };

    const currentHistory = student.status_history || [];
    const partial: Partial<Student> = {
      status: newStatus,
      status_history: [...currentHistory, historyEntry],
    };

    if (newStatus === "Dropped") {
      partial.dropout_date = dropoutDate || today;
      partial.dropout_reason = dropoutReason || note || "Dropped";
    }

    await updateStudent(studentId, partial);
  };

  const issueCertificate = async (studentId: string) => {
    const today = new Date().toISOString().split("T")[0];
    await updateStudent(studentId, {
      certificate_status: "Issued",
      certificate_issue_date: today,
    });
  };

  const revokeCertificate = async (studentId: string) => {
    if (!isFirebaseConfigured || !db || !activeInstituteId) return;
    await updateDoc(doc(db, "institutes", activeInstituteId, "students", studentId), {
      certificate_status: "Not Issued",
      certificate_issue_date: deleteField(),
    });
  };

  const deleteStudent = async (studentId: string, hardDelete: boolean = false) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    if (hardDelete) {
      await deleteDoc(doc(db, "institutes", activeInstituteId, "students", studentId));
    } else {
      await updateStudent(studentId, { is_deleted: true });
    }
  };

  const addPayment = async (data: {
    student_id: string;
    amount: number;
    mode: PaymentMode;
    date: string;
    type: string;
    note?: string;
    payment_for?: "Admission Fees" | "Exam Fees" | "Late Fees" | "";
    university_name?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeInstituteId || !config || !isFirebaseConfigured || !db) {
      return { success: false, error: "No active database connection" };
    }

    const student = students.find((s) => s.id === data.student_id);
    if (!student) return { success: false, error: "Student not found" };

    const isUnivPayment = Boolean(data.university_name && data.university_name.trim());
    if (!isUnivPayment && data.amount > student.remaining_fees) {
      return {
        success: false,
        error: `Amount (₹${data.amount}) cannot exceed remaining fee balance (₹${student.remaining_fees})`,
      };
    }

    try {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newRemaining = isUnivPayment
        ? student.remaining_fees
        : Math.max(0, student.remaining_fees - data.amount);

      const payment: Payment = {
        id: paymentId,
        student_id: data.student_id,
        amount: Number(data.amount),
        mode: data.mode,
        date: data.date,
        type: isUnivPayment ? "University Fee" : data.type,
        note: data.note || "",
        payment_for: data.payment_for || "",
        university_name: (data.university_name || "").trim(),
        timestamp: serverTimestamp(),
      };

      await setDoc(doc(db, "institutes", activeInstituteId, "payments", paymentId), cleanFirestoreData(payment));
      if (!isUnivPayment) {
        await updateDoc(doc(db, "institutes", activeInstituteId, "students", data.student_id), {
          remaining_fees: newRemaining,
        });
      }

      sendPaymentReceiptEmail(config, { ...student, remaining_fees: newRemaining }, payment).catch(
        (e) => console.warn("Async email failed:", e)
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to record payment" };
    }
  };

  const addExpense = async (data: {
    category: ExpenseCategory;
    amount: number;
    date: string;
    note?: string;
  }) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expense: Expense = {
      id: expenseId,
      category: data.category,
      amount: Number(data.amount),
      date: data.date,
      note: data.note || "",
      created_timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, "institutes", activeInstituteId, "expenses", expenseId), cleanFirestoreData(expense));
  };

  const deleteExpense = async (expenseId: string) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, "institutes", activeInstituteId, "expenses", expenseId));
  };

  const addCourse = async (data: {
    name: string;
    fees?: number;
    duration_months?: number;
    is_university_course?: boolean;
  }) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const courseId = `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const course: CourseOption = {
      id: courseId,
      name: data.name.trim(),
      fees: data.fees ? Number(data.fees) : undefined,
      duration_months: data.duration_months ? Number(data.duration_months) : undefined,
      is_university_course: Boolean(data.is_university_course),
      active: true,
      created_timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, "institutes", activeInstituteId, "courses", courseId), cleanFirestoreData(course));
  };

  const updateCourse = async (courseId: string, partial: Partial<CourseOption>) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, "institutes", activeInstituteId, "courses", courseId), cleanFirestoreData(partial));
  };

  const deleteCourse = async (courseId: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) {
      return { success: false, error: "Database not connected" };
    }
    const course = courses.find((c) => c.id === courseId);
    if (!course) return { success: false, error: "Course not found" };

    const isEnrolled = students.some((s) => s.course_type === course.name);
    if (isEnrolled) {
      return {
        success: false,
        error: `Cannot delete course "${course.name}" because active students are enrolled in it.`,
      };
    }

    await deleteDoc(doc(db, "institutes", activeInstituteId, "courses", courseId));
    return { success: true };
  };

  const addBatch = async (name: string) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const batchId = `bth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const batch: BatchOption = {
      id: batchId,
      name: name.trim(),
      active: true,
      created_timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, "institutes", activeInstituteId, "batches", batchId), cleanFirestoreData(batch));
  };

  const updateBatch = async (batchId: string, partial: Partial<BatchOption>) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await updateDoc(doc(db, "institutes", activeInstituteId, "batches", batchId), cleanFirestoreData(partial));
  };

  const deleteBatch = async (batchId: string) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, "institutes", activeInstituteId, "batches", batchId));
  };

  // University CRUD
  const addUniversity = async (name: string) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const universityId = `univ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const univ: UniversityOption = {
      id: universityId,
      name: name.trim(),
      active: true,
      created_timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, "institutes", activeInstituteId, "universities", universityId), cleanFirestoreData(univ));
  };

  const updateUniversity = async (universityId: string, partial: Partial<UniversityOption>) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await updateDoc(
      doc(db, "institutes", activeInstituteId, "universities", universityId),
      cleanFirestoreData(partial)
    );
  };

  const deleteUniversity = async (universityId: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) {
      return { success: false, error: "Database not connected" };
    }
    await deleteDoc(doc(db, "institutes", activeInstituteId, "universities", universityId));
    return { success: true };
  };

  const updateConfig = async (partial: Partial<InstituteConfig>) => {
    if (!activeInstituteId || !config || !isFirebaseConfigured || !db) return;
    const updated = { ...config, ...partial };
    setConfig(updated);
    await updateDoc(doc(db, "institutes", activeInstituteId), {
      config: cleanFirestoreData(updated),
    });
  };

  const addLeads = async (newLeads: Omit<Lead, "id" | "created_at">[]) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const today = new Date().toISOString().split("T")[0];
    for (let idx = 0; idx < newLeads.length; idx++) {
      const item = newLeads[idx];
      const leadId = `lead_${Date.now()}_${idx}`;
      const leadDoc: Lead = {
        ...item,
        id: leadId,
        created_at: today,
      };
      await setDoc(doc(db, "institutes", activeInstituteId, "leads", leadId), cleanFirestoreData(leadDoc));
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    await deleteDoc(doc(db, "institutes", activeInstituteId, "leads", leadId));
  };

  const clearAllLeads = async () => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;
    const snap = await getDocs(collection(db, "institutes", activeInstituteId, "leads"));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };

  const backupDataAsJson = (): string => {
    const backupObj = {
      institute_id: activeInstituteId,
      backup_date: new Date().toISOString(),
      config,
      students,
      payments,
      expenses,
      courses,
      batches,
      universities,
      leads,
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const restoreDataFromJson = async (jsonStr: string): Promise<{ success: boolean; message: string }> => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) {
      return { success: false, message: "No active database connection" };
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.students || !Array.isArray(parsed.students)) {
        return { success: false, message: "Invalid backup file: missing student records" };
      }

      if (Array.isArray(parsed.students)) {
        for (const s of parsed.students) {
          await setDoc(doc(db, "institutes", activeInstituteId, "students", s.id), cleanFirestoreData(s));
        }
      }

      if (Array.isArray(parsed.payments)) {
        for (const p of parsed.payments) {
          await setDoc(doc(db, "institutes", activeInstituteId, "payments", p.id), cleanFirestoreData(p));
        }
      }

      if (Array.isArray(parsed.expenses)) {
        for (const e of parsed.expenses) {
          await setDoc(doc(db, "institutes", activeInstituteId, "expenses", e.id), cleanFirestoreData(e));
        }
      }

      if (Array.isArray(parsed.courses)) {
        for (const c of parsed.courses) {
          await setDoc(doc(db, "institutes", activeInstituteId, "courses", c.id), cleanFirestoreData(c));
        }
      }

      if (Array.isArray(parsed.batches)) {
        for (const b of parsed.batches) {
          await setDoc(doc(db, "institutes", activeInstituteId, "batches", b.id), cleanFirestoreData(b));
        }
      }

      if (Array.isArray(parsed.universities)) {
        for (const u of parsed.universities) {
          await setDoc(doc(db, "institutes", activeInstituteId, "universities", u.id), cleanFirestoreData(u));
        }
      }

      return { success: true, message: "Data restored successfully to Firestore database." };
    } catch (e: any) {
      return { success: false, message: e.message || "Failed to parse JSON backup" };
    }
  };

  const clearAllInstituteData = async () => {
    if (!activeInstituteId || !isFirebaseConfigured || !db) return;

    try {
      const collectionsToClear = ["students", "payments", "expenses", "counters", "leads", "universities"];
      for (const col of collectionsToClear) {
        const snap = await getDocs(collection(db, "institutes", activeInstituteId, col));
        if (!snap.empty) {
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        }
      }
    } catch (err) {
      console.error("Firestore clearAllInstituteData error:", err);
    }
  };

  return (
    <InstituteContext.Provider
      value={{
        instituteId: activeInstituteId,
        config,
        students,
        payments,
        expenses,
        courses,
        batches,
        universities,
        leads,
        loadingData,
        enrollStudent,
        updateStudent,
        updateStudentStatus,
        issueCertificate,
        revokeCertificate,
        deleteStudent,
        addPayment,
        addExpense,
        deleteExpense,
        addCourse,
        updateCourse,
        deleteCourse,
        addBatch,
        updateBatch,
        deleteBatch,
        addUniversity,
        updateUniversity,
        deleteUniversity,
        seedDefaultUniversitiesIfEmpty,
        updateConfig,
        addLeads,
        deleteLead,
        clearAllLeads,
        backupDataAsJson,
        restoreDataFromJson,
        clearAllInstituteData,
      }}
    >
      {children}
    </InstituteContext.Provider>
  );
};

export function useInstitute() {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error("useInstitute must be used within an InstituteProvider");
  }
  return context;
}
