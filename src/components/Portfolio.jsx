import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ArrowUpRight, ArrowRight, TrendingUp, Sparkles, Activity } from "lucide-react";
import { getPortfolio } from "../services/api";

const Portfolio = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getPortfolio().then(setItems).catch(console.error);
  }, []);

  const displayProjects = items.length > 0 ? items
    .filter(p => p.category !== 'community' && p.category !== 'project' && Number(p.is_visible) !== 0)
    .sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0))
    .map(p => ({
      title: p.title,
      category: p.category || 'Discord Architecture',
      members: p.member_count,
      growth: p.growth_percentage,
      image: p.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200",
      description: p.description,
      link: p.link,
      sort: p.sort_order
    })) : [];

  return (
    <section id="portfolio" className="py-16 md:py-20 relative overflow-hidden section-transparent border-t border-white/5 bg-[#0a0a0a]/60">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <Sparkles className="w-3 h-3" /> Portfolio
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black">
              Featured <span className="text-gradient">Case Studies</span>
            </h2>
          </div>
          <p className="text-gray-400 max-w-sm leading-relaxed text-sm md:text-base">
            Explore how we've transformed ordinary servers into thriving, engaged, and highly scalable communities.
          </p>
        </div>

        <div className="relative w-full overflow-hidden mask-image-fade">
          <div className={`flex gap-10 w-max ${displayProjects.length > 3 ? 'animate-scroll hover:pause' : 'mx-auto justify-center'}`}>
            {displayProjects.length > 0 ? (displayProjects.length > 3 ? [...displayProjects, ...displayProjects] : displayProjects).map((project, index) => (
              <motion.div
                key={`${project.id || index}-${index}`}
                onClick={() => project.link && window.open(project.link, '_blank')}
                whileHover={{ y: -8 }}
                className={`glass-card-premium p-0 group ${project.link ? 'cursor-pointer' : ''} flex flex-col h-[500px] w-[450px] shrink-0`}
              >
                <div className="relative h-60 overflow-hidden rounded-t-2xl shrink-0">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-black/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />
                  
                  <div className="absolute top-6 left-6 glass-heavy px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary border border-brand-primary/20">
                    {project.category}
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <div className="flex gap-3">
                      {project.members && project.members !== '0' && (
                        <div className="glass-heavy px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white backdrop-blur-md">
                          <Users className="w-3.5 h-3.5 text-brand-secondary" />
                          {project.members}
                        </div>
                      )}
                      {project.growth && (
                        <div className="glass-heavy px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-white backdrop-blur-md">
                          <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                          +{project.growth}% Growth
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-grow bg-gradient-to-b from-brand-card to-black/40 min-h-0">
                  <div className="flex-grow overflow-hidden relative">
                    <h3 className="text-2xl font-black text-white mb-3 font-display group-hover:text-brand-primary transition-colors">{project.title}</h3>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed line-clamp-3">
                      {project.description}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                    <span className="text-sm font-bold text-brand-primary group-hover:text-white transition-colors flex items-center gap-2">
                      View Case Study <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <div className="w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] transition-all duration-300">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              // Placeholder states for when no portfolio exists
              [1, 2, 3].map((placeholder) => (
                <div key={placeholder} className="glass-card p-0 border border-white/5 overflow-hidden flex flex-col h-[500px] w-[450px] shrink-0 opacity-60">
                  <div className="h-60 bg-gradient-to-br from-white/5 to-transparent relative flex items-center justify-center">
                    <Activity className="w-12 h-12 text-white/20" />
                  </div>
                  <div className="p-8 bg-black/40 flex-grow">
                    <div className="h-6 w-1/2 bg-white/10 rounded mb-4" />
                    <div className="h-4 w-full bg-white/5 rounded mb-2" />
                    <div className="h-4 w-3/4 bg-white/5 rounded" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
