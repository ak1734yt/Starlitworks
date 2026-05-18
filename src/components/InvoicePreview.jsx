import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Sparkles } from 'lucide-react';
import ORG from '../constants/orgData';

export default function InvoicePreview({ invoice, onClose }) {
  const ref = useRef();
  const org = ORG;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handlePrint = () => {
    const area = document.getElementById('print-area');
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #fff; color: #111; padding: 40px; }
          .banner { width: 100%; height: 140px; object-fit: cover; object-position: center; border-radius: 12px; margin-bottom: 24px; }

          .header-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px; }
          .logo-print { width: 48px; height: 48px; object-fit: contain; }
          .title { font-size: 24px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; }
          .subtitle { font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 30px; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; }

          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
          .section-title { font-size: 14px; font-weight: 700; color: #6366f1; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          .info-text { font-size: 13px; line-height: 1.6; color: #374151; }
          .info-row { display: flex; margin-bottom: 4px; }
          .info-label { font-weight: 600; min-width: 120px; }

          .package-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 30px; }
          .check-item { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; margin-bottom: 6px; }
          .check-box { width: 12px; height: 12px; border: 1px solid #374151; display: flex; align-items: center; justify-content: center; font-size: 9px; margin-top: 2px; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; color: #1e1b4b; border: 1px solid #e5e7eb; }
          td { padding: 10px; border: 1px solid #e5e7eb; color: #374151; }
          
          .totals-table { width: 280px; margin-left: auto; }
          .totals-table td { padding: 6px 10px; border: none; }
          .totals-table tr.grand-total td { font-weight: 800; font-size: 16px; border-top: 2px solid #1e1b4b; color: #1e1b4b; padding-top: 12px; }
          
          .payment-info { background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 12px; margin-bottom: 30px; }
          .terms { font-size: 10px; color: #6b7280; line-height: 1.5; }
          .terms h4 { font-size: 11px; color: #1e1b4b; margin-bottom: 6px; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; }
          .sign-box { width: 220px; }
          .sign-line { border-top: 1px solid #374151; padding-top: 8px; margin-top: 40px; text-align: center; font-weight: 600; }
        </style>
      </head>
      <body>
        <div id="print-area">
          ${area.innerHTML}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden border-white/10 flex flex-col"
      >
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              Invoice Preview
            </h2>
            <p className="text-xs text-gray-500">Review the generated invoice before printing</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="btn-outline py-2 px-4 flex items-center gap-2">
              <X className="w-4 h-4" />
              Close
            </button>
            <button onClick={handlePrint} className="btn-primary py-2 px-6 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-12 bg-[#07080f]">
          <div id="print-area" className="bg-white text-black p-12 rounded-xl shadow-2xl mx-auto w-full max-w-[800px] min-h-[1000px] font-sans">
            <img src="/banner.png" alt="Banner" className="banner w-full h-[140px] object-cover object-center rounded-xl mb-8" />

            
            <div className="header-row flex items-center justify-center gap-4 mb-2">
              <img src="/logo.png" alt="Logo" className="logo-print w-12 h-12 object-contain" />
              <h1 className="title text-2xl font-black text-[#1e1b4b] uppercase m-0">
                BUSINESS INVOICE & CUSTOM PLAN
              </h1>
            </div>

            <p className="subtitle text-center text-[13px] font-bold text-[#6366f1] tracking-widest mb-10">
              {ORG.name} | {ORG.tagline}
            </p>


            <div className="grid grid-cols-2 gap-12 mb-10">
              <div>
                <h3 className="text-[14px] font-bold text-[#6366f1] uppercase border-b border-gray-200 pb-2 mb-4">Business Details</h3>
                <div className="text-[13px] space-y-1.5 text-gray-700">
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Name:</span> {org.name}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Domain:</span> {org.tagline}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Country:</span> {org.country}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Contact:</span> {org.emails[0]}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">WhatsApp:</span> {org.phone}</div>
                </div>
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#6366f1] uppercase border-b border-gray-200 pb-2 mb-4">Client Details</h3>
                <div className="text-[13px] space-y-1.5 text-gray-700">
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Client Name:</span> {invoice.client.name}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Server Name:</span> {invoice.client.serverName}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Invoice No:</span> {invoice.invoiceNumber}</div>
                  <div className="flex gap-4"><span className="font-bold min-w-[120px]">Invoice Date:</span> {invoice.invoiceDate}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
              <h3 className="text-[15px] font-bold text-[#1e1b4b] mb-4">Selected Package Breakdown</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {invoice.items.map((item, i) => (
                  <div key={i} className="flex gap-3 text-[12px] text-gray-700">
                    <span className="w-4 h-4 border border-gray-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                    <span>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-[14px] font-bold text-[#6366f1] uppercase border-b border-gray-200 pb-2 mb-4">Billing Summary</h3>
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border border-gray-200">Description</th>
                  <th className="p-3 border border-gray-200 text-center">Qty</th>
                  <th className="p-3 border border-gray-200 text-right">Rate (₹)</th>
                  <th className="p-3 border border-gray-200 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="p-3 border border-gray-200 text-[12px]">{item.description}</td>
                    <td className="p-3 border border-gray-200 text-center text-[12px]">{item.qty}</td>
                    <td className="p-3 border border-gray-200 text-right text-[12px]">{item.rate.toLocaleString()}</td>
                    <td className="p-3 border border-gray-200 text-right text-[12px] font-bold">{item.price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-10">
              <table className="w-[300px]">
                <tbody>
                  <tr className="text-[13px] text-gray-700">
                    <td className="p-2">Subtotal:</td>
                    <td className="p-2 text-right">₹{invoice.subtotal.toLocaleString()}</td>
                  </tr>
                  {invoice.discountAmount > 0 && (
                    <tr className="text-[13px] text-red-600">
                      <td className="p-2">Discount:</td>
                      <td className="p-2 text-right">-₹{invoice.discountAmount.toLocaleString()}</td>
                    </tr>
                  )}
                  {invoice.cgst > 0 && (
                    <tr className="text-[13px] text-gray-700">
                      <td className="p-2">CGST:</td>
                      <td className="p-2 text-right">₹{invoice.cgst.toLocaleString()}</td>
                    </tr>
                  )}
                  {invoice.sgst > 0 && (
                    <tr className="text-[13px] text-gray-700">
                      <td className="p-2">SGST:</td>
                      <td className="p-2 text-right">₹{invoice.sgst.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="text-[18px] font-black text-[#1e1b4b] border-t-2 border-[#1e1b4b]">
                    <td className="p-3 pt-4">Grand Total:</td>
                    <td className="p-3 pt-4 text-right">₹{invoice.grandTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {invoice.paymentType === 'installment' && invoice.installments && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                <h3 className="text-[14px] font-bold text-[#1e1b4b] uppercase border-b border-gray-200 pb-2 mb-4">Payment Schedule</h3>
                <div className="space-y-3">
                  {invoice.installments.map((inst, i) => (
                    <div key={i} className="flex justify-between text-[13px]">
                      <span className="font-medium">#{i+1} Payment ({inst.month})</span>
                      <div className="text-right">
                        <span className="font-bold">₹{inst.amount.toLocaleString()}</span>
                        {inst.recurring > 0 && <p className="text-[11px] text-gray-500">₹{inst.principal.toLocaleString()} setup + ₹{inst.recurring.toLocaleString()} recurring</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-[12px] text-gray-700 space-y-1">
              <h4 className="font-bold text-[#1e1b4b] mb-2">Payment Details</h4>
              {invoice.paymentStatus === 'paid' ? (
                <>
                  <p className="text-green-600 font-bold">Status: PAID</p>
                  {invoice.payment_method === 'credits' ? (
                    <p className="text-indigo-600 font-semibold">Method: Fully Paid via Starlit Credits (₹{Number(invoice.credits_applied || invoice.grandTotal).toLocaleString()} applied)</p>
                  ) : (
                    <p>Method: {invoice.payment_method || 'UPI / Bank Transfer'}</p>
                  )}
                  {invoice.transaction_id && <p>Transaction ID: <span className="font-mono font-bold text-indigo-700">{invoice.transaction_id}</span></p>}
                </>
              ) : invoice.paymentStatus === 'payment_pending' ? (
                <>
                  <p className="text-amber-600 font-bold">Status: Verification Pending</p>
                  <p>Method: {invoice.payment_method || 'UPI / Bank Transfer'}</p>
                  {invoice.transaction_id && <p>Transaction ID: <span className="font-mono font-bold text-amber-700">{invoice.transaction_id}</span></p>}
                </>
              ) : (
                <>
                  <p className="text-red-600 font-bold">Status: UNPAID</p>
                  <p>Method: UPI / Bank Transfer</p>
                  <p>UPI ID: {org.upiId}</p>
                  <p>UPI Number: {org.upiNumber}</p>
                </>
              )}
            </div>

            <div className="text-[10px] text-gray-500 mb-12">
              <h4 className="text-[11px] font-bold text-[#1e1b4b] mb-2 uppercase">Terms & Conditions</h4>
              <ul className="list-disc pl-5 space-y-1">
                {org.terms.map((term, i) => <li key={i}>{term}</li>)}
              </ul>
            </div>

            <div className="flex justify-between mt-12 pt-12 border-t border-gray-100">
              <div className="sign-box">
                <div className="text-[12px] text-gray-700 mb-8">Client Signature: <span className="font-bold">{invoice.client.name}</span></div>
                <div className="border-t border-gray-400 pt-2 text-center text-[11px] font-bold uppercase">Authorized Signature</div>
              </div>
              <div className="sign-box">
                <div className="text-[12px] text-gray-700 mb-8 text-right">Date: {invoice.invoiceDate}</div>
                <div className="border-t border-gray-400 pt-2 text-center text-[11px] font-bold uppercase">Starlit Siege Works</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
