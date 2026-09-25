import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Camera,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import Swal from 'sweetalert2';

const NAVY = 'var(--customer-navy)';
const GOLD = '#FFC107';
const TEXT_LIGHT = 'var(--customer-text)';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, when: 'beforeChildren', staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function AnimatedCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame;
    const duration = 700;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}{suffix}</>;
}

function CompletionRing({ percent, size = 128, stroke = 3.5 }) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90 pointer-events-none">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--customer-ring-track)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={GOLD}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ filter: `drop-shadow(0 0 6px ${GOLD}80)` }}
      />
    </svg>
  );
}

const FloatingField = ({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  as = 'input',
  readOnly = false,
  rows = 3,
  placeholder = ' ',
}) => {
  const [focused, setFocused] = useState(false);
  const filled = Boolean(value && String(value).length > 0);
  const active = focused || filled;

  const base = `peer w-full bg-white/[0.04] border rounded-2xl pl-12 pr-4 pt-6 pb-2.5 text-sm font-semibold outline-none transition-all duration-200`;
  const state = readOnly
    ? 'border-white/10 text-slate-500 cursor-not-allowed bg-white/[0.02]'
    : `border-white/10 text-slate-100 focus:border-[${GOLD}] focus:bg-white/[0.06] focus:shadow-[0_0_0_3.5px_rgba(255,193,7,0.14)]`;

  return (
    <div className="relative">
      <Icon
        size={15}
        className={`absolute left-4 z-10 transition-colors duration-200 ${
          as === 'textarea' ? 'top-5' : 'top-1/2 -translate-y-1/2'
        } ${focused ? 'text-amber-400' : 'text-slate-500'}`}
      />
      {as === 'textarea' ? (
        <textarea
          rows={rows}
          value={value || ''}
          readOnly={readOnly}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          className={`${base} ${state} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          readOnly={readOnly}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          className={`${base} ${state}`}
        />
      )}
      <motion.label
        initial={false}
        animate={{
          top: active ? 8 : as === 'textarea' ? 20 : '50%',
          y: active ? 0 : as === 'textarea' ? 0 : '-50%',
          fontSize: active ? '9.5px' : '13px',
          color: focused ? GOLD : '#64748B',
        }}
        transition={{ duration: 0.15 }}
        className="absolute left-12 font-black uppercase tracking-widest pointer-events-none"
      >
        {label}
      </motion.label>
    </div>
  );
};

const SubSection = ({ icon: Icon, title, subtitle, children, first = false }) => (
  <div className={`${first ? '' : 'border-t border-white/[0.06] pt-7 mt-7'}`}>
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-amber-400" />
      </div>
      <div>
        <h3 className="text-[12.5px] font-black uppercase tracking-widest" style={{ color: TEXT_LIGHT }}>{title}</h3>
        {subtitle && <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>
  </div>
);


const ProfileSettings = ({ profile, setProfile, onBack, theme = 'light' }) => {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [avatarPulse, setAvatarPulse] = useState(false);

  
  const { completeness, hasContact, hasAvatar } = useMemo(() => {
    const fields = [profile.first_name, profile.last_name, profile.phone, profile.address, profile.avatar_url];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    return {
      completeness: Math.round((filled / fields.length) * 100),
      hasContact: Boolean(profile.phone && profile.address),
      hasAvatar: Boolean(profile.avatar_url),
    };
  }, [profile.first_name, profile.last_name, profile.phone, profile.address, profile.avatar_url]);

  const initials = `${(profile.first_name || '?')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase();

  
  const notify = (title, text, icon) => {
    Swal.fire({
      title,
      text,
      icon,
      background: theme === 'light' ? '#EEF1F4' : '#0B2350',
      color: theme === 'light' ? '#0F172A' : '#F5F7FB',
      confirmButtonColor: GOLD,
      customClass: {
        popup: 'rounded-[2rem] border border-white/10 shadow-2xl font-sans',
        title: 'font-black tracking-tight',
        confirmButton: 'rounded-xl px-6 py-2 font-black uppercase text-xs tracking-widest',
      },
    });
  };

  const handleDatabaseUpdate = async (e) => {
    e.preventDefault();
    if (!profile?.id) {
      notify('Update failed', 'We could not identify your profile. Please refresh and try again.', 'error');
      return;
    }
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
          
        })
        .eq('id', profile.id);

      if (error) throw error;

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      notify('Changes saved', 'Your profile has been updated successfully.', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      notify('Update failed', 'We could not save your profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  
  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Please select a file.');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile((current) => ({ ...current, avatar_url: publicUrl }));
      setAvatarPulse(true);
      setTimeout(() => setAvatarPulse(false), 1200);
      notify('Photo updated', 'Your new profile photo is live.', 'success');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      notify('Upload failed', 'We could not upload your photo. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className="max-w-6xl mx-auto pb-24 md:pb-8 min-h-screen"
      style={{ background: 'var(--customer-page)' }}
    >
      {}
      <motion.button
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-[10px] font-black uppercase tracking-widest pt-2 px-1"
      >
        <ArrowLeft size={13} /> Profile Settings
      </motion.button>

      {}
      <motion.div
        variants={itemVariants}
        className="relative mx-1 rounded-[24px] overflow-hidden border border-white/10"
        style={{ background: 'var(--customer-header)' }}
      >
        {}
        <motion.div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{ background: `radial-gradient(600px circle at var(--x,30%) var(--y,20%), ${GOLD}22, transparent 60%)` }}
          animate={{ ['--x']: ['20%', '80%', '20%'], ['--y']: ['10%', '60%', '10%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute -top-24 -right-16 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-10 w-56 h-56 bg-amber-400/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-5 sm:px-8 py-6 sm:py-7 flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left">
          {}
          <motion.div
            className="relative shrink-0"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CompletionRing percent={completeness} size={92} stroke={3} />
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="relative w-20 h-20 m-1.5 rounded-full border-4 border-[#071A3D] bg-[#0B2350] flex items-center justify-center overflow-hidden group"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-amber-400">
                  {initials || <User size={30} className="text-slate-500" />}
                </span>
              )}

              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center"
                  >
                    <Loader2 className="text-amber-400 animate-spin" size={22} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {avatarPulse && !uploading && (
                  <motion.div
                    initial={{ opacity: 0.9, scale: 0.9 }}
                    animate={{ opacity: 0, scale: 1.25 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: GOLD }}
                  />
                )}
              </AnimatePresence>

              <label className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer">
                <motion.span whileHover={{ scale: 1.1, rotate: -6 }}>
                  <Camera size={18} className="text-white" />
                </motion.span>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Change</span>
                <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
              </label>
            </motion.div>
          </motion.div>

          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate" style={{ color: TEXT_LIGHT }}>
                {profile.first_name || profile.last_name
                  ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                  : 'Welcome'}
              </h2>
                <motion.span
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${completeness === 100 ? 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300' : 'bg-white/[0.04] border-white/10 text-slate-400'}`}
                >
                  <BadgeCheck size={11} /> Profile {completeness === 100 ? 'Complete' : 'Incomplete'}
                </motion.span>
            </div>
            <p className="text-slate-400 text-[12.5px] font-semibold truncate mt-1">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2 text-[9px] font-bold uppercase tracking-wider">
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-400">{String(profile.role || '—').replace(/_/g, ' ')}</span>
              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300"><AnimatedCounter value={completeness} suffix="% complete" /></span>
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-400">Contact {hasContact ? 'complete' : 'incomplete'}</span>
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-400">Photo {hasAvatar ? 'uploaded' : 'not set'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {}
      {}
      <form onSubmit={handleDatabaseUpdate} className="mt-4 px-1">
        <motion.div
          variants={itemVariants}
          className="rounded-[24px] border border-white/10 backdrop-blur-md p-5 sm:p-7"
          style={{ background: 'var(--customer-surface)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          <SubSection icon={User} title="Personal Information" subtitle="Your name as it appears across the account" first>
            <FloatingField
              icon={User}
              label="First name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            />
            <FloatingField
              icon={User}
              label="Last name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            />
          </SubSection>

          <SubSection icon={Phone} title="Contact & Address" subtitle="How we reach you" first>
            <FloatingField icon={Mail} label="Email (locked)" value={profile.email} readOnly />
            <FloatingField
              icon={Phone}
              label="Phone number"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
            <div className="md:col-span-2">
              <FloatingField
                icon={MapPin}
                as="textarea"
                rows={2}
                label="Street, city, region"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
          </SubSection>
          </div>

          {}
          <div className="hidden md:flex justify-end border-t border-white/[0.06] pt-5 mt-5">
            <SaveButton saving={saving} uploading={uploading} justSaved={justSaved} />
          </div>
        </motion.div>
      </form>

      {}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 backdrop-blur-xl border-t border-white/10 px-4 py-3"
        style={{ background: 'var(--customer-surface)' }}
      >
        <SaveButton
          full
          saving={saving}
          uploading={uploading}
          justSaved={justSaved}
          onClick={handleDatabaseUpdate}
        />
      </div>
    </motion.div>
  );
};

const SaveButton = ({ saving, uploading, justSaved, full = false, onClick }) => {
  const [ripples, setRipples] = useState([]);

  const spawnRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  };

  return (
    <motion.button
      type={full ? 'button' : 'submit'}
      onClick={(e) => { spawnRipple(e); onClick?.(e); }}
      disabled={saving || uploading}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: saving || uploading ? 1 : 1.015 }}
      className={`relative overflow-hidden ${
        full ? 'w-full' : 'w-full md:w-auto px-10'
      } py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-60`}
      style={{
        background: justSaved ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${GOLD}, #FFD54F)`,
        color: justSaved ? GOLD : NAVY,
        boxShadow: justSaved ? 'none' : '0 10px 30px -10px rgba(255,193,7,0.55)',
        border: justSaved ? `1px solid ${GOLD}55` : 'none',
      }}
    >
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.35, scale: 0 }}
          animate={{ opacity: 0, scale: 4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute rounded-full pointer-events-none"
          style={{ left: r.x, top: r.y, width: 20, height: 20, marginLeft: -10, marginTop: -10, background: NAVY }}
        />
      ))}

      <AnimatePresence mode="wait" initial={false}>
        {justSaved ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> Saved
          </motion.span>
        ) : (
          <motion.span
            key="save"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving…' : 'Save changes'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default ProfileSettings;
