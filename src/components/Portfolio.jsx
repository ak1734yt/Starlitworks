import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ArrowUpRight } from "lucide-react";
import { getPortfolio } from "../services/api";

const projects = [
  {
    title: "GameVault Bot",
    category: "Gaming",
    members: "45K members",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
    description: "Advanced gaming community bot with leaderboards, tournaments, and economy."
  },
  {
    title: "TechHub Server",
    category: "Tech",
    members: "28K members",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600",
    description: "Professional tech community with automated job listings and skill verification."
  },
  {
    title: "ArtSpace Community",
    category: "Creative",
    members: "62K members",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600",
    description: "Creative platform with portfolio showcasing, voting, and monetization features."
  }
];

const Portfolio = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getPortfolio().then(setItems).catch(console.error);
  }, []);

  const displayProjects = items.length > 0 ? items
    .filter(p => p.category !== 'community' && p.category !== 'project')
    .sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
    .map(p => ({
      title: p.title,
      category: p.category || 'Discord',
      members: p.member_count,
      image: p.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
      description: p.description,
      link: p.link,
      sort: p.sort_order
    })) : projects;
  return (
    <section id="portfolio" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            Portfolio
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold">
            Our <span className="text-gradient">Success</span> Stories
          </h2>
          <p className="mt-4 text-gray-500 max-w-lg mx-auto">
            Trusted by leading Discord communities worldwide
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {displayProjects.map((project, index) => (
            <motion.div
              key={index}
              onClick={() => project.link && window.open(project.link, '_blank')}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`glass-card p-0 overflow-hidden flex flex-col group ${project.link ? 'cursor-pointer' : ''}`}
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={project.image} 
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-bg to-transparent" />
                
                <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  {project.category}
                </div>
                
                <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-medium">
                  <Users className="w-3 h-3 text-brand-secondary" />
                  {project.members}
                </div>

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 font-display text-8xl font-black text-white/5 pointer-events-none select-none">
                  DS
                </div>
              </div>

              <div className="p-8 pt-6 flex-grow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold group-hover:text-brand-primary transition-colors">{project.title}</h3>
                  <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-brand-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {project.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
