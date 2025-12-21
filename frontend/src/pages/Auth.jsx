import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User, ArrowLeft, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";

const Auth = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, voiceProfile, enterDemoMode } = useAuth();
  const [isLogin, setIsLogin] = useState(false); // Default to signup for first-time users
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: ""
  });

  if (isAuthenticated) {
    return <Navigate to={voiceProfile ? "/dashboard" : "/onboarding"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(form.email, form.password);
        toast.success("Welcome back!");
      } else {
        if (!form.name.trim()) {
          toast.error("Please enter your name");
          setLoading(false);
          return;
        }
        await register(form.email, form.password, form.name);
        toast.success("Account created!");
      }
      // Navigation handled by auth state change
    } catch (error) {
      const message = error.response?.data?.detail || "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
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
          data-testid="auth-back-btn"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
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
          <h1 className="text-2xl font-bold text-white font-['Outfit'] mb-2">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-slate-400 mb-8">
            {isLogin 
              ? "Sign in to access your drafts and voice profile" 
              : "Start generating LinkedIn posts in your voice"
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    data-testid="auth-name-input"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-ghost pl-11"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  data-testid="auth-email-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-ghost pl-11"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  data-testid="auth-password-input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-ghost pl-11"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              data-testid="auth-toggle-btn"
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Demo Mode Option */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-slate-500 text-sm mb-4">
              Just want to explore?
            </p>
            <button
              data-testid="auth-demo-btn"
              onClick={async () => {
                setDemoLoading(true);
                const success = await enterDemoMode();
                if (success) {
                  navigate("/demo");
                } else {
                  toast.error("Failed to start demo");
                }
                setDemoLoading(false);
              }}
              disabled={demoLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-white/5 transition-all text-sm border border-white/10"
            >
              {demoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Try demo without signup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
