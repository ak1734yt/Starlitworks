import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const prevIdsRef = useRef(new Set());

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('ssw_token');
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // Trigger browser notification for new items if in background
        const unread = data.filter(n => !n.is_read);
        unread.forEach(n => {
          if (!prevIdsRef.current.has(n.id)) {
            if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
              new Notification(n.title, { body: n.message, icon: '/favicon.ico' });
            }
          }
        });
        
        // Update seen IDs
        data.forEach(n => prevIdsRef.current.add(n.id));
        
        setNotifications(data);
        setUnreadCount(unread.length);
      } else if (res.status === 401) {
        // Token expired/invalid — stop polling to avoid log spam
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (e) { console.error(e); }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('ssw_token');
      if (!token) return;
      await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    fetchNotifications();
    
    // Fallback to simple polling (every 10s) to avoid Vercel edge disconnections
    intervalRef.current = setInterval(fetchNotifications, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleNotificationClick = (n) => {
    setIsOpen(false);
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    
    if (title.includes('template') || msg.includes('template')) {
      navigate('/templates');
    } else if (
      title.includes('order') || 
      msg.includes('order') || 
      title.includes('vault') || 
      msg.includes('vault') || 
      title.includes('invoice') || 
      msg.includes('invoice')
    ) {
      navigate('/history');
    } else {
      navigate('/profile');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-brand-primary" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAsRead(); }}
        className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-brand-primary animate-pulse' : 'text-gray-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-secondary text-[10px] font-black rounded-full flex items-center justify-center text-white shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-brand-card border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h4 className="font-bold text-sm">Notifications</h4>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{notifications.length} Total</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`p-4 border-b border-white/5 hover:bg-white/10 cursor-pointer transition-all flex gap-3 ${!n.is_read ? 'bg-brand-primary/5' : ''}`}
                    >
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-white mb-0.5">{n.title}</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] text-gray-600 mt-2">{new Date(n.created_at * 1000).toLocaleString()}</p>
                      </div>
                      {!n.is_read && <div className="w-1.5 h-1.5 bg-brand-primary rounded-full mt-2 shrink-0" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
