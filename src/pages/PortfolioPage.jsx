import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowUpRight, X, ExternalLink, Filter, Search, Sparkles } from 'lucide-react';
import { getPortfolio } from '../services/api';
import Navbar from '../components/Navbar';

export default function PortfolioPage() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeTab, setActiveTab] = useState('server'); // 'server' or 'bot'
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortfolio()
      .then(data => {
        setItems(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = items;
    // Filter by tab
    if (activeTab === 'server') {
      result = result.filter(p => {
        const cat = (p.category || '').toLowerCase();
        return cat.includes('server') || cat.includes('event');
      });
    } else {
      result = result.filter(p => {
        const cat = (p.category || '').toLowerCase();
        return !cat.includes('server') && !cat.includes('event');
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [activeTab, search, items]);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Navbar />
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3 h-3 animate-pulse" /> Our Work
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-gradient">Portfolio</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Explore the premium Discord servers and custom automation bots we've crafted.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between">
          {/* Category Tabs */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('server')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'server'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Server Developed
            </button>
            <button
              onClick={() => setActiveTab('bot')}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'bot'
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bot Developed
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-primary transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-72 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No projects match your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project, index) => (
              <motion.div
                key={project.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ y: -6, scale: 1.01 }}
                onClick={() => setSelected(project)}
                className="glass-card p-0 overflow-hidden flex flex-col group cursor-pointer"
              >
                <div className="relative h-52 overflow-hidden bg-brand-primary/5">
                  {project.banner_url ? (
                    <img
                      src={project.banner_url}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-primary/20 to-brand-secondary/10 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-brand-primary/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/20 to-transparent" />
                  <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    {project.category || 'Custom'}
                  </div>
                  {project.member_count && (
                    <div className="absolute top-4 right-4 glass px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-medium">
                      <Users className="w-3 h-3 text-brand-secondary" />
                      {project.member_count}
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold group-hover:text-brand-primary transition-colors">{project.title}</h3>
                    <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-brand-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{project.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Project Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a0a12] border border-white/10 rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl"
            >
              {/* Image */}
              <div className="relative h-56 bg-brand-primary/5">
                {selected.banner_url ? (
                  <img src={selected.banner_url} alt={selected.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-primary/20 to-brand-secondary/10 flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-brand-primary/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[10px] text-brand-primary font-black uppercase tracking-widest mb-1">{selected.category}</div>
                    <h2 className="text-2xl font-display font-black text-white">{selected.title}</h2>
                  </div>
                  {selected.member_count && (
                    <div className="flex items-center gap-2 glass px-3 py-2 rounded-xl text-xs font-bold text-gray-300">
                      <Users className="w-4 h-4 text-brand-secondary" />
                      {selected.member_count}
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{selected.description}</p>
                <div className="flex gap-3">
                  {selected.link && (
                    <a
                      href={selected.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary rounded-xl text-sm font-bold text-white hover:bg-brand-primary/90 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Visit Server
                    </a>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
