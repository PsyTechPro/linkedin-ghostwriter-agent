import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Check, ArrowRight, ArrowLeft, Loader2,
  Mic, Settings, Zap, Copy, Play, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth, API } from "../App";

// Helper function to safely render profile values (handles objects, arrays, strings)
const renderProfileValue = (value) => {
  if (value === null || value === undefined) {
    return "Not specified";
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // For objects, join the values
    const values = Object.values(value).filter(v => v);
    if (values.length === 0) return "Not specified";
    return values.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
  }
  return String(value);
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { token, voiceProfile, updateVoiceProfile, isDemoMode } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [samplePosts, setSamplePosts] = useState("");
  const [extractedProfile, setExtractedProfile] = useState(null);
  const [settings, setSettings] = useState({
    post_length: "medium",
    emoji: "light",
    hashtags: "1-3",
    cta: "soft",
    risk_filter: "balanced"
  });
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [generatedPosts, setGeneratedPosts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [demoAttemptsRemaining, setDemoAttemptsRemaining] = useState(null);

  // Check demo voice limit on mount
  useEffect(() => {
    const checkDemoLimit = async () => {
      if (isDemoMode) {
        try {
          const res = await axios.get(`${API}/demo/voice-limit`);
          setDemoAttemptsRemaining(res.data.remaining);
        } catch (e) {
          console.error("Failed to check demo limit:", e);
        }
      }
    };
    checkDemoLimit();
  }, [isDemoMode]);

  // Load sample data
  const loadSamplePosts = async () => {
    try {
      const res = await axios.get(`${API}/demo/sample-profile`);
      setSamplePosts(res.data.sample_posts);
      toast.success("Sample posts loaded!");
    } catch (e) {
      toast.error("Failed to load sample");
    }
  };

  // Analyze voice
  const analyzeVoice = async () => {
    if (!samplePosts.trim() || samplePosts.length < 200) {
      toast.error("Please paste at least 5-10 LinkedIn posts (minimum 200 characters)");
      return;
    }

    setLoading(true);
    try {
      // Use demo endpoint if in demo mode, otherwise use authenticated endpoint
      const endpoint = isDemoMode ? `${API}/demo/analyze-voice` : `${API}/voice-profile/analyze`;
      const headers = isDemoMode ? {} : { Authorization: `Bearer ${token}` };
      
      const res = await axios.post(
        endpoint,
        { raw_samples: samplePosts, settings },
        { headers }
      );
      setExtractedProfile(res.data.extracted_profile);
      
      // Update remaining attempts for demo mode
      if (isDemoMode && res.data.remaining !== undefined) {
        setDemoAttemptsRemaining(res.data.remaining);
      } else if (isDemoMode) {
        // Decrement locally if not returned
        setDemoAttemptsRemaining(prev => prev !== null ? Math.max(0, prev - 1) : null);
      }
      if (!isDemoMode) {
        updateVoiceProfile(res.data);
      }
      toast.success("Voice profile created!");
      setStep(2);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || "Failed to analyze voice";
      
      // Check if it's a rate limit error (429)
      if (e.response?.status === 429) {
        setDemoAttemptsRemaining(0);
        toast.error(errorMsg, {
          duration: 6000,
          action: {
            label: "Sign up free",
            onClick: () => navigate("/auth")
          }
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setLoading(true);
    try {
      if (!isDemoMode) {
        await axios.put(
          `${API}/voice-profile/settings`,
          settings,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast.success("Settings saved!");
      
      // In demo mode, skip step 3 and go directly to /demo
      // (to avoid double-generation since /demo also has generate UI)
      if (isDemoMode) {
        navigate("/demo");
      } else {
        setStep(3);
      }
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  // Generate posts
  const generatePosts = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setGenerating(true);
    try {
      // Use demo endpoint if in demo mode
      const endpoint = isDemoMode ? `${API}/demo/generate` : `${API}/posts/generate`;
      const headers = isDemoMode ? {} : { Authorization: `Bearer ${token}` };
      
      const res = await axios.post(
        endpoint,
        { topic, audience: audience || null },
        { headers }
      );
      setGeneratedPosts(res.data);
      toast.success("5 posts generated!");
      // Navigate to appropriate page after short delay
      setTimeout(() => navigate(isDemoMode ? "/demo" : "/dashboard"), 1500);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate posts");
    } finally {
      setGenerating(false);
    }
  };

  const steps = [
    { num: 1, label: "Voice", icon: Mic },
    { num: 2, label: "Guardrails", icon: Settings },
    { num: 3, label: "Generate", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F12] px-6 py-8">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Play className="w-4 h-4" />
                <span className="font-medium text-sm">Demo Mode</span>
              </div>
              <span className="text-slate-400 text-sm hidden sm:block">
                {demoAttemptsRemaining !== null && demoAttemptsRemaining > 0 
                  ? `${demoAttemptsRemaining} voice training${demoAttemptsRemaining === 1 ? '' : 's'} remaining`
                  : demoAttemptsRemaining === 0 
                    ? "Voice training limit reached"
                    : "Posts won't be saved"
                }
              </span>
            </div>
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              Sign up for unlimited →
            </button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={`max-w-4xl mx-auto flex items-center justify-between mb-12 ${isDemoMode ? 'mt-12' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
        </div>
        <button
          data-testid="onboarding-skip-btn"
          onClick={() => navigate(isDemoMode ? "/demo" : "/dashboard")}
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          Skip for now
        </button>
      </nav>

      {/* Stepper */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`stepper-item ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}>
                <div className="stepper-circle">
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`stepper-line ${step > s.num ? 'completed' : ''}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Voice */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-3">
                  Train your voice
                </h1>
                <p className="text-slate-400">
                  Paste 5–10 of your best LinkedIn posts. We'll learn your unique style.
                </p>
              </div>

              <div className="card-ghost p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-slate-300">
                    Your LinkedIn posts
                  </label>
                  <button
                    data-testid="load-sample-btn"
                    onClick={loadSamplePosts}
                    className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Load sample
                  </button>
                </div>
                <textarea
                  data-testid="sample-posts-textarea"
                  value={samplePosts}
                  onChange={(e) => setSamplePosts(e.target.value)}
                  className="textarea-ghost min-h-[300px]"
                  placeholder="Paste your LinkedIn posts here, separated by line breaks or dashes (---)...

Example:

Here's what I learned after 10 years of leading teams:

The best leaders don't have all the answers.
They have the best questions.

---

Stop saying 'I don't have time.'
Start saying 'It's not a priority.'

Watch how quickly your calendar reflects your values."
                />
                <p className="text-xs text-slate-500 mt-3">
                  We learn your style—NOT your content. We generate new, original posts.
                </p>
              </div>

              <button
                data-testid="analyze-voice-btn"
                onClick={analyzeVoice}
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing your voice...
                  </>
                ) : (
                  <>
                    Analyze voice
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Step 2: Guardrails */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-3">
                  Set your guardrails
                </h1>
                <p className="text-slate-400">
                  Fine-tune how your posts are generated
                </p>
              </div>

              {/* Voice Profile Summary */}
              {extractedProfile && (
                <div className="card-ghost p-6 mb-6 border-teal-500/30">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    Your Voice Profile
                  </h3>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400">Tone</span>
                      <span className="text-white text-right max-w-[60%]">{renderProfileValue(extractedProfile?.tone)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400">Hook Style</span>
                      <span className="text-white text-right max-w-[60%]">{renderProfileValue(extractedProfile?.hook_style)}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400">CTA Style</span>
                      <span className="text-white text-right max-w-[60%]">{renderProfileValue(extractedProfile?.cta_style)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="card-ghost p-6 mb-6 space-y-6">
                {/* Post Length */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Post Length
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["short", "medium", "long"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`length-${opt}-btn`}
                        onClick={() => setSettings({ ...settings, post_length: opt })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          settings.post_length === opt
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emoji */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Emoji Usage
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["none", "light", "normal"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`emoji-${opt}-btn`}
                        onClick={() => setSettings({ ...settings, emoji: opt })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          settings.emoji === opt
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Hashtags
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["none", "1-3"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`hashtag-${opt}-btn`}
                        onClick={() => setSettings({ ...settings, hashtags: opt })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          settings.hashtags === opt
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {opt === "none" ? "None" : "1-3 tags"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Call-to-Action
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["none", "soft", "direct"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`cta-${opt}-btn`}
                        onClick={() => setSettings({ ...settings, cta: opt })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          settings.cta === opt
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Risk Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Tone Boldness
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["conservative", "balanced", "spicy"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`risk-${opt}-btn`}
                        onClick={() => setSettings({ ...settings, risk_filter: opt })}
                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          settings.risk_filter === opt
                            ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  data-testid="back-to-step1-btn"
                  onClick={() => setStep(1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  data-testid="save-settings-btn"
                  onClick={saveSettings}
                  disabled={loading}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-3">
                  Generate your first posts
                </h1>
                <p className="text-slate-400">
                  What do you want to write about?
                </p>
              </div>

              <div className="card-ghost p-6 mb-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Topic *
                  </label>
                  <input
                    data-testid="topic-input"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="input-ghost"
                    placeholder="e.g., Remote work productivity, Leadership lessons, Hiring mistakes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Target Audience (optional)
                  </label>
                  <input
                    data-testid="audience-input"
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="input-ghost"
                    placeholder="e.g., Founders, hiring managers, marketers..."
                  />
                </div>
              </div>

              {generating && (
                <div className="card-ghost p-8 mb-6 text-center">
                  <div className="spinner mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Generating 5 posts...</p>
                  <p className="text-slate-400 text-sm">This may take 20-40 seconds</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  data-testid="back-to-step2-btn"
                  onClick={() => setStep(2)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  data-testid="generate-posts-btn"
                  onClick={generatePosts}
                  disabled={generating || !topic.trim()}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate 5 posts
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
