import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Zap, LogOut, Copy, RefreshCw, 
  Loader2, FileText, AlertTriangle, Play
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth, API } from "../App";

const DemoMode = () => {
  const navigate = useNavigate();
  const { isDemoMode, demoProfile, enterDemoMode, exitDemoMode, hasDemoTrainedVoice } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");

  useEffect(() => {
    const initDemo = async () => {
      if (!isDemoMode) {
        const success = await enterDemoMode();
        if (!success) {
          toast.error("Failed to start demo");
          navigate("/");
          return;
        }
      }
      setLoading(false);
    };
    initDemo();
  }, []);

  const generatePosts = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setGenerating(true);
    try {
      console.log("[Demo] Generating posts for topic:", topic, "hasDemoTrainedVoice:", hasDemoTrainedVoice);
      
      let res;
      if (hasDemoTrainedVoice && demoProfile) {
        // Use trained voice profile
        console.log("[Demo] Using trained voice profile");
        res = await axios.post(`${API}/demo/generate-with-profile`, { 
          topic, 
          audience: audience || null,
          profile: demoProfile
        });
      } else {
        // Use sample voice profile
        console.log("[Demo] Using sample voice profile");
        res = await axios.post(`${API}/demo/generate`, { 
          topic, 
          audience: audience || null 
        });
      }
      
      console.log("[Demo] Response received:", res.data);
      
      // Validate response is an array
      if (!Array.isArray(res.data)) {
        console.error("[Demo] Unexpected response format:", res.data);
        toast.error("Unexpected response format");
        return;
      }
      
      // Ensure each post has required fields
      const validPosts = res.data.map((post, idx) => ({
        id: post.id || `demo-${Date.now()}-${idx}`,
        topic: post.topic || topic,
        audience: post.audience || audience,
        content: post.content || "",
        tags: Array.isArray(post.tags) ? post.tags : ["Generated"],
        is_favorite: false,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString()
      }));
      
      console.log("[Demo] Valid posts:", validPosts.length);
      
      // Add new posts to beginning of list
      setPosts(prev => [...validPosts, ...prev]);
      setTopic("");
      setAudience("");
      toast.success(`${validPosts.length} posts generated!`);
    } catch (e) {
      console.error("[Demo] Generation error:", e);
      const errorMsg = e.response?.data?.detail || e.message || "Failed to generate posts";
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const copyPost = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleExitDemo = () => {
    exitDemoMode();
    navigate("/");
  };

  const handleSignUp = () => {
    exitDemoMode();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-400">Loading demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F12]">
      {/* Demo Mode Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Play className="w-4 h-4" />
              <span className="font-medium text-sm">Demo Mode</span>
            </div>
            <span className="text-slate-400 text-sm hidden sm:block">
              Generate posts freely • Saving & favorites disabled
            </span>
          </div>
          <button
            data-testid="demo-signup-btn"
            onClick={handleSignUp}
            className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Sign up to save posts →
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-[49px] bottom-0 w-64 glass border-r border-white/5 p-6 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
        </div>

        {/* Voice Profile Card */}
        {demoProfile && (
          <div className={`card-ghost p-4 mb-6 ${hasTrainedVoice ? 'border-teal-500/30' : 'border-amber-500/30'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={`w-4 h-4 ${hasTrainedVoice ? 'text-teal-400' : 'text-amber-400'}`} />
              <span className={`text-sm font-medium ${hasTrainedVoice ? 'text-teal-400' : 'text-amber-400'}`}>
                {hasTrainedVoice ? 'Your Trained Voice' : 'Sample Voice'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {typeof demoProfile.tone === 'string' 
                ? demoProfile.tone 
                : Array.isArray(demoProfile.tone) 
                  ? demoProfile.tone.join(', ')
                  : 'Professional tone'}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          <button
            data-testid="demo-nav-generate"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 text-white"
          >
            <Zap className="w-5 h-5" />
            Generate Posts
          </button>
          <button
            data-testid="demo-nav-train"
            onClick={() => navigate("/onboarding")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Train Your Voice
          </button>
        </nav>

        {/* Actions */}
        <div className="pt-6 border-t border-white/5 space-y-3">
          <button
            data-testid="demo-create-account-btn"
            onClick={handleSignUp}
            className="btn-primary w-full py-2.5 text-sm"
          >
            Create Free Account
          </button>
          <button
            data-testid="demo-exit-btn"
            onClick={handleExitDemo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Exit Demo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-[49px] p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-2">
              Try It Out
            </h1>
            <p className="text-slate-400">
              Generate LinkedIn posts using our sample voice profile
            </p>
          </div>

          {/* Generate Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-ghost p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-400" />
              Generate posts
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Topic *
                </label>
                <input
                  data-testid="demo-topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input-ghost"
                  placeholder="e.g., AI in marketing, Career growth..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Audience (optional)
                </label>
                <input
                  data-testid="demo-audience-input"
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="input-ghost"
                  placeholder="e.g., Marketers, founders..."
                />
              </div>
            </div>

            {generating && (
              <div className="bg-black/20 rounded-lg p-4 mb-4 flex items-center gap-3">
                <div className="spinner w-6 h-6" />
                <div>
                  <p className="text-white text-sm font-medium">Generating 5 posts...</p>
                  <p className="text-slate-400 text-xs">This may take 20-40 seconds</p>
                </div>
              </div>
            )}

            <button
              data-testid="demo-generate-btn"
              onClick={generatePosts}
              disabled={generating || !topic.trim()}
              className="btn-primary py-2.5 px-6 flex items-center gap-2 disabled:opacity-50"
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
          </motion.div>

          {/* Demo Limitations Notice */}
          {posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-ghost p-6 border-amber-500/20 mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Demo Mode Limitations</h3>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• Posts are generated but <strong className="text-slate-300">not saved</strong></li>
                    <li>• Favorites and editing are <strong className="text-slate-300">disabled</strong></li>
                    <li>• Using a <strong className="text-slate-300">sample voice profile</strong></li>
                    <li>• <strong className="text-slate-300">Sign up free</strong> to train your own voice</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Posts List */}
          {posts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white font-['Outfit']">
                  Generated Posts ({posts.length})
                </h2>
                <span className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full">
                  Demo • Not Saved
                </span>
              </div>
              
              <AnimatePresence>
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id || `post-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="card-ghost p-6"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          {post.topic || "Generated Post"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(post.tags || []).map((tag, tagIdx) => (
                            <span key={`${tag}-${tagIdx}`} className="tag-chip">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-4">
                      <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                        {post.content || "No content available"}
                      </pre>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <button
                        data-testid={`demo-copy-btn-${i}`}
                        onClick={() => copyPost(post.content)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <div className="flex-1" />
                      <span className="text-xs text-slate-600">
                        Sign up to edit & save
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* CTA after posts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-ghost p-8 text-center mt-8 border-teal-500/30"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  Like what you see?
                </h3>
                <p className="text-slate-400 mb-6">
                  Create a free account to train your own voice and save unlimited posts
                </p>
                <button
                  data-testid="demo-cta-signup-btn"
                  onClick={handleSignUp}
                  className="btn-primary py-3 px-8"
                >
                  Create Free Account
                </button>
              </motion.div>
            </div>
          )}

          {/* Empty state */}
          {posts.length === 0 && !generating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-ghost p-12 text-center"
            >
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Ready to generate</h3>
              <p className="text-slate-400">
                Enter a topic above to create 5 LinkedIn posts instantly
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DemoMode;
