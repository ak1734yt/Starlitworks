import { ArrowRight, Sparkles, Users, ShieldCheck, Zap, PlayCircle, Activity, Rocket, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_STATS } from "../constants/heroStats";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Hero = ({ settings = {} }) => {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [cardData, setCardData] = useState([]);

  useEffect(() => {
    fetch('/api/portfolio').then(r => r.json()).then(data => setPortfolio(data)).catch(() => {});
  }, []);

  // Build carousel slides: banner + up to 4 portfolio cards
  useEffect(() => {
    const slides = [{ type: 'banner' }];
    const featuredPortfolio = portfolio.slice(0, 4);
    featuredPortfolio.forEach(p => slides.push({ type: 'portfolio', data: p }));
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
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/95 via-brand-bg/40 to-transparent" />
      <div className="absolute top-4 left-4 glass-heavy px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary">
        {project.category || 'Portfolio'}
      </div>
      {project.member_count && (
        <div className="absolute top-4 right-4 glass-heavy px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold">
          <Users className="w-3.5 h-3.5 text-brand-secondary" />{project.member_count}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-display font-black text-white mb-2">{project.title}</h3>
            <p className="text-sm text-gray-300 line-clamp-1">{project.description}</p>
          </div>
          <div className="ml-4 shrink-0">
            <div className="w-10 h-10 rounded-xl glass flex items-center justify-center group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const BannerCard = () => (
    <div className="absolute inset-0">
      <img
        src={settings.hero_banner || "/banner.png"}
        alt="Starlit Siege Banner"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-500"
        onError={(e) => { e.target.src = "/banner.png"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/95 via-brand-bg/20 to-transparent" />
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
    <section className="relative pt-28 pb-16 md:pt-32 md:pb-20 overflow-hidden md:min-h-[80vh] flex items-center section-transparent">
      {/* ═══ Background Layers ═══ */}
      <div className="gradient-mesh animate-gradient-shift" />
      <div className="starlit-pattern absolute inset-0 opacity-40 pointer-events-none" />
      
      {/* Ambient nebula glow spots */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[150px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-brand-secondary/8 rounded-full blur-[120px] pointer-events-none animate-float-slow" style={{ animationDelay: '5s' }} />
      <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none animate-float-slow" style={{ animationDelay: '3s' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* ═══════════ LEFT: Text Content ═══════════ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Top Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-brand-primary/40 bg-brand-primary/[0.08] shadow-[0_0_20px_rgba(124,58,237,0.15)] mb-8 group hover:border-brand-primary/60 transition-all duration-500 cursor-default"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
              </span>
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]">
                Now Available for Commissions
              </span>
              <Sparkles className="w-3 h-3 text-brand-accent" />
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-3xl md:text-4xl lg:text-[3.2rem] xl:text-[3.5rem] font-black leading-[1.1] mb-6 text-white tracking-tight"
            >
              Build Discord{" "}
              <br className="hidden md:block" />
              <span className="text-gradient-hero">Communities</span>{" "}
              <br className="hidden md:block" />
              With <span className="text-gradient-hero">Starlit Siege</span>
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
              <span className="text-white/90 font-bold text-base md:text-lg tracking-tight">That People Never Want to Leave.</span>
            </motion.div>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="text-gray-400 text-sm md:text-[15px] leading-relaxed mb-8 max-w-lg"
            >
              Premium server architecture, custom bots, automation systems, and scalable community growth infrastructure for creators, brands, and gaming organizations.
            </motion.p>

            {/* Feature Pills */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-wrap items-center gap-x-1 gap-y-3 mb-10"
            >
              {featurePills.map((pill, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.06] transition-all duration-300 group/pill cursor-default">
                    <div className={`w-7 h-7 rounded-lg bg-${pill.color}/15 flex items-center justify-center border border-${pill.color}/25 group-hover/pill:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-shadow`}>
                      <pill.icon className={`w-3.5 h-3.5 text-${pill.color}`} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-300 group-hover/pill:text-white transition-colors whitespace-nowrap">{pill.label}</span>
                  </div>
                  {i < featurePills.length - 1 && (
                    <div className="w-px h-5 bg-white/[0.06] mx-1 hidden sm:block" />
                  )}
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
                className="group relative flex items-center justify-center gap-2.5 text-base px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r from-brand-primary via-[#6d5ce7] to-brand-secondary shadow-[0_0_30px_rgba(124,58,237,0.35),0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_rgba(124,58,237,0.5),0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
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
                  9k+
                </div>
              </div>
              <div>
                <p className="text-[13px] text-gray-300 mb-0.5">Trusted by <span className="font-bold text-white">9,843+</span> communities worldwide</p>
                <p className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
                  24/7 Expert Support • 99.9% Uptime
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* ═══════════ RIGHT: Glass Card Showcase ═══════════ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative group aspect-[4/3] w-full max-w-lg ml-auto">
              {/* Deep ambient glow behind the card */}
              <div 
                className="absolute -inset-16 opacity-40 group-hover:opacity-60 transition-opacity duration-1000 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.35) 0%, rgba(59,130,246,0.15) 40%, transparent 70%)',
                  willChange: 'opacity',
                }}
              />

              {/* Orbital Rings - Layer 1 */}
              <div className="absolute -inset-[60%] animate-orbit pointer-events-none opacity-30 z-0">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeWidth="0.15">
                  <ellipse cx="50" cy="50" rx="45" ry="12" stroke="url(#orbit-grad-1)" transform="rotate(25 50 50)" />
                  <ellipse cx="50" cy="50" rx="40" ry="10" stroke="url(#orbit-grad-2)" transform="rotate(-35 50 50)" />
                  <defs>
                    <linearGradient id="orbit-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(124,58,237,0)" />
                      <stop offset="50%" stopColor="rgba(124,58,237,0.6)" />
                      <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                    </linearGradient>
                    <linearGradient id="orbit-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(59,130,246,0)" />
                      <stop offset="50%" stopColor="rgba(59,130,246,0.5)" />
                      <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Orbital Rings - Layer 2 (reverse) */}
              <div className="absolute -inset-[45%] animate-orbit-reverse pointer-events-none opacity-20 z-0">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" strokeWidth="0.12">
                  <ellipse cx="50" cy="50" rx="42" ry="8" stroke="rgba(236,72,153,0.4)" transform="rotate(60 50 50)" />
                </svg>
              </div>

              {/* Card Container with Neon Border */}
              <div className="absolute inset-0 neon-border-glow p-0 overflow-hidden z-10">
                <AnimatePresence mode="wait">
                  {currentSlide && (
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute inset-0"
                    >
                      {currentSlide.type === 'banner' && <BannerCard />}
                      {currentSlide.type === 'portfolio' && <PortfolioCard project={currentSlide.data} />}
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
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(124,58,237,0.15)] border border-white/10 bg-[#0a0a10]/90 backdrop-blur-2xl">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white">24/7 Security</p>
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
                <div className="px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(59,130,246,0.15)] border border-white/10 bg-[#0a0a10]/90 backdrop-blur-2xl">
                  <div className="w-10 h-10 rounded-xl bg-brand-secondary/15 border border-brand-secondary/25 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-brand-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Hyper Automation</p>
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
