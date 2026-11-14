import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  auth,
  db,
  isFirebaseConfigured,
  SUPER_ADMIN_EMAIL,
} from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { InstituteConfig } from "../types";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  instituteId: string | null;
  activeInstituteId: string | null;
  instituteConfig: InstituteConfig | null;
  isSuspended: boolean;
  isImpersonating: boolean;
  impersonatedInstitute: InstituteConfig | null;
  allInstitutes: InstituteConfig[];
  myInstitutes: InstituteConfig[];
  selectedInstituteId: string | null;
  needsInstituteSelection: boolean;
  planUpgradeNotice: { show: boolean; blockedCount: number; message: string };
  setPlanUpgradeNotice: React.Dispatch<React.SetStateAction<{ show: boolean; blockedCount: number; message: string }>>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  startImpersonation: (instituteId: string) => void;
  stopImpersonation: () => void;
  selectInstitute: (instituteId: string) => void;
  switchInstitute: () => void;
  refreshInstitutes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allInstitutes, setAllInstitutes] = useState<InstituteConfig[]>([]);
  const [myInstitutes, setMyInstitutes] = useState<InstituteConfig[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [needsInstituteSelection, setNeedsInstituteSelection] = useState<boolean>(false);
  const [planUpgradeNotice, setPlanUpgradeNotice] = useState<{
    show: boolean;
    blockedCount: number;
    message: string;
  }>({ show: false, blockedCount: 0, message: "" });
  const [instituteId, setInstituteId] = useState<string | null>(null);
  const [instituteConfig, setInstituteConfig] = useState<InstituteConfig | null>(null);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [impersonatedInstituteId, setImpersonatedInstituteId] = useState<string | null>(null);

  const fetchInstitutes = useCallback(async (): Promise<InstituteConfig[]> => {
    if (!isFirebaseConfigured || !db) {
      setAllInstitutes([]);
      return [];
    }

    try {
      const snap = await getDocs(collection(db, "institutes"));
      const list: InstituteConfig[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (data?.config && data.config.institute_id) {
          list.push(data.config as InstituteConfig);
        } else if (data?.institute_id || data?.name) {
          list.push({ ...data, institute_id: data.institute_id || d.id } as InstituteConfig);
        }
      });

      setAllInstitutes(list);
      return list;
    } catch (err) {
      console.error("Error querying institutes from Firestore:", err);
      return [];
    }
  }, []);

  const resolveUserInstitute = useCallback(
    async (email: string | null, institutesList?: InstituteConfig[]) => {
      if (!email) {
        setInstituteId(null);
        setInstituteConfig(null);
        setIsSuspended(false);
        setMyInstitutes([]);
        setSelectedInstituteId(null);
        setNeedsInstituteSelection(false);
        return;
      }

      const list = institutesList || (await fetchInstitutes());
      const lowerEmail = email.toLowerCase().trim();

      // Super admin check
      if (lowerEmail === SUPER_ADMIN_EMAIL.toLowerCase().trim()) {
        setInstituteId(null);
        setInstituteConfig(null);
        setIsSuspended(false);
        setMyInstitutes([]);
        setSelectedInstituteId(null);
        setNeedsInstituteSelection(false);
        return;
      }

      const matched = list.filter(
        (inst) => inst.admin_email?.toLowerCase().trim() === lowerEmail
      );

      // Check plan limits:
      if (matched.length > 1) {
        // Multiple institutes found
        // Check if ALL are on Pro plan
        const allPro = matched.every(
          (inst) => inst.plan === "pro"
        );
        
        if (!allPro) {
          // Find non-pro institutes
          const nonProInstitutes = matched.filter(
            (inst) => inst.plan !== "pro"
          );
          
          // Only allow the first institute
          // Show upgrade notice for rest
          const firstInst = matched[0];
          setMyInstitutes([firstInst]);
          setInstituteId(firstInst.institute_id);
          setInstituteConfig(firstInst);
          setIsSuspended(
            firstInst.status === "suspended"
          );
          setNeedsInstituteSelection(false);
          
          // Store upgrade notice
          setPlanUpgradeNotice({
            show: true,
            blockedCount: matched.length - 1,
            message: `You have ${matched.length} institutes registered but ${nonProInstitutes.length} institute(s) are not on Pro plan. Upgrade to Pro to access all institutes.`
          });
          return;
        }
        
        // All Pro — show selector normally
        if (matched.length <= 5) {
          setMyInstitutes(matched);
          setNeedsInstituteSelection(true);
        } else {
          // More than 5 — take first 5 only
          setMyInstitutes(matched.slice(0, 5));
          setNeedsInstituteSelection(true);
        }
        
      } else if (matched.length === 1) {
        // Single institute — no plan check needed
        const inst = matched[0];
        setMyInstitutes([inst]);
        setInstituteId(inst.institute_id);
        setInstituteConfig(inst);
        setIsSuspended(inst.status === "suspended");
        setNeedsInstituteSelection(false);
      } else {
        setMyInstitutes([]);
        setSelectedInstituteId(null);
        setInstituteId(null);
        setInstituteConfig(null);
        setNeedsInstituteSelection(false);
        setIsSuspended(false);
      }
    },
    [fetchInstitutes]
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        };
        setUser(profile);
        const list = await fetchInstitutes();
        await resolveUserInstitute(fbUser.email, list);
      } else {
        setUser(null);
        setInstituteId(null);
        setInstituteConfig(null);
        setIsSuspended(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchInstitutes, resolveUserInstitute]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();

    if (!isFirebaseConfigured || !auth) {
      return { success: false, error: "Firebase Authentication is not configured." };
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const list = await fetchInstitutes();
      await resolveUserInstitute(userCred.user.email, list);
      return { success: true };
    } catch (err: any) {
      console.warn("Firebase Auth Error:", err?.code, err?.message);

      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        return { success: false, error: "Incorrect email or password." };
      }

      if (err.code === "auth/user-not-found") {
        return { success: false, error: "No account found with this email address." };
      }

      if (err.code === "auth/too-many-requests") {
        return {
          success: false,
          error: "Too many failed login attempts. Please try again later or reset your password.",
        };
      }

      if (err.code === "auth/user-disabled") {
        return {
          success: false,
          error: "This account has been disabled. Please contact system support.",
        };
      }

      if (err.code === "auth/operation-not-allowed" || err.code === "auth/admin-restricted-operation") {
        return {
          success: false,
          error: "Email/Password sign-in method is restricted in Firebase console. Please ensure Email/Password provider is enabled.",
        };
      }

      return {
        success: false,
        error: err.message || "Authentication failed. Please verify your credentials.",
      };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured || !auth) {
      return { success: false, error: "Firebase Authentication is not configured." };
    }

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const list = await fetchInstitutes();
      await resolveUserInstitute(cred.user.email, list);
      return { success: true };
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      return { success: false, error: err.message || "Google sign-in failed." };
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setInstituteId(null);
    setInstituteConfig(null);
    setIsSuspended(false);
    setImpersonatedInstituteId(null);
    setMyInstitutes([]);
    setSelectedInstituteId(null);
    setNeedsInstituteSelection(false);
    setPlanUpgradeNotice({ show: false, blockedCount: 0, message: "" });
  };

  const selectInstitute = (instId: string) => {
    const found = myInstitutes.find((i) => i.institute_id === instId);
    if (found) {
      setSelectedInstituteId(found.institute_id);
      setInstituteId(found.institute_id);
      setInstituteConfig(found);
      setNeedsInstituteSelection(false);
      setIsSuspended(found.status === "suspended");
    }
  };

  const switchInstitute = () => {
    if (myInstitutes.length > 1) {
      setSelectedInstituteId(null);
      setInstituteId(null);
      setInstituteConfig(null);
      setNeedsInstituteSelection(true);
    }
  };

  const sendResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured || !auth) {
      return { success: false, error: "Firebase Authentication is not configured." };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send reset email." };
    }
  };

  const startImpersonation = (targetId: string) => {
    setImpersonatedInstituteId(targetId);
  };

  const stopImpersonation = () => {
    setImpersonatedInstituteId(null);
  };

  const isSuperAdmin = Boolean(
    user?.email && user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase().trim()
  );

  const impersonatedInstitute = impersonatedInstituteId
    ? allInstitutes.find((i) => i.institute_id === impersonatedInstituteId) || null
    : null;

  const activeInstituteId = isSuperAdmin && impersonatedInstituteId
    ? impersonatedInstituteId
    : instituteId;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSuperAdmin,
        instituteId,
        activeInstituteId,
        instituteConfig: isSuperAdmin && impersonatedInstitute ? impersonatedInstitute : instituteConfig,
        isSuspended,
        isImpersonating: Boolean(isSuperAdmin && impersonatedInstituteId),
        impersonatedInstitute,
        allInstitutes,
        myInstitutes,
        selectedInstituteId,
        needsInstituteSelection,
        planUpgradeNotice,
        setPlanUpgradeNotice,
        login,
        loginWithGoogle,
        logout,
        sendResetEmail,
        startImpersonation,
        stopImpersonation,
        selectInstitute,
        switchInstitute,
        refreshInstitutes: async () => {
          await fetchInstitutes();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
