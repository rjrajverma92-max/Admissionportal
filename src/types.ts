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
  discount_amount?: number;
  discount_percent?: number;
  original_fees?: number;
  remarks?: string;
}

export interface Payment {
  id: string;
  student_id: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  type: "Admission Fee" | "Late Fee" | "Exam Fee" | "Installment" | "Full Payment" | "University Fee" | "Fee Payment" | string;
  note?: string;
  payment_for?: "Admission Fees" | "Exam Fees" | "Late Fees" | "Regular Payment" | "";
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
  plan: "trial" | "standard" | "pro";
  trial_start_date?: string;
  trial_end_date?: string;
  trial_expired?: boolean;
  subscription_start_date?: string;
  subscription_end_date?: string;
  subscription_duration?: "trial" | "monthly" | "quarterly" | "half-yearly" | "annual";
  subscription_expired?: boolean;
  created_date: string;
  emailjs_service_id?: string;
  emailjs_template_admission?: string;
  emailjs_template_payment?: string;
  emailjs_public_key?: string;
  whatsapp_number?: string;
  features: InstituteFeatures;
}

export interface SubscriptionPayment {
  id: string;
  institute_id: string;
  institute_name: string;
  amount: number;
  payment_mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  payment_date: string;
  duration: "trial" | "monthly" | "quarterly" | "half-yearly" | "annual";
  duration_days: number;
  plan: "trial" | "standard" | "pro";
  previous_end_date: string;
  new_end_date: string;
  reference?: string;
  note?: string;
  recorded_by: string;
  created_timestamp: any;
}

export const PLAN_PRICING = {
  standard: {
    monthly: 499,
    quarterly: 1350,
    "half-yearly": 2500,
    annual: 4999,
  },
  pro: {
    monthly: 999,
    quarterly: 2700,
    "half-yearly": 5000,
    annual: 9999,
  },
  trial: {
    monthly: 0,
    quarterly: 0,
    "half-yearly": 0,
    annual: 0,
  }
};

export const DURATION_DAYS = {
  trial: 15,
  monthly: 30,
  quarterly: 90,
  "half-yearly": 180,
  annual: 365,
};

export const DURATION_LABELS = {
  trial: "15-Day Trial",
  monthly: "1 Month",
  quarterly: "3 Months",
  "half-yearly": "6 Months",
  annual: "1 Year",
};

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

export interface SubscriptionOverride {
  id: string;
  institute_id: string;
  institute_name: string;
  previous_end_date: string;
  new_end_date: string;
  plan_change: string;
  reason: string;
  done_by: string;
  created_timestamp: any;
}

export interface EnrollStudentInput {
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
  original_fees?: number;
  discount_amount?: number;
  discount_percent?: number;
  remarks?: string;
  admission_fees: number;
  payment_mode: PaymentMode;
  payment_note?: string;
  linked_lead_id?: string;
  affiliated_university?: string;
  university_total_fees?: number;
  university_admission_fees?: number;
  institute_portion?: number;
  father_name?: string;
  mother_name?: string;
  session?: string;
}


