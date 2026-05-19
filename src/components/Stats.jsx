import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";

const Stats = () => {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    getPublicStats().then(setLiveStats).catch(console.error);
  }, []);

  const getVal = (stat) => {
    if (!liveStats) return stat.value;
    if (stat.key === 'member_count') {
      return (liveStats.member_count || 10000).toLocaleString() + "+";
    }
    if (stat.key === 'completed_projects') {
      if (stat.label.includes('Bot')) {
        return (liveStats.completed_projects + 15) + "+";
      }
      return (liveStats.completed_projects + 50) + "+";
    }
    if (stat.key === 'rating') {
      return "100%";
    }
    return stat.value;
  };

  return (
    <section className="py-28 border-y border-white/5 bg-[#030303] relative overflow-hidden">
      {/* Dynamic backdrop ambient glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-secondary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.3em]">Our Track Record</p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Empowering Communities at <span className="text-gradient">Scale</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col items-center p-8 bg-[#070707]/60 border border-white/5 rounded-3xl hover:border-brand-primary/25 hover:bg-[#0A0A0A] hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all duration-500 relative overflow-hidden group"
            >
              {/* Inner card spotlight */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.04),transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              {/* Floating icon */}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-[1px] mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <div className="w-full h-full bg-[#050505] rounded-[15px] flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
                </div>
              </div>
              
              {/* Metric Value */}
              <h3 className="text-3xl md:text-4xl font-black font-display text-white mb-2.5 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:drop-shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all duration-300">
                {getVal(stat)}
              </h3>
              
              {/* Description */}
              <div className="flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[9px] mb-2 group-hover:text-gray-300 transition-colors">
                  {stat.label}
                </p>
                <div className="w-6 h-[2px] bg-brand-primary/20 group-hover:w-10 group-hover:bg-brand-primary transition-all duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;

