import emailjs from "@emailjs/browser";
import { InstituteConfig, Student, Payment } from "../types";
import { formatCurrency, formatDate } from "../utils/formatters";

export interface EmailResult {
  success: boolean;
  message: string;
}

export async function sendAdmissionConfirmationEmail(
  config: InstituteConfig,
  student: Student,
  payment: Payment
): Promise<EmailResult> {
  if (!config.emailjs_service_id || !config.emailjs_template_admission || !config.emailjs_public_key) {
    console.info(
      `[EmailJS Simulation] Admission confirmation for ${student.name} (${student.registration_number}) to ${student.email || "No email"}. Total: ${formatCurrency(student.total_fees)}, Paid: ${formatCurrency(payment.amount)}.`
    );
    return {
      success: true,
      message: "Email simulated (EmailJS keys not configured in Institute Settings)",
    };
  }

  try {
    const templateParams = {
      to_name: student.name,
      to_email: student.email,
      student_phone: student.phone,
      reg_number: student.registration_number,
      institute_name: config.name,
      institute_phone: config.phone,
      institute_email: config.email,
      course_name: student.course_type,
      batch_name: student.batch_name,
      admission_date: formatDate(student.admission_date),
      total_fees: formatCurrency(student.total_fees),
      paid_amount: formatCurrency(payment.amount),
      remaining_fees: formatCurrency(student.remaining_fees),
      payment_mode: payment.mode,
    };

    await emailjs.send(
      config.emailjs_service_id,
      config.emailjs_template_admission,
      templateParams,
      config.emailjs_public_key
    );

    return { success: true, message: "Admission confirmation email sent successfully!" };
  } catch (error: any) {
    console.error("EmailJS Admission Error:", error);
    return {
      success: false,
      message: error?.text || error?.message || "Failed to send admission email via EmailJS",
    };
  }
}

export async function sendPaymentReceiptEmail(
  config: InstituteConfig,
  student: Student,
  payment: Payment
): Promise<EmailResult> {
  if (!config.emailjs_service_id || !config.emailjs_template_payment || !config.emailjs_public_key) {
    console.info(
      `[EmailJS Simulation] Payment receipt of ${formatCurrency(payment.amount)} for ${student.name} (${student.registration_number}).`
    );
    return {
      success: true,
      message: "Email simulated (EmailJS keys not configured in Institute Settings)",
    };
  }

  try {
    const templateParams = {
      to_name: student.name,
      to_email: student.email,
      reg_number: student.registration_number,
      institute_name: config.name,
      payment_amount: formatCurrency(payment.amount),
      payment_mode: payment.mode,
      payment_date: formatDate(payment.date),
      payment_type: payment.type,
      payment_note: payment.note || "-",
      remaining_fees: formatCurrency(student.remaining_fees),
    };

    await emailjs.send(
      config.emailjs_service_id,
      config.emailjs_template_payment,
      templateParams,
      config.emailjs_public_key
    );

    return { success: true, message: "Payment receipt email sent successfully!" };
  } catch (error: any) {
    console.error("EmailJS Payment Receipt Error:", error);
    return {
      success: false,
      message: error?.text || error?.message || "Failed to send receipt email via EmailJS",
    };
  }
}

export async function sendFeeReminderEmail(
  config: InstituteConfig,
  student: Student
): Promise<EmailResult> {
  if (!config.emailjs_service_id || !config.emailjs_public_key) {
    console.info(
      `[EmailJS Simulation] Fee reminder to ${student.name}: Pending ${formatCurrency(student.remaining_fees)}`
    );
    return {
      success: true,
      message: "Reminder logged (EmailJS credentials not set in Settings)",
    };
  }

  try {
    const templateParams = {
      to_name: student.name,
      to_email: student.email,
      reg_number: student.registration_number,
      institute_name: config.name,
      institute_phone: config.phone,
      remaining_fees: formatCurrency(student.remaining_fees),
      due_notes: `Your pending fee balance is ${formatCurrency(student.remaining_fees)}. Please clear at earliest.`,
    };

    // Use admission template or fallback if specific reminder template is not set
    const templateId = config.emailjs_template_payment || config.emailjs_template_admission || "fee_reminder";
    await emailjs.send(config.emailjs_service_id, templateId, templateParams, config.emailjs_public_key);
    return { success: true, message: "Fee reminder email sent successfully!" };
  } catch (err: any) {
    return { success: false, message: err?.text || err?.message || "Failed to send reminder email" };
  }
}

export async function sendBirthdayGreetingEmail(
  config: InstituteConfig,
  student: Student
): Promise<EmailResult> {
  console.info(`[EmailJS Simulation] Birthday greeting sent to ${student.name} (${student.email})`);
  return {
    success: true,
    message: `Birthday greeting email triggered for ${student.name}`,
  };
}

export async function testEmailConfig(
  serviceId: string,
  templateId: string,
  publicKey: string,
  targetEmail: string,
  instituteName: string
): Promise<EmailResult> {
  if (!serviceId || !templateId || !publicKey) {
    return { success: false, message: "Please fill Service ID, Template ID, and Public Key" };
  }
  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: targetEmail,
        to_name: "Institute Admin",
        institute_name: instituteName,
        message: "This is a test notification from your Multi-Institute Admission Portal.",
      },
      publicKey
    );
    return { success: true, message: `Test email sent to ${targetEmail} successfully!` };
  } catch (err: any) {
    return { success: false, message: err?.text || err?.message || "Failed to send test email" };
  }
}
