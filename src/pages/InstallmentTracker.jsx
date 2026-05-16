import { useState, useEffect } from 'react';
import { getInvoices, updateInstallment } from '../services/api';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, TrendingUp, Calendar, CheckCircle2, Circle, AlertCircle, ChevronRight, LayoutDashboard } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function InstallmentTracker() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getInvoices();
      setInvoices(all.filter(inv => inv.paymentType === 'installment'));
    } catch { showToast('Backend not reachable', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const togglePaid = async (invoiceId, index, currentPaid) => {
    try {
      const result = await updateInstallment(invoiceId, index, !currentPaid);
      if (result.success) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? result.invoice : inv));
        showToast(!currentPaid ? 'Payment marked as received' : 'Payment reverted to pending', 'success');
      }
    } catch { showToast('Update failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-brand-secondary font-bold tracking-widest uppercase text-xs mb-3">
              <TrendingUp className="w-4 h-4" />
              Financial Oversight
            </div>
            <h1 className="font-display text-4xl font-bold">Installment <span className="text-gradient">Master Control</span></h1>
            <p className="text-gray-500 text-sm mt-2">Managing {invoices.length} active subscription plans</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <div className="w-12 h-12 border-2 border-brand-secondary border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading active plans...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="glass-card py-32 flex flex-col items-center justify-center text-center">
            <LayoutDashboard className="w-12 h-12 text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No active installments</h3>
            <p className="text-gray-600 text-sm max-w-xs mt-2">Active installment plans will appear here for payment tracking.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {invoices.map((inv) => {
              const paid = inv.installments?.filter(i => i.paid).length || 0;
              const total = inv.installments?.length || 0;
              const paidAmt = inv.installments?.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount), 0) || 0;
              const pendingAmt = parseFloat(inv.grandTotal) - paidAmt;
              const progress = (paid / total) * 100;

              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card overflow-hidden"
                >
                  <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                          {inv.invoiceNumber}
                        </span>
                        <h3 className="text-2xl font-bold">{inv.client?.name}</h3>
                      </div>
                      <p className="text-gray-500 text-sm flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Started on {inv.invoiceDate}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-8 lg:text-right">
                      <div>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">Total Contract</p>
                        <p className="text-lg font-bold">₹{inv.grandTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-500/60 uppercase font-bold mb-1">Received</p>
                        <p className="text-lg font-bold text-green-500">₹{paidAmt.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-red-400/60 uppercase font-bold mb-1">Outstanding</p>
                        <p className="text-lg font-bold text-red-400">₹{pendingAmt.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 py-4 bg-white/[0.02] flex items-center gap-6">
                    <div className="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                    <span className="text-xs font-bold text-brand-secondary shrink-0">{progress.toFixed(0)}% Complete</span>
                  </div>

                  <div className="p-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {inv.installments?.map((inst, i) => (
                      <div 
                        key={i} 
                        className={`p-4 rounded-2xl border transition-all ${inst.paid ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5 group hover:border-white/20'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-600 uppercase">Payment #{i+1}</p>
                            <h4 className={`font-bold ${inst.paid ? 'text-green-500' : 'text-gray-300'}`}>{inst.month}</h4>
                          </div>
                          {inst.paid ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-700" />}
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-sm font-bold">₹{inst.amount.toLocaleString()}</p>
                          <button 
                            onClick={() => togglePaid(inv.id, i, inst.paid)}
                            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${inst.paid ? 'text-gray-600 hover:text-red-500' : 'bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary hover:text-white'}`}
                          >
                            {inst.paid ? 'Revert' : 'Mark Paid'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
