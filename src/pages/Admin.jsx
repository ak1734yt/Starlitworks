import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, IndianRupee, FileText, Users, ShoppingBag, Loader2, Save, X, Edit, Plus, Trash2, Search, Filter, Star, CreditCard, MessageSquare, Check, ExternalLink, Download, Eye, Globe, MapPin, Activity, Zap, Tag, Bell, DollarSign, History, TrendingUp, Calendar, Receipt, Circle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import SystemHealth from '../components/SystemHealth';
import InvoicePreview from '../components/InvoicePreview';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import {
  createUserInvoice, deleteOrder, request, getPublicPrices,
  getAnalyticsLogs, updateOrderVault, updateInstallment,
  getAdminOrders, getInvoices, getAdminFeedbacks, updateOrderStatus,
  verifyPayment, updateFeedbackStatus, getCoupons, createCoupon,
  adminUpdateInvoiceStatus, adminNotifyUserInvoice, adminEditInvoice, adminAddUserCredits,
  deleteInvoice, recordInvoicePayment, deleteInvoicePayment,
  getPortfolio, createPortfolio, deletePortfolio,
  getTemplates, createTemplate, deleteTemplate
} from '../services/api';
import UserChat from '../components/UserChat';

const TABS = [
  { id: 'orders',       label: 'Service Requests', icon: ShoppingBag },
  { id: 'chats',        label: 'User Chats',      icon: MessageSquare },
  { id: 'payments',     label: 'Payments',         icon: CreditCard },
  { id: 'transactions', label: 'Transactions',     icon: History },
  { id: 'invoices',     label: 'Invoices',         icon: FileText },
  { id: 'feedbacks',    label: 'Feedbacks',        icon: Star },
  { id: 'clients',      label: 'Clients',          icon: Users },
  { id: 'portfolio',    label: 'Portfolio',        icon: LayoutDashboard },
  { id: 'templates',    label: 'Templates',        icon: ShoppingBag },
  { id: 'coupons',      label: 'Coupons',          icon: Tag },
  { id: 'pulse',        label: 'User Pulse',       icon: Activity },
];

const getScreenshotUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    const parts = url.split('/uploads/');
    if (parts.length > 1) return '/uploads/' + parts[1];
  }
  return url;
};


