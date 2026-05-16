import { Shield, Zap, Headphones, TrendingUp, Cpu, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime guarantee for all our deployed bots.",
    color: "text-blue-400",
    bg: "bg-blue-400/10"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimised infrastructure for peak performance and zero latency responses.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10"
  },
  {
    icon: Cpu,
    title: "Custom Scalability",
    description: "Infrastructure that grows with your community, from 100 to 1M+ members.",
    color: "text-purple-400",
    bg: "bg-purple-400/10"
  },
  {
    icon: BarChart3,
    title: "Real-time Tracking",
    description: "Advanced analytics dashboard to monitor your server's growth and health.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10"
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Round-the-clock expert assistance for your needs and emergency fixes.",
    color: "text-green-400",
    bg: "bg-green-400/10"
  },
  {
    icon: TrendingUp,
    title: "Proven Results",
    description: "Track record of 500+ successful server launches and satisfied communities.",
    color: "text-pink-400",
    bg: "bg-pink-400/10"
  }
];

const Features = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-brand-primary font-bold tracking-[0.2em] uppercase text-xs mb-4"
          >
            Why Choose Us
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl font-bold"
          >
            Built for <span className="text-gradient">Excellence</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              viewport={{ once: true }}
              className="glass-card group p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-8 group-hover:rotate-[360deg] transition-transform duration-1000`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-400 text-base leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
