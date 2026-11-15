import React, { useState } from "react";
import { X, Building2, Shield, KeyRound, Check, Sparkles, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { InstituteConfig, InstituteFeatures, PLAN_PRICING, DURATION_DAYS } from "../../types";
import { isValidEmail, isValidRegPrefix } from "../../utils/validators";
import { useToast } from "../shared/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { getPlanFeatures, FEATURE_LABELS, PlanType } from "../../utils/planFeatures";
import {
  auth,
  db,
  isFirebaseConfigured,
  createInstituteAuthUser,
  cleanFirestoreData,
  handleFirestoreError,
  OperationType,
} from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface AddInstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddInstituteModal: React.FC<AddInstituteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error, info } = useToast();
  const { user, allInstitutes } = useAuth();

  const [name, setName] = useState("");
  const [regPrefix, setRegPrefix] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [plan, setPlan] = useState<PlanType>("trial");
  const [duration, setDuration] = useState<"trial" | "monthly" | "quarterly" | "half-yearly" | "annual">("trial");
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [features, setFeatures] = useState<InstituteFeatures>(getPlanFeatures("trial"));

  if (!isOpen) return null;

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setRegPrefix(val);
  };

  const handlePlanChange = (newPlan: PlanType) => {
    setPlan(newPlan);
    setFeatures(getPlanFeatures(newPlan));
    if (newPlan === "trial") {
      setDuration("trial");
    } else if (duration === "trial") {
      setDuration("monthly");
    }
  };

  const validateEmailPlanLimit = async (
    email: string,
    newPlan: string
  ): Promise<{ allowed: boolean; error?: string }> => {
    const existingForEmail = allInstitutes.filter(
      (inst) => inst.admin_email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (existingForEmail.length === 0) {
      return { allowed: true };
    }

    if (newPlan !== "pro") {
      return {
        allowed: false,
        error: `This email (${email}) is already assigned to "${existingForEmail[0].name}". Multiple institutes require Pro plan. Please use a different email or upgrade to Pro plan.`,
      };
    }

    const nonProExisting = existingForEmail.filter(
      (inst) => inst.plan !== "pro"
    );

    if (nonProExisting.length > 0) {
      return {
        allowed: false,
        error: `This email already has institutes that are NOT on Pro plan: ${nonProExisting.map((i) => i.name).join(", ")}. Upgrade those institutes to Pro first before adding more institutes to this email.`,
      };
    }

    if (existingForEmail.length >= 5) {
      return {
        allowed: false,
        error: `This email already has ${existingForEmail.length} institutes (maximum 5 allowed on Pro plan). Cannot add more institutes to this email.`,
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
    if (!isValidRegPrefix(regPrefix)) {
      error("Registration prefix must be 2-6 uppercase alphanumeric characters (e.g. MAAC, IIT)");
      return;
    }
    if (!isValidEmail(adminEmail)) {
      error("Please enter a valid administrator email address");
      return;
    }
    if (password.length < 6) {
      error("Temporary password must be at least 6 characters long");
      return;
    }

    const planCheck = await validateEmailPlanLimit(adminEmail, plan);
    if (!planCheck.allowed) {
      setErrorBanner(planCheck.error || "Plan limit exceeded");
      return;
    }

    setSubmitting(true);
    const instituteId = `inst_${regPrefix.toLowerCase()}_${Date.now().toString(36)}`;
    const startDateObj = new Date();
    const startDateStr = startDateObj.toISOString().split("T")[0];
    const days = DURATION_DAYS[duration] || 30;
    const endDateObj = new Date(startDateObj.getTime() + days * 24 * 60 * 60 * 1000);
    const endDateStr = endDateObj.toISOString().split("T")[0];
    const amount = (PLAN_PRICING as any)[plan]?.[duration] || 0;

    const newConfig: InstituteConfig = {
      institute_id: instituteId,
      name: name.trim(),
      reg_prefix: regPrefix.trim(),
      email: adminEmail.trim(),
      phone: phone.trim(),
      city: city.trim(),
      address: address.trim(),
      logo_url: logoUrl.trim() || "",
      admin_email: adminEmail.trim(),
      admin_password: password.trim(),
      status: "active",
      plan,
      created_date: startDateStr,
      subscription_start_date: startDateStr,
      subscription_end_date: endDateStr,
      subscription_duration: duration,
      subscription_expired: false,
      features,
      ...(plan === "trial" ? {
        trial_start_date: startDateStr,
        trial_end_date: endDateStr,
        trial_expired: false,
      } : {}),
    };

    try {
      let authNotice = "";
      if (isFirebaseConfigured && auth) {
        // Attempt creating auth user via secondary app instance so superadmin isn't signed out
        const authRes = await createInstituteAuthUser(adminEmail.trim(), password);
        if (!authRes.success) {
          authNotice = authRes.error || "Email/Password sign-in method is restricted in Firebase console.";
        }
      }

      if (isFirebaseConfigured && db) {
        try {
          // Create institute document with sanitized config in Firestore
          await setDoc(doc(db, "institutes", instituteId), {
            config: cleanFirestoreData(newConfig),
            created_timestamp: serverTimestamp(),
          });

          if (amount > 0) {
            const paymentId = `subpay_${Date.now().toString(36)}`;
            await setDoc(doc(db, "subscription_payments", paymentId), cleanFirestoreData({
              id: paymentId,
              institute_id: instituteId,
              institute_name: name.trim(),
              amount,
              payment_mode: "Cash",
              payment_date: startDateStr,
              duration,
              duration_days: days,
              plan,
              previous_end_date: startDateStr,
              new_end_date: endDateStr,
              note: "Initial subscription payment on creation",
              recorded_by: user?.email || "superadmin",
              created_timestamp: serverTimestamp(),
            }));
          }

          // Initialize default course and batch in Firestore
          await setDoc(doc(db, "institutes", instituteId, "courses", "c_default"), {
            id: "c_default",
            name: "Diploma Course",
            active: true,
            fees: 50000,
            duration_months: 12,
          });

          await setDoc(doc(db, "institutes", instituteId, "batches", "b_default"), {
            id: "b_default",
            name: "Regular Batch",
            active: true,
          });
        } catch (firestoreErr: any) {
          handleFirestoreError(firestoreErr, OperationType.CREATE, `institutes/${instituteId}`);
          throw firestoreErr;
        }
      }

      if (authNotice) {
        success(`Institute "${name}" registered! (${authNotice})`);
      } else {
        success(`Institute "${name}" registered successfully with ID: ${instituteId}!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Create institute failed:", err);
      error(err.message || "Failed to create institute");
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
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Add New Institute</h2>
            <p className="text-xs text-slate-400">
              Provision an isolated tenant environment and administrator account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Institute Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MAAC Raipur"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Registration Prefix * (2-6 chars)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={regPrefix}
                  onChange={handlePrefixChange}
                  placeholder="e.g. MAAC"
                  className="w-full uppercase font-mono bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-teal-300 placeholder-slate-500 focus:outline-none transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                  {regPrefix ? `${regPrefix}-2026-27-0001` : "Preview"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Admin Email * (Login Account)
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@institute.edu"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Temporary Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial password"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9826190001"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
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
                placeholder="e.g. Raipur"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Subscription Plan *
              </label>
              <select
                value={plan}
                onChange={(e) => handlePlanChange(e.target.value as PlanType)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="trial">🎯 Trial (Free)</option>
                <option value="standard">Standard — ₹499/month</option>
                <option value="pro">Pro — ₹999/month</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Subscription Duration *
              </label>
              {plan === "trial" ? (
                <input
                  type="text"
                  disabled
                  value="15 Days Free (Trial)"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-teal-400 font-medium cursor-not-allowed"
                />
              ) : (
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
                >
                  <option value="monthly">1 Month (₹{PLAN_PRICING[plan].monthly})</option>
                  <option value="quarterly">3 Months — Quarterly (₹{PLAN_PRICING[plan].quarterly})</option>
                  <option value="half-yearly">6 Months — Half-Yearly (₹{PLAN_PRICING[plan]["half-yearly"]})</option>
                  <option value="annual">1 Year — Annual (₹{PLAN_PRICING[plan].annual}) ⭐ Recommended</option>
                </select>
              )}
            </div>
          </div>

          {/* Auto-calculated info box */}
          {(() => {
            const startDate = new Date();
            const days = DURATION_DAYS[duration] || 30;
            const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
            const price = (PLAN_PRICING as any)[plan]?.[duration] || 0;
            return (
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Start Date:</span>
                  <span className="text-white font-mono">{startDate.toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-400">End Date:</span>
                  <span className="text-amber-400 font-medium font-mono">{endDate.toLocaleDateString("en-IN")} ({days} days)</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-teal-400 font-bold text-sm">
                    {price === 0 ? "FREE (Trial)" : `₹${price.toLocaleString()}`}
                  </span>
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Campus Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 3rd Floor, Magneto Offizo, Labhandi, GE Road"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Logo URL (Optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
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
              {submitting ? "Creating Institute..." : "Provision Institute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
