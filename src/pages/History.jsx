import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, AlertCircle, Clock, ShoppingBag, MessageSquare, Check, X, 
  ShieldAlert, Send, CreditCard, Zap, FileText, Download, Activity, 
  Globe, Monitor, MapPin, Sparkles, ChevronRight, UserCircle2, ArrowRight,
  Headphones, PlusCircle, HelpCircle, Layers, CreditCard as CardIcon, LayoutDashboard,
  KeyRound, Lock, Gift, Users, Award, DollarSign, Copy, Eye, Info, Loader2, Link2
} from 'lucide-react';
import UserChat from '../components/UserChat';
import { negotiateOrder, acceptOrder, getUserInvoicesByAdmin, getMyOrders, getReferralInfo, getOrderUpdates, requestWithdrawal, convertReferralPoints, linkReferralCode, lookupReferralCode } from '../services/api';
import Navbar from '../components/Navbar';
import InvoicePreview from '../components/InvoicePreview';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getFriendlyServiceName = (name) => {
  if (!name || String(name).includes('[object Object]') || String(name).trim() === '') {
    return 'Custom Premium Setup';
  }
  return name;
};

const getFriendlyInvoiceDesc = (inv) => {
  const item = inv.items?.[0];
  if (!item) return 'Custom Deliverable';
  
  if (typeof item === 'string') {
    if (item.includes('[object Object]')) return 'Custom Setup Pack';
    return item;
  }
  
  const desc = item.description || item.desc || item.name;
  if (!desc) return 'Custom Deliverable';
  
  if (typeof desc === 'object') {
    return 'Custom Deliverable';
  }
  
  if (String(desc).includes('[object Object]')) {
    return 'Custom Setup Pack';
  }
  
  return String(desc);
};

