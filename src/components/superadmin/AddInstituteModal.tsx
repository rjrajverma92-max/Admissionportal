import React, { useState } from "react";
import { X, Building2, Shield, KeyRound, Check, Sparkles } from "lucide-react";
import { InstituteConfig, InstituteFeatures } from "../../types";
import { isValidEmail, isValidRegPrefix } from "../../utils/validators";
import { useToast } from "../shared/Toast";
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

  const [name, setName] = useState("");
  const [regPrefix, setRegPrefix] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [plan, setPlan] = useState<"basic" | "standard" | "pro">("standard");
  const [submitting, setSubmitting] = useState(false);

  const [features, setFeatures] = useState<InstituteFeatures>({
    finance_module: true,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: true,
    backup_restore: true,
  });

  if (!isOpen) return null;

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setRegPrefix(val);
  };

  const toggleFeature = (key: keyof InstituteFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setSubmitting(true);
    const instituteId = `inst_${regPrefix.toLowerCase()}_${Date.now().toString(36)}`;
    const today = new Date().toISOString().split("T")[0];

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
      created_date: today,
      features,
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Subscription Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="basic">Basic Plan</option>
                <option value="standard">Standard Plan</option>
                <option value="pro">Pro Plan</option>
              </select>
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

          {/* Feature toggles */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Enabled Features & Modules
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              {[
                { id: "finance_module", label: "Finance & P&L" },
                { id: "fee_reminders", label: "Fee Reminders" },
                { id: "birthday_greetings", label: "Birthday Greetings" },
                { id: "certificate_verify", label: "Certificate Verify" },
                { id: "import_leads", label: "Import CSV Leads" },
                { id: "backup_restore", label: "Backup & Restore" },
              ].map(({ id, label }) => {
                const active = features[id as keyof InstituteFeatures];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFeature(id as keyof InstituteFeatures)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition ${
                      active
                        ? "bg-teal-500/10 border-teal-500/40 text-teal-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        active
                          ? "bg-teal-500 border-teal-400 text-slate-950"
                          : "border-slate-700 bg-slate-950"
                      }`}
                    >
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
