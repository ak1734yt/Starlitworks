import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveInvoice, getManagerUsers, getPublicPrices, createUserInvoice, getAdminOrders } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import InvoicePreview from '../components/InvoicePreview';
import ORG from '../constants/orgData';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Eye, Save, Calendar, User, 
  FileText, CreditCard, ChevronRight, Search, 
  Package, Check, X, Filter, Grid, List,
  ShoppingCart, Info, Download, ArrowRight,
  Database, RefreshCw, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { toast } from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const nextInvNo = () => `INV-${Math.floor(1000 + Math.random() * 9000)}`;

export default function CreateInvoice() {
  const { showToast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvNo());
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [clientName, setClientName] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [items, setItems] = useState([{ id: uuidv4(), name: '', hsn: '', gstRate: 18, qty: 1, rate: 0, discount: 0, isRecurring: false }]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState('onetime');
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [startMonth, setStartMonth] = useState(thisMonth());
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Catalog & User State
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pData, uData, oData] = await Promise.all([getPublicPrices(), getManagerUsers(), getAdminOrders()]);
      setProducts(pData);
      setUsers(uData);
      setOrders(oData);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const tableData = useMemo(() => items.map(item => {
    const baseAmount = item.qty * item.rate;
    const amountAfterDiscount = Math.max(0, baseAmount - (item.discount || 0));
    const taxRate = item.gstRate || 18;
    const cgst = amountAfterDiscount * (taxRate / 2) / 100;
    const sgst = amountAfterDiscount * (taxRate / 2) / 100;
    const total = amountAfterDiscount + cgst + sgst;
    return { ...item, amount: amountAfterDiscount, cgst, sgst, total };
  }), [items]);

  const subtotalAmount = tableData.reduce((sum, item) => sum + item.amount, 0);
  const totalCgst = tableData.reduce((sum, item) => sum + item.cgst, 0);
  const totalSgst = tableData.reduce((sum, item) => sum + item.sgst, 0);
  const grandTotal = subtotalAmount + totalCgst + totalSgst - globalDiscount;
  
  const recurringTotal = tableData.filter(i => i.isRecurring).reduce((sum, item) => sum + item.total, 0);
  const nonRecurringTotal = grandTotal - recurringTotal;

  // Optimized Installment Logic
  const installments = useMemo(() => {
    if (paymentType !== 'installment' || monthlyAmount <= 0 || grandTotal <= 0) return [];
    
    const inst = [];
    let remainingNonRecurring = nonRecurringTotal;
    let currentMonth = new Date(startMonth + '-01');

    // Requirement: Setup fee paid in installments of 'monthlyAmount'. 
    // After setup is done, it transitions to recurring amount.
    // If recurring exists, we usually pay it alongside setup unless user wants otherwise.
    // Based on user request: "first installment will create total amount then after completing the total amount it will goes for the monthly installment"
    
    while (remainingNonRecurring > 0 || inst.length === 0) {
      // Amount we can pay this month towards non-recurring
      // We cap the total monthly payment at 'monthlyAmount'
      let pmtNonRecurring = Math.min(remainingNonRecurring, monthlyAmount - recurringTotal);
      
      // If the recurring charge itself is > monthly budget, we have a problem
      if (pmtNonRecurring < 0) pmtNonRecurring = 0;

      const totalThisMonth = pmtNonRecurring + recurringTotal;
      
      inst.push({
        month: currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
        amount: totalThisMonth,
        principal: pmtNonRecurring, // setup fee portion
        recurring: recurringTotal,    // recurring fee portion
        paid: false
      });

      remainingNonRecurring -= pmtNonRecurring;
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      
      if (inst.length > 36) break; // Safety break
      if (remainingNonRecurring <= 0) break;
    }

    // Add a couple of months for pure recurring if needed to show the transition
    if (recurringTotal > 0 && inst.length < 3) {
        for(let i=0; i<2; i++) {
            let nextMonth = new Date(currentMonth);
            inst.push({
                month: nextMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
                amount: recurringTotal,
                principal: 0,
                recurring: recurringTotal,
                paid: false
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    }

    return inst;
  }, [paymentType, monthlyAmount, grandTotal, nonRecurringTotal, recurringTotal, startMonth]);

  const installmentError = useMemo(() => {
    if (paymentType === 'installment' && monthlyAmount > 0 && recurringTotal > monthlyAmount) {
      return `Budget (₹${monthlyAmount}) is too low to cover recurring hosting/fees (₹${recurringTotal})`;
    }
    return null;
  }, [paymentType, monthlyAmount, recurringTotal]);

  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => setItems(prev => [...prev, { id: uuidv4(), name: '', hsn: '', gstRate: 18, qty: 1, rate: 0, discount: 0, isRecurring: false }]);
  
  const handleAddFromCatalog = (product) => {
    const newItem = {
      id: uuidv4(),
      name: product.name,
      hsn: '',
      gstRate: 18,
      qty: 1,
      rate: product.price || 0,
      discount: 0,
      isRecurring: product.is_recurring === 1 || product.category === 'infra' || product.category === 'addon' && product.product_key.includes('mo')
    };
    
    if (items.length === 1 && !items[0].name && items[0].rate === 0) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    toast.success(`Added ${product.name}`);
  };

  const handleImportOrder = (order) => {
    const newItem = {
      id: uuidv4(),
      name: `${order.service_name} (Order #${order.id})`,
      hsn: '',
      gstRate: order.tax_rate || 18,
      qty: 1,
      rate: order.quoted_price || order.total_amount || 0,
      discount: 0,
      isRecurring: false
    };

    if (items.length === 1 && !items[0].name && items[0].rate === 0) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    
    // Auto-fill client if possible
    setClientName(order.client_name || '');
    const userMatch = users.find(u => u.name === order.client_name || u.id === order.user_id);
    if (userMatch) setSelectedUser(userMatch);
    setSelectedOrderId(order.id);

    setShowOrders(false);
    toast.success(`Imported Order #${order.id}`);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setClientName(user.name);
  };

  const handleRemoveItem = (id) => setItems(prev => prev.filter(item => item.id !== id));

  const buildInvoiceData = useCallback(() => ({
    id: uuidv4(),
    invoiceNumber,
    invoiceDate,
    paymentType,
    userId: selectedUser?.id,
    orderId: selectedOrderId,
    client: { name: clientName, serverName: clientName, gstin: clientGstin },
    org: ORG,
    items: tableData.map(t => ({ 
      description: t.name, 
      price: t.total, 
      rate: t.rate, 
      qty: t.qty, 
      discount: t.discount, 
      cgst: t.cgst, 
      sgst: t.sgst, 
      status: "Yes",
      isRecurring: t.isRecurring
    })),
    subtotal: subtotalAmount,
    discountAmount: globalDiscount,
    cgst: totalCgst,
    sgst: totalSgst,
    grandTotal,
    installments: paymentType === 'installment' ? installments : null,
    recurringTotal,
    currency: '₹',
    terms: ORG.terms.join('\n')
  }), [invoiceNumber, invoiceDate, clientName, clientGstin, paymentType, tableData, subtotalAmount, totalCgst, totalSgst, globalDiscount, grandTotal, recurringTotal, installments, selectedUser]);

  const handlePreview = () => clientName.trim() ? setPreview(buildInvoiceData()) : showToast('Please enter client name', 'error');
  
  const handleSave = async () => {
    if (!clientName.trim()) return showToast('Please enter client name', 'error');
    if (paymentType === 'installment' && installmentError) return showToast(installmentError, 'error');
    
    setSaving(true);
    try {
      const data = buildInvoiceData();
      if (selectedUser) {
        await createUserInvoice(data);
      } else {
        await saveInvoice(data);
      }
      showToast('Invoice generated successfully!', 'success');
      setInvoiceNumber(nextInvNo());
    } catch (err) { 
      showToast(err.message || 'Failed to save invoice', 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => 
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.category.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-primary/30">
      <Navbar />
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        
        {/* Animated Header */}
        <header className="flex flex-wrap items-end justify-between gap-8 mb-16">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
               <span className="px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary">Admin Console</span>
               <div className="h-px w-12 bg-white/10" />
            </motion.div>
            <h1 className="text-6xl font-bold font-display tracking-tighter leading-tight">
              Premium <span className="text-gradient">Billing Engine</span>
            </h1>
            <p className="text-gray-500 max-w-xl text-lg leading-relaxed">
              Generate intelligent invoices with automated installment calculation, recurring charge handling, and order synchronization.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePreview} className="group relative px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Eye className="w-4 h-4 text-brand-primary" /> Preview
            </button>
            <button onClick={handleSave} disabled={saving} className="relative px-10 py-4 bg-brand-primary rounded-2xl text-xs font-bold shadow-[0_0_40px_rgba(124,58,237,0.3)] hover:shadow-[0_0_60px_rgba(124,58,237,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
              {saving ? 'Synthesizing...' : 'Generate & Assign'}
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* Main Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* 1. Entity Selection */}
            <section className="glass-card p-10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-3xl -mr-32 -mt-32 pointer-events-none" />
               
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                      <User className="w-5 h-5 text-brand-primary" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">Client & Order Data</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowOrders(true)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                      <Download className="w-3 h-3" /> Import Order
                    </button>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned User (Database)</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search by name or email..."
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          if (!val) return;
                          const found = users.find(u => u.name.toLowerCase().includes(val) || u.email.toLowerCase().includes(val));
                          if (found) handleUserSelect(found);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Client Display Name</label>
                    <input 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Enter billing name..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-4 text-sm focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
               </div>
               
               <AnimatePresence>
                 {selectedUser && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-white/5">
                     <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                            <Check className="w-6 h-6 text-brand-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{selectedUser.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{selectedUser.email}</p>
                          </div>
                        </div>
                        <button onClick={() => {setSelectedUser(null); setClientName('');}} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-xl transition-all">
                          <X className="w-5 h-5" />
                        </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </section>

            {/* 2. Billing Items */}
            <section className="glass-card p-0 overflow-hidden border-white/10">
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                      <Package className="w-5 h-5 text-brand-primary" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">Service Breakdown</h3>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setShowCatalog(true)} className="px-6 py-2.5 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-[10px] font-black text-brand-primary hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest">
                    <Grid className="w-3.5 h-3.5" /> Product Shop
                  </button>
                  <button onClick={handleAddItem} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black hover:bg-white/10 transition-all flex items-center gap-2 uppercase tracking-widest">
                    <Plus className="w-3.5 h-3.5" /> Manual Entry
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02] text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black border-b border-white/5">
                      <th className="px-10 py-5">Service / Subscription</th>
                      <th className="px-4 py-5 text-center">Qty</th>
                      <th className="px-4 py-5 text-right">Rate (₹)</th>
                      <th className="px-4 py-5 text-right text-red-400/80">Disc.</th>
                      <th className="px-10 py-5 text-right">Final Amount</th>
                      <th className="px-4 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tableData.map((row) => (
                      <tr key={row.id} className="group hover:bg-white/[0.01] transition-all duration-300">
                        <td className="px-10 py-8">
                          <input 
                            value={row.name} 
                            onChange={e => handleUpdateItem(row.id, 'name', e.target.value)}
                            placeholder="Enter service name..."
                            className="bg-transparent border-b border-transparent focus:border-brand-primary/50 outline-none w-full mb-3 font-bold text-base transition-all placeholder:text-gray-700"
                          />
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2.5 text-[10px] text-gray-500 cursor-pointer hover:text-brand-primary transition-colors uppercase tracking-[0.15em] font-black">
                              <input 
                                type="checkbox" 
                                checked={row.isRecurring} 
                                onChange={e => handleUpdateItem(row.id, 'isRecurring', e.target.checked)}
                                className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-brand-primary focus:ring-brand-primary focus:ring-offset-0 transition-all" 
                              />
                              Monthly Recurring
                            </label>
                            <div className="h-3 w-[1px] bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tax:</span>
                                <select 
                                  value={row.gstRate} 
                                  onChange={e => handleUpdateItem(row.id, 'gstRate', Number(e.target.value))}
                                  className="bg-transparent text-[10px] text-brand-primary font-black uppercase outline-none cursor-pointer hover:bg-white/5 px-2 py-1 rounded-md transition-all"
                                >
                                  <option value="18">18% GST</option>
                                  <option value="12">12% GST</option>
                                  <option value="5">5% GST</option>
                                  <option value="0">0% (Exempt)</option>
                                </select>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-8">
                          <input type="number" value={row.qty} onChange={e => handleUpdateItem(row.id, 'qty', Number(e.target.value))} className="w-16 bg-white/[0.02] border border-white/10 rounded-xl px-2 py-3 text-center text-sm outline-none focus:border-brand-primary transition-all font-mono" />
                        </td>
                        <td className="px-4 py-8">
                          <input type="number" value={row.rate} onChange={e => handleUpdateItem(row.id, 'rate', Number(e.target.value))} className="w-28 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-3 text-right text-sm font-mono outline-none focus:border-brand-primary transition-all" />
                        </td>
                        <td className="px-4 py-8">
                          <input type="number" value={row.discount} onChange={e => handleUpdateItem(row.id, 'discount', Number(e.target.value))} className="w-24 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-3 text-right text-sm font-mono text-red-400/80 outline-none focus:border-red-400 transition-all" />
                        </td>
                        <td className="px-10 py-8 text-right">
                          <p className="text-base font-black font-mono text-gray-200">₹{row.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                          {row.isRecurring && <p className="text-[9px] text-brand-primary font-black uppercase tracking-widest mt-1">/ Month</p>}
                        </td>
                        <td className="px-4 py-8">
                          <button onClick={() => handleRemoveItem(row.id)} className="p-3 text-gray-800 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Configuration & Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-10 lg:sticky lg:top-32">
            
            {/* Payment Strategy */}
            <div className="glass-card p-8 space-y-8 relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <CreditCard className="w-4 h-4 text-brand-primary" />
                 </div>
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Payment Logic</h3>
              </div>

              <div className="flex p-1.5 bg-white/[0.03] rounded-2xl border border-white/10">
                <button 
                  onClick={() => setPaymentType('onetime')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${paymentType === 'onetime' ? 'bg-brand-primary text-white shadow-2xl shadow-brand-primary/40' : 'text-gray-500 hover:text-white'}`}
                >
                  Onetime
                </button>
                <button 
                  onClick={() => setPaymentType('installment')} 
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${paymentType === 'installment' ? 'bg-brand-primary text-white shadow-2xl shadow-brand-primary/40' : 'text-gray-500 hover:text-white'}`}
                >
                  Installments
                </button>
              </div>

              {paymentType === 'installment' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Schedule Start Month</label>
                    <input 
                      type="month" 
                      value={startMonth} 
                      onChange={e => setStartMonth(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-brand-primary transition-all color-scheme-dark"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Monthly Budget Capacity (₹)</label>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary font-bold">₹</span>
                        <input 
                        type="number" 
                        value={monthlyAmount} 
                        onChange={e => setMonthlyAmount(Number(e.target.value))}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-base font-bold outline-none focus:border-brand-primary transition-all"
                        placeholder="e.g. 5000"
                        />
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed px-1">
                      This defines the maximum monthly payment. We'll prioritize paying off the setup fee first.
                    </p>
                  </div>
                  {installmentError && (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex gap-3">
                        <Info className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-[10px] text-red-400 font-bold leading-tight">{installmentError}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="font-bold uppercase tracking-widest">Setup Fee</span>
                  <span className="font-mono text-white">₹{nonRecurringTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="font-bold uppercase tracking-widest">Recurring Fee</span>
                  <span className="font-mono text-brand-primary">₹{recurringTotal.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between items-center text-xs text-red-400/50">
                  <span className="font-bold uppercase tracking-widest">Adjustment</span>
                  <div className="flex items-center gap-2 border-b border-red-400/10">
                    <span className="font-mono">-₹</span>
                    <input 
                      type="number" 
                      value={globalDiscount} 
                      onChange={e => setGlobalDiscount(Number(e.target.value))}
                      className="bg-transparent w-20 text-right outline-none font-mono font-bold"
                    />
                  </div>
                </div>
                <div className="pt-8 border-t border-white/10">
                   <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Total Value</span>
                        <div className="text-right">
                            <span className="text-4xl font-display font-black text-white">₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                   </div>
                   <p className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] text-right">Tax Included at Settlement</p>
                </div>
              </div>
            </div>

            {/* Schedule Summary */}
            {paymentType === 'installment' && installments.length > 0 && !installmentError && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 bg-brand-primary/[0.02]">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-primary" /> Projected Timeline
                </h3>
                <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {installments.map((inst, i) => (
                    <div key={i} className="flex justify-between items-center group relative">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:border-brand-primary/50 group-hover:text-brand-primary transition-all">{i+1}</div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-gray-300">{inst.month}</p>
                            {inst.principal > 0 && <p className="text-[9px] text-brand-primary/60 font-black uppercase tracking-widest">Installment</p>}
                            {inst.principal === 0 && <p className="text-[9px] text-green-500/60 font-black uppercase tracking-widest">Regular Recurring</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black font-mono">₹{inst.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Product Catalog Modal */}
      <AnimatePresence>
        {showCatalog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCatalog(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative z-10 flex flex-col"
            >
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                     <Grid className="w-7 h-7 text-brand-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Product Selection Console</h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-black">Browse global database services</p>
                  </div>
                </div>
                <button onClick={() => setShowCatalog(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/10">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Categories Sidebar */}
                <aside className="w-64 border-r border-white/5 p-8 space-y-3 overflow-y-auto hidden md:block bg-black/20">
                  <h4 className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] mb-6 ml-4">Filter by Group</h4>
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${selectedCategory === cat ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 scale-[1.02]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </aside>

                {/* Products Grid */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex gap-6 bg-white/[0.01]">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-brand-primary transition-all" />
                      <input 
                        type="text" 
                        placeholder="Scan products by name, feature or ID..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-[1.25rem] pl-14 pr-6 py-4 text-sm focus:border-brand-primary outline-none transition-all focus:ring-4 focus:ring-brand-primary/5"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProducts.map(product => (
                        <button 
                          key={product.id}
                          onClick={() => { handleAddFromCatalog(product); setShowCatalog(false); }}
                          className="group bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-left hover:border-brand-primary/40 hover:bg-brand-primary/[0.01] transition-all relative overflow-hidden flex flex-col h-full"
                        >
                          <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Plus className="w-5 h-5 text-brand-primary" />
                          </div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 border border-white/5">{product.category}</span>
                            <div className="text-right">
                              <p className="text-lg font-black font-mono text-white group-hover:text-brand-primary transition-colors">₹{Number(product.price || 0).toLocaleString()}</p>
                              {product.unit_label && <p className="text-[9px] text-gray-600 uppercase font-black">{product.unit_label}</p>}
                            </div>
                          </div>
                          
                          <h4 className="font-bold text-lg mb-3 leading-tight group-hover:translate-x-1 transition-transform">{product.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-6 flex-grow">{product.description || 'No extensive manual data available for this specific service item in the core database.'}</p>
                          
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${product.is_recurring ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{product.is_recurring ? 'Monthly' : 'One-time'}</span>
                             </div>
                             <ArrowRight className="w-4 h-4 text-gray-800 group-hover:text-brand-primary transition-all group-hover:translate-x-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Import Modal */}
      <AnimatePresence>
        {showOrders && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOrders(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Database className="w-6 h-6 text-brand-primary" />
                  <h2 className="text-2xl font-bold tracking-tight">Active Quotes & Orders</h2>
                </div>
                <button onClick={() => setShowOrders(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-4">
                {orders.filter(o => o.status !== 'completed').map(order => (
                  <button 
                    key={order.id} 
                    onClick={() => handleImportOrder(order)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-left hover:border-brand-primary/50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs text-gray-500 group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-all">
                            #{order.id}
                        </div>
                        <div>
                            <p className="text-sm font-bold">{order.service_name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Client: {order.client_name}</p>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                        <div>
                            <p className="text-sm font-black font-mono">₹{order.quoted_price || order.total_amount || 0}</p>
                            <p className="text-[9px] text-gray-600 uppercase tracking-widest">{order.status}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-800 group-hover:text-brand-primary transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {preview && <InvoicePreview invoice={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
