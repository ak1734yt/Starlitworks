import { Sparkles, ShoppingBag, History, CreditCard, LogOut, Shield, Settings, Activity, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

import NotificationCenter from "./NotificationCenter";
import { getUserInvoicesByAdmin, getInvoices } from "../services/api";
const Navbar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout, openAuthModal, loading } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasInstallments, setHasInstallments] = useState(false);

  const isHome = location.pathname === "/";

  const handleProtectedLink = (path) => {
    if (!user) { openAuthModal(path, 'login'); return; }
    navigate(path);
  };

  useEffect(() => {
    if (user) {
      const fetchPromise = (user.role === 'admin' || user.role === 'manager') 
        ? getInvoices() 
        : getUserInvoicesByAdmin(user.id);
        
      fetchPromise.then(invs => {
        if (Array.isArray(invs)) {
          setHasInstallments(invs.some(i => i.paymentType === 'installment'));
        }
      }).catch(() => {});
    }
  }, [user]);

  return (
    <>
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-brand-primary/20 group-hover:scale-110 transition-transform bg-white/5">
            <img src="/logo.png" alt="SSW Logo" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-lg leading-tight">Starlit Siege Works</h1>
            <p className="text-[10px] text-brand-primary font-bold tracking-widest uppercase">Premium Solutions</p>
          </div>
        </Link>

        {/* Right Section Group (Nav + Auth) */}
        <div className="flex items-center gap-8">

        {/* Nav links (Desktop) */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link to="/about" className="hover:text-brand-primary transition-colors">About Us</Link>
          <Link to="/#portfolio" className="hover:text-brand-primary transition-colors">Portfolio</Link>
          <button onClick={() => handleProtectedLink('/shop')} className="hover:text-brand-primary transition-colors flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Shop
          </button>
          {user && (
            <>
              <Link to="/history" className="hover:text-brand-primary transition-colors flex items-center gap-1.5"><History className="w-3.5 h-3.5"/>History</Link>
              {hasInstallments && (
                <Link to="/tracker" className="hover:text-brand-primary transition-colors flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5"/>Tracker</Link>
              )}
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link to="/admin" className="hover:text-yellow-400 transition-colors flex items-center gap-1.5 text-yellow-500">
                  <Shield className="w-3.5 h-3.5"/>Admin
                </Link>
              )}
              {user.role === 'manager' && (
                <Link to="/manager" className="hover:text-brand-primary transition-colors flex items-center gap-1.5 text-brand-primary">
                  <Shield className="w-3.5 h-3.5"/>Manager
                </Link>
              )}
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && <NotificationCenter />}
          
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="lg:hidden p-2.5 glass rounded-xl text-gray-400 hover:text-white"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className={`h-0.5 bg-current rounded-full transition-all ${userMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`h-0.5 bg-current rounded-full transition-all ${userMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`h-0.5 bg-current rounded-full transition-all ${userMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>

          {user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 glass px-3 py-2 rounded-xl hover:border-brand-primary/40 transition-all"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-xs font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">{user.name}</span>
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden z-50"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-4 py-3 border-b border-brand-border">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      {user.role === 'admin' && <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">Admin</span>}
                      {user.role === 'manager' && <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">Manager</span>}
                    </div>
                    <div className="p-2 border-b border-white/5 bg-white/[0.02]">
                      <p className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account</p>
                      <button onClick={() => { navigate('/profile'); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                        <Settings className="w-4 h-4" /> Manage Account
                      </button>
                      {(user.role === 'admin' || user.role === 'manager') && (
                        <button onClick={() => { navigate('/admin'); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                          <Shield className="w-4 h-4" /> Admin Panel
                        </button>
                      )}
                      {user.role === 'manager' && (
                        <button onClick={() => { navigate('/manager'); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all font-bold">
                          <Activity className="w-4 h-4" /> Manager Panel
                        </button>
                      )}
                    </div>
                    <Link to="/history" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors">
                      <History className="w-4 h-4"/> Invoice History
                    </Link>
                    <button onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut className="w-4 h-4"/> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : loading ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => openAuthModal('/shop', 'login')} className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">Sign In</button>
              <button onClick={() => openAuthModal('/shop', 'signup')} className="btn-primary py-2 px-5 text-sm flex items-center gap-2 group">
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Get Started
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </motion.nav>

    {/* Mobile Menu Overlay */}
    <AnimatePresence>
      {userMenuOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          className="fixed inset-0 z-[60] lg:hidden"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setUserMenuOpen(false)}
          />
          
          {/* Menu Content */}
          <motion.div 
            className="absolute top-0 right-0 bottom-0 w-[80%] max-w-xs bg-brand-card border-l border-white/10 p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                </div>
                <span className="font-display font-bold">Starlit Siege</span>
              </div>
              <button onClick={() => setUserMenuOpen(false)} className="p-2 glass rounded-lg text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {user ? (
              <div className="mb-8 p-4 glass rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center font-bold">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-xl" /> : user.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                >
                  Manage Account
                </button>
              </div>
            ) : (
              <div className="grid gap-3 mb-8">
                <button onClick={() => { openAuthModal('/', 'login'); setUserMenuOpen(false); }} className="w-full py-3 glass rounded-xl text-sm font-bold">Sign In</button>
                <button onClick={() => { openAuthModal('/', 'signup'); setUserMenuOpen(false); }} className="w-full py-3 btn-primary rounded-xl text-sm font-bold">Get Started</button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Link to="/about" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <Shield className="w-4 h-4" /> About Us
              </Link>
              <Link to="/#portfolio" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <Activity className="w-4 h-4" /> Portfolio
              </Link>
              <button onClick={() => { handleProtectedLink('/shop'); setUserMenuOpen(false); }} className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                <ShoppingBag className="w-4 h-4" /> Shop
              </button>
              {user && (
                <>
                  <div className="h-px bg-white/5 my-2" />
                  <Link to="/history" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <History className="w-4 h-4" /> Invoice History
                  </Link>
                  {hasInstallments && (
                    <Link to="/tracker" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                      <CreditCard className="w-4 h-4" /> Tracker
                    </Link>
                  )}
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-yellow-500/80 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-xl transition-all font-bold">
                      <Shield className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  {user.role === 'manager' && (
                    <Link to="/manager" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 p-3 text-brand-primary hover:text-white hover:bg-brand-primary/10 rounded-xl transition-all font-bold">
                      <Shield className="w-4 h-4" /> Manager Panel
                    </Link>
                  )}
                  <div className="mt-auto pt-8">
                    <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full flex items-center gap-3 p-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all font-bold">
                      <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default Navbar;
