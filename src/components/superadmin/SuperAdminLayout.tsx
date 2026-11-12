import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { SuperAdminDashboard } from "./SuperAdminDashboard";
import { InstituteList } from "./InstituteList";
import { SuperAdminDebugTools } from "./SuperAdminDebugTools";
import { AddInstituteModal } from "./AddInstituteModal";
import { EditInstituteModal } from "./EditInstituteModal";
import { InstituteConfig } from "../../types";
import { firebaseConfig } from "../../firebase";
import {
  Shield,
  LayoutDashboard,
  Building2,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  FileCode,
  Copy,
  Check,
  X,
  ExternalLink,
  Bug,
} from "lucide-react";

export const SuperAdminLayout: React.FC = () => {
  const { user, logout, allInstitutes, refreshInstitutes } = useAuth();

  const [activeTab, setActiveTab] = useState<"dashboard" | "institutes" | "debug">("dashboard");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstituteConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshInstitutes();
    setTimeout(() => setRefreshing(false), 300);
  };

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default-deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Isolated subcollections structure per institute
    match /institutes/{instituteId} {
      // Allow reading, creating, updating, and deleting institute tenant data
      allow read, write: if true;

      // Subcollections: Students, Payments, Expenses, Courses, Batches, Counters, Leads
      match /{subcollection=**} {
        allow read, write: if true;
      }
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(rulesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">Super Admin Panel</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Master
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Logged in as {user?.email}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "dashboard"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab("institutes")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "institutes"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Institutes</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                {allInstitutes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("debug")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "debug"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Debug Tools</span>
            </button>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowRulesModal(true)}
              title="Firebase Rules Guide"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Firestore Rules</span>
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh Data"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-teal-400" : ""}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Institute</span>
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" ? (
          <SuperAdminDashboard
            institutes={allInstitutes}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onSelectTab={setActiveTab}
          />
        ) : activeTab === "institutes" ? (
          <InstituteList
            institutes={allInstitutes}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenEditModal={(inst) => setEditTarget(inst)}
            onRefresh={refreshInstitutes}
          />
        ) : (
          <SuperAdminDebugTools institutes={allInstitutes} />
        )}
      </main>

      {/* Modals */}
      <AddInstituteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshInstitutes}
      />

      <EditInstituteModal
        isOpen={Boolean(editTarget)}
        institute={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={refreshInstitutes}
      />

      {/* Firestore Rules Helper Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Firestore Security Rules</h3>
                <p className="text-xs text-slate-400">
                  Copy and paste into your Firebase Console to enable live cloud Firestore sync.
                </p>
              </div>
            </div>

            <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto">
              <pre>{rulesText}</pre>
              <button
                onClick={copyRules}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-sans text-xs font-semibold shadow transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Rules"}
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200">How to apply in Firebase Console:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Go to Firebase Console &gt; Build &gt; Firestore Database</li>
                <li>Click the <strong>Rules</strong> tab at the top</li>
                <li>Paste the rules above and click <strong>Publish</strong></li>
              </ol>
              {firebaseConfig.projectId && (
                <div className="pt-1.5 flex flex-wrap gap-2">
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-medium transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Firebase Console Rules ({firebaseConfig.projectId})</span>
                  </a>
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/-default-/data`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Live Database Collections</span>
                  </a>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
