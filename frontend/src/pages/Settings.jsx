import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Sparkles, Settings as SettingsIcon, FileText, LogOut, 
  ArrowLeft, Loader2, RefreshCw, Check
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth, API } from "../App";

// Helper function to safely render profile values (handles objects, arrays, strings)
const renderProfileValue = (value) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-500 italic">Not specified</span>;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    // Convert object to readable format
    return (
      <ul className="list-disc list-inside space-y-1 text-sm">
        {Object.entries(value).map(([key, val]) => (
          <li key={key}>
            <span className="text-slate-400">{key.replace(/_/g, ' ')}:</span>{' '}
            <span className="text-white">
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return String(value);
};

// Helper to render themes (can be array or string)
const renderThemes = (themes) => {
  if (!themes) return null;
  
  let themeList = [];
  if (Array.isArray(themes)) {
    themeList = themes;
  } else if (typeof themes === 'string') {
    themeList = themes.split(',').map(t => t.trim());
  } else if (typeof themes === 'object') {
    themeList = Object.values(themes).flat().filter(t => typeof t === 'string');
  }
  
  if (themeList.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {themeList.map((theme, i) => (
        <span key={i} className="tag-chip">{String(theme)}</span>
      ))}
    </div>
  );
};

// Helper to render list items (dos/donts)
const renderListItems = (items) => {
  if (!items) return null;
  
  let itemList = [];
  if (Array.isArray(items)) {
    itemList = items;
  } else if (typeof items === 'string') {
    itemList = items.split(',').map(t => t.trim());
  } else if (typeof items === 'object') {
    itemList = Object.values(items).flat().filter(t => typeof t === 'string');
  }
  
  if (itemList.length === 0) return null;
  
  return (
    <ul className="list-disc list-inside space-y-1 text-sm text-white">
      {itemList.map((item, i) => (
        <li key={i}>{String(item)}</li>
      ))}
    </ul>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, token, logout, voiceProfile, updateVoiceProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    post_length: "medium",
    emoji: "light",
    hashtags: "1-3",
    cta: "soft",
    risk_filter: "balanced"
  });

  useEffect(() => {
    if (voiceProfile?.settings) {
      setSettings(voiceProfile.settings);
    }
  }, [voiceProfile]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${API}/voice-profile/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateVoiceProfile(res.data);
      toast.success("Settings saved!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const extractedProfile = voiceProfile?.extracted_profile;

  return (
    <div className="min-h-screen bg-[#0B0F12]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 glass border-r border-white/5 p-6 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          <button
            data-testid="settings-nav-dashboard"
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <FileText className="w-5 h-5" />
            Dashboard
          </button>
          <button
            data-testid="settings-nav-settings"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 text-white"
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* User */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="settings-logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              data-testid="settings-back-btn"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-2">
              Settings
            </h1>
            <p className="text-slate-400">
              Manage your voice profile and generation preferences
            </p>
          </div>

          {/* Voice Profile Summary */}
          {extractedProfile ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-ghost p-6 mb-8 border-teal-500/30"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  Your Voice Profile
                </h2>
                <button
                  data-testid="retrain-voice-btn"
                  onClick={() => navigate("/onboarding")}
                  className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-train voice
                </button>
              </div>

              <div className="grid gap-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tone</p>
                  <p className="text-white">{extractedProfile.tone}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Structure</p>
                  <p className="text-white">{extractedProfile.structure}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hook Style</p>
                  <p className="text-white">{extractedProfile.hook_style}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CTA Style</p>
                  <p className="text-white">{extractedProfile.cta_style}</p>
                </div>
                {extractedProfile.themes && (
                  <div className="bg-black/20 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Themes</p>
                    <div className="flex flex-wrap gap-2">
                      {extractedProfile.themes.map((theme, i) => (
                        <span key={i} className="tag-chip">{theme}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-ghost p-8 mb-8 text-center"
            >
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No voice profile yet</h3>
              <p className="text-slate-400 mb-4">
                Create a voice profile to start generating posts
              </p>
              <button
                data-testid="create-profile-btn"
                onClick={() => navigate("/onboarding")}
                className="btn-primary py-2 px-6"
              >
                Create Voice Profile
              </button>
            </motion.div>
          )}

          {/* Guardrails */}
          {voiceProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-ghost p-6"
            >
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-teal-400" />
                Generation Guardrails
              </h2>

              <div className="space-y-6">
                {/* Post Length */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Post Length
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["short", "medium", "long"].map((opt) => (
                      <button
                        key={opt}
                        data-testid={`settings-length-${opt}`}
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
                        data-testid={`settings-emoji-${opt}`}
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
                        data-testid={`settings-hashtag-${opt}`}
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
                        data-testid={`settings-cta-${opt}`}
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
                        data-testid={`settings-risk-${opt}`}
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

                {/* Save Button */}
                <button
                  data-testid="save-settings-btn"
                  onClick={saveSettings}
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
