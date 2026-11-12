import React, { useState, useEffect } from "react";
import { X, Building2, Check, Shield } from "lucide-react";
import { InstituteConfig, InstituteFeatures } from "../../types";
import { useToast } from "../shared/Toast";
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [plan, setPlan] = useState<"basic" | "standard" | "pro">("standard");
  const [status, setStatus] = useState<"active" | "suspended" | "trial">("active");
  const [features, setFeatures] = useState<InstituteFeatures>({
    finance_module: true,
    fee_reminders: true,
    birthday_greetings: true,
    certificate_verify: true,
    import_leads: true,
    backup_restore: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (institute) {
      setName(institute.name || "");
      setPhone(institute.phone || "");
      setCity(institute.city || "");
      setAddress(institute.address || "");
      setLogoUrl(institute.logo_url || "");
      setPlan(institute.plan || "standard");
      setStatus(institute.status || "active");
      setFeatures({
        finance_module: Boolean(institute.features?.finance_module),
        fee_reminders: Boolean(institute.features?.fee_reminders),
        birthday_greetings: Boolean(institute.features?.birthday_greetings),
        certificate_verify: Boolean(institute.features?.certificate_verify),
        import_leads: Boolean(institute.features?.import_leads),
        backup_restore: Boolean(institute.features?.backup_restore),
      });
    }
  }, [institute]);

  if (!isOpen || !institute) return null;

  const toggleFeature = (key: keyof InstituteFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error("Institute name is required");
      return;
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
      features,
    };

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
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition"
              >
                <option value="basic">Basic Plan</option>
                <option value="standard">Standard Plan</option>
                <option value="pro">Pro Plan</option>
              </select>
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

          {/* Module Toggles */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Features Configuration
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
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
