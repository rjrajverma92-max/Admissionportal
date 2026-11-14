import React, { useState, useEffect } from "react";
import { db, isFirebaseConfigured } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";
import { ReleaseNote } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
  Calendar,
  AlertCircle,
} from "lucide-react";

export const ReleaseNotesManager: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ReleaseNote | null>(null);

  const [version, setVersion] = useState("v1.0");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [howToUse, setHowToUse] = useState("");
  const [benefit, setBenefit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchNotes = async () => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, "release_notes"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      const list: ReleaseNote[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ReleaseNote);
      });
      setNotes(list);
    } catch (err) {
      console.error("Error fetching release notes:", err);
      // Fallback without ordering if index is missing
      try {
        const snap = await getDocs(collection(db, "release_notes"));
        const list: ReleaseNote[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ReleaseNote);
        });
        setNotes(list);
      } catch (e2) {
        console.error("Fallback fetch error:", e2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleOpenAdd = () => {
    setEditingNote(null);
    setVersion("v1.3");
    setTitle("");
    setDescription("");
    setHowToUse("");
    setBenefit("");
    setIsActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: ReleaseNote) => {
    setEditingNote(note);
    setVersion(note.version || "v1.0");
    setTitle(note.title || "");
    setDescription(note.description || "");
    setHowToUse(note.how_to_use || "");
    setBenefit(note.benefit || "");
    setIsActive(note.is_active ?? true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !howToUse.trim() || !benefit.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!isFirebaseConfigured || !db) {
      setErrorMsg("Firebase is not configured.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      if (editingNote) {
        await updateDoc(doc(db, "release_notes", editingNote.id), {
          version,
          title,
          description,
          how_to_use: howToUse,
          benefit,
          is_active: isActive,
        });
      } else {
        await addDoc(collection(db, "release_notes"), {
          version,
          title,
          description,
          how_to_use: howToUse,
          benefit,
          is_active: isActive,
          created_at: serverTimestamp(),
          created_by: user?.email || "admin",
        });
      }
      setIsModalOpen(false);
      await fetchNotes();
    } catch (err: any) {
      console.error("Error saving release note:", err);
      setErrorMsg(err.message || "Failed to save release note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (note: ReleaseNote) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, "release_notes", note.id), {
        is_active: !note.is_active,
      });
      await fetchNotes();
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this release note?")) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, "release_notes", id));
      await fetchNotes();
    } catch (err) {
      console.error("Error deleting release note:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-400" />
            <span>Release Notes & What's New</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Publish feature updates and notifications for institute owners across the portal.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Release Note</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading release notes...</div>
      ) : notes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-semibold text-sm">No release notes published yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Click "Add Release Note" above to announce updates, new features, or bug fixes to all institute administrators.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition ${
                note.is_active ? "border-slate-800" : "border-slate-800/50 opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-1 rounded-full font-bold">
                    {note.version}
                  </span>
                  <h3 className="text-white font-bold text-base">{note.title}</h3>
                  <button
                    onClick={() => handleToggleActive(note)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
                      note.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    {note.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{note.is_active ? "Active" : "Inactive"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(note)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 text-xs font-medium transition flex items-center gap-1 border border-slate-700 hover:border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed mb-4">{note.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <p className="font-semibold text-emerald-400 mb-1">✅ Benefit</p>
                  <p className="text-slate-300">{note.benefit}</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="font-semibold text-blue-400 mb-1">📖 How to Use</p>
                  <p className="text-slate-300 whitespace-pre-line">{note.how_to_use}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingNote ? "Edit Release Note" : "Publish Release Note"}
                </h3>
                <p className="text-xs text-slate-400">Broadcast updates to all institute owners</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. v1.3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <div className="flex items-center h-9">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                      <span className="ml-2 text-xs font-medium text-slate-300">
                        {isActive ? "Active (Show to users)" : "Inactive (Hidden)"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title (Required)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. University Fee Tracking Added"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Required)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What was added or changed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Benefit (Required)</label>
                <textarea
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  rows={2}
                  placeholder="Why this helps the institute..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">How to Use (Required)</label>
                <textarea
                  value={howToUse}
                  onChange={(e) => setHowToUse(e.target.value)}
                  rows={3}
                  placeholder="Step by step usage instructions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingNote ? "Update Note" : "Publish Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
