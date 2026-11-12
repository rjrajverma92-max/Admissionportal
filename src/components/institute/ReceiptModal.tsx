import React from "react";
import { X, Printer, CheckCircle2, Building2 } from "lucide-react";
import { InstituteConfig, Student, Payment } from "../../types";
import { formatCurrency, formatDate } from "../../utils/formatters";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  payment: Payment;
  config: InstituteConfig;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  student,
  payment,
  config,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPaid = Math.max(0, student.total_fees - student.remaining_fees);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8 print:border-none print:shadow-none print:bg-white print:text-black print:p-4">
        {/* Actions header (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
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
        <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 print:bg-white print:border-black print:text-black">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800 print:border-gray-300">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {config.logo_url ? (
                  <img src={config.logo_url} alt={config.name} className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-sm">
                    {config.reg_prefix.slice(0, 2)}
                  </div>
                )}
                <h2 className="text-xl font-bold text-white print:text-black">{config.name}</h2>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 max-w-sm leading-relaxed">
                {config.address}
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Phone: {config.phone} • Email: {config.email}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 print:border-gray-400 print:text-black">
                Fee Receipt
              </span>
              <p className="text-xs font-mono text-slate-400 print:text-gray-600 mt-2">
                Receipt ID: <span className="text-white print:text-black font-bold">{payment.id}</span>
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                Date: <span className="font-semibold text-white print:text-black">{formatDate(payment.date)}</span>
              </p>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-slate-500 print:text-gray-500 uppercase tracking-wider text-[10px] block">
                Registration No
              </span>
              <span className="font-mono font-bold text-teal-300 print:text-black text-sm">
                {student.registration_number}
              </span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-500 uppercase tracking-wider text-[10px] block">
                Student Name
              </span>
              <span className="font-semibold text-white print:text-black">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-500 uppercase tracking-wider text-[10px] block">
                Course Enrolled
              </span>
              <span className="font-semibold text-white print:text-black">{student.course_type}</span>
            </div>
            <div>
              <span className="text-slate-500 print:text-gray-500 uppercase tracking-wider text-[10px] block">
                Batch
              </span>
              <span className="text-white print:text-black">{student.batch_name}</span>
            </div>
          </div>

          {/* Payment Particulars Table */}
          <div className="py-5 border-b border-slate-800 print:border-gray-300">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 print:text-gray-600 border-b border-slate-800 print:border-gray-200">
                  <th className="pb-2">Description / Payment Type</th>
                  <th className="pb-2">Payment Mode</th>
                  <th className="pb-2 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="text-slate-200 print:text-black">
                <tr>
                  <td className="py-3">
                    <div className="font-semibold text-white print:text-black flex items-center gap-2">
                      <span>{payment.type}</span>
                      {payment.payment_for && (
                        <span className="text-xs font-normal text-teal-400 print:text-gray-700 bg-slate-900 print:bg-transparent px-2 py-0.5 rounded border border-slate-800 print:border-none">
                          {payment.payment_for}
                        </span>
                      )}
                    </div>
                    {payment.university_name && (
                      <div className="text-[11px] text-amber-300 print:text-gray-700 font-medium mt-1">
                        Affiliated University: {payment.university_name}
                      </div>
                    )}
                    {payment.note && (
                      <div className="text-[11px] text-slate-500 print:text-gray-500 italic mt-0.5">
                        Ref: {payment.note}
                      </div>
                    )}
                  </td>
                  <td className="py-3 font-medium">{payment.mode}</td>
                  <td className="py-3 text-right font-mono font-bold text-emerald-400 print:text-black text-sm">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Account Balance Summary */}
          <div className="py-5 grid grid-cols-3 gap-4 text-xs bg-slate-900/60 print:bg-gray-100 rounded-xl p-4 my-4">
            <div>
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Total Course Fees:</span>
              <span className="font-mono font-bold text-white print:text-black text-sm">
                {formatCurrency(student.total_fees)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Total Fees Paid:</span>
              <span className="font-mono font-bold text-emerald-400 print:text-black text-sm">
                {formatCurrency(totalPaid)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Balance Remaining:</span>
              <span className="font-mono font-bold text-amber-400 print:text-black text-sm">
                {formatCurrency(student.remaining_fees)}
              </span>
            </div>
          </div>

          {/* Footer & Signatures */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-500 print:text-gray-500">
            <div>
              <p className="text-[11px] font-medium text-slate-400 print:text-gray-600">
                • Computer-generated electronic receipt. No physical signature required.
              </p>
              <p className="text-[10px] mt-0.5">
                For questions regarding this receipt, contact {config.email}.
              </p>
            </div>
            <div className="text-right border-t border-slate-700 print:border-gray-400 pt-2 min-w-[140px]">
              <span className="font-semibold text-slate-300 print:text-black block text-[11px]">
                Authorized Signatory
              </span>
              <span className="text-[10px] uppercase tracking-wider">{config.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
