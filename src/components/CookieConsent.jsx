import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, Info, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('ssw_cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = async () => {
    localStorage.setItem('ssw_cookie_consent', 'true');
    setShow(false);
    
    try {
      // 1. Precise Geolocation (Vaibhav Logic)
      const getCoords = () => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => resolve({ lat: null, lon: null, accuracy: null }),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      const coords = await getCoords();

      // 2. Gather System & Device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        referrer: document.referrer,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // 3. Fetch Network location
      const geoRes = await fetch('https://ipapi.co/json/');
      const geoData = await geoRes.json();

      const trackingData = {
        ...deviceInfo,
        ...coords,
        ip: geoData.ip,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country_name,
        org: geoData.org
      };

      // 4. Securely shift data to the 'Vaibhav' handler on backend
      const token = localStorage.getItem('ssw_token');
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(trackingData)
      });

      toast.success('Preferences saved. Experience optimized.');
    } catch (err) {
      console.error('Tracking failed:', err);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="w-full max-w-md"
          >
          <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-brand-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Privacy & Optimization
                  <span className="px-2 py-0.5 bg-brand-primary/20 text-brand-primary text-[10px] rounded-full font-black uppercase tracking-tighter">Required</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  We use cookies and metadata to optimize your dashboard experience, provide secure session management, and protect your account from unauthorized access.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button 
                onClick={handleAccept}
                className="flex-1 btn-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Accept & Continue
              </button>
              <button 
                onClick={() => setShow(false)}
                className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
              >
                <X className="w-4 h-4 text-gray-500 group-hover:text-white" />
              </button>
            </div>
            
            <p className="mt-4 text-[10px] text-gray-600 text-center">
              By clicking accept, you agree to our security tracking and session storage policies.
            </p>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
