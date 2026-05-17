import { ArrowRight, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HERO_STATS } from "../constants/heroStats";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Environment } from "@react-three/drei";

const AnimatedSphere = () => {
  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere args={[1.5, 64, 64]}>
        <MeshDistortMaterial
          color="#7c3aed"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 5]} intensity={1} />
      <Environment preset="city" />
    </Float>
  );
};


const Hero = ({ settings = {} }) => {
  const navigate = useNavigate();
  const [currentBanner, setCurrentBanner] = useState(0);
  
  const banners = [
    settings.hero_banner || "/banner.png",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-brand-secondary/15 blur-[100px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
            
            <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6" dangerouslySetInnerHTML={{ __html: settings.hero_title || 'Elevate Your <br /> <span class="text-gradient">Discord Experience</span>' }} />
            
            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
              {settings.hero_subtitle || 'Professional Discord services crafted for communities, businesses, and creators. Custom bots, server setup, and ongoing support — all in one premium package.'}
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/shop')} className="btn-primary flex items-center gap-2 group">
                Shop
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/history')} className="btn-outline flex items-center gap-2 group">
                <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                Connect Us
              </button>
            </div>

            {/* User Reviews */}
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {HERO_STATS.avatars.map((url, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-brand-card overflow-hidden transition-transform hover:scale-110 hover:z-30 cursor-pointer">
                    <img 
                      src={url} 
                      alt="avatar" 
                    />
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

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            {/* Main Visual Banner & 3D Element */}
            <div className="relative group aspect-[21/9] lg:aspect-square xl:aspect-[4/3]">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="absolute inset-0 glass rounded-3xl overflow-hidden border-white/5 shadow-2xl bg-black/40">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentBanner}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 0.3, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    src={banners[currentBanner]}
                    alt="Starlit Siege Banner"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&q=80&w=1200"; }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/90 via-brand-bg/50 to-transparent z-10" />
                
                {/* 3D Canvas Overlay */}
                <div className="absolute inset-0 z-20">
                  <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                    <AnimatedSphere />
                  </Canvas>
                </div>
              </div>
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
              className="absolute -bottom-6 -right-6 glass px-4 py-2 rounded-xl flex items-center gap-2 border-white/20 z-20"
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

