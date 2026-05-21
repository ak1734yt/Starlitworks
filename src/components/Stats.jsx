import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";

const parseValue = (valStr) => {
  if (!valStr) return { number: 0, prefix: '', suffix: '', formatComma: false, isStatic: true };
  const str = String(valStr);
  
  // Don't animate things like 24/7 or 24x7
  if (str.includes('/') || str.toLowerCase().includes('x')) {
    return { number: 0, prefix: '', suffix: str, formatComma: false, isStatic: true };
  }

  const match = str.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const formatComma = numStr.includes(',');
    const number = parseFloat(numStr.replace(/,/g, '')) || 0;
    return { number, prefix, suffix, formatComma, isStatic: false };
  }
  return { number: 0, prefix: '', suffix: str, formatComma: false, isStatic: true };
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
  
  if (parseValue(value).isStatic) {
    return <span>{value}</span>;
  }

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
    <section className="py-20 bg-black relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 relative z-10 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-12 justify-items-center w-full">
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center gap-3 w-full group"
            >
              <stat.icon className="w-5 h-5 text-gray-500 transition-colors group-hover:text-gray-300" />
              <h3 
                className="text-3xl md:text-4xl lg:text-[2.5rem] xl:text-[2.75rem] font-black font-display text-white leading-none transition-all duration-300 group-hover:scale-105 whitespace-nowrap"
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
