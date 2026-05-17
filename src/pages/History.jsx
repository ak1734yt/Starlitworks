import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, AlertCircle, Clock, ShoppingBag, MessageSquare, Check, X, 
  ShieldAlert, Send, CreditCard, Zap, FileText, Download, Activity, 
  Globe, Monitor, MapPin, Sparkles, ChevronRight, UserCircle2, ArrowRight,
  Headphones, PlusCircle, HelpCircle, Layers, CreditCard as CardIcon, LayoutDashboard,
  KeyRound, Lock
} from 'lucide-react';
import OrderChat from '../components/OrderChat';
import { negotiateOrder, acceptOrder, getUserInvoicesByAdmin, getMyOrders } from '../services/api';
import Navbar from '../components/Navbar';
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
  const { user } = useAuth();
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
  const [servicePage, setServicePage] = useState(1);
  const [servicesPerPage] = useState(8);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ssw_token');
      if (!token) {
        navigate('/login');
        return;
      }
      const data = await getMyOrders();
      setOrders(data);

      if (user?.id) {
        const invRes = await getUserInvoicesByAdmin(user.id);
        if (invRes && !invRes.error) {
          setInvoices(invRes);
        }
      }
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
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
      a.download = `Invoice_${id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice TXT downloaded successfully!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => { 
    if(user) load(); 
  }, [user]);

  // Compute stats
  const unpaidInvoicesCount = invoices.filter(i => i.paymentStatus !== 'paid').length;
  const activeServicesCount = orders.filter(o => o.status === 'in_progress' || o.status === 'completed').length;
  const openTicketsCount = 0; // standard default

  // Services filtering & pagination
  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    const matchesSearch = o.service_name?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q);
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
    return i.id?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q);
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
                          <span className="text-brand-secondary font-bold">Standard Client</span>
                        </div>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mt-6 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden">
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Balance (INR)</p>
                      <p className="text-2xl font-mono font-black text-white">₹0.00</p>
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
                              onClick={() => navigate(`/invoice/${inv.id}`)}
                              className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/5 hover:border-brand-secondary/30 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                            >
                              <div>
                                <h4 className="font-bold text-xs text-white truncate max-w-[150px] group-hover:text-brand-secondary transition-colors">{getFriendlyInvoiceDesc(inv)}</h4>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">₹{inv.grandTotal?.toLocaleString()}</p>
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
                        href="https://discord.gg/starlit"
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
                      {currentServices.map(order => (
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

                            {order.status === 'accepted' && (
                              <button 
                                onClick={() => navigate(`/checkout/${order.id}`)}
                                className="flex-1 md:flex-initial px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-primary/10"
                              >
                                Pay Now
                              </button>
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
                      ))}
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
                          <th className="pb-3">Payment Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 font-mono font-bold text-white text-xs">
                              #{inv.id || inv.invoiceNumber}
                            </td>
                            <td className="py-4 text-xs max-w-[200px] truncate text-gray-300">
                              {getFriendlyInvoiceDesc(inv)}
                            </td>
                            <td className="py-4 text-xs text-gray-400">
                              {inv.invoiceDate}
                            </td>
                            <td className="py-4 text-xs font-mono font-bold text-white">
                              ₹{inv.grandTotal?.toLocaleString()}
                            </td>
                            <td className="py-4 text-xs">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              }`}>
                                {inv.paymentStatus || 'Pending'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {inv.paymentStatus !== 'paid' ? (
                                  <button
                                    onClick={() => navigate(`/invoice/${inv.id}`)}
                                    className="px-3.5 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-1 shadow-md shadow-brand-primary/5"
                                  >
                                    <CreditCard className="w-3 h-3" /> Pay
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/invoice/${inv.id}`)}
                                    className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all"
                                  >
                                    Details
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDownloadInvoice(inv.id)}
                                  className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                  title="Download TXT format invoice"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

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
              <OrderChat orderId={chatOrder.id} onClose={() => setChatOrder(null)} />
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
    </div>
  );
}
