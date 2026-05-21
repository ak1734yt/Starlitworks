import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  apiLogin, apiSignup, apiVerifySignup, apiResendOTP, apiForgotPassword, apiGetMe, apiGetOAuthStatus, redirectToOAuth,
  apiLogin2FA, apiSetup2FA, apiVerify2FA, apiDisable2FA 
} from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [modalOpen, setModalOpen]         = useState(false);
  const [modalTab, setModalTab]           = useState('login'); // 'login' | 'signup'
  const [intendedRoute, setIntendedRoute] = useState('/');
  const [oauthStatus, setOauthStatus]     = useState({ google: false, discord: false, microsoft: false, apple: false });
  const navigate = useNavigate();
  const transitionTimer = useRef(null);

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('ssw_token');
    if (token) {
      apiGetMe()
        .then(({ user }) => {
          if (user?.email) localStorage.setItem('ssw_user_email', user.email);
          setUser(user);
        })
        .catch((err) => {
          if (err.status === 401) {
            localStorage.removeItem('ssw_token');
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiGetOAuthStatus().then(setOauthStatus).catch((err) => {
      console.warn("Failed to fetch OAuth status, defaulting to enabled.", err);
      setOauthStatus({ google: true, discord: true, microsoft: true, apple: true });
    });
  }, []);

  // ── OAuth token in URL ────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    if (token) {
      localStorage.setItem('ssw_token', token);
      apiGetMe().then(({ user }) => {
        setUser(user);
        window.history.replaceState({}, '', window.location.pathname);
        triggerTransition('/');
      }).catch((err) => {
        if (err.status === 401) {
          localStorage.removeItem('ssw_token');
          setUser(null);
        }
      });
    }
  }, []);

  // ── Transition helper ─────────────────────────────────────────────────────────
  const triggerTransition = useCallback((destination = '/') => {
    setModalOpen(false);
    setShowTransition(true);
    clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      setShowTransition(false);
      navigate(destination);
    }, 1200);
  }, [navigate]);

  // ── Modal controls ────────────────────────────────────────────────────────────
  const openAuthModal = useCallback((route = '/', tab = 'login') => {
    setIntendedRoute(route);
    setModalTab(tab);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setModalOpen(false), []);

  // ── Auth actions ──────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password);
    if (res.two_factor_required) {
      return res; // Return to handle in modal
    }
    localStorage.setItem('ssw_token', res.token);
    if (res.user?.email) localStorage.setItem('ssw_user_email', res.user.email);
    setUser(res.user);
    triggerTransition(intendedRoute || '/');
    return res;
  }, [intendedRoute, triggerTransition]);

  const verify2FA = useCallback(async (userId, code) => {
    const { token, user } = await apiLogin2FA(userId, code);
    localStorage.setItem('ssw_token', token);
    if (user?.email) localStorage.setItem('ssw_user_email', user.email);
    setUser(user);
    triggerTransition(intendedRoute || '/');
  }, [intendedRoute, triggerTransition]);

  const signup = useCallback(async (name, email, password, referralCode = '') => {
    const result = await apiSignup(name, email, password, referralCode);
    if (result.requires_otp) {
      return result; // Return to AuthModal to show OTP step
    }
    // Fallback: if server returns token directly
    if (result.token) {
      localStorage.setItem('ssw_token', result.token);
      if (result.user?.email) localStorage.setItem('ssw_user_email', result.user.email);
      setUser(result.user);
      triggerTransition(intendedRoute || '/');
    }
    return result;
  }, [intendedRoute, triggerTransition]);

  const verifySignupOTP = useCallback(async (email, otp, referralCode = '') => {
    const { token, user } = await apiVerifySignup(email, otp, referralCode);
    localStorage.setItem('ssw_token', token);
    if (user?.email) localStorage.setItem('ssw_user_email', user.email);
    setUser(user);
    triggerTransition(intendedRoute || '/');
  }, [intendedRoute, triggerTransition]);

  const resendOTP = useCallback(async (email) => {
    return apiResendOTP(email);
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return apiForgotPassword(email);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ssw_token');
    setUser(null);
    navigate('/');
  }, [navigate]);

  const loginWithOAuth = useCallback((provider) => {
    redirectToOAuth(provider);
  }, []);

  // Used by OAuthCallback page after backend redirect
  const setUserFromToken = useCallback(async (token) => {
    localStorage.setItem('ssw_token', token);
    const { user } = await apiGetMe();
    setUser(user);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const { request } = await import('../services/api');
    const json = await request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (json.user) setUser(json.user);
    return json;
  }, []);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('ssw_token');
    if (!token) return;
    try {
      const { user } = await apiGetMe();
      setUser(user);
    } catch (e) {
      if (e.status === 401) {
        localStorage.removeItem('ssw_token');
        setUser(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, showTransition,
      modalOpen, modalTab, intendedRoute,
      oauthStatus,
      login, signup, verifySignupOTP, resendOTP, logout, forgotPassword, loginWithOAuth, setUserFromToken,
      openAuthModal, closeAuthModal, updateProfile, refreshMe,
      verify2FA, setup2FA: apiSetup2FA, confirm2FA: apiVerify2FA, disable2FA: apiDisable2FA
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
