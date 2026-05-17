import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Tag, CreditCard, ShieldCheck, 
  ArrowRight, Loader2, Star, QrCode, 
  Upload, CheckCircle, Info, ShieldAlert,
  Sparkles, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { validateCoupon, getPublicPrices, getOrder, submitPaymentProof, createOrder, request } from '../services/api';
import { toast } from 'react-hot-toast';
import ORG from '../constants/orgData';

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [type, setType] = useState('product'); // 'product' or 'order'
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [validating, setValidating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('manual'); // 'manual' or 'online'
  const [submitting, setSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full', 'advance', 'emi'

  // Form for manual payment
  const [proof, setProof] = useState({ transaction_id: '', screenshot: null, base64: '' });

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      // Try to find if it's an order first (custom quote)
      try {
        const order = await getOrder(id);
        if (order) {
          setData({
            ...order,
            name: order.service_name,
            price: order.quoted_price || 0,
            description: order.description
          });
          setType('order');
          setLoading(false);
          return;
        }
      } catch (e) { /* ignore and check products */ }

      const prices = await getPublicPrices();
      const p = prices.find(item => item.product_key === id || item.id === parseInt(id));
      if (!p) {
        toast.error('Item not found');
        navigate('/shop');
        return;
      }
      setData(p);
      setType('product');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSecureQR = async () => {
    try {
      const res = await request(`/orders/${id}/qr`);
      setQrData(res);
    } catch (err) {
      toast.error('Failed to load secure payment data');
    }
  };

  useEffect(() => {
    if (id && !loading) loadSecureQR();
  }, [id, loading, paymentPlan]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setValidating(true);
    try {
      const c = await validateCoupon(couponCode);
      setCoupon(c);
      toast.success('Coupon applied!');
    } catch (err) {
      toast.error(err.message);
      setCoupon(null);
    } finally {
      setValidating(false);
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
      let orderId = type === 'order' ? id : null;
      
      if (type === 'product') {
        const orderData = await createOrder({
          service_id: data.product_key,
          service_name: data.name,
          description: `Auto-created: ${data.name}`,
          quoted_price: totalBeforeTax,
          payment_plan: paymentPlan,
          cgst: cgst,
          sgst: sgst,
          tax_rate: 18,
          total_amount: finalTotal
        });
        orderId = orderData.order_id;
      }

      await submitPaymentProof(orderId, {
        transaction_id: proof.transaction_id,
        base64Screenshot: proof.base64,
        payment_method: 'manual',
        payment_plan: paymentPlan
      });

      toast.success('Payment proof submitted! Waiting for approval.');
      navigate('/history');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const subtotal = Number(data?.price || 0);
  const discount = Number(coupon 
    ? (coupon.discount_type === 'percentage' ? (subtotal * coupon.discount_value / 100) : coupon.discount_value)
    : 0);
  const totalBeforeTax = Math.max(0, subtotal - discount);
  const taxAmount = totalBeforeTax * 0.18;
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;
  const finalTotal = totalBeforeTax + taxAmount;

  let amountToPay = finalTotal;
  if (paymentPlan === 'advance') amountToPay = finalTotal / 2;
  if (paymentPlan === 'emi') amountToPay = finalTotal / 3;



  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-brand-primary/30">
      <Navbar />
      
      <main className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-12 gap-12 items-start"
        >
          
          {/* Left Col: Order Details & Payment Method (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            <header className="space-y-4">
              <div className="flex items-center gap-2 text-brand-primary font-bold tracking-[0.2em] uppercase text-[10px]">
                <div className="w-8 h-[1px] bg-brand-primary/50" />
                Secure Checkout
              </div>
              <h1 className="text-5xl font-bold font-display tracking-tight">
                Finalize your <span className="text-gradient">Investment</span>
              </h1>
              <p className="text-gray-500 max-w-lg">
                Complete your payment to begin the development of your premium Discord ecosystem.
              </p>
            </header>

            {/* Step Indicators */}
            <div className="flex items-center gap-4">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                    (step === 1 && paymentMethod === 'manual') || (step === 2 && proof.transaction_id) 
                      ? 'bg-brand-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]' 
                      : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}>
                    {step}
                  </div>
                  <div className={`text-[10px] uppercase tracking-widest font-bold ${
                    (step === 1 && paymentMethod === 'manual') ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step === 1 ? 'Payment' : 'Verification'}
                  </div>
                  {step === 1 && <div className="w-12 h-[1px] bg-white/10 mx-2" />}
                </div>
              ))}
            </div>

            {/* Order Preview Card */}
            <div className="glass-card p-8 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-colors" />
              <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
                <div className="flex gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-500">
                    <ShoppingBag className="w-8 h-8 text-brand-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary/80 mb-2 block">{data?.category || 'Custom Solution'}</span>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-primary transition-colors">{data?.name || 'Project Service'}</h3>
                    <p className="text-sm text-gray-500 max-w-md leading-relaxed">{data?.description || 'Premium service architecture and deployment.'}</p>
                    {type === 'order' && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                        <Info className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Ref ID: SSW-{id}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Estimated Value</p>
                  <p className="text-3xl font-display font-bold">₹{(totalBeforeTax || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Payment Gateway</h3>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('manual')}
                  className={`relative p-8 rounded-2xl border transition-all duration-500 text-left overflow-hidden group ${
                    paymentMethod === 'manual' ? 'border-brand-primary bg-brand-primary/5 shadow-[0_0_30px_rgba(124,58,237,0.1)]' : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 transition-opacity duration-500 ${paymentMethod === 'manual' ? 'bg-brand-primary/20 opacity-100' : 'bg-white/5 opacity-0'}`} />
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 ${
                    paymentMethod === 'manual' ? 'bg-brand-primary text-white scale-110' : 'bg-white/5 text-gray-400'
                  }`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="relative z-10">
                    <p className="font-bold text-lg">Instant UPI / QR</p>
                    <p className="text-xs text-gray-500 mt-1">Direct settlement via any UPI application.</p>
                  </div>
                </button>

                <div className="relative p-8 rounded-2xl border border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed group grayscale">
                  <div className="w-12 h-12 rounded-xl bg-white/5 text-gray-400 flex items-center justify-center mb-4">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Online Gateway</p>
                    <p className="text-xs text-gray-500 mt-1">Automated Checkout (Coming Soon)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Payment Experience */}
            <AnimatePresence mode="wait">
              {paymentMethod === 'manual' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  {/* Payment Plan selection */}
                  {totalBeforeTax > 5000 && (
                    <section className="glass-card p-10 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary/50" />
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl">Select Payment Plan</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Choose the structure that fits your budget</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        {[
                          { id: 'full', label: 'Lump Sum', sub: 'Single full payment' },
                          { id: 'advance', label: '50% Milestone', sub: 'Pay half to start' },
                          { id: 'emi', label: 'Tiered EMI', sub: '3-part monthly plan' }
                        ].map(plan => (
                          <button 
                            key={plan.id}
                            onClick={() => setPaymentPlan(plan.id)}
                            className={`group p-5 rounded-2xl border transition-all duration-300 text-left ${
                              paymentPlan === plan.id 
                                ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_20px_rgba(124,58,237,0.1)]' 
                                : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                            }`}
                          >
                            <p className={`font-bold text-sm mb-1 transition-colors ${paymentPlan === plan.id ? 'text-brand-primary' : 'text-white'}`}>{plan.label}</p>
                            <p className="text-[10px] text-gray-500 leading-tight group-hover:text-gray-400 transition-colors">{plan.sub}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {/* Payment Trigger CTA */}
                  <section className="glass-card p-10 relative overflow-hidden border border-brand-primary/20 bg-brand-primary/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-16 -mt-16 animate-pulse" />
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                      <div>
                        <h4 className="font-bold text-xl flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                          Ready to Invest
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Scan our secure, encrypted merchant QR code to transfer your funds.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQRModal(true)}
                        className="w-full md:w-auto py-4 px-8 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                      >
                        <QrCode className="w-4 h-4" />
                        Pay Now with UPI / QR
                      </button>
                    </div>
                  </section>

                  {/* Submission Core */}
                  <section className="glass-card p-10">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-brand-secondary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xl">Verification Proof</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Upload your transaction details to proceed</p>
                      </div>
                    </div>
                    
                    <form onSubmit={handleSubmitProof} className="space-y-8">
                      <div className="space-y-3">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Transaction / UTR ID</label>
                        <input 
                          type="text" 
                          placeholder="12-digit UPI Transaction ID"
                          required
                          maxLength={12}
                          pattern="[A-Za-z0-9]{12}"
                          value={proof.transaction_id}
                          onChange={e => setProof({...proof, transaction_id: e.target.value.toUpperCase()})}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-brand-primary focus:bg-white/[0.05] outline-none transition-all font-mono placeholder:text-gray-700"
                        />
                        <p className="text-[9px] text-gray-600 mt-2 ml-1 italic">* Enter exactly 12 alphanumeric characters as shown in your UPI app.</p>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Payment Receipt</label>
                        <div 
                          onClick={() => document.getElementById('screenshot').click()}
                          className={`group relative border-2 border-dashed rounded-3xl p-12 transition-all duration-500 cursor-pointer text-center overflow-hidden ${
                            proof.screenshot 
                              ? 'border-brand-primary bg-brand-primary/5' 
                              : 'border-white/10 hover:border-brand-primary/50 bg-white/[0.02] hover:bg-white/[0.04]'
                          }`}
                        >
                          {proof.base64 ? (
                            <div className="flex flex-col items-center gap-4 relative z-10">
                              <div className="relative">
                                <img src={proof.base64} alt="Preview" className="w-40 h-40 object-cover rounded-2xl border-2 border-brand-primary/30 shadow-2xl" />
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center shadow-lg">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              <p className="text-sm text-brand-primary font-bold tracking-widest uppercase">Receipt Confirmed</p>
                            </div>
                          ) : (
                            <div className="relative z-10">
                              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-brand-primary/10 transition-all duration-500">
                                <Upload className="w-8 h-8 text-gray-500 group-hover:text-brand-primary transition-colors" />
                              </div>
                              <p className="text-lg font-bold">Select Screenshot</p>
                              <p className="text-xs text-gray-500 mt-2 max-w-[200px] mx-auto">Click or drag your payment proof here. Max file size: 5MB.</p>
                            </div>
                          )}
                          <input id="screenshot" type="file" hidden accept="image/*" onChange={handleScreenshotChange} />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-5 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl font-bold text-lg shadow-[0_10px_40px_rgba(124,58,237,0.3)] hover:shadow-[0_15px_50px_rgba(124,58,237,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing Submission...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-6 h-6" />
                            Submit to Engineers
                          </>
                        )}
                      </button>
                    </form>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Col: Summary & Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-10 shadow-3xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[100px] -mr-32 -mt-32" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/5 blur-[100px] -ml-32 -mb-32" />
               
               <h3 className="text-2xl font-bold mb-10 flex items-center gap-3 relative">
                <div className="w-1 h-8 bg-brand-primary rounded-full" />
                Investment Summary
              </h3>

              <div className="space-y-6 mb-10 relative">
                <div className="flex justify-between items-center group">
                  <span className="text-gray-500 text-sm group-hover:text-gray-400 transition-colors">Infrastructure Base</span>
                  <div className="flex-1 border-b border-white/5 border-dotted mx-4" />
                  <span className="font-bold font-mono">₹{subtotal.toLocaleString()}</span>
                </div>
                
                {coupon && (
                  <div className="flex justify-between items-center group">
                    <span className="text-brand-primary text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Privilege Code ({coupon.code})
                    </span>
                    <div className="flex-1 border-b border-brand-primary/10 border-dotted mx-4" />
                    <span className="font-bold font-mono text-brand-primary">-₹{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center group">
                  <span className="text-gray-500 text-sm group-hover:text-gray-400 transition-colors">Central GST (9%)</span>
                  <div className="flex-1 border-b border-white/5 border-dotted mx-4" />
                  <span className="font-bold font-mono">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center group">
                  <span className="text-gray-500 text-sm group-hover:text-gray-400 transition-colors">State GST (9%)</span>
                  <div className="flex-1 border-b border-white/5 border-dotted mx-4" />
                  <span className="font-bold font-mono">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                
                <div className="pt-8 border-t border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-400">Total Valuation</span>
                    <span className="text-4xl font-display font-bold text-white tracking-tighter">
                      ₹{finalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 text-right uppercase tracking-widest font-bold">Inclusive of all taxes</p>
                </div>
              </div>

              {/* Coupon Section */}
              {!coupon && (
                <div className="space-y-4 mb-10 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3 h-3 text-brand-primary" />
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Access Code</label>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="ENTER CODE" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:border-brand-primary outline-none transition-all font-mono placeholder:text-gray-800"
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={validating || !couponCode}
                      className="px-8 py-3.5 bg-brand-primary/10 rounded-2xl text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all disabled:opacity-30 border border-brand-primary/20"
                    >
                      {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Trust Badge */}
              <div className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[2rem] space-y-4 relative">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white mb-1">Authenticated Encryption</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Your transaction details are encrypted and reviewed only by authorized SSW billing engineers. Work begins immediately upon verification.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Refund Policy Note */}
            <p className="text-center text-[10px] text-gray-600 font-medium px-10">
              * By proceeding, you acknowledge that custom builds require manual resource allocation. Refunds are not available once the development phase is initiated.
            </p>
          </div>

        </motion.div>
      </main>

      {/* --- PRESET QR POPUP MODAL --- */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with extreme glass blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Card */}
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
                    <p className="text-[9px] text-brand-primary/80 uppercase font-bold tracking-[0.2em] mb-1">Net Payable Amount ({paymentPlan === 'full' ? 'Lump Sum' : paymentPlan === 'advance' ? '50% Milestone' : 'Tiered EMI'})</p>
                    <p className="text-2xl font-display font-bold text-white tracking-tight">
                      ₹{amountToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
