import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PROVIDERS = [
  { id: 'google',    label: 'Google',    icon: (<svg viewBox="0 0 24 24" className="w-4 h-4" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>) },
  { id: 'apple',     label: 'Apple',     icon: (<svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>) },
  { id: 'microsoft', label: 'Microsoft', icon: (<svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/><path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/><path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/><path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/></svg>) },
  { id: 'discord',   label: 'Discord',   icon: (<svg viewBox="0 0 24 24" className="w-4 h-4" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>) },
];

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STR_COLORS = ['','bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-emerald-400'];
const STR_LABELS = ['','Very Weak','Weak','Fair','Strong','Very Strong'];

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all duration-200";

export default function AuthModal() {
  const { modalOpen, modalTab, closeAuthModal, login, signup, loginWithOAuth, oauthStatus } = useAuth();
  const [tab, setTab]         = useState(modalTab);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [userIdFor2FA, setUserIdFor2FA] = useState(null);

  const { verify2FA } = useAuth();

  useEffect(() => { 
    setTab(modalTab); 
    setError(''); 
    setTwoFactorStep(false);
  }, [modalTab, modalOpen]);

  const strength   = getStrength(password);
  const pwMatch    = confirm.length > 0 && password === confirm;
  const pwMismatch = confirm.length > 0 && password !== confirm;

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { 
      const res = await login(email, password); 
      if (res && res.two_factor_required) {
        setTwoFactorStep(true);
        setUserIdFor2FA(res.userId);
        setLoading(false);
      }
    }
    catch (err) { setError(err.message); setLoading(false); }
  };

  const handle2FAVerify = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await verify2FA(userIdFor2FA, twoFactorCode);
      setTwoFactorStep(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (strength < 2) { setError('Choose a stronger password (min 8 chars).'); return; }
    setLoading(true);
    try { await signup(name, email, password); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  const handleOAuth = (p) => {
    if (!oauthStatus[p]) { setError(`${p} sign-in is not yet configured.`); return; }
    setOauthLoading(p); loginWithOAuth(p);
  };

  return (
    <AnimatePresence>
      {modalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeAuthModal}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-4 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[101] w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
          >
            {/* Banner bg */}
            <div className="relative bg-brand-card border border-brand-border rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage:'url(/banner.png)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.07 }} />
              <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 to-transparent pointer-events-none" />

              <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-display font-bold text-white">Starlit Siege</span>
                  </div>
                  <button onClick={closeAuthModal} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
                  {['login','signup'].map(t => (
                    <button key={t} onClick={() => { setTab(t); setError(''); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                      {t === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                {/* OAuth */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => handleOAuth(p.id)} disabled={!!oauthLoading}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition-all disabled:opacity-50 ${!oauthStatus[p.id]?'opacity-40':''}`}
                      title={!oauthStatus[p.id]?`${p.label} not configured`:`Continue with ${p.label}`}>
                      {oauthLoading===p.id?<Loader2 className="w-3 h-3 animate-spin"/>:p.icon}
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/10"/><span className="text-[10px] text-gray-600 uppercase tracking-widest">or email</span><div className="flex-1 h-px bg-white/10"/>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                      className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl px-3 py-2.5 mb-4">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/><span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <AnimatePresence mode="wait">
                  {twoFactorStep ? (
                    <motion.form key="2fa-form" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} onSubmit={handle2FAVerify} className="space-y-4">
                      <div className="text-center space-y-2 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Lock className="w-6 h-6 text-brand-primary" />
                        </div>
                        <h3 className="font-bold text-white">Two-Factor Auth</h3>
                        <p className="text-[11px] text-gray-500">Enter the 6-digit code from your authenticator app.</p>
                      </div>
                      
                      <input 
                        type="text" 
                        value={twoFactorCode} 
                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 text-2xl text-center font-mono tracking-[0.5em] text-white focus:border-brand-primary outline-none transition-all"
                        required
                        autoFocus
                      />

                      <button type="submit" disabled={loading || twoFactorCode.length < 6} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60">
                        {loading && <Loader2 className="w-4 h-4 animate-spin"/>} Verify & Sign In
                      </button>
                      <button type="button" onClick={() => setTwoFactorStep(false)} className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors">Back to Login</button>
                    </motion.form>
                  ) : tab === 'login' ? (
                    <motion.form key="login-form" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} onSubmit={handleLogin} className="space-y-3">
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <input id="modal-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required autoComplete="email" className={`${inputCls} pl-9 pr-3`}/></div>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <input id="modal-password" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" className={`${inputCls} pl-9 pr-10`}/>
                        <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
                      <div className="text-right"><Link to="/forgot-password" onClick={closeAuthModal} className="text-xs text-brand-primary hover:text-brand-secondary transition-colors">Forgot password?</Link></div>
                      <button id="modal-login-submit" type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                        {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Signing in…':'Sign In'}
                      </button>
                    </motion.form>
                  ) : (
                    <motion.form key="signup-form" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} onSubmit={handleSignup} className="space-y-3">
                      <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <input id="modal-name" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" required autoComplete="name" className={`${inputCls} pl-9 pr-3`}/></div>
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <input id="modal-signup-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required autoComplete="email" className={`${inputCls} pl-9 pr-3`}/></div>
                      <div>
                        <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                          <input id="modal-signup-pw" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create password" required autoComplete="new-password" className={`${inputCls} pl-9 pr-10`}/>
                          <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>
                        {password.length>0&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-1.5 space-y-0.5">
                          <div className="flex gap-1">{[1,2,3,4,5].map(i=><div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i<=strength?STR_COLORS[strength]:'bg-white/10'}`}/>)}</div>
                          <p className="text-[10px] text-gray-500">{STR_LABELS[strength]}</p></motion.div>}
                      </div>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                        <input id="modal-confirm-pw" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" required autoComplete="new-password"
                          className={`${inputCls} pl-9 pr-10 ${pwMismatch?'!border-red-500/60':pwMatch?'!border-green-500/60':''}`}/>
                        {pwMatch&&<CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500"/>}</div>
                      <button id="modal-signup-submit" type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                        {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Creating…':'Create Account'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                <p className="text-center text-[11px] text-gray-600 mt-4">
                  By continuing you agree to our <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">Terms</span> &amp; <span className="text-gray-500 hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
