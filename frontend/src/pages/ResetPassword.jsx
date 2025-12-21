import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Lock, ArrowLeft, Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError("No reset token provided");
        setVerifying(false);
        return;
      }

      try {
        const res = await axios.get(`${API}/auth/verify-reset-token?token=${token}`);
        if (res.data.valid) {
          setTokenValid(true);
        } else {
          setTokenError(res.data.message || "Invalid or expired reset link");
        }
      } catch (error) {
        setTokenError("Invalid or expired reset link");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success("Password updated successfully!");
    } catch (error) {
      const message = error.response?.data?.detail || "Failed to reset password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-teal-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <button
          data-testid="reset-back-btn"
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-xl text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
        </div>

        {/* Card */}
        <div className="card-ghost p-8">
          {/* Invalid token state */}
          {!tokenValid && !success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-3">
                Invalid Reset Link
              </h1>
              <p className="text-slate-400 mb-6">
                {tokenError || "This password reset link is invalid or has expired."}
              </p>
              <button
                data-testid="request-new-link-btn"
                onClick={() => navigate("/forgot-password")}
                className="btn-primary py-2.5 px-6"
              >
                Request a new link
              </button>
            </motion.div>
          )}

          {/* Success state */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-teal-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-3">
                Password Updated!
              </h1>
              <p className="text-slate-400 mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                data-testid="go-to-signin-btn"
                onClick={() => {
                  navigate("/auth");
                  toast.success("Password updated! Please sign in.");
                }}
                className="btn-primary py-2.5 px-6"
              >
                Sign in now
              </button>
            </motion.div>
          )}

          {/* Reset form */}
          {tokenValid && !success && (
            <>
              <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-2">
                Set new password
              </h1>
              <p className="text-slate-400 mb-6">
                Create a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      data-testid="new-password-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-ghost pl-12 pr-12"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      data-testid="confirm-password-input"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-ghost pl-12 pr-12"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1.5">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-teal-400 mt-1.5">Passwords match ✓</p>
                  )}
                </div>

                <button
                  data-testid="reset-password-btn"
                  type="submit"
                  disabled={loading || password.length < 6 || password !== confirmPassword}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    "Reset password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
