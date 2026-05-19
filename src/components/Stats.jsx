import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const scrollContainerRef = useRef(null);

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

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-12 border-y border-white/5 bg-[#030303]/60 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.3em] mb-1">Our Track Record</p>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Starlit <span className="text-gradient">Performance</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => scroll('left')}
              className="p-2 glass rounded-xl text-gray-400 hover:text-white transition-all hover:border-brand-primary/40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="p-2 glass rounded-xl text-gray-400 hover:text-white transition-all hover:border-brand-primary/40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-none pb-4 snap-x snap-mandatory touch-pan-x"
        >
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center gap-5 p-5 bg-[#070707]/80 border border-white/5 rounded-2xl hover:border-brand-primary/25 hover:bg-[#0A0A0A] transition-all duration-300 min-w-[260px] md:min-w-[280px] shrink-0 snap-start group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} p-[1px] group-hover:scale-105 transition-all duration-300 shrink-0`}>
                <div className="w-full h-full bg-[#050505] rounded-[11px] flex items-center justify-center">
                  <stat.icon className="w-7 h-7 text-white/80 group-hover:text-white transition-colors" />
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-black font-display text-white mb-0.5 tracking-tight group-hover:text-brand-primary transition-colors">
                  <AnimatedNumber value={getVal(stat)} />
                </h3>
                <p className="text-gray-500 font-bold uppercase tracking-[0.15em] text-[9px]">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
