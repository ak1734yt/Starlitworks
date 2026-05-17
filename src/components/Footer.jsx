import { Link } from 'react-router-dom';
import { Shield, Mail, Globe, GitBranch, Heart } from 'lucide-react';
import ORG from '../constants/orgData';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-16 pb-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-32 bg-brand-primary/20 blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 relative z-10">
          
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-brand-primary" />
              <span className="font-display font-bold text-xl tracking-tight text-white">{ORG.name}</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Premium Discord architecture and bot development. Elevating communities through scalable infrastructure and modern design.
            </p>
            <div className="flex gap-4 pt-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-primary transition-all">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-primary transition-all">
                <GitBranch className="w-4 h-4" />
              </a>
              <a href={`mailto:${ORG.emails[0]}`} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-primary transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Home</Link></li>
              <li><Link to="/shop" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Services</Link></li>
              <li><Link to="/about" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">About Us</Link></li>
              <li><Link to="/history" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Client Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/tos" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/tos" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/tos" className="text-sm text-gray-400 hover:text-brand-primary transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/5 text-xs text-gray-500 font-medium">
          <p>© {new Date().getFullYear()} {ORG.name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for the community
          </p>
        </div>
      </div>
    </footer>
  );
}
