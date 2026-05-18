import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Star, Bot, Settings, Sparkles, ArrowRight, Loader2, Code2, CalendarDays, Users, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";

const CATEGORIES = [
  { id: 'server',  label: 'Server Setup',       icon: Settings,     color: 'from-violet-500 to-purple-600',  desc: 'Professional Discord server architecture' },
  { id: 'bot',     label: 'Custom Bots',         icon: Bot,          color: 'from-blue-500 to-cyan-500',      desc: 'Tailored automation solutions' },
  { id: 'scripts', label: 'Custom Scripts',      icon: Code2,        color: 'from-emerald-500 to-teal-500',   desc: 'VC Joiner, Mass Sender, Auto React' },
  { id: 'events',  label: 'Event Management',    icon: CalendarDays, color: 'from-orange-500 to-amber-500',   desc: 'Full event hosting & promotion' },
  { id: 'joins',   label: 'Joins & Members',     icon: Users,        color: 'from-pink-500 to-rose-500',      desc: 'Grow your server members' },
  { id: 'addon',   label: 'Add-ons',             icon: Zap,          color: 'from-yellow-500 to-amber-400',   desc: 'Extras & upgrades for any plan' },
  { id: 'infra',   label: 'Infrastructure',      icon: Sparkles,     color: 'from-slate-500 to-gray-600',     desc: 'Hosting, databases & more' },
];

const Pricing = () => {
  const { user, openAuthModal } = useAuth();
  const { convertPrice } = useTheme();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState([]);
  const [activeCategory, setActiveCategory] = useState('server');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => { setAllPlans(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const plans = allPlans.filter(p => p.category === activeCategory);
  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  const handleOrder = () => {
    if (!user) { openAuthModal('/shop', 'login'); return; }
    navigate('/shop');
  };

  const isHighlighted = (tag) => {
    if (!tag) return false;
    const t = tag.toLowerCase();
    return t.includes('sold') || t.includes('popular') || t.includes('best') || t.includes('value');
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1.5 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            All Services
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Premium <span className="text-gradient">Service Plans</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
            All prices are starting quotes — final cost is discussed and confirmed before any work begins.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-3 scrollbar-none justify-center flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap border ${
                  isActive
                    ? 'bg-brand-primary border-brand-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Category Info Strip */}
        {activeCat && (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeCat.color} flex items-center justify-center shrink-0`}>
              <activeCat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">{activeCat.label}</p>
              <p className="text-xs text-gray-500">{activeCat.desc}</p>
            </div>
          </motion.div>
        )}

        {/* Legal Disclaimer for Joins */}
        {activeCategory === 'joins' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/80 text-xs font-medium text-center"
          >
            Disclaimer: Our Join & Member growth services are strictly promotional and adhere to Discord's Terms of Service. We do not use self-bots or engage in artificial inflation that violates platform guidelines.
          </motion.div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-gray-600">No plans in this category yet.</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`grid gap-6 ${plans.length <= 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}
            >
              {plans.map((plan, index) => {
                const highlighted = isHighlighted(plan.tag);
                const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.06, duration: 0.3 }}
                    className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 group cursor-default
                      ${highlighted
                        ? 'border-brand-primary/50 bg-brand-primary/5 shadow-[0_0_50px_-10px_rgba(124,58,237,0.3)] hover:shadow-[0_0_60px_-5px_rgba(124,58,237,0.4)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                  >
                    {/* Tag Badge */}
                    {plan.tag && (
                      <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap ${
                        highlighted ? 'bg-brand-primary text-white' : 'bg-white/10 text-gray-300 border border-white/10'
                      }`}>
                        {highlighted && <Star className="w-3 h-3 fill-white" />}
                        {plan.tag}
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="mb-6 pt-2">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-brand-primary transition-colors">{plan.name}</h3>
                      <p className="text-gray-500 text-xs leading-relaxed">{plan.description}</p>
                    </div>

                    {/* Price */}
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

                    {/* Features */}
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

                    {/* CTA */}
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
            </motion.div>
          </AnimatePresence>
        )}

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
