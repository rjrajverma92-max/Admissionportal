import React, { useState, useEffect } from "react";
import { X, Building2, Check, Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { InstituteConfig, InstituteFeatures } from "../../types";
import { useToast } from "../shared/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { getPlanFeatures, FEATURE_LABELS, PlanType } from "../../utils/planFeatures";
import {
  db,
  isFirebaseConfigured,
  cleanFirestoreData,
} from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";

interface EditInstituteModalProps {
  isOpen: boolean;
  institute: InstituteConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditInstituteModal: React.FC<EditInstituteModalProps> = ({
  isOpen,
  institute,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const { allInstitutes } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [plan, setPlan] = useState<PlanType>("standard");
  const [status, setStatus] = useState<"active" | "suspended" | "trial">("active");
  const [features, setFeatures] = useState<InstituteFeatures>(getPlanFeatures("standard"));
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (institute) {
      setName(institute.name || "");
      setPhone(institute.phone || "");
      setCity(institute.city || "");
      setAddress(institute.address || "");
      setLogoUrl(institute.logo_url || "");
      const instPlan = (institute.plan === "pro" ? "pro" : institute.plan === "trial" ? "trial" : "standard") as PlanType;
      setPlan(instPlan);
      setStatus(institute.status || "active");
      setFeatures(getPlanFeatures(instPlan));
    }
  }, [institute]);

  const handlePlanChange = (newPlan: PlanType) => {
    setPlan(newPlan);
    setFeatures(getPlanFeatures(newPlan));
  };

  if (!isOpen || !institute) return null;

  const toggleFeature = (key: keyof InstituteFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validatePlanDowngrade = (
    instituteId: string,
    newPlan: string
  ): { allowed: boolean; error?: string } => {
    const currentInst = allInstitutes.find(
      (i) => i.institute_id === instituteId
    );
    if (!currentInst) return { allowed: true };

    const othersWithSameEmail = allInstitutes.filter(
      (inst) =>
        inst.admin_email?.toLowerCase().trim() === currentInst.admin_email?.toLowerCase().trim() &&
        inst.institute_id !== instituteId
    );

    if (othersWithSameEmail.length === 0) {
      return { allowed: true };
    }

    if (newPlan !== "pro") {
      return {
        allowed: false,
        error: `Cannot downgrade to ${newPlan}. This email is shared with ${othersWithSameEmail.length} other institute(s): ${othersWithSameEmail.map((i) => i.name).join(", ")}. Multi-institute access requires Pro plan on ALL institutes. Remove other institutes first or keep Pro plan.`,
      };
    }

    return { allowed: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!name.trim()) {
      error("Institute name is required");
      return;
    }

    if (plan !== institute.plan) {
      const downgradeCheck = validatePlanDowngrade(institute.institute_id, plan);
      if (!downgradeCheck.allowed) {
        setErrorBanner(downgradeCheck.error || "Downgrade not allowed");
        return;
      }
    }

    setSubmitting(true);
    const updatedConfig: Partial<InstituteConfig> = {
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      logo_url: logoUrl.trim() || "",
      plan,
      status,
      features: getPlanFeatures(plan),
    };

    if (institute.plan === "trial" && plan !== "trial") {
      updatedConfig.status = "active";
      updatedConfig.trial_expired = false;
    }

    try {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "institutes", institute.institute_id), {
          config: cleanFirestoreData({ ...institute, ...updatedConfig }),
        });
      }

      success(`Settings updated for "${name}"!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || "Failed to update institute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Edit Institute Settings</h2>
            <p className="text-xs text-slate-400">
              Tenant ID: <span className="font-mono text-teal-300">{institute.institute_id}</span> | Admin:{" "}
              <span className="font-mono text-slate-300">{institute.admin_email}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Institute Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Registration Prefix (Immutable)
              </label>
              <input
                type="text"
                disabled
                value={institute.reg_prefix}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="active">Active (Full Access)</option>
                <option value="suspended">Suspended (Locked)</option>
                <option value="trial">Trial Period</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Subscription Plan
              </label>
              <select
                value={plan}
                onChange={(e) => handlePlanChange(e.target.value as PlanType)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="trial">Trial (15 Days Free)</option>
                <option value="standard">Standard — ₹499/month</option>
                <option value="pro">Pro — ₹999/month</option>
              </select>
            </div>
          </div>

          {institute.plan === "trial" && plan !== "trial" && (
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 text-xs text-teal-300">
              ⬆️ Upgrading from Trial to {plan.toUpperCase()}. Institute access will be restored immediately.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Campus Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
            />
          </div>

          {/* Features Preview Box */}
          {plan && (
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Features included in {plan} plan:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(getPlanFeatures(plan)).map(([key, enabled]) => (
                  <div key={key} className="flex items-center gap-2">
                    {enabled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className={`text-xs ${enabled ? "text-slate-200" : "text-slate-500"}`}>
                      {FEATURE_LABELS[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{errorBanner}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
