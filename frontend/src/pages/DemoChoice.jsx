import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, Mic, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../App";

const DemoChoice = () => {
  const navigate = useNavigate();
  const { enterDemoMode } = useAuth();
  const [loading, setLoading] = useState(null); // 'quick' or 'train'

  const handleQuickDemo = async () => {
    setLoading('quick');
    try {
      const success = await enterDemoMode();
      if (success) {
        navigate("/demo");
      } else {
        toast.error("Failed to start demo");
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const handleTrainVoice = async () => {
    setLoading('train');
    try {
      const success = await enterDemoMode();
      if (success) {
        navigate("/onboarding");
      } else {
        toast.error("Failed to start demo");
      }
    } catch (e) {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
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
        className="w-full max-w-2xl relative z-10"
      >
        {/* Back button */}
        <button
          data-testid="demo-choice-back-btn"
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-xl text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-3">
            How would you like to try the demo?
          </h1>
          <p className="text-slate-400">
            Choose your experience — no signup required
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Demo */}
          <motion.button
            data-testid="demo-quick-btn"
            onClick={handleQuickDemo}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="card-ghost p-6 text-left hover:border-teal-500/30 transition-all group disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 font-['Outfit']">
              Quick Demo
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              See instant results using our sample voice profile. Perfect for a quick test.
            </p>
            <div className="flex items-center gap-2 text-teal-400 text-sm font-medium">
              {loading === 'quick' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Try now →
                </>
              )}
            </div>
          </motion.button>

          {/* Train Voice */}
          <motion.button
            data-testid="demo-train-btn"
            onClick={handleTrainVoice}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="card-ghost p-6 text-left hover:border-teal-500/30 transition-all group disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 font-['Outfit']">
              Train My Voice
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Paste your LinkedIn posts and generate content in YOUR unique style.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 text-sm font-medium">
                {loading === 'train' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Start training →"
                )}
              </span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                2 free tries
              </span>
            </div>
          </motion.button>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Demo posts are not saved. <button onClick={() => navigate("/auth")} className="text-teal-400 hover:text-teal-300">Sign up free</button> to save posts and get 10 free generations.
        </p>
      </motion.div>
    </div>
  );
};

export default DemoChoice;
