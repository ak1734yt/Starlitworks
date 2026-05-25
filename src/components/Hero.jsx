import { ArrowRight, Sparkles, Users, ShieldCheck, Zap, PlayCircle, Activity, Rocket, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_STATS } from "../constants/heroStats";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getPublicStats, getPortfolio } from "../services/api";

const Hero = ({ settings = {} }) => {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [cardData, setCardData] = useState([]);
  const [realStats, setRealStats] = useState(null);

  useEffect(() => {
    getPortfolio().then(data => setPortfolio(data || [])).catch(() => {});
    
    const fetchStats = () => getPublicStats().then(setRealStats).catch(() => {});
    fetchStats();
    
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Build carousel slides: up to 4 portfolio cards
  useEffect(() => {
    const slides = [];
    if (portfolio && portfolio.length > 0) {
      const featuredPortfolio = portfolio.slice(0, 4);
      featuredPortfolio.forEach(p => slides.push({ type: 'portfolio', data: p }));
    } else {
      // Fallback if API fails or returns empty, to prevent blank dark box
      slides.push({
        type: 'portfolio',
        data: {
          title: "Starlit Siege",
          description: "Premium Discord infrastructure and robust community systems.",
          category: "Featured",
          member_count: "1k+",
          banner_url: settings?.hero_banner || "/banner.jpg?v=3"
        }
      });
    }
    setCardData(slides);
  }, [portfolio]);

  // Auto-rotate every 4s
  useEffect(() => {
    if (cardData.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % cardData.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [cardData.length]);

  const PortfolioCard = ({ project }) => (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl cursor-pointer group"
      onClick={() => project.link && window.open(project.link, '_blank')}
    >
      {project.banner_url ? (
        <img
          src={project.banner_url}
          alt={project.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/20 to-brand-primary/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
      <div className="absolute top-4 left-4 bg-[#0a0a10]/80 border border-brand-primary/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary">
        {project.category || 'Portfolio'}
      </div>
      {project.member_count && (
        <div className="absolute top-4 right-4 bg-[#0a0a10]/80 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold text-gray-300">
          <Users className="w-3.5 h-3.5 text-brand-secondary" />{project.member_count}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-display font-black text-white mb-2">{project.title}</h3>
            <p className="text-sm text-gray-300 line-clamp-2">{project.description}</p>
          </div>
          {project.link && (
            <div className="ml-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#9d4edd] shadow-[0_0_20px_rgba(157,78,221,0.4)] flex items-center justify-center transition-all group-hover:scale-110">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const currentSlide = cardData[activeSlide];

  const featurePills = [
    { icon: ShieldCheck, label: "Secure Infrastructure", color: "brand-primary" },
    { icon: Zap, label: "Lightning Performance", color: "brand-secondary" },
    { icon: Rocket, label: "Custom Bots & Automation", color: "brand-primary" },
    { icon: Users, label: "Community Growth", color: "brand-accent" },
  ];

  return (
    <section className="relative pt-20 pb-8 md:pt-24 md:pb-10 overflow-hidden md:min-h-[75vh] flex items-center section-transparent">
      {/* Background is now handled globally in Home.jsx */}

      {/* ═══ Background Layers ═══ */}
      <div className="gradient-mesh animate-gradient-shift opacity-50" />
      <div className="starlit-pattern absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* Ambient nebula glow spots */}
      <div className="absolute top-[0%] left-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1),transparent_60%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* ═══════════ LEFT: Text Content ═══════════ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >


            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl md:text-5xl lg:text-5xl xl:text-[3.2rem] font-black leading-[1.1] mb-5 text-white tracking-tight"
            >
              {settings.hero_title ? (
                <span dangerouslySetInnerHTML={{ __html: settings.hero_title }} />
              ) : (
                <>Elevate Your <br />
                <span className="text-gradient-hero">Discord Experience</span></>
              )}
            </motion.h1>

            {/* Discord Sub-Banner */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#0d0b1a] border border-brand-primary/15 shadow-[0_4px_30px_rgba(124,58,237,0.1)] mb-6"
            >
              <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              <span className="text-white/90 font-bold text-base md:text-lg tracking-tight">
                {settings.hero_status_text || "Now Available for Commissions"}
              </span>
            </motion.div>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="text-gray-400 text-sm md:text-[15px] leading-relaxed mb-6 max-w-lg"
            >
              {settings.hero_subtitle || "Professional Discord services crafted for communities, businesses, and creators. Custom bots, server setup, and ongoing support — all in one premium package."}
            </motion.p>

            {/* Feature Pills */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap items-center gap-2 mb-8"
            >
              {featurePills.map((pill, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300 group/pill cursor-default">
                  <pill.icon className={`w-3.5 h-3.5 text-${pill.color}`} />
                  <span className="text-[11px] font-semibold text-gray-300 group-hover/pill:text-white transition-colors whitespace-nowrap">{pill.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 mb-10"
            >
              <button 
                onClick={() => navigate('/shop')} 
                className="group relative flex items-center justify-center gap-2.5 text-base px-8 py-4 rounded-full font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_30px_rgba(88,101,242,0.35),0_4px_15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Sparkles className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </button>
              <button 
                onClick={() => navigate('/portfolio')} 
                className="group flex items-center justify-center gap-2.5 text-base px-8 py-4 rounded-full font-bold text-white/90 bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] backdrop-blur-sm"
              >
                <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                View Our Work
              </button>
            </motion.div>

            {/* Trust Metrics */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.7 }}
              className="flex items-center gap-4 pt-2"
            >
              <div className="flex -space-x-2.5">
                {[...HERO_STATS.avatars, "https://i.pravatar.cc/150?u=a042581f4e29026704d"].map((url, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-brand-bg bg-brand-card overflow-hidden ring-1 ring-white/10">
                    <img src={url} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-brand-bg bg-brand-primary/20 flex items-center justify-center text-[9px] font-bold text-brand-primary ring-1 ring-brand-primary/30">
                  {realStats && realStats.member_count ? (realStats.member_count >= 1000 ? `${(realStats.member_count / 1000).toFixed(1).replace('.0', '')}k+` : realStats.member_count) : '9k+'}
                </div>
              </div>
              <div>
                <p className="text-[13px] text-gray-300 mb-0.5"><span className="font-bold text-white">{realStats?.projects_developed || settings.stat_projects_developed || '50+'}</span> Clients</p>
                <p className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
                  24/7 Expert Support • 99.9% Uptime
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* ═══════════ RIGHT: Portfolio Showcase ═══════════ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative group aspect-[4/3] w-full max-w-lg ml-auto">
              {/* Ambient glow */}
              <div
                className="absolute -inset-16 opacity-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.3) 0%, rgba(59,130,246,0.12) 40%, transparent 70%)',
                }}
              />

              {/* Card Container */}
              <div className="absolute inset-0 neon-border-glow p-0 overflow-hidden z-10">
                <AnimatePresence mode="wait">
                  {currentSlide && currentSlide.type === 'portfolio' && (
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-0"
                    >
                      <PortfolioCard project={currentSlide.data} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent pointer-events-none z-20" />
              </div>

              {/* ─── Floating Badge: Top Left ─── */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-8 -left-2 z-30"
              >
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(124,58,237,0.1)] border border-white/5 bg-[#0a0a10]">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">{settings.hero_badge_secure || "Secure Hosting"}</p>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">Real-time protection</p>
                  </div>
                </div>
              </motion.div>

              {/* ─── Floating Badge: Bottom Right ─── */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                className="absolute -bottom-8 -right-6 z-30"
              >
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.1)] border border-white/5 bg-[#0a0a10]">
                  <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-brand-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{settings.hero_badge_live || "Live Events"}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      Custom bots deployed
                      <Activity className="w-3 h-3 text-brand-secondary" />
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Dot navigation */}
              {cardData.length > 1 && (
                <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {cardData.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeSlide
                          ? 'w-8 bg-brand-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]'
                          : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
