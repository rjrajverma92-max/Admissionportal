export const PLAN_FEATURES = {
  standard: {
    finance_module: false,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: false,
    university_fees: false,
    backup_restore: false,
    email_notifications: false,
    multi_institute: false,
  },
  pro: {
    finance_module: true,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: true,
    university_fees: true,
    backup_restore: true,
    email_notifications: true,
    multi_institute: true,
  },
};

export type PlanType = "standard" | "pro";

export const getPlanFeatures = (plan: PlanType) => {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.standard;
};

export const FEATURE_LABELS: Record<string, string> = {
  finance_module: "Finance & P&L Reports",
  fee_reminders: "Fee Reminders",
  birthday_greetings: "Birthday Alerts",
  certificate_verify: "Certificate Verification",
  import_leads: "Import Leads",
  university_fees: "University Fee Tracking",
  backup_restore: "Data Backup & Restore",
  email_notifications: "Email Notifications",
  multi_institute: "Multiple Institutes",
};
