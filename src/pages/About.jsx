import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import AboutComponent from "../components/About";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSiteSettings } from "../services/api";
import { Loader2, ArrowRight, ShieldCheck, Zap, Heart } from "lucide-react";

export default function About() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSiteSettings()
      .then(setSettings)
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      
      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold font-display mb-6">
              Our <span className="text-gradient">Mission</span> & Vision
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Starlit Siege Works was founded with a single goal: to bridge the gap between technical complexity and user-centric design in the Discord ecosystem.
            </p>
          </motion.div>
        </div>

        {/* The Core Component */}
        <AboutComponent settings={settings} />

        {/* Values Section */}
        <section className="py-24 border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-display">Why Choose <span className="text-brand-primary">SSW?</span></h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="glass-card p-8 hover:border-brand-primary/30 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-brand-primary" />
                </div>
                <h4 className="text-xl font-bold mb-4">Security First</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Every line of code and every role permission is audited for maximum security against raids, nukes, and social engineering.
                </p>
              </div>

              <div className="glass-card p-8 hover:border-brand-secondary/30 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-brand-secondary" />
                </div>
                <h4 className="text-xl font-bold mb-4">Hyper Automation</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We believe in working smarter. Our automation systems handle the mundane so you can focus on building your community.
                </p>
              </div>

              <div className="glass-card p-8 hover:border-brand-primary/30 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6">
                  <Heart className="w-6 h-6 text-brand-primary" />
                </div>
                <h4 className="text-xl font-bold mb-4">Community Focused</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  At the end of the day, it's about the people. We design interfaces that encourage positive interaction and long-term retention.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 text-gray-300 space-y-12">
            <article>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-6">Elevate Your Discord Experience With <span className="text-gradient">Starlit Siege</span></h2>
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
                    <ShieldCheck className="w-5 h-5 text-brand-primary" />
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

        {/* CTA */}
        <div className="max-w-4xl mx-auto px-6 mt-24">
          <div className="glass-card p-12 text-center bg-gradient-to-br from-brand-primary/10 to-transparent border-brand-primary/20">
            <h2 className="text-3xl font-bold mb-6">Ready to upgrade your community?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">Join the ranks of high-performance servers powered by Starlit Siege Works technology.</p>
            <button 
              onClick={() => navigate('/shop')}
              className="btn-primary px-8 py-4 flex items-center gap-2 mx-auto"
            >
              Get Started Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
