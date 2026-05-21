import { ArrowRight, Bot, Server, Sparkles, Users, ArrowUpRight, ShieldCheck, Zap, PlayCircle, Activity, Code, Rocket, Headphones, LineChart } from "lucide-react";
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
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#7c3aed]/50 bg-[#0a0a0c]/80 shadow-[0_0_15px_rgba(124,58,237,0.3)] mb-8">
              <Sparkles className="w-3 h-3 text-[#ec4899]" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                Now Available For Commissions
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] ml-1"></div>
            </div>

            {/* Main Copy */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-[1.15] mb-5 text-white tracking-tight">
              Build Discord <br className="hidden md:block" />
              <span className="text-[#a855f7]">Communities</span> <br className="hidden md:block" />
              With Starlit Siege
            </h1>

            {/* Sub-heading Banner */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-[#5865F2]/20 to-brand-primary/20 border border-[#5865F2]/30 shadow-[0_0_20px_rgba(88,101,242,0.2)] mb-8">
              <svg className="w-6 h-6 text-white" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77.7,77.7,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.33,46,96.22,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              <span className="text-white font-bold text-lg md:text-xl tracking-tight">That People Never Want to Leave.</span>
            </div>

            <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8 max-w-lg">
              Premium server architecture, custom bots, and community growth systems for creators, brands, and gaming organizations.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-[0_0_10px_rgba(124,58,237,0.2)]">
                  <ShieldCheck className="w-4 h-4 text-[#a855f7]" />
                </div>
                <span className="text-[11px] font-bold text-white">Secure & Reliable</span>
              </div>
              
              <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-secondary/20 flex items-center justify-center border border-brand-secondary/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <Zap className="w-4 h-4 text-brand-secondary" />
                </div>
                <span className="text-[11px] font-bold text-white">24/7 Support</span>
              </div>
              
              <div className="w-px h-6 bg-white/10 hidden lg:block"></div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-[0_0_10px_rgba(124,58,237,0.2)]">
                  <Rocket className="w-4 h-4 text-[#a855f7]" />
                </div>
                <span className="text-[11px] font-bold text-white">Custom Bots</span>
              </div>
              
              <div className="w-px h-6 bg-white/10 hidden lg:block"></div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-[0_0_10px_rgba(124,58,237,0.2)]">
                  <Users className="w-4 h-4 text-[#a855f7]" />
                </div>
                <span className="text-[11px] font-bold text-white">Growth Focused</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={() => navigate('/shop')} className="btn-primary flex items-center justify-center gap-2 group text-base px-8 shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                <Sparkles className="w-4 h-4" />
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/portfolio')} className="btn-secondary flex items-center justify-center gap-2 group text-base px-8">
                <PlayCircle className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                View Our Work
              </button>
            </div>

            {/* Trust Metrics */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[...HERO_STATS.avatars, "https://i.pravatar.cc/150?u=a042581f4e29026704d"].map((url, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-brand-card overflow-hidden">
                    <img src={url} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-300 mb-0.5">Trusted by <span className="font-bold text-white">9,843+</span> communities worldwide</p>
                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
                  24/7 Expert Support • 99.9% Uptime
                </p>
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

              {/* Orbital Rings Background */}
              <div className="absolute -inset-[50%] animate-[spin_40s_linear_infinite] pointer-events-none opacity-40 z-0">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-brand-primary/30" fill="none" strokeWidth="0.2">
                  <ellipse cx="50" cy="50" rx="45" ry="15" transform="rotate(30 50 50)" />
                  <ellipse cx="50" cy="50" rx="45" ry="15" transform="rotate(-30 50 50)" />
                </svg>
              </div>

              {/* Card container */}
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
              </div>

              {/* Floating Badges */}
              <div className="absolute -top-6 left-4 glass-heavy px-4 py-3 rounded-2xl flex items-center gap-3 z-30 shadow-[0_0_20px_rgba(124,58,237,0.2)] animate-float border border-brand-primary/30 bg-[#0a0a0c]/80 backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">24/7 Security</p>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  </div>
                  <p className="text-[10px] text-gray-400">Real-time protection</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-4 glass-heavy px-4 py-3 rounded-2xl flex items-center gap-3 z-30 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-float border border-brand-secondary/30 bg-[#0a0a0c]/80 backdrop-blur-xl" style={{ animationDelay: '1s' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-secondary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-brand-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Hyper Automation</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-2">
                    Custom bots deployed
                    <Activity className="w-3 h-3 text-brand-secondary" />
                  </p>
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

        {/* Bottom Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20"
        >
          <div className="glass-stats-bar">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <Bot className="w-6 h-6 text-brand-primary" />
                <div>
                  <h4 className="text-xl font-bold text-white">10+</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bots Developed</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Server className="w-6 h-6 text-brand-secondary" />
                <div>
                  <h4 className="text-xl font-bold text-white">20+</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Servers Built</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Users className="w-6 h-6 text-brand-accent" />
                <div>
                  <h4 className="text-xl font-bold text-white">9,843+</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Users</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Code className="w-6 h-6 text-teal-400" />
                <div>
                  <h4 className="text-xl font-bold text-white">900+</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Commands Written</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Rocket className="w-6 h-6 text-purple-400" />
                <div>
                  <h4 className="text-xl font-bold text-white">50+</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Projects Delivered</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <div>
                  <h4 className="text-xl font-bold text-white">99.9%</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Uptime</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Headphones className="w-6 h-6 text-pink-400" />
                <div>
                  <h4 className="text-xl font-bold text-white">24/7</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Expert Support</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
