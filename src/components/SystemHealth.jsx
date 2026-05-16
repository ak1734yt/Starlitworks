import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

export default function SystemHealth() {
  const [status, setStatus] = useState('checking');

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) setStatus('online');
      else setStatus('degraded');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
          status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
        } ${status === 'online' ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Core Status: {status}
        </span>
      </div>
      <div className="h-4 w-[1px] bg-white/10" />
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-3 h-3 text-brand-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Security: Active
        </span>
      </div>
      <div className="h-4 w-[1px] bg-white/10" />
      <div className="flex items-center gap-2">
        <Zap className="w-3 h-3 text-brand-secondary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Infrastructure: Optimal
        </span>
      </div>
    </div>
  );
}
