import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Camera, Save, Loader2, CheckCircle2, Upload, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other'];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'Singapore', 'UAE', 'Other'
];

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-all text-white placeholder:text-gray-600";
const labelCls = "flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2";

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');

  const [form, setForm] = useState({
    name:     user?.name     || '',
    phone:    user?.phone    || '',
    avatar_url: user?.avatar_url || '',
    gender:   user?.gender   || 'Prefer not to say',
    // Detailed location
    street:   '',
    city:     '',
    state:    '',
    country:  '',
    pincode:  '',
  });

  // Parse existing location string "street, city, state, pincode, country" on mount
  useState(() => {
    if (user?.location) {
      const parts = user.location.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        setForm(f => ({
          ...f,
          city:    parts[0] || '',
          state:   parts[1] || '',
          country: parts[2] || '',
          pincode: parts[3] || '',
          street:  parts[4] || '',
        }));
      }
    }
  });

  const completeness = (() => {
    let filled = 0, total = 6;
    if (form.name?.trim()) filled++;
    if (form.phone?.trim()) filled++;
    if (form.avatar_url?.trim()) filled++;
    if (form.gender && form.gender !== 'Prefer not to say') filled++;
    if (form.city?.trim()) filled++;
    if (form.country?.trim()) filled++;
    return Math.round((filled / total) * 100);
  })();

  // Handle local file pick → convert to base64 → upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setUploadingAvatar(true);
    try {
      // Preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);

      // Upload to backend
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('ssw_token');
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, avatar_url: data.url }));
        setAvatarPreview(data.url);
      } else {
        // Fallback: keep base64 preview but no server URL — store as-is
        const b64 = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
        setForm(f => ({ ...f, avatar_url: b64 }));
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Build combined location string
    const locationParts = [form.city, form.state, form.country, form.pincode, form.street]
      .filter(Boolean);
    const location = locationParts.join(', ');

    try {
      await updateProfile({ ...form, location });
      setSaved(true);
      toast.success('Profile updated!');
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

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
          className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 px-6 pt-6 pb-4 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 border-b border-white/5 backdrop-blur-xl">
            <button onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar with file picker */}
              <div className="relative shrink-0 cursor-pointer group" onClick={() => fileRef.current?.click()}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:border-brand-primary/60 transition-all">
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" onError={() => setAvatarPreview('')} />
                  ) : (
                    <span className="text-2xl font-bold text-white">{form.name?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-3 h-3 text-white" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${
                  user?.role === 'manager' ? 'bg-brand-primary/20 text-brand-primary' :
                  user?.role === 'admin'   ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'}`}>{user?.role}</span>
              </div>
            </div>

            {/* Completeness */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-gray-500 font-bold">Profile Completeness</span>
                <span className={`text-[11px] font-bold ${completeness === 100 ? 'text-green-400' : 'text-brand-primary'}`}>{completeness}%</span>
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
          <form onSubmit={handleSave} className="p-6 space-y-5">

            {/* Avatar upload hint */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 p-3 border border-dashed border-white/15 rounded-xl text-gray-500 hover:text-white hover:border-brand-primary/40 transition-all text-sm"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>{uploadingAvatar ? 'Uploading…' : avatarPreview ? 'Change profile picture' : 'Upload profile picture from device'}</span>
            </button>

            {/* Name */}
            <div>
              <label className={labelCls}><User className="w-3.5 h-3.5" /> Display Name</label>
              <input value={form.name} onChange={set('name')} required placeholder="Your full name" className={inputCls} />
            </div>

            {/* Phone + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}><Phone className="w-3.5 h-3.5" /> Phone</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select value={form.gender} onChange={set('gender')} className={inputCls + ' appearance-none cursor-pointer'}>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Detailed Location */}
            <div>
              <label className={labelCls}><MapPin className="w-3.5 h-3.5" /> Location</label>
              <div className="space-y-3">
                <input value={form.street} onChange={set('street')} placeholder="Street / Area (optional)" className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.city} onChange={set('city')} placeholder="City *" className={inputCls} />
                  <input value={form.state} onChange={set('state')} placeholder="State / Province" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.country} onChange={set('country')} className={inputCls + ' appearance-none cursor-pointer'}>
                    <option value="">Country *</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={form.pincode} onChange={set('pincode')} placeholder="PIN / ZIP code" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving   ? <Loader2 className="w-5 h-5 animate-spin" /> :
               saved    ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
               <Save className="w-5 h-5" />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
