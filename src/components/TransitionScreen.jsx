import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function TransitionScreen({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#050505' }}
        >
          {/* Banner background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/banner.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.08,
            }}
          />
          {/* Purple glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/20 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-brand-secondary/15 blur-[80px] rounded-full" />

          {/* Logo pulse */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(124,58,237,0.3)', '0 0 60px rgba(124,58,237,0.7)', '0 0 20px rgba(124,58,237,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h2 className="font-display text-3xl font-bold text-white mb-1">Starlit Siege Works</h2>
              <p className="text-brand-primary text-sm font-medium tracking-widest uppercase">Preparing your experience</p>
            </motion.div>

            {/* Progress bar */}
            <motion.div className="w-64 h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.0, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
              />
            </motion.div>
          </motion.div>

          {/* Floating orbs */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-brand-primary/40"
              initial={{ x: Math.random() * 400 - 200, y: Math.random() * 400 - 200, opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0, 1, 0], y: [0, -80] }}
              transition={{ duration: 2 + Math.random(), delay: Math.random() * 1.5, repeat: Infinity }}
              style={{ left: `${20 + Math.random() * 60}%`, top: `${30 + Math.random() * 40}%` }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
