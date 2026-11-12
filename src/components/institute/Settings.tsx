import React, { useState, useEffect } from "react";
import { useInstitute } from "../../contexts/InstituteContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../shared/Toast";
import { ConfirmModal } from "../shared/ConfirmModal";
import { CourseOption, BatchOption, UniversityOption } from "../../types";
import { testEmailConfig } from "../../services/emailService";
import { auth, isFirebaseConfigured } from "../../firebase";
import { updatePassword } from "firebase/auth";
import {
  Settings as SettingsIcon,
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  Mail,
  Database,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Upload,
  AlertTriangle,
  Send,
  Sparkles,
} from "lucide-react";

export const Settings: React.FC = () => {
  const {
    config,
    courses,
    batches,
    universities,
    students,
    updateConfig,
    addCourse,
    updateCourse,
    deleteCourse,
    addBatch,
    updateBatch,
    deleteBatch,
    addUniversity,
    updateUniversity,
    deleteUniversity,
    seedDefaultUniversitiesIfEmpty,
    backupDataAsJson,
    restoreDataFromJson,
    clearAllInstituteData,
  } = useInstitute();
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<
    "profile" | "courses" | "batches" | "universities" | "email" | "backup" | "password"
  >("profile");

  // Profile Edit State
  const [name, setName] = useState(config?.name || "");
  const [phone, setPhone] = useState(config?.phone || "");
  const [city, setCity] = useState(config?.city || "");
  const [address, setAddress] = useState(config?.address || "");
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // EmailJS Settings State
  const [serviceId, setServiceId] = useState(config?.emailjs_service_id || "");
  const [publicKey, setPublicKey] = useState(config?.emailjs_public_key || "");
  const [tmplAdmission, setTmplAdmission] = useState(config?.emailjs_template_admission || "");
  const [tmplPayment, setTmplPayment] = useState(config?.emailjs_template_payment || "");
  const [testingEmail, setTestingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Course Modal State
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseFees, setNewCourseFees] = useState<number | "">("");
  const [newCourseDuration, setNewCourseDuration] = useState<number | "">("");
  const [newCourseIsUniv, setNewCourseIsUniv] = useState(false);

  // Batch State
  const [newBatchName, setNewBatchName] = useState("");

  // University State
  const [newUnivName, setNewUnivName] = useState("");
  const [editingUniv, setEditingUniv] = useState<UniversityOption | null>(null);
  const [editUnivName, setEditUnivName] = useState("");
  const [selectedUnivForDelete, setSelectedUnivForDelete] = useState<UniversityOption | null>(null);

  // Pre-seed default universities when tab is opened and list is empty
  useEffect(() => {
    if (activeTab === "universities" && universities.length === 0) {
      seedDefaultUniversitiesIfEmpty();
    }
  }, [activeTab, universities.length, seedDefaultUniversitiesIfEmpty]);

  // Change Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  // Clear data confirmation modal
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  if (!config) return null;

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await updateConfig({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      logo_url: logoUrl.trim() || "",
    });
    setSavingProfile(false);
    success("Institute profile saved!");
  };

  // Handle Email Config Save
  const handleSaveEmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    await updateConfig({
      emailjs_service_id: serviceId.trim(),
      emailjs_public_key: publicKey.trim(),
      emailjs_template_admission: tmplAdmission.trim(),
      emailjs_template_payment: tmplPayment.trim(),
    });
    setSavingEmail(false);
    success("EmailJS configuration updated!");
  };

  // Handle Test Email
  const handleTestEmail = async () => {
    if (!user?.email) {
      error("No active user email to test with.");
      return;
    }
    setTestingEmail(true);
    const res = await testEmailConfig(
      serviceId,
      tmplAdmission || tmplPayment,
      publicKey,
      user.email,
      config.name
    );
    setTestingEmail(false);
    if (res.success) {
      success(res.message);
    } else {
      error(res.message);
    }
  };

  // Course Handlers
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    await addCourse({
      name: newCourseName,
      fees: newCourseFees === "" ? undefined : Number(newCourseFees),
      duration_months: newCourseDuration === "" ? undefined : Number(newCourseDuration),
      is_university_course: newCourseIsUniv,
    });
    success(`Course "${newCourseName}" added!`);
    setNewCourseName("");
    setNewCourseFees("");
    setNewCourseDuration("");
    setNewCourseIsUniv(false);
  };

  const handleDeleteCourse = async (courseId: string) => {
    const res = await deleteCourse(courseId);
    if (res.success) {
      success("Course removed.");
    } else {
      error(res.error || "Cannot delete course");
    }
  };

  // Batch Handlers
  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    await addBatch(newBatchName);
    success(`Batch "${newBatchName}" added!`);
    setNewBatchName("");
  };

  // University Handlers
  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnivName.trim()) return;
    await addUniversity(newUnivName.trim());
    success(`University "${newUnivName.trim()}" added!`);
    setNewUnivName("");
  };

  const handleSaveEditUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUniv || !editUnivName.trim()) return;
    await updateUniversity(editingUniv.id, { name: editUnivName.trim() });
    success("University updated!");
    setEditingUniv(null);
    setEditUnivName("");
  };

  const handleDeleteUniversityConfirmed = async () => {
    if (!selectedUnivForDelete) return;
    const univName = selectedUnivForDelete.name;
    const res = await deleteUniversity(selectedUnivForDelete.id);
    if (res.success) {
      success(`University "${univName}" deleted.`);
    } else {
      error(res.error || "Failed to delete university");
    }
    setSelectedUnivForDelete(null);
  };

  // Backup & Restore Handlers
  const handleDownloadBackup = () => {
    const jsonStr = backupDataAsJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.reg_prefix}_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success("Institute backup JSON exported!");
  };

  const handleFileUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const res = await restoreDataFromJson(content);
          if (res.success) {
            success(res.message);
          } else {
            error(res.message);
          }
        } catch (err: any) {
          error(err.message || "Failed to restore backup");
        }
      }
    };
    reader.readAsText(file);
  };

  // Password Update Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      error("New password and confirm password do not match.");
      return;
    }

    setUpdatingPass(true);
    if (isFirebaseConfigured && auth?.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPassword);
        success("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        if (err.code === "auth/requires-recent-login") {
          error("Security notice: Please re-login first before updating your password.");
        } else {
          error(err.message || "Failed to update password");
        }
      }
    } else {
      success("Password updated (Simulated mode).");
      setNewPassword("");
      setConfirmPassword("");
    }
    setUpdatingPass(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-teal-400" /> Institute Configuration & Settings
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Tenant Settings for <span className="font-semibold text-white">{config.name}</span> (Prefix:{" "}
          <span className="font-mono text-teal-300 font-bold">{config.reg_prefix}</span>)
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: "profile", label: "Institute Profile", icon: Building2 },
          { id: "courses", label: `Courses (${courses.length})`, icon: BookOpen },
          { id: "batches", label: `Batches (${batches.length})`, icon: Users },
          { id: "universities", label: `Universities (${universities.length})`, icon: GraduationCap },
          { id: "email", label: "EmailJS Integration", icon: Mail },
          {
            id: "backup",
            label: "Backup & Restore",
            icon: Database,
            hidden: !config.features?.backup_restore,
          },
          { id: "password", label: "Security & Password", icon: KeyRound },
        ]
          .filter((t) => !t.hidden)
          .map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* TAB A: Institute Profile */}
      {activeTab === "profile" && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Institute Campus Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Institute Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Registration Prefix (Immutable)
                </label>
                <input
                  type="text"
                  disabled
                  value={config.reg_prefix}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Physical Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Institute Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="py-2.5 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Institute Profile"}
            </button>
          </form>
        </div>
      )}

      {/* TAB B: Courses Management */}
      {activeTab === "courses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Course */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Course
            </h3>
            <form onSubmit={handleAddCourse} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. Master in 3D VFX"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Standard Course Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newCourseFees}
                  onChange={(e) =>
                    setNewCourseFees(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 150000"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  value={newCourseDuration}
                  onChange={(e) =>
                    setNewCourseDuration(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 18"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={newCourseIsUniv}
                    onChange={(e) => setNewCourseIsUniv(e.target.checked)}
                    className="rounded border-slate-700 text-teal-500 focus:ring-0 focus:outline-none"
                  />
                  <span>University Affiliated Course</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
              >
                Add Course to Catalog
              </button>
            </form>
          </div>

          {/* Course List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Course Catalog ({courses.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              {courses.length === 0 ? (
                <p className="text-xs text-slate-500 p-8 text-center">No courses configured.</p>
              ) : (
                courses.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">{c.name}</h4>
                        {c.is_university_course && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            University
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            c.active
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Fee: {c.fees ? `₹${c.fees.toLocaleString()}` : "Not set"} • Duration:{" "}
                        {c.duration_months ? `${c.duration_months} Months` : "Flexible"}
                      </p>
                      <div className="mt-1.5">
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(c.is_university_course)}
                            onChange={(e) =>
                              updateCourse(c.id, { is_university_course: e.target.checked })
                            }
                            className="rounded border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <span>University Affiliated Course</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCourse(c.id, { active: !c.active })}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB C: Batches Management */}
      {activeTab === "batches" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Batch
            </h3>
            <form onSubmit={handleAddBatch} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Morning Batch VFX (09:00 AM)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
              >
                Create Batch
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Configured Batches ({batches.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-800">
              {batches.length === 0 ? (
                <p className="text-xs text-slate-500 p-8 text-center">No batches configured.</p>
              ) : (
                batches.map((b) => (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{b.name}</h4>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          b.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {b.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateBatch(b.id, { active: !b.active })}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        {b.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => deleteBatch(b.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Universities Management */}
      {activeTab === "universities" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" /> University Management
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add universities for DCA/PGDCA or other affiliated courses
              </p>
            </div>
            {universities.length === 0 && (
              <button
                type="button"
                onClick={() => seedDefaultUniversitiesIfEmpty()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pre-seed Standard Universities
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add University Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add University
              </h3>
              <form onSubmit={handleAddUniversity} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                    University Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUnivName}
                    onChange={(e) => setNewUnivName(e.target.value)}
                    placeholder="e.g. Pt. Ravishankar Shukla University"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Save University
                </button>
              </form>
            </div>

            {/* Right: List of Universities */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  Configured Universities ({universities.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-800">
                {universities.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <p>No universities configured yet.</p>
                    <button
                      onClick={() => seedDefaultUniversitiesIfEmpty()}
                      className="text-amber-400 hover:underline text-xs"
                    >
                      Click here to load standard university list
                    </button>
                  </div>
                ) : (
                  universities.map((u) => (
                    <div key={u.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition">
                      <div className="flex-1 min-w-0">
                        {editingUniv?.id === u.id ? (
                          <form onSubmit={handleSaveEditUniversity} className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={editUnivName}
                              onChange={(e) => setEditUnivName(e.target.value)}
                              className="bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none flex-1 max-w-sm"
                            />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUniv(null);
                                setEditUnivName("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-white">{u.name}</h4>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  u.active
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-slate-800 text-slate-500 border-slate-700"
                                }`}
                              >
                                {u.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              ID: {u.id}
                            </p>
                          </div>
                        )}
                      </div>

                      {editingUniv?.id !== u.id && (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingUniv(u);
                              setEditUnivName(u.name);
                            }}
                            title="Edit Name"
                            className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => updateUniversity(u.id, { active: !u.active })}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                              u.active
                                ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            }`}
                          >
                            {u.active ? "Deactivate" : "Activate"}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => setSelectedUnivForDelete(u)}
                            title="Delete University"
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: EmailJS Configuration */}
      {activeTab === "email" && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <Mail className="w-4 h-4" /> EmailJS Per-Institute Credentials
            </h3>
            <a
              href="https://www.emailjs.com/docs/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-teal-400 underline"
            >
              EmailJS Docs →
            </a>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Configure your institute's dedicated EmailJS keys to automatically dispatch professional
            admission receipts, payment vouchers, fee reminder notices, and birthday greetings.
          </p>

          <form onSubmit={handleSaveEmailConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service ID
                </label>
                <input
                  type="text"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  placeholder="service_xxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Public Key (User ID)
                </label>
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="publicKey_xxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admission Template ID
                </label>
                <input
                  type="text"
                  value={tmplAdmission}
                  onChange={(e) => setTmplAdmission(e.target.value)}
                  placeholder="template_admission"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Receipt Template ID
                </label>
                <input
                  type="text"
                  value={tmplPayment}
                  onChange={(e) => setTmplPayment(e.target.value)}
                  placeholder="template_receipt"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingEmail}
                className="py-2.5 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                {savingEmail ? "Saving..." : "Save Email Config"}
              </button>

              <button
                type="button"
                disabled={testingEmail || !serviceId || !publicKey}
                onClick={handleTestEmail}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs border border-slate-700 transition flex items-center gap-2 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                {testingEmail ? "Sending Test..." : "Send Test Email to Admin"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB E: Data Backup & Restore */}
      {activeTab === "backup" && config.features?.backup_restore && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4" /> Data Portability & Disaster Recovery
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate isolated JSON snapshots of students, vouchers, expenses, courses, and batches.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-white">Full Institute JSON Backup</h4>
              <p className="text-[11px] text-slate-400">
                Exports all subcollections and local settings in standard format
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-teal-500/20 flex items-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" /> Export Backup
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-white">Restore from JSON Backup</h4>
              <p className="text-[11px] text-slate-400">
                Upload a previous backup file to restore records
              </p>
            </div>
            <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-2 cursor-pointer shrink-0">
              <Upload className="w-4 h-4" /> Restore File
              <input type="file" accept=".json" onChange={handleFileUploadRestore} className="hidden" />
            </label>
          </div>

          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/10 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Clear All Institute Data
              </h4>
              <p className="text-[11px] text-slate-400">
                Removes all student enrollments, fee receipts, and expenses. Safety confirmation required.
              </p>
            </div>
            <button
              onClick={() => setIsClearDataModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-950 shrink-0"
            >
              Clear All Data
            </button>
          </div>
        </div>
      )}

      {/* TAB F: Security & Password */}
      {activeTab === "password" && (
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Change Portal Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPass}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {updatingPass ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {isClearDataModalOpen && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setIsClearDataModalOpen(false)}
          onConfirm={async () => {
            await clearAllInstituteData();
            success("All institute records cleared.");
          }}
          title={`Wipe all data for ${config.name}?`}
          message="This will delete all students, payments, expenses, and counters for this institute. This cannot be undone."
          confirmText="Clear All Data"
          isDanger={true}
          requiredConfirmationText={config.name}
          confirmationPlaceholder="Type institute name"
        />
      )}

      {/* Delete University Confirmation Modal */}
      {selectedUnivForDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setSelectedUnivForDelete(null)}
          onConfirm={handleDeleteUniversityConfirmed}
          title={`Delete "${selectedUnivForDelete.name}"?`}
          message="Are you sure you want to remove this university? Existing payments referencing this university will retain their historical record."
          confirmText="Delete University"
          isDanger={true}
        />
      )}
    </div>
  );
};
