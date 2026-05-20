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
    
    const token = localStorage.getItem('ssw_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/realtime/events?token=${encodeURIComponent(token)}`);
    
    eventSource.onopen = () => {
      setStatus('online');
    };
    
    eventSource.onerror = () => {
      setStatus('offline');
    };
    
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 px-4 py-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
          status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
        } ${status === 'online' ? 'animate-pulse' : ''}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Core Status: <span className={status === 'online' ? 'text-green-500' : status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}>{status}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-3 h-3 text-brand-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Security: Active
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Zap className="w-3 h-3 text-brand-secondary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Infrastructure: Optimal
        </span>
      </div>
    </div>
  );
}
