import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Sparkles, Bot, Server, Database, Loader2, ShoppingBag } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Shop() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { cart, toggleItem, isSelected, getQuantity, setQuantity } = useCart();
  const { convertPrice } = useTheme();
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

  const servers       = products.filter(p => p.category === 'server');
  const addons        = products.filter(p => p.category === 'addon');
  const bots          = products.filter(p => p.category === 'bot');
  const infra         = products.filter(p => p.category === 'infra');
  const scripts       = products.filter(p => p.category === 'scripts');
  const events        = products.filter(p => p.category === 'events');
  const joins         = products.filter(p => p.category === 'joins');
  const decoGift      = products.filter(p => p.category === 'decorations_gift');
  const decoLogin     = products.filter(p => p.category === 'decorations_login');
  const nitroAccounts = products.filter(p => p.category === 'nitro_accounts');
  const boosters      = products.filter(p => p.category === 'booster');
  const promo         = products.filter(p => p.category === 'promo');

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
        <span className={`font-bold text-white ${isSmall ? 'text-sm' : 'text-2xl font-display'}`}>{convertPrice(product.price)}</span>
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
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -5 }}
                    onClick={() => toggleItem(plan.product_key || String(plan.id))}
                    className={`glass-card flex flex-col relative border-2 transition-all p-6 cursor-pointer group ${isSelected(plan.product_key || String(plan.id)) ? 'border-brand-primary bg-brand-primary/5' : 'border-white/5 hover:border-brand-primary/30'}`}
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
                      {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-brand-primary mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button 
                      className={`w-full py-2.5 rounded-xl font-medium transition-colors ${isSelected(plan.product_key || String(plan.id)) ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {isSelected(plan.product_key || String(plan.id)) ? 'Selected ✓' : 'Select'}
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
                return (
                  <div 
                    key={addon.id} 
                    onClick={() => toggleItem(addon.product_key || String(addon.id))}
                    className={`glass p-5 rounded-2xl flex flex-col justify-between border-2 cursor-pointer transition-all ${isSelected(addon.product_key || String(addon.id)) ? 'border-brand-secondary bg-brand-secondary/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg mb-1">{addon.name}</h3>
                        {isSelected(addon.product_key || String(addon.id)) && <Check className="w-4 h-4 text-brand-secondary" />}
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
                return (
                  <div 
                    key={bot.id} 
                    onClick={() => toggleItem(bot.product_key || String(bot.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected(bot.product_key || String(bot.id)) ? 'border-green-400 bg-green-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{bot.name}</h3>
                        {isSelected(bot.product_key || String(bot.id)) && <Check className="w-4 h-4 text-green-400" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{bot.description}</p>
                      <PriceDisplay product={bot} />
                      
                      <ul className="space-y-2">
                        {(Array.isArray(bot.features) ? bot.features : []).map((f, i) => (
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
                return (
                  <div 
                    key={script.id} 
                    onClick={() => toggleItem(script.product_key || String(script.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected(script.product_key || String(script.id)) ? 'border-teal-400 bg-teal-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{script.name}</h3>
                        {isSelected(script.product_key || String(script.id)) && <Check className="w-4 h-4 text-teal-400" />}
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
                return (
                  <div 
                    key={event.id} 
                    onClick={() => toggleItem(event.product_key || String(event.id))}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col ${isSelected(event.product_key || String(event.id)) ? 'border-orange-400 bg-orange-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="mb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{event.name}</h3>
                        {isSelected(event.product_key || String(event.id)) && <Check className="w-4 h-4 text-orange-400" />}
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
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-pink-400" />
              Joins & Members
            </h2>
            <p className="text-gray-500 text-sm mb-4">Select how many members/tokens you want. Quantity = thousands (e.g. 2 = 2K).</p>
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/80 text-xs font-medium text-center">
              Disclaimer: Our Join & Member growth services are strictly promotional and adhere to Discord's Terms of Service.
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joins.map(join => {
                const key = join.product_key || String(join.id);
                const selected = isSelected(key);
                const qty = getQuantity(key);
                const isMemberType = /member|join|offline|online/i.test(join.name);
                const isTokenType  = /token/i.test(join.name);
                const hasQty = isMemberType || isTokenType;
                const qtyLabel = isMemberType
                  ? `${qty}K Members`
                  : isTokenType
                  ? `${qty.toLocaleString()} Tokens`
                  : `Qty: ${qty}`;

                return (
                  <div
                    key={join.id}
                    className={`glass-card border-2 transition-all flex flex-col ${selected ? 'border-pink-400 bg-pink-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div
                      onClick={() => toggleItem(key)}
                      className="cursor-pointer p-6 pb-3 flex-grow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{join.name}</h3>
                        {selected && <Check className="w-4 h-4 text-pink-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{join.description}</p>
                      <PriceDisplay product={join} />
                    </div>

                    {selected && hasQty && (
                      <div className="px-6 pb-5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                          Quantity — <span className="text-pink-400">{qtyLabel}</span>
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setQuantity(key, Math.max(1, Number(qty) - 1)); }}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-lg transition-all"
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setQuantity(key, parseInt(e.target.value) || 1)}
                            className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 text-sm font-bold text-white focus:outline-none focus:border-pink-400 transition-all"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); setQuantity(key, Number(qty) + 1); }}
                            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-lg transition-all"
                          >+</button>
                        </div>
                        {isMemberType && (
                          <p className="text-[10px] text-gray-600 mt-1.5 text-center">Each unit = 1,000 members</p>
                        )}
                      </div>
                    )}
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
                const selected = isSelected(item.product_key || String(item.id));
                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleItem(item.product_key || String(item.id))}
                    className={`glass p-5 rounded-2xl flex items-center justify-between border-2 cursor-pointer transition-colors ${selected ? 'border-blue-400 bg-blue-400/5' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div>
                      <span className="font-medium block">{item.name}</span>
                      <span className="text-[10px] text-gray-500 block mb-1">{item.description}</span>
                      <PriceDisplay product={item} isSmall />
                    </div>
                    {selected ? (
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

        {/* --- DECORATIONS VIA GIFT LINK --- */}
        {decoGift.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              Decorations via Gift Link
            </h2>
            <p className="text-gray-500 text-sm mb-8">Discord profile decorations delivered via secure gift link. 47h fresh links, instant delivery.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {decoGift.map(item => {
                const key = item.product_key || String(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-5 rounded-2xl relative ${isSelected(key) ? 'border-purple-400 bg-purple-400/5' : 'border-white/5 hover:border-purple-400/30'}`}
                  >
                    {item.tag && (
                      <div className="text-[9px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full mb-3 inline-block w-fit">
                        {item.tag.split('|')[0].trim()}
                      </div>
                    )}
                    <h3 className="font-bold text-sm mb-1 leading-tight">{item.name}</h3>
                    <p className="text-[10px] text-gray-500 mb-3 flex-grow leading-relaxed">{item.description.split('[Admin')[0].trim()}</p>
                    <p className="text-xs font-semibold text-purple-400 mb-3">Custom Quote</p>
                    <ul className="space-y-1 mb-4">
                      {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Check className="w-3 h-3 text-purple-400 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isSelected(key) ? 'bg-purple-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}>
                      {isSelected(key) ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- DECORATIONS VIA LOGIN --- */}
        {decoLogin.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-2xl">🔐</span>
              Decorations via Login
            </h2>
            <p className="text-gray-500 text-sm mb-8">Applied directly to your account. You provide email + password. All transactions legally paid.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {decoLogin.map(item => {
                const key = item.product_key || String(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-5 rounded-2xl relative ${isSelected(key) ? 'border-indigo-400 bg-indigo-400/5' : 'border-white/5 hover:border-indigo-400/30'}`}
                  >
                    {item.tag && (
                      <div className="text-[9px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-full mb-3 inline-block w-fit">
                        {item.tag.split('|')[0].trim()}
                      </div>
                    )}
                    <h3 className="font-bold text-sm mb-1 leading-tight">{item.name}</h3>
                    <p className="text-[10px] text-gray-500 mb-3 flex-grow leading-relaxed">{item.description.split('[Admin')[0].trim()}</p>
                    <p className="text-xs font-semibold text-indigo-400 mb-3">Custom Quote</p>
                    <ul className="space-y-1 mb-4">
                      {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Check className="w-3 h-3 text-indigo-400 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isSelected(key) ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}>
                      {isSelected(key) ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- NITRO ACCOUNTS --- */}
        {nitroAccounts.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-2xl">✨</span>
              Nitro Accounts
            </h2>
            <p className="text-gray-500 text-sm mb-8">Freshly claimed Discord Nitro accounts with full access. Boosts included where specified.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {nitroAccounts.map(item => {
                const key = item.product_key || String(item.id);
                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -3 }}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-6 rounded-2xl relative ${isSelected(key) ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/5 hover:border-cyan-400/30'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {item.tag && (
                          <div className="text-[9px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full mb-2 inline-block">
                            {item.tag.split('|')[0].trim()}
                          </div>
                        )}
                        <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                      </div>
                      {isSelected(key) && <Check className="w-5 h-5 text-cyan-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">{item.description.split('[Admin')[0].trim()}</p>
                    <p className="text-sm font-semibold text-cyan-400 mb-4">Custom Quote</p>
                    <ul className="space-y-2 mb-5">
                      {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-3 rounded-xl text-sm font-bold transition-all mt-auto ${isSelected(key) ? 'bg-cyan-500 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}>
                      {isSelected(key) ? 'Selected ✓' : 'Request Quote'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- SERVER BOOSTERS --- */}
        {boosters.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              Server Boosters
            </h2>
            <p className="text-gray-500 text-sm mb-8">14x high-quality server boosts. Choose between login-based or VCC. Full revoke warranty included.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {boosters.map(item => {
                const key = item.product_key || String(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-5 rounded-2xl ${isSelected(key) ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/5 hover:border-yellow-400/30'}`}
                  >
                    {item.tag && (
                      <div className="text-[9px] font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full mb-3 inline-block w-fit">
                        {item.tag.split('|')[0].trim()}
                      </div>
                    )}
                    <h3 className="font-bold text-sm mb-1 leading-snug">{item.name}</h3>
                    <p className="text-[10px] text-gray-500 mb-3 flex-grow leading-relaxed">{item.description.split('[Admin')[0].trim()}</p>
                    <p className="text-xs font-semibold text-yellow-400 mb-3">Custom Quote</p>
                    <ul className="space-y-1 mb-4">
                      {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Check className="w-3 h-3 text-yellow-400 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isSelected(key) ? 'bg-yellow-500 text-black' : 'bg-white/5 hover:bg-white/10'}`}>
                      {isSelected(key) ? 'Selected ✓' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* --- SERVER PROMOTIONS --- */}
        {promo.length > 0 && (
          <section className="mb-20">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-2xl">📢</span>
              Server Promotion Services
            </h2>
            <p className="text-gray-500 text-sm mb-2">Grow your Discord server across multiple communities. Pricing depends on delivery speed and promotion members.</p>
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
              📦 Requirements: Server Logo/Icon · Server Name · Promotion Description
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {promo.map(item => {
                const key = item.product_key || String(item.id);
                const isExpress = item.name.toLowerCase().includes('express');
                const accent = isExpress ? 'orange' : 'blue';
                const accentClasses = isExpress
                  ? { border: 'border-orange-400', bg: 'bg-orange-400/5', hover: 'hover:border-orange-400/30', check: 'text-orange-400', badge: 'text-orange-300 bg-orange-500/10 border-orange-500/20', btn: 'bg-orange-500 text-white' }
                  : { border: 'border-blue-400', bg: 'bg-blue-400/5', hover: 'hover:border-blue-400/30', check: 'text-blue-400', badge: 'text-blue-300 bg-blue-500/10 border-blue-500/20', btn: 'bg-blue-500 text-white' };
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(key)}
                    className={`glass-card border-2 cursor-pointer transition-all flex flex-col p-5 rounded-2xl ${isSelected(key) ? `${accentClasses.border} ${accentClasses.bg}` : `border-white/5 ${accentClasses.hover}`}`}
                  >
                    {item.tag && (
                      <div className={`text-[9px] font-bold px-2 py-1 rounded-full mb-3 inline-block w-fit border ${accentClasses.badge}`}>
                        {item.tag.split('|')[0].trim()}
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm mb-1 leading-snug flex-1">{item.name}</h3>
                      {isSelected(key) && <Check className={`w-4 h-4 shrink-0 ${accentClasses.check}`} />}
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 flex-grow leading-relaxed">{item.description.split('[Admin')[0].trim()}</p>
                    <p className={`text-xs font-semibold mb-3 ${accentClasses.check}`}>Custom Quote</p>
                    <ul className="space-y-1 mb-4">
                      {(Array.isArray(item.features) ? item.features : []).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Check className={`w-3 h-3 shrink-0 ${accentClasses.check}`} />{f}
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${isSelected(key) ? accentClasses.btn : 'bg-white/5 hover:bg-white/10'}`}>
                      {isSelected(key) ? 'Selected ✓' : 'Select'}
                    </button>
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
