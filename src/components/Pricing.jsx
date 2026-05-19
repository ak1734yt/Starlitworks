import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star, Bot, Settings, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Pricing = () => {
  const { user, openAuthModal } = useAuth();
  const { convertPrice } = useTheme();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => { setAllPlans(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const serverPlans = allPlans.filter(p => p.category === 'server' || p.category === 'server_setup');
  const botPlans = allPlans.filter(p => p.category === 'bot' || p.category === 'custom_bots');
  const otherPlans = allPlans.filter(p => p.category !== 'server' && p.category !== 'server_setup' && p.category !== 'bot' && p.category !== 'custom_bots');

  const handleOrder = () => {
    if (!user) { openAuthModal('/shop', 'login'); return; }
    navigate('/shop');
  };

  const isHighlighted = (planTag) => {
    if (!planTag) return false;
    const t = planTag.toLowerCase();
    return t.includes('sold') || t.includes('popular') || t.includes('best') || t.includes('value');
  };

  const renderPlansGrid = (plans) => (
    <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-md mx-auto' : plans.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : plans.length === 3 ? 'md:grid-cols-3 max-w-5xl mx-auto' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
      {plans.map((plan, index) => {
        const highlighted = isHighlighted(plan.tag);
        const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 group cursor-default
              ${highlighted
                ? 'border-brand-primary/50 bg-brand-primary/5 shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] hover:shadow-[0_0_60px_-5px_rgba(124,58,237,0.4)]'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
          >
            {plan.tag && (
              <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap ${
                highlighted ? 'bg-brand-primary text-white' : 'bg-white/10 text-gray-300 border border-white/10'
              }`}>
                {highlighted && <Star className="w-3 h-3 fill-white" />}
                {plan.tag}
              </div>
            )}

            <div className="mb-6 pt-2">
              <h3 className="text-lg font-bold mb-2 group-hover:text-brand-primary transition-colors">{plan.name}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{plan.description}</p>
            </div>

            <div className="mb-6">
              {plan.is_manual_price ? (
                <span className="text-2xl font-extrabold font-display text-brand-primary">Custom Quote</span>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold font-display">{convertPrice(plan.price)}</span>
                  <span className="text-gray-500 text-xs">{plan.unit_label || '/setup'}</span>
                </div>
              )}
              <p className="text-[10px] text-gray-600 mt-1">Price confirmed before work begins</p>
            </div>

            {features.length > 0 && (
              <ul className="space-y-2.5 mb-6 flex-grow">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-400">
                    <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={handleOrder}
              className={`mt-auto flex items-center justify-center gap-2 group/btn w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                highlighted ? 'btn-primary' : 'bg-white/5 border border-white/10 hover:bg-brand-primary hover:border-brand-primary hover:text-white'
              }`}
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-24">
        
        {/* Server Packages */}
        <div>
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              Discord Servers
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Server <span className="text-gradient">Packages</span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              Professional Discord server architecture, design, permissions setup, and custom styling.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
          ) : serverPlans.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No server packages configured.</div>
          ) : (
            renderPlansGrid(serverPlans)
          )}
        </div>

        {/* Bot Packages */}
        <div>
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full glass text-brand-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              Custom Bots
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Bot <span className="text-gradient">Packages</span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              Tailored automation systems, support ticket bots, verification managers, and moderation tools.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
            </div>
          ) : botPlans.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No bot packages configured.</div>
          ) : (
            renderPlansGrid(botPlans)
          )}
        </div>

        {/* Other Shop Menu */}
        <div>
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full glass text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              Services Catalog
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Other <span className="text-emerald-400">Shop Menu</span>
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              Explore subscriptions, promotion packages, account upgrades, server boosts, and profile decorations.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : otherPlans.length === 0 ? (
            <div className="text-center py-10 text-gray-600">No other shop items configured.</div>
          ) : (
            renderPlansGrid(otherPlans)
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-10">
          Need something unique?{' '}
          <button onClick={handleOrder} className="text-brand-primary hover:text-brand-secondary transition-colors font-medium">
            Contact us for a custom quote →
          </button>
        </p>
      </div>
    </section>
  );
};

export default Pricing;
