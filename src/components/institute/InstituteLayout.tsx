import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useInstitute } from "../../contexts/InstituteContext";
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
import { Lead } from "../../types";
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
} from "lucide-react";

export const InstituteLayout: React.FC = () => {
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const { config } = useInstitute();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [prefillLead, setPrefillLead] = useState<Lead | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    return sessionStorage.getItem("theme_mode") === "light";
  });

  const toggleLightMode = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    sessionStorage.setItem("theme_mode", next ? "light" : "dark");
  };

  const features = config?.features || {
    finance_module: true,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: true,
    backup_restore: true,
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
    { id: "verify", label: "Verify", icon: ShieldCheck, shown: true },
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
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
              <h1 className="font-bold text-base tracking-tight truncate leading-tight">
                {config?.name || "Institute Portal"}
              </h1>
              <p
                className={`text-[11px] truncate ${
                  isLightMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Admission & Fees Portal • Prefix:{" "}
                <span className="font-mono text-teal-400 font-bold">{config?.reg_prefix}</span>
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : isLightMode
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right actions: Light toggle & Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLightMode}
              title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={`p-2 rounded-xl border transition ${
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
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
              className="xl:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
};
