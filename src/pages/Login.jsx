import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PROVIDERS = [
  { id: 'google',    label: 'Google',    icon: (<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>) },
  { id: 'apple',     label: 'Apple',     icon: (<svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>) },
  { id: 'microsoft', label: 'Microsoft', icon: (<svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/><path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/><path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/><path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/></svg>) },
  { id: 'discord',   label: 'Discord',   icon: (<svg viewBox="0 0 24 24" className="w-5 h-5" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>) },
];

export default function Login() {
  const { login, loginWithOAuth, oauthStatus, verify2FA } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'oauth_failed') { setError('OAuth sign-in failed. Please try again.'); window.history.replaceState({}, '', '/login'); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { 
      const res = await login(email, password); 
      if (res && res.two_factor_required) {
        setNeeds2FA(true);
        setPendingUserId(res.user_id);
      }
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await verify2FA(pendingUserId, twoFactorCode);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    if (!oauthStatus[provider]) { setError(`${provider} sign-in is not yet configured.`); return; }
    setOauthLoading(provider); loginWithOAuth(provider);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Banner background */}
      <div className="absolute inset-0 -z-10">
        <div style={{ backgroundImage:'url(/banner.png)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.12 }} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/60 via-brand-bg/40 to-brand-bg/70" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-secondary/15 blur-[100px] rounded-full" />
      </div>

      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">Starlit Siege</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to your account to continue</p>
        </div>

        <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-border rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PROVIDERS.map(p => (
              <button key={p.id} id={`oauth-btn-${p.id}`} onClick={() => handleOAuth(p.id)} disabled={!!oauthLoading}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50 ${!oauthStatus[p.id]?'opacity-40':''}`}
                title={!oauthStatus[p.id]?`${p.label} not configured`:`Sign in with ${p.label}`}>
                {oauthLoading===p.id?<Loader2 className="w-4 h-4 animate-spin"/>:p.icon}<span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6"><div className="flex-1 h-px bg-brand-border"/><span className="text-xs text-gray-500 uppercase tracking-widest">or with email</span><div className="flex-1 h-px bg-brand-border"/></div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/><span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {needs2FA ? (
            <form id="2fa-form" onSubmit={handle2FASubmit} className="space-y-4 mt-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-white mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                <input id="login-2fa" type="text" value={twoFactorCode} onChange={e=>setTwoFactorCode(e.target.value)} placeholder="000000" required maxLength={6}
                  className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all font-mono tracking-[0.2em] text-center" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Verifying…':'Verify Code'}
              </button>
              <button type="button" onClick={() => {setNeeds2FA(false); setTwoFactorCode(''); setPendingUserId(null);}}
                className="w-full text-xs text-gray-400 hover:text-white mt-2 transition-colors">
                Back to Login
              </button>
            </form>
          ) : (
            <form id="login-form" onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                <input id="login-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required autoComplete="email"
                  className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/></div>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                <input id="login-password" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password"
                  className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/>
                <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
              <div className="text-right"><Link to="/forgot-password" className="text-xs text-brand-primary hover:text-brand-secondary transition-colors">Forgot password?</Link></div>
              <button id="login-submit" type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100">
                {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Signing in…':'Sign In'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">Don't have an account?{' '}
            <Link id="goto-signup" to="/signup" className="text-brand-primary hover:text-brand-secondary font-medium transition-colors">Create one free</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">By continuing you agree to our <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">Terms</span> &amp; <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">Privacy Policy</span></p>
      </motion.div>
    </div>
  );
}
