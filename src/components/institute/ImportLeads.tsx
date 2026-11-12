import React, { useState } from "react";
import Papa from "papaparse";
import { useInstitute } from "../../contexts/InstituteContext";
import { useToast } from "../shared/Toast";
import { Lead } from "../../types";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  UserCheck,
  UserPlus,
  Search,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cleanPhone10 } from "../../utils/validators";

interface ImportLeadsProps {
  onEnrollLead: (lead: Lead) => void;
}

export const ImportLeads: React.FC<ImportLeadsProps> = ({ onEnrollLead }) => {
  const { leads, students, addLeads, deleteLead, clearAllLeads } = useInstitute();
  const { success, error, info } = useToast();

  const [previewLeads, setPreviewLeads] = useState<Omit<Lead, "id" | "created_at">[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCourse, setManualCourse] = useState("");
  const [manualSource, setManualSource] = useState("Walk-in");
  const [manualNotes, setManualNotes] = useState("");

  // Existing student phones map for "already enrolled" badge
  const existingPhoneSet = new Set(students.map((s) => cleanPhone10(s.phone)));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: any[] = results.data;
        if (!rows || rows.length === 0) {
          error("Uploaded CSV file appears to be empty.");
          return;
        }

        const parsed: Omit<Lead, "id" | "created_at">[] = rows
          .map((row) => {
            const name = row.name || row.Name || row["Full Name"] || row["Student Name"] || "";
            const phone = row.phone || row.Phone || row["Mobile"] || row["Contact"] || "";
            const email = row.email || row.Email || "";
            const course_interest =
              row.course_interest || row.Course || row["Course Interest"] || row.course || "";
            const source = row.source || row.Source || "CSV Import";
            const notes = row.notes || row.Notes || row.remarks || "";

            return {
              name: String(name).trim(),
              phone: String(phone).trim(),
              email: String(email).trim(),
              course_interest: String(course_interest).trim(),
              source: String(source).trim(),
              notes: String(notes).trim(),
            };
          })
          .filter((item) => item.name && item.phone);

        if (parsed.length === 0) {
          error("No valid leads with Name & Phone found in CSV. Expected columns: name, phone, email, course_interest.");
          return;
        }

        setPreviewLeads(parsed);
        info(`Found ${parsed.length} valid lead records. Review and click "Confirm Import".`);
      },
      error: (err) => {
        error(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleConfirmImport = () => {
    if (previewLeads.length === 0) return;
    addLeads(previewLeads);
    success(`Successfully imported ${previewLeads.length} leads!`);
    setPreviewLeads([]);
    setFileName("");
  };

  const handleAddManualLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) {
      error("Name and Phone are required.");
      return;
    }

    addLeads([
      {
        name: manualName.trim(),
        phone: manualPhone.trim(),
        email: manualEmail.trim(),
        course_interest: manualCourse.trim(),
        source: manualSource.trim(),
        notes: manualNotes.trim(),
      },
    ]);

    success("Lead added successfully!");
    setManualName("");
    setManualPhone("");
    setManualEmail("");
    setManualCourse("");
    setManualNotes("");
  };

  const filteredLeads = leads.filter((l) => {
    const q = searchTerm.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.course_interest && l.course_interest.toLowerCase().includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-400" /> Lead Pipeline & CSV Import
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture counseling leads, batch upload CSVs, and convert prospective candidates directly into admissions
          </p>
        </div>

        {leads.length > 0 && (
          <button
            onClick={clearAllLeads}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs transition"
          >
            Clear All ({leads.length}) Leads
          </button>
        )}
      </div>

      {/* CSV Dropzone & Manual Quick Entry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Bulk Import via CSV
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">.csv format</span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Upload lead lists from Meta Ads, Google Ads, or walk-in records. Required headers:
              <span className="font-mono text-teal-300 font-semibold"> name, phone</span> (optional: email, course_interest, source, notes).
            </p>

            <label className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 group">
              <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-teal-400 transition mb-2" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {fileName ? fileName : "Click to select CSV file"}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Supports UTF-8 encoded CSV files</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {previewLeads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                Ready: <span className="text-teal-300 font-bold">{previewLeads.length} leads</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewLeads([])}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20"
                >
                  Confirm Import
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Manual Entry Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Single Lead Quick Entry
          </h3>
          <form onSubmit={handleAddManualLead} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Rahul Singh"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="9826011111"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Course Interest</label>
                <input
                  type="text"
                  value={manualCourse}
                  onChange={(e) => setManualCourse(e.target.value)}
                  placeholder="3D Animation"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Lead Source</label>
                <select
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Meta Ads">Meta Ads</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Student Referral</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition"
            >
              Add Lead to Pipeline
            </button>
          </form>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Active Lead Registry ({filteredLeads.length})
            </h3>
          </div>
          <div className="w-full sm:w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Course Interest</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Enrollment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No leads in the pipeline. Upload a CSV or add leads manually above.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const cleanPhone = cleanPhone10(lead.phone);
                  const isEnrolled = existingPhoneSet.has(cleanPhone);

                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-teal-300 transition">
                          {lead.name}
                        </div>
                        {lead.email && (
                          <div className="text-[11px] text-slate-500 font-mono">{lead.email}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">{lead.phone}</td>

                      <td className="py-3 px-4 text-slate-200">
                        {lead.course_interest || "Not specified"}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          {lead.source || "Inquiry"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Already Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            Prospective Lead
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onEnrollLead(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-[11px] transition shadow-md shadow-teal-500/20"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Enroll Now</span>
                          </button>

                          <button
                            onClick={() => deleteLead(lead.id)}
                            title="Remove Lead"
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
