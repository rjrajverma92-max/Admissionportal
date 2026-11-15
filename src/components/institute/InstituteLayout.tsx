import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useInstitute } from "../../contexts/InstituteContext";
import { db } from "../../firebase";
import { collection, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { Dashboard } from "./Dashboard";
import { AdmissionForm } from "./AdmissionForm";
import { ImportLeads } from "./ImportLeads";
import { StudentList } from "./StudentList";
import { StudentDetail } from "./StudentDetail";
import { Finance } from "./Finance";
import { FeeReminders } from "./FeeReminders";
import { Birthdays } from "./Birthdays";
import { Settings } from "./Settings";
import { PublicVerify } from "./PublicVerify";
import { Lead, ReleaseNote } from "../../types";
import {
  LayoutDashboard,
  UserPlus,
  FileSpreadsheet,
  Users,
  DollarSign,
  Bell,
  Cake,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Crown,
  Sparkles,
  Clock,
} from "lucide-react";

export const InstituteLayout: React.FC = () => {
  const { user, logout, isImpersonating, stopImpersonation, switchInstitute, myInstitutes, planUpgradeNotice, setPlanUpgradeNotice } = useAuth();
  const { config } = useInstitute();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [prefillLead, setPrefillLead] = useState<Lead | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    return sessionStorage.getItem("theme_mode") === "light";
  });

  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [unreadNotes, setUnreadNotes] = useState<ReleaseNote[]>([]);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    const fetchReleaseNotes = async () => {
      if (!config?.institute_id || !db) return;
      try {
        const notesSnap = await getDocs(collection(db, "release_notes"));
        const activeNotes: ReleaseNote[] = [];
        notesSnap.forEach((d) => {
          const data = d.data();
          if (data.is_active !== false) {
            activeNotes.push({ id: d.id, ...data } as ReleaseNote);
          }
        });

        const readNoteIds: string[] = [];
        try {
          const readSnap = await getDocs(collection(db, `institutes/${config.institute_id}/read_notifications`));
          readSnap.forEach((d) => {
            readNoteIds.push(d.data().note_id || d.id);
          });
        } catch {
          // Ignore read notifications permission or collection error
        }

        const unread = activeNotes.filter((note) => !readNoteIds.includes(note.id));
        setReleaseNotes(activeNotes);
        setUnreadNotes(unread);

        if (unread.length > 0) {
          setShowWhatsNew(true);
        }
      } catch (err: any) {
        console.warn("Notice fetching release notes:", err?.message || err);
        setReleaseNotes([]);
        setUnreadNotes([]);
      }
    };

    fetchReleaseNotes();
  }, [config?.institute_id]);

  const markAllAsRead = async () => {
    if (!config?.institute_id || !db) return;
    try {
      for (const note of unreadNotes) {
        await setDoc(
          doc(db, `institutes/${config.institute_id}/read_notifications/${note.id}`),
          {
            note_id: note.id,
            institute_id: config.institute_id,
            read_at: serverTimestamp(),
          }
        );
      }
      setUnreadNotes([]);
      setShowWhatsNew(false);
    } catch (err) {
      console.error("Error marking notes as read:", err);
    }
  };

  const toggleLightMode = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    sessionStorage.setItem("theme_mode", next ? "light" : "dark");
  };

  const features = config?.features || {
    finance_module: false,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: false,
    university_fees: false,
    backup_restore: false,
    email_notifications: false,
    multi_institute: false,
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, shown: true },
    { id: "enroll", label: "Enroll", icon: UserPlus, shown: true },
    { id: "import_leads", label: "Import Leads", icon: FileSpreadsheet, shown: Boolean(features.import_leads) },
    { id: "registry", label: "Registry", icon: Users, shown: true },
    { id: "finance", label: "Finance", icon: DollarSign, shown: Boolean(features.finance_module) },
    { id: "reminders", label: "Reminders", icon: Bell, shown: Boolean(features.fee_reminders) },
    { id: "birthdays", label: "Birthdays", icon: Cake, shown: Boolean(features.birthday_greetings) },
    { id: "settings", label: "Settings", icon: SettingsIcon, shown: true },
    { id: "verify", label: "Verify", icon: ShieldCheck, shown: Boolean(features.certificate_verify) },
  ].filter((item) => item.shown);

  const handleNavigate = (tab: string, studentId?: string) => {
    if (tab === "student_detail" && studentId) {
      setSelectedStudentId(studentId);
      setActiveTab("student_detail");
    } else {
      setSelectedStudentId(null);
      setActiveTab(tab);
    }
    setIsMobileMenuOpen(false);
  };

  const handleEnrollFromLead = (lead: Lead) => {
    setPrefillLead(lead);
    setActiveTab("enroll");
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isLightMode ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      {/* Super Admin Impersonation Bar */}
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 px-8 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>
              SUPER ADMIN IMPERSONATION: Viewing portal as{" "}
              <span className="underline uppercase">{config?.name}</span>
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs hover:bg-slate-800 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Super Admin Panel
          </button>
        </div>
      )}

      {/* Plan Upgrade Notice Banner */}
      {planUpgradeNotice.show && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-2.5 flex items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              {planUpgradeNotice.message}
            </p>
          </div>
          <button
            onClick={() => setPlanUpgradeNotice((p) => ({ ...p, show: false }))}
            className="text-amber-400 hover:text-white text-xs shrink-0 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Subscription Expiry / Trial Warning Banner */}
      {(() => {
        const getSubscriptionDaysLeft = (): number => {
          if (!config?.subscription_end_date) return 999;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const end = new Date(
            config.subscription_end_date
          );
          end.setHours(0, 0, 0, 0);
          return Math.max(0, Math.ceil(
            (end.getTime() - today.getTime()) 
            / (1000 * 60 * 60 * 24)
          ));
        };
        const daysLeft = getSubscriptionDaysLeft();
        const isTrial = config?.plan === "trial";
        if (daysLeft > 7) return null;
        return (
          <div className={`px-8 py-2.5 text-xs font-medium flex items-center justify-between gap-4 border-b ${
            daysLeft <= 2
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : daysLeft <= 5
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 shrink-0 ${
                daysLeft <= 2 ? "text-rose-400" : daysLeft <= 5 ? "text-amber-400" : "text-blue-400"
              }`} />
              <span>
                {isTrial
                  ? daysLeft === 0
                    ? "⚠️ Trial expires TODAY!"
                    : `🎯 Trial ends in ${daysLeft} day(s)`
                  : daysLeft === 0
                    ? "⚠️ Subscription expires TODAY!"
                    : `⏰ Subscription expires in ${daysLeft} day(s)`
                }
                {" — Contact admin to renew."}
              </span>
            </div>
            <span className="text-white/40 shrink-0">
              Expires: {new Date(
                config?.subscription_end_date || ""
              ).toLocaleDateString("en-IN")}
            </span>
          </div>
        );
      })()}

      {/* Main Top Navbar */}
      <header
        className={`sticky ${
          isImpersonating ? "top-8" : "top-0"
        } z-40 border-b backdrop-blur-md transition-colors ${
          isLightMode
            ? "bg-white/90 border-slate-200 shadow-sm"
            : "bg-slate-900/90 border-slate-800"
        }`}
      >
        <div className="w-full px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          {/* Institute Logo & Name */}
          <div className="flex items-center gap-3">
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-sm shadow-sm shrink-0 uppercase">
                {config?.reg_prefix ? config.reg_prefix.slice(0, 2) : "IN"}
              </div>
            )}
            <div className="truncate">
              <h1 className="font-bold text-base tracking-tight truncate leading-tight text-white">
                {config?.name || "Institute Portal"}
              </h1>
              <p
                className={`text-xs truncate ${
                  isLightMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Prefix: <span className="font-mono text-teal-400 font-bold">{config?.reg_prefix}</span>
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-teal-500/10 text-teal-400"
                      : isLightMode
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {myInstitutes.length > 1 && (
              <button
                onClick={switchInstitute}
                title="Switch Institute"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                  isLightMode
                    ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                    : "bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            )}

            <button
              onClick={() => setShowWhatsNew(true)}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition w-9 h-9 flex items-center justify-center"
              title="What's New / Release Notes"
            >
              <Bell className="w-4 h-4" />
              {unreadNotes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotes.length}
                </span>
              )}
            </button>

            <button
              onClick={toggleLightMode}
              title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={`p-2 rounded-lg border transition w-9 h-9 flex items-center justify-center ${
                isLightMode
                  ? "bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition w-9 h-9 sm:w-auto sm:h-auto items-center justify-center ${
                isLightMode
                  ? "bg-slate-200 border-slate-300 text-slate-700 hover:text-rose-600 hover:border-rose-300"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-rose-300 hover:border-rose-500/30"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 w-9 h-9 flex items-center justify-center"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div
            className={`xl:hidden px-4 py-3 border-t grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 ${
              isLightMode ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left transition ${
                    isActive
                      ? "bg-teal-500 text-slate-950 font-bold"
                      : isLightMode
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-950 text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 w-full px-6 lg:px-10 py-8">
        {activeTab === "dashboard" && <Dashboard onNavigate={handleNavigate} />}

        {activeTab === "enroll" && (
          <AdmissionForm
            prefillLead={prefillLead}
            onClearPrefillLead={() => setPrefillLead(null)}
            onNavigateToRegistry={() => handleNavigate("registry")}
          />
        )}

        {activeTab === "import_leads" && (
          <ImportLeads onEnrollLead={handleEnrollFromLead} />
        )}

        {activeTab === "registry" && (
          <StudentList onSelectStudent={(id) => handleNavigate("student_detail", id)} />
        )}

        {activeTab === "student_detail" && selectedStudentId && (
          <StudentDetail
            studentId={selectedStudentId}
            onBack={() => handleNavigate("registry")}
          />
        )}

        {activeTab === "finance" && <Finance />}

        {activeTab === "reminders" && <FeeReminders />}

        {activeTab === "birthdays" && <Birthdays />}

        {activeTab === "settings" && <Settings />}

        {activeTab === "verify" && (
          <div className="py-4">
            <PublicVerify
              defaultInstId={config?.institute_id}
              onBackToLogin={() => handleNavigate("dashboard")}
            />
          </div>
        )}
      </main>

      {/* What's New Modal */}
      {showWhatsNew && unreadNotes.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto text-slate-100 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">What's New</h2>
                  <p className="text-xs text-slate-400">
                    {unreadNotes.length} new update(s) since your last login
                  </p>
                </div>
              </div>
            </div>

            {/* Notes List */}
            <div className="px-6 py-6 space-y-5">
              {unreadNotes.map((note) => (
                <div key={note.id} className="border border-slate-800 rounded-2xl p-5 space-y-3 bg-slate-950/40">
                  {/* Version + Title */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full">
                      {note.version}
                    </span>
                    <h3 className="text-white font-semibold text-sm">{note.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300 text-sm leading-relaxed">{note.description}</p>

                  {/* Benefit */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-emerald-400 mb-1">✅ Benefit</p>
                    <p className="text-xs text-slate-300">{note.benefit}</p>
                  </div>

                  {/* How to Use */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-blue-400 mb-1">📖 How to Use</p>
                    <p className="text-xs text-slate-300 whitespace-pre-line">{note.how_to_use}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={markAllAsRead}
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-teal-500/20"
              >
                Got it! Continue to Portal →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