export default function History() {
  const { user, refreshMe } = useAuth();
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Tab states
  const [portalTab, setPortalTab] = useState('overview'); // overview, services, billing
  
  // Modals & Chat
  const [chatOrder, setChatOrder] = useState(null);
  const [negotiatingOrder, setNegotiatingOrder] = useState(null);
  const [vaultOrder, setVaultOrder] = useState(null);
  const [negotiationForm, setNegotiationForm] = useState({ price: '', reason: '' });
  
  // Premium Vault Safe Unlocking Animation
  const [vaultUnlockStep, setVaultUnlockStep] = useState('pin'); // pin, opening, unlocked
  const [vaultPin, setVaultPin] = useState(['', '', '', '']);

  // Filters for My Services page
  const [serviceStatusTab, setServiceStatusTab] = useState('all'); // all, active, pending, completed
  const [serviceSearch, setServiceSearch] = useState('');
  const [servicePage, setServicePage] = useState(1);
  const [servicesPerPage] = useState(8);

  // Referral system
  const [referralInfo, setReferralInfo] = useState(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPaymentInfo, setWithdrawPaymentInfo] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);

  // Referral linking (for users who missed it at signup)
  const [refCodeInput, setRefCodeInput] = useState('');
  const [linkingRef, setLinkingRef] = useState(false);
  const [referrerLookupName, setReferrerLookupName] = useState('');

  // Popout Invoice Details modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  
  const [pointsToConvert, setPointsToConvert] = useState('');
  const [convertingPoints, setConvertingPoints] = useState(false);

  const handleConvertPoints = async (e) => {
    if (e) e.preventDefault();
    const pts = parseInt(pointsToConvert);
    if (!pointsToConvert || isNaN(pts) || pts <= 0) {
      toast.error('Please enter a valid amount of points');
      return;
    }
    if (pts % 5 !== 0) {
      toast.error('Points must be converted in multiples of 5 (5 pts = ₹1)');
      return;
    }
    if (pts > (referralInfo?.ripple_points || 0)) {
      toast.error('Insufficient Ripple Points');
      return;
    }

    setConvertingPoints(true);
    try {
      const res = await convertReferralPoints(pts);
      toast.success(res.message || `Successfully converted ${pts} points into credits!`);
      setPointsToConvert('');
      
      // Reload referral info
      const ref = await getReferralInfo();
      setReferralInfo(ref);
      load(); // Refresh other stats
    } catch (err) {
      toast.error(err.message || 'Points conversion failed');
    } finally {
      setConvertingPoints(false);
    }
  };

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(amount) || amount < 1000) {
      toast.error('Minimum withdrawal amount is ₹1,000');
      return;
    }
    if (amount > (referralInfo?.referral_balance || 0)) {
      toast.error('Insufficient referral balance');
      return;
    }
    if (!withdrawPaymentInfo.trim()) {
      toast.error('Please enter valid payment details (UPI ID or Bank Details)');
      return;
    }

    setWithdrawing(true);
    try {
      await requestWithdrawal(amount, withdrawPaymentInfo);
      toast.success(`Withdrawal request of ₹${amount} submitted!`);
      setWithdrawAmount('');
      setWithdrawPaymentInfo('');
      setWithdrawModalOpen(false);
      // Reload referral info
      const ref = await getReferralInfo();
      setReferralInfo(ref);
    } catch (err) {
      toast.error(err.message || 'Withdrawal request failed');
    } finally {
      setWithdrawing(false);
    }
  };

  // Order progress feed
  const [expandedOrderUpdates, setExpandedOrderUpdates] = useState(null);
  const [orderUpdates, setOrderUpdates] = useState({});

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (_) {
      if (!silent) toast.error('Failed to load orders');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (user?.id) {
        const invRes = await getUserInvoicesByAdmin(user.id);
        if (invRes && !invRes.error) {
          setInvoices(invRes);
        }
      }
    } catch (_) {
      if (!silent) toast.error('Failed to load invoices');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadReferrals = async (silent = false) => {
    if (!silent) setReferralLoading(true);
    try {
      const ref = await getReferralInfo();
      setReferralInfo(ref);
    } catch (_) {
      if (!silent) toast.error('Failed to load referral details');
    } finally {
      if (!silent) setReferralLoading(false);
    }
  };

  const load = async (silent = false) => {
    if (portalTab === 'services') await loadOrders(silent);
    else if (portalTab === 'billing') await loadInvoices(silent);
    else if (portalTab === 'referrals') await loadReferrals(silent);
    else if (portalTab === 'subscriptions') await loadOrders(silent);
    else {
      await loadOrders(silent);
      await loadInvoices(silent);
    }
  };

  const fetchOrderUpdates = async (orderId) => {
    if (orderUpdates[orderId]) {
      setExpandedOrderUpdates(expandedOrderUpdates === orderId ? null : orderId);
      return;
    }
    try {
      const updates = await getOrderUpdates(orderId);
      setOrderUpdates(prev => ({ ...prev, [orderId]: updates }));
      setExpandedOrderUpdates(orderId);
    } catch (_) {
      setExpandedOrderUpdates(expandedOrderUpdates === orderId ? null : orderId);
    }
  };



  const handleNegotiate = async (e) => {
    e.preventDefault();
    try {
      await negotiateOrder(negotiatingOrder.id, {
        negotiated_price: Number(negotiationForm.price),
        negotiation_reason: negotiationForm.reason
      });
      toast.success('Negotiation request sent');
      setNegotiatingOrder(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await acceptOrder(orderId);
      toast.success('Order accepted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };
  
  const handleDownloadInvoice = async (id) => {
    try {
      const token = localStorage.getItem('ssw_token');
      const res = await fetch(`/api/invoices/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Debounced referral code lookup
  useEffect(() => {
    if (!refCodeInput || refCodeInput.length < 5) {
      setReferrerLookupName('');
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await lookupReferralCode(refCodeInput);
        if (res.success) {
          setReferrerLookupName(res.name);
        } else {
          setReferrerLookupName('');
        }
      } catch (err) {
        setReferrerLookupName('');
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [refCodeInput]);

  useEffect(() => {
    if (!user) return;
    if (portalTab === 'overview') {
      loadOrders();
      loadInvoices();
    } else if (portalTab === 'services') {
      loadOrders();
    } else if (portalTab === 'billing') {
      loadInvoices();
    } else if (portalTab === 'referrals') {
      loadReferrals();
    } else if (portalTab === 'subscriptions') {
      loadOrders();
    }
  }, [portalTab, user]);

  useEffect(() => { 
    if (!user) return;
    
    // Fallback to simple polling (every 10s) to avoid Vercel edge disconnections
    const interval = setInterval(() => {
      if (portalTab === 'overview' || portalTab === 'services') {
        loadOrders(true);
      }
      if (portalTab === 'overview' || portalTab === 'billing') {
        loadInvoices(true);
      }
      refreshMe();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [portalTab, user]);

  // Compute stats
  const unpaidInvoicesCount = invoices.filter(i => i.paymentStatus !== 'paid').length;
  const activeServicesCount = orders.filter(o => o.status === 'in_progress' || o.status === 'completed').length;
  const openTicketsCount = 0; // standard default

  const getUserCredits = () => {
    if (!user) return 0;
    try {
      const details = typeof user.details === 'string' ? JSON.parse(user.details) : user.details;
      return Number(details?.credits || 0);
    } catch (e) {
      return 0;
    }
  };

  // Services filtering & pagination
  const filteredOrders = orders.filter(o => {
    const q = serviceSearch.toLowerCase();
    const matchesSearch = !q || o.service_name?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (serviceStatusTab === 'pending') return o.status === 'pending' || o.status === 'quoted';
    if (serviceStatusTab === 'active') return o.status === 'accepted' || o.status === 'in_progress';
    if (serviceStatusTab === 'completed') return o.status === 'completed';
    return true;
  });

  const indexOfLastService = servicePage * servicesPerPage;
  const indexOfFirstService = indexOfLastService - servicesPerPage;
  const currentServices = filteredOrders.slice(indexOfFirstService, indexOfLastService);
  const totalServicePages = Math.ceil(filteredOrders.length / servicesPerPage);

  // Invoices filtering
  const filteredInvoices = invoices.filter(i => {
    const q = search.toLowerCase();
    return !q || i.id?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q);
  });


  // Handle Vault Passcode Entry
  const handlePinInput = (index, value) => {
    if (isNaN(value)) return;
    const newPin = [...vaultPin];
    newPin[index] = value;
    setVaultPin(newPin);

    // Focus next input automatically
    if (value !== '' && index < 3) {
      document.getElementById(`pin-${index + 1}`).focus();
    }

    // When last digit entered, trigger premium unlock animation!
    if (index === 3 && value !== '') {
      setVaultUnlockStep('opening');
      setTimeout(() => {
        setVaultUnlockStep('unlocked');
        toast.success('Starlit Vault unlocked securely!');
      }, 1500);
    }
  };

  const resetVaultLock = () => {
    setVaultPin(['', '', '', '']);
    setVaultUnlockStep('pin');
    setVaultOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-primary/30">
      <Navbar />
      
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        
        {/* ================= PREMIUM PORTAL NAVIGATION TAB BAR ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-brand-primary font-bold tracking-widest uppercase text-xs mb-2">
              <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
              Client Hub
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Starlit <span className="text-gradient">Portal</span></h1>
          </div>

          {/* Navigation Pills */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto shrink-0">
            <button
              onClick={() => { setPortalTab('overview'); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                portalTab === 'overview' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => { setPortalTab('services'); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                portalTab === 'services' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              My Services
            </button>
            <button
              onClick={() => { setPortalTab('billing'); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                portalTab === 'billing' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <CardIcon className="w-3.5 h-3.5" />
              Billing & Invoices
            </button>
            <button
              onClick={() => { setPortalTab('referrals'); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                portalTab === 'referrals' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Referrals & Rewards
            </button>
            <button
              onClick={() => { setPortalTab('subscriptions'); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                portalTab === 'subscriptions' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Subscriptions Hub
            </button>
          </div>
        </div>

        {/* Global Warning Alert for Unpaid Invoices */}
        {unpaidInvoicesCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-yellow-500">You have {unpaidInvoicesCount} unpaid invoice(s)</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Please pay your outstanding invoices to ensure uninterrupted service.</p>
              </div>
            </div>
            <button 
              onClick={() => setPortalTab('billing')} 
              className="text-xs font-black uppercase text-yellow-500 hover:text-yellow-400 flex items-center gap-1 shrink-0"
            >
              View Invoices <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm">Fetching portal ledger...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ================= TAB 1: OVERVIEW COCKPIT ================= */}
            {portalTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Profile Infocard Column */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-[50px] -mr-12 -mt-12" />
                    
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-full blur opacity-25 group-hover:opacity-55 transition duration-500"></div>
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                          <UserCircle2 className="w-12 h-12 text-gray-500" />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg font-display tracking-tight text-white">
                          {user?.name || user?.username || 'Akshat Kumar'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {user?.email || 'akshatkumar945296@gmail.com'}
                        </p>
                      </div>

                      <div className="w-full text-left pt-4 border-t border-white/5 space-y-2 text-xs text-gray-400 font-medium">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span className="text-gray-300">Uttar Pradesh, India</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Type:</span>
                          <span className={`font-bold ${
                            user?.role === 'vip_client' ? 'text-yellow-400 font-black' :
                            user?.role === 'regular_client' ? 'text-green-400' :
                            user?.role === 'admin' ? 'text-red-400' :
                            user?.role === 'manager' ? 'text-blue-400' :
                            'text-brand-secondary'
                          }`}>
                            {user?.role === 'vip_client' ? 'VIP Client ✨' :
                             user?.role === 'regular_client' ? 'Regular Client' :
                             user?.role === 'admin' ? 'Admin' :
                             user?.role === 'manager' ? 'Manager' :
                             'Standard Client'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mt-6 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden">
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Balance (INR)</p>
                      <p className="text-2xl font-mono font-black text-white">₹{getUserCredits().toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Quick stats box */}
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 space-y-4">
                    <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5 pb-2">Cockpit Summary</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.01] p-3 rounded-xl border border-white/5 text-center">
                        <span className="text-xl font-bold font-display">{activeServicesCount}</span>
                        <p className="text-[8px] text-gray-500 uppercase mt-1">Active Plans</p>
                      </div>
                      <div className="bg-white/[0.01] p-3 rounded-xl border border-white/5 text-center">
                        <span className="text-xl font-bold font-display">{unpaidInvoicesCount}</span>
                        <p className="text-[8px] text-gray-500 uppercase mt-1">Due invoices</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right cockpit body */}
                <div className="lg:col-span-9 space-y-8">
                  {/* Greeting banner */}
                  <div className="p-8 rounded-[2rem] bg-gradient-to-r from-brand-primary/10 via-brand-secondary/5 to-transparent border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 blur-[100px] -mr-32 -mt-32" />
                    <Sparkles className="w-8 h-8 text-brand-primary mb-3 animate-pulse" />
                    <h2 className="text-2xl font-display font-black text-white">Welcome to Starlit Siege Works Dashboard</h2>
                    <p className="text-xs text-gray-400 mt-2 max-w-lg leading-relaxed">
                      Deploy premium bots, inspect custom invoice lists, audit secure roadmap status, and configure Starlit Vault access points instantly from your centralized customer console.
                    </p>
                  </div>

                  {/* Combined summarized tables */}
                  <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Recent Services summary card */}
                    <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="font-display font-bold text-sm flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-brand-primary" />
                          Recent Services
                        </h3>
                        <button onClick={() => setPortalTab('services')} className="text-[10px] font-black text-brand-primary hover:text-brand-primary/80 uppercase">
                          Manage all
                        </button>
                      </div>

                      {orders.length === 0 ? (
                        <p className="text-xs text-gray-600 py-6 text-center">No active plans.</p>
                      ) : (
                        <div className="space-y-3">
                          {orders.slice(0, 3).map(o => (
                            <div 
                              key={o.id} 
                              onClick={() => { setPortalTab('services'); setChatOrder(o); }}
                              className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/5 hover:border-brand-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                            >
                              <div>
                                <h4 className="font-bold text-xs text-white truncate max-w-[150px] group-hover:text-brand-primary transition-colors">{getFriendlyServiceName(o.service_name)}</h4>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">#{o.id}</p>
                              </div>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                o.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-brand-primary/10 text-brand-primary'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Invoices summary card */}
                    <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="font-display font-bold text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-secondary" />
                          Recent Invoices
                        </h3>
                        <button onClick={() => setPortalTab('billing')} className="text-[10px] font-black text-brand-secondary hover:text-brand-secondary/80 uppercase">
                          Ledger
                        </button>
                      </div>

                      {invoices.length === 0 ? (
                        <p className="text-xs text-gray-600 py-6 text-center">No invoice history.</p>
                      ) : (
                        <div className="space-y-3">
                          {invoices.slice(0, 3).map(inv => (
                            <div 
                              key={inv.id} 
                              onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                              className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/5 hover:border-brand-secondary/30 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                            >
                              <div>
                                <h4 className="font-bold text-xs text-white truncate max-w-[150px] group-hover:text-brand-secondary transition-colors">{getFriendlyInvoiceDesc(inv)}</h4>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">{inv.currency || '₹'}{inv.grandTotal?.toLocaleString()}</p>
                              </div>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}>
                                {inv.paymentStatus || 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= TAB 2: MY SERVICES (HIGHLY UNIQUE DETAILED VIEW) ================= */}
            {portalTab === 'services' && (
              <motion.div
                key="services"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in"
              >
                {/* Left Column: Premium Quick Actions */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                      Quick Actions
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Action 1: Order New Service */}
                      <button
                        onClick={() => navigate('/shop')}
                        className="w-full p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl text-left hover:bg-brand-primary hover:border-brand-primary text-gray-300 hover:text-white transition-all group flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-xs">Order New Service</p>
                          <p className="text-[9px] text-gray-500 group-hover:text-white/60">Deploy high-performance systems</p>
                        </div>
                        <PlusCircle className="w-5 h-5 text-brand-primary group-hover:text-white transition-all" />
                      </button>

                      {/* Action 2: Custom Request */}
                      <button
                        onClick={() => navigate('/service-request')}
                        className="w-full p-4 bg-brand-secondary/5 border border-brand-secondary/10 rounded-2xl text-left hover:bg-brand-secondary hover:border-brand-secondary text-gray-300 hover:text-white transition-all group flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-xs">Request Quote</p>
                          <p className="text-[9px] text-gray-500 group-hover:text-white/60">Initiate a personalized spec</p>
                        </div>
                        <HelpCircle className="w-5 h-5 text-brand-secondary group-hover:text-white transition-all" />
                      </button>

                      {/* Action 3: Discord Chat support */}
                      <a
                        href="https://discord.gg/cozyclouds"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-left hover:bg-white/10 text-gray-300 hover:text-white transition-all group flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-xs">Contact Support</p>
                          <p className="text-[9px] text-gray-500 group-hover:text-white/60">24/7 Discord staff link</p>
                        </div>
                        <Headphones className="w-5 h-5 text-gray-400 group-hover:text-white transition-all" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Services Table */}
                <div className="lg:col-span-9 bg-[#0b0c14] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                  
                  {/* Glowing accents */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />
                  
                  {/* Table Header Filter controls */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                      <h3 className="font-display text-2xl font-black text-white">My Services</h3>
                      <p className="text-xs text-gray-500 mt-1">Manage and monitor all your active services, upgrades, and billing cycles.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-gray-500 tracking-wider font-mono">{filteredOrders.length} services</span>
                    </div>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div className="flex gap-2 mb-6 border-b border-white/5 pb-4 overflow-x-auto">
                    {[
                      { id: 'all', label: 'All Services' },
                      { id: 'active', label: 'Active Plans' },
                      { id: 'pending', label: 'Pending Quotes' },
                      { id: 'completed', label: 'Completed' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setServiceStatusTab(tab.id); setServicePage(1); }}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                          serviceStatusTab === tab.id 
                            ? 'bg-white/10 text-white border border-white/10' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Table container */}
                  {currentServices.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-bounce" />
                      <p className="text-sm font-semibold text-gray-500">No services match filter criteria</p>
                      <p className="text-xs text-gray-600 mt-1">Request custom plans inside shop to begin.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentServices.map(order => {
                        const matchingInvoice = invoices.find(inv => String(inv.orderId) === String(order.id));
                        return (
                          <div 
                            key={order.id}
                            className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative group overflow-hidden"
                          >
                          {/* Inner glowing accent */}
                          <div className="absolute top-0 left-0 w-[3px] h-full bg-brand-primary opacity-0 group-hover:opacity-100 transition-all" />

                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[9px] text-gray-500 font-black tracking-widest uppercase">Order #{order.id}</span>
                              <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                order.status === 'quoted' ? 'bg-blue-500/10 text-blue-400' :
                                order.status === 'accepted' ? 'bg-brand-primary/10 text-brand-primary' :
                                order.status === 'payment_pending' ? 'bg-purple-500/10 text-purple-400' :
                                order.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400' :
                                order.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                'bg-red-500/10 text-red-500'
                              }`}>
                                {order.status?.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-base leading-tight">{getFriendlyServiceName(order.service_name)}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1">{order.description}</p>

                            {/* Interactive Progress Tracker */}
                            {(() => {
                              const STEPS = [
                                { key: 'pending',         label: 'Submitted',   pct: 5   },
                                { key: 'quoted',          label: 'Quoted',      pct: 25  },
                                { key: 'payment_pending', label: 'Payment',     pct: 50  },
                                { key: 'accepted',        label: 'Accepted',    pct: 60  },
                                { key: 'in_progress',     label: 'In Progress', pct: 80  },
                                { key: 'completed',       label: 'Done',        pct: 100 },
                              ];
                              const isRejected = order.status === 'rejected';
                              const currentStep = STEPS.find(s => s.key === order.status) || STEPS[0];
                              const pct = isRejected ? 100 : currentStep.pct;
                              const barColor = isRejected ? 'bg-red-500' : pct === 100 ? 'bg-green-500' : 'bg-brand-primary';
                              return (
                                <div className="mt-3 space-y-1.5">
                                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${barColor} ${!isRejected && pct < 100 ? 'animate-pulse' : ''}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between">
                                    {STEPS.map((step, i) => {
                                      const stepIdx = STEPS.findIndex(s => s.key === order.status);
                                      const done = i <= stepIdx;
                                      return (
                                        <div key={step.key} className="flex flex-col items-center gap-0.5" style={{ width: `${100/STEPS.length}%` }}>
                                          <div className={`w-1.5 h-1.5 rounded-full ${done && !isRejected ? 'bg-brand-primary' : 'bg-white/10'}`} />
                                          <span className={`text-[8px] font-bold uppercase hidden md:block ${done && !isRejected ? 'text-gray-400' : 'text-gray-700'}`}>{step.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Meta grid details */}
                          <div className="flex md:flex-col items-start md:items-end gap-1.5 shrink-0 text-xs text-gray-400">
                            <span className="text-gray-600 uppercase font-black tracking-widest text-[8px]">Timeline</span>
                            <span className="font-bold text-gray-300">{order.timeline || 'Calculating...'}</span>
                          </div>

                          {/* Actions drawer */}
                          <div className="flex gap-2 w-full md:w-auto shrink-0 relative z-10">
                            <button 
                              onClick={() => setChatOrder(order)}
                              className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> Chat
                            </button>

                            {order.status === 'quoted' && !order.negotiation_status && (
                              <button 
                                onClick={() => navigate(`/checkout/${order.id}`)}
                                className="flex-1 md:flex-initial px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-primary/10"
                              >
                                Pay Now
                              </button>
                            )}

                            {matchingInvoice && matchingInvoice.paymentStatus !== 'paid' && (
                              <button 
                                onClick={() => navigate(`/checkout/invoice/${matchingInvoice.id}`)}
                                className="flex-1 md:flex-initial px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-primary/10"
                              >
                                Pay Invoice
                              </button>
                            )}

                             {matchingInvoice && (
                               <>
                                 <button 
                                   onClick={() => { setSelectedInvoice(matchingInvoice); setShowInvoiceModal(true); }}
                                   className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                 >
                                   <Info className="w-3.5 h-3.5" /> View Invoice
                                 </button>
                                 <button 
                                   onClick={() => setPreviewInvoice(matchingInvoice)}
                                   className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                   title="Preview PDF"
                                 >
                                   <Eye className="w-3.5 h-3.5" /> Preview PDF
                                 </button>
                                 <button 
                                   onClick={() => setPreviewInvoice(matchingInvoice)}
                                   className="flex-1 md:flex-initial px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                   title="Download PDF"
                                 >
                                   <Download className="w-3.5 h-3.5" /> Download PDF
                                 </button>
                               </>
                             )}

                            {(order.status === 'accepted' || order.status === 'in_progress' || order.status === 'completed') && (
                              <button 
                                onClick={() => setVaultOrder(order)}
                                className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 ${
                                  order.status === 'completed' 
                                    ? 'bg-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                                    : 'bg-brand-primary hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                }`}
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Vault
                              </button>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  )}

                  {/* Premium Pagination matching screenshot */}
                  {totalServicePages > 1 && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Page {servicePage} of {totalServicePages}</span>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setServicePage(p => Math.max(1, p - 1))}
                          disabled={servicePage === 1}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          &lt; Previous
                        </button>
                        <button
                          onClick={() => setServicePage(p => Math.min(totalServicePages, p + 1))}
                          disabled={servicePage === totalServicePages}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                        >
                          Next &gt;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ================= TAB 3: BILLING & INVOICES ================= */}
            {portalTab === 'billing' && (
              <motion.div
                key="billing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#0b0c14] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <h3 className="font-display text-2xl font-black text-white">Accounts & Ledger</h3>
                    <p className="text-xs text-gray-500 mt-1">Audit transaction histories, inspect generated invoice sheets, and pay balances.</p>
                  </div>
                </div>

                {filteredInvoices.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-500">No invoices generated</p>
                    <p className="text-xs text-gray-600 mt-1">Invoices appear here once quote payouts are authorized by staff.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500 pb-4">
                          <th className="pb-3">Invoice</th>
                          <th className="pb-3">Items</th>
                          <th className="pb-3">Billing Date</th>
                          <th className="pb-3">Grand Total</th>
                          <th className="pb-3">Left Amount</th>
                          <th className="pb-3">Payment Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredInvoices.map((inv) => {
                          const ledgerTotal = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          const outstanding = Math.max(0, parseFloat(inv.grandTotal || 0) - ledgerTotal);
                          return (
                          <tr 
                            key={inv.id} 
                            onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="py-4 font-mono font-bold text-white text-xs px-4 group-hover:text-brand-primary transition-colors">
                              #{inv.id || inv.invoiceNumber}
                            </td>
                            <td className="py-4 text-xs max-w-[200px] truncate text-gray-300">
                              {getFriendlyInvoiceDesc(inv)}
                            </td>
                            <td className="py-4 text-xs text-gray-400">
                              {inv.invoiceDate}
                            </td>
                            <td className="py-4 text-xs font-mono font-bold text-white">
                              {inv.currency || '₹'}{inv.grandTotal?.toLocaleString()}
                            </td>
                            <td className="py-4 text-xs font-mono font-bold text-orange-400">
                              {inv.currency || '₹'}{outstanding.toFixed(2)}
                            </td>
                            <td className="py-4 text-xs">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}>
                                {inv.paymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="py-4 text-right px-4">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                                  className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all"
                                >
                                  Details
                                </button>
                                {inv.paymentStatus !== 'paid' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/checkout/invoice/${inv.id}`); }}
                                    className="px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1 shadow-md shadow-brand-primary/5"
                                  >
                                    <CreditCard className="w-3 h-3" /> Pay
                                  </button>
                                )}
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setPreviewInvoice(inv); }}
                                   className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-blue-400 hover:text-blue-300 transition-all"
                                   title="Preview PDF Invoice"
                                 >
                                   <Eye className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setPreviewInvoice(inv); }}
                                   className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                   title="Download PDF Invoice"
                                 >
                                   <Download className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* ================= TAB 4: REFERRALS & REWARDS ================= */}
            {portalTab === 'referrals' && (
              referralLoading ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-500">
                  <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm">Loading referral data...</p>
                </div>
              ) : (
              <motion.div
                key="referrals"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Left Side: Stats and Share */}
                <div className="lg:col-span-4 space-y-6">

                  {/* Link Referral Code Card (for users who didn't enter one at signup) */}
                  {referralInfo && !referralInfo.referred_by && (
                    <div className="bg-[#0b0c14] border border-brand-secondary/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 blur-[50px] -mr-16 -mt-16" />
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-brand-secondary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm tracking-tight text-white">Link Referral Code</h3>
                          <p className="text-[10px] text-gray-500">Missed it at signup? Link now!</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed mb-4">
                        If a friend invited you but you didn't enter their referral code during signup, you can link it here to unlock your <span className="text-white font-bold">welcome bonus</span>!
                      </p>

                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. REF1A2B3C4D" 
                          value={refCodeInput}
                          onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())}
                          maxLength={12}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white tracking-widest outline-none flex-1 uppercase focus:border-brand-secondary transition-all"
                        />
                        <button
                          onClick={async () => {
                            if (!refCodeInput) return;
                            setLinkingRef(true);
                            try {
                              const res = await linkReferralCode(refCodeInput);
                              if (res.success) {
                                toast.success('🎉 Referral code linked successfully! Welcome bonus applied.');
                                setRefCodeInput('');
                                setReferrerLookupName('');
                                loadReferrals();
                                refreshMe();
                              }
                            } catch (err) {
                              toast.error(err.message || 'Failed to link referral code');
                            } finally {
                              setLinkingRef(false);
                            }
                          }}
                          disabled={linkingRef || !refCodeInput || refCodeInput.length < 5}
                          className="px-4 py-2.5 bg-brand-secondary text-white rounded-xl text-xs font-bold hover:bg-brand-secondary/90 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {linkingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link'}
                        </button>
                      </div>

                      {referrerLookupName && (
                        <p className="text-xs text-brand-secondary mt-3 flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse"></span>
                          Referred by: <strong className="text-white font-bold">{referrerLookupName}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Already referred info */}
                  {referralInfo && referralInfo.referred_by && (
                    <div className="bg-[#0b0c14] border border-green-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm tracking-tight text-white">Referral Linked</h3>
                          <p className="text-[10px] text-gray-500">You were referred by: <span className="text-green-400 font-bold">{referralInfo.referred_by_name || referralInfo.referred_by}</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Share Card */}
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[50px] -mr-16 -mt-16" />
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm tracking-tight text-white">Invite Friends</h3>
                        <p className="text-[10px] text-gray-500">Share your custom code & earn</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed mb-6">
                      Invite your community members or developers to Starlit Siege Works! They get a welcome join bonus of <span className="text-white font-bold">₹{referralInfo?.settings?.join_bonus || 20}</span>, and you get up to <span className="text-brand-primary font-bold">₹{referralInfo?.settings?.invite_reward || 50}</span> credited instantly upon signup, plus <span className="text-brand-secondary font-bold">{referralInfo?.settings?.cashback_pct || 5}% cashback</span> on their orders!
                    </p>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-1.5">Referral Code</span>
                        <div className="flex gap-2">
                          <input 
                            readOnly 
                            type="text" 
                            value={referralInfo?.referral_code || ''} 
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-white tracking-widest select-all outline-none flex-1 text-center"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(referralInfo?.referral_code || '');
                              toast.success('Referral code copied!');
                            }}
                            className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary/90 transition-all shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-1.5">Referral Link</span>
                        <div className="flex gap-2">
                          <input 
                            readOnly 
                            type="text" 
                            value={referralInfo?.referral_link || ''} 
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-400 truncate select-all outline-none flex-1"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(referralInfo?.referral_link || '');
                              toast.success('Referral link copied!');
                            }}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all shrink-0"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats Grid */}
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 space-y-4 relative overflow-hidden">
                    <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest border-b border-white/5 pb-2">Referral Wallet & Stats</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/5 text-center">
                        <span className="text-lg font-bold font-display text-brand-primary">{referralInfo?.referral_count || 0}</span>
                        <p className="text-[7px] text-gray-500 uppercase mt-1">Invites</p>
                      </div>
                      <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/5 text-center">
                        <span className="text-lg font-bold font-display text-emerald-400">₹{referralInfo?.referral_balance || 0}</span>
                        <p className="text-[7px] text-gray-500 uppercase mt-1">Balance</p>
                      </div>
                      <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/5 text-center">
                        <span className="text-lg font-bold font-display text-purple-400">{referralInfo?.ripple_points || 0}</span>
                        <p className="text-[7px] text-gray-500 uppercase mt-1">Ripple Pts</p>
                      </div>
                      <div className="bg-white/[0.01] p-2.5 rounded-xl border border-white/5 text-center">
                        <span className="text-lg font-bold font-display text-brand-secondary">₹{getUserCredits()}</span>
                        <p className="text-[7px] text-gray-500 uppercase mt-1">Credits</p>
                      </div>
                    </div>

                    {/* Cash Payout Card */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Withdrawable Cash</p>
                          <p className="text-[8px] text-gray-500 mt-0.5">Referral earnings ledger</p>
                        </div>
                        <span className="text-lg font-mono font-black text-white">₹{referralInfo?.referral_balance || 0}</span>
                      </div>
                      
                      <button
                        onClick={() => setWithdrawModalOpen(true)}
                        disabled={(referralInfo?.referral_balance || 0) < 1000}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all text-center uppercase tracking-wider ${
                          (referralInfo?.referral_balance || 0) >= 1000
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        {(referralInfo?.referral_balance || 0) >= 1000 ? 'Request Cash Payout' : 'Payout (Min ₹1,000)'}
                      </button>
                    </div>

                    {/* Ripple Points Converter Card */}
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Ripple Points Hub</p>
                          <p className="text-[8px] text-gray-500 mt-0.5">Earned from referred orders ≥ ₹500</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-base font-mono font-black text-white">{referralInfo?.ripple_points || 0} pts</span>
                          <span className="text-[8px] text-purple-400 font-mono font-bold">₹{((referralInfo?.ripple_points || 0) / 5).toFixed(2)} value</span>
                        </div>
                      </div>

                      {/* Convert Points form */}
                      {(referralInfo?.ripple_points || 0) >= 5 ? (
                        <div className="flex gap-2 pt-1">
                          <input 
                            type="number"
                            placeholder="Points to convert (Min 5)"
                            min="5"
                            max={referralInfo?.ripple_points || 0}
                            step="5"
                            value={pointsToConvert}
                            onChange={(e) => setPointsToConvert(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary w-full text-center font-mono"
                          />
                          <button
                            onClick={handleConvertPoints}
                            disabled={convertingPoints}
                            className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-[10px] font-black transition-all shrink-0 uppercase tracking-widest"
                          >
                            {convertingPoints ? 'Converting...' : 'Convert'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[8px] text-gray-500 text-center italic">Need at least 5 points to convert to store credits (5 pts = ₹1)</p>
                      )}
                    </div>

                    {/* Withdrawal Request Modal */}
                    <AnimatePresence>
                      {withdrawModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-brand-card border border-brand-border rounded-[2rem] p-8 w-full max-w-md bg-[#0b0c14] relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                Request Payout
                              </h3>
                              <button type="button" onClick={() => setWithdrawModalOpen(false)} className="text-gray-500 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <form onSubmit={handleRequestWithdrawal} className="space-y-5">
                              <div>
                                <label className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Available Balance</label>
                                <p className="text-2xl font-mono font-black text-emerald-400">₹{referralInfo?.referral_balance || 0}</p>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest">Withdrawal Amount (₹)</label>
                                <input 
                                  type="number" 
                                  required
                                  min="1000"
                                  max={referralInfo?.referral_balance || 0}
                                  placeholder="e.g. 1000"
                                  value={withdrawAmount}
                                  onChange={e => setWithdrawAmount(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                                />
                                <span className="text-[9px] text-gray-500 block">Note: Minimal payout amount is ₹1,000</span>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest">Payment Info (UPI ID / Bank Details)</label>
                                <textarea
                                  required
                                  rows="3"
                                  placeholder="Enter your UPI ID (e.g., yourname@upi) or Bank Name, Account Number & IFSC code"
                                  value={withdrawPaymentInfo}
                                  onChange={e => setWithdrawPaymentInfo(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={withdrawing}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/5 disabled:text-gray-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                              >
                                {withdrawing ? 'Submitting Request...' : 'Submit Payout Request'}
                              </button>
                            </form>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Side: Milestone tiers and histories */}
                <div className="lg:col-span-8 space-y-8">
                  {/* Promoter Rank Card */}
                  {referralInfo?.active_rank && (
                    <div className="p-8 rounded-[2rem] bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-transparent border border-purple-500/20 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 blur-[100px] -mr-32 -mt-32 animate-pulse" />
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                          <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[9px] tracking-widest mb-1.5">
                            <Award className="w-3.5 h-3.5" /> Promoter Achievement Rank
                          </div>
                          <h3 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
                            {referralInfo?.active_rank}
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                              {referralInfo?.cashback_pct}% Points Power
                            </span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-2 max-w-xl">
                            Your active rank scales your Ripple Points payout from referred purchases! Base is 5%. Void Overlords earn 20% cashback points power (a massive 4x points multiplier!).
                          </p>
                        </div>
                      </div>

                      {referralInfo?.next_rank && (
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-purple-300">Next Rank: {referralInfo?.next_rank}</span>
                            <span className="text-gray-400">{referralInfo?.referral_count || 0} / {referralInfo?.next_milestone || 0} Invites</span>
                          </div>
                          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                              style={{ width: `${Math.min(100, ((referralInfo?.referral_count || 0) / (referralInfo?.next_milestone || 1)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Invite {(referralInfo?.next_milestone || 0) - (referralInfo?.referral_count || 0)} more friend(s) to ascend to the <span className="text-purple-300 font-bold">{referralInfo?.next_rank}</span> tier!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Milestone tier progress card */}
                  {referralInfo?.tiers && (
                    <div className="p-8 rounded-[2rem] bg-gradient-to-r from-brand-primary/10 via-brand-secondary/5 to-transparent border border-white/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 blur-[100px] -mr-32 -mt-32" />
                      
                      <div className="flex justify-between items-start gap-4 mb-6">
                        <div>
                          <div className="flex items-center gap-2 text-brand-primary font-bold uppercase text-[9px] tracking-widest mb-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Milestone Incentives
                          </div>
                          <h3 className="text-xl font-display font-black text-white">Community Growth Milestones</h3>
                          <p className="text-xs text-gray-400 mt-1">Unlock high-value flat credit bonuses as your referral counts reach new milestone thresholds!</p>
                        </div>
                      </div>

                      {/* Milestone visual progress tracker */}
                      <div className="space-y-6">
                        {referralInfo?.next_tier ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-gray-400">Next Milestone: {referralInfo?.next_tier?.count || 0} Invites</span>
                              <span className="text-brand-primary">+{referralInfo?.next_tier?.bonus || 0} Credits</span>
                            </div>
                            
                            {/* Visual Progress Bar */}
                            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="absolute left-0 top-0 h-full rounded-full bg-brand-primary animate-pulse transition-all duration-1000"
                                style={{ width: `${Math.min(100, (((referralInfo?.referral_count || 0) / (referralInfo?.next_tier?.count || 1)) * 100))}%` }}
                              />
                            </div>
                            
                            <p className="text-[10px] text-gray-500">
                              You need <span className="text-white font-bold">{(referralInfo?.next_tier?.count || 0) - (referralInfo?.referral_count || 0)}</span> more successful referral signups to unlock the <span className="text-brand-primary font-bold">₹{referralInfo?.next_tier?.bonus || 0}</span> bonus.
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3">
                            <Check className="w-5 h-5 text-green-500 shrink-0" />
                            <p className="text-xs text-green-400 font-bold">🎉 Outstanding! You have successfully completed all milestones!</p>
                          </div>
                        )}

                        {/* List of Tiers */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                          {referralInfo?.tiers?.map((tier, idx) => {
                            const reached = (referralInfo?.referral_count || 0) >= (tier?.count || 0);
                            return (
                              <div key={idx} className={`p-4 rounded-xl border transition-all ${reached ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-white/[0.01] border-white/5'}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-gray-400">{tier?.count || 0} Invites</span>
                                  {reached && <Check className="w-3.5 h-3.5 text-brand-primary" />}
                                </div>
                                <span className={`text-base font-black ${reached ? 'text-white' : 'text-gray-600'}`}>₹{tier?.bonus || 0} Bonus</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Joined users & transaction cards side-by-side or stacked */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Invited Friends Table */}
                    <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
                      <h3 className="font-display font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
                        <Users className="w-4 h-4 text-brand-primary" />
                        Invited Friends ({referralInfo?.referrals?.length || 0})
                      </h3>

                      {!referralInfo?.referrals || referralInfo?.referrals?.length === 0 ? (
                        <p className="text-xs text-gray-600 py-10 text-center">No friends referred yet. Send your referral link to get started!</p>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {referralInfo?.referrals?.map((ref, idx) => (
                            <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center">
                              <div>
                                <h4 className="font-bold text-xs text-white">{ref?.referred_name}</h4>
                                <p className="text-[8px] text-gray-500 font-mono mt-0.5">Joined {ref?.created_at ? new Date(ref.created_at * 1000).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                {ref?.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reward Transactions Table */}
                    <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
                      <h3 className="font-display font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
                        <DollarSign className="w-4 h-4 text-brand-secondary" />
                        Earnings History
                      </h3>

                      {!referralInfo?.transactions || referralInfo?.transactions?.length === 0 ? (
                        <p className="text-xs text-gray-600 py-10 text-center">No earnings recorded yet. Payouts will appear here instantly.</p>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {referralInfo?.transactions?.map((tx, idx) => (
                            <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center">
                              <div>
                                <h4 className="font-bold text-xs text-white">{tx?.description || 'Referral Bonus'}</h4>
                                <p className="text-[8px] text-gray-500 font-mono mt-0.5">{tx?.created_at ? new Date(tx.created_at * 1000).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <span className="text-xs font-mono font-bold text-brand-secondary">
                                +₹{tx?.amount || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payout / Withdrawal Requests History Ledger */}
                  <div className="bg-[#0b0c14] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
                    <h3 className="font-display font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Cash Payout Requests Ledger
                    </h3>

                    {!referralInfo?.withdrawals || referralInfo?.withdrawals?.length === 0 ? (
                      <p className="text-xs text-gray-600 py-8 text-center">No cash payout requests submitted yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-400">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
                              <th className="py-2.5">Date</th>
                              <th className="py-2.5">Amount</th>
                              <th className="py-2.5">Payment Details</th>
                              <th className="py-2.5">Status</th>
                              <th className="py-2.5">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {referralInfo?.withdrawals?.map((w, idx) => (
                              <tr key={idx} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                                <td className="py-3 font-mono text-[10px]">
                                  {w?.created_at ? new Date(w.created_at * 1000).toLocaleString() : 'N/A'}
                                </td>
                                <td className="py-3 font-bold text-white font-mono">
                                  ₹{w?.amount || 0}
                                </td>
                                <td className="py-3 font-sans truncate max-w-[200px]" title={w?.payment_info}>
                                  {w?.payment_info}
                                </td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    w?.status === 'approved' 
                                      ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                      : w?.status === 'rejected' 
                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                  }`}>
                                    {w?.status}
                                  </span>
                                </td>
                                <td className="py-3 text-gray-500 italic truncate max-w-[150px]" title={w?.note}>
                                  {w?.note || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              )
            )}

            {/* ================= TAB 5: ACTIVE SUBSCRIPTIONS HUB ================= */}
            {portalTab === 'subscriptions' && (() => {
              const activeSubs = orders.filter(o => 
                (o.status === 'completed' || o.status === 'in_progress') && 
                (String(o.service_name || '').toLowerCase().includes('bot') && 
                 (String(o.service_name || '').toLowerCase().includes('monthly') || String(o.service_name || '').toLowerCase().includes('lifetime') || String(o.service_name || '').toLowerCase().includes('complete')))
              );
              return (
                <motion.div
                  key="subscriptions"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#0b0c14] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h2 className="font-display text-2xl font-black text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                        Private Subscription Management Hub
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Track dedicated instances, service statuses, renewal dates, and lifetime access bot logs.</p>
                    </div>
                    <button 
                      onClick={() => navigate('/shop')} 
                      className="px-4 py-2 bg-purple-500 text-white rounded-xl text-xs font-bold hover:bg-purple-600 transition-all flex items-center gap-1 shadow-lg shadow-purple-500/10"
                    >
                      <PlusCircle className="w-4 h-4" /> Order New Bot
                    </button>
                  </div>

                  {activeSubs.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                      <Sparkles className="w-10 h-10 text-gray-700 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-semibold text-gray-400">No active bot subscriptions found</p>
                      <p className="text-xs text-gray-600 mt-1.5 max-w-sm mx-auto">Purchase Private support ticketers or Premium security guard bot licenses inside our catalog to launch your dedicated instances.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {activeSubs.map(sub => {
                        const isLifetime = String(sub.service_name || '').toLowerCase().includes('complete') || String(sub.service_name || '').toLowerCase().includes('lifetime');
                        
                        // Dynamic timeline countdown calculator
                        let daysRemaining = 'Lifetime';
                        let progressPct = 100;
                        if (!isLifetime) {
                          const orderTimeMs = sub.created_at ? sub.created_at * 1000 : Date.now();
                          const elapsedMs = Date.now() - orderTimeMs;
                          const totalMs = 30 * 24 * 60 * 60 * 1000; // 30 days
                          const remainingMs = totalMs - elapsedMs;
                          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
                          daysRemaining = remainingDays > 0 ? `${remainingDays} days remaining` : 'Expired';
                          progressPct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
                        }

                        return (
                          <div 
                            key={sub.id} 
                            className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:border-purple-500/20 transition-all relative overflow-hidden group"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[30px] -mr-12 -mt-12 group-hover:bg-purple-500/10 transition-colors" />
                            
                            <div className="flex justify-between items-start gap-4 mb-4">
                              <div>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                  isLifetime 
                                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' 
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>
                                  {isLifetime ? 'Complete Access' : 'Monthly Subscription'}
                                </span>
                                <h3 className="font-bold text-white text-base mt-2 leading-tight">{getFriendlyServiceName(sub.service_name)}</h3>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">Instance ID: #BOT-{sub.id}</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                Dedicated Active
                              </span>
                            </div>

                            {/* Timeline Visualizer */}
                            <div className="space-y-2 mt-6">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-400">Subscription Timeline</span>
                                <span className={isLifetime ? 'text-fuchsia-400' : 'text-purple-400 font-mono'}>{daysRemaining}</span>
                              </div>
                              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div 
                                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
                                    isLifetime 
                                      ? 'bg-gradient-to-r from-fuchsia-500 to-purple-500' 
                                      : progressPct < 15 
                                        ? 'bg-red-500' 
                                        : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[8px] text-gray-600 font-mono">
                                <span>Deployed: {new Date(sub.created_at * 1000).toLocaleDateString()}</span>
                                <span>{!isLifetime && `Renew by: ${new Date((sub.created_at * 1000) + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}`}</span>
                              </div>
                            </div>

                            {!isLifetime && (
                              <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
                                <button
                                  onClick={() => navigate('/shop')}
                                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5 uppercase tracking-wider"
                                >
                                  Renew Instance
                                </button>
                                <a 
                                  href="https://discord.gg/starlit" 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-bold transition-all text-center uppercase tracking-wider border border-purple-500/20"
                                >
                                  Configure Keys
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })()}

          </AnimatePresence>
        )}
      </main>

      {/* Chat Overlay */}
      <AnimatePresence>
        {chatOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 pointer-events-none">
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-full max-w-md h-[80vh] pointer-events-auto"
            >
              <UserChat userId={user.id} onClose={() => setChatOrder(null)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Negotiation Modal */}
      <AnimatePresence>
        {negotiatingOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-card border border-brand-border rounded-2xl p-8 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-secondary" />
                  Negotiate Quote
                </h3>
                <button onClick={() => setNegotiatingOrder(null)} className="text-gray-500 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleNegotiate} className="space-y-6">
                <div>
                  <label className="block text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Original Quote</label>
                  <p className="text-lg font-bold text-white opacity-50 line-through">₹{negotiatingOrder.quoted_price}</p>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">Your Proposed Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={negotiationForm.price}
                    onChange={e => setNegotiationForm({...negotiationForm, price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold text-white focus:border-brand-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase font-bold tracking-widest mb-2">Reason for Negotiation</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Tell us why you want to negotiate..."
                    value={negotiationForm.reason}
                    onChange={e => setNegotiationForm({...negotiationForm, reason: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:border-brand-primary outline-none transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-brand-secondary rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit Negotiation
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= HIGH-TECH VIRTUAL SECURITY VAULT MODAL ================= */}
      <AnimatePresence>
        {vaultOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#07070a] border border-brand-primary/20 rounded-[2.5rem] p-8 w-full max-w-2xl relative overflow-hidden shadow-[0_0_80px_rgba(124,58,237,0.2)]"
            >
              
              {/* Top Banner decoration */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary to-brand-secondary" />

              {/* Close Button */}
              <button onClick={resetVaultLock} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all relative z-10">
                <X className="w-5 h-5 text-gray-500 hover:text-white" />
              </button>

              {vaultUnlockStep === 'pin' && (
                <div className="flex flex-col items-center py-10 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center animate-pulse">
                    <Lock className="w-8 h-8 text-brand-primary" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-display font-black text-white">Starlit Security vault</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                      Enter your secret 4-digit client passcode to authenticate session and release server environment variables.
                    </p>
                  </div>

                  {/* 4 Digit passcode entry inputs */}
                  <div className="flex gap-4 items-center justify-center">
                    {[0, 1, 2, 3].map(idx => (
                      <input
                        key={idx}
                        id={`pin-${idx}`}
                        type="password"
                        maxLength={1}
                        value={vaultPin[idx]}
                        onChange={e => handlePinInput(idx, e.target.value)}
                        className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold font-mono focus:border-brand-primary outline-none text-white focus:bg-brand-primary/5 transition-all"
                      />
                    ))}
                  </div>

                  <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">
                    Default Testing Key: Any 4 digits will release the safe locks
                  </p>
                </div>
              )}

              {vaultUnlockStep === 'opening' && (
                <div className="flex flex-col items-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 border-2 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4" />
                  <h4 className="text-lg font-bold text-brand-secondary tracking-widest uppercase font-mono animate-pulse">Decompressing Cryptographic Safe...</h4>
                  <p className="text-xs text-gray-500">Retrieving encrypted credentials securely from cloud node clusters...</p>
                </div>
              )}

              {vaultUnlockStep === 'unlocked' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-brand-primary font-black uppercase text-[10px] tracking-widest mb-1">
                        <KeyRound className="w-3 h-3 text-brand-primary" /> Secure vault released
                      </div>
                      <h3 className="text-3xl font-display font-black text-white">The Starlit <span className="text-gradient">Vault</span></h3>
                      <p className="text-gray-500 text-xs mt-1">Order #{vaultOrder.id} • {getFriendlyServiceName(vaultOrder.service_name)}</p>
                    </div>
                  </div>

                  {/* Vault variables listings */}
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {(() => {
                      let vault = {};
                      try { 
                        const raw = vaultOrder.vault_data;
                        if (typeof raw === 'string') {
                          vault = JSON.parse(raw || '{}') || {};
                        } else if (raw && typeof raw === 'object') {
                          vault = raw;
                        }
                      } catch(e) {
                        console.error("Vault parse error:", e);
                      }
                      
                      const entries = Object.entries(vault);
                      
                      if (entries.length === 0) {
                        return (
                          <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                            <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold text-sm">The vault ledger is empty.</p>
                            <p className="text-gray-600 text-[10px] mt-1 uppercase tracking-widest font-black">There's no asset credentials inside.</p>
                          </div>
                        );
                      }

                      return entries.map(([key, val]) => (
                        <div key={key} className="glass-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-brand-primary/20 transition-all relative overflow-hidden">
                          <div>
                            <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">{key}</p>
                            <p className="font-mono text-sm text-gray-300 break-all">
                              {typeof val === 'object' ? JSON.stringify(val) : val}
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(val);
                              toast.success(`${key} copied!`);
                            }}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-all shrink-0"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 animate-bounce" />
                    <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
                      CAUTION: These credentials are highly confidential. Do not share your vault passcodes. Starlit Siege Works will never request passwords from customers.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INVOICE DETAILS MODAL --- */}
      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => setShowInvoiceModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-[#0b0c14] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col selection:bg-brand-primary/30 text-left"
            >
              {/* Glowing Top Decor */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[120px] -mr-32 -mt-32 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent pointer-events-none" />
              
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <FileText className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white font-display">Invoice {selectedInvoice.invoiceNumber}</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Linked to Order #{selectedInvoice.orderId || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPreviewInvoice(selectedInvoice)} 
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-blue-400" 
                    title="Preview PDF"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setPreviewInvoice(selectedInvoice)} 
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-brand-primary" 
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowInvoiceModal(false)} 
                    className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all border border-white/10 text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Billing Information</h4>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="font-bold text-lg text-white">{selectedInvoice.client?.name || user?.name}</p>
                      <p className="text-sm text-gray-400">{selectedInvoice.client?.serverName || 'Premium Client Service'}</p>
                      <p className="text-[10px] font-mono text-gray-600 mt-2">GSTIN: {selectedInvoice.client?.gstin || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Invoice Summary</h4>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Generated At</span>
                        <span className="text-xs">{selectedInvoice.invoiceDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Payment Type</span>
                        <span className="text-xs font-bold capitalize text-brand-primary">{selectedInvoice.paymentType || 'One-Time'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Payment Status</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${
                          selectedInvoice.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-500'
                        }`}>{selectedInvoice.paymentStatus || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/5">
                        <span className="text-gray-400 font-bold">Total Amount</span>
                        <span className="text-xl font-black text-green-400">{selectedInvoice.currency || '₹'}{selectedInvoice.grandTotal?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Billing Breakdown</h4>
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 border-b border-white/5 text-gray-400">
                        <tr>
                          <th className="px-6 py-4 font-medium">Description</th>
                          <th className="px-6 py-4 text-center font-medium">Qty</th>
                          <th className="px-6 py-4 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {(selectedInvoice.items || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01]">
                            <td className="px-6 py-4 font-medium text-white">{item.description || item.desc}</td>
                            <td className="px-6 py-4 text-center">{item.qty || 1}</td>
                            <td className="px-6 py-4 text-right font-mono">{selectedInvoice.currency || '₹'}{(item.price || item.total || item.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedInvoice.paymentType === 'installment' && selectedInvoice.installments && (
                  <div className="space-y-6 pt-2">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Installment Payment Plan</h4>
                      <p className="text-xs text-gray-500 mt-1">Track monthly payments and outstanding balances for this contract.</p>
                    </div>

                    {/* Progress Bar & Balances */}
                    {(() => {
                      const paidCount = selectedInvoice.installments.filter(i => i.paid).length;
                      const totalCount = selectedInvoice.installments.length;
                      const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
                      const paidAmt = selectedInvoice.installments.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount), 0);
                      const pendingAmt = Number(selectedInvoice.grandTotal || 0) - paidAmt;

                      return (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                            <div>
                              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Contract Total</span>
                              <span className="text-lg font-bold font-mono text-white">{selectedInvoice.currency || '₹'}{Number(selectedInvoice.grandTotal || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-green-500/60 uppercase font-black tracking-widest block mb-1">Total Paid</span>
                              <span className="text-lg font-bold font-mono text-green-400">{selectedInvoice.currency || '₹'}{paidAmt.toLocaleString()}</span>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <span className="text-[10px] text-red-400/60 uppercase font-black tracking-widest block mb-1">Remaining</span>
                              <span className="text-lg font-bold font-mono text-red-400">{selectedInvoice.currency || '₹'}{pendingAmt.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 bg-white/[0.01] p-4 rounded-xl">
                            <div className="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${progress}%` }}
                                className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-500"
                              />
                            </div>
                            <span className="text-xs font-bold text-brand-secondary shrink-0">
                              {progress.toFixed(0)}% Complete ({totalCount - paidCount} left)
                            </span>
                          </div>

                          {/* Installment Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedInvoice.installments.map((inst, i) => (
                              <div 
                                key={i} 
                                className={`p-5 rounded-2xl border transition-all ${
                                  inst.paid 
                                    ? 'bg-green-500/5 border-green-500/20 shadow-[inset_0_0_12px_rgba(34,197,94,0.05)]' 
                                    : 'bg-white/[0.02] border-white/5 group hover:border-white/20'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Payment #{i+1}</span>
                                    <h4 className={`font-bold mt-1 text-sm ${inst.paid ? 'text-green-400' : 'text-gray-300'}`}>{inst.month}</h4>
                                  </div>
                                  {inst.paid ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                  <span className="text-sm font-bold font-mono text-white">{selectedInvoice.currency || '₹'}{Number(inst.amount).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-end gap-4">
                {selectedInvoice.paymentStatus !== 'paid' && (
                  <button
                    onClick={() => {
                      setShowInvoiceModal(false);
                      navigate(`/checkout/invoice/${selectedInvoice.id}`);
                    }}
                    className="px-6 py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs rounded-2xl shadow-[0_5px_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2 border-0"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Outstanding Balance
                  </button>
                )}
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-2xl text-xs font-bold transition-all border-0"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
    </div>
  );
}
