import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const error  = params.get('error');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    if (token) {
      localStorage.setItem('ssw_token', token);
      // Trigger auth context to re-read the user from /api/auth/me
      if (typeof setUserFromToken === 'function') {
        setUserFromToken(token).then(() => {
          setStatus('success');
          setTimeout(() => navigate('/history'), 1200);
        }).catch(() => {
          setStatus('error');
          setMessage('Failed to load your profile.');
          setTimeout(() => navigate('/'), 3000);
        });
      } else {
        // Fallback: just reload the page to trigger context re-init
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/history';
        }, 1200);
      }
      return;
    }

    setStatus('error');
    setMessage('No authentication data received.');
    setTimeout(() => navigate('/'), 3000);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 p-10 bg-[#0b0c14] border border-white/10 rounded-[2.5rem] shadow-2xl max-w-sm w-full mx-6"
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Signing you in…</h2>
              <p className="text-gray-500 text-sm mt-2">Verifying your identity securely.</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">Welcome back!</h2>
              <p className="text-gray-500 text-sm mt-2">Redirecting to your dashboard…</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-red-400">Sign-in failed</h2>
              <p className="text-gray-500 text-sm mt-2">{message || 'Something went wrong. Redirecting…'}</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
