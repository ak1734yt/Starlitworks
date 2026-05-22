import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { STATS_DATA } from "../constants/statsData";
import { getPublicStats } from "../services/api";

const parseValue = (valStr) => {
  if (!valStr) return { number: 0, prefix: '', suffix: '', formatComma: false, isStatic: true };
  const str = String(valStr);
  
  // Don't animate things like 24/7 or 24x7
  if (str.includes('/') || str.toLowerCase().includes('x')) {
    return { number: 0, prefix: '', suffix: str, formatComma: false, isStatic: true };
  }

  const match = str.match(/^([^\d]*)([\\d,.]+)([^\d]*)$/);
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

const AnimatedNumber = ({ value, inView }) => {
  const { number, prefix, suffix, formatComma } = parseValue(value);
  const [currentValue, setCurrentValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    let start = 0;
    const end = number;
    if (start === end) {
      setCurrentValue(end);
      return;
    }

    const duration = 2000;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic for premium feel
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * end);
      setCurrentValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(end);
      }
    };

    requestAnimationFrame(animate);
  }, [number, inView]);

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
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    getPublicStats().then(setLiveStats).catch(console.error);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
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
    <section ref={sectionRef} className="py-16 md:py-20 relative overflow-hidden section-transparent" style={{ background: 'linear-gradient(180deg, rgba(3,3,5,0.7) 0%, rgba(5,5,8,0.7) 50%, rgba(3,3,5,0.7) 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-brand-primary/[0.04] rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-[1300px] mx-auto px-6 relative z-10 w-full">
        {/* Premium Glass Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
          className="glass-stats-container px-8 py-10 md:px-12 md:py-14"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-10">
            {STATS_DATA.filter((_, i) => i < 7).map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.5 }}
                viewport={{ once: true }}
                className="flex flex-col items-center justify-center gap-3 group relative"
              >
                {/* Hover glow background */}
                <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/[0.03] rounded-2xl transition-all duration-500 -m-2" />
                
                {/* Icon */}
                <div className="relative">
                  <stat.icon className="w-5 h-5 text-gray-600 group-hover:text-brand-primary transition-all duration-500 relative z-10" />
                  <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 rounded-full blur-xl transition-all duration-500 scale-[3]" />
                </div>
                
                {/* Number */}
                <h3 
                  className="text-3xl md:text-4xl lg:text-[2.5rem] font-black font-display text-white leading-none whitespace-nowrap relative z-10 transition-all duration-500"
                  style={{ 
                    textShadow: '0 0 20px rgba(255,255,255,0.25), 0 0 40px rgba(124,58,237,0.1)'
                  }}
                >
                  <AnimatedNumber value={getVal(stat)} inView={inView} />
                </h3>
                
                {/* Label */}
                <p className="text-gray-600 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px] text-center w-full relative z-10 group-hover:text-gray-400 transition-colors duration-500">
                  {stat.label}
                </p>

                {/* Right-side divider (except last item) */}
                {index < 6 && (
                  <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent hidden lg:block" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Stats;
