import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, ArrowLeft, Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
      // Check if we got a reset URL
      if (response.data.devResetUrl) {
        setDevResetUrl(response.data.devResetUrl);
      }
      toast.success("Reset link ready!");
    } catch (error) {
      // Still show success to prevent email enumeration
      setSubmitted(true);
      toast.success("Reset link ready!");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (devResetUrl) {
      navigator.clipboard.writeText(devResetUrl);
      toast.success("Reset link copied to clipboard");
    }
  };

  const openResetLink = () => {
    if (devResetUrl) {
      window.location.href = devResetUrl;
    }
  };

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
          data-testid="forgot-back-btn"
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
          {submitted ? (
            // Success state
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-teal-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-3">
                {devResetUrl ? "Reset link ready" : "Check your email"}
              </h1>
              <p className="text-slate-400 mb-6">
                If an account exists for <span className="text-white">{email}</span>, you can use the link below to reset your password.
              </p>
              
              {/* Reset link - shown when account exists */}
              {devResetUrl && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 mb-6 text-left">
                  <p className="text-teal-400 text-xs font-medium mb-3">
                    Click the button below to reset your password:
                  </p>
                  
                  <button
                    data-testid="open-reset-link-btn"
                    onClick={openResetLink}
                    className="btn-primary w-full py-2.5 mb-3 flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Reset my password
                  </button>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={devResetUrl}
                      readOnly
                      className="input-ghost text-xs pr-12 font-mono"
                      data-testid="reset-url-input"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Helpful message when no reset link appears */}
              {!devResetUrl && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-6">
                  <p className="text-slate-400 text-sm">
                    If no reset link appears above, please verify you're using the email you registered with.
                  </p>
                </div>
              )}
              
              {devResetUrl && (
                <p className="text-slate-500 text-sm mb-6">
                  This link will expire in 30 minutes for security purposes.
                </p>
              )}
              <button
                data-testid="back-to-signin-btn"
                onClick={() => navigate("/auth")}
                className="btn-secondary py-2.5 px-6"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            // Form state
            <>
              <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-2">
                Forgot your password?
              </h1>
              <p className="text-slate-400 mb-6">
                No worries! Enter your email and we'll provide you with a secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      data-testid="forgot-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-ghost pl-12"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Enter the email associated with your account.
                  </p>
                </div>

                <button
                  data-testid="send-reset-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Get reset link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  data-testid="remember-password-btn"
                  onClick={() => navigate("/auth")}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Remember your password? Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
