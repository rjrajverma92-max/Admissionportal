import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { Lead } from "../../types";
import { db } from "../../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { generateRegistrationNumber } from "../../services/registrationService";
import { cleanPhone10 } from "../../utils/validators";
import {
  FileSpreadsheet,
  FileDown,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserPlus,
  RefreshCw,
  X,
} from "lucide-react";

interface ImportLeadsProps {
  onEnrollLead: (lead: Lead) => void;
}

interface ParsedLeadRow {
  _rowNum: number;
  name: string;
  phone: string;
  email: string;
  father_name: string;
  mother_name: string;
  dob: string;
  address: string;
  course: string;
  batch: string;
  session: string;
  affiliated_university: string;
  university_total_fees: number;
  total_fees: number;
  admission_fees_paid: number;
  payment_mode: string;
  notes: string;
  _status: "ready" | "error" | "importing" | "done" | "duplicate";
  _error: string;
}

export const ImportLeads: React.FC<ImportLeadsProps> = ({ onEnrollLead }) => {
  const { instituteId, config, students } = useInstitute();
  const { success, error, info } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<ParsedLeadRow[]>([]);
  const [importing, setImporting] = useState(false);

  const existingPhoneSet = new Set(students.map((s) => cleanPhone10(s.phone)));

  const downloadTemplate = () => {
    const headers = [
      "name",
      "phone",
      "email",
      "father_name",
      "mother_name",
      "dob",
      "address",
      "course",
      "batch",
      "session",
      "affiliated_university",
      "university_total_fees",
      "total_fees",
      "admission_fees_paid",
      "payment_mode",
      "notes",
    ];

    const exampleRows = [
      [
        "Rahul Sharma",
        "9826011111",
        "rahul@example.com",
        "Ramesh Sharma",
        "Sunita Sharma",
        "15-05-2003",
        "Civil Lines Raipur",
        "PGDCA",
        "Morning Batch",
        "January 2026-27",
        "Pt. Ravishankar Shukla University",
        "11000",
        "18500",
        "5000",
        "Cash",
        "First installment paid",
      ],
      [
        "Priya Verma",
        "9826022222",
        "priya@example.com",
        "Suresh Verma",
        "Meena Verma",
        "22-08-2004",
        "Devendra Nagar Raipur",
        "DCA",
        "Evening Batch",
        "July 2026-27",
        "CVRU (C.V. Raman University)",
        "8000",
        "15000",
        "3000",
        "UPI",
        "GPay ref #12345",
      ],
      [
        "Amit Kumar",
        "9826033333",
        "",
        "",
        "",
        "20-11-2002",
        "Pandri Raipur",
        "Video Editing",
        "Regular Batch",
        "",
        "",
        "0",
        "12000",
        "4000",
        "Cash",
        "",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...exampleRows.map((row) =>
        row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseCSV(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith(".csv")) {
      parseCSV(file);
    } else {
      error("Please upload a .csv file only");
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (!rows || rows.length === 0) {
          error("Uploaded CSV file appears to be empty.");
          return;
        }

        const required = [
          "name",
          "phone",
          "course",
          "batch",
          "total_fees",
          "admission_fees_paid",
          "payment_mode",
        ];

        const headers = Object.keys(rows[0] || {});
        const missing = required.filter((r) => !headers.includes(r));

        if (missing.length > 0) {
          error(`Missing required columns: ${missing.join(", ")}. Please use the template.`);
          return;
        }

        const parsed: ParsedLeadRow[] = rows.map((row, idx) => {
          const phoneClean = cleanPhone10(row.phone || "");
          const isDuplicate = existingPhoneSet.has(phoneClean);

          const leadItem: ParsedLeadRow = {
            _rowNum: idx + 2,
            name: row.name?.trim() || "",
            phone: row.phone?.trim() || "",
            email: row.email?.trim() || "",
            father_name: row.father_name?.trim() || "",
            mother_name: row.mother_name?.trim() || "",
            dob: row.dob?.trim() || "",
            address: row.address?.trim() || "",
            course: row.course?.trim() || "",
            batch: row.batch?.trim() || "",
            session: row.session?.trim() || "",
            affiliated_university: row.affiliated_university?.trim() || "",
            university_total_fees: Number(row.university_total_fees) || 0,
            total_fees: Number(row.total_fees) || 0,
            admission_fees_paid: Number(row.admission_fees_paid) || 0,
            payment_mode: row.payment_mode?.trim() || "Cash",
            notes: row.notes?.trim() || "",
            _status: "pending" as any,
            _error: "",
          };

          const errors: string[] = [];
          if (!leadItem.name) errors.push("Name missing");
          if (!phoneClean || phoneClean.length !== 10) errors.push("Invalid phone");
          if (!leadItem.course) errors.push("Course missing");
          if (isNaN(leadItem.total_fees) || leadItem.total_fees <= 0) errors.push("Total fees missing");
          if (isNaN(leadItem.admission_fees_paid)) errors.push("Admission fees missing");

          if (isDuplicate) {
            leadItem._status = "duplicate";
            leadItem._error = "Already enrolled";
          } else if (errors.length > 0) {
            leadItem._status = "error";
            leadItem._error = errors.join(", ");
          } else {
            leadItem._status = "ready";
            leadItem._error = "";
          }

          return leadItem;
        });

        setLeads(parsed);
        const readyCount = parsed.filter((r) => r._status === "ready").length;
        const errCount = parsed.filter((r) => r._status === "error").length;
        const dupCount = parsed.filter((r) => r._status === "duplicate").length;
        info(`${parsed.length} records loaded. ${readyCount} ready, ${errCount} errors, ${dupCount} duplicates.`);
      },
      error: () => {
        error("Failed to parse CSV file. Please check the format.");
      },
    });
  };

  const updateLeadStatus = (phone: string, status: ParsedLeadRow["_status"], errorMsg = "") => {
    setLeads((prev) =>
      prev.map((l) => (l.phone === phone ? { ...l, _status: status, _error: errorMsg } : l))
    );
  };

  const removeRow = (rowNum: number) => {
    setLeads((prev) => prev.filter((l) => l._rowNum !== rowNum));
  };

  const readyCount = leads.filter((l) => l._status === "ready").length;
  const errorCount = leads.filter((l) => l._status === "error").length;
  const duplicateCount = leads.filter((l) => l._status === "duplicate").length;

  const handleBulkImport = async () => {
    const readyLeads = leads.filter((l) => l._status === "ready");
    if (readyLeads.length === 0 || !instituteId || !config || !db) return;

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const lead of readyLeads) {
      try {
        updateLeadStatus(lead.phone, "importing");

        const regNumber = await generateRegistrationNumber(
          instituteId,
          config.reg_prefix || "INST",
          new Date().toISOString().split("T")[0]
        );

        const tFees = lead.total_fees;
        const aFees = lead.admission_fees_paid;
        const remaining = Math.max(0, tFees - aFees);

        const studentRef = doc(collection(db, `institutes/${instituteId}/students`));
        await setDoc(studentRef, {
          id: studentRef.id,
          registration_number: regNumber,
          name: lead.name,
          phone: cleanPhone10(lead.phone),
          email: lead.email,
          father_name: lead.father_name,
          mother_name: lead.mother_name,
          dob: lead.dob,
          address: lead.address,
          admission_date: new Date().toISOString().split("T")[0],
          course_type: lead.course,
          batch_name: lead.batch,
          session: lead.session,
          affiliated_university: lead.affiliated_university,
          university_total_fees: lead.university_total_fees,
          total_fees: tFees,
          admission_fees: aFees,
          remaining_fees: remaining,
          status: "Active",
          certificate_status: "Not Issued",
          created_timestamp: serverTimestamp(),
          status_history: [],
        });

        if (aFees > 0) {
          const paymentRef = doc(collection(db, `institutes/${instituteId}/payments`));
          await setDoc(paymentRef, {
            id: paymentRef.id,
            student_id: studentRef.id,
            amount: aFees,
            mode: lead.payment_mode as any,
            date: new Date().toISOString().split("T")[0],
            type: "Admission Fee",
            payment_for: "Admission Fees",
            university_name: "",
            note: lead.notes || "Imported from CSV",
            timestamp: serverTimestamp(),
          });
        }

        updateLeadStatus(lead.phone, "done");
        successCount++;
      } catch (err) {
        updateLeadStatus(lead.phone, "error", "Import failed");
        failCount++;
      }
    }

    setImporting(false);

    if (successCount > 0) {
      success(`Successfully imported ${successCount} students!`);
    }
    if (failCount > 0) {
      error(`${failCount} records failed. Check errors and retry.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-400" /> Bulk Student & Lead CSV Import
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Download the standard template, populate student data, and bulk import records directly into the institute registry.
          </p>
        </div>

        {leads.length > 0 && (
          <button
            onClick={() => setLeads([])}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs transition"
          >
            Clear Preview
          </button>
        )}
      </div>

      {/* STEP 1: Download Template */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <FileDown className="w-4 h-4 text-teal-400" />
              Step 1: Download Template
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Download the CSV template, fill student data and upload below.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
          >
            <Download className="w-4 h-4" />
            Download Template (.csv)
          </button>
        </div>

        {/* Column guide */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80">
          {[
            { col: "name", req: true },
            { col: "phone", req: true },
            { col: "email", req: false },
            { col: "father_name", req: false },
            { col: "mother_name", req: false },
            { col: "dob (DD-MM-YYYY)", req: false },
            { col: "address", req: false },
            { col: "course", req: true },
            { col: "batch", req: true },
            { col: "session", req: false },
            { col: "affiliated_university", req: false },
            { col: "university_total_fees", req: false },
            { col: "total_fees", req: true },
            { col: "admission_fees_paid", req: true },
            { col: "payment_mode", req: true },
            { col: "notes", req: false },
          ].map(({ col, req }) => (
            <div key={col} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  req
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {req ? "req" : "opt"}
              </span>
              <span className="text-[11px] text-slate-300 font-mono truncate">{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 2: Upload Filled CSV */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-teal-400" />
          Step 2: Upload Filled CSV
        </h3>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-950/40"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300 text-xs font-semibold">
            Drag & drop CSV file here or <span className="text-teal-400 underline">click to browse</span>
          </p>
          <p className="text-slate-500 text-[11px] mt-1">Only .csv files accepted</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Preview Table & Bulk Import Action */}
      {leads.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span className="text-emerald-400 font-semibold">✓ {readyCount} ready</span>
              {errorCount > 0 && <span className="text-rose-400 font-semibold">✗ {errorCount} errors</span>}
              {duplicateCount > 0 && <span className="text-amber-400 font-semibold">⚠ {duplicateCount} duplicates (skipped)</span>}
            </div>

            <button
              onClick={handleBulkImport}
              disabled={readyCount === 0 || importing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
            >
              <UserPlus className="w-4 h-4" />
              {importing ? "Importing Students..." : `Import ${readyCount} Ready Students`}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Row#</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Course</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Session</th>
                  <th className="py-3 px-3">Total Fees</th>
                  <th className="py-3 px-3">Paid</th>
                  <th className="py-3 px-3">Error / Note</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((row) => (
                  <tr key={row._rowNum} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row._rowNum}</td>
                    <td className="py-2.5 px-3">
                      {row._status === "ready" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready
                        </span>
                      )}
                      {row._status === "error" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Error
                        </span>
                      )}
                      {row._status === "duplicate" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Duplicate
                        </span>
                      )}
                      {row._status === "importing" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                          Importing...
                        </span>
                      )}
                      {row._status === "done" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          Imported ✓
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{row.name || "-"}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{row.phone || "-"}</td>
                    <td className="py-2.5 px-3 text-slate-200">{row.course || "-"}</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.batch || "-"}</td>
                    <td className="py-2.5 px-3 text-amber-300/80">{row.session || "-"}</td>
                    <td className="py-2.5 px-3 font-mono text-white">₹{row.total_fees.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">₹{row.admission_fees_paid.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-rose-400 text-[11px]">{row._error || "-"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {row._status === "ready" && (
                          <button
                            onClick={() =>
                              onEnrollLead({
                                id: `lead_${Date.now()}_${row._rowNum}`,
                                name: row.name,
                                phone: row.phone,
                                email: row.email,
                                course_interest: row.course,
                                source: "CSV Import",
                                notes: row.notes,
                                created_at: new Date().toISOString().split("T")[0],
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-semibold transition"
                          >
                            Enroll
                          </button>
                        )}
                        <button
                          onClick={() => removeRow(row._rowNum)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
