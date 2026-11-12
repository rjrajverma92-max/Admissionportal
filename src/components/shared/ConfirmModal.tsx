import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requiredConfirmationText?: string; // If set, user must type this exact string
  confirmationPlaceholder?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  requiredConfirmationText,
  confirmationPlaceholder,
}) => {
  const [typedInput, setTypedInput] = useState("");

  if (!isOpen) return null;

  const isConfirmDisabled =
    requiredConfirmationText !== undefined && typedInput !== requiredConfirmationText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDanger
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-teal-500/20 text-teal-400 border border-teal-500/30"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400">Please review before continuing</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">{message}</p>

        {requiredConfirmationText && (
          <div className="mb-5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Type <span className="font-mono text-rose-400 font-bold">{requiredConfirmationText}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={confirmationPlaceholder || `Type "${requiredConfirmationText}"`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950"
                : "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-950"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
