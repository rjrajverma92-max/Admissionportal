import React from "react";
import { X, Printer, CheckCircle2 } from "lucide-react";
import { InstituteConfig, Student, Payment } from "../../types";
import { formatCurrency, formatDate } from "../../utils/formatters";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  payment: Payment;
  config: InstituteConfig;
  allPayments?: Payment[];
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  student,
  payment,
  config,
  allPayments = [],
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPaid = allPayments.length > 0
    ? allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : Math.max(0, student.total_fees - student.remaining_fees);

  const balanceRemaining = Math.max(0, student.total_fees - totalPaid);

  const paymentForDisplay = payment.payment_for && payment.payment_for.trim() !== ""
    ? payment.payment_for
    : "Course Fees";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8 print:border-none print:shadow-none print:bg-white print:text-black print:p-2 print:my-0">
        {/* Actions header (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Official Electronic Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition shadow-md shadow-teal-500/20"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 print:bg-white print:border-black print:text-black space-y-5">
          {/* Header */}
          <div className="text-center pb-5 border-b border-slate-800 print:border-gray-300">
            {config.logo_url && (
              <img src={config.logo_url} alt={config.name} className="w-12 h-12 rounded-xl object-cover mx-auto mb-2" />
            )}
            <h2 className="text-xl font-bold text-white print:text-black">{config.name}</h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              {config.address} • City: {config.city}
            </p>
            <p className="text-xs text-slate-400 print:text-gray-600">
              Phone: {config.phone}
            </p>

            <div className="mt-4 inline-block">
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 print:border-black print:text-black print:bg-transparent">
                FEE RECEIPT
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 print:text-gray-600 mt-4 px-1">
              <span>Receipt No: <strong className="text-white print:text-black font-mono">{payment.id.slice(-8)}</strong></span>
              <span>Date: <strong className="text-white print:text-black">{formatDate(payment.date)}</strong></span>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="p-4 rounded-xl bg-slate-900 print:bg-gray-50 border border-slate-800 print:border-gray-300 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Student Name:</span>
              <span className="font-semibold text-white print:text-black">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Reg. No:</span>
              <span className="font-mono font-bold text-teal-300 print:text-black">{student.registration_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Course:</span>
              <span className="text-white print:text-black">{student.course_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Batch:</span>
              <span className="text-white print:text-black">{student.batch_name}</span>
            </div>
          </div>

          {/* Payment Particulars */}
          <div className="p-4 rounded-xl bg-slate-900 print:bg-gray-50 border border-slate-800 print:border-gray-300 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Payment For:</span>
              <span className="font-semibold text-teal-300 print:text-black">{paymentForDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-400 print:text-black text-sm">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Payment Mode:</span>
              <span className="font-medium text-white print:text-black">{payment.mode}</span>
            </div>
            {payment.note && (
              <div className="flex justify-between pt-1 border-t border-slate-800 print:border-gray-200">
                <span className="text-slate-400 print:text-gray-600">Reference:</span>
                <span className="text-slate-300 print:text-gray-700 italic">{payment.note}</span>
              </div>
            )}
          </div>

          {/* Account Balance Summary */}
          <div className="p-4 rounded-xl bg-slate-900/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Total Course Fees:</span>
              <span className="font-mono font-bold text-white print:text-black">{formatCurrency(student.total_fees)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Total Paid Till Date:</span>
              <span className="font-mono font-bold text-emerald-400 print:text-black">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 print:border-gray-200">
              <span className="text-slate-400 print:text-gray-600">Balance Remaining:</span>
              <span className="font-mono font-bold text-amber-400 print:text-black">{formatCurrency(balanceRemaining)}</span>
            </div>
          </div>

          {/* Thank You & Signatures */}
          <div className="text-center pt-3 pb-1">
            <p className="text-xs font-medium text-teal-400 print:text-black italic">
              "Thank you for your payment!"
            </p>
          </div>

          <div className="pt-8 flex justify-between items-end text-xs text-slate-500 print:text-gray-600">
            <div className="text-[10px] text-slate-500 print:text-gray-500">
              Powered by Institute Portal
            </div>
            <div className="text-center min-w-[150px]">
              <div className="border-b border-slate-700 print:border-black mb-1 pb-4"></div>
              <span className="font-semibold text-slate-300 print:text-black text-[11px] block">
                Authorized Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
