import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";

const Stats = () => {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    getPublicStats().then(setLiveStats).catch(console.error);
  }, []);

  const getVal = (label, original) => {
    if (!liveStats) return original;
    if (label.includes('Client')) return liveStats.total_clients + '+';
    if (label.includes('Rating')) return liveStats.rating;
    if (label.includes('Project')) return liveStats.completed_projects + '+';
    return original;
  };
  return (
    <section className="py-24 border-y border-white/5 bg-white/[0.01] relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.03),transparent_70%)] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col items-center group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-[1px] mb-6 group-hover:scale-110 transition-transform duration-500`}>
                <div className="w-full h-full bg-brand-bg rounded-[15px] flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-white/80" />
                </div>
              </div>
              
              <h3 className="text-4xl md:text-5xl font-extrabold font-display text-white mb-3 tracking-tight">
                {getVal(stat.label, stat.value)}
              </h3>
              
              <div className="flex flex-col items-center">
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">
                  {stat.label}
                </p>
                <div className="w-8 h-[2px] bg-brand-primary/20 group-hover:w-12 transition-all duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;

