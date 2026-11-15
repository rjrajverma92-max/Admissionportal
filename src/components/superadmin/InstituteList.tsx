import React, { useState } from "react";
import { InstituteConfig } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../shared/Toast";
import { ConfirmModal } from "../shared/ConfirmModal";
import {
  Building2,
  Search,
  Plus,
  Eye,
  Edit2,
  Ban,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";
import { formatDate } from "../../utils/formatters";
import { db, isFirebaseConfigured, deleteEntireInstitute } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";

interface InstituteListProps {
  institutes: InstituteConfig[];
  onOpenAddModal: () => void;
  onOpenEditModal: (institute: InstituteConfig) => void;
  onRefresh: () => void;
}

export const InstituteList: React.FC<InstituteListProps> = ({
  institutes,
  onOpenAddModal,
  onOpenEditModal,
  onRefresh,
}) => {
  const { startImpersonation } = useAuth();
  const { success, error, info } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const [selectedInstForDelete, setSelectedInstForDelete] = useState<InstituteConfig | null>(null);
  const [selectedInstForToggle, setSelectedInstForToggle] = useState<InstituteConfig | null>(null);

  const filtered = (institutes || []).filter((inst) => {
    if (!inst) return false;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (inst.name || "").toLowerCase().includes(term) ||
      (inst.city || "").toLowerCase().includes(term) ||
      (inst.reg_prefix || "").toLowerCase().includes(term) ||
      (inst.admin_email || "").toLowerCase().includes(term);

    const matchesStatus = statusFilter === "all" || inst.status === statusFilter;
    const matchesPlan = planFilter === "all" || inst.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleToggleStatus = async () => {
    if (!selectedInstForToggle) return;
    const newStatus = selectedInstForToggle.status === "active" ? "suspended" : "active";

    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "institutes", selectedInstForToggle.institute_id), {
          "config.status": newStatus,
        });
      }

      success(
        `Institute "${selectedInstForToggle.name}" has been ${
          newStatus === "active" ? "activated" : "suspended"
        }!`
      );
      onRefresh();
    } catch (err: any) {
      error(err.message || "Failed to update status");
    } finally {
      setSelectedInstForToggle(null);
    }
  };

  const handleDeleteInstitute = async () => {
    if (!selectedInstForDelete) return;
    const instName = selectedInstForDelete.name;
    const instId = selectedInstForDelete.institute_id;

    try {
      const res = await deleteEntireInstitute(instId, instName);
      if (res.firestoreDeleted) {
        success(`Institute "${instName}" and all associated data permanently deleted from database and portal.`);
      } else if (res.error) {
        info(`Institute "${instName}" removed from portal. Firebase Notice: ${res.error}`);
      } else {
        success(`Institute "${instName}" deleted.`);
      }
      onRefresh();
    } catch (err: any) {
      error(err.message || "Failed to delete institute");
    } finally {
      setSelectedInstForDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search institutes by name, city, prefix, or admin email..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="trial">Trial Only</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Plans</option>
            <option value="trial">Trial Only</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
          </select>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-teal-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Institute
          </button>
        </div>
      </div>

      {/* Institutes Table / Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Institute & Prefix</th>
                <th className="py-3.5 px-4">City & Contact</th>
                <th className="py-3.5 px-4">Admin Account</th>
                <th className="py-3.5 px-4">Plan & Duration</th>
                <th className="py-3.5 px-4">Expiry / Days Left</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No institutes matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((inst) => {
                  const statusColors = {
                    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    suspended: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                    trial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  }[inst.status];

                  const planBadges = {
                    pro: "bg-teal-500/10 text-teal-300 border-teal-500/30 font-semibold",
                    standard: "bg-blue-500/10 text-blue-300 border-blue-500/30 font-semibold",
                    trial: "bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold",
                    basic: "bg-slate-800 text-slate-400 border-slate-700",
                  }[inst.plan as string];

                  return (
                    <tr
                      key={inst.institute_id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {inst.logo_url ? (
                            <img
                              src={inst.logo_url}
                              alt={inst.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">
                              {inst.reg_prefix.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white group-hover:text-teal-300 transition text-sm">
                              {inst.name}
                            </div>
                            <div className="text-[11px] font-mono text-teal-400">
                              Prefix: {inst.reg_prefix}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{inst.city || "Unspecified"}</span>
                        </div>
                        {inst.phone && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{inst.phone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{inst.admin_email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] uppercase tracking-wider text-teal-300 font-semibold">
                          {inst.plan} {inst.subscription_duration ? `• ${inst.subscription_duration}` : ""}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {(() => {
                          const endStr = inst.subscription_end_date || inst.trial_end_date;
                          if (!endStr) return <span className="text-slate-500">-</span>;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const end = new Date(endStr);
                          end.setHours(0, 0, 0, 0);
                          const diff = end.getTime() - today.getTime();
                          const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                          const isExpired = daysLeft <= 0 || inst.subscription_expired || inst.trial_expired;

                          let badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          let text = `${daysLeft} days left`;
                          if (isExpired) {
                            badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            text = "EXPIRED ❌";
                          } else if (daysLeft < 7) {
                            badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            text = `${daysLeft} days left 🔴`;
                          } else if (daysLeft <= 30) {
                            badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                            text = `${daysLeft} days left ⚠️`;
                          }

                          return (
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeClass}`}>
                                {text}
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatDate(endStr)}</div>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusColors}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              inst.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          {inst.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDate(inst.created_date)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Portal (Impersonate) */}
                          <button
                            title="View Portal (Impersonate)"
                            onClick={() => startImpersonation(inst.institute_id)}
                            className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px] font-medium">View</span>
                          </button>

                          {/* Edit Settings */}
                          <button
                            title="Edit Institute Settings"
                            onClick={() => onOpenEditModal(inst)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            title={inst.status === "active" ? "Suspend Institute" : "Activate Institute"}
                            onClick={() => setSelectedInstForToggle(inst)}
                            className={`p-1.5 rounded-lg border transition ${
                              inst.status === "active"
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {inst.status === "active" ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            title="Delete Institute"
                            onClick={() => setSelectedInstForDelete(inst)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
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

      {/* Suspend / Activate Confirmation Modal */}
      {selectedInstForToggle && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setSelectedInstForToggle(null)}
          onConfirm={handleToggleStatus}
          title={
            selectedInstForToggle.status === "active"
              ? `Suspend "${selectedInstForToggle.name}"?`
              : `Activate "${selectedInstForToggle.name}"?`
          }
          message={
            selectedInstForToggle.status === "active"
              ? "Suspending will instantly block the institute admin from logging in and halt all student registry operations. You can reactivate at any time."
              : "Activating will restore full portal access for the institute administrator."
          }
          confirmText={selectedInstForToggle.status === "active" ? "Suspend Institute" : "Activate"}
          isDanger={selectedInstForToggle.status === "active"}
        />
      )}

      {/* Delete Confirmation Modal */}
      {selectedInstForDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setSelectedInstForDelete(null)}
          onConfirm={handleDeleteInstitute}
          title={`Delete Institute "${selectedInstForDelete.name}"?`}
          message="Warning: This will permanently delete the institute record. Data cannot be recovered."
          confirmText="Permanently Delete"
          isDanger={true}
          requiredConfirmationText={selectedInstForDelete.name}
          confirmationPlaceholder="Type institute name"
        />
      )}
    </div>
  );
};
