import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Tag, Download, CreditCard, Loader2, Sparkles, X, 
  ArrowRight, Printer, QrCode, Info, CheckCircle, Upload, IndianRupee
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getUserInvoicesByAdmin, submitPaymentProof, request, generateQR } from '../services/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import ORG from '../constants/orgData';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { convertPrice } = useTheme();
  const [invoice, setInvoice] = useState(null);
  const grandTotal = Number(invoice?.grandTotal || 0);

  const loadInvoice = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getUserInvoicesByAdmin(user.id);
      const found = res.find(inv => inv.id === id || inv.invoiceNumber === id);
      if (!found) {
        toast.error('Invoice not found');
        navigate('/history');
        return;
      }
      setInvoice(found);
    } catch (err) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id, user]);

  const handleDownloadInvoice = async () => {
    if (!invoice) return;
    try {
      const token = localStorage.getItem('ssw_token');
      const res = await fetch(`/api/invoices/${invoice.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to download');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice.id}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice TXT downloaded!');
    } catch (err) {
      toast.error(err.message);
    }
  };



  if (loading || !invoice) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  // Calculate pricing values
  const subtotal = Number(invoice.subtotal || 0);
  const tax = Number(invoice.taxTotal || 0);
  const discount = Number(invoice.discountAmount || 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-primary/30">
      <Navbar />
      
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Title */}
          <div>
            <h1 className="text-4xl font-bold font-display tracking-tight">View Invoice</h1>
            <p className="text-gray-500 text-sm mt-1">Review your invoice details, payment status, and download your receipt.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left: Main Invoice Area (8 Columns) */}
            <div className="lg:col-span-8 space-y-6">
              <div id="print-area" className="bg-[#0b0c14] border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
                {/* Glowing Top Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[120px] -mr-32 -mt-32" />
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />
                
                {/* Invoice Top Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-white/5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center border border-white/10">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold font-display tracking-wide">{ORG.name}</span>
                  </div>

                  <div className="flex flex-col md:items-end">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                      invoice.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      ● {invoice.paymentStatus || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid md:grid-cols-2 gap-8 py-10 border-b border-white/5 relative z-10 text-sm">
                  {/* Bill From details */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bill From</h4>
                    <div className="space-y-1 text-gray-400">
                      <p className="font-bold text-white">{ORG.name}</p>
                      <p>{ORG.tagline}</p>
                      <p>Jaipur, Rajasthan, India</p>
                    </div>
                  </div>

                  {/* Bill To details */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bill To</h4>
                    <div className="space-y-1 text-gray-400">
                      <p className="font-bold text-white">{invoice.client?.name || user?.name || user?.username}</p>
                      <p className="truncate">{invoice.client?.serverName || 'Starlit Enterprise Setup'}</p>
                      <p>Ghaziabad, Uttar Pradesh, India</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Meta details (Invoice#, dates) */}
                <div className="py-6 border-b border-white/5 relative z-10 text-xs grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-500 uppercase font-black tracking-widest block mb-1">Invoice Number</span>
                    <span className="font-mono text-gray-300 font-bold">#{invoice.id || invoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase font-black tracking-widest block mb-1">Invoice Date</span>
                    <span className="text-gray-300 font-bold">{invoice.invoiceDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase font-black tracking-widest block mb-1">Payment Term</span>
                    <span className="text-gray-300 font-bold capitalize">{invoice.paymentType || 'Full Payout'}</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="py-8 relative z-10 overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <th className="pb-4">Item</th>
                        <th className="pb-4 text-center">Qty</th>
                        <th className="pb-4 text-right">Price</th>
                        <th className="pb-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {(invoice.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-4 font-medium text-white">{item.desc || item.description}</td>
                          <td className="py-4 text-center">{item.qty || 1}</td>
                          <td className="py-4 text-right font-mono">{convertPrice(Number(item.rate || item.amount || 0))}</td>
                          <td className="py-4 text-right font-mono font-bold text-white">{convertPrice(Number(item.total || (item.qty * (item.rate || 0)) || item.amount || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Details */}
                <div className="pt-6 border-t border-white/5 flex justify-end relative z-10">
                  <div className="w-72 space-y-3 text-sm">
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-mono text-white">{convertPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-brand-primary">
                        <span>Discount</span>
                        <span className="font-mono">-{convertPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Tax (18%)</span>
                      <span className="font-mono text-white">{convertPrice(tax)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-lg font-bold text-white">
                      <span>Total</span>
                      <span className="font-mono text-2xl text-gradient">{convertPrice(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-16 pt-8 border-t border-white/5 text-[10px] text-gray-600 text-center uppercase tracking-widest font-black leading-relaxed">
                  Thank You For Your Business
                  <p className="mt-1 lowercase text-gray-500 tracking-normal font-medium">We highly appreciate your trust in us. If you have any questions, feel free to contact support.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-between">
                <button
                  onClick={handleDownloadInvoice}
                  className="px-6 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Invoice TXT
                </button>
              </div>
            </div>

            {/* Right Sidebar: Payout Panel (4 Columns) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
              <div className="bg-[#0b0c14] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 blur-[80px] -mr-16 -mt-16" />
                
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Amount Due</p>
                <h3 className="text-4xl font-display font-black text-white tracking-tight mb-8">
                  {convertPrice(grandTotal)}
                </h3>

                {invoice.paymentStatus === 'paid' ? (
                  <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                    <div>
                      <p className="font-bold text-white text-lg">Fully Paid</p>
                      <p className="text-xs text-gray-500 mt-1">This invoice has been completely verified and settled.</p>
                    </div>
                  </div>
                ) : invoice.paymentStatus === 'payment_pending' ? (
                  <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <Clock className="w-12 h-12 text-amber-400 animate-pulse" />
                    <div>
                      <p className="font-bold text-white text-lg">Verification Pending</p>
                      <p className="text-xs text-gray-500 mt-1">We are currently verifying your payment proof. This typically takes 10-30 minutes.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-400">
                      This invoice is currently pending. Please proceed to the payment portal to securely complete this transaction using UPI, Cards, or Starlit Credits.
                    </p>
                    <button
                      onClick={() => navigate(`/checkout/invoice/${invoice.id}`)}
                      className="w-full py-4.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm rounded-2xl shadow-[0_5px_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Proceed to Payment
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </main>
    </div>
  );
}
