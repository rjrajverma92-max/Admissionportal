import React, { useState, useEffect } from "react";
import {
  db,
  isFirebaseConfigured,
} from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Student, InstituteConfig } from "../../types";
import { formatDate } from "../../utils/formatters";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ArrowLeft,
  Award,
  Calendar,
  BookOpen,
  Lock,
} from "lucide-react";

interface PublicVerifyProps {
  onBackToLogin: () => void;
  defaultInstId?: string;
  defaultRegNumber?: string;
}

export const PublicVerify: React.FC<PublicVerifyProps> = ({
  onBackToLogin,
  defaultInstId,
  defaultRegNumber,
}) => {
  const [regNumber, setRegNumber] = useState(defaultRegNumber || "");
  const [instId, setInstId] = useState(defaultInstId || "");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    student?: Student;
    instituteName?: string;
    statusMsg?: string;
  } | null>(null);

  useEffect(() => {
    // Read URL query params if present
    const params = new URLSearchParams(window.location.search);
    const regParam = params.get("reg");
    const instParam = params.get("inst");
    if (regParam) setRegNumber(regParam);
    if (instParam) setInstId(instParam);

    if (regParam) {
      handleSearch(regParam, instParam || undefined);
    }
  }, []);

  const handleSearch = async (targetReg?: string, targetInst?: string) => {
    const searchReg = (targetReg || regNumber).trim().toUpperCase();
    const searchInst = (targetInst || instId).trim();

    if (!searchReg) return;

    setSearching(true);
    setResult(null);

    try {
      if (isFirebaseConfigured && db) {
        if (searchInst) {
          // Search specific subcollection
          const q = query(
            collection(db, `institutes/${searchInst}/students`),
            where("registration_number", "==", searchReg)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docData = snap.docs[0].data() as Student;
            setResult({
              found: true,
              student: docData,
              instituteName: "Accredited Center",
            });
            setSearching(false);
            return;
          }
        } else {
          // Query institutes to find student across branches
          const instSnap = await getDocs(collection(db, "institutes"));
          for (const instDoc of instSnap.docs) {
            const q = query(
              collection(db, `institutes/${instDoc.id}/students`),
              where("registration_number", "==", searchReg)
            );
            const stdSnap = await getDocs(q);
            if (!stdSnap.empty) {
              const docData = stdSnap.docs[0].data() as Student;
              const instConfig = instDoc.data()?.config as InstituteConfig;
              setResult({
                found: true,
                student: docData,
                instituteName: instConfig?.name || "Accredited Center",
              });
              setSearching(false);
              return;
            }
          }
        }
      }

      // Not found in Firestore
      setResult({
        found: false,
        statusMsg: "No credential matching this registration number was found in the archive.",
      });
    } catch (err: any) {
      console.error("Verification query error:", err);
      setResult({
        found: false,
        statusMsg: "Unable to complete verification check at this moment.",
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-4 shadow-xl shadow-teal-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Certificate & Credential Verification
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Official Multi-Institute Academic Verification Registry
          </p>
        </div>

        {/* Verification Search Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Student Registration Number
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MAAC-2026-27-0001"
                  className="w-full uppercase font-mono bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? "Searching Archive..." : "Verify Certificate Status"}
            </button>
          </form>

          {/* Verification Results */}
          {result && (
            <div className="mt-6 pt-6 border-t border-slate-800 animate-in fade-in duration-200">
              {result.found && result.student ? (
                result.student.certificate_status === "Issued" ? (
                  // GREEN VERIFIED CARD
                  <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Authentic & Officially Issued Certificate</span>
                    </div>

                    <div className="space-y-2 text-xs pt-1 border-t border-emerald-500/20 text-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Awarded To:</span>
                        <span className="font-semibold text-white">{result.student.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Course / Program:</span>
                        <span className="font-semibold text-white">{result.student.course_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Certifying Body:</span>
                        <span className="text-teal-300 font-semibold">{result.instituteName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Registration Number:</span>
                        <span className="font-mono text-white font-bold">
                          {result.student.registration_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Issue Date:</span>
                        <span className="font-mono text-emerald-300">
                          {formatDate(result.student.certificate_issue_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // YELLOW PENDING ISSUANCE
                  <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>Certificate Not Yet Issued</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Student <span className="font-semibold text-white">{result.student.name}</span> is
                      duly registered in <span className="font-semibold text-white">{result.student.course_type}</span>,
                      however their final completion certificate has not yet been authorized.
                    </p>
                  </div>
                )
              ) : (
                // RED NOT FOUND CARD
                <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <span>No Matching Record Found</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.statusMsg || "Please verify the registration number and try again."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return to Login */}
        <div className="text-center">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff / Admin Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
