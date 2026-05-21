import { ArrowRight, Bot, Server, Sparkles, Users, ArrowUpRight, ShieldCheck, Zap } from "lucide-react";
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

  return (
    <section className="relative pt-36 pb-24 overflow-hidden min-h-[90vh] flex items-center">
      {/* Animated Gradient Background */}
      <div className="gradient-mesh animate-gradient-shift" />
      <div className="starlit-pattern absolute inset-0 opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass bg-brand-primary/10 border-brand-primary/30 mb-8 hover:border-brand-primary/50 transition-colors cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-primary"></span>
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                {settings.hero_status_text || 'Now Accepting New Projects'}
              </span>
            </div>

            {/* Main Copy */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] mb-5 text-white tracking-tight">
              Build Discord Communities That <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-blue-400">People Never Want to Leave</span>
            </h1>

            <p className="text-gray-400 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              Premium server architecture, custom bots, and community growth systems for creators, brands, and gaming organizations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={() => navigate('/shop')} className="btn-primary flex items-center justify-center gap-2 group text-base px-10">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/portfolio')} className="btn-secondary flex items-center justify-center gap-2 group text-base">
                <Sparkles className="w-5 h-5" />
                View Our Work
              </button>
            </div>

            {/* Trust Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-8 pt-8 border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {HERO_STATS.avatars.map((url, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-brand-card overflow-hidden">
                      <img src={url} alt="avatar" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-1 mb-0.5">
                    {[...Array(Math.floor(HERO_STATS.rating))].map((_, i) => (
                      <span key={i} className="text-yellow-500 text-xs drop-shadow-[0_0_5px_rgba(234,179,8,0.4)]">★</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{HERO_STATS.trustedText}</p>
                </div>
              </div>
              
              <div className="hidden sm:block w-px h-10 bg-white/10" />
              
              <div className="flex gap-6">
                <div>
                  <h4 className="text-2xl font-black text-white font-display">50+</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Projects</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white font-display">10k+</h4>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Glass Card Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative group aspect-[4/3] w-full max-w-lg ml-auto">
              {/* Animated Glow behind card (Optimized: No blur filter) */}
              <div 
                className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-primary/30 via-brand-secondary/10 to-transparent opacity-40 group-hover:opacity-70 transition-opacity duration-700 animate-pulse"
                style={{ willChange: 'opacity' }}
              />

              {/* Card container */}
              <div className="absolute inset-0 glass-card-premium p-0 bg-black/40 overflow-hidden rounded-[2.5rem]">
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
              </div>

              {/* Floating Badges - Moved OUTSIDE the overflow-hidden container */}
              <div className="absolute -top-4 -left-6 glass-heavy px-4 py-3 rounded-2xl flex items-center gap-3 z-30 shadow-xl animate-float">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">24/7 Security</p>
                  <p className="text-[10px] text-gray-400">Raid protection active</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-4 glass-heavy px-4 py-3 rounded-2xl flex items-center gap-3 z-30 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-secondary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Hyper Automation</p>
                  <p className="text-[10px] text-gray-400">Custom bots deployed</p>
                </div>
              </div>

              {/* Dot navigation */}
              {cardData.length > 1 && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
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
