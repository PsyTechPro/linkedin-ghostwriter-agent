import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Zap, Settings, LogOut, Heart, Copy, RefreshCw, 
  Edit3, Trash2, Check, X, Loader2, Star, FileText
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth, API } from "../App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, voiceProfile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data);
    } catch (e) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const generatePosts = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!voiceProfile) {
      toast.error("Please create a voice profile first");
      navigate("/onboarding");
      return;
    }

    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/posts/generate`,
        { topic, audience: audience || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts([...res.data, ...posts]);
      setTopic("");
      setAudience("");
      toast.success("5 posts generated!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate posts");
    } finally {
      setGenerating(false);
    }
  };

  const toggleFavorite = async (postId, currentState) => {
    try {
      await axios.put(
        `${API}/posts/${postId}`,
        { is_favorite: !currentState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, is_favorite: !currentState } : p
      ));
      toast.success(currentState ? "Removed from favorites" : "Added to favorites");
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const copyPost = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const regeneratePost = async (postId) => {
    try {
      const res = await axios.post(
        `${API}/posts/${postId}/regenerate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(posts.map(p => p.id === postId ? res.data : p));
      toast.success("Post regenerated!");
    } catch (e) {
      toast.error("Failed to regenerate");
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const saveEdit = async (postId) => {
    try {
      await axios.put(
        `${API}/posts/${postId}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, content: editContent } : p
      ));
      setEditingId(null);
      toast.success("Post updated!");
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const deletePost = async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const filteredPosts = activeTab === "favorites" 
    ? posts.filter(p => p.is_favorite) 
    : posts;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0B0F12]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 glass border-r border-white/5 p-6 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg text-white font-['Outfit']">Ghostwriter</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          <button
            data-testid="nav-dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 text-white"
          >
            <FileText className="w-5 h-5" />
            Dashboard
          </button>
          <button
            data-testid="nav-settings"
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
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
            data-testid="logout-btn"
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-2">
              Your Drafts
            </h1>
            <p className="text-slate-400">
              Generate, edit, and manage your LinkedIn posts
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
              Generate new drafts
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Topic *
                </label>
                <input
                  data-testid="dashboard-topic-input"
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
                  data-testid="dashboard-audience-input"
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
              data-testid="dashboard-generate-btn"
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

          {/* Posts List */}
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#161A1D] border border-white/5 mb-6">
              <TabsTrigger 
                data-testid="tab-all"
                value="all" 
                className="data-[state=active]:bg-white/10"
              >
                All Drafts ({posts.length})
              </TabsTrigger>
              <TabsTrigger 
                data-testid="tab-favorites"
                value="favorites"
                className="data-[state=active]:bg-white/10"
              >
                <Star className="w-4 h-4 mr-1" />
                Favorites ({posts.filter(p => p.is_favorite).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <PostsList 
                posts={filteredPosts}
                loading={loading}
                editingId={editingId}
                editContent={editContent}
                setEditContent={setEditContent}
                startEdit={startEdit}
                saveEdit={saveEdit}
                setEditingId={setEditingId}
                toggleFavorite={toggleFavorite}
                copyPost={copyPost}
                regeneratePost={regeneratePost}
                deletePost={deletePost}
              />
            </TabsContent>
            <TabsContent value="favorites">
              <PostsList 
                posts={filteredPosts}
                loading={loading}
                editingId={editingId}
                editContent={editContent}
                setEditContent={setEditContent}
                startEdit={startEdit}
                saveEdit={saveEdit}
                setEditingId={setEditingId}
                toggleFavorite={toggleFavorite}
                copyPost={copyPost}
                regeneratePost={regeneratePost}
                deletePost={deletePost}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

// Posts List Component
const PostsList = ({ 
  posts, loading, editingId, editContent, setEditContent,
  startEdit, saveEdit, setEditingId, toggleFavorite, copyPost, 
  regeneratePost, deletePost 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card-ghost p-12 text-center">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
        <p className="text-slate-400">
          Generate your first batch of posts above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
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
                  {new Date(post.created_at).toLocaleDateString()} • {post.topic}
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <span key={tag} className="tag-chip">{tag}</span>
                  ))}
                </div>
              </div>
              <button
                data-testid={`favorite-btn-${post.id}`}
                onClick={() => toggleFavorite(post.id, post.is_favorite)}
                className={`p-2 rounded-lg transition-colors ${
                  post.is_favorite 
                    ? "text-yellow-400 bg-yellow-400/10" 
                    : "text-slate-400 hover:text-yellow-400 hover:bg-white/5"
                }`}
              >
                <Star className={`w-5 h-5 ${post.is_favorite ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Content */}
            {editingId === post.id ? (
              <div className="mb-4">
                <textarea
                  data-testid={`edit-textarea-${post.id}`}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="textarea-ghost min-h-[200px]"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    data-testid={`save-edit-btn-${post.id}`}
                    onClick={() => saveEdit(post.id)}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    data-testid={`cancel-edit-btn-${post.id}`}
                    onClick={() => setEditingId(null)}
                    className="btn-secondary py-2 px-4 text-sm flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                  {post.content}
                </pre>
              </div>
            )}

            {/* Actions */}
            {editingId !== post.id && (
              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button
                  data-testid={`edit-btn-${post.id}`}
                  onClick={() => startEdit(post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  data-testid={`regenerate-btn-${post.id}`}
                  onClick={() => regeneratePost(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
                <button
                  data-testid={`copy-btn-${post.id}`}
                  onClick={() => copyPost(post.content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  data-testid={`delete-btn-${post.id}`}
                  onClick={() => deletePost(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
