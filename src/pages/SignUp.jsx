import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STR_COLORS = ['','bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-emerald-400'];
const STR_LABELS = ['','Very Weak','Weak','Fair','Strong','Very Strong'];

export default function SignUp() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const pwMatch = confirm.length > 0 && password === confirm;
  const pwMismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (strength < 2) {
      setError('Please choose a stronger password (min 8 chars).');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Banner background */}
      <div className="absolute inset-0 -z-10">
        <div style={{ backgroundImage:'url(/banner.png)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.12 }} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/60 via-brand-bg/40 to-brand-bg/70" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-brand-secondary/15 blur-[100px] rounded-full" />
      </div>

      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gradient">Starlit Siege</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm">Join us and start building your custom solutions</p>
        </div>

        <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-border rounded-2xl p-8 shadow-2xl shadow-black/50">
          <AnimatePresence>
            {error && (
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/><span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" required autoComplete="name"
                className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/>
            </div>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required autoComplete="email"
                className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/>
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create password" required autoComplete="new-password"
                  className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/>
                <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                </button>
              </div>
              
              {password.length > 0 && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-2 space-y-1.5 px-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STR_COLORS[strength] : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium uppercase tracking-wider ${STR_COLORS[strength].replace('bg-','text-')}`}>{STR_LABELS[strength]}</p>
                </motion.div>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" required autoComplete="new-password"
                className={`w-full bg-white/5 border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-all ${
                  pwMismatch ? 'border-red-500/60 focus:border-red-500/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : 
                  pwMatch ? 'border-green-500/60 focus:border-green-500/60 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]' : 
                  'border-brand-border focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]'
                }`}/>
              {pwMatch && <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100">
              {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Creating Account…':'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">Already have an account?{' '}
            <Link to="/login" className="text-brand-primary hover:text-brand-secondary font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
