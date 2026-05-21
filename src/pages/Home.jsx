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
import { ArrowRight, MessageCircle, Star, Send, Loader2, Sparkles, ShoppingBag } from "lucide-react";
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
        <About settings={siteSettings} />
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
          <section className="py-24 bg-brand-bg border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <span className="text-xl font-bold">{avgRating} / 5.0</span>
                </div>
                <h2 className="text-4xl font-bold font-display">What Our <span className="text-gradient">Clients Say</span></h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8 mb-20">
                {feedbacks.length === 0 ? (
                  [1,2,3].map(i => (
                    <div key={i} className="glass-card p-8 opacity-20">
                      <div className="h-4 w-32 bg-white/10 rounded mb-4" />
                      <div className="h-20 w-full bg-white/10 rounded" />
                    </div>
                  ))
                ) : feedbacks.map(f => (
                  <motion.div 
                    key={f.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card p-8 relative group hover:border-brand-primary/30 transition-all"
                  >
                    <div className="flex gap-1 text-yellow-500 mb-4">
                      {[...Array(f.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-gray-300 italic mb-6 leading-relaxed">"{f.comment}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                        {f.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{f.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Verified Client</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Feedback Form */}
              <div className="max-w-2xl mx-auto bg-brand-card border border-brand-border rounded-3xl p-10">
                <h3 className="text-2xl font-bold mb-6 text-center">Leave Your <span className="text-brand-secondary">Feedback</span></h3>
                <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 transition-all ${rating >= star ? 'text-yellow-500 scale-125' : 'text-gray-600'}`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Share your experience working with us..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-brand-primary outline-none transition-all resize-none h-32"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full py-4 bg-brand-primary rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Feedback
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}        {/* SEO Content Section */}
        <section className="py-24 bg-[#080808] border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 text-gray-300 space-y-12">
            <article>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-6">Elevate Your Discord Experience By <span className="text-gradient">Starlit Siege</span></h2>
              <p className="leading-relaxed mb-6 text-lg">
                Transform your Discord server into a powerful, engaging, and professional community hub with <strong>Starlit Siege</strong>. We specialize in premium Discord server design, advanced bot systems, community management, and creator-focused solutions tailored for streamers, YouTubers, gaming brands, businesses, and online communities.
              </p>
              <p className="leading-relaxed text-lg">
                From custom Discord server setups to scalable community infrastructure, our services are built to help creators grow faster, improve member engagement, and establish a strong digital presence in 2026.
              </p>
            </article>

            <article>
              <h3 className="text-2xl md:text-3xl font-bold font-display text-white mb-6">Professional Discord Services for Modern Communities</h3>
              <p className="leading-relaxed mb-6 text-lg">
                At Starlit Siege, we provide high-quality Discord solutions designed for:
              </p>
              <ul className="grid sm:grid-cols-2 gap-4 mb-8">
                {["Gaming communities", "Streamer communities", "YouTuber fanbases", "Minecraft SMP servers", "Esports organizations", "Creator brands", "Business Discord servers", "International online communities"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-brand-primary/30 transition-colors">
                    <Sparkles className="w-5 h-5 text-brand-primary" />
                    <span className="font-bold text-white">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="leading-relaxed mb-6 text-lg">Our expertise includes:</p>
              <ul className="grid sm:grid-cols-2 gap-4">
                {["Custom Discord server design", "Discord server setup and optimization", "Discord bot integration", "Community management systems", "Moderation and security setup", "Ticket systems and automation", "Role hierarchy and permissions", "Branding-focused server layouts", "Activity and engagement systems", "Long-term Discord management support"].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-brand-secondary shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                    <span className="text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article>
              <h3 className="text-2xl md:text-3xl font-bold font-display text-white mb-6">Why Choose Starlit Siege?</h3>
              <p className="leading-relaxed mb-6 text-lg">
                Modern Discord communities require more than basic channels and bots. Successful servers need:
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {["Strong branding", "Smart server structure", "Member retention systems", "Professional management", "Engaging community experiences"].map((item, i) => (
                  <span key={i} className="px-4 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-full text-sm font-bold">
                    {item}
                  </span>
                ))}
              </div>
              <p className="leading-relaxed mb-8 text-lg">
                At Starlit Siege, we focus on building Discord communities that are visually immersive, highly organized, scalable, and optimized for long-term growth.
              </p>
              <div className="p-8 border-l-4 border-brand-primary bg-gradient-to-r from-brand-primary/10 to-transparent rounded-r-2xl">
                <p className="leading-relaxed font-bold text-white text-xl md:text-2xl italic font-display">
                  "Whether you are launching a new Discord server or upgrading an existing community, our goal is simple: Build a Discord experience people genuinely want to stay in."
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* CTA / Contact Section */}
        <section id="contact" className="py-24 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="glass-card bg-gradient-to-br from-brand-primary/20 to-brand-secondary/10 border-brand-primary/20 p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div style={{ backgroundImage:'url(/banner.png)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.1 }} className="absolute inset-0" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.15),transparent_70%)]" />
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <h2 className="font-display text-4xl md:text-6xl font-bold mb-6" dangerouslySetInnerHTML={{ __html: siteSettings.contact_cta_title || 'Ready to <span class="text-gradient">Transform</span> Your Server?' }} />
                <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
                  {siteSettings.contact_cta_subtext || "Join hundreds of successful communities using our premium Discord solutions. Let's build something amazing together."}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => navigate('/templates')} className="btn-primary flex items-center gap-2 group">
                    Explore Templates
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => navigate('/portfolio')} className="btn-outline flex items-center gap-2 group">
                    <MessageCircle className="w-4 h-4" />
                    Our Work Portfolio
                  </button>
                  <button onClick={() => navigate('/shop')} className="btn-outline flex items-center gap-2 group border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10">
                    <ShoppingBag className="w-4 h-4" />
                    Explore Shop (More Products)
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Home;
