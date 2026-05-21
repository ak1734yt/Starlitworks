import { ArrowRight, Play, Bot, Server, Sparkles, Users, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_STATS } from "../constants/heroStats";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

const Hero = ({ settings = {} }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [cardData, setCardData] = useState([]);

  useEffect(() => {
    fetch('/api/prices').then(r => r.json()).then(data => setProducts(data)).catch(() => {});
    fetch('/api/portfolio').then(r => r.json()).then(data => setPortfolio(data)).catch(() => {});
  }, []);

  // Build carousel slides: banner + up to 4 portfolio cards
  useEffect(() => {
    const slides = [{ type: 'banner' }];

    const featuredPortfolio = portfolio.slice(0, 4);
    featuredPortfolio.forEach(p => slides.push({ type: 'portfolio', data: p }));

    setCardData(slides);
  }, [portfolio]);

  // Auto-rotate every 3.5s
  useEffect(() => {
    if (cardData.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % cardData.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [cardData.length]);

  const ShopCard = ({ product }) => (
    <div
      className="absolute inset-0 flex flex-col justify-between p-8 cursor-pointer"
      onClick={() => navigate('/shop')}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-brand-primary/5 to-transparent rounded-3xl" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-4">
          <Sparkles className="w-3 h-3" />
          {product.category === 'bot' ? 'Bot Package' : 'Server Package'}
        </div>
        <h3 className="text-2xl font-display font-black text-white leading-tight mb-2">{product.name}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
      </div>
      <div className="relative z-10">
        <div className="flex items-end justify-between">
          <div>
            {product.is_manual_price ? (
              <span className="text-lg font-bold text-brand-primary">Custom Quote</span>
            ) : (
              <div>
                <span className="text-3xl font-display font-black text-white">₹{product.price?.toLocaleString()}</span>
                {product.unit_label && <span className="text-gray-500 text-sm ml-1">{product.unit_label}</span>}
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary rounded-xl text-sm font-bold text-white hover:bg-brand-primary/90 transition-all group shadow-lg shadow-brand-primary/20">
            Select <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        {product.features && product.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {(Array.isArray(product.features) ? product.features : []).slice(0, 3).map((f, i) => (
              <span key={i} className="text-[10px] text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const PortfolioCard = ({ project }) => (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl cursor-pointer group"
      onClick={() => project.link && window.open(project.link, '_blank')}
    >
      {project.banner_url ? (
        <img
          src={project.banner_url}
          alt={project.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/20 to-brand-primary/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary">
        {project.category || 'Portfolio'}
      </div>
      {project.member_count && (
        <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-medium">
          <Users className="w-3 h-3 text-brand-secondary" />{project.member_count}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-display font-black text-white mb-1">{project.title}</h3>
            <p className="text-sm text-gray-300 line-clamp-1">{project.description}</p>
          </div>
          <div className="ml-4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-brand-primary group-hover:border-brand-primary transition-all">
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
        className="absolute inset-0 w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-500"
        onError={(e) => { e.target.src = "/banner.png"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/95 via-brand-bg/20 to-transparent" />
    </div>
  );

  const currentSlide = cardData[activeSlide];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-brand-secondary/15 blur-[100px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-6">
              <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
              <span className="text-xs font-medium text-brand-primary uppercase tracking-wider">
                {settings.hero_status_text || 'Now Available for Commissions'}
              </span>
            </div>

            <h1
              className="font-display text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6"
              dangerouslySetInnerHTML={{ __html: settings.hero_title || 'Elevate Your <br /> <span class="text-gradient">Discord Experience</span> <br /> <span class="text-3xl md:text-5xl text-white">By Starlit Siege</span>' }}
            />

            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
              {settings.hero_subtitle || 'Transform your Discord server into a powerful, engaging, and professional community hub with Starlit Siege. We specialize in premium Discord server design, advanced bot systems, community management, and creator-focused solutions tailored for streamers, YouTubers, gaming brands, businesses, and online communities. From custom Discord server setups to scalable community infrastructure, our services are built to help creators grow faster, improve member engagement, and establish a strong digital presence in 2026.'}
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/templates')} className="btn-primary flex items-center gap-2 group">
                Explore Templates
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/portfolio')} className="btn-outline flex items-center gap-2 group">
                <Sparkles className="w-4 h-4" />
                Our Work
              </button>
            </div>

            {/* User Reviews */}
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {HERO_STATS.avatars.map((url, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-brand-card overflow-hidden transition-transform hover:scale-110 hover:z-30 cursor-pointer">
                    <img src={url} alt="avatar" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-1 mb-0.5">
                  {[...Array(Math.floor(HERO_STATS.rating))].map((_, i) => (
                    <span key={i} className="text-yellow-500 text-xs drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]">★</span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{HERO_STATS.trustedText}</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Animated Card Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative group aspect-[21/9] lg:aspect-square xl:aspect-[4/3]">
              {/* Glow ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />

              {/* Card container */}
              <div className="absolute inset-0 glass rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-black/60">
                <AnimatePresence mode="wait">
                  {currentSlide && (
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                      className="absolute inset-0"
                    >
                      {currentSlide.type === 'banner' && <BannerCard />}
                      {currentSlide.type === 'shop' && <ShopCard product={currentSlide.data} />}
                      {currentSlide.type === 'portfolio' && <PortfolioCard project={currentSlide.data} />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Slide type label */}
                {currentSlide && currentSlide.type !== 'banner' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="glass px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                      {currentSlide.type === 'shop' ? (
                        <><Server className="w-2.5 h-2.5" /> Service Preview</>
                      ) : (
                        <><Sparkles className="w-2.5 h-2.5" /> Portfolio</>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dot navigation */}
              {cardData.length > 1 && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {cardData.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeSlide
                          ? 'w-6 bg-brand-primary'
                          : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Floating Badges */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 glass px-4 py-2 rounded-xl flex items-center gap-2 border-white/20 z-20"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-sm font-semibold">{settings.hero_badge_live || 'Live Events'}</span>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 -right-6 glass px-4 py-2 rounded-xl flex items-center gap-2 border-white/20 z-20"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-sm font-semibold">{settings.hero_badge_secure || 'Secure Hosting'}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
