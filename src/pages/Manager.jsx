import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Activity, Tag, Save, Plus, 
  Trash2, UserPlus, UserMinus, ChevronRight, 
  Calendar, Clock, CheckCircle2, XCircle,
  BarChart3, Settings, LogOut, Search,
  Star, MessageSquare, Palette, Globe, Megaphone, 
  Layers, ListOrdered, Share2, TrendingUp, Loader2, Gift,
  Edit, FileText, Download, CreditCard, History, Check, Bell, ExternalLink, DollarSign, X, ShoppingBag, Zap,
  ArrowLeft, MoreVertical, Layout, PieChart, IndianRupee, Mail, Send, Sparkles
} from 'lucide-react';
import { 
  getManagerLogs, getManagerUsers, updateUserRole, 
  getManagerPrices, updatePrice, createCoupon,
  getAdminOrders, verifyPayment, getManagerStats,
  createProduct, deleteProduct, setUserBanned,
  getPortfolio, createPortfolio, deletePortfolio,
  getSiteSettings, updateSiteSettings, deleteOrder,
  getAnalyticsLogs, getInvoices, adminUpdateInvoiceStatus,
  adminNotifyUserInvoice, adminAddUserCredits, seedCatalog,
  getManagerReferrals, getManagerReferralSettings, updateManagerReferralSettings,
  updateReferralTiers, setUserReferralOverride, grantManualBonus,
  getUserReferralStats, getManagerRevenue, bulkUpdateOrderStatus,
  deleteInvoice, adminEditInvoice, updateOrderStatus, updateOrderVault, managerSendTestEmail,
  getCoupons, deleteCoupon, getCouponUses, getManagerWithdrawals, updateWithdrawalStatus,
  getTemplates, createTemplate, updateTemplate, deleteTemplate
} from '../services/api';
import UserChat from '../components/UserChat';

const getScreenshotUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    const parts = url.split('/uploads/');
    if (parts.length > 1) return '/uploads/' + parts[1];
  }
  return url;
};
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const ReferralTreeNode = ({ node, level }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="text-left font-mono text-xs">
      <div 
        className={`flex items-center gap-2 py-2 px-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            <span className="text-brand-primary font-bold">{isExpanded ? '−' : '+'}</span>
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
          )}
        </div>
        <div className="flex-1 flex justify-between items-center">
          <div>
            <span className="font-bold text-white">{node.name}</span>
            <span className="text-gray-500 ml-2">#{node.id}</span>
            {node.referral_code && <span className="text-brand-secondary ml-2 bg-brand-secondary/10 px-1.5 py-0.5 rounded text-[10px]">{node.referral_code}</span>}
          </div>
          <div className="text-right flex gap-4 text-[10px] text-gray-400">
            <span>Refs: <strong className="text-white">{node.referral_count}</strong></span>
            <span>Earned: <strong className="text-green-400">₹{node.total_earned}</strong></span>
          </div>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="mt-1 border-l border-white/10 ml-5 pl-2 space-y-1 relative before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-gradient-to-b before:from-brand-primary/50 before:to-transparent">
          {node.children.map(child => (
            <ReferralTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};



export default function Manager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [users, setUsers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [siteSettings, setSiteSettings] = useState({
    maintenance_mode: 'false',
    whatsapp_enabled: 'false',
    show_stats: 'true'
  });
  const [orders, setOrders] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pulse, setPulse] = useState([]);

  // Referral states
  const [revenue, setRevenue] = useState({ weekly: 0, monthly: 0, pending: 0 });
  const [referralSettings, setReferralSettings] = useState({
    is_random: false,
    fixed_reward: 50,
    random_min: 30,
    random_max: 70,
    join_bonus: 20,
    cashback_pct: 5
  });
  const [referralsList, setReferralsList] = useState([]);
  const [referralTree, setReferralTree] = useState([]);
  const [referralTiers, setReferralTiers] = useState([]);
  const [overrideUser, setOverrideUser] = useState(null);
  const [overrideReward, setOverrideReward] = useState('');
  const [manualBonusForm, setManualBonusForm] = useState({ userId: '', amount: '', note: '' });
  const [managerWithdrawals, setManagerWithdrawals] = useState([]);
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  // New Credit and Invoice states
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [addingCreditTo, setAddingCreditTo] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditMode, setCreditMode] = useState('add'); // 'add' or 'deduct'
  const [submittingCredit, setSubmittingCredit] = useState(false);
  
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  // Test Email states
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [subject, setSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('pending');
  const [saving, setSaving] = useState(false);

  // Coupon State
  const [couponsList, setCouponsList] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: 1,
    expires_at: '',
    days_valid: ''
  });

  // Template State
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    price: 0,
    template_link: '',
    roles_json: '[]',
    channels_json: '[]'
  });

  useEffect(() => {
    if (user?.role === 'manager') {
      fetchData();
      const interval = setInterval(() => fetchData(true), 30000);
      return () => clearInterval(interval);
    }
    else if (user) navigate('/');
  }, [user, activeTab, navigate]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (activeTab === 'logs') {
        const [logData, statData, revData, orderData] = await Promise.all([
          getManagerLogs(),
          getManagerStats(),
          getManagerRevenue().catch(() => ({ weekly: 0, monthly: 0, pending: 0 })),
          getAdminOrders().catch(() => [])
        ]);
        setLogs(logData);
        setStats(statData);
        setRevenue(revData);
        setOrders(orderData);
      } else if (activeTab === 'users') {
        const data = await getManagerUsers();
        setUsers(data);
      } else if (activeTab === 'pricing') {
        const data = await getManagerPrices();
        setPrices(data);
      } else if (activeTab === 'payments') {
        const data = await getAdminOrders();
        setOrders(data);
      } else if (activeTab === 'portfolio') {
        const data = await getPortfolio();
        setPortfolio(data);
      } else if (activeTab === 'site-editor') {
        const data = await getSiteSettings();
        setSiteSettings(data);
      } else if (activeTab === 'pulse') {
        const data = await getAnalyticsLogs();
        setPulse(data);
      } else if (activeTab === 'invoices') {
        const data = await getInvoices();
        setInvoices(data);
      } else if (activeTab === 'referrals') {
        const [refList, refSet, siteSet, wList, treeData] = await Promise.all([
          getManagerReferrals().catch(() => []),
          getManagerReferralSettings().catch(() => ({
            is_random: false,
            fixed_reward: 50,
            random_min: 30,
            random_max: 70,
            join_bonus: 20,
            cashback_pct: 5
          })),
          getSiteSettings().catch(() => ({})),
          getManagerWithdrawals().catch(() => []),
          getReferralTree().catch(() => [])
        ]);
        setReferralsList(refList);
        setReferralTree(treeData);
        setReferralSettings(refSet);
        setManagerWithdrawals(wList);
        
        // Parse tiers from site settings (e.g. referral_tiers key)
        try {
          const rawTiers = siteSet.referral_tiers || '[]';
          const parsed = typeof rawTiers === 'string' ? JSON.parse(rawTiers) : rawTiers;
          setReferralTiers(Array.isArray(parsed) ? parsed : []);
        } catch (_) {
          setReferralTiers([]);
        }
      } else if (activeTab === 'coupons') {
        const data = await getCoupons();
        setCouponsList(data);
      } else if (activeTab === 'templates') {
        const data = await getTemplates();
        setTemplates(data);
      }
    } catch (err) {
      if (!silent) toast.error(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSyncCatalog = async () => {
    setSyncing(true);
    try {
      await seedCatalog();
      toast.success('Discord Catalog successfully synchronized!');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to sync catalog');
    } finally {
      setSyncing(false);
    }
  };

  const handlePriceUpdate = async (productId, currentData) => {
    try {
      await updatePrice(productId, currentData);
      toast.success('Price updated successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...couponForm,
        expires_at: couponForm.expires_at ? Math.floor(new Date(couponForm.expires_at).getTime() / 1000) : null,
        days_valid: couponForm.days_valid ? parseInt(couponForm.days_valid) : null
      };
      await createCoupon(data);
      toast.success('Coupon created successfully');
      setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: 1, expires_at: '', days_valid: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(id);
      toast.success('Coupon deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateForm);
        toast.success('Template updated successfully');
        setEditingTemplate(null);
      } else {
        await createTemplate(templateForm);
        toast.success('Template created successfully');
      }
      setTemplateForm({ title: '', description: '', price: 0, template_link: '', roles_json: '[]', channels_json: '[]' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      title: tmpl.title,
      description: tmpl.description || '',
      price: tmpl.price,
      template_link: tmpl.template_link || '',
      roles_json: tmpl.roles ? JSON.stringify(tmpl.roles) : '[]',
      channels_json: tmpl.channels ? JSON.stringify(tmpl.channels) : '[]'
    });
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      toast.success('Template deleted successfully');
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
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteOrder(id);
      toast.success('Order deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateWithdrawal = async (wid, status, note = '') => {
    try {
      await updateWithdrawalStatus(wid, status, note);
      toast.success(`Withdrawal request ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      setUpdatingWithdrawalId(null);
      setRejectNote('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update withdrawal');
    }
  };

  const handleSiteSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      await updateSiteSettings(data);
      toast.success('Site settings updated!');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!sendEmailTo) return;
    setSendingEmail(true);
    try {
      await managerSendTestEmail({
        custom_email: sendEmailTo,
        subject: subject,
        message: mailBody
      });
      toast.success(`Test email sent successfully to ${sendEmailTo}!`);
      setShowEmailModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAddCredits = async (e) => {
    e.preventDefault();
    if (!addingCreditTo || creditAmount === 0) return;
    setSubmittingCredit(true);
    try {
      const finalAmount = creditMode === 'deduct' ? -Math.abs(creditAmount) : Math.abs(creditAmount);
      await adminAddUserCredits(addingCreditTo.id, finalAmount);
      toast.success(finalAmount > 0 
        ? `Successfully added ₹${Math.abs(finalAmount)} credits to ${addingCreditTo.name}` 
        : `Successfully deducted ₹${Math.abs(finalAmount)} credits from ${addingCreditTo.name}`
      );
      setAddingCreditTo(null);
      setCreditAmount(0);
      setCreditMode('add');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update credits');
    } finally {
      setSubmittingCredit(false);
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

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrderStatus(editingOrder.id, editingOrder);
      
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

  const handleNotifyInvoice = async (invId) => {
    try {
      await adminNotifyUserInvoice(invId);
      toast.success('User notified successfully!');
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

  const handleUpdateInstallmentStatus = async (invoiceId, index, status) => {
    try {
      const token = localStorage.getItem('ssw_token');
      const res = await fetch(`/api/invoices/${invoiceId}/installment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ index, status })
      });
      if (!res.ok) throw new Error('Failed to update installment');
      toast.success('Installment updated');
      fetchData();
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const next = { ...selectedInvoice };
        next.installments[index].status = status;
        next.installments[index].paid = (status.toLowerCase() === 'paid');
        setSelectedInvoice(next);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getUserCredits = (userRow) => {
    try {
      const details = JSON.parse(userRow.details || '{}');
      return details.credits || 0;
    } catch (err) {
      return 0;
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0A0A0A] p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Manager</h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Super Admin</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'logs', icon: Activity, label: 'Activity Logs' },
            { id: 'users', icon: Users, label: 'Users & Admins' },
            { id: 'payments', icon: CreditCard, label: 'Payments Verification' },
            { id: 'invoices', icon: FileText, label: 'Invoice Ledger' },
            { id: 'pricing', icon: Tag, label: 'Pricing Engine' },
            { id: 'portfolio', icon: Layout, label: 'Portfolio Mgr' },
            { id: 'site-editor', icon: Settings, label: 'Site Editor' },
            { id: 'coupons', icon: Star, label: 'Coupons' },
            { id: 'templates', icon: ShoppingBag, label: 'Templates Mgr' },
            { id: 'referrals', icon: Gift, label: 'Referrals & Rewards' },
            { id: 'pulse', icon: BarChart3, label: 'User Pulse' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : <Users className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-all text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <p className="text-gray-500 mt-2">Manage your platform's core infrastructure and administrative controls.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-xs">
              <ArrowLeft className="w-4 h-4" /> Admin Panel
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary transition-all w-64"
              />
            </div>
            <button onClick={fetchData} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
              <Activity className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>
        
        <AnimatePresence mode="wait">

        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8 animate-fade-in">
            {/* Revenue Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-[30px] rounded-full" />
                <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Weekly Revenue</span>
                  <h4 className="text-2xl font-black font-display text-white mt-1">₹{revenue?.weekly?.toLocaleString() || 0}</h4>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 blur-[30px] rounded-full" />
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Monthly Revenue</span>
                  <h4 className="text-2xl font-black font-display text-white mt-1">₹{revenue?.monthly?.toLocaleString() || 0}</h4>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-[30px] rounded-full" />
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pending Valuation</span>
                  <h4 className="text-2xl font-black font-display text-white mt-1">₹{revenue?.pending?.toLocaleString() || 0}</h4>
                </div>
              </div>
            </div>

            {/* Draggable Kanban Board Pipeline Widget */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand-secondary" />
                    Interactive Kanban Order Pipeline
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Easily trace, manage, and transition client service flows through active execution stages.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full font-mono font-bold">
                    Pipeline Load: {orders?.length || 0} active
                  </span>
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
                {[
                  { key: 'pending', label: 'Pending Request', color: 'from-yellow-500/10 to-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-500' },
                  { key: 'quoted', label: 'Quoted / Negotiating', color: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
                  { key: 'accepted', label: 'Payment Pending', color: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
                  { key: 'in_progress', label: 'In Progress', color: 'from-brand-primary/10 to-brand-primary/5', border: 'border-brand-primary/20', text: 'text-brand-primary' },
                  { key: 'completed', label: 'Completed Deliverable', color: 'from-green-500/10 to-green-500/5', border: 'border-green-500/20', text: 'text-green-500' },
                ].map((col) => {
                  const colOrders = (orders || []).filter(o => {
                    if (col.key === 'accepted') return o.status === 'accepted' || o.status === 'payment_pending';
                    return o.status === col.key;
                  });

                  return (
                    <div 
                      key={col.key} 
                      className={`p-4 rounded-xl bg-gradient-to-b ${col.color} border ${col.border} min-w-[200px] flex flex-col space-y-4 min-h-[350px]`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const orderId = e.dataTransfer.getData("orderId");
                        if (!orderId) return;
                        try {
                          await updateOrderStatus(orderId, { status: col.key });
                          toast.success(`Order #${orderId} moved to ${col.label}`);
                          fetchData();
                        } catch (err) {
                          toast.error(err.message || 'Failed to move order');
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] uppercase font-black tracking-wider ${col.text}`}>{col.label}</span>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 font-bold">{colOrders.length}</span>
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                        {colOrders.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-10 border border-dashed border-white/5 rounded-lg">
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Empty Stage</span>
                          </div>
                        ) : (
                          colOrders.map(order => (
                            <div 
                              key={order.id} 
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("orderId", order.id);
                              }}
                              className="p-3 bg-[#0c0d12] border border-white/10 rounded-lg hover:border-white/20 transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02] shadow-lg relative group text-left"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[8px] font-mono text-gray-500">#{order.id}</span>
                                <span className="text-[9px] font-bold text-white">₹{order.quoted_price || order.price || 0}</span>
                              </div>
                              <h4 className="text-[10px] font-black text-white truncate mb-1">{order.service_name || 'Premium Setup'}</h4>
                              <p className="text-[9px] text-gray-500 line-clamp-2">{order.description || 'No description'}</p>

                              {/* Interactive controls for quick moving */}
                              <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[7px] text-gray-600 uppercase font-black font-mono">{order.discord_username || 'No Discord'}</span>
                                <select 
                                  value={order.status}
                                  onChange={async (e) => {
                                    try {
                                      await updateOrderStatus(order.id, { status: e.target.value });
                                      toast.success(`Order #${order.id} updated!`);
                                      fetchData();
                                    } catch (err) {
                                      toast.error(err.message);
                                    }
                                  }}
                                  className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[8px] text-gray-400 outline-none"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="quoted">Quoted</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graph Pattern */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-primary" />
                  Activity Graph (Last 30 Days)
                </h3>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickFormatter={(str) => str.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#4b5563" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#7c3aed' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#7c3aed" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Manager/Admin</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {loading ? (
                    <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">Loading logs...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">No activity logs found.</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{log.user_name}</div>
                        <div className="text-[10px] text-gray-500">ID: {log.user_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                          log.action.includes('UPDATE') ? 'bg-blue-500/10 text-blue-400' :
                          log.action.includes('CHANGE') ? 'bg-purple-500/10 text-purple-400' :
                          'bg-gray-500/10 text-gray-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{log.details}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(log.created_at * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div key="payments" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid gap-6">
            <div className="flex justify-between items-center bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
                {[
                  { id: 'pending', label: 'Verification Required' },
                  { id: 'verified', label: 'Payment Verified' },
                  { id: 'completed', label: 'Payment Completed' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentFilter(opt.id)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      paymentFilter === opt.id 
                        ? 'bg-brand-primary text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filteredOrders = orders.filter(o => {
                if (paymentFilter === 'pending') return o.status === 'payment_pending';
                if (paymentFilter === 'verified') return o.status === 'accepted' || o.status === 'in_progress';
                if (paymentFilter === 'completed') return o.status === 'completed';
                return true;
              });

              if (filteredOrders.length === 0) {
                return (
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl py-20 text-center text-gray-500 shadow-2xl">
                    No orders found matching this filter.
                  </div>
                );
              }

              return (
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02]">
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Name</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category / Service</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified By</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {filteredOrders.map(order => (
                          <tr 
                            key={order.id} 
                            onClick={() => setEditingOrder(order)}
                            className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-mono text-xs text-brand-primary font-bold">#{order.id}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{order.client_name}</div>
                              <div className="text-[10px] text-gray-500">{order.client_email}</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-300">{order.service_name}</td>
                            <td className="px-6 py-4 font-bold text-white">₹{order.quoted_price?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                order.status === 'payment_pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                order.status === 'accepted' ? 'bg-green-500/10 text-green-500' :
                                order.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-500'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {order.payment_verified_by ? (
                                <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10">
                                  {order.payment_verified_by}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-600 italic">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                                className="px-3 py-1.5 bg-white/5 hover:bg-brand-primary/10 border border-white/5 hover:border-brand-primary/20 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all"
                              >
                                View / Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 gap-6">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider font-bold">Credits</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined At</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                              {u.avatar_url ? <img src={u.avatar_url} alt="" /> : <Users className="w-4 h-4 text-gray-500" />}
                            </div>
                            <div>
                              <div className="font-medium text-white">{u.name}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                            u.role === 'manager' ? 'bg-brand-primary/20 text-brand-primary' :
                            u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-green-400">
                          ₹{getUserCredits(u).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(u.created_at * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSendEmailTo(u.email);
                                setSubject('Starlitworks Mail Connection Test');
                                setMailBody('Hello, this is a test email sent from the Manager Panel to verify that SMTP mail services are configured correctly. Cheers!');
                                setShowEmailModal(true);
                              }}
                              className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-all"
                              title="Send Test Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setAddingCreditTo(u); setCreditAmount(0); }}
                              className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all"
                              title="Add Credits"
                            >
                              <IndianRupee className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to ${u.is_banned ? 'Unban' : 'Ban'} this user?`)) {
                                  await setUserBanned(u.id, !u.is_banned);
                                  fetchData();
                                }
                              }}
                              className={`p-2 rounded-lg transition-all ${u.is_banned ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                              title={u.is_banned ? 'Unban User' : 'Ban User'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            {u.role !== 'manager' && (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="bg-black border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all font-semibold"
                              >
                                <option value="client">Client</option>
                                <option value="regular_client">Regular Client</option>
                                <option value="vip_client">VIP Client</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'pricing' && (
          <motion.div key="pricing" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleSyncCatalog}
                disabled={syncing}
                className="px-6 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl transition-all font-bold text-sm flex items-center gap-2"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                Sync Discord Catalog
              </button>
              <button 
                onClick={() => setShowProductModal(true)}
                className="btn-primary py-2 px-6 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
            {['server', 'bot', 'scripts', 'events', 'joins', 'addon', 'infra', 'decorations_gift', 'decorations_login', 'nitro_accounts', 'booster', 'promo'].map(cat => {
              const categoryPrices = prices.filter(p => p.category === cat);
              if (categoryPrices.length === 0) return null;
              return (
                <div key={cat} className="mb-12">
                  <h3 className="text-xl font-bold mb-6 capitalize text-brand-primary tracking-widest border-b border-white/10 pb-2">{cat}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryPrices.map(item => (
                <div key={item.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all group relative">
                  <button 
                    onClick={async () => {
                      if (confirm('Delete this product?')) {
                        await deleteProduct(item.id);
                        fetchData();
                      }
                    }}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-white/5 px-2 py-1 rounded mb-2 inline-block">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    {/* Price (actual quoted price — admin hint) */}
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Suggested Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input 
                          type="number" 
                          defaultValue={item.price}
                          onBlur={(e) => handlePriceUpdate(item.id, { ...item, price: parseFloat(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">Suggested quote shown to admin when pricing this product.</p>
                    </div>

                    {/* Min Price floor */}
                    <div>
                      <label className="text-xs text-amber-400/80 uppercase tracking-widest font-semibold block mb-1">
                        🔒 Min Price Floor (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">₹</span>
                        <input 
                          type="number"
                          defaultValue={item.min_price !== undefined && item.min_price !== null && item.min_price !== 0 ? item.min_price : item.price}
                          onBlur={(e) => handlePriceUpdate(item.id, { ...item, min_price: parseFloat(e.target.value) || item.price || 0 })}
                          className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg pl-8 pr-4 py-2 text-sm text-amber-200 focus:outline-none focus:border-amber-400 transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-amber-500/60 mt-1">Admin cannot quote below this price. Set 0 to disable floor.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Tag</label>
                        <input 
                          type="text" 
                          defaultValue={item.tag}
                          onBlur={(e) => handlePriceUpdate(item.id, { ...item, tag: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Unit</label>
                        <input 
                          type="text" 
                          placeholder="e.g. per 1k"
                          defaultValue={item.unit_label}
                          onBlur={(e) => handlePriceUpdate(item.id, { ...item, unit_label: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`manual-${item.id}`}
                          defaultChecked={item.is_manual_price}
                          onChange={(e) => handlePriceUpdate(item.id, { ...item, is_manual_price: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor={`manual-${item.id}`} className="text-xs text-gray-400">Custom Quote for Clients (hide price from shop)</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`admin-${item.id}`}
                          defaultChecked={item.show_price_to_admin !== 0}
                          onChange={(e) => handlePriceUpdate(item.id, { ...item, show_price_to_admin: e.target.checked ? 1 : 0 })}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-amber-400 focus:ring-amber-400"
                        />
                        <label htmlFor={`admin-${item.id}`} className="text-xs text-amber-400/70">Show suggested price to Admin when quoting</label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'portfolio' && (
          <motion.div key="portfolio" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-10">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-primary" />
                Add Success Story / Portfolio
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                await createPortfolio(data);
                toast.success('Portfolio item added!');
                e.target.reset();
                fetchData();
              }} className="grid md:grid-cols-2 gap-6">
                <input name="title" placeholder="Community Name" required className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                <input name="banner_url" placeholder="Banner URL" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                <input name="member_count" placeholder="Member Count / Tech Stack" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                <input name="link" placeholder="Server/Project Link" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="category" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all">
                    <optgroup label="Main Portfolio">
                      <option value="portfolio">Success Story</option>
                    </optgroup>
                    <optgroup label="About Section">
                      <option value="community">Upgraded Community</option>
                      <option value="project">Custom Build</option>
                    </optgroup>
                    <optgroup label="Categories">
                      <option value="server">Server Management</option>
                      <option value="bot">Bot Development</option>
                      <option value="ui">UI/UX Design</option>
                      <option value="fullstack">Full Stack</option>
                    </optgroup>
                  </select>
                  <input name="sort_order" type="number" placeholder="Sort Order (0-99)" defaultValue="0" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                </div>
                <textarea name="description" placeholder="Short Description / Focus Area" className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                <button type="submit" className="md:col-span-2 btn-primary py-4 rounded-xl font-bold">Post Item</button>
              </form>
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
              {['all', 'portfolio', 'community', 'project', 'server', 'bot'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchTerm(cat === 'all' ? '' : cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    (searchTerm === cat || (cat === 'all' && searchTerm === '')) 
                    ? 'bg-brand-primary text-white' 
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {portfolio.filter(item => !searchTerm || item.category === searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                <div key={item.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl group">
                  <div className="h-48 relative overflow-hidden">
                    <img src={item.banner_url || '/logo.png'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                    <div className="absolute top-4 right-4 glass px-2 py-1 rounded text-[10px] font-bold text-brand-primary uppercase">
                      {item.category}
                    </div>
                    <div className="absolute bottom-4 left-6">
                      <h4 className="text-xl font-bold">{item.title}</h4>
                      <p className="text-xs text-brand-primary font-bold">{item.member_count}</p>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between border-t border-white/5">
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-bold flex items-center gap-2 text-white hover:text-brand-primary transition-colors">
                      View Server <ExternalLink className="w-3 h-3" />
                    </a>
                    <button 
                      onClick={async () => {
                        if (confirm('Delete this portfolio item?')) {
                          await deletePortfolio(item.id);
                          fetchData();
                        }
                      }}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'site-editor' && (
          <motion.div key="site-editor" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-10">
            <form onSubmit={handleSiteSettingsSubmit} className="space-y-8">
              {/* Hero Section */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Layout className="w-5 h-5 text-brand-primary" />
                  Hero Section
                </h3>
                <div className="grid gap-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Main Title (HTML allowed)</label>
                      <input name="hero_title" defaultValue={siteSettings.hero_title} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Banner Image URL</label>
                      <input name="hero_banner" defaultValue={siteSettings.hero_banner} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Subtitle / Description</label>
                    <textarea name="hero_subtitle" defaultValue={siteSettings.hero_subtitle} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-24" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Status Text</label>
                      <input name="hero_status_text" defaultValue={siteSettings.hero_status_text} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Badge 1 (Live)</label>
                      <input name="hero_badge_live" defaultValue={siteSettings.hero_badge_live} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Badge 2 (Secure)</label>
                      <input name="hero_badge_secure" defaultValue={siteSettings.hero_badge_secure} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Branding & Appearance */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Palette className="w-5 h-5 text-brand-primary" />
                  Branding & Appearance
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Primary Brand Color</label>
                    <div className="flex gap-2">
                      <input type="color" name="brand_primary" defaultValue={siteSettings.brand_primary} className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-1 cursor-pointer" />
                      <input type="text" value={siteSettings.brand_primary} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono" readOnly />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Secondary Brand Color</label>
                    <div className="flex gap-2">
                      <input type="color" name="brand_secondary" defaultValue={siteSettings.brand_secondary} className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-1 cursor-pointer" />
                      <input type="text" value={siteSettings.brand_secondary} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono" readOnly />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO & Meta Tags */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Globe className="w-5 h-5 text-blue-400" />
                  SEO & Meta Tags
                </h3>
                <div className="grid gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Meta Title</label>
                    <input name="meta_title" defaultValue={siteSettings.meta_title} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Meta Description</label>
                    <textarea name="meta_description" defaultValue={siteSettings.meta_description} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-24" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Meta Keywords (comma separated)</label>
                      <input name="meta_keywords" defaultValue={siteSettings.meta_keywords} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">OG Image URL (Social Sharing)</label>
                      <input name="meta_og_image" defaultValue={siteSettings.meta_og_image} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Website Stats Customizer */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <TrendingUp className="w-5 h-5 text-brand-primary" />
                  Website Stats Customizer
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Bots Developed</label>
                    <input name="stat_bots_developed" defaultValue={siteSettings.stat_bots_developed || "10"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Dev Servers</label>
                    <input name="stat_dev_servers" defaultValue={siteSettings.stat_dev_servers || "20+"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Total Users</label>
                    <input name="discord_member_count" defaultValue={siteSettings.discord_member_count || "10000"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Commands Written</label>
                    <input name="stat_commands_written" defaultValue={siteSettings.stat_commands_written || "900+"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Projects Developed</label>
                    <input name="stat_projects_developed" defaultValue={siteSettings.stat_projects_developed || "50+"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Client Satisfaction</label>
                    <input name="stat_client_satisfaction" defaultValue={siteSettings.stat_client_satisfaction || "100%"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Uptime %</label>
                    <input name="stat_uptime" defaultValue={siteSettings.stat_uptime || "99%"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Support</label>
                    <input name="stat_support" defaultValue={siteSettings.stat_support || "24/7"} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                </div>
              </div>

              {/* Section Visibility & Global Controls */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Megaphone className="w-5 h-5 text-red-400" />
                  Section Visibility & Global Controls
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                    <div>
                      <p className="text-sm font-bold text-red-400">Maintenance Mode</p>
                      <p className="text-[10px] text-gray-500">Disable site for everyone but admins</p>
                    </div>
                    <select name="maintenance_mode" defaultValue={siteSettings.maintenance_mode} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Show Stats</p>
                      <p className="text-[10px] text-gray-500">Homepage counter</p>
                    </div>
                    <select name="show_stats" defaultValue={siteSettings.show_stats} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Visible</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Show Feedbacks</p>
                      <p className="text-[10px] text-gray-500">User reviews</p>
                    </div>
                    <select name="show_feedbacks" defaultValue={siteSettings.show_feedbacks} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Visible</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Show Pricing</p>
                      <p className="text-[10px] text-gray-500">Pricing cards</p>
                    </div>
                    <select name="show_pricing" defaultValue={siteSettings.show_pricing} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Visible</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Show Portfolio</p>
                      <p className="text-[10px] text-gray-500">Portfolio showcase</p>
                    </div>
                    <select name="show_portfolio" defaultValue={siteSettings.show_portfolio} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Visible</option>
                      <option value="false">Hidden</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* WhatsApp Integration */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  WhatsApp Notification Integration
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Manager WhatsApp Number</label>
                    <input name="whatsapp_number" placeholder="+91..." defaultValue={siteSettings.whatsapp_number} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">WhatsApp API Key (CallMeBot)</label>
                    <input name="whatsapp_api_key" placeholder="Enter your apikey" defaultValue={siteSettings.whatsapp_api_key} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-sm font-bold">Forward Chat to WhatsApp</p>
                      <p className="text-[10px] text-gray-500">Enable notifications</p>
                    </div>
                    <select name="whatsapp_enabled" defaultValue={siteSettings.whatsapp_enabled} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs">
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
                <p className="mt-4 text-[10px] text-gray-500 italic">
                  Note: This uses the CallMeBot API for free WhatsApp notifications. Ensure your number is registered with CallMeBot to receive messages.
                </p>
              </div>

              {/* About Section */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Users className="w-5 h-5 text-brand-secondary" />
                  About Section
                </h3>
                <div className="grid gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">About Title</label>
                    <input name="about_title" defaultValue={siteSettings.about_title} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Bio / Description</label>
                    <textarea name="about_bio" defaultValue={siteSettings.about_bio} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-32" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Architect Role Description</label>
                      <textarea name="architect_desc" defaultValue={siteSettings.architect_desc} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-20" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Dev Role Description</label>
                      <textarea name="dev_desc" defaultValue={siteSettings.dev_desc} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Branding & Appearance */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Palette className="w-5 h-5 text-brand-primary" />
                  Branding & Appearance
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Primary Brand Color</label>
                    <div className="flex gap-2">
                      <input type="color" name="brand_primary" defaultValue={siteSettings.brand_primary} className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-1 cursor-pointer" />
                      <input type="text" value={siteSettings.brand_primary} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono" readOnly />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Secondary Brand Color</label>
                    <div className="flex gap-2">
                      <input type="color" name="brand_secondary" defaultValue={siteSettings.brand_secondary} className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 p-1 cursor-pointer" />
                      <input type="text" value={siteSettings.brand_secondary} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono" readOnly />
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Links & Footer */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <Share2 className="w-5 h-5 text-purple-400" />
                  Global Links & Footer
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Discord Invitation Link</label>
                    <input name="discord_link" defaultValue={siteSettings.discord_link} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Footer Copyright Text</label>
                    <input name="footer_text" defaultValue={siteSettings.footer_text} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                </div>
              </div>

              {/* Contact / CTA Section */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Contact CTA
                </h3>
                <div className="grid gap-6">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">CTA Title</label>
                    <input name="contact_cta_title" defaultValue={siteSettings.contact_cta_title} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">CTA Subtext</label>
                    <textarea name="contact_cta_subtext" defaultValue={siteSettings.contact_cta_subtext} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-20" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end sticky bottom-0 pt-4 bg-[#050505]/80 backdrop-blur-md z-10 border-t border-white/5">
                <button type="submit" className="btn-primary py-4 px-12 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                  <Save className="w-5 h-5" />
                  Save All Site Content
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'coupons' && (
          <motion.div key="coupons" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold">Create New Coupon</h3>
              </div>
              
              <form onSubmit={handleCouponSubmit} className="space-y-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Coupon Code</label>
                  <input 
                    type="text" 
                    placeholder="WINTER50"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all font-mono tracking-widest"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Type</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                      value={couponForm.discount_type}
                      onChange={(e) => setCouponForm({...couponForm, discount_type: e.target.value})}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Value</label>
                    <input 
                      type="number" 
                      placeholder="10"
                      required
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({...couponForm, discount_value: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Max Uses</label>
                    <input 
                      type="number" 
                      value={couponForm.max_uses}
                      onChange={(e) => setCouponForm({...couponForm, max_uses: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Valid For (Days)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 7 (Leave empty for fixed expiry)"
                      value={couponForm.days_valid}
                      onChange={(e) => setCouponForm({...couponForm, days_valid: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">OR Specific Expiry Date</label>
                  <input 
                    type="date" 
                    value={couponForm.expires_at}
                    onChange={(e) => setCouponForm({...couponForm, expires_at: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all [color-scheme:dark]"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                  Generate Coupon
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-gradient-to-br from-brand-primary/10 to-transparent border border-brand-primary/20 rounded-2xl">
                <h4 className="font-bold flex items-center gap-2 mb-4 text-brand-primary">
                  <TrendingUp className="w-5 h-5" />
                  Coupon Performance
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Redeemed</p>
                    <p className="text-2xl font-bold">{couponsList.reduce((acc, curr) => acc + curr.used_count, 0)}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Active Coupons</p>
                    <p className="text-2xl font-bold text-green-400">{couponsList.filter(c => c.status !== 'expired').length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl flex-1 max-h-[500px] overflow-y-auto">
                <h4 className="font-bold flex items-center gap-2 mb-4 text-white">
                  <ListOrdered className="w-5 h-5" />
                  Active & Expired Coupons
                </h4>
                <div className="space-y-3">
                  {couponsList.map(c => (
                    <div key={c.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${c.status === 'expired' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-bold text-lg text-white tracking-widest">{c.code}</p>
                          <p className="text-xs text-gray-400">Discount: {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}</p>
                        </div>
                        <button onClick={() => handleDeleteCoupon(c.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 border-t border-white/5 pt-2 mt-1">
                        <span>Used: {c.used_count} / {c.max_uses}</span>
                        <span>{c.expires_at ? `Exp: ${new Date(c.expires_at * 1000).toLocaleDateString()}` : 'No Expiry'}</span>
                      </div>
                    </div>
                  ))}
                  {couponsList.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No coupons generated yet.</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'pulse' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-primary" />
                  Live User Pulse Logs
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-medium text-gray-400">Time</th>
                      <th className="px-6 py-4 font-medium text-gray-400">User</th>
                      <th className="px-6 py-4 font-medium text-gray-400">Location</th>
                      <th className="px-6 py-4 font-medium text-gray-400">GPS / Accuracy</th>
                      <th className="px-6 py-4 font-medium text-gray-400">Device</th>
                      <th className="px-6 py-4 font-medium text-gray-400 text-right">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pulse.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">No user tracking data available yet.</td></tr>
                    ) : pulse.filter(p => !searchTerm || p.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.ip.includes(searchTerm)).map(log => (
                      <tr key={log.id} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at * 1000).toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{log.user_name || 'Anonymous'}</td>
                        <td className="px-6 py-4">
                          <p className="text-white text-xs">{log.city}, {log.region}</p>
                          <p className="text-[10px] text-gray-500">{log.country}</p>
                        </td>
                        <td className="px-6 py-4">
                          {log.lat ? (
                            <div className="flex flex-col">
                              <span className="text-brand-primary text-xs font-mono">{log.lat.toFixed(4)}, {log.lon.toFixed(4)}</span>
                              <span className="text-[9px] text-gray-500">±{Math.round(log.accuracy)}m accuracy</span>
                            </div>
                          ) : <span className="text-gray-700 italic text-xs">Blocked</span>}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-300">{log.os} • {log.browser?.split(' ').slice(0, 2).join(' ')}</p>
                          <p className="text-[10px] text-gray-500">{log.screen}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
        
        {activeTab === 'invoices' && (
          <motion.div key="invoices" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Invoice Ledger</h3>
                <p className="text-xs text-gray-500">View and track all client invoice activities.</p>
              </div>
              <button onClick={() => navigate('/tracker')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 px-6 rounded-2xl text-xs flex items-center gap-2 transition-all">
                <ExternalLink className="w-4 h-4" /> View Invoice Tracker
              </button>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {invoices.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500 italic">No invoices found.</td></tr>
                    ) : invoices.filter(inv => !searchTerm || inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv, i) => (
                      <tr 
                        key={i} 
                        onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-medium group-hover:text-brand-primary transition-colors">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">{inv.client?.name}</td>
                        <td className="px-6 py-4 text-gray-400">{inv.invoiceDate}</td>
                        <td className="px-6 py-4 text-green-400 font-medium">{inv.currency}{inv.grandTotal}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400' : 
                            inv.paymentStatus === 'payment_pending' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>
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
                              onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(inv.id); }} 
                              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-all"
                              title="Download TXT"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div key="templates" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
              </div>
              
              <form onSubmit={handleTemplateSubmit} className="space-y-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold">Template Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Gaming Community Layout"
                    required
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold">Price (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 499"
                      required
                      value={templateForm.price}
                      onChange={(e) => setTemplateForm({...templateForm, price: parseFloat(e.target.value) || 0})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold">Template Link</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://discord.new/..."
                      required
                      value={templateForm.template_link}
                      onChange={(e) => setTemplateForm({...templateForm, template_link: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold">Description</label>
                  <textarea 
                    placeholder="Provide a compelling description of the template layout, roles, and setup..."
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-24 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold font-mono">Roles JSON (Advanced)</label>
                    <textarea 
                      placeholder="[]"
                      value={templateForm.roles_json}
                      onChange={(e) => setTemplateForm({...templateForm, roles_json: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-primary transition-all font-mono h-20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2 font-display font-bold font-mono">Channels JSON (Advanced)</label>
                    <textarea 
                      placeholder="[]"
                      value={templateForm.channels_json}
                      onChange={(e) => setTemplateForm({...templateForm, channels_json: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-brand-primary transition-all font-mono h-20 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    {editingTemplate ? 'Update Template' : 'Save Template'}
                  </button>
                  {editingTemplate && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingTemplate(null);
                        setTemplateForm({ title: '', description: '', price: 0, template_link: '', roles_json: '[]', channels_json: '[]' });
                      }}
                      className="px-6 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all text-sm font-semibold text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
              <div>
                <h3 className="text-xl font-bold">Existing Templates</h3>
                <p className="text-xs text-gray-500 mt-1">Manage and configure server templates currently in the marketplace catalog.</p>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {templates.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
                    <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No templates created yet.</p>
                    <p className="text-xs text-gray-600 mt-1">Save a template from Discord bot using !savetemplate or fill the form on the left.</p>
                  </div>
                ) : (
                  templates.map((tmpl) => (
                    <div key={tmpl.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{tmpl.title}</h4>
                          <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded font-mono font-bold">
                            ₹{tmpl.price}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{tmpl.description || 'No description provided.'}</p>
                        <div className="flex flex-col gap-1 text-[10px] text-gray-500 font-mono">
                          <div className="flex gap-4">
                            <span>Roles: <strong className="text-white">{tmpl.roles?.length || 0}</strong></span>
                            <span>Channels: <strong className="text-white">{tmpl.channels?.length || 0}</strong></span>
                          </div>
                          {tmpl.template_link && (
                            <span className="text-brand-secondary truncate max-w-[300px]" title={tmpl.template_link}>
                              {tmpl.template_link}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button 
                          onClick={() => handleEditTemplate(tmpl)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all"
                          title="Edit Template"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-all"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'referrals' && (
          <motion.div key="referrals" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8 animate-fade-in text-left">
            {/* Top row: Global settings & milestone editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Global Settings */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings className="w-5 h-5 text-brand-primary" />
                  Referral Rules & Engine Customizer
                </h3>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs space-y-1.5 leading-relaxed text-purple-200">
                  <div className="font-bold flex items-center gap-1.5 text-white">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Ripple Points Engine Enabled
                  </div>
                  <p>Promoters (Referrers) automatically receive <strong>25 Ripple Points</strong> for every <strong>₹500</strong> of a referred order total (e.g. ₹1,200 purchase yields 50 pts).</p>
                  <p className="text-[10px] text-gray-500"><strong>Note:</strong> A minimum order size of <strong>₹500</strong> is strictly required. Below ₹500, no referral points are awarded. Promoters can convert points instantly into credits at <strong>5 Points = ₹1 INR</strong>.</p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateManagerReferralSettings(referralSettings);
                    toast.success('Referral configurations saved successfully!');
                    fetchData();
                  } catch(err) {
                    toast.error(err.message || 'Failed to save rules');
                  }
                }} className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Random Reward Mode (Auto Referral)</h4>
                      <p className="text-[10px] text-gray-500">Draw random invite credit rewards from a range bounds instead of a fixed amount.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={referralSettings.is_random} 
                        onChange={(e) => setReferralSettings({...referralSettings, is_random: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary" />
                    </label>
                  </div>

                  {!referralSettings.is_random ? (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Base Invite Reward (₹)</label>
                      <input 
                        type="number" 
                        value={referralSettings.fixed_reward}
                        onChange={(e) => setReferralSettings({...referralSettings, fixed_reward: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Min Credit Limit (₹)</label>
                        <input 
                          type="number" 
                          value={referralSettings.random_min}
                          onChange={(e) => setReferralSettings({...referralSettings, random_min: Number(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Max Credit Limit (₹)</label>
                        <input 
                          type="number" 
                          value={referralSettings.random_max}
                          onChange={(e) => setReferralSettings({...referralSettings, random_max: Number(e.target.value)})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">User Welcome Bonus (₹)</label>
                      <input 
                        type="number" 
                        value={referralSettings.join_bonus}
                        onChange={(e) => setReferralSettings({...referralSettings, join_bonus: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Subsequent Order Cashback (%)</label>
                      <input 
                        type="number" 
                        value={referralSettings.cashback_pct}
                        onChange={(e) => setReferralSettings({...referralSettings, cashback_pct: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-brand-primary rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2 text-white"
                  >
                    <Save className="w-4 h-4" /> Save Rules Configurations
                  </button>
                </form>
              </div>

              {/* Milestone Tiers configurator */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-left">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Star className="w-5 h-5 text-brand-secondary" />
                    Milestone Tier Multipliers
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Configure cumulative referral targets that automatically trigger extra credits.</p>
                </div>

                <div className="space-y-4">
                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                    {referralTiers.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-6 text-center">No milestone tiers defined yet.</p>
                    ) : (
                      referralTiers.map((tier, idx) => (
                        <div key={idx} className="flex gap-4 items-center p-3 bg-white/[0.01] border border-white/5 rounded-xl justify-between">
                          <span className="text-xs font-bold text-white">Tier {idx + 1}: {tier.count} successful invites</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-brand-secondary">+₹{tier.bonus} credits</span>
                            <button
                              onClick={async () => {
                                const nextTiers = referralTiers.filter((_, i) => i !== idx);
                                try {
                                  await updateReferralTiers(nextTiers);
                                  toast.success('Tier removed');
                                  fetchData();
                                } catch(e) {
                                  toast.error(e.message);
                                }
                              }}
                              className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-all border-0 bg-transparent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Tier */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const count = Number(fd.get('count'));
                    const bonus = Number(fd.get('bonus'));
                    if (count <= 0 || bonus <= 0) return;
                    
                    const nextTiers = [...referralTiers, { count, bonus }].sort((a, b) => a.count - b.count);
                    try {
                      await updateReferralTiers(nextTiers);
                      toast.success('Milestone tier added!');
                      e.target.reset();
                      fetchData();
                    } catch(e) {
                      toast.error(e.message);
                    }
                  }} className="grid grid-cols-3 gap-2 items-end pt-4 border-t border-white/5 text-left">
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black block mb-1">Invites Needed</label>
                      <input name="count" required type="number" placeholder="3" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-white" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black block mb-1">Reward Payout (₹)</label>
                      <input name="bonus" required type="number" placeholder="40" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-primary text-white" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-lg text-xs hover:bg-brand-secondary/90 transition-all h-9 flex items-center justify-center gap-1 border-0">
                      <Plus className="w-3.5 h-3.5" /> Add Tier
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Row: User credit overrides, manual bonus grant and Referrals ledger logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* User Referral Custom Overrides & Manual Grants */}
              <div className="lg:col-span-1 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-left">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-white/5 pb-3">
                  <UserPlus className="w-4 h-4 text-brand-primary" />
                  Custom Overrides & Grants
                </h3>

                {/* Search / Selector */}
                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-2">Search Client for override</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <select 
                        value={overrideUser?.id || ''} 
                        onChange={(e) => {
                          const chosen = users.find(u => u.id === e.target.value);
                          setOverrideUser(chosen || null);
                          setOverrideReward('');
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-xs outline-none focus:border-brand-primary text-gray-300"
                      >
                        <option value="" className="bg-[#0A0A0A]">Select a client...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="bg-[#0A0A0A]">{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {overrideUser && (
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-4 text-left">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Current override reward:</span>
                        <span className="font-bold text-brand-primary">
                          {(() => {
                            try {
                              const d = JSON.parse(overrideUser.details || '{}');
                              return d.custom_referral_reward ? `₹${d.custom_referral_reward}` : 'None';
                            } catch (_) { return 'None'; }
                          })()}
                        </span>
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest block font-black">Set New Override Value (₹)</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="e.g. 100"
                            value={overrideReward} 
                            onChange={(e) => setOverrideReward(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-primary flex-1 text-center text-white"
                          />
                          <button
                            onClick={async () => {
                              try {
                                await setUserReferralOverride(overrideUser.id, Number(overrideReward));
                                toast.success(`Override saved for ${overrideUser.name}!`);
                                setOverrideReward('');
                                fetchData();
                              } catch(e) {
                                toast.error(e.message);
                              }
                            }}
                            className="px-3 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-primary/90 transition-all shrink-0 border-0"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Direct Manual Bonus Credit top up with Note description */}
                  <div className="pt-4 border-t border-white/5 space-y-4 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Direct Manual Bonus Grant</h4>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!manualBonusForm.userId || !manualBonusForm.amount) return;
                      try {
                        await grantManualBonus(manualBonusForm.userId, Number(manualBonusForm.amount), manualBonusForm.note);
                        toast.success('Direct bonus granted and logged!');
                        setManualBonusForm({ userId: '', amount: '', note: '' });
                        fetchData();
                      } catch(err) {
                        toast.error(err.message || 'Failed to grant bonus');
                      }
                    }} className="space-y-3">
                      <div>
                        <select 
                          required
                          value={manualBonusForm.userId}
                          onChange={(e) => setManualBonusForm({...manualBonusForm, userId: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-primary text-gray-300"
                        >
                          <option value="" className="bg-[#0A0A0A]">Select client to credit...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id} className="bg-[#0A0A0A]">{u.name} (₹{getUserCredits(u)} credits)</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-left">
                        <div className="col-span-1">
                          <input 
                            required
                            type="number" 
                            placeholder="₹ Amt"
                            value={manualBonusForm.amount}
                            onChange={(e) => setManualBonusForm({...manualBonusForm, amount: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-primary text-center text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="text" 
                            placeholder="Reason (e.g. VIP invite)"
                            value={manualBonusForm.note}
                            onChange={(e) => setManualBonusForm({...manualBonusForm, note: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-brand-primary text-gray-300"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-brand-secondary text-white font-bold rounded-xl text-xs hover:bg-brand-secondary/90 transition-all flex items-center justify-center gap-1 shadow-lg shadow-brand-secondary/15 border-0"
                      >
                        <Check className="w-3.5 h-3.5" /> Grant Manual Bonus
                      </button>
                    </form>
                  </div>
                </div>
              </div>

            {/* Cash Payout Requests Approvals Ledger */}
            <div className="lg:col-span-3 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-display font-bold text-sm flex items-center gap-2 text-white">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Referral Cash Payout Requests approvals
                </h3>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-emerald-400 font-mono font-bold">
                  {managerWithdrawals.filter(w => w.status === 'pending').length} pending requests
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-white/5 border-b border-white/5 text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Payment Details</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {managerWithdrawals.length === 0 ? (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500 italic">No payout requests in database.</td></tr>
                    ) : (
                      managerWithdrawals.map((w, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-white">{w.user_name}</p>
                            <p className="text-[9px] text-gray-500 font-mono">{w.user_email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white">₹{w.amount}</td>
                          <td className="px-4 py-3 font-sans truncate max-w-[200px]" title={w.payment_info}>{w.payment_info}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono">{new Date(w.created_at * 1000).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              w.status === 'approved' 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : w.status === 'rejected' 
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {w.status === 'pending' ? (
                              <div className="flex gap-2 justify-end items-center">
                                {updatingWithdrawalId === w.id ? (
                                  <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                    <input 
                                      type="text" 
                                      placeholder="Reason / Note"
                                      value={rejectNote}
                                      onChange={(e) => setRejectNote(e.target.value)}
                                      className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none w-32"
                                    />
                                    <button 
                                      onClick={() => handleUpdateWithdrawal(w.id, 'rejected', rejectNote)}
                                      className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-bold"
                                    >
                                      Reject
                                    </button>
                                    <button 
                                      onClick={() => setUpdatingWithdrawalId(null)}
                                      className="text-gray-400 hover:text-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateWithdrawal(w.id, 'approved')}
                                      className="px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-500 hover:text-white transition-all flex items-center gap-1 shadow-md shadow-green-500/5"
                                    >
                                      <Check className="w-3 h-3" /> Approve
                                    </button>
                                    <button 
                                      onClick={() => setUpdatingWithdrawalId(w.id)}
                                      className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 shadow-md shadow-red-500/5"
                                    >
                                      <X className="w-3 h-3" /> Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic font-mono">{w.note || 'No notes'}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

              {/* Referrals ledger register tables */}
              <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-primary" />
                    Double-Sided Referral Ledgers Register
                  </h3>
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-500 font-mono font-bold">
                    {referralsList?.length || 0} invitation traces
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-white/5 border-b border-white/5 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Referrer</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Invited Client</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Registration Date</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Invite Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {referralsList.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-10 text-center text-gray-500 italic">No referral records exist in database.</td></tr>
                      ) : (
                        referralsList.filter(ref => !searchTerm || ref.referrer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || ref.referred_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((ref, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-4 py-3 font-bold text-white">{ref.referrer_name}</td>
                            <td className="px-4 py-3 text-gray-300">
                              <p className="font-bold">{ref.referred_name}</p>
                              <p className="text-[9px] text-gray-500 font-mono">{ref.referred_email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-500 font-mono">{new Date(ref.created_at * 1000).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                ref.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}>
                                {ref.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-brand-secondary">+₹{ref.invite_reward}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* MLM Referral Tree */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-left mt-8">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-secondary" />
                  MLM Referral Tree
                </h3>
              </div>
              <div className="overflow-auto max-h-[500px] p-4 bg-white/5 rounded-xl border border-white/10">
                {referralTree.length === 0 ? (
                  <p className="text-gray-500 italic text-sm text-center">No referrals made yet.</p>
                ) : (
                  <div className="space-y-4">
                    {referralTree.map((node) => (
                      <ReferralTreeNode key={node.id} node={node} level={0} />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg p-8 shadow-2xl relative">
            <button onClick={() => setShowProductModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold mb-6">Add New Product</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = {
                name: formData.get('name'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                description: formData.get('description'),
                unit_label: formData.get('unit_label') || '',
                is_manual_price: formData.get('is_manual_price') === 'on' ? 1 : 0
              };
              await createProduct(data);
              toast.success('Product created!');
              setShowProductModal(false);
              fetchData();
            }} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Service Name</label>
                <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Category</label>
                  <select name="category" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all">
                    <option value="server">Server</option>
                    <option value="bot">Bot</option>
                    <option value="scripts">Scripts</option>
                    <option value="events">Events</option>
                    <option value="joins">Joins</option>
                    <option value="addon">Add-on</option>
                    <option value="infra">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Price (₹)</label>
                  <input name="price" type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Unit Label (Optional)</label>
                <input name="unit_label" placeholder="e.g. per 1k" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Description</label>
                <textarea name="description" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all h-24" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_manual_price" className="w-4 h-4 rounded border-white/10 bg-white/5" />
                <label className="text-xs text-gray-400">Custom Quote / Manual Price</label>
              </div>
              <button type="submit" className="w-full btn-primary py-4 rounded-xl font-bold mt-4">Create Product</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Credits Modal */}
      <AnimatePresence>
        {addingCreditTo && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => setAddingCreditTo(null)} />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl relative z-10"
            >
              <button 
                onClick={() => setAddingCreditTo(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IndianRupee className="text-green-400 w-5 h-5" />
                Manage User Credits
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Adjust credit balance for <span className="text-white font-medium">{addingCreditTo.name}</span> ({addingCreditTo.email}).
              </p>
              
              {/* Segmented Control / Toggle */}
              <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setCreditMode('add')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    creditMode === 'add' 
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Add Credits (+)
                </button>
                <button
                  type="button"
                  onClick={() => setCreditMode('deduct')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    creditMode === 'deduct' 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Deduct Credits (-)
                </button>
              </div>
              
              <form onSubmit={handleAddCredits} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">
                    {creditMode === 'add' ? 'Amount to Add (₹)' : 'Amount to Deduct (₹)'}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={submittingCredit}
                  className={`w-full py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                    creditMode === 'add'
                      ? 'bg-green-500 hover:bg-green-600 shadow-green-500/10'
                      : 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                  }`}
                >
                  {submittingCredit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> 
                      {creditMode === 'add' ? 'Confirm Add Credits' : 'Confirm Deduct Credits'}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SEND TEST EMAIL MODAL --- */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-6 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Decorative light reflection */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Mail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Send Connection Test Mail</h3>
                    <p className="text-xs text-gray-500">Verify SMTP settings by mailing a test message.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Recipient Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="recipient@example.com"
                    value={sendEmailTo}
                    onChange={(e) => setSendEmailTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Subject</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Mail Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-1.5">Message Body</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Write a message here..."
                    value={mailBody}
                    onChange={(e) => setMailBody(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-all font-medium resize-none"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={sendingEmail}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Test Email
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INVOICE DETAILS MODAL --- */}
      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setShowInvoiceModal(false)} />
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
                  <button onClick={() => handleDownloadInvoice(selectedInvoice.id)} className="p-3 hover:bg-white/5 rounded-xl transition-all border border-white/10 text-brand-primary" title="Download TXT">
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

                {selectedInvoice.paymentType === 'installment' && selectedInvoice.installments && (
                  <div className="mt-10 space-y-6">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payment Schedule & Installments</h4>
                    <div className="grid gap-4">
                      {selectedInvoice.installments.map((inst, idx) => (
                        <div key={idx} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-brand-primary/20 transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-gray-500">
                              #{idx + 1}
                            </div>
                            <div>
                              <p className="font-bold">{inst.month}</p>
                              <p className="text-xs font-mono text-gray-500">{selectedInvoice.currency}{inst.amount?.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${
                                 inst.status === 'paid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                 inst.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                                 inst.status === 'due' ? 'bg-yellow-500' : 'bg-gray-600'
                               }`} />
                               <span className={`text-[10px] font-black uppercase tracking-widest ${
                                 inst.status === 'paid' ? 'text-green-500' :
                                 inst.status === 'overdue' ? 'text-red-500' :
                                 inst.status === 'due' ? 'text-yellow-500' : 'text-gray-500'
                               }`}>{inst.status || (inst.paid ? 'paid' : 'pending')}</span>
                            </div>
                            
                            <select 
                              value={inst.status || (inst.paid ? 'paid' : 'pending')}
                              onChange={(e) => handleUpdateInstallmentStatus(selectedInvoice.id, idx, e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-primary transition-all cursor-pointer text-white"
                            >
                              <option value="pending" className="bg-[#0A0A0A]">Pending</option>
                              <option value="paid" className="bg-[#0A0A0A] text-green-500">Mark Paid</option>
                              <option value="due" className="bg-[#0A0A0A] text-yellow-500">Mark Due</option>
                              <option value="overdue" className="bg-[#0A0A0A] text-red-500">Overdue</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div className="p-8 bg-black/30 border-t border-white/5">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-xs text-gray-400 italic leading-relaxed">"{selectedInvoice.notes}"</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT INVOICE MODAL --- */}
      <AnimatePresence>
        {editingInvoice && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
                      <option value="pending" className="bg-[#0A0A0A]">Pending</option>
                      <option value="paid" className="bg-[#0A0A0A]">Paid</option>
                      <option value="payment_pending" className="bg-[#0A0A0A]">Payment Pending</option>
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

      {/* --- EDIT ORDER MODAL --- */}
      <AnimatePresence>
        {editingOrder && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{scale:0.95}} animate={{scale:1}} className="bg-[#07070c] border border-white/10 rounded-3xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <ShoppingBag className="w-5 h-5 text-brand-primary"/>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Manage Order</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Order ID: #{editingOrder.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditingOrder(null)} className="text-gray-500 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5"/></button>
              </div>

              {editingOrder.status === 'payment_pending' && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-0.5">Verification Required</p>
                    <p className="text-xs text-gray-400">Please review proof and click Approve to activate this order.</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      type="button"
                      onClick={async () => {
                        await handleVerifyPayment(editingOrder.id, true);
                        setEditingOrder(null);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Payment
                    </button>
                    <button 
                      type="button"
                      onClick={async () => {
                        await handleVerifyPayment(editingOrder.id, false);
                        setEditingOrder(null);
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Proof
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Details & Form */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Client Info</p>
                      <p className="font-bold text-sm">{editingOrder.client_name}</p>
                      <p className="text-xs text-gray-400">{editingOrder.client_email}</p>
                      {editingOrder.discord_username && (
                        <div className="inline-block px-2 py-0.5 mt-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-md">
                          Discord: {editingOrder.discord_username}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Requested Service</p>
                      <p className="font-bold text-sm text-brand-primary">{editingOrder.service_name}</p>
                      <p className="text-xs text-gray-400 mt-1 capitalize">Timeline: {editingOrder.timeline || 'Flexible'}</p>
                      <p className="text-xs text-gray-400">Qty: <span className="font-mono font-bold text-brand-secondary">{editingOrder.quantity || 1}</span></p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Description</p>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-xs md:text-sm leading-relaxed text-gray-300">
                      {editingOrder.description || "No description provided."}
                    </div>
                    {editingOrder.server_link && (
                      <a href={editingOrder.server_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs text-brand-primary hover:underline">
                        🔗 View Discord Server Link
                      </a>
                    )}
                  </div>

                  {editingOrder.negotiation_status && (
                    <div className={`p-4 rounded-xl border ${editingOrder.negotiation_status === 'pending' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-2">Negotiation Details</p>
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <p className="text-gray-500">Requested Custom Price</p>
                          <p className="text-sm font-bold text-white">₹{editingOrder.negotiated_price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">Status</p>
                          <p className={`font-bold uppercase ${editingOrder.negotiation_status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`}>{editingOrder.negotiation_status}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5 text-xs">
                        <p className="text-gray-500 mb-1">Reason</p>
                        <p className="italic text-gray-400">"{editingOrder.negotiation_reason}"</p>
                      </div>
                    </div>
                  )}

                  {/* STARLIT VAULT */}
                  <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary flex items-center gap-2 mb-3">
                      <Zap className="w-3 h-3" /> The Starlit Vault
                    </h4>
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
                          setEditingOrder({ ...editingOrder, vault_data: e.target.value });
                        } catch(err) {
                          console.error(err);
                        }
                      }}
                      className="w-full h-24 bg-black/40 border border-white/5 rounded-xl p-3 text-xs font-mono text-brand-primary focus:border-brand-primary outline-none transition-all resize-none"
                    />
                    <p className="text-[9px] text-gray-600 mt-1 italic">Deliver tokens, credentials, or licenses privately to the client.</p>
                  </div>

                  <form onSubmit={handleSaveOrder} className="space-y-4 border-t border-white/5 pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Order Status</label>
                        <select value={editingOrder.status} onChange={e => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary">
                          <option value="pending">Pending</option>
                          <option value="quoted">Quoted (Awaiting Client)</option>
                          <option value="accepted">Accepted (In Progress)</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-xs text-gray-400">Quote Price (₹)</label>
                          {(() => {
                            const prod = prices?.find(p => p.name === editingOrder.service_name || p.product_key === editingOrder.service_id);
                            if (!prod) return null;
                            const floor = parseFloat(prod.min_price || 0);
                            const hint = prod.show_price_to_admin !== 0 ? parseFloat(prod.price || 0) : 0;
                            return (
                              <div className="text-[9px] text-right">
                                {hint > 0 && <span className="text-brand-primary mr-2">List: ₹{hint}</span>}
                                {floor > 0 && <span className="text-amber-500 font-bold">Floor: ₹{floor}</span>}
                              </div>
                            );
                          })()}
                        </div>
                        <input type="number" value={editingOrder.quoted_price || ''} onChange={e => setEditingOrder({...editingOrder, quoted_price: Number(e.target.value)})} placeholder="e.g. 1500" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Admin Notes (Private)</label>
                      <textarea value={editingOrder.admin_notes || ''} onChange={e => setEditingOrder({...editingOrder, admin_notes: e.target.value})} rows={2} placeholder="Internal details..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-primary resize-none" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this order? This action is permanent!")) {
                            await handleDeleteOrder(editingOrder.id);
                            setEditingOrder(null);
                          }
                        }} 
                        className="px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4"/> Delete Order
                      </button>
                      <div className="flex-1 flex gap-2">
                        <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-center">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-secondary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Save Details
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Right Column: Chat & Screenshots */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-[400px] flex flex-col shadow-inner">
                    <UserChat userId={editingOrder.user_id} />
                  </div>

                  {editingOrder.payment_screenshot && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment Proof</p>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 group bg-black/40">
                        <img src={getScreenshotUrl(editingOrder.payment_screenshot)} alt="Proof" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <a 
                            href={getScreenshotUrl(editingOrder.payment_screenshot)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" /> View Full Image
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
