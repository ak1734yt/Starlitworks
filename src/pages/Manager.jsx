import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Activity, Tag, Save, Plus, 
  Trash2, UserPlus, UserMinus, ChevronRight, 
  Calendar, Clock, CheckCircle2, XCircle,
  BarChart3, Settings, LogOut, Search,
  Star, MessageSquare, Palette, Globe, Megaphone, 
  Layers, ListOrdered, Share2, TrendingUp, Loader2
} from 'lucide-react';
import { 
  getManagerLogs, getManagerUsers, updateUserRole, 
  getManagerPrices, updatePrice, createCoupon,
  getAdminOrders, verifyPayment, getManagerStats,
  createProduct, deleteProduct, setUserBanned,
  getPortfolio, createPortfolio, deletePortfolio,
  getSiteSettings, updateSiteSettings, deleteOrder,
  getAnalyticsLogs, getInvoices, adminUpdateInvoiceStatus,
  adminNotifyUserInvoice, adminAddUserCredits
} from '../services/api';
import OrderChat from '../components/OrderChat';

const getScreenshotUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    const parts = url.split('/uploads/');
    if (parts.length > 1) return '/uploads/' + parts[1];
  }
  return url;
};
import { CreditCard, ExternalLink, Check, X, ArrowLeft, MoreVertical, Layout, PieChart, IndianRupee, Bell, Download, FileText } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [pulse, setPulse] = useState([]);

  // New Credit and Invoice states
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [addingCreditTo, setAddingCreditTo] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Coupon State
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: 1,
    expires_at: ''
  });

  useEffect(() => {
    if (user?.role === 'manager') fetchData();
    else if (user) navigate('/');
  }, [user, activeTab, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'logs') {
        const [logData, statData] = await Promise.all([getManagerLogs(), getManagerStats()]);
        setLogs(logData);
        setStats(statData);
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
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'client' : 'admin';
    try {
      await updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      fetchData();
    } catch (err) {
      toast.error(err.message);
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
        expires_at: couponForm.expires_at ? Math.floor(new Date(couponForm.expires_at).getTime() / 1000) : null
      };
      await createCoupon(data);
      toast.success('Coupon created successfully');
      setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', max_uses: 1, expires_at: '' });
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

  const handleAddCredits = async (e) => {
    e.preventDefault();
    if (!addingCreditTo || creditAmount <= 0) return;
    setSubmittingCredit(true);
    try {
      await adminAddUserCredits(addingCreditTo.id, creditAmount);
      toast.success(`Successfully added ₹${creditAmount} credits to ${addingCreditTo.name}`);
      setAddingCreditTo(null);
      setCreditAmount(0);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingCredit(false);
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
          <motion.div key="logs" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
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
          <motion.div key="payments" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="grid gap-8">
            {orders.filter(o => o.status === 'payment_pending').length === 0 ? (
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl py-20 text-center text-gray-500 shadow-2xl">
                No pending payments to verify.
              </div>
            ) : orders.filter(o => o.status === 'payment_pending').map(order => (
              <div key={order.id} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 grid lg:grid-cols-3 gap-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-16 -mt-16" />
                
                <div className="space-y-6 relative">
                  <div>
                    <p className="text-[10px] text-brand-primary uppercase font-bold tracking-widest mb-1">Order #{order.id}</p>
                    <h4 className="font-bold text-2xl">{order.service_name}</h4>
                    <p className="text-sm text-gray-500">Client: <span className="text-white">{order.client_name}</span></p>
                  </div>

                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Transaction ID</p>
                      <p className="text-sm font-mono text-brand-primary break-all">{order.transaction_id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Quoted Price</p>
                      <p className="text-lg font-bold">₹{order.quoted_price?.toLocaleString() || '0'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleVerifyPayment(order.id, true)}
                      className="flex-1 py-3 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-xs font-bold hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => handleVerifyPayment(order.id, false)}
                      className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button 
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-3 bg-white/5 text-gray-500 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                      title="Delete Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="relative group aspect-video lg:aspect-square bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                  {order.payment_screenshot ? (
                    <>
                      <img src={getScreenshotUrl(order.payment_screenshot)} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <a 
                          href={getScreenshotUrl(order.payment_screenshot)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2 border border-white/10 transition-all"
                        >
                          <ExternalLink className="w-4 h-4" /> View Full Image
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-2">
                      <Activity className="w-8 h-8 opacity-20" />
                      <span className="text-xs font-bold uppercase tracking-widest opacity-20">No Screenshot</span>
                    </div>
                  )}
                </div>

                <div className="h-[450px] lg:h-full min-h-[400px] border-l border-white/5 pl-8">
                  <OrderChat orderId={order.id} />
                </div>
              </div>
            ))}
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
                              <button 
                                onClick={() => handleRoleChange(u.id, u.role)}
                                className={`p-2 rounded-lg transition-all ${
                                  u.role === 'admin' 
                                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                }`}
                                title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              >
                                {u.role === 'admin' ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                              </button>
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
            <div className="flex justify-end">
              <button 
                onClick={() => setShowProductModal(true)}
                className="btn-primary py-2 px-6 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
            {['server', 'bot', 'scripts', 'events', 'joins', 'addon', 'infra'].map(cat => {
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
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-1">Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                        <input 
                          type="number" 
                          defaultValue={item.price}
                          onBlur={(e) => handlePriceUpdate(item.id, { ...item, price: parseFloat(e.target.value) })}
                          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-brand-primary transition-all"
                        />
                      </div>
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

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id={`manual-${item.id}`}
                        defaultChecked={item.is_manual_price}
                        onChange={(e) => handlePriceUpdate(item.id, { ...item, is_manual_price: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary"
                      />
                      <label htmlFor={`manual-${item.id}`} className="text-xs text-gray-400">Manual Pricing (Inquiry only)</label>
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
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">Expiry Date</label>
                    <input 
                      type="date" 
                      value={couponForm.expires_at}
                      onChange={(e) => setCouponForm({...couponForm, expires_at: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all [color-scheme:dark]"
                    />
                  </div>
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
                    <p className="text-2xl font-bold">124</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Discount</p>
                    <p className="text-2xl font-bold text-green-400">$2,400</p>
                  </div>
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
                Add User Credits
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Top up credits for <span className="text-white font-medium">{addingCreditTo.name}</span> ({addingCreditTo.email}).
              </p>
              
              <form onSubmit={handleAddCredits} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-2">Credit Amount (₹)</label>
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
                  className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50"
                >
                  {submittingCredit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirm Add Credits
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
    </div>
  );
}
