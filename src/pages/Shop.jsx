import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Sparkles, Bot, Server, Database, Loader2, ShoppingBag } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Shop() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { cart, toggleItem } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleProceed = () => {
    if (!user) {
      openAuthModal('/service-request', 'login');
      return;
    }
    navigate('/service-request');
  };

  const servers = products.filter(p => p.category === 'server');
  const addons  = products.filter(p => p.category === 'addon');
  const bots    = products.filter(p => p.category === 'bot');
  const infra   = products.filter(p => p.category === 'infra');
  const scripts = products.filter(p => p.category === 'scripts');
  const events  = products.filter(p => p.category === 'events');
  const joins   = products.filter(p => p.category === 'joins');

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const PriceDisplay = ({ product, isSmall = false }) => {
    if (product.is_manual_price) {
      return <p className={`font-semibold text-brand-primary ${isSmall ? 'text-xs' : 'text-sm mb-6'}`}>Custom Quote</p>;
    }
    return (
      <div className={`flex items-baseline gap-1 ${isSmall ? '' : 'mb-6'}`}>
        <span className={`font-bold text-white ${isSmall ? 'text-sm' : 'text-2xl font-display'}`}>₹{product.price.toLocaleString()}</span>
        {product.unit_label && <span className="text-gray-500 text-xs">{product.unit_label}</span>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white pb-32">
      <Navbar />
      
      <main className="pt-32 max-w-7xl mx-auto px-6 relative">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-brand-primary font-bold tracking-widest uppercase text-xs mb-3 px-3 py-1 glass rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Services
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Premium <span className="text-gradient">Solutions</span>
          </h1>
          <p className="text-gray-400">
            Select the services you need. We'll provide a tailored, no-obligation quote for your exact requirements.
          </p>
        </div>

        {/* --- SERVER PLANS --- */}
        {servers.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Server className="w-6 h-6 text-brand-primary" />
              Server Packages
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {servers.map(plan => {
                const isSelected = cart.includes(plan.product_key || String(plan.id));
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -5 }}
                    onClick={() => toggleItem(plan.product_key || String(plan.id))}
                    className={`glass-card flex flex-col relative border-2 transition-all p-6 cursor-pointer group ${isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5 hover:border-brand-primary/30'}`}
                  >
                    {plan.tag && (
                      <div className="absolute -top-3 -right-3 bg-brand-primary text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                        {plan.tag}
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-2 flex-grow">{plan.description}</p>
                    <PriceDisplay product={plan} />
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-brand-primary mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button 
                      className={`w-full py-2.5 rounded-xl font-medium transition-colors ${isSelected ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- ADDONS --- */}
        {addons.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-brand-secondary" />
              Server Add-ons
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map(addon => {
                const isSelected = cart.includes(addon.product_key || String(addon.id));
                return (
                  <div 
                    key={addon.id} 
                    onClick={() => toggleItem(addon.product_key || String(addon.id))}
                    className={`glass p-5 rounded-2xl flex flex-col justify-between border-2 cursor-pointer transition-all ${isSelected ? 'border-brand-secondary bg-brand-secondary/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg mb-1">{addon.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-brand-secondary" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{addon.description}</p>
                      <PriceDisplay product={addon} isSmall />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- BOT PLANS --- */}
        {bots.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Bot className="w-6 h-6 text-green-400" />
              Bot Packages
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map(bot => {
                const isSelected = cart.includes(bot.product_key || String(bot.id));
                return (
                  <div 
                    key={bot.id} 
                    onClick={() => toggleItem(bot.product_key || String(bot.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected ? 'border-green-400 bg-green-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{bot.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{bot.description}</p>
                      <PriceDisplay product={bot} />
                      
                      <ul className="space-y-2">
                        {bot.features.map((f, i) => (
                          <li key={i} className="text-[11px] text-gray-400 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400/50" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- CUSTOM SCRIPTS --- */}
        {scripts.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-teal-400" />
              Custom Scripts
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scripts.map(script => {
                const isSelected = cart.includes(script.product_key || String(script.id));
                return (
                  <div 
                    key={script.id} 
                    onClick={() => toggleItem(script.product_key || String(script.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected ? 'border-teal-400 bg-teal-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{script.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{script.description}</p>
                      <PriceDisplay product={script} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- EVENTS --- */}
        {events.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-orange-400" />
              Event Management
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => {
                const isSelected = cart.includes(event.product_key || String(event.id));
                return (
                  <div 
                    key={event.id} 
                    onClick={() => toggleItem(event.product_key || String(event.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected ? 'border-orange-400 bg-orange-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{event.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-orange-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{event.description}</p>
                      <PriceDisplay product={event} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- JOINS --- */}
        {joins.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-pink-400" />
              Joins & Members
            </h2>
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/80 text-xs font-medium text-center">
              Disclaimer: Our Join & Member growth services are strictly promotional and adhere to Discord's Terms of Service. We do not use self-bots or engage in artificial inflation that violates platform guidelines.
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joins.map(join => {
                const isSelected = cart.includes(join.product_key || String(join.id));
                return (
                  <div 
                    key={join.id} 
                    onClick={() => toggleItem(join.product_key || String(join.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected ? 'border-pink-400 bg-pink-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{join.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-pink-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{join.description}</p>
                      <PriceDisplay product={join} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- INFRASTRUCTURE --- */}
        {infra.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-400" />
              Infrastructure & Hosting
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {infra.map(item => {
                const isSelected = cart.includes(item.product_key || String(item.id));
                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleItem(item.product_key || String(item.id))}
                    className={`glass p-5 rounded-2xl flex items-center justify-between border-2 cursor-pointer transition-colors ${isSelected ? 'border-blue-400 bg-blue-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div>
                      <span className="font-medium block">{item.name}</span>
                      <span className="text-[10px] text-gray-500 block mb-1">{item.description}</span>
                      <PriceDisplay product={item} isSmall />
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white"><Check className="w-3 h-3" /></div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-white/20" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* --- CART BOTTOM BAR --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4"
          >
            <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-primary/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(124,58,237,0.3)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{cart.length} item{cart.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-gray-400">Ready to get your custom quote?</p>
                </div>
              </div>
              <button 
                onClick={handleProceed}
                className="btn-primary flex items-center gap-2"
              >
                Proceed <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
