import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Stats from "../components/Stats";
import Portfolio from "../components/Portfolio";
import About from "../components/About";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, MessageCircle, Star, Send, Loader2, Sparkles, ShoppingBag, Server, Bot, Users, Zap, Shield, Palette, Calendar, BarChart, ChevronLeft, ChevronRight } from "lucide-react";
import { getFeedbacks, submitFeedback, getSiteSettings, getBlogs, getFaqs } from "../services/api";
import { toast } from "react-hot-toast";

function Home() {
  const navigate = useNavigate();
  const { openAuthModal, user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [faqOpenId, setFaqOpenId] = useState(null);
  const [siteSettings, setSiteSettings] = useState({
    maintenance_mode: 'false',
    show_stats: 'true',
    show_portfolio: 'true',
    show_pricing: 'true',
    show_feedbacks: 'true'
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
    getSiteSettings().then(settings => {
      setSiteSettings(settings);
      // Update SEO
      if (settings.meta_title) document.title = settings.meta_title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && settings.meta_description) metaDesc.setAttribute('content', settings.meta_description);
      
      // Inject Theme Colors
      if (settings.brand_primary) document.documentElement.style.setProperty('--brand-primary', settings.brand_primary);
      if (settings.brand_secondary) document.documentElement.style.setProperty('--brand-secondary', settings.brand_secondary);
    }).catch(console.error);

    getBlogs().then(data => setBlogs(data.slice(0, 3))).catch(console.error);
    getFaqs().then(data => setFaqs(data.slice(0, 4))).catch(console.error);
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const data = await getFeedbacks();
      setFeedbacks(data);
    } catch (err) { console.error(err); }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!user) { openAuthModal('/', 'login'); return; }
    setSubmitting(true);
    try {
      await submitFeedback({ rating, comment });
      toast.success('Feedback submitted! Awaiting approval.');
      setComment('');
      setRating(5);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1) 
    : "4.9";

  const handleCTA = (route = '/shop') => {
    if (!user) { openAuthModal(route, 'login'); return; }
    navigate(route);
  };

  if (siteSettings.maintenance_mode === 'true' && user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
          </div>
          <h1 className="text-4xl font-bold mb-4 font-display">Under <span className="text-gradient">Maintenance</span></h1>
          <p className="text-gray-400 mb-8">We're currently performing some scheduled updates to improve your experience. We'll be back shortly!</p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-gray-500">
            Estimated time: 15-30 minutes
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero settings={siteSettings} />
        {siteSettings.show_stats !== 'false' && <Stats />}
        
        {/* NEW SERVICES SECTION */}
        <section className="py-24 bg-brand-bg relative overflow-hidden border-t border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-4">
                <Sparkles className="w-3 h-3" /> Premium Capabilities
              </div>
              <h2 className="text-4xl md:text-5xl font-bold font-display">
                Everything You Need To <br/>
                <span className="text-gradient">Scale Your Community</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Discord Server Setup", icon: Server, desc: "Professional architecture with role hierarchy, channels, and security" },
                { title: "Bot Development", icon: Bot, desc: "Custom bots with moderation, economy, tickets, and automation" },
                { title: "Community Management", icon: Users, desc: "Strategic growth, engagement systems, and ongoing support" },
                { title: "Automation Systems", icon: Zap, desc: "Workflows, auto-moderation, welcome systems, and event automation" },
                { title: "Security Systems", icon: Shield, desc: "Anti-raid, verification, audit logging, and permission hardening" },
                { title: "Branding & Design", icon: Palette, desc: "Visual identity, custom emojis, banners, and server aesthetics" },
                { title: "Event Systems", icon: Calendar, desc: "Tournament brackets, giveaways, and community event infrastructure" },
                { title: "Analytics Dashboards", icon: BarChart, desc: "Real-time member metrics, growth tracking, and engagement analytics" }
              ].map((service, i) => (
                <div key={i} className="glass-card group hover:border-brand-primary/40 transition-all p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <service.icon className="w-24 h-24 text-brand-primary transform rotate-12" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center border border-white/10 mb-4 group-hover:scale-110 transition-transform">
                    <service.icon className="w-6 h-6 text-brand-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed relative z-10">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Features />
        
        {siteSettings.show_portfolio !== 'false' && <Portfolio />}

        {/* Blogs Section */}
        <section className="py-24 bg-brand-bg relative overflow-hidden border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-4">
                  <Sparkles className="w-3 h-3" /> Recent Publications
                </div>
                <h2 className="text-4xl font-bold font-display">From Our <span className="text-gradient">Knowledge Hub</span></h2>
              </div>
              <button onClick={() => navigate('/blog')} className="btn-outline flex items-center gap-2 group text-sm">
                View All Articles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {blogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No blog posts available.</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {blogs.map(blog => (
                  <div key={blog.id} className="glass-card p-6 flex flex-col justify-between hover:border-brand-primary/30 transition-all group duration-300">
                    <div>
                      <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-wider block mb-3">{blog.category}</span>
                      <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">{blog.title}</h3>
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-6">
                        {blog.content.replace(/[#*`_-]/g, "")}
                      </p>
                    </div>
                    <button onClick={() => navigate(`/blog/${blog.slug}`)} className="inline-flex items-center gap-2 text-xs font-bold text-white group-hover:text-brand-primary transition-colors">
                      Read Guide <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQs Section */}
        <section className="py-24 bg-[#080808] border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-4">
                <Sparkles className="w-3 h-3" /> Quick Help
              </div>
              <h2 className="text-4xl font-bold font-display">Frequently Asked <span className="text-gradient">Questions</span></h2>
            </div>

            {faqs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No FAQs available.</div>
            ) : (
              <div className="space-y-4">
                {faqs.map(faq => {
                  const isOpen = faqOpenId === faq.id;
                  return (
                    <div key={faq.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10">
                      <button onClick={() => setFaqOpenId(isOpen ? null : faq.id)} className="w-full flex items-center justify-between p-6 text-left focus:outline-none">
                        <span className="font-bold text-white text-base pr-4">{faq.question}</span>
                        {isOpen ? (
                          <span className="text-brand-primary font-bold text-lg shrink-0">-</span>
                        ) : (
                          <span className="text-gray-500 font-bold text-lg shrink-0">+</span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/[0.01]">
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center mt-12">
              <button onClick={() => navigate('/faq')} className="btn-outline flex items-center gap-2 group text-sm mx-auto">
                See More Questions <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Reviews / Feedback Section */}
        {siteSettings.show_feedbacks !== 'false' && (
          <section className="py-24 bg-[#050505] relative overflow-hidden border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-white">{avgRating} / 5.0</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold font-display">Trusted By <span className="text-gradient">50+ Communities</span></h2>
                </div>
              </div>

              {/* Infinite Scroll Carousel wrapper */}
              <div className="relative w-full overflow-hidden mb-20 mask-image-fade">
                <div className="flex gap-6 animate-scroll w-max hover:pause">
                  {[...feedbacks, ...feedbacks].map((f, i) => (
                    <div key={`${f.id}-${i}`} className="glass-card p-8 w-[400px] shrink-0 border-white/5 hover:border-brand-primary/30 transition-all">
                      <div className="flex gap-1 text-yellow-500 mb-6">
                        {[...Array(f.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />)}
                      </div>
                      <p className="text-gray-300 italic mb-8 leading-relaxed text-lg font-display">"{f.comment}"</p>
                      <div className="flex items-center gap-4 mt-auto">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center text-brand-primary font-bold border border-brand-primary/20">
                          {f.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{f.name}</p>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-brand-secondary" />
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Verified Client</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {feedbacks.length === 0 && (
                     <div className="text-center w-full py-12 text-gray-500">Reviews loading...</div>
                  )}
                </div>
              </div>

              {/* Feedback Form */}
              <div className="max-w-2xl mx-auto glass-card p-10 bg-black/40">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Leave Your <span className="text-gradient">Feedback</span></h3>
                  <p className="text-gray-400 text-sm">Help us improve by sharing your experience.</p>
                </div>
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="flex justify-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 transition-all hover:scale-110 ${rating >= star ? 'text-yellow-500' : 'text-gray-600'}`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Share your experience working with us..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-brand-primary outline-none transition-all resize-none h-32"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Submit Feedback
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}
        
        <About settings={siteSettings} />

        {/* CTA / Contact Section */}
        <section id="contact" className="py-24 border-t border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_70%)]" />
          <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-primary/30 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                Taking New Clients
              </span>
            </div>
            
            <h2 className="font-display text-5xl md:text-7xl font-black mb-8 leading-[1.1]" dangerouslySetInnerHTML={{ __html: siteSettings.contact_cta_title || 'Ready to <span class="text-gradient">Transform</span> Your Server?' }} />
            
            <p className="text-gray-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              {siteSettings.contact_cta_subtext || "Join hundreds of successful communities using our premium Discord solutions. Let's build something amazing together."}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigate('/shop')} className="btn-primary flex items-center justify-center gap-2 px-10 py-4 text-lg">
                Get Your Free Quote
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => window.open('https://discord.gg/yourserver', '_blank')} className="btn-secondary flex items-center justify-center gap-2 px-8 py-4 text-lg">
                <MessageCircle className="w-5 h-5" />
                Join Our Discord
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Home;
