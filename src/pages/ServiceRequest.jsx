import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Loader2, Send, Sparkles, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import ChatBubble from '../components/ChatBubble';

export default function ServiceRequest() {
  const { user } = useAuth();
  const { cart, cartIds, clearCart, getQuantity } = useCart();
  const navigate = useNavigate();

  const [products, setProducts]       = useState([]);
  const [serverLink, setServerLink]   = useState('');
  const [discordUsername, setDiscordUsername] = useState(() => {
    try {
      const details = typeof user?.details === 'string' ? JSON.parse(user.details) : user?.details;
      return details?.discord_username || user?.name || '';
    } catch {
      return user?.name || '';
    }
  });
  const [description, setDescription] = useState('');
  const [timeline, setTimeline]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (cartIds.length === 0) {
      navigate('/shop');
      return;
    }

    fetch(`/api/prices`)
      .then(r => r.json())
      .then(data => {
        setProducts(data);
      })
      .catch(() => setProducts([]));
  }, [cartIds, navigate]);

  const selectedProducts = products.filter(p => cartIds.includes(p.product_key) || cartIds.includes(String(p.id)) || cartIds.includes(Number(p.id)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartIds.length === 0) return;
    
    setError(''); setLoading(true);
    
    const combinedIds = cartIds.join(', ');
    const combinedNames = selectedProducts.map(p => {
      const qty = getQuantity(p.product_key || String(p.id));
      return qty > 1 ? `${p.name} (x${qty})` : p.name;
    }).join(', ');

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
      clearCart();
      navigate('/history');
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
              <div className="bg-black/20 border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
                {selectedProducts.length > 0 ? selectedProducts.map(p => {
                  const qty = getQuantity(p.product_key || String(p.id));
                  const itemTotal = p.price * qty;
                  return (
                    <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                           <ShoppingBag className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-200">{p.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 capitalize">{p.category?.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest">QTY</span>
                          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm">{qty}</span>
                        </div>
                        <div className="text-right min-w-[80px]">
                          {p.is_manual_price ? (
                            <span className="text-brand-primary text-xs font-bold uppercase tracking-wide">Request for Price</span>
                          ) : (
                            <span className="text-lg font-black text-white">₹{itemTotal.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-6 text-sm text-center text-gray-500">Loading selected items...</div>
                )}
              </div>
            </div>

              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Tell us about your server and what you need. We'll review your request and send a price — no obligation.
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
                  <p>📩 You'll receive a price request response for review before any payment.</p>
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </div>
        </motion.div>
      </div>
      <ChatBubble />
    </div>
  );
}
