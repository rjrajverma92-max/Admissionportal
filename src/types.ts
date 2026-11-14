export type StudentStatus = "Active" | "Completed" | "Dropped" | "On Hold";
export type CertificateStatus = "Not Issued" | "Issued";
export type PaymentMode = "UPI" | "Cash" | "Bank Transfer" | "Cheque";
export type ExpenseCategory =
  | "Faculty Salary"
  | "Staff Salary"
  | "Rent"
  | "Electricity"
  | "Internet"
  | "Marketing"
  | "Software Subscription"
  | "Equipment Purchase"
  | "Maintenance"
  | "Miscellaneous";

export interface StatusHistoryEntry {
  previous_status: StudentStatus;
  new_status: StudentStatus;
  changed_date: string;
  note: string;
}

export interface Student {
  id: string;
  registration_number: string; // e.g. MAAC-2026-27-0001
  linked_lead_id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string; // YYYY-MM-DD
  admission_date: string;
  course_type: string;
  batch_name: string;
  batch_start_date: string;
  total_fees: number;
  admission_fees: number;
  remaining_fees: number;
  status: StudentStatus;
  certificate_status: CertificateStatus;
  certificate_issue_date?: string;
  dropout_date?: string;
  dropout_reason?: string;
  status_history?: StatusHistoryEntry[];
  created_timestamp: any;
  is_deleted?: boolean;
  last_notified_date?: string;
  affiliated_university?: string;
  university_total_fees?: number;
  institute_portion?: number;
  father_name?: string;
  mother_name?: string;
  session?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  type: string; // "Admission Fee" | "Installment" | "Full Payment" | "Late Fee"
  note?: string;
  payment_for?: "Admission Fees" | "Exam Fees" | "Late Fees" | "";
  university_name?: string;
  timestamp: any;
}

export interface UniversityOption {
  id: string;
  name: string;
  active: boolean;
  created_timestamp?: any;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
  created_timestamp: any;
}

export interface CourseOption {
  id: string;
  name: string;
  active: boolean;
  fees?: number;
  duration_months?: number;
  is_university_course?: boolean;
  created_timestamp?: any;
}

export interface BatchOption {
  id: string;
  name: string;
  active: boolean;
  created_timestamp?: any;
}

export interface SessionOption {
  id: string;
  name: string;
  year_key: string;
  month: string;
  active: boolean;
  created_timestamp?: any;
}

export interface InstituteFeatures {
  finance_module: boolean;
  fee_reminders: boolean;
  birthday_greetings: boolean;
  certificate_verify: boolean;
  import_leads: boolean;
  university_fees: boolean;
  backup_restore: boolean;
  email_notifications: boolean;
  multi_institute: boolean;
}

export interface InstituteConfig {
  institute_id: string;
  name: string;
  reg_prefix: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  logo_url?: string;
  admin_email: string;
  admin_password?: string;
  status: "active" | "suspended" | "trial";
  plan: "standard" | "pro";
  created_date: string;
  emailjs_service_id?: string;
  emailjs_template_admission?: string;
  emailjs_template_payment?: string;
  emailjs_public_key?: string;
  whatsapp_number?: string;
  features: InstituteFeatures;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  course_interest?: string;
  source?: string;
  notes?: string;
  created_at: string;
}

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  description: string;
  how_to_use: string;
  benefit: string;
  created_at: any;
  created_by: string;
  is_active: boolean;
}
