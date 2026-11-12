import React, { useState, useMemo } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { Student, StudentStatus, CertificateStatus } from "../../types";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { cleanPhone10 } from "../../utils/validators";
import {
  Search,
  Filter,
  Download,
  Eye,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
} from "lucide-react";
import Papa from "papaparse";

interface StudentListProps {
  onSelectStudent: (studentId: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onSelectStudent }) => {
  const { students, courses, batches, config } = useInstitute();

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [certFilter, setCertFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter pipeline
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.registration_number.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      const matchesCourse = courseFilter === "all" || s.course_type === courseFilter;
      const matchesBatch = batchFilter === "all" || s.batch_name === batchFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesCert = certFilter === "all" || s.certificate_status === certFilter;

      let matchesDate = true;
      if (startDate && s.admission_date < startDate) matchesDate = false;
      if (endDate && s.admission_date > endDate) matchesDate = false;

      return matchesSearch && matchesCourse && matchesBatch && matchesStatus && matchesCert && matchesDate;
    });
  }, [students, searchTerm, courseFilter, batchFilter, statusFilter, certFilter, startDate, endDate]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleExportCsv = () => {
    if (filteredStudents.length === 0) return;

    const dataToExport = filteredStudents.map((s) => ({
      "Registration Number": s.registration_number,
      "Student Name": s.name,
      Phone: s.phone,
      Email: s.email || "",
      Course: s.course_type,
      Batch: s.batch_name,
      "Admission Date": s.admission_date,
      "Total Fees (INR)": s.total_fees,
      "Admission Fees Paid (INR)": s.admission_fees,
      "Remaining Fees (INR)": s.remaining_fees,
      Status: s.status,
      "Certificate Status": s.certificate_status,
      "Certificate Issue Date": s.certificate_issue_date || "",
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${config?.reg_prefix || "Institute"}_Students_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenWhatsApp = (phone: string, name: string) => {
    const clean = cleanPhone10(phone);
    const text = encodeURIComponent(
      `Hello ${name}, greetings from ${config?.name || "Institute"}. We are reaching out regarding your course details.`
    );
    window.open(`https://wa.me/91${clean}?text=${text}`, "_blank");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCourseFilter("all");
    setBatchFilter("all");
    setStatusFilter("all");
    setCertFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const isFiltered =
    searchTerm ||
    courseFilter !== "all" ||
    batchFilter !== "all" ||
    statusFilter !== "all" ||
    certFilter !== "all" ||
    startDate ||
    endDate;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-400" /> Student Registry Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full enrolled student database • {filteredStudents.length} of {students.length} records shown
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredStudents.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export Filtered as CSV
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by student name, phone number, registration number, or email..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Dropped">Dropped</option>
            <option value="On Hold">On Hold</option>
          </select>

          <select
            value={certFilter}
            onChange={(e) => {
              setCertFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Certificates</option>
            <option value="Issued">Issued</option>
            <option value="Not Issued">Not Issued</option>
          </select>

          <div>
            <input
              type="date"
              title="Admission Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              title="Admission End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
            />

            {isFiltered && (
              <button
                onClick={clearFilters}
                title="Clear Filters"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Registration No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Fees Remaining</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No student records found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const statusColors: Record<StudentStatus, string> = {
                    Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    Completed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                    Dropped: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    "On Hold": "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  };

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-teal-300">
                        {student.registration_number}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-teal-300 transition">
                          {student.name}
                        </div>
                        {student.certificate_status === "Issued" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-teal-400">
                            <CheckCircle2 className="w-3 h-3" /> Cert Issued
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">{student.phone}</td>

                      <td className="py-3 px-4 font-medium text-slate-200">{student.course_type}</td>

                      <td className="py-3 px-4 text-slate-400">{student.batch_name}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            statusColors[student.status] || "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {student.remaining_fees > 0 ? (
                          <span className="font-mono font-bold text-amber-400">
                            {formatCurrency(student.remaining_fees)}
                          </span>
                        ) : (
                          <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                            Paid in Full
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => onSelectStudent(student.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {/* Quick WhatsApp */}
                          <button
                            title="Chat on WhatsApp"
                            onClick={() => handleOpenWhatsApp(student.phone, student.name)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="text-white font-semibold">{currentPage}</span> of{" "}
              <span className="text-white font-semibold">{totalPages}</span> (20 per page)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
