import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./shared/Toast";
import {
  Lock,
  Mail,
  ArrowRight,
  Building2,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

interface LoginViewProps {
  onOpenVerify: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenVerify }) => {
  const { login, loginWithGoogle, sendResetEmail } = useAuth();
  const { success, error, info } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      success("Logged in successfully!");
    } else {
      error(res.error || "Login failed");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (res.success) {
      success("Signed in with Google successfully!");
    } else {
      error(res.error || "Google Sign-In failed.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      error("Please enter your account email.");
      return;
    }
    setResetSubmitting(true);
    const res = await sendResetEmail(resetEmail);
    setResetSubmitting(false);

    if (res.success) {
      success("Password reset link sent to your email!");
      setShowForgotPassword(false);
    } else {
      error(res.error || "Failed to send reset link.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/10 border border-teal-500/30 text-teal-400 shadow-xl shadow-teal-500/10 mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Admission & Fees Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Multi-Institute Enterprise Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-7 shadow-2xl backdrop-blur-xl">
          {!showForgotPassword ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 rounded-xl shadow transition disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {googleLoading ? "Signing in..." : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Or with password</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@institute.edu"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setShowForgotPassword(true);
                    }}
                    className="text-xs text-teal-400 hover:text-teal-300 transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-teal-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-base font-semibold text-white">Reset Account Password</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered email address. We will send a secure password reset link to your inbox.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your-email@institute.edu"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition disabled:opacity-60"
                >
                  {resetSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Public Certificate Verification Link */}
        <div className="mt-5 text-center">
          <button
            onClick={onOpenVerify}
            className="text-xs text-slate-400 hover:text-teal-400 transition inline-flex items-center gap-1.5 underline underline-offset-4 decoration-slate-700 hover:decoration-teal-400"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            Public Certificate Verification Portal
          </button>
        </div>


      </div>
    </div>
  );
};