export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  
  const allowedTabs = TABS.filter(tab => {
    if (['clients', 'coupons', 'pulse', 'portfolio', 'templates'].includes(tab.id)) {
      return user?.role === 'manager' || user?.role === 'admin';
    }
    return true;
  });
  
  const [data, setData] = useState({ orders: [], invoices: [], prices: [], clients: [], feedbacks: [], pulse: [], coupons: [], portfolio: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals / Editing state
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showRecordPaymentForm, setShowRecordPaymentForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    userId: '',
    paymentPlan: 'full',
    taxRate: 0,
    items: [{ desc: '', amount: 0 }]
  });
  const [selectedChatUserId, setSelectedChatUserId] = useState(null);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 10 });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [addingCreditTo, setAddingCreditTo] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [submittingCredit, setSubmittingCredit] = useState(false);

  const [newPortfolio, setNewPortfolio] = useState({ title: '', description: '', banner_url: '', member_count: '', link: '', category: 'custom' });
  const [newTemplate, setNewTemplate] = useState({ title: '', description: '', price: 0, roles_json: '[]', channels_json: '[]', template_link: '' });

  const handleAddCredits = async (e) => {
    e.preventDefault();
    if (!addingCreditTo || creditAmount === 0) return;
    setSubmittingCredit(true);
    try {
      await adminAddUserCredits(addingCreditTo.id, creditAmount);
      toast.success(creditAmount > 0 ? `Successfully added ₹${creditAmount} credits to ${addingCreditTo.name}` : `Successfully removed ₹${Math.abs(creditAmount)} credits from ${addingCreditTo.name}`);
      setAddingCreditTo(null);
      setCreditAmount(0);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingCredit(false);
    }
  };

  const handleNotifyInvoice = async (invId) => {
    try {
      await adminNotifyUserInvoice(invId);
      toast.success('User notified successfully!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleInvoicePaid = async (inv) => {
    const newStatus = inv.paymentStatus === 'paid' ? 'pending' : 'paid';
    try {
      await adminUpdateInvoiceStatus(inv.id, newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setCreatingCoupon(true);
    try {
      await createCoupon(newCoupon);
      toast.success('Coupon created successfully');
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 10 });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const token = localStorage.getItem('ssw_token');

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const orders = await getAdminOrders();
      setData(prev => ({ ...prev, orders: orders || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load orders');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const invoices = await getInvoices();
      setData(prev => ({ ...prev, invoices: invoices || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load invoices');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadFeedbacks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const feedbacks = await getAdminFeedbacks();
      setData(prev => ({ ...prev, feedbacks: feedbacks || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load feedbacks');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadClients = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const clients = await request('/admin/clients');
      setData(prev => ({ ...prev, clients: clients || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load clients');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadCoupons = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const coupons = await getCoupons();
      setData(prev => ({ ...prev, coupons: coupons || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load coupons');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadPulse = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const pulse = await getAnalyticsLogs();
      setData(prev => ({ ...prev, pulse: pulse || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load system activity logs');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadPortfolio = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const portfolio = await getPortfolio();
      setData(prev => ({ ...prev, portfolio: portfolio || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load portfolio');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadTemplates = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const templates = await getTemplates();
      setData(prev => ({ ...prev, templates: templates || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load templates');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadPrices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const prices = await getPublicPrices();
      setData(prev => ({ ...prev, prices: prices || [] }));
    } catch (err) {
      if (!silent) toast.error('Failed to load prices');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchData = async (silent = false) => {
    if (activeTab === 'orders' || activeTab === 'payments') {
      await loadOrders(silent);
    } else if (activeTab === 'transactions' || activeTab === 'invoices') {
      await loadInvoices(silent);
    } else if (activeTab === 'feedbacks') {
      await loadFeedbacks(silent);
    } else if (activeTab === 'clients') {
      await loadClients(silent);
    } else if (activeTab === 'coupons') {
      await loadCoupons(silent);
    } else if (activeTab === 'pulse') {
      await loadPulse(silent);
    } else if (activeTab === 'portfolio') {
      await loadPortfolio(silent);
    } else if (activeTab === 'templates') {
      await loadTemplates(silent);
    }
    
    if (!data.prices || data.prices.length === 0) {
      await loadPrices(true);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchData();
    } else {
      navigate('/');
    }
  }, [user, navigate, activeTab]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;
    
    // Fallback to simple polling (every 10s) to avoid Vercel edge disconnections
    const interval = setInterval(() => {
      if (activeTab === 'orders' || activeTab === 'payments') {
        loadOrders(true);
      } else if (activeTab === 'transactions' || activeTab === 'invoices') {
        loadInvoices(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTab, user]);

  // --- Handlers ---
  const handleSaveOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrderStatus(editingOrder.id, editingOrder);
      
      // Also update vault if present
      if (editingOrder.vault_data) {
        let vData = editingOrder.vault_data;
        if (typeof vData === 'string') {
          try { vData = JSON.parse(vData); } catch(e) { throw new Error("Invalid JSON in Starlit Vault"); }
        }
        await updateOrderVault(editingOrder.id, vData);
      }

      toast.success('Order & Vault updated');
      setEditingOrder(null);
      fetchData();
    } catch (err) { 
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleUpdateFeedback = async (id, status) => {
    try {
      await updateFeedbackStatus(id, status);
      toast.success('Feedback status updated');
      fetchData();
    } catch (err) { 
      toast.error(err.message);
    }
  };

  const handleVerifyPayment = async (orderId, approved) => {
    try {
      await verifyPayment(orderId, approved);
      toast.success(approved ? 'Payment approved!' : 'Payment rejected');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!confirm('Are you sure you want to delete this order? This will also delete all associated chat messages.')) return;
    try {
      await deleteOrder(id);
      toast.success('Order deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditInvoiceSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let items = editingInvoice.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (err) {
          throw new Error('Invalid JSON in Invoice Items field');
        }
      }
      const updateData = {
        invoiceNumber: editingInvoice.invoiceNumber,
        invoiceDate: editingInvoice.invoiceDate,
        currency: editingInvoice.currency,
        grandTotal: Number(editingInvoice.grandTotal),
        paymentStatus: editingInvoice.paymentStatus,
        paymentType: editingInvoice.paymentType,
        items: items,
        client: editingInvoice.client
      };
      await adminEditInvoice(editingInvoice.id, updateData);
      toast.success('Invoice updated successfully');
      setEditingInvoice(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
    } catch (err) {
      toast.error(err.message);
    }
  };


  const handleUpdateInstallmentStatus = async (invoiceId, index, status) => {
    try {
      const res = await updateInstallment(invoiceId, index, status);
      toast.success('Installment updated');
      fetchData(true);
      // Update local state if the modal is open
      if (res.invoice && selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(res.invoice);
      } else if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const next = { ...selectedInvoice };
        next.installments[index].status = status;
        next.installments[index].paid = (status.toLowerCase() === 'paid');
        setSelectedInvoice(next);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !payAmount || parseFloat(payAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmittingPayment(true);
    try {
      const result = await recordInvoicePayment(selectedInvoice.id, {
        amount: parseFloat(payAmount),
        date: payDate,
        note: payNote
      });
      if (result.success) {
        setSelectedInvoice(result.invoice);
        toast.success(`₹${parseFloat(payAmount).toLocaleString()} payment recorded`);
        setPayAmount('');
        setPayNote('');
        setShowRecordPaymentForm(false);
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!selectedInvoice) return;
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
      const result = await deleteInvoicePayment(selectedInvoice.id, paymentId);
      if (result.success) {
        setSelectedInvoice(result.invoice);
        toast.success('Payment entry removed');
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete payment');
    }
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    try {
      await createPortfolio(newPortfolio);
      toast.success('Portfolio item created');
      setNewPortfolio({ title: '', description: '', banner_url: '', member_count: '', link: '', category: 'custom' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePortfolioItem = async (id) => {
    if (!confirm('Delete this portfolio item?')) return;
    try {
      await deletePortfolio(id);
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await createTemplate(newTemplate);
      toast.success('Template created');
      setNewTemplate({ title: '', description: '', price: 0, roles_json: '[]', channels_json: '[]', template_link: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTemplateItem = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const filteredOrders = data.orders.filter(o => {
    const matchesSearch = o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen pt-20 overflow-x-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-brand-bg flex-col shrink-0">
          <div className="p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Admin Panel</h2>
            <nav className="space-y-2">
              {allowedTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === 'orders' && data.orders.filter(o => o.status === 'pending').length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {data.orders.filter(o => o.status === 'pending').length}
                      </span>
                    )}
                    {tab.id === 'chats' && data.clients.reduce((acc, c) => acc + (c.details?.admin_unread_count || 0), 0) > 0 && (
                      <span className="ml-auto bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                        {data.orders.reduce((acc, o) => acc + (o.admin_unread_count || 0), 0)}
                      </span>
                    )}
                    {tab.id === 'payments' && data.orders.filter(o => o.status === 'payment_pending').length > 0 && (
                      <span className="ml-auto bg-brand-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {data.orders.filter(o => o.status === 'payment_pending').length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-6 mt-auto border-t border-white/5">
            <SystemHealth />
          </div>
        </aside>

        {/* Mobile Horizontal Tabs */}
        <div className="lg:hidden bg-brand-bg/50 backdrop-blur-md border-b border-white/5 px-6 py-4 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-3 z-40 sticky top-20">
          {allowedTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all ${
                  isActive 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'orders' && data.orders.filter(o => o.status === 'pending').length > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {data.orders.filter(o => o.status === 'pending').length}
                  </span>
                )}
                {tab.id === 'chats' && data.clients.reduce((acc, c) => acc + (c.details?.admin_unread_count || 0), 0) > 0 && (
                  <span className="bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                    {data.orders.reduce((acc, o) => acc + (o.admin_unread_count || 0), 0)}
                  </span>
                )}
                {tab.id === 'payments' && data.orders.filter(o => o.status === 'payment_pending').length > 0 && (
                  <span className="bg-brand-secondary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {data.orders.filter(o => o.status === 'payment_pending').length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-bold font-display">{allowedTabs.find(t => t.id === activeTab)?.label}</h1>
            
            <div className="flex items-center gap-4">
              {activeTab === 'orders' && (
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-primary"
                >
                  <option value="all" className="bg-brand-bg">All Statuses</option>
                  <option value="pending" className="bg-brand-bg">Pending</option>
                  <option value="quoted" className="bg-brand-bg">Quoted</option>
                  <option value="accepted" className="bg-brand-bg">Accepted</option>
                  <option value="payment_pending" className="bg-brand-bg">Payment Pending</option>
                  <option value="in_progress" className="bg-brand-bg">In Progress</option>
                  <option value="completed" className="bg-brand-bg">Completed</option>
                  <option value="rejected" className="bg-brand-bg">Rejected</option>
                </select>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary w-64"
                />
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {/* --- ORDERS TAB --- */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm min-w-[800px]">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Client</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Service</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Qty</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Timeline</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredOrders.length === 0 ? (
                          <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No requests found.</td></tr>
                        ) : filteredOrders.map(order => (
                          <tr key={order.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-gray-400">{new Date(order.created_at * 1000).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-white">{order.client_name}</p>
                              <p className="text-xs text-gray-500">{order.client_email}</p>
                            </td>
                            <td className="px-6 py-4 font-medium">{order.service_name}</td>
                            <td className="px-6 py-4 font-mono font-bold text-brand-secondary">{order.quantity || 1}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                order.status === 'quoted' ? 'bg-blue-500/10 text-blue-400' :
                                order.status === 'accepted' ? 'bg-green-500/10 text-green-400' :
                                'bg-gray-500/10 text-gray-400'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 capitalize">{order.timeline || 'None'}</td>
                            <td className="px-6 py-4 text-right space-x-3">
                              <button onClick={() => setEditingOrder(order)} className="text-brand-primary hover:text-white transition-colors text-xs font-medium">Review</button>
                              <button onClick={() => handleDeleteOrder(order.id)} className="text-gray-700 hover:text-red-500 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
            {/* --- CHATS TAB --- */}
            {activeTab === 'chats' && (
              <motion.div key="chats" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="h-[calc(100vh-200px)]">
                <div className="flex h-full gap-6 flex-col md:flex-row">
                  {/* Chat List */}
                  <div className={`w-full md:w-80 bg-brand-card border border-brand-border rounded-2xl overflow-hidden flex flex-col ${selectedChatUserId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-white/5 bg-white/5">
                      <h3 className="font-bold text-sm">Conversations</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
                      {data.clients.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs italic">No users yet.</div>
                      ) : data.clients
                          .map(client => {
                            const details = typeof client.details === 'string' ? JSON.parse(client.details) : client.details || {};
                            return { ...client, unread: details.admin_unread_count || 0 };
                          })
                          .sort((a, b) => b.unread - a.unread)
                          .map(client => (
                        <button 
                          key={client.id} 
                          onClick={() => setSelectedChatUserId(client.id)}
                          className={`w-full text-left p-4 hover:bg-white/5 transition-colors flex items-start gap-3 relative ${selectedChatUserId === client.id ? 'bg-white/5' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br ${client.unread > 0 ? 'from-brand-primary to-brand-secondary text-white' : 'from-white/10 to-white/5 text-gray-500'}`}>
                            {client.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-xs truncate text-white">{client.name}</p>
                              {client.unread > 0 && (
                                <span className="bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-brand-card">
                                  {client.unread}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 truncate mt-0.5">{client.email}</p>
                          </div>
                          {selectedChatUserId === client.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Chat */}
                  <div className={`flex-1 bg-brand-card border border-brand-border rounded-2xl overflow-hidden flex flex-col relative ${selectedChatUserId ? 'flex' : 'hidden md:flex'}`}>
                    {selectedChatUserId && (
                      <button 
                        onClick={() => setSelectedChatUserId(null)}
                        className="md:hidden flex items-center gap-2 p-4 border-b border-white/5 bg-white/5 text-xs text-brand-primary font-bold uppercase tracking-wider hover:text-white transition-all"
                      >
                        ← Back to Inbox
                      </button>
                    )}
                    {selectedChatUserId ? (
                      <UserChat userId={selectedChatUserId} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                          <MessageSquare className="w-8 h-8 text-gray-700" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Select a conversation</h3>
                          <p className="text-sm text-gray-500 max-w-xs mx-auto">Choose a user from the list on the left to start discussing with them.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {/* --- PAYMENTS TAB --- */}
            {activeTab === 'payments' && (
              <motion.div key="payments" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="grid gap-6">
                  {data.orders.filter(o => o.status === 'payment_pending').length === 0 ? (
                    <div className="glass-card py-20 text-center text-gray-500">No pending payments to verify.</div>
                  ) : data.orders.filter(o => o.status === 'payment_pending').map(order => (
                    <div key={order.id} className="glass-card p-6 grid md:grid-cols-3 gap-8">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Order #{order.id}</p>
                          <h4 className="font-bold text-lg">{order.service_name}</h4>
                          <p className="text-sm text-gray-400">Client: {order.client_name}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Transaction ID</p>
                          <p className="text-sm font-mono text-brand-primary">{order.transaction_id || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVerifyPayment(order.id, true)}
                            className="flex-1 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition-all"
                          >
                            Approve Payment
                          </button>
                          <button 
                            onClick={() => handleVerifyPayment(order.id, false)}
                            className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative group aspect-square bg-black/50 rounded-xl overflow-hidden border border-white/10">
                        {order.payment_screenshot ? (
                          <>
                            <img src={getScreenshotUrl(order.payment_screenshot)} alt="Proof" className="w-full h-full object-cover" />
                            <a 
                              href={getScreenshotUrl(order.payment_screenshot)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold"
                            >
                              <ExternalLink className="w-4 h-4" /> View Full Image
                            </a>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-700">No Screenshot</div>
                        )}
                      </div>

                      <div className="p-5 bg-white/5 rounded-xl border border-white/5 space-y-3 h-fit">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400">Order Financials</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Service Base Price</span>
                            <span className="font-mono">₹{parseFloat(order.quoted_price || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Quantity Purchased</span>
                            <span className="font-mono font-bold text-brand-secondary">{order.quantity || 1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Credits Applied</span>
                            <span className="font-mono text-green-400 font-bold">-{order.credits_applied ? `₹${parseFloat(order.credits_applied).toLocaleString()}` : '₹0'}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-white/5 text-sm font-bold">
                            <span className="text-white">Total Billable Amount</span>
                            <span className="font-mono text-white">₹{parseFloat(order.total_amount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {/* --- TRANSACTIONS TAB --- */}
            {activeTab === 'transactions' && (() => {
              const allTxns = [...data.orders].sort((a, b) => (b.updated_at || b.created_at) - (a.updated_at || a.created_at));
              const paid = allTxns.filter(o => o.payment_status === 'completed');
              const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.total_amount || o.quoted_price || 0), 0);
              const pending = allTxns.filter(o => o.status === 'payment_pending').length;
              return (
                <motion.div key="transactions" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-green-400', bg: 'bg-green-500/10' },
                      { label: 'Confirmed Payments', value: paid.length, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
                      { label: 'Pending Verification', value: pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                      { label: 'Total Orders', value: allTxns.length, color: 'text-gray-300', bg: 'bg-white/5' },
                    ].map(card => (
                      <div key={card.label} className={`glass-card p-5 rounded-2xl ${card.bg} border border-white/5`}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{card.label}</p>
                        <p className={`text-2xl font-black mt-1 ${card.color}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Full Ledger Table */}
                  <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-brand-primary" />
                      <h3 className="font-bold text-sm">Full Transaction Ledger</h3>
                      <span className="ml-auto text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{allTxns.length} records</span>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left text-sm min-w-[900px]">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order #</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Method</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Credits Used</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction ID</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Status</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {allTxns.length === 0 ? (
                            <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No transaction records found.</td></tr>
                          ) : allTxns.map(o => {
                            const amount = parseFloat(o.quoted_price || o.total_amount || 0);
                            const payStatus = o.payment_status || 'none';
                            const orderStatus = o.status || 'pending';
                            const date = o.updated_at || o.created_at;
                            const dateStr = date ? new Date(date * 1000).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
                            const payColor = payStatus === 'completed' ? 'bg-green-500/10 text-green-400' : payStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : payStatus === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-500';
                            const statusColor = orderStatus === 'completed' ? 'text-green-400' : orderStatus === 'payment_pending' ? 'text-yellow-400' : orderStatus === 'rejected' ? 'text-red-400' : 'text-gray-400';
                            return (
                              <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                                <td className="px-6 py-3 font-mono text-xs text-brand-primary">#{o.id}</td>
                                <td className="px-6 py-3 font-medium">{o.client_name || '—'}</td>
                                <td className="px-6 py-3 text-gray-400 text-xs max-w-[160px] truncate">{o.service_name}</td>
                                <td className="px-6 py-3 font-bold text-green-400">₹{amount.toLocaleString()}</td>
                                <td className="px-6 py-3 text-xs text-gray-400 capitalize">{o.payment_method || '—'}</td>
                                <td className="px-6 py-3 font-mono text-xs text-brand-secondary font-bold">{o.credits_applied ? `₹${parseFloat(o.credits_applied).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-3 font-mono text-xs text-gray-500 max-w-[140px] truncate">{o.transaction_id || '—'}</td>
                                <td className={`px-6 py-3 text-xs font-bold uppercase ${statusColor}`}>{orderStatus.replace('_', ' ')}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${payColor}`}>{payStatus === 'none' ? 'Not Paid' : payStatus}</span>
                                </td>
                                <td className="px-6 py-3 text-xs text-gray-500">{dateStr}</td>
                                <td className="px-6 py-3 text-right">
                                  <button onClick={() => handleDeleteOrder(o.id)} className="text-gray-600 hover:text-red-500 transition-colors" title="Delete Transaction">
                                    <Trash2 className="w-4 h-4 ml-auto" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
            {/* --- FEEDBACKS TAB --- */}

            {activeTab === 'feedbacks' && (
              <motion.div key="feedbacks" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm min-w-[800px]">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-gray-400">User</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Rating</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Comment</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.feedbacks.length === 0 ? (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No feedbacks found.</td></tr>
                        ) : data.feedbacks.map(f => (
                          <tr key={f.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-white">{f.name}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-0.5 text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < f.rating ? 'fill-current' : 'text-gray-600'}`} />
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-400 truncate max-w-xs">{f.comment}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                f.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                                f.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                'bg-yellow-500/10 text-yellow-500'
                              }`}>
                                {f.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {f.status !== 'approved' && (
                                <button onClick={() => handleUpdateFeedback(f.id, 'approved')} className="text-green-400 hover:text-white transition-colors text-xs font-medium">Approve</button>
                              )}
                              {f.status !== 'rejected' && (
                                <button onClick={() => handleUpdateFeedback(f.id, 'rejected')} className="text-red-400 hover:text-white transition-colors text-xs font-medium">Reject</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- INVOICES TAB --- */}
            {activeTab === 'invoices' && (
              <motion.div key="invoices" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="mb-6 flex justify-end gap-3">
                  <button onClick={() => navigate('/create-invoice')} className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create Professional Invoice
                  </button>
                  <button onClick={() => navigate('/tracker')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 px-6 rounded-2xl text-xs flex items-center gap-2 transition-all">
                    <ExternalLink className="w-4 h-4" /> View Invoice Tracker
                  </button>
                </div>
                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-sm min-w-[800px]">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-gray-400">Invoice #</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Client</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Total</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Left Amount</th>
                          <th className="px-6 py-4 font-medium text-gray-400">Type</th>
                          <th className="px-6 py-4 text-right font-medium text-gray-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.invoices.map((inv, i) => {
                          const ledgerTotal = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          const outstanding = Math.max(0, parseFloat(inv.grandTotal || 0) - ledgerTotal);
                          return (
                          <tr 
                            key={i} 
                            onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4 font-medium group-hover:text-brand-primary transition-colors">{inv.invoiceNumber}</td>
                            <td className="px-6 py-4">{inv.client?.name}</td>
                            <td className="px-6 py-4 text-gray-400">{inv.invoiceDate}</td>
                            <td className="px-6 py-4 text-green-400 font-medium">{inv.currency}{inv.grandTotal}</td>
                            <td className="px-6 py-4 text-orange-400 font-medium">{inv.currency}{outstanding.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {inv.paymentStatus || 'Pending'}
                              </span>
                            </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleInvoicePaid(inv); }}
                                className="p-1.5 hover:bg-green-500/10 rounded-lg text-green-500 transition-all"
                                title="Toggle Paid Status"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleNotifyInvoice(inv.id); }}
                                className="p-1.5 hover:bg-brand-primary/10 rounded-lg text-brand-primary transition-all"
                                title="Notify User"
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingInvoice(inv); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-all"
                                title="Edit Invoice"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(inv.id); }} 
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-all"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewInvoice(inv); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-all"
                                title="Preview Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewInvoice(inv); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-all"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

            {/* --- CLIENTS TAB --- */}
            {activeTab === 'clients' && (
              <motion.div key="clients" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.clients.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                    <div key={client.id} className="glass p-6 rounded-2xl flex items-center gap-4">
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-lg font-bold">
                          {client.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold">{client.name}</h3>
                        <p className="text-xs text-gray-500">{client.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${client.role === 'admin' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-gray-400'}`}>
                            {client.role}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/5 text-gray-500">
                            {client.provider}
                          </span>
                        </div>
                        {addingCreditTo?.id === client.id ? (
                          <div className="mt-3 bg-black/20 p-2 rounded-xl border border-white/5">
                            <form onSubmit={handleAddCredits} className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                <input type="number" required value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} className="w-full bg-white/5 rounded-lg pl-6 pr-2 py-1 text-xs text-white outline-none" placeholder="Amount (+ to add, - to remove)" />
                              </div>
                              <button type="submit" disabled={submittingCredit} className="p-1.5 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-colors" title="Apply">
                                <Check className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => setAddingCreditTo(null)} className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="Cancel">
                                <X className="w-3 h-3" />
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => setAddingCreditTo(client)} className="text-[10px] bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white px-3 py-1 rounded-full font-bold transition-colors">
                              Manage Credits
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- COUPONS TAB --- */}
            {activeTab === 'coupons' && (
              <motion.div key="coupons" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Tag className="w-5 h-5 text-brand-primary" /> Create Coupon</h3>
                      <form onSubmit={handleCreateCoupon} className="space-y-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Coupon Code (Leave empty for random)</label>
                          <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER20" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary uppercase" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Type</label>
                            <select value={newCoupon.discount_type} onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary">
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed (₹)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Value</label>
                            <input type="number" required min="1" value={newCoupon.discount_value} onChange={e => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Max Uses</label>
                          <input type="number" required min="1" value={newCoupon.max_uses} onChange={e => setNewCoupon({...newCoupon, max_uses: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                        </div>
                        <button type="submit" disabled={creatingCoupon} className="w-full btn-primary flex items-center justify-center gap-2 py-2.5">
                          {creatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate Coupon
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr>
                            <th className="px-6 py-4 font-medium text-gray-400">Code</th>
                            <th className="px-6 py-4 font-medium text-gray-400">Discount</th>
                            <th className="px-6 py-4 font-medium text-gray-400">Uses</th>
                            <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.coupons.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No coupons generated yet.</td></tr>
                          ) : data.coupons.map(coupon => (
                            <tr key={coupon.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-white">{coupon.code}</td>
                              <td className="px-6 py-4 text-brand-primary font-bold">
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                              </td>
                              <td className="px-6 py-4 text-gray-400">
                                {coupon.used_count} / {coupon.max_uses}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${coupon.used_count >= coupon.max_uses ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                  {coupon.used_count >= coupon.max_uses ? 'Exhausted' : 'Active'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- PORTFOLIO TAB --- */}
            {activeTab === 'portfolio' && (
              <motion.div key="portfolio" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Create Form */}
                  <div className="lg:col-span-1 glass-card p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4 font-display">Add Portfolio Item</h3>
                    <form onSubmit={handleCreatePortfolio} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Title</label>
                        <input type="text" required value={newPortfolio.title} onChange={e => setNewPortfolio({...newPortfolio, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="Project Title" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                        <textarea required value={newPortfolio.description} onChange={e => setNewPortfolio({...newPortfolio, description: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary resize-none" placeholder="Brief description..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Banner Image URL</label>
                        <input type="text" value={newPortfolio.banner_url} onChange={e => setNewPortfolio({...newPortfolio, banner_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">Member Count</label>
                          <input type="text" value={newPortfolio.member_count} onChange={e => setNewPortfolio({...newPortfolio, member_count: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="e.g. 5K+" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 mb-1">Category</label>
                          <input type="text" value={newPortfolio.category} onChange={e => setNewPortfolio({...newPortfolio, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="custom, public..." />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Project Link (Optional)</label>
                        <input type="text" value={newPortfolio.link} onChange={e => setNewPortfolio({...newPortfolio, link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="https://discord.gg/..." />
                      </div>
                      <button type="submit" className="w-full py-2.5 btn-primary rounded-xl text-sm font-bold mt-2">Publish to Portfolio</button>
                    </form>
                  </div>
                  
                  {/* List */}
                  <div className="lg:col-span-2 space-y-4">
                    {data.portfolio.length === 0 ? (
                      <div className="glass-card py-12 text-center text-gray-500">No portfolio items published yet.</div>
                    ) : data.portfolio.map(item => (
                      <div key={item.id} className="glass-card p-4 flex gap-4 items-center">
                        <div className="w-24 h-16 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0">
                          {item.banner_url ? <img src={item.banner_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">No Img</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{item.title}</h4>
                          <p className="text-xs text-gray-400 truncate">{item.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">{item.category}</span>
                            <span className="text-[10px] text-brand-primary font-bold">{item.member_count} Members</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeletePortfolioItem(item.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TEMPLATES TAB --- */}
            {activeTab === 'templates' && (
              <motion.div key="templates" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Create Form */}
                  <div className="lg:col-span-1 glass-card p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4 font-display">Add Marketplace Template</h3>
                    <form onSubmit={handleCreateTemplate} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Template Title</label>
                        <input type="text" required value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="e.g. Premium Gaming Server" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                        <textarea required value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary resize-none" placeholder="What does this template include?" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Price (₹)</label>
                        <input type="number" required min="0" step="0.01" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Roles JSON Array</label>
                        <input type="text" required value={newTemplate.roles_json} onChange={e => setNewTemplate({...newTemplate, roles_json: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary font-mono text-xs" placeholder='["Admin", "Mod"]' />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Channels JSON Array</label>
                        <input type="text" required value={newTemplate.channels_json} onChange={e => setNewTemplate({...newTemplate, channels_json: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary font-mono text-xs" placeholder='["#general", "#announcements"]' />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Discord Template Link</label>
                        <input type="text" required value={newTemplate.template_link} onChange={e => setNewTemplate({...newTemplate, template_link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" placeholder="https://discord.new/..." />
                      </div>
                      <button type="submit" className="w-full py-2.5 btn-primary rounded-xl text-sm font-bold mt-2">Publish Template</button>
                    </form>
                  </div>
                  
                  {/* List */}
                  <div className="lg:col-span-2 space-y-4">
                    {data.templates.length === 0 ? (
                      <div className="glass-card py-12 text-center text-gray-500">No templates published yet.</div>
                    ) : data.templates.map(tpl => (
                      <div key={tpl.id} className="glass-card p-4 flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm truncate">{tpl.title}</h4>
                              <p className="text-[10px] text-gray-400 truncate">{tpl.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-bold text-green-400">₹{tpl.price}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-mono">
                            <span>Roles: {(() => { try { return JSON.parse(tpl.roles_json).length; } catch(e){ return 0; }})()}</span>
                            <span>Channels: {(() => { try { return JSON.parse(tpl.channels_json).length; } catch(e){ return 0; }})()}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTemplateItem(tpl.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- PULSE TAB --- */}
            {activeTab === 'pulse' && (
              <motion.div key="pulse" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
                
                {/* Global Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="glass-card p-6 bg-gradient-to-br from-brand-primary/5 to-transparent border-brand-primary/10">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Live Sessions</p>
                      <div className="flex items-end justify-between">
                         <h4 className="text-3xl font-black">{data.pulse.length}</h4>
                         <Activity className="w-5 h-5 text-brand-primary animate-pulse" />
                      </div>
                   </div>
                   <div className="glass-card p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Geos Logged</p>
                      <div className="flex items-end justify-between">
                         <h4 className="text-3xl font-black">{[...new Set(data.pulse.map(p => p.country))].length}</h4>
                         <Globe className="w-5 h-5 text-brand-secondary" />
                      </div>
                   </div>
                   <div className="glass-card p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Top Location</p>
                      <div className="flex items-end justify-between">
                         <h4 className="text-xl font-bold truncate">{data.pulse[0]?.city || 'N/A'}</h4>
                         <MapPin className="w-5 h-5 text-green-500" />
                      </div>
                   </div>
                   <div className="glass-card p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">System Health</p>
                      <div className="flex items-end justify-between">
                         <h4 className="text-xl font-bold text-green-500">OPTIMAL</h4>
                         <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </div>
                   </div>
                </div>

                <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 font-medium text-gray-400">Time</th>
                        <th className="px-6 py-4 font-medium text-gray-400">User</th>
                        <th className="px-6 py-4 font-medium text-gray-400">Location</th>
                        <th className="px-6 py-4 font-medium text-gray-400">GPS / Accuracy</th>
                        <th className="px-6 py-4 font-medium text-gray-400">Device / Browser</th>
                        <th className="px-6 py-4 font-medium text-gray-400 text-right">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.pulse.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No activity logs found.</td></tr>
                      ) : data.pulse.map(log => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs text-gray-400">{new Date(log.created_at * 1000).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">{log.user_name || 'Anonymous'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-white text-xs">{log.city}, {log.region}</p>
                            <p className="text-[10px] text-gray-500">{log.country}</p>
                          </td>
                          <td className="px-6 py-4">
                             {log.lat ? (
                               <div className="flex flex-col">
                                 <div className="flex items-center gap-2">
                                   <span className="text-brand-primary text-xs font-mono">{log.lat.toFixed(4)}, {log.lon.toFixed(4)}</span>
                                   {log.risk_score > 30 && (
                                     <span className={`w-2 h-2 rounded-full ${log.risk_score > 60 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-yellow-500 shadow-[0_0_8px_orange]'}`} title={`Risk Score: ${log.risk_score}`} />
                                   )}
                                 </div>
                                 <span className="text-[9px] text-gray-500">±{Math.round(log.accuracy)}m accuracy</span>
                               </div>
                             ) : <span className="text-gray-600 italic text-xs">Blocked</span>}
                           </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-300">{log.os} • {log.browser?.split(' ').slice(0, 2).join(' ')}</p>
                            <p className="text-[10px] text-gray-500">{log.screen}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">
                            <div className="flex flex-col items-end">
                              <span>{log.ip}</span>
                              <a 
                                href={`https://www.google.com/maps?q=${log.lat},${log.lon}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[9px] text-brand-primary hover:underline mt-1 flex items-center gap-1"
                              >
                                <ExternalLink className="w-2 h-2" /> Geo-Verify
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* --- REVIEW ORDER MODAL --- */}
      <AnimatePresence>
        {editingOrder && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-brand-card border border-brand-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-brand-primary"/> Review Request</h3>
                <button onClick={() => setEditingOrder(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">Client</p>
                  <p className="font-bold">{editingOrder.client_name}</p>
                  <p className="text-gray-400">{editingOrder.client_email}</p>
                  {editingOrder.discord_username && (
                    <p className="text-brand-secondary text-xs mt-2 flex items-center gap-1">
                      <span className="font-bold">Discord:</span> {editingOrder.discord_username}
                    </p>
                  )}
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-xs mb-1">Service Requested</p>
                  <p className="font-bold text-brand-primary">{editingOrder.service_name}</p>
                  <p className="text-gray-400 capitalize mb-1">Timeline: {editingOrder.timeline || 'Flexible'}</p>
                  <p className="text-xs text-gray-400">Quantity: <span className="font-mono font-bold text-brand-secondary">{editingOrder.quantity || 1}</span></p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-500 text-xs mb-2">Client Description</p>
                <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-sm leading-relaxed text-gray-300 mb-4">
                  {editingOrder.description}
                </div>

                {editingOrder.negotiation_status && (
                  <div className={`p-4 rounded-xl border ${editingOrder.negotiation_status === 'pending' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2">Negotiation Info</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400">Requested Price</p>
                        <p className="text-lg font-bold text-white">₹{editingOrder.negotiated_price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className={`text-sm font-bold uppercase ${editingOrder.negotiation_status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>{editingOrder.negotiation_status}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm italic text-gray-400">"{editingOrder.negotiation_reason}"</p>
                    </div>
                  </div>
                )}
                
                {editingOrder.server_link && (
                  <a href={editingOrder.server_link} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm text-brand-primary hover:underline">
                    🔗 View Discord Server
                  </a>
                )}
              </div>

              {/* STALIT VAULT ASSET MANAGER */}
              <div className="mb-8 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2">
                    <Zap className="w-3 h-3" /> The Starlit Vault
                  </h4>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Client Assets</span>
                </div>
                <div className="space-y-3" key={editingOrder.id}>
                  <textarea 
                    placeholder='{"Bot Token": "MTAy...", "License": "SSW-99X"}'
                    defaultValue={(() => {
                      try {
                        const raw = editingOrder.vault_data;
                        if (typeof raw === 'string') return raw;
                        return JSON.stringify(raw || {}, null, 2);
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      try {
                        const val = e.target.value;
                        setEditingOrder({ ...editingOrder, vault_data: val });
                      } catch(err) {
                        console.error(err);
                      }
                    }}
                    className="w-full h-32 bg-black/50 border border-white/5 rounded-xl p-3 text-xs font-mono text-brand-primary focus:border-brand-primary outline-none transition-all resize-none"
                  />
                  <p className="text-[9px] text-gray-600 italic">Enter assets as JSON format. These will be visible only to the client once the order is completed.</p>
                </div>
              </div>

              <form onSubmit={handleSaveOrder} className="space-y-4 border-t border-white/10 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <select value={editingOrder.status} onChange={e => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary">
                      <option value="pending" className="bg-brand-bg">Pending</option>
                      <option value="quoted" className="bg-brand-bg">Quoted (Awaiting Client)</option>
                      <option value="accepted" className="bg-brand-bg">Accepted (In Progress)</option>
                      <option value="completed" className="bg-brand-bg">Completed</option>
                      <option value="rejected" className="bg-brand-bg">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-xs text-gray-400">Custom Quote Price (₹)</label>
                      {(() => {
                        const prod = data.prices.find(p => p.name === editingOrder.service_name || p.product_key === editingOrder.service_id);
                        if (!prod) return null;
                        const floor = parseFloat(prod.min_price || 0);
                        const hint = prod.show_price_to_admin !== 0 ? parseFloat(prod.price || 0) : 0;
                        return (
                          <div className="text-[10px] text-right">
                            {hint > 0 && <span className="text-brand-primary mr-2">Suggested: ₹{hint}</span>}
                            {floor > 0 && <span className="text-amber-500 font-bold">Floor: ₹{floor}</span>}
                          </div>
                        );
                      })()}
                    </div>
                    <input type="number" value={editingOrder.quoted_price || ''} onChange={e => setEditingOrder({...editingOrder, quoted_price: Number(e.target.value)})} placeholder="e.g. 1500" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Admin Notes (Private)</label>
                  <textarea value={editingOrder.admin_notes || ''} onChange={e => setEditingOrder({...editingOrder, admin_notes: e.target.value})} rows={2} placeholder="Internal notes..." className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary resize-none" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to delete this order? This will also delete all associated chat messages. This action is permanent!")) {
                        await handleDeleteOrder(editingOrder.id);
                        setEditingOrder(null);
                      }
                    }} 
                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4"/> Delete Request
                  </button>
                  <div className="flex-grow flex gap-3">
                    <button type="button" onClick={() => setEditingOrder(null)} className="flex-grow btn-outline">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-grow btn-primary flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Update Request
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- INVOICE DETAILS MODAL --- */}
      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)} />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col">
              
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <FileText className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Invoice {selectedInvoice.invoiceNumber}</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Linked to Order #{selectedInvoice.orderId || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPreviewInvoice(selectedInvoice)} className="p-3 hover:bg-white/5 rounded-xl transition-all border border-white/10 text-blue-400" title="Preview">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPreviewInvoice(selectedInvoice)} className="p-3 hover:bg-white/5 rounded-xl transition-all border border-white/10 text-brand-primary" title="Download TXT">
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowInvoiceModal(false)} className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all border border-white/10">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <div className="grid md:grid-cols-2 gap-10 mb-10">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Information</h4>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <p className="font-bold text-lg">{selectedInvoice.client?.name}</p>
                      <p className="text-sm text-gray-400">{selectedInvoice.client?.serverName}</p>
                      <p className="text-[10px] font-mono text-gray-600 mt-2">GSTIN: {selectedInvoice.client?.gstin || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Invoice Summary</h4>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Generated At</span>
                        <span className="text-xs">{selectedInvoice.invoiceDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">Payment Type</span>
                        <span className="text-xs font-bold capitalize text-brand-primary">{selectedInvoice.paymentType}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/5">
                        <span className="text-gray-400 font-bold">Total Amount</span>
                        <span className="text-xl font-black text-green-400">{selectedInvoice.currency}{selectedInvoice.grandTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Billing Breakdown</h4>
                  <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-gray-400">Description</th>
                          <th className="px-6 py-4 text-center font-medium text-gray-400">Qty</th>
                          <th className="px-6 py-4 text-right font-medium text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedInvoice.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 font-medium text-white">{item.description}</td>
                            <td className="px-6 py-4 text-center">{item.qty}</td>
                            <td className="px-6 py-4 text-right font-mono">{selectedInvoice.currency}{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`mt-10 grid gap-10 ${selectedInvoice.paymentType === 'installment' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Left (or full): Payments Ledger */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-green-500" /> Received Payments Ledger
                      </h4>
                      <button
                        onClick={() => {
                          setShowRecordPaymentForm(!showRecordPaymentForm);
                          setPayAmount('');
                          setPayNote('');
                          setPayDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary hover:text-white transition-all"
                      >
                        {showRecordPaymentForm ? <X className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
                        {showRecordPaymentForm ? 'Cancel' : 'Record Payment'}
                      </button>
                    </div>

                    {showRecordPaymentForm && (
                      <form onSubmit={handleRecordPayment} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Amount ({selectedInvoice.currency})</label>
                            <input
                              type="number"
                              required
                              value={payAmount}
                              onChange={e => setPayAmount(e.target.value)}
                              placeholder="e.g. 5000"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500 transition-all text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Date</label>
                            <input
                              type="date"
                              required
                              value={payDate}
                              onChange={e => setPayDate(e.target.value)}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500 transition-all text-white color-scheme-dark"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Note (Optional)</label>
                          <input
                            type="text"
                            value={payNote}
                            onChange={e => setPayNote(e.target.value)}
                            placeholder="UPI / Reference / Installment description"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-green-500 transition-all text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submittingPayment || !payAmount}
                          className="w-full py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {submittingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Confirm Payment
                        </button>
                      </form>
                    )}

                    {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                      <div className="p-8 bg-white/[0.01] border border-white/5 rounded-2xl text-center">
                        <p className="text-xs text-gray-500 italic">No payments logged yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedInvoice.payments.map((p, idx) => {
                          const amt = parseFloat(p.amount) || 0;
                          return (
                            <div key={p.id || idx} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 group hover:border-green-500/20 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-green-400">{selectedInvoice.currency}{amt.toLocaleString()}</p>
                                  <p className="text-[10px] text-gray-500">{p.date} {p.note ? `· ${p.note}` : ''}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete payment record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                        {/* Summary of ledger */}
                        {(() => {
                          const ledgerTotal = selectedInvoice.payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                          const outstanding = parseFloat(selectedInvoice.grandTotal || 0) - ledgerTotal;
                          return (
                            <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Total Received (Ledger)</span>
                                <span className="font-bold text-green-500">{selectedInvoice.currency}{ledgerTotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-white/5">
                                <span className="text-gray-500">Outstanding Balance</span>
                                <span className="font-bold text-red-400">{selectedInvoice.currency}{outstanding.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right: Installment timeline if installment */}
                  {selectedInvoice.paymentType === 'installment' && selectedInvoice.installments && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-primary" /> Projected EMI Schedule
                      </h4>
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {selectedInvoice.installments.map((inst, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-brand-primary/20 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-gray-500">
                                #{idx + 1}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{inst.month}</p>
                                <p className="text-xs font-mono text-gray-500">{selectedInvoice.currency}{inst.amount?.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  inst.status === 'paid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                  inst.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                                  inst.status === 'due' ? 'bg-yellow-500' : 'bg-gray-600'
                                }`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                  inst.status === 'paid' ? 'text-green-500' :
                                  inst.status === 'overdue' ? 'text-red-500' :
                                  inst.status === 'due' ? 'text-yellow-500' : 'text-gray-500'
                                }`}>{inst.status || (inst.paid ? 'paid' : 'pending')}</span>
                              </div>

                              <select
                                value={inst.status || (inst.paid ? 'paid' : 'pending')}
                                onChange={(e) => handleUpdateInstallmentStatus(selectedInvoice.id, idx, e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-[9px] font-black uppercase tracking-widest outline-none focus:border-brand-primary transition-all cursor-pointer text-white"
                              >
                                <option value="pending" className="bg-brand-bg text-white">Pending</option>
                                <option value="paid" className="bg-brand-bg text-green-500">Mark Paid</option>
                                <option value="due" className="bg-brand-bg text-yellow-500">Mark Due</option>
                                <option value="overdue" className="bg-brand-bg text-red-500">Overdue</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-8 bg-black/30 border-t border-white/5">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-xs text-gray-400 italic leading-relaxed">"{selectedInvoice.notes}"</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- EDIT INVOICE MODAL --- */}
      <AnimatePresence>
        {editingInvoice && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-brand-primary"/> Edit Invoice</h3>
                <button onClick={() => setEditingInvoice(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <form onSubmit={handleEditInvoiceSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Invoice Number</label>
                    <input type="text" required value={editingInvoice.invoiceNumber || ''} onChange={e => setEditingInvoice({...editingInvoice, invoiceNumber: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Invoice Date</label>
                    <input type="text" required value={editingInvoice.invoiceDate || ''} onChange={e => setEditingInvoice({...editingInvoice, invoiceDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Client Name</label>
                    <input type="text" required value={editingInvoice.client?.name || ''} onChange={e => setEditingInvoice({...editingInvoice, client: { ...editingInvoice.client, name: e.target.value }})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Client Server/Project</label>
                    <input type="text" value={editingInvoice.client?.serverName || ''} onChange={e => setEditingInvoice({...editingInvoice, client: { ...editingInvoice.client, serverName: e.target.value }})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Client GSTIN</label>
                    <input type="text" value={editingInvoice.client?.gstin || ''} onChange={e => setEditingInvoice({...editingInvoice, client: { ...editingInvoice.client, gstin: e.target.value }})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Currency</label>
                    <input type="text" required value={editingInvoice.currency || ''} onChange={e => setEditingInvoice({...editingInvoice, currency: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Grand Total</label>
                    <input type="number" required value={editingInvoice.grandTotal || ''} onChange={e => setEditingInvoice({...editingInvoice, grandTotal: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <select value={editingInvoice.paymentStatus || 'pending'} onChange={e => setEditingInvoice({...editingInvoice, paymentStatus: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary">
                      <option value="pending" className="bg-brand-bg">Pending</option>
                      <option value="paid" className="bg-brand-bg">Paid</option>
                      <option value="payment_pending" className="bg-brand-bg">Payment Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Invoice Items (JSON Format)</label>
                  <textarea 
                    rows={4}
                    value={typeof editingInvoice.items === 'string' ? editingInvoice.items : JSON.stringify(editingInvoice.items, null, 2)}
                    onChange={e => setEditingInvoice({...editingInvoice, items: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-primary resize-none" 
                  />
                  <p className="text-[9px] text-gray-500 italic mt-1">Format: [&#123;"description": "Item 1", "qty": 1, "price": 1000&#125;]</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 btn-outline">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Update Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
    </div>
  );
}
