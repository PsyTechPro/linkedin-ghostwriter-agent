import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import DemoMode from "./pages/DemoMode";
import DemoChoice from "./pages/DemoChoice";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoProfile, setDemoProfile] = useState(null);
  const [demoSessionId, setDemoSessionId] = useState(null); // Track demo session for proper reset

  // Owner Mode - secret bypass for demo limits
  const OWNER_SECRET = "OWNER"; // Secret word to activate owner mode
  const OWNER_MODE_KEY = "ownerModeEnabled";
  const OWNER_MODE_EXPIRY_KEY = "ownerModeExpiry";
  const OWNER_MODE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

  // Check if owner mode is active and not expired
  const checkOwnerMode = () => {
    try {
      const enabled = localStorage.getItem(OWNER_MODE_KEY);
      const expiry = localStorage.getItem(OWNER_MODE_EXPIRY_KEY);
      if (enabled === 'true' && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          return true;
        } else {
          // Expired, clear it
          localStorage.removeItem(OWNER_MODE_KEY);
          localStorage.removeItem(OWNER_MODE_EXPIRY_KEY);
        }
      }
    } catch (e) {
      console.error("[AUTH] Error checking owner mode:", e);
    }
    return false;
  };

  const [isOwnerMode, setIsOwnerMode] = useState(checkOwnerMode);

  // Enable owner mode for 30 days
  const enableOwnerMode = () => {
    const expiry = Date.now() + OWNER_MODE_DURATION;
    localStorage.setItem(OWNER_MODE_KEY, 'true');
    localStorage.setItem(OWNER_MODE_EXPIRY_KEY, expiry.toString());
    setIsOwnerMode(true);
    console.log("[AUTH] Owner Mode ENABLED - expires:", new Date(expiry).toISOString());
    return true;
  };

  // Disable owner mode
  const disableOwnerMode = () => {
    localStorage.removeItem(OWNER_MODE_KEY);
    localStorage.removeItem(OWNER_MODE_EXPIRY_KEY);
    setIsOwnerMode(false);
    console.log("[AUTH] Owner Mode DISABLED");
  };

  // Check if input matches the owner secret
  const checkOwnerSecret = (input) => {
    return input && input.trim().toUpperCase() === OWNER_SECRET;
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
          // Fetch voice profile
          try {
            const profileRes = await axios.get(`${API}/voice-profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setVoiceProfile(profileRes.data);
          } catch (e) {
            setVoiceProfile(null);
          }
        } catch (e) {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
    setIsDemoMode(false);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name });
    localStorage.setItem("token", res.data.access_token);
    setToken(res.data.access_token);
    setUser(res.data.user);
    setIsDemoMode(false);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setVoiceProfile(null);
    setIsDemoMode(false);
    setDemoProfile(null);
  };

  const enterDemoMode = async () => {
    console.log("[AUTH] enterDemoMode called - BEFORE", {
      isDemoMode,
      hasDemoProfile: !!demoProfile,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage)
    });
    
    try {
      const res = await axios.get(`${API}/demo/sample-profile`);
      const newSessionId = Date.now().toString();
      
      setDemoProfile(res.data.extracted_profile);
      setIsDemoMode(true);
      setDemoSessionId(newSessionId);
      setUser({ name: "Demo User", email: "demo@example.com", id: "demo" });
      
      console.log("[AUTH] enterDemoMode success - AFTER", {
        isDemoMode: true,
        hasDemoProfile: true,
        demoSessionId: newSessionId
      });
      
      return true;
    } catch (e) {
      console.error("[AUTH] enterDemoMode failed:", e);
      return false;
    }
  };

  // Full demo state reset - clears everything for a fresh demo experience
  const resetDemoSession = () => {
    console.log("[AUTH] resetDemoSession - BEFORE", {
      isDemoMode,
      hasDemoProfile: !!demoProfile,
      demoSessionId,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage)
    });
    
    // Clear React state
    setIsDemoMode(false);
    setDemoProfile(null);
    setDemoSessionId(null);
    setUser(null);
    
    // Comprehensive list of patterns to clear
    const clearPatterns = [
      'demo', 'voice', 'sample', 'onboarding', 'step', 'wizard', 
      'profile', 'topic', 'audience', 'hasSeen', 'selected', 'mode',
      'sb-', 'supabase', 'auth-token' // Supabase-related keys if any
    ];
    
    // Clear localStorage - iterate over a copy of keys
    const localKeys = [...Object.keys(localStorage)];
    for (const key of localKeys) {
      const keyLower = key.toLowerCase();
      if (clearPatterns.some(pattern => keyLower.includes(pattern.toLowerCase()))) {
        console.log("[AUTH] Clearing localStorage key:", key);
        localStorage.removeItem(key);
      }
    }
    
    // Clear sessionStorage - iterate over a copy of keys
    const sessionKeys = [...Object.keys(sessionStorage)];
    for (const key of sessionKeys) {
      const keyLower = key.toLowerCase();
      if (clearPatterns.some(pattern => keyLower.includes(pattern.toLowerCase()))) {
        console.log("[AUTH] Clearing sessionStorage key:", key);
        sessionStorage.removeItem(key);
      }
    }
    
    // Explicitly clear known keys
    const explicitKeys = [
      'demoRunId', 'demoStarted', 'demoVoiceSelected', 'demoOnboardingStep',
      'demoProfile', 'isDemoMode', 'sampleVoice', 'voiceProfile',
      'demoTopic', 'demoAudience', 'hasSeenDemo'
    ];
    explicitKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    console.log("[AUTH] resetDemoSession - AFTER", {
      isDemoMode: false,
      demoProfile: null,
      localStorage: Object.keys(localStorage),
      sessionStorage: Object.keys(sessionStorage)
    });
  };

  // Hard reset and redirect - used by Exit Demo button
  // Uses window.location.assign for a full page reload to guarantee clean state
  const hardResetDemo = () => {
    console.log("[AUTH] hardResetDemo - Starting hard reset");
    
    // First clear all state
    resetDemoSession();
    
    // Clear token if it's a demo token
    if (user?.id === 'demo') {
      localStorage.removeItem('token');
      setToken(null);
    }
    
    console.log("[AUTH] hardResetDemo - State cleared, forcing navigation to /demo-choice");
    
    // Force a full page reload to /demo-choice to guarantee clean SPA state
    window.location.assign('/demo-choice');
  };

  const exitDemoMode = () => {
    console.log("[AUTH] exitDemoMode called - using hardResetDemo");
    hardResetDemo();
  };

  const updateVoiceProfile = (profile) => {
    setVoiceProfile(profile);
  };

  const updateDemoProfile = (profile) => {
    setDemoProfile(profile);
  };

  // Check if user has trained their own voice (vs sample profile)
  const hasDemoTrainedVoice = isDemoMode && demoProfile && demoProfile._trained === true;

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, login, register, logout, 
      voiceProfile, updateVoiceProfile, isAuthenticated: !!user,
      isDemoMode, demoProfile, enterDemoMode, exitDemoMode, updateDemoProfile, 
      hasDemoTrainedVoice, resetDemoSession, demoSessionId, hardResetDemo,
      isOwnerMode, enableOwnerMode, disableOwnerMode, checkOwnerSecret
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, isDemoMode } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!isAuthenticated && !isDemoMode) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0F12]">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/demo-choice" element={<DemoChoice />} />
            <Route path="/demo" element={<DemoMode />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: '#161A1D',
                color: '#F8FAFC',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
