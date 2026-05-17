import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Tag, Download, CreditCard, Loader2, Sparkles, X, 
  ArrowRight, Printer, QrCode, Info, CheckCircle, Upload
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getUserInvoicesByAdmin, submitPaymentProof, request } from '../services/api';
import { toast } from 'react-hot-toast';
import ORG from '../constants/orgData';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('manual_upi'); // manual_upi, crypto, paypal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  
  // Verification Proof State
  const [proof, setProof] = useState({ transaction_id: '', screenshot: null, base64: '' });

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

  const loadSecureQR = async () => {
    if (!invoice) return;
    try {
      // Use the order secure QR endpoint if linked to an order, otherwise standard invoice QR
      const reqId = invoice.orderId || invoice.id;
      const res = await request(`/orders/${reqId}/qr`);
      setQrData(res);
    } catch (err) {
      // Fallback fallback if order QR is not available
      toast.error('Failed to load secure QR code');
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id, user]);

  useEffect(() => {
    if (invoice) {
      loadSecureQR();
    }
  }, [invoice]);

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

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProof({ ...proof, screenshot: file, base64: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proof.transaction_id || !proof.base64) {
      toast.error('Transaction ID and Screenshot are required');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{8,30}$/.test(proof.transaction_id)) {
      toast.error('Transaction ID must be 8-30 alphanumeric characters');
      return;
    }

    setSubmitting(true);
    try {
      const targetId = invoice.orderId || invoice.id;
      await submitPaymentProof(targetId, {
        transaction_id: proof.transaction_id,
        base64Screenshot: proof.base64,
        payment_method: 'manual',
        payment_plan: invoice.paymentType || 'full'
      });

      toast.success('Payment proof submitted! Verification in progress.');
      navigate('/history');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
  const subtotal = invoice.subtotal || 0;
  const tax = invoice.taxTotal || 0;
  const grandTotal = invoice.grandTotal || 0;
  const discount = invoice.discountAmount || 0;

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
                          <td className="py-4 text-right font-mono">₹{(item.rate || item.amount || 0).toLocaleString()}</td>
                          <td className="py-4 text-right font-mono font-bold text-white">₹{(item.total || (item.qty * item.rate) || item.amount || 0).toLocaleString()}</td>
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
                      <span className="font-mono text-white">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-brand-primary">
                        <span>Discount</span>
                        <span className="font-mono">-₹{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Tax (18%)</span>
                      <span className="font-mono text-white">₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-lg font-bold text-white">
                      <span>Total</span>
                      <span className="font-mono text-2xl text-gradient">₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                  ₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h3>

                {invoice.paymentStatus === 'paid' ? (
                  <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                    <div>
                      <p className="font-bold text-white text-lg">Fully Paid</p>
                      <p className="text-xs text-gray-500 mt-1">This invoice has been completely verified and settled.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pay with selection */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Pay with</p>
                      
                      {/* Method 1: UPI */}
                      <button
                        onClick={() => setPaymentMethod('manual_upi')}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                          paymentMethod === 'manual_upi' 
                            ? 'border-brand-primary bg-brand-primary/5' 
                            : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs">UPI / CARDS / NETBANKING</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">(India only) • Direct QR Settlement</p>
                        </div>
                        <ShieldCheck className={`w-4 h-4 ${paymentMethod === 'manual_upi' ? 'text-brand-primary' : 'text-gray-600'}`} />
                      </button>

                      {/* Method 2: Crypto */}
                      <button
                        onClick={() => setPaymentMethod('crypto')}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between opacity-50 cursor-not-allowed ${
                          paymentMethod === 'crypto' 
                            ? 'border-brand-primary bg-brand-primary/5' 
                            : 'border-white/5 bg-white/[0.01]'
                        }`}
                        disabled
                      >
                        <div>
                          <p className="font-bold text-xs">Crypto Currency</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">Minimum ₹100 / $1.14 (Coming Soon)</p>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-gray-600" />
                      </button>

                      {/* Method 3: PayPal */}
                      <button
                        onClick={() => setPaymentMethod('paypal')}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between opacity-50 cursor-not-allowed ${
                          paymentMethod === 'paypal' 
                            ? 'border-brand-primary bg-brand-primary/5' 
                            : 'border-white/5 bg-white/[0.01]'
                        }`}
                        disabled
                      >
                        <div>
                          <p className="font-bold text-xs">PayPal / Credit Card</p>
                          <p className="text-[9px] text-gray-500 mt-0.5">(Outside India) • (Coming Soon)</p>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Pay button */}
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="w-full py-4.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-sm rounded-2xl shadow-[0_5px_25px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </button>

                    {/* Verification Proof form after scanning */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-brand-secondary" />
                        <h4 className="font-bold text-sm">Upload Payment Proof</h4>
                      </div>
                      
                      <form onSubmit={handleSubmitProof} className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-[8px] text-gray-500 uppercase font-black tracking-widest">Transaction / UTR ID</label>
                          <input 
                            type="text" 
                            placeholder="12-digit UPI Transaction ID"
                            required
                            maxLength={12}
                            pattern="[A-Za-z0-9]{12}"
                            value={proof.transaction_id}
                            onChange={e => setProof({...proof, transaction_id: e.target.value.toUpperCase()})}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-brand-primary outline-none transition-all font-mono"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[8px] text-gray-500 uppercase font-black tracking-widest">Payment Screenshot</label>
                          <div 
                            onClick={() => document.getElementById('screenshot-upload').click()}
                            className={`border border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-white/[0.01] transition-all ${
                              proof.screenshot ? 'border-brand-primary bg-brand-primary/5' : 'border-white/10'
                            }`}
                          >
                            {proof.base64 ? (
                              <div className="flex flex-col items-center gap-2">
                                <img src={proof.base64} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-brand-primary/30" />
                                <span className="text-[10px] text-brand-primary font-bold">Screenshot Attached</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400">Select Screenshot</p>
                                <p className="text-[9px] text-gray-600">Click to upload proof. Max 5MB.</p>
                              </div>
                            )}
                            <input id="screenshot-upload" type="file" hidden accept="image/*" onChange={handleScreenshotChange} />
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={submitting}
                          className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-xs text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-green-400" />}
                          Submit Verification Proof
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* --- SECURE QR POPUP MODAL --- */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#070707] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(124,58,237,0.25)] z-10"
            >
              {/* Header Banner */}
              <div className="relative h-40 overflow-hidden border-b border-white/10">
                <img src="/banner.png" alt="" className="w-full h-full object-cover opacity-35 scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/70 to-transparent" />
                
                <button 
                  onClick={() => setShowQRModal(false)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-white transition-all hover:scale-105"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-primary">Secure Payout Portal</span>
                  </div>
                  <h4 className="font-bold text-2xl tracking-tight">Scan & Transfer</h4>
                </div>
              </div>

              {/* QR and Amount Details */}
              <div className="p-8 text-center space-y-6">
                {/* QR Code Container */}
                <div className="relative inline-block group">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-brand-primary via-brand-secondary to-brand-accent rounded-[2rem] blur opacity-30 group-hover:opacity-55 transition duration-1000 animate-tilt"></div>
                  <div className="relative bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100">
                    {qrData ? (
                      <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="Secure UPI QR" className="w-52 h-52 mx-auto" />
                    ) : (
                      <div className="w-52 h-52 mx-auto flex items-center justify-center bg-gray-100 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                      </div>
                    )}
                    
                    {/* Brand overlay on QR */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-100">
                      <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Net Payable Amount */}
                <div className="max-w-xs mx-auto relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl blur opacity-20" />
                  <div className="relative bg-white/[0.02] border border-white/15 rounded-2xl p-4 backdrop-blur-xl">
                    <p className="text-[9px] text-brand-primary/80 uppercase font-bold tracking-[0.2em] mb-1">Net Payable Amount</p>
                    <p className="text-2xl font-display font-bold text-white tracking-tight">
                      ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Supported Apps */}
                <div className="flex gap-4 items-center justify-center opacity-40">
                  <span className="text-[8px] font-bold tracking-[0.2em] uppercase">PhonePe</span>
                  <div className="w-1 h-1 rounded-full bg-brand-primary" />
                  <span className="text-[8px] font-bold tracking-[0.2em] uppercase">Google Pay</span>
                  <div className="w-1 h-1 rounded-full bg-brand-primary" />
                  <span className="text-[8px] font-bold tracking-[0.2em] uppercase">Paytm</span>
                </div>

                <p className="text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Scan this QR code with any UPI app to complete your transfer. Once transfer is successful, click the button below to submit receipt details.
                </p>

                {/* Confirm Action */}
                <button
                  type="button"
                  onClick={() => setShowQRModal(false)}
                  className="w-full py-4 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-2xl font-bold text-sm shadow-[0_5px_25px_rgba(124,58,237,0.35)] transition-all flex items-center justify-center gap-2"
                >
                  I've Completed the Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
