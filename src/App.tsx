import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { InstituteProvider } from "./contexts/InstituteContext";
import { ToastProvider } from "./components/shared/Toast";
import { LoginView } from "./components/LoginView";
import { SuspendedView } from "./components/SuspendedView";
import { UnauthorizedView } from "./components/UnauthorizedView";
import { SuperAdminLayout } from "./components/superadmin/SuperAdminLayout";
import { InstituteLayout } from "./components/institute/InstituteLayout";
import { PublicVerify } from "./components/institute/PublicVerify";
import { InstituteSelector } from "./components/institute/InstituteSelector";
import { FullPageLoader } from "./components/shared/Loader";

try {
  localStorage.removeItem("multi_institute_portal_demo_data_v1");
} catch {
  // ignore storage errors
}

const AppContent: React.FC = () => {
  const {
    user,
    loading,
    isSuperAdmin,
    instituteId,
    activeInstituteId,
    isSuspended,
    isImpersonating,
    needsInstituteSelection,
  } = useAuth();

  const [isPublicVerifyRoute, setIsPublicVerifyRoute] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get("verify") === "1";
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsPublicVerifyRoute(new URLSearchParams(window.location.search).get("verify") === "1");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openVerifyRoute = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("verify", "1");
    window.history.pushState({}, "", url.toString());
    setIsPublicVerifyRoute(true);
  };

  const closeVerifyRoute = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("verify");
    window.history.pushState({}, "", url.toString());
    setIsPublicVerifyRoute(false);
  };

  // 1. Public Certificate Verification route (?verify=1)
  if (isPublicVerifyRoute) {
    return <PublicVerify onBackToLogin={closeVerifyRoute} />;
  }

  // 2. Auth Loading screen
  if (loading) {
    return <FullPageLoader message="Verifying authentication credentials..." />;
  }

  // 3. Not logged in -> Show unified Login Screen
  if (!user) {
    return <LoginView onOpenVerify={openVerifyRoute} />;
  }

  // Multi-institute selection if owner has multiple institutes
  if (needsInstituteSelection) {
    return <InstituteSelector />;
  }

  // 4. Super Admin logged in (and not currently impersonating an institute)
  if (isSuperAdmin && !isImpersonating) {
    return <SuperAdminLayout />;
  }

  // 5. Impersonating an institute or logged in as an Institute Admin
  if (activeInstituteId) {
    // If the institute is suspended (and not in Super Admin impersonation mode)
    if (isSuspended && !isImpersonating) {
      return <SuspendedView />;
    }

    // Active institute -> Render Institute Portal
    return (
      <InstituteProvider>
        <InstituteLayout />
      </InstituteProvider>
    );
  }

  // 6. User authenticated, but not mapped to Super Admin or any institute
  return <UnauthorizedView />;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
