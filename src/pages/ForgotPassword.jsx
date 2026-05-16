import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to login
        </Link>

        <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-border rounded-2xl p-8 shadow-2xl shadow-black/50">
          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div key="form" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0, scale:0.95}}>
                <div className="inline-flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-white">Reset Password</h1>
                </div>
                
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"/>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" required
                      className="w-full bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all"/>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100">
                    {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{loading?'Sending Link…':'Send Reset Link'}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="text-center py-4">
                <div className="inline-flex w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">Check your inbox</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  We've sent password reset instructions to <br/><strong className="text-white font-medium">{email}</strong>
                </p>
                <button onClick={() => setSuccess(false)} className="text-sm text-brand-primary hover:text-brand-secondary transition-colors font-medium">
                  Try another email address
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
