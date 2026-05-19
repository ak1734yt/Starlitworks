import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, HelpCircle, CreditCard, Bot, ShieldCheck, MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';

const FAQ_DATA = [
  {
    category: 'Billing & Payments',
    icon: CreditCard,
    color: 'text-brand-primary',
    items: [
      {
        q: 'How does billing work?',
        a: 'After submitting a service request, our team reviews and sends you a custom quote. Once you accept the quote, you proceed to pay via UPI/QR code. Payment is confirmed after manual verification by our team.'
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We currently accept UPI (PhonePe, GPay, Paytm) and QR code-based payments in INR. International clients can arrange alternative payment via Discord support.'
      },
      {
        q: 'Can I pay in installments?',
        a: 'Yes! For larger projects, we offer installment payment plans. This is negotiable at the time of quote acceptance. Contact our team for details.'
      },
      {
        q: 'What is the refund policy?',
        a: 'We offer refunds on a case-by-case basis if work has not yet started. Once a project is initiated, refunds are not typically offered. We do honor delivery guarantees — if we fail to deliver, a partial refund or credit is issued.'
      },
      {
        q: 'What are account credits?',
        a: 'Credits are in-platform currency (₹) that can be applied toward future orders. You earn credits through our referral program, loyalty rewards, or promotional bonuses added by our team.'
      },
    ]
  },
  {
    category: 'Orders & Quotes',
    icon: MessageCircle,
    color: 'text-brand-secondary',
    items: [
      {
        q: 'How do I submit a service request?',
        a: 'Browse our Shop, select the services you want, then click "Proceed". Fill in your project requirements on the Service Request form. Our team will review and reply with a custom quote within 24 hours.'
      },
      {
        q: 'Can I negotiate the quoted price?',
        a: 'Yes! After receiving a quote, you can submit a counter-offer through the "Negotiate" button in your portal. We will review and respond.'
      },
      {
        q: 'How long does delivery take?',
        a: 'Timelines vary by service type. Bot development typically takes 3–7 days, server setup 1–3 days, and promotions 1–6 days depending on the package. Exact timelines are confirmed in the quote.'
      },
      {
        q: 'Can I track my order status?',
        a: 'Yes! Your client portal (History page) shows a real-time visual progress tracker with stages: Submitted → Quoted → Payment → In Progress → Completed.'
      },
    ]
  },
  {
    category: 'Discord Bots',
    icon: Bot,
    color: 'text-green-400',
    items: [
      {
        q: 'Do you host the bots you create?',
        a: 'Yes! Hosting is offered as an optional add-on service. We can deploy bots on our cloud infrastructure (EnderCloud) for 24/7 uptime. Ask for a hosting quote alongside your bot order.'
      },
      {
        q: 'Can I get the source code for my bot?',
        a: 'Source code delivery depends on the package. Premium and Custom packages include full source code. Standard packages include the running bot without source. Details are clarified in the quote.'
      },
      {
        q: 'Do you offer bot maintenance after delivery?',
        a: 'We offer post-delivery support for 7 days for bug fixes. Extended maintenance plans are available as a recurring add-on. Contact us for pricing.'
      },
    ]
  },
  {
    category: 'Account & Security',
    icon: ShieldCheck,
    color: 'text-yellow-400',
    items: [
      {
        q: 'Is my data safe with Starlit Siege Works?',
        a: 'Yes. All sensitive data (passwords, credentials) is encrypted using industry-standard algorithms. We never share client data with third parties. Vault credentials are stored in a protected, access-controlled environment.'
      },
      {
        q: 'What is the Security Vault?',
        a: 'The Security Vault is a private area in your portal where we securely deliver project credentials (e.g., bot tokens, hosting details). It is protected by a 4-digit PIN and uses encrypted storage.'
      },
      {
        q: 'How do I reset my password?',
        a: 'Visit the Login page and click "Forgot Password". Enter your registered email and a reset link will be sent to you within 5 minutes.'
      },
      {
        q: 'Can I enable Two-Factor Authentication (2FA)?',
        a: 'Yes! Go to your Profile page and enable 2FA under Security Settings. We support TOTP-based authenticators (Google Authenticator, Authy, etc.).'
      },
    ]
  },
];

export default function Help() {
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState(null);

  const filteredFAQ = FAQ_DATA.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        !search.trim() ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      <main className="pt-32 pb-24 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            <HelpCircle className="w-3 h-3" /> Help Center
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            How can we <span className="text-gradient">help you?</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto mb-8">
            Find answers to common questions about our services, billing, and platform.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>
        </div>

        {/* FAQ Sections */}
        {filteredFAQ.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No matching questions found.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredFAQ.map((section, si) => (
              <div key={si}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">{section.category}</h2>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* FAQ Items */}
                <div className="space-y-2">
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}`;
                    const isOpen = openItem === key;
                    return (
                      <div key={ii} className="bg-[#0b0c14] border border-white/5 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setOpenItem(isOpen ? null : key)}
                          className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <span className="font-semibold text-sm text-white pr-4">{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 border-t border-white/5">
                                <p className="text-sm text-gray-400 leading-relaxed mt-4">{item.a}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Still need help? */}
        <div className="mt-16 p-8 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/5 border border-brand-primary/10 rounded-3xl text-center">
          <h3 className="font-display text-xl font-bold mb-2">Still need help?</h3>
          <p className="text-gray-500 text-sm mb-6">Our support team is available via the live chat widget or Discord.</p>
          <a
            href="https://discord.gg/cozyclouds"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary rounded-xl text-sm font-bold text-white hover:bg-brand-primary/90 transition-all"
          >
            <MessageCircle className="w-4 h-4" /> Open Discord Support
          </a>
        </div>
      </main>
    </div>
  );
}
