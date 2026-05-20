import { useState, useEffect } from "react";
import { getFaqs } from "../services/api";
import { HelpCircle, ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function FAQ() {
  const [faqs, setFaqs] = useState([]);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFaqs()
      .then((data) => {
        setFaqs(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const toggleOpen = (id) => {
    setOpenId(openId === id ? null : id);
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col justify-between">
      <Navbar />
      
      {/* Background Gradients */}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[140px] pointer-events-none" />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 w-full flex-1 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-brand-primary/30 text-xs font-mono font-black text-brand-primary uppercase tracking-widest mb-6">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl mb-6">
            Have questions? <span className="text-gradient">We have answers.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to know about our custom Discord bot developments, payment structures, and server layouts.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-brand-border rounded-full pl-12 pr-6 py-4 text-white text-sm outline-none focus:border-brand-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all"
          />
        </div>

        {/* FAQ Accordion List */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No questions match your search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10"
                >
                  <button
                    onClick={() => toggleOpen(faq.id)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                  >
                    <span className="font-bold text-white text-base md:text-lg pr-4">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-brand-primary shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/[0.01]">
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
