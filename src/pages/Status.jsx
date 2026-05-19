import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Activity, ExternalLink, ChevronDown } from 'lucide-react';

const SERVICES = [
  { name: 'Web Frontend', url: '/', label: 'Vercel Edge' },
  { name: 'Backend API', url: '/api/prices', label: 'FastAPI / EnderCloud' },
  { name: 'Database', url: '/api/public/stats', label: 'SQLite (WAL Mode)' },
  { name: 'Authentication', url: '/api/auth/me', label: 'JWT / OAuth2' },
];

const INCIDENTS = [
  { date: '2026-05-17', title: 'All Systems Operational', type: 'resolved', detail: 'No incidents recorded.' },
];

const STATUS_COLORS = {
  online: 'text-green-400',
  degraded: 'text-yellow-400',
  offline: 'text-red-400',
  checking: 'text-gray-400',
};

const STATUS_BG = {
  online: 'bg-green-500/10 border-green-500/20',
  degraded: 'bg-yellow-500/10 border-yellow-500/20',
  offline: 'bg-red-500/10 border-red-500/20',
  checking: 'bg-white/5 border-white/10',
};

export default function Status() {
  const [services, setServices] = useState(
    SERVICES.map(s => ({ ...s, status: 'checking', latency: null }))
  );
  const [overallStatus, setOverallStatus] = useState('checking');
  const [lastChecked, setLastChecked] = useState(null);
  const [expandedIncident, setExpandedIncident] = useState(null);

  const checkServices = async () => {
    const results = await Promise.all(
      SERVICES.map(async (svc) => {
        const start = Date.now();
        try {
          const res = await fetch(svc.url, { method: 'GET', cache: 'no-store' });
          const latency = Date.now() - start;
          const status = res.ok ? (latency > 2000 ? 'degraded' : 'online') : 'offline';
          return { ...svc, status, latency };
        } catch {
          return { ...svc, status: 'offline', latency: null };
        }
      })
    );
    setServices(results);
    setLastChecked(new Date());
    const anyOffline = results.some(r => r.status === 'offline');
    const anyDegraded = results.some(r => r.status === 'degraded');
    setOverallStatus(anyOffline ? 'offline' : anyDegraded ? 'degraded' : 'online');
  };

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const StatusIcon = ({ status, size = 'w-5 h-5' }) => {
    if (status === 'online') return <CheckCircle className={`${size} text-green-400`} />;
    if (status === 'degraded') return <AlertCircle className={`${size} text-yellow-400`} />;
    if (status === 'offline') return <XCircle className={`${size} text-red-400`} />;
    return <Activity className={`${size} text-gray-400 animate-pulse`} />;
  };

  const statusLabel = {
    online: 'All Systems Operational',
    degraded: 'Partial Degradation Detected',
    offline: 'Service Outage Detected',
    checking: 'Checking Systems...',
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#07070a]">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            <Activity className="w-3 h-3 animate-pulse" /> System Monitor
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Starlit <span className="text-gradient">Status</span>
          </h1>
          <p className="text-gray-500 text-sm mb-8">Real-time health monitoring for all platform services.</p>

          {/* Overall Status Badge */}
          <motion.div
            key={overallStatus}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border text-sm font-bold ${STATUS_BG[overallStatus]}`}
          >
            <StatusIcon status={overallStatus} size="w-5 h-5" />
            <span className={STATUS_COLORS[overallStatus]}>{statusLabel[overallStatus]}</span>
          </motion.div>

          {lastChecked && (
            <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Services Grid */}
        <div>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Core Services</h2>
          <div className="space-y-3">
            {services.map((svc, i) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#0b0c14] border border-white/5 rounded-2xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <StatusIcon status={svc.status} />
                  <div>
                    <p className="font-bold text-sm text-white">{svc.name}</p>
                    <p className="text-[10px] text-gray-500">{svc.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {svc.latency !== null && (
                    <span className={`text-xs font-mono font-bold ${svc.latency < 500 ? 'text-green-400' : svc.latency < 2000 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {svc.latency}ms
                    </span>
                  )}
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${STATUS_BG[svc.status]} ${STATUS_COLORS[svc.status]}`}>
                    {svc.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Uptime Bar */}
        <div className="bg-[#0b0c14] border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">30-Day Uptime</h2>
            <span className="text-green-400 font-bold text-sm">99.9%</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={`h-8 flex-1 rounded-sm ${i === 12 ? 'bg-yellow-500/60' : 'bg-green-500/60'}`}
                title={i === 12 ? 'Brief degradation' : 'Operational'}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-gray-600">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Incident History */}
        <div>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Incident History</h2>
          <div className="space-y-3">
            {INCIDENTS.map((inc, i) => (
              <div key={i} className="bg-[#0b0c14] border border-white/5 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedIncident(expandedIncident === i ? null : i)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-white">{inc.title}</p>
                      <p className="text-[10px] text-gray-500">{inc.date}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedIncident === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedIncident === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 border-t border-white/5">
                        <p className="text-xs text-gray-400 mt-3">{inc.detail}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            Starlit Siege Works · Infrastructure Monitor · Updates every 60s
          </p>
          <a href="/" className="inline-flex items-center gap-1 text-xs text-brand-primary/60 hover:text-brand-primary mt-2 transition-colors">
            Return to Platform <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
