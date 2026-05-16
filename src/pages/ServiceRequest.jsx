import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, Send, Sparkles, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';

export default function ServiceRequest() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [products, setProducts]       = useState([]);
  const [serverLink, setServerLink]   = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [description, setDescription] = useState('');
  const [timeline, setTimeline]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (cart.length === 0 && !success) {
      navigate('/shop');
      return;
    }

    fetch(`/api/prices`)
      .then(r => r.json())
      .then(data => {
        setProducts(data);
      })
      .catch(() => setProducts([]));
  }, [cart, success, navigate]);

  const selectedProducts = products.filter(p => cart.includes(p.product_key) || cart.includes(String(p.id)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setError(''); setLoading(true);
    
    const combinedIds = cart.join(', ');
    const combinedNames = selectedProducts.map(p => p.name).join(', ');

    try {
      const token = localStorage.getItem('ssw_token');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ 
          service_id: combinedIds, 
          service_name: combinedNames || combinedIds, 
          server_link: serverLink, 
          discord_username: discordUsername,
          description, 
          timeline 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit.');
      setSuccess(true);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      {/* Banner bg */}
      <div className="fixed inset-0 -z-10">
        <div style={{ backgroundImage:'url(/banner.png)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.07 }} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/80 to-brand-bg" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-primary/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <button onClick={() => navigate('/shop')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Services
          </button>

          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-brand-card border border-brand-border rounded-2xl p-10 text-center shadow-2xl">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="inline-flex w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">Request Submitted!</h2>
              <p className="text-gray-400 mb-2">We've received your request.</p>
              <p className="text-gray-500 text-sm mb-8">Our team will review your details and prepare a custom quote within 24 hours.</p>
              <div className="bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-gray-400 text-left space-y-1 mb-8">
                <p>📬 Check your email for confirmation</p>
                <p>💬 Our team will reach out on Discord / email</p>
                <p>⏱ Typical response time: <span className="text-white">under 24 hours</span></p>
              </div>
              <button onClick={() => navigate('/')} className="btn-primary">Back to Home</button>
            </motion.div>
          ) : (
            <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-border rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">Request Quote</h1>
                  <p className="text-gray-400 text-sm">{cart.length} items selected</p>
                </div>
              </div>

              {/* Selected Items Summary */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Selected Services
                </h3>
                <div className="bg-black/20 border border-white/5 rounded-xl divide-y divide-white/5">
                  {selectedProducts.length > 0 ? selectedProducts.map(p => (
                    <div key={p.id} className="p-3 px-4 flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-300">{p.name}</span>
                      {p.is_manual_price ? (
                        <span className="text-brand-primary text-xs font-semibold">Custom Quote</span>
                      ) : (
                        <span className="text-gray-400">₹{p.price.toLocaleString()}</span>
                      )}
                    </div>
                  )) : (
                    <div className="p-4 text-sm text-gray-500">Loading selected items...</div>
                  )}
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Tell us about your server and what you need. We'll review your request and send a custom quote — no obligation.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discord Username / Tag <span className="text-red-400">*</span></label>
                    <input type="text" value={discordUsername} onChange={e => setDiscordUsername(e.target.value)} required placeholder="e.g. username#1234 or username"
                      className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project / Server Link <span className="text-gray-500">(optional)</span></label>
                    <input type="url" value={serverLink} onChange={e => setServerLink(e.target.value)} placeholder="https://discord.gg/..."
                      className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">What do you need? <span className="text-red-400">*</span></label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} placeholder="Describe your server, what you'd like set up, any special requirements..."
                    className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preferred Timeline <span className="text-gray-500">(optional)</span></label>
                  <select value={timeline} onChange={e => setTimeline(e.target.value)}
                    className="w-full bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary/60 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-all">
                    <option value="" className="bg-brand-card">No preference</option>
                    <option value="asap" className="bg-brand-card">ASAP</option>
                    <option value="1week" className="bg-brand-card">Within 1 week</option>
                    <option value="2weeks" className="bg-brand-card">Within 2 weeks</option>
                    <option value="1month" className="bg-brand-card">Within 1 month</option>
                  </select>
                </div>

                <div className="bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
                  <p>✅ Submitting this form does <strong className="text-gray-400">not</strong> charge you anything.</p>
                  <p>📩 You'll receive a custom quote for review before any payment.</p>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
