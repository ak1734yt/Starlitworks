import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, Clock, ShoppingBag, MessageSquare, Check, X, ShieldAlert, Send, CreditCard } from 'lucide-react';
import OrderChat from '../components/OrderChat';
import { negotiateOrder, acceptOrder } from '../services/api';
import { getUserInvoicesByAdmin } from '../services/api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Activity, Globe, Monitor, MapPin } from 'lucide-react';

const ROADMAP_STAGES = [
  { id: 'requirement', label: 'Briefing', statuses: ['pending', 'quoted'], sub: 'Initial requirements gathering' },
  { id: 'engagement', label: 'Setup', statuses: ['accepted', 'payment_pending'], sub: 'Contract & Infrastructure' },
  { id: 'development', label: 'Build', statuses: ['in_progress'], sub: 'Core logic & Bot development' },
  { id: 'testing', label: 'QC', statuses: [], sub: 'Quality Control & Stress Testing' },
  { id: 'deployment', label: 'Live', statuses: ['completed'], sub: 'Final deployment & Handover' }
];

export default function History() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [chatOrder, setChatOrder] = useState(null);
  const [negotiatingOrder, setNegotiatingOrder] = useState(null);
  const [vaultOrder, setVaultOrder] = useState(null);
  const [negotiationForm, setNegotiationForm] = useState({ price: '', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('ssw_token');
      if (!token) {
        navigate('/login');
        return;
      }
      const res = await fetch('/api/orders/mine', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
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
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getRoadmapStep = (status) => {
    if (status === 'completed') return 4;
    if (status === 'in_progress') return 2;
    if (['accepted', 'payment_pending'].includes(status)) return 1;
    return 0; // pending/quoted
  };

  useEffect(() => { if(user) load(); }, [user]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return o.service_name?.toLowerCase().includes(q) || o.server_link?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-brand-primary font-bold tracking-widest uppercase text-xs mb-3">
              <Clock className="w-4 h-4" />
              History
            </div>
            <h1 className="font-display text-4xl font-bold">My <span className="text-gradient">Records</span></h1>
            <p className="text-gray-500 text-sm mt-2">{activeTab === 'requests' ? orders.length : invoices.length} records found</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                placeholder={`Search ${activeTab}...`}
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-brand-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          <button 
            onClick={() => { setActiveTab('requests'); setSearch(''); }}
            className={`font-bold pb-2 transition-all border-b-2 ${activeTab === 'requests' ? 'text-brand-primary border-brand-primary' : 'text-gray-500 border-transparent hover:text-white'}`}
          >
            Service Requests
          </button>
          <button 
            onClick={() => { setActiveTab('invoices'); setSearch(''); }}
            className={`font-bold pb-2 transition-all border-b-2 ${activeTab === 'invoices' ? 'text-brand-primary border-brand-primary' : 'text-gray-500 border-transparent hover:text-white'}`}
          >
            My Invoices
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p>Fetching records...</p>
          </div>
        ) : activeTab === 'requests' ? (
          filtered.length === 0 ? (
          <div className="glass-card py-32 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No records found</h3>
            <p className="text-gray-600 text-sm max-w-xs mt-2">You haven't made any service requests yet.</p>
            <button onClick={() => navigate('/shop')} className="btn-primary mt-6">Go to Shop</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((order, index) => {
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-6 flex flex-col h-full hover:border-white/20 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ShoppingBag className="w-4 h-4 text-brand-primary" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Order #{order.id}</p>
                        </div>
                        <h3 className="font-bold text-lg leading-tight">{order.service_name}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        order.status === 'quoted' ? 'bg-blue-500/10 text-blue-400' :
                        order.status === 'accepted' ? 'bg-brand-primary/10 text-brand-primary' :
                        order.status === 'payment_pending' ? 'bg-purple-500/10 text-purple-400' :
                        order.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400' :
                        order.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-grow mb-6">
                      <p className="text-sm text-gray-400 line-clamp-3 mb-4">{order.description}</p>
                      
                      {/* Project Roadmap */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex justify-between mb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Project Roadmap</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary">
                            {order.status === 'completed' ? '100%' : order.status === 'in_progress' ? '65%' : '20%'} Progress
                          </span>
                        </div>
                        <div className="flex gap-1.5 items-center mb-1">
                          {[0, 1, 2, 3, 4].map(step => {
                            const current = getRoadmapStep(order.status);
                            return (
                              <div key={step} className="flex-1 h-1.5 rounded-full relative overflow-hidden bg-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: step <= current ? '100%' : '0%' }}
                                  className={`h-full ${step < current ? 'bg-brand-primary' : step === current ? 'bg-brand-secondary animate-pulse' : ''}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-gray-600 uppercase tracking-tighter">
                          <span>Briefing</span>
                          <span>Setup</span>
                          <span>Build</span>
                          <span>QC</span>
                          <span>Live</span>
                        </div>
                      </div>

                      {order.server_link && (
                        <p className="text-xs text-brand-secondary mt-4 flex items-center gap-2">
                          <Globe className="w-3 h-3" /> {order.server_link}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Requested On</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at * 1000).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Quote Price</p>
                        {order.quoted_price ? (
                          <p className="text-sm font-bold text-white">₹{order.quoted_price.toLocaleString()}</p>
                        ) : (
                          <p className="text-xs text-gray-500 italic">Pending...</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button 
                        onClick={() => setChatOrder(order)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </button>
                      
                      {order.status === 'quoted' && !order.negotiation_status && (
                        <button 
                          onClick={() => handleAccept(order.id)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}

                      {order.status === 'quoted' && !order.negotiation_status && (
                        <button 
                          onClick={() => {
                            setNegotiatingOrder(order);
                            setNegotiationForm({ price: order.quoted_price, reason: '' });
                          }}
                          className="col-span-2 py-2.5 bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl text-xs font-bold text-brand-secondary hover:bg-brand-secondary hover:text-white transition-all"
                        >
                          Negotiate Quote
                        </button>
                      )}

                      {order.negotiation_status === 'pending' && (
                        <div className="col-span-2 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-500 font-medium text-center">
                          Negotiation request sent (₹{order.negotiated_price})
                        </div>
                      )}

                      {order.status === 'accepted' && (
                        <button 
                          onClick={() => navigate(`/checkout/${order.id}`)}
                          className="col-span-2 py-2.5 bg-brand-primary rounded-xl text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pay Now to Start
                        </button>
                      )}

                      {order.status === 'payment_pending' && (
                        <div className="col-span-2 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Verification in Progress</p>
                        </div>
                      )}

                      {order.status === 'in_progress' && (
                        <div className="col-span-2 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Project in Progress</p>
                        </div>
                      )}

                      {order.status === 'completed' && (
                        <button 
                          onClick={() => setVaultOrder(order)}
                          className="col-span-2 py-2.5 bg-green-500 rounded-xl text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Access The Vault
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )) : (
          /* Invoices Tab Content */
          invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.id?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="glass-card py-32 flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">No invoices found</h3>
              <p className="text-gray-600 text-sm max-w-xs mt-2">You don't have any invoices assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.id?.toLowerCase().includes(search.toLowerCase())).map((inv, index) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-6 flex flex-col h-full hover:border-white/20 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-brand-primary" />
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{inv.id}</p>
                        </div>
                        <h3 className="font-bold text-lg leading-tight text-white">{inv.invoiceDate}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                        inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {inv.paymentStatus?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>

                    <div className="flex-grow mb-6 space-y-2">
                      {inv.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 truncate pr-4">{item.desc}</span>
                          <span className="font-bold">₹{item.amount}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Total</p>
                        <p className="text-lg font-bold text-brand-primary">₹{inv.grandTotal?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Plan</p>
                        <p className="text-xs text-gray-400 capitalize">{inv.paymentType}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2">
                      <button 
                        onClick={() => navigate(`/checkout/invoice/${inv.id}`)}
                        className="flex-1 py-2.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay
                      </button>
                      <button 
                        onClick={() => handleDownloadInvoice(inv.id)}
                        className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ))}
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

      {/* Vault Modal */}
      <AnimatePresence>
        {vaultOrder && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-card border border-brand-primary/20 rounded-3xl p-8 w-full max-w-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <ShieldAlert className="w-32 h-32 text-brand-primary" />
              </div>

              <div className="flex justify-between items-start mb-8 relative">
                <div>
                  <div className="flex items-center gap-2 text-brand-primary font-black uppercase text-[10px] tracking-widest mb-2">
                    <Zap className="w-3 h-3" /> Secure Delivery
                  </div>
                  <h3 className="text-3xl font-display font-bold">The Starlit <span className="text-gradient">Vault</span></h3>
                  <p className="text-gray-500 text-sm mt-1">Order #{vaultOrder.id} • {vaultOrder.service_name}</p>
                </div>
                <button onClick={() => setVaultOrder(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <X className="w-6 h-6 text-gray-500 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4">
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
                        <p className="text-gray-400 font-bold">The Starlit Vault is empty.</p>
                        <p className="text-gray-600 text-[10px] mt-1 uppercase tracking-widest font-black">There's nothing here yet.</p>
                      </div>
                    );
                  }

                  return entries.map(([key, val]) => (
                    <div key={key} className="glass-card p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                      <div>
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">{key}</p>
                        <p className="font-mono text-sm text-gray-300 break-all">{val}</p>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(val);
                          toast.success(`${key} copied!`);
                        }}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-8 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3 items-center">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                <p className="text-[10px] text-yellow-500/80 leading-relaxed font-medium">
                  CAUTION: These credentials are confidential. Do not share your vault access with anyone. Starlit Siege Works will never ask for your passwords.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
