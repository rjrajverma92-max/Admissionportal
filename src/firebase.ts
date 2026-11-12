import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const SUPER_ADMIN_EMAIL =
  import.meta.env.VITE_SUPER_ADMIN_EMAIL || "rjrajverma92@gmail.com";

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("✅ Firebase initialized:", firebaseConfig.projectId);
  } catch (err) {
    console.error("❌ Firebase initialization failed:", err);
  }
}

export { app, db, auth, firebaseConfig };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Operation Notice:", JSON.stringify(errInfo));
  return errInfo;
}

// ─── Utility ────────────────────────────────────────────────
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (typeof (obj as any).toMillis === "function") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" ? cleanFirestoreData(item) : item
    ) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] =
        val !== null && typeof val === "object"
          ? cleanFirestoreData(val)
          : val;
    }
  }
  return cleaned as T;
}

// ─── Create Firebase Auth User for new institute ─────────────
export async function createInstituteAuthUser(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  if (!isFirebaseConfigured || !app) {
    return {
      success: false,
      error: "Firebase not configured. Please add credentials.",
    };
  }

  let secondaryApp: FirebaseApp | null = null;
  try {
    const tempName = `SecondaryAuth_${Date.now()}`;
    secondaryApp = initializeApp(firebaseConfig, tempName);
    const secondaryAuth = getAuth(secondaryApp);
    await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    try {
      await sendPasswordResetEmail(secondaryAuth, email);
    } catch {
      // password reset email optional — ignore error
    }
    return { success: true };
  } catch (err: any) {
    if (err.code === "auth/email-already-in-use") {
      // User already exists — treat as success
      return { success: true };
    }
    return {
      success: false,
      error: err.message || "Failed to create user",
      code: err.code,
    };
  } finally {
    if (secondaryApp) {
      try { await deleteApp(secondaryApp); } catch { /* ignore */ }
    }
  }
}

// ─── Delete Institute — Firebase only, no demo fallback ──────
export async function deleteEntireInstitute(
  instituteId: string,
  _instituteName?: string
): Promise<{ success: boolean; firestoreDeleted: boolean; error?: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      success: false,
      firestoreDeleted: false,
      error: "Firebase not configured.",
    };
  }

  try {
    // 1. Delete all subcollections first
    const subcollections = [
      "students",
      "payments",
      "expenses",
      "courses",
      "batches",
      "counters",
      "leads",
      "universities",
    ];

    for (const sub of subcollections) {
      try {
        const snap = await getDocs(
          collection(db, "institutes", instituteId, sub)
        );
        if (!snap.empty) {
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        }
      } catch (subErr) {
        console.warn(`Subcollection ${sub} delete notice:`, subErr);
      }
    }

    // 2. Delete the main institute document
    await deleteDoc(doc(db, "institutes", instituteId));

    return { success: true, firestoreDeleted: true };
  } catch (err: any) {
    console.error("Delete institute error:", err);
    return {
      success: false,
      firestoreDeleted: false,
      error: err.message || "Delete failed",
    };
  }
}
