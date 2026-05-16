import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Camera, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other'];

const fields = [
  { key: 'completeness', calc: true },
];

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
    gender: user?.gender || 'Prefer not to say',
    location: user?.location || '',
  });

  const completeness = (() => {
    const total = 5;
    let filled = 0;
    if (form.name?.trim()) filled++;
    if (form.phone?.trim()) filled++;
    if (form.avatar_url?.trim()) filled++;
    if (form.gender && form.gender !== 'Prefer not to say') filled++;
    if (form.location?.trim()) filled++;
    return Math.round((filled / total) * 100);
  })();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 border-b border-white/5">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center overflow-hidden border-2 border-white/10">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span className="text-2xl font-bold text-white">{form.name?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${
                  user?.role === 'manager' ? 'bg-brand-primary/20 text-brand-primary' :
                  user?.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>{user?.role}</span>
              </div>
            </div>

            {/* Profile Completeness */}
            <div className="mt-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-bold">Profile Completeness</span>
                <span className={`text-xs font-bold ${completeness === 100 ? 'text-green-400' : 'text-brand-primary'}`}>{completeness}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${completeness}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-8 space-y-5">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <User className="w-3.5 h-3.5" /> Display Name
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Your full name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            {/* Gender & Location row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                >
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="City, Country"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                <Camera className="w-3.5 h-3.5" /> Avatar Image URL
              </label>
              <input
                value={form.avatar_url}
                onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all font-mono text-xs"
              />
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> :
               saved ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
               <Save className="w-5 h-5" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
