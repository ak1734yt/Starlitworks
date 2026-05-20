import { useState, useEffect, useMemo } from 'react';
import { getUserInvoicesByAdmin, getInvoices, updateInstallment, recordInvoicePayment, deleteInvoicePayment } from '../services/api';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, TrendingUp, Calendar, CheckCircle2, Circle,
  ChevronDown, ChevronUp, LayoutDashboard, Plus, Trash2,
  Receipt, IndianRupee, FileText, Clock, ArrowDownCircle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const today = () => new Date().toISOString().split('T')[0];

export default function InstallmentTracker() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showPayModal, setShowPayModal] = useState(null); // invoiceId or null
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [payNote, setPayNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = isAdmin ? await getInvoices() : await getUserInvoicesByAdmin(user.id);
      setInvoices(all.filter(inv => inv.paymentType === 'installment'));
    } catch { showToast('Failed to load tracking data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePaid = async (invoiceId, index, currentPaid) => {
    try {
      const result = await updateInstallment(invoiceId, index, !currentPaid ? 'paid' : 'pending');
      if (result.success) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? result.invoice : inv));
        showToast(!currentPaid ? 'Payment marked as received' : 'Payment reverted', 'success');
      }
    } catch { showToast('Update failed', 'error'); }
  };

  const handleRecordPayment = async () => {
    if (!showPayModal || !payAmount || parseFloat(payAmount) <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await recordInvoicePayment(showPayModal, {
        amount: parseFloat(payAmount),
        date: payDate,
        note: payNote
      });
      if (result.success) {
        setInvoices(prev => prev.map(inv => inv.id === showPayModal ? result.invoice : inv));
        showToast(`₹${parseFloat(payAmount).toLocaleString()} payment recorded`, 'success');
        setShowPayModal(null);
        setPayAmount('');
        setPayDate(today());
        setPayNote('');
      }
    } catch { showToast('Failed to record payment', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeletePayment = async (invoiceId, paymentId) => {
    try {
      const result = await deleteInvoicePayment(invoiceId, paymentId);
      if (result.success) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? result.invoice : inv));
        showToast('Payment entry removed', 'success');
      }
    } catch { showToast('Failed to delete payment', 'error'); }
  };

  // Summary stats
  const stats = useMemo(() => {
    let totalContract = 0, totalReceived = 0, totalOutstanding = 0;
    invoices.forEach(inv => {
      const gt = parseFloat(inv.grandTotal) || 0;
      const paid = (inv.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      totalContract += gt;
      totalReceived += paid;
      totalOutstanding += (gt - paid);
    });
    return { totalContract, totalReceived, totalOutstanding, count: invoices.length };
  }, [invoices]);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-brand-secondary font-bold tracking-widest uppercase text-xs mb-3">
              <TrendingUp className="w-4 h-4" />
              Financial Oversight
            </div>
            <h1 className="font-display text-4xl font-bold">EMI & <span className="text-gradient">Payment Control</span></h1>
            <p className="text-gray-500 text-sm mt-2">Managing {stats.count} active EMI plans</p>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="glass-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center border border-brand-secondary/20">
                <FileText className="w-5 h-5 text-brand-secondary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Contract</p>
                <p className="text-xl font-bold">₹{stats.totalContract.toLocaleString()}</p>
              </div>
            </div>
            <div className="glass-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <ArrowDownCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-green-500/60 uppercase tracking-widest">Total Received</p>
                <p className="text-xl font-bold text-green-500">₹{stats.totalReceived.toLocaleString()}</p>
              </div>
            </div>
            <div className="glass-card p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-400/10 flex items-center justify-center border border-red-400/20">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest">Outstanding</p>
                <p className="text-xl font-bold text-red-400">₹{stats.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="w-12 h-12 border-2 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading active plans...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="glass-card py-32 flex flex-col items-center justify-center text-center">
            <LayoutDashboard className="w-12 h-12 text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No active EMI plans</h3>
            <p className="text-gray-600 text-sm max-w-xs mt-2">Active EMI and installment plans will appear here for payment tracking.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {invoices.map((inv) => {
              const payments = inv.payments || [];
              const paidAmt = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
              const grandTotal = parseFloat(inv.grandTotal) || 0;
              const pendingAmt = grandTotal - paidAmt;
              const progress = grandTotal > 0 ? Math.min((paidAmt / grandTotal) * 100, 100) : 0;
              const isExpanded = expandedId === inv.id;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Header Row */}
                  <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.01] flex flex-col lg:flex-row justify-between gap-6 md:gap-8">
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <span className="text-xs font-bold text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded uppercase tracking-tighter w-fit">
                          {inv.invoiceNumber}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold">{inv.client?.name}</h3>
                      </div>
                      <p className="text-gray-500 text-sm flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Started on {inv.invoiceDate}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-8 lg:text-right">
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Total Contract</p>
                        <p className="text-base sm:text-lg font-bold">{inv.currency || '₹'}{grandTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-500/60 uppercase font-bold mb-1">Received</p>
                        <p className="text-base sm:text-lg font-bold text-green-500">{inv.currency || '₹'}{paidAmt.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-red-400/60 uppercase font-bold mb-1">Outstanding</p>
                        <p className="text-base sm:text-lg font-bold text-red-400">{inv.currency || '₹'}{pendingAmt.toLocaleString()}</p>
                      </div>
                      {(parseFloat(inv.recurringTotal) || 0) > 0 && (
                        <div className="col-span-2 sm:col-span-3 pt-4 mt-2 sm:mt-4 border-t border-white/5 lg:border-t-0 lg:mt-0 lg:pt-0">
                          <p className="text-[10px] text-brand-secondary uppercase font-bold mb-1">Monthly Recurring</p>
                          <p className="text-base sm:text-lg font-bold text-brand-secondary flex items-center gap-2">
                            {inv.currency || '₹'}{parseFloat(inv.recurringTotal).toLocaleString()}
                            <span className="text-[10px] text-gray-500 font-normal">/ mo</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 md:px-8 py-4 bg-white/[0.02] flex items-center gap-4 md:gap-6">
                    <div className="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full shadow-[0_0_15px_rgba(59,130,246,0.5)] ${progress >= 100 ? 'bg-green-500 shadow-green-500/50' : 'bg-brand-secondary'}`}
                      />
                    </div>
                    <span className="text-xs font-bold text-brand-secondary shrink-0 text-right">
                      {progress.toFixed(0)}% Complete
                    </span>
                  </div>

                  {/* Action Bar */}
                  <div className="px-6 md:px-8 py-3 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Collapse Details' : 'View EMI Schedule & Payments'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowPayModal(inv.id); setPayAmount(''); setPayDate(today()); setPayNote(''); }}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-secondary hover:text-white transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    )}
                  </div>

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 md:p-8 border-t border-white/5 grid lg:grid-cols-2 gap-8">

                          {/* Left: Payments Ledger */}
                          <div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-green-500" /> Received Payments Ledger
                            </h4>
                            {payments.length === 0 ? (
                              <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 text-center">
                                <IndianRupee className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No payments recorded yet</p>
                                <p className="text-[10px] text-gray-600 mt-1">Use "Record Payment" to log custom amounts</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {payments.map((p, idx) => (
                                  <div key={p.id || idx} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5 group hover:border-green-500/20 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-green-400">{inv.currency || '₹'}{parseFloat(p.amount).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{p.date} {p.note ? `· ${p.note}` : ''}</p>
                                      </div>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeletePayment(inv.id, p.id)}
                                        className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove this payment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {/* Ledger Total */}
                                <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-xl border border-green-500/10 mt-2">
                                  <span className="text-[10px] font-black text-green-500/60 uppercase tracking-widest">Ledger Total</span>
                                  <span className="text-sm font-bold text-green-500">{inv.currency || '₹'}{paidAmt.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: EMI Schedule */}
                          <div>
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-brand-secondary" /> Projected EMI Timeline
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                              {inv.installments?.map((inst, i) => (
                                <div
                                  key={i}
                                  className={`p-4 rounded-2xl border transition-all ${inst.paid ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5 group hover:border-white/20'}`}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-600 uppercase">EMI #{i + 1}</p>
                                      <h4 className={`text-sm font-bold ${inst.paid ? 'text-green-500' : 'text-gray-300'}`}>{inst.month}</h4>
                                    </div>
                                    {inst.paid ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-700" />}
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <p className="text-sm font-bold">{inv.currency || '₹'}{parseFloat(inst.amount).toLocaleString()}</p>
                                    {isAdmin && (
                                      <button
                                        onClick={() => togglePaid(inv.id, i, inst.paid)}
                                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${inst.paid ? 'text-gray-600 hover:text-red-500' : 'bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary hover:text-white'}`}
                                      >
                                        {inst.paid ? 'Revert' : 'Mark Paid'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPayModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <IndianRupee className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Record Payment</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">
                      {invoices.find(i => i.id === showPayModal)?.invoiceNumber}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPayModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold">₹</span>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      placeholder="e.g. 1600"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-lg font-bold outline-none focus:border-green-500 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-green-500 transition-all color-scheme-dark"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Note (Optional)</label>
                  <input
                    type="text"
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    placeholder="UPI / Bank Transfer / Reference..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-green-500 transition-all"
                  />
                </div>

                {/* Quick Info */}
                {(() => {
                  const inv = invoices.find(i => i.id === showPayModal);
                  if (!inv) return null;
                  const paid = (inv.payments || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                  const remaining = parseFloat(inv.grandTotal) - paid;
                  return (
                    <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 flex justify-between text-xs">
                      <div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Already Paid</p>
                        <p className="font-bold text-green-500">₹{paid.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px]">Remaining</p>
                        <p className="font-bold text-red-400">₹{remaining.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={handleRecordPayment}
                  disabled={submitting || !payAmount}
                  className="w-full py-4 bg-green-500 rounded-2xl text-sm font-bold shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {submitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
