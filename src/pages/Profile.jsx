import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import Navbar from '../components/Navbar';
import { User, Phone, Globe, Camera, Save, Loader2, Mail, Shield, CheckCircle2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const { user, login, setup2FA, confirm2FA, disable2FA } = useAuth();
  const [loading, setLoading] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    avatar_url: '',
    social_links: { discord: '', twitter: '', github: '' }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
        social_links: user.social_links ? (typeof user.social_links === 'string' ? JSON.parse(user.social_links) : user.social_links) : { discord: '', twitter: '', github: '' }
      });
    }
  }, [user]);

  const handleSetup2FA = async () => {
    try {
      const { qrCodeUrl, secret } = await setup2FA();
      setQrCode(qrCodeUrl);
      setTwoFactorSecret(secret);
      setConfirmStep(true);
      setShow2FAModal(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleConfirm2FA = async () => {
    try {
      await confirm2FA(twoFactorCode);
      toast.success('2FA Enabled Successfully!');
      setShow2FAModal(false);
      setConfirmStep(false);
      setTwoFactorCode('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 2FA code to disable:');
    if (!code) return;
    try {
      await disable2FA(code);
      toast.success('2FA Disabled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully!');
      // Update local context if needed or just let it refresh
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pt-32 pb-20 max-w-4xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-bold font-display">User <span className="text-gradient">Profile</span></h1>
          <p className="text-gray-500 mt-2">Manage your account details and social presence.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-12 gap-8">
          {/* Avatar Section */}
          <div className="md:col-span-4 space-y-6">
            <div className="glass-card p-8 flex flex-col items-center text-center">
              <div className="relative group w-32 h-32 mb-6">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-brand-primary/20 group-hover:border-brand-primary transition-all">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter image URL:');
                    if (url) setFormData({...formData, avatar_url: url});
                  }}
                  className="absolute bottom-0 right-0 p-2 bg-brand-primary rounded-full shadow-lg hover:scale-110 transition-all"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-lg">{user?.name}</h3>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <div className="mt-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                {user?.role}
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="md:col-span-8 space-y-6">
            <div className="glass-card p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <input 
                    type="text"
                    placeholder="+91 00000 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input 
                  type="email"
                  disabled
                  value={user?.email}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm opacity-50 cursor-not-allowed"
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-secondary" /> Social Links
                </h4>
                <div className="space-y-4">
                  {['discord', 'twitter', 'github'].map(social => (
                    <div key={social} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-gray-500 capitalize">{social}</span>
                      <input 
                        type="text"
                        placeholder={`${social} username`}
                        value={formData.social_links[social] || ''}
                        onChange={(e) => setFormData({
                          ...formData, 
                          social_links: { ...formData.social_links, [social]: e.target.value }
                        })}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-brand-primary outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-primary" /> Security & 2FA
                </h4>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Two-Factor Authentication</p>
                      <p className="text-[10px] text-gray-500 mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    {user?.two_factor_enabled ? (
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                        </span>
                        <button type="button" onClick={handleDisable2FA} className="text-xs text-red-400 hover:text-red-500 transition-colors">Disable</button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleSetup2FA}
                        className="px-4 py-2 bg-brand-primary/20 text-brand-primary border border-brand-primary/30 rounded-xl text-xs font-bold hover:bg-brand-primary hover:text-white transition-all"
                      >
                        Enable 2FA
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-primary rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Profile Changes
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* 2FA SETUP MODAL */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShow2FAModal(false)} />
            <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="relative z-10 w-full max-w-md bg-brand-card border border-brand-border rounded-3xl p-8 text-center">
              <button onClick={() => setShow2FAModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
              
              <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-brand-primary" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Enable 2FA</h2>
              <p className="text-gray-500 text-sm mb-8">Scan this QR code with Google Authenticator or Authy to get started.</p>

              {qrCode && <img src={qrCode} alt="QR Code" className="mx-auto w-48 h-48 rounded-2xl border-4 border-white mb-6" />}
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-8">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Secret Key</p>
                <code className="text-brand-primary text-sm font-mono tracking-widest">{twoFactorSecret}</code>
              </div>

              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1 mb-2 block">Enter Verification Code</label>
                  <input 
                    type="text" 
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 text-2xl text-center font-mono tracking-[0.5em] text-white focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleConfirm2FA}
                  disabled={twoFactorCode.length < 6}
                  className="w-full py-4 bg-brand-primary rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  Verify & Enable
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
