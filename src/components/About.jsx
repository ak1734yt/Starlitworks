import { ExternalLink, Globe, Server, Code, User } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getPortfolio } from "../services/api";

const About = ({ settings = {} }) => {
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => {
    getPortfolio().then(setPortfolio).catch(console.error);
  }, []);

  const items = Array.isArray(portfolio) ? portfolio : [];

  const upgradedServers = items.filter(p => p.category === 'community').map(p => ({
    name: p.title,
    link: p.link,
    members: p.member_count,
    focus: p.description
  }));

  const customProjects = items.filter(p => p.category === 'project').map(p => ({
    title: p.title,
    tech: p.member_count,
    desc: p.description
  }));

  // Fallbacks if database is empty
  const defaultServers = [
    { name: "Cozy Clouds", link: "https://discord.gg/cozyclouds", members: "1.5k+", focus: "Chill, Socialize and fun" },
    { name: "Tech Support Hub", link: "https://discord.gg/example2", members: "8k+", focus: "Tech & Utility" },
  ];

  const defaultProjects = [
    { title: "Advanced Invoice Pro", tech: "React, Node.js, SQLite", desc: "Automated billing system with installment tracking and PDF generation." },
    { title: "Event Util Script", tech: "python,  SQLite", desc: "Event utility Advance script" },
  ];

  const finalServers = upgradedServers.length > 0 ? upgradedServers : defaultServers;
  const finalProjects = customProjects.length > 0 ? customProjects : defaultProjects;

  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-6 text-brand-primary">
              <User className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">About Me</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6" dangerouslySetInnerHTML={{ __html: settings.about_title || 'The Architect Behind <span class="text-gradient">Premium Communities</span>' }} />
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              {settings.about_bio || 'I specialize in building high-performance Discord environments that combine security, automation, and engagement. With years of experience in bot development and server architecture, I transform basic channels into thriving professional ecosystems.'}
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div className="glass-card p-6">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center mb-4">
                  <Server className="w-5 h-5 text-brand-primary" />
                </div>
                <h4 className="font-bold mb-2">Server Architect</h4>
                <p className="text-sm text-gray-500">{settings.architect_desc || 'Optimized role hierarchy, security hardening, and engagement systems.'}</p>
              </div>
              <div className="glass-card p-6">
                <div className="w-10 h-10 rounded-lg bg-brand-secondary/10 flex items-center justify-center mb-4">
                  <Code className="w-5 h-5 text-brand-secondary" />
                </div>
                <h4 className="font-bold mb-2">Bot Developer</h4>
                <p className="text-sm text-gray-500">{settings.dev_desc || 'Custom solutions for economy, moderation, and specialized automation.'}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-primary" />
                Upgraded Communities
              </h3>
              <div className="space-y-4">
                {finalServers.map((server, index) => (
                  <a 
                    key={index}
                    href={server.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card p-4 flex items-center justify-between group hover:border-brand-primary/50 transition-all"
                  >
                    <div>
                      <h4 className="font-bold text-sm group-hover:text-brand-primary transition-colors">{server.name}</h4>
                      <p className="text-xs text-gray-500">{server.focus} {server.members ? `• ${server.members} members` : ''}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-brand-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Code className="w-5 h-5 text-brand-secondary" />
                Custom Builds
              </h3>
              <div className="space-y-4">
                {finalProjects.map((project, index) => (
                  <div key={index} className="glass-card p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold">{project.title}</h4>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">{project.tech}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{project.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
