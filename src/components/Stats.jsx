import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";

const parseValue = (valStr) => {
  if (!valStr) return { number: 0, prefix: '', suffix: '', formatComma: false };
  const str = String(valStr);
  const match = str.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const formatComma = numStr.includes(',');
    const number = parseFloat(numStr.replace(/,/g, '')) || 0;
    return { number, prefix, suffix, formatComma };
  }
  return { number: 0, prefix: '', suffix: str, formatComma: false };
};

const AnimatedNumber = ({ value }) => {
  const { number, prefix, suffix, formatComma } = parseValue(value);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = number;
    if (start === end) {
      setCurrentValue(end);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * end);
      setCurrentValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [number]);

  const formattedNum = formatComma ? currentValue.toLocaleString() : currentValue;
  return (
    <span>
      {prefix}{formattedNum}{suffix}
    </span>
  );
};


const Stats = () => {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    getPublicStats().then(setLiveStats).catch(console.error);
  }, []);

  const getVal = (stat) => {
    if (!liveStats) return stat.value;
    const key = stat.key;
    if (key === 'member_count') {
      return (liveStats.member_count || 10000).toLocaleString() + "+";
    }
    return liveStats[key] !== undefined ? liveStats[key] : stat.value;
  };

  return (
    <section className="py-24 border-y border-white/5 bg-[#030303] relative overflow-hidden">
      {/* Subtle radial glow in the center to highlight the glowing text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-64 bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-16 md:gap-x-10 lg:gap-x-12">
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center gap-3 min-w-[120px] md:min-w-[130px] group"
            >
              <stat.icon className="w-5 h-5 text-gray-500 transition-colors group-hover:text-gray-300" />
              
              <h3 
                className="text-4xl md:text-[2.75rem] font-black font-display text-white leading-none transition-all duration-300 group-hover:scale-105"
                style={{ textShadow: '0 0 25px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.2)' }}
              >
                <AnimatedNumber value={getVal(stat)} />
              </h3>
              
              <p className="text-[#888888] font-bold uppercase tracking-[0.2em] text-[9px] text-center w-full mt-1 transition-colors group-hover:text-gray-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
