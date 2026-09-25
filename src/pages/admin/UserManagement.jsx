import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Users, Search, Trash2, ShieldCheck, UserCog,
  Download, Plus, Loader2, Mail, X, Edit3, Briefcase,
  ChevronDown, ChevronRight, ChevronLeft, Filter, RefreshCw, Eye, MoreVertical,
  CheckCircle2, AlertCircle, AlertTriangle, UserCheck, Clock, Shield,
  ArrowUpDown, TrendingUp, Hash, Calendar, User, Lock, Sparkles,
  Check, Wallet, Crown, Wrench, Building2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';

const T = {
  bg:        '#050D10',
  ink:       '#08191D',
  ink2:      '#030B0D',
  ink3:      '#0C2B30',
  surface:   'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',
  border:    'rgba(232,176,0,0.12)',
  borderHi:  'rgba(232,176,0,0.32)',
  gold:      '#E8B000',
  goldLight: '#F7C948',
  goldSoft:  'rgba(232,176,0,0.10)',
  goldLine:  'rgba(232,176,0,0.22)',
  text:      '#F4F8F9',
  sub:       '#7E9CA1',
  success:   '#22C55E',
  danger:    '#EF4444',
  info:      '#3B82F6',
  warn:      '#F59E0B',
};

const ROLES = [
  { value: 'all',        label: 'All Roles',  icon: <Users size={12} />,      color: T.sub },
  { value: 'customer',   label: 'Customer',   icon: <User size={12} />,       color: T.info },
  { value: 'technician', label: 'Technician', icon: <Wrench size={12} />,     color: T.success },
  { value: 'manager',    label: 'Manager',    icon: <Briefcase size={12} />,  color: T.gold },
  { value: 'cashier',    label: 'Cashier',    icon: <Wallet size={12} />,     color: '#8B5CF6' },
  { value: 'admin',      label: 'Admin',      icon: <Crown size={12} />,      color: T.danger },
];

const roleMeta = (role) => ROLES.find(r => r.value === role) || ROLES[1];

const EMPTY_NEW  = { email: '', password: '', fullName: '', role: 'customer' };
const EMPTY_EDIT = { id: '', first_name: '', last_name: '', email: '', role: '' };

const toast = (icon, title, text = '') => Swal.mixin({
  toast: true, position: 'top-end',
  showConfirmButton: false, timer: 3000, timerProgressBar: true,
  background: T.ink2, color: T.text,
}).fire({ icon, title, text });

const swalTheme = { background: T.ink2, color: T.text, confirmButtonColor: T.gold };


const CountUp = ({ value, format }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    const duration = 700;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format ? format(display) : display}</>;
};

const DarkInput = ({ label, icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? T.gold : T.sub, display: 'flex', pointerEvents: 'none', transition: 'color 0.2s' }}>{icon}</div>}
        <input
          style={{
            width: '100%', background: focused ? T.surfaceHi : T.surface,
            border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10, color: T.text,
            fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
            padding: icon ? '12px 14px 12px 40px' : '12px 14px',
            outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
            boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
          }}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </div>
    </div>
  );
};

const DarkSelect = ({ label, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    {label && <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>{label}</label>}
    <div style={{ position: 'relative' }}>
      <select
        style={{
          width: '100%', background: T.ink3, borderRadius: 10,
          border: `1px solid ${T.border}`, color: T.text,
          fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
          padding: '12px 36px 12px 14px', outline: 'none', cursor: 'pointer',
          appearance: 'none', boxSizing: 'border-box',
        }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: T.sub, pointerEvents: 'none' }} />
    </div>
  </div>
);

const GoldBtn = ({ children, loading, ...props }) => (
  <motion.button
    whileTap={{ scale: props.disabled ? 1 : 0.96 }}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: T.gold, color: T.ink2, border: 'none', borderRadius: 11,
      padding: '13px 22px', fontFamily: 'DM Sans, sans-serif',
      fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.55 : 1,
      transition: 'background 0.2s, box-shadow 0.2s',
      boxShadow: props.disabled ? 'none' : `0 6px 20px ${T.gold}2E`,
    }}
    onMouseEnter={(e) => { if (!props.disabled) e.currentTarget.style.background = T.goldLight; }}
    onMouseLeave={(e) => { if (!props.disabled) e.currentTarget.style.background = T.gold; }}
    {...props}
  >
    {loading ? <Loader2 size={15} style={{ animation: 'um-spin 0.8s linear infinite' }} /> : children}
  </motion.button>
);

const GhostBtn = ({ children, ...props }) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
      background: T.surface, border: `1px solid ${T.border}`,
      color: T.sub, padding: '11px 18px',
      fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.18s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.text; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}
    {...props}
  >
    {children}
  </motion.button>
);

const Avatar = ({ firstName, lastName, color, size = 38 }) => {
  const initials = [firstName, lastName].filter(Boolean).map(s => s[0]?.toUpperCase()).join('') || '?';
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: size / 3.2,
      background: `${color}1E`, border: `1px solid ${color}45`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 800, color,
      fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.03em',
      boxShadow: `0 0 16px ${color}20`,
    }}>
      {initials}
    </div>
  );
};

const RoleBadge = ({ role, pulse }) => {
  const meta = roleMeta(role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 999,
      background: `${meta.color}16`,
      border: `1px solid ${meta.color}3A`,
      color: meta.color,
      fontSize: 9.5, fontWeight: 800,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      transition: 'all 0.18s',
    }}>
      <motion.span
        animate={pulse ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 1.8, repeat: pulse ? Infinity : 0 }}
        style={{ width: 5.5, height: 5.5, borderRadius: '50%', background: meta.color, boxShadow: `0 0 6px ${meta.color}`, flexShrink: 0 }}
      />
      {meta.icon}
      {meta.label}
    </span>
  );
};

const ModalShell = ({ open, onClose, title, subtitle, icon, children, width = 520, closeOnBackdrop = true }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, background: 'rgba(3,11,13,0.86)', backdropFilter: 'blur(16px)',
        }}
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="dialog" aria-modal="true"
          style={{
            width: '100%', maxWidth: width, borderRadius: 20,
            background: T.ink, border: `1px solid ${T.borderHi}`,
            boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
            overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 10% 0%, ${T.goldSoft}, transparent 55%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              {icon && (
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
                  {icon}
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 21, letterSpacing: '0.02em', color: T.text, lineHeight: 1 }}>{title}</div>
                {subtitle && <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginTop: 4 }}>{subtitle}</div>}
              </div>
            </div>
            <button
              onClick={onClose} aria-label="Close"
              style={{ position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.borderHi; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; }}
            >
              <X size={15} />
            </button>
          </div>
          <div className="um-scroll" style={{ overflowY: 'auto', padding: '26px 28px 28px' }}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const OverviewCard = ({ label, value, icon, color, delay = 0 }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '17px 18px', borderRadius: 15,
        background: T.surface, border: `1px solid ${hovered ? `${color}55` : T.border}`,
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}18` : 'none',
      }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${color}22, transparent 70%)`, opacity: hovered ? 1 : 0.5, transition: 'opacity 0.3s' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.sub }}>{label}</div>
        <motion.div
          animate={{ rotate: hovered ? [0, -10, 10, 0] : 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: 26, height: 26, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}
        >
          {icon}
        </motion.div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, letterSpacing: '0.02em', color: T.text }}>
        <CountUp value={value} />
      </div>
    </motion.div>
  );
};

const RoleSegmented = ({ value, onChange, counts, total }) => (
  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: 4, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
    {ROLES.map((r) => {
      const active = value === r.value;
      const count = r.value === 'all' ? total : (counts[r.value] || 0);
      return (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em',
            color: active ? T.ink2 : T.sub, background: 'transparent', whiteSpace: 'nowrap',
            zIndex: 1, transition: 'color 0.2s',
          }}
        >
          {active && (
            <motion.div
              layoutId="role-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 9, background: T.gold, boxShadow: `0 4px 14px ${T.gold}40`, zIndex: -1 }}
            />
          )}
          <span style={{ display: 'flex', color: active ? T.ink2 : r.color }}>{r.icon}</span>
          {r.label}
          <span style={{
            marginLeft: 2, padding: '1px 6px', borderRadius: 999, fontSize: 9,
            background: active ? 'rgba(3,11,13,0.18)' : 'rgba(126,156,161,0.14)',
            color: active ? T.ink2 : T.sub,
          }}>
            {count}
          </span>
        </button>
      );
    })}
  </div>
);

const PersonnelRow = ({ user, index, onView, onEdit, onCycleRole, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const meta = roleMeta(user.role);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed';

  const actions = [
    { icon: <Eye size={14} />,     title: 'View Profile', color: T.gold,    onClick: () => onView(user) },
    { icon: <Edit3 size={14} />,   title: 'Edit Profile', color: T.gold,    onClick: () => onEdit(user) },
    { icon: <UserCog size={14} />, title: 'Cycle Role',   color: T.info,    onClick: () => onCycleRole(user) },
    { icon: <Trash2 size={14} />,  title: 'Delete',       color: T.danger,  onClick: () => onDelete(user) },
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.025, type: 'spring', stiffness: 300, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(190px, 2fr) minmax(120px, 1fr) minmax(160px, 1.6fr) minmax(110px, 1fr) auto',
        alignItems: 'center', gap: 16,
        padding: '14px 18px', borderRadius: 14,
        background: hovered ? T.surfaceHi : T.surface,
        border: `1px solid ${hovered ? T.borderHi : T.border}`,
        marginBottom: 10, transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 14px 34px rgba(0,0,0,0.35), 0 0 0 1px rgba(232,176,0,0.06)' : 'none',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar firstName={user.first_name} lastName={user.last_name} color={meta.color} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
          <div style={{ fontSize: 9, color: T.sub, fontFamily: 'monospace', marginTop: 2 }}>UID {user.id.substring(0, 10)}…</div>
        </div>
      </div>

      {}
      <div><RoleBadge role={user.role} /></div>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.sub, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <Mail size={12} style={{ opacity: 0.55, flexShrink: 0 }} />
        {user.email || '—'}
      </div>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.sub, fontFamily: 'monospace' }}>
        <Calendar size={11} style={{ opacity: 0.55 }} />
        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {actions.map((a, i) => (
          <div key={i} style={{ position: 'relative' }} className="um-tooltip-wrap">
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={a.onClick}
              aria-label={a.title}
              style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.sub, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = a.color; e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}14`; e.currentTarget.style.boxShadow = `0 0 12px ${a.color}30`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {a.icon}
            </motion.button>
            <span className="um-tooltip">{a.title}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const WIZARD_STEPS = [
  { key: 'personal',    label: 'Personal',    icon: <User size={14} /> },
  { key: 'credentials', label: 'Credentials', icon: <Lock size={14} /> },
  { key: 'role',        label: 'Role',        icon: <Shield size={14} /> },
  { key: 'review',      label: 'Review',      icon: <CheckCircle2 size={14} /> },
];

const WizardProgress = ({ currentStep }) => {
  const idx = WIZARD_STEPS.findIndex(s => s.key === currentStep);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 26 }}>
      {WIZARD_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        const col = done ? T.success : active ? T.gold : 'rgba(126,156,161,0.28)';
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, flex: i < WIZARD_STEPS.length - 1 ? 'none' : 1 }}>
              <motion.div
                animate={{ scale: active ? 1.08 : 1 }}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: done ? 'rgba(34,197,94,0.15)' : active ? T.goldSoft : 'rgba(126,156,161,0.06)',
                  border: `1.5px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: col, boxShadow: active ? `0 0 14px ${T.gold}40` : 'none', transition: 'background 0.3s, border-color 0.3s',
                }}
              >
                {done ? <Check size={13} /> : step.icon}
              </motion.div>
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: col, whiteSpace: 'nowrap' }}>{step.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: done ? T.success : 'rgba(126,156,161,0.14)', margin: '0 8px', marginBottom: 20, transition: 'background 0.4s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const AddPersonnelWizard = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [step, setStep] = useState('personal');
  const [form, setForm] = useState(EMPTY_NEW);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) { setForm(EMPTY_NEW); setStep('personal'); setErrors({}); }
  }, [isOpen]);

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleNext = () => {
    if (step === 'personal' && !form.fullName.trim()) { setErrors({ fullName: 'Required' }); return; }
    if (step === 'credentials') {
      const e = {};
      if (!form.email.trim()) e.email = 'Required';
      if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters';
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    setErrors({});
    const idx = WIZARD_STEPS.findIndex(s => s.key === step);
    if (idx < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[idx + 1].key);
  };

  const handleBack = () => {
    const idx = WIZARD_STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(WIZARD_STEPS[idx - 1].key);
  };

  const meta = roleMeta(form.role);
  const [first, ...rest] = form.fullName.trim().split(' ');

  return (
    <ModalShell isOpen={isOpen} open={isOpen} onClose={onClose} title="New Personnel" subtitle={`Step ${WIZARD_STEPS.findIndex(s => s.key === step) + 1} of ${WIZARD_STEPS.length}`} icon={<Sparkles size={16} />} width={620}>
      <WizardProgress currentStep={step} />

      <AnimatePresence mode="wait">
        {step === 'personal' && (
          <motion.div key="personal" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Avatar firstName={first} lastName={rest.join(' ')} color={meta.color} size={64} />
            </div>
            <div>
              <DarkInput label="Full Name *" icon={<User size={14} />} placeholder="Juan Dela Cruz" value={form.fullName} onChange={e => upd('fullName', e.target.value)} />
              {errors.fullName && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>{errors.fullName}</p>}
            </div>
            <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.6, margin: 0 }}>
              This name will be used to identify the account throughout the system.
            </p>
          </motion.div>
        )}

        {step === 'credentials' && (
          <motion.div key="credentials" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <DarkInput label="System Email *" type="email" icon={<Mail size={14} />} placeholder="juan@riontech.com" value={form.email} onChange={e => upd('email', e.target.value)} />
              {errors.email && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>{errors.email}</p>}
            </div>
            <div>
              <DarkInput label="Access Password *" type="password" icon={<Lock size={14} />} placeholder="Min. 6 characters" value={form.password} onChange={e => upd('password', e.target.value)} />
              {errors.password && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>{errors.password}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12 }}>
              <AlertCircle size={14} style={{ color: T.info, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: T.sub, margin: 0, lineHeight: 1.55 }}>A provisioning email will be dispatched to this address once created.</p>
            </div>
          </motion.div>
        )}

        {step === 'role' && (
          <motion.div key="role" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>Assign Role *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ROLES.slice(1).map(r => {
                const active = form.role === r.value;
                return (
                  <button
                    key={r.value} type="button" onClick={() => upd('role', r.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12,
                      background: active ? `${r.color}16` : T.surface,
                      border: `1.5px solid ${active ? r.color : T.border}`,
                      color: active ? r.color : T.sub, cursor: 'pointer', transition: 'all 0.18s',
                      boxShadow: active ? `0 0 16px ${r.color}25` : 'none',
                    }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${r.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{r.label}</span>
                    {active && <Check size={14} style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, background: T.goldSoft, border: `1px solid ${T.goldLine}`, marginBottom: 16 }}>
              <Avatar firstName={first} lastName={rest.join(' ')} color={meta.color} size={52} />
              <div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: T.text, lineHeight: 1 }}>{form.fullName || 'Unnamed'}</div>
                <div style={{ marginTop: 6 }}><RoleBadge role={form.role} /></div>
              </div>
            </div>
            {[
              { label: 'Email', val: form.email || '—' },
              { label: 'Password', val: form.password ? '•'.repeat(Math.min(form.password.length, 12)) : '—' },
              { label: 'Role', val: meta.label },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < 2 ? '1px solid rgba(232,176,0,0.08)' : 'none' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.sub }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{row.val}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <GhostBtn onClick={step === 'personal' ? onClose : handleBack}>
          <ChevronLeft size={14} /> {step === 'personal' ? 'Cancel' : 'Back'}
        </GhostBtn>
        {step === 'review' ? (
          <GoldBtn onClick={() => onSubmit(form)} loading={submitting} disabled={submitting}>
            <CheckCircle2 size={15} /> Confirm Registration
          </GoldBtn>
        ) : (
          <GoldBtn onClick={handleNext}>Continue <ChevronRight size={14} /></GoldBtn>
        )}
      </div>
    </ModalShell>
  );
};

const EditPersonnelWorkspace = ({ isOpen, onClose, user, onSubmit, submitting }) => {
  const [form, setForm] = useState(EMPTY_EDIT);

  useEffect(() => {
    if (isOpen && user) {
      setForm({ id: user.id, first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '', role: user.role });
    }
  }, [isOpen, user]);

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));
  if (!user) return null;

  const meta = roleMeta(form.role);
  const origMeta = roleMeta(user.role);

  return (
    <ModalShell isOpen={isOpen} open={isOpen} onClose={onClose} title="Edit Profile" subtitle="Personnel editing workspace" icon={<Edit3 size={16} />} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub, marginBottom: 10 }}>Current Information</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
            <Avatar firstName={user.first_name} lastName={user.last_name} color={origMeta.color} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed'}</div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{user.email}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}><RoleBadge role={user.role} /></div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', color: T.sub, opacity: 0.6 }}>
          <ChevronDown size={16} style={{ transform: 'rotate(0deg)' }} />
        </div>

        {}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub, marginBottom: 10 }}>Editable Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <DarkInput label="First Name" value={form.first_name} onChange={e => upd('first_name', e.target.value)} />
              <DarkInput label="Last Name" value={form.last_name} onChange={e => upd('last_name', e.target.value)} />
            </div>
            <DarkInput label="Email Address" type="email" icon={<Mail size={14} />} value={form.email} onChange={e => upd('email', e.target.value)} />
            <DarkSelect label="Role" value={form.role} onChange={e => upd('role', e.target.value)}>
              {ROLES.slice(1).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </DarkSelect>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', color: T.sub, opacity: 0.6 }}>
          <ChevronDown size={16} />
        </div>

        {}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Eye size={12} style={{ color: T.gold }} /> Live Preview
          </div>
          <motion.div
            layout
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, background: T.goldSoft, border: `1px solid ${T.goldLine}` }}
          >
            <Avatar firstName={form.first_name} lastName={form.last_name} color={meta.color} size={48} />
            <div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: T.text, lineHeight: 1 }}>
                {[form.first_name, form.last_name].filter(Boolean).join(' ') || 'Unnamed'}
              </div>
              <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>{form.email || '—'}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}><RoleBadge role={form.role} /></div>
          </motion.div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <GoldBtn onClick={() => onSubmit(form)} loading={submitting} disabled={submitting}>
            <Edit3 size={15} /> Commit Changes
          </GoldBtn>
        </div>
      </div>
    </ModalShell>
  );
};

const ViewProfileModal = ({ isOpen, onClose, user, onEditRequest }) => {
  if (!user) return null;
  const meta = roleMeta(user.role);
  const rows = [
    { icon: <Hash size={13} />, label: 'User ID', value: user.id },
    { icon: <Mail size={13} />, label: 'Email', value: user.email || '—' },
    { icon: <Shield size={13} />, label: 'Role', value: user.role?.toUpperCase() },
    { icon: <Calendar size={13} />, label: 'Registered', value: user.created_at ? new Date(user.created_at).toLocaleString() : '—' },
  ];
  return (
    <ModalShell isOpen={isOpen} open={isOpen} onClose={onClose} title="Personnel Profile" subtitle="Account details" icon={<UserCheck size={16} />} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 20, borderRadius: 16, background: `linear-gradient(135deg, ${meta.color}14, transparent)`, border: `1px solid ${meta.color}30` }}>
          <Avatar firstName={user.first_name} lastName={user.last_name} color={meta.color} size={68} />
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 25, letterSpacing: '0.02em', color: T.text, lineHeight: 1 }}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unnamed'}
            </div>
            <div style={{ marginTop: 8 }}><RoleBadge role={user.role} pulse /></div>
          </div>
        </div>

        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.border}` }}>
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: i % 2 ? T.surface : 'transparent', borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none' }}
            >
              <div style={{ color: T.gold, opacity: 0.8, flexShrink: 0 }}>{row.icon}</div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, width: 100, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 12, color: T.text, fontWeight: 500, wordBreak: 'break-all' }}>{row.value}</span>
            </motion.div>
          ))}
        </div>

        <GoldBtn onClick={() => onEditRequest(user)}>
          <Edit3 size={14} /> Edit Profile
        </GoldBtn>
      </div>
    </ModalShell>
  );
};

const DeleteDialog = ({ isOpen, onClose, user, onConfirm, deleting }) => {
  if (!user) return null;
  const meta = roleMeta(user.role);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'this account';
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(3,11,13,0.88)', backdropFilter: 'blur(16px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 420, borderRadius: 20, background: T.ink, border: `1px solid rgba(239,68,68,0.35)`, boxShadow: '0 30px 90px rgba(0,0,0,0.6), 0 0 60px rgba(239,68,68,0.06)', overflow: 'hidden' }}
          >
            <div style={{ padding: '26px 26px 20px', textAlign: 'center' }}>
              <motion.div
                animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger, margin: '0 auto 16px' }}
              >
                <AlertTriangle size={26} />
              </motion.div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: T.text, letterSpacing: '0.02em', marginBottom: 6 }}>Deactivate Account?</div>
              <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6, margin: '0 auto', maxWidth: 300 }}>
                This will permanently remove the record from the registry. This action cannot be undone.
              </p>
            </div>

            <div style={{ margin: '0 26px', padding: 14, borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar firstName={user.first_name} lastName={user.last_name} color={meta.color} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
                <div style={{ marginTop: 4 }}><RoleBadge role={user.role} /></div>
              </div>
            </div>

            <div style={{ padding: 26, display: 'flex', gap: 10 }}>
              <GhostBtn onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</GhostBtn>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => onConfirm(user)}
                disabled={deleting}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: T.danger, color: '#fff', border: 'none', borderRadius: 11,
                  padding: '13px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.05em', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                  boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
                }}
              >
                {deleting ? <Loader2 size={15} style={{ animation: 'um-spin 0.8s linear infinite' }} /> : <Trash2 size={14} />}
                {deleting ? 'Removing…' : 'Confirm Delete'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const UserManagement = () => {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [filterRole,  setFilterRole]  = useState('all');
  const [sortField,   setSortField]   = useState('created_at');
  const [sortAsc,     setSortAsc]     = useState(false);

  const [showAdd,        setShowAdd]        = useState(false);
  const [showEdit,        setShowEdit]      = useState(false);
  const [showView,        setShowView]      = useState(false);
  const [showDelete,      setShowDelete]    = useState(false);
  const [activeUser,      setActiveUser]    = useState(null);
  const [submitting,      setSubmitting]    = useState(false);
  const [deleting,        setDeleting]      = useState(false);

  useEffect(() => {
    fetchUsers();
    const ch = supabase.channel('um-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    else toast('error', 'Registry connection failed');
    setLoading(false);
  };

  
  const handleExport = () => {
    if (!users.length) return toast('warning', 'No data to export');
    const headers = ['ID', 'First', 'Last', 'Email', 'Role', 'Registered'];
    const rows = users.map(u => [
      u.id, u.first_name || '', u.last_name || '',
      u.email || '', u.role, new Date(u.created_at).toLocaleDateString(),
    ].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Riontech_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast('success', 'CSV exported');
  };

 
  const handleAdd = async (form) => {
    setSubmitting(true);
    try {
      const [firstName, ...rest] = form.fullName.trim().split(' ');
      const { error: authErr } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { first_name: firstName, last_name: rest.join(' '), role: form.role } },
      });
      if (authErr) throw authErr;
      toast('success', 'Provisioning email dispatched');
      setShowAdd(false);
    } catch (err) {
      toast('error', err.message);
    }
    setSubmitting(false);
  };

  
  const handleEdit = async (form) => {
    setSubmitting(true);
    const { error } = await supabase.from('profiles').update({
      first_name: form.first_name,
      last_name:  form.last_name,
      email:      form.email,
      role:       form.role,
    }).eq('id', form.id);
    if (!error) { toast('success', 'Profile updated'); setShowEdit(false); fetchUsers(); }
    else toast('error', 'Update failed: ' + error.message);
    setSubmitting(false);
  };

  
  const handleDeleteConfirm = async (user) => {
    setDeleting(true);
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (!error) { toast('success', 'Record purged'); setShowDelete(false); fetchUsers(); }
    else toast('error', 'Delete failed – check for linked records');
    setDeleting(false);
  };

  
  const handleRoleCycle = async (user) => {
    const cycle = ['customer', 'technician', 'manager', 'cashier'];
    const next  = cycle[(cycle.indexOf(user.role) + 1) % cycle.length];
    const name  = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'this account';
    const res   = await Swal.fire({
      title: 'Modify Role?',
      text: `Set ${name} to ${next.toUpperCase()}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: T.gold, cancelButtonColor: T.ink3,
      background: T.ink2, color: T.text,
    });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from('profiles').update({ role: next }).eq('id', user.id);
    if (!error) { toast('success', 'Role updated'); fetchUsers(); }
    else toast('error', 'Role update failed');
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = useMemo(() => users
    .filter(u => {
      const term = searchTerm.toLowerCase();
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      return (
        (filterRole === 'all' || u.role === filterRole) &&
        (name.includes(term) || (u.email || '').toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      let av = a[sortField] || '', bv = b[sortField] || '';
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    }), [users, searchTerm, filterRole, sortField, sortAsc]);

  const counts = useMemo(() => ROLES.slice(1).reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {}), [users]);

  const overview = [
    { label: 'Total Personnel', value: users.length,               icon: <Users size={13} />,     color: T.gold },
    { label: 'Customers',       value: counts.customer || 0,        icon: <User size={13} />,      color: T.info },
    { label: 'Technicians',     value: counts.technician || 0,      icon: <Wrench size={13} />,    color: T.success },
    { label: 'Managers',        value: counts.manager || 0,         icon: <Briefcase size={13} />, color: T.gold },
    { label: 'Cashiers',        value: counts.cashier || 0,         icon: <Wallet size={13} />,    color: '#8B5CF6' },
    { label: 'Admins',          value: counts.admin || 0,           icon: <Crown size={13} />,     color: T.danger },
  ];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes um-spin { to { transform: rotate(360deg); } }
        @keyframes um-shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        @keyframes um-float { 0%,100% { transform: translate(0,0); } 50% { transform: translate(12px,-14px); } }
        .um-overview { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
        @media (max-width: 1100px) { .um-overview { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 640px)  { .um-overview { grid-template-columns: repeat(2, 1fr); } }
        .um-scroll::-webkit-scrollbar { width: 5px; }
        .um-scroll::-webkit-scrollbar-thumb { background: rgba(232,176,0,0.18); border-radius: 3px; }
        .um-row-head { display: grid; grid-template-columns: minmax(190px, 2fr) minmax(120px, 1fr) minmax(160px, 1.6fr) minmax(110px, 1fr) auto; gap: 16px; padding: 0 18px 10px; }
        .um-th-btn { background: none; border: none; color: ${T.sub}; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; transition: color 0.15s; }
        .um-th-btn:hover { color: ${T.gold}; }
        .um-tooltip-wrap { position: relative; }
        .um-tooltip { position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%) translateY(3px); background: ${T.ink2}; border: 1px solid ${T.border}; color: ${T.text}; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; padding: 5px 9px; border-radius: 7px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s, transform 0.15s; z-index: 5; }
        .um-tooltip-wrap:hover .um-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${T.gold}; outline-offset: 2px; }
        @media (max-width: 860px) { .um-row-head { display: none; } }
      `}</style>

      {}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18,
        background: `linear-gradient(135deg, ${T.ink} 0%, ${T.ink2} 100%)`, border: `1px solid ${T.border}`,
        padding: '26px 26px', marginBottom: 22,
      }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${T.goldSoft}, transparent 65%)`, animation: 'um-float 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '20%', width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, rgba(59,130,246,0.08), transparent 65%)`, animation: 'um-float 10s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 42, height: 42, borderRadius: 13, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, boxShadow: `0 0 18px ${T.gold}30` }}
              >
                <ShieldCheck size={19} />
              </motion.div>
              <div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, letterSpacing: '0.02em', color: T.text, lineHeight: 1 }}>Personnel Command Center</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub, marginTop: 5 }}>
                  Administrative Access Control · Live Registry
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={fetchUsers} aria-label="Refresh"
              style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, border: `1px solid ${T.border}`, color: T.sub, cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.borderHi; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; }}>
              <RefreshCw size={15} />
            </button>
            <GhostBtn onClick={handleExport}><Download size={14} /> Export CSV</GhostBtn>
            <GoldBtn onClick={() => setShowAdd(true)}><Plus size={14} /> Add Personnel</GoldBtn>
          </div>
        </div>
      </div>

      {}
      <div className="um-overview" style={{ marginBottom: 20 }}>
        {overview.map((o, i) => <OverviewCard key={o.label} {...o} delay={i * 0.05} />)}
      </div>

      {}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.sub }} />
          <input
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: '100%', background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, padding: '11px 40px 11px 40px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.18s' }}
            onFocus={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.goldSoft}`; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <AnimatePresence>
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.sub, cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <RoleSegmented value={filterRole} onChange={setFilterRole} counts={counts} total={users.length} />
      </div>

      {}
      <div className="um-row-head">
        {[{ label: 'Personnel', field: 'first_name' }, { label: 'Role', field: 'role' }, { label: 'Email', field: 'email' }, { label: 'Registered', field: 'created_at' }].map(col => (
          <button key={col.field} className="um-th-btn" onClick={() => toggleSort(col.field)}>
            {col.label}<ArrowUpDown size={10} style={{ opacity: sortField === col.field ? 1 : 0.4 }} />
          </button>
        ))}
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, textAlign: 'right' }}>Actions</span>
      </div>

      {}
      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 66, borderRadius: 14, marginBottom: 10, background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(232,176,0,0.06) 50%, rgba(255,255,255,0.02) 100%)', backgroundSize: '300% 100%', animation: 'um-shimmer 1.8s ease-in-out infinite', border: `1px solid ${T.border}` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16, borderRadius: 16, border: `1px dashed ${T.border}`, background: 'rgba(232,176,0,0.015)', position: 'relative', overflow: 'hidden' }}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} style={{ width: 64, height: 64, borderRadius: 18, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub }}>
            <Users size={28} />
          </motion.div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: T.text, letterSpacing: '0.02em' }}>No Matching Records</div>
          <div style={{ fontSize: 12.5, color: T.sub, textAlign: 'center', maxWidth: 320 }}>Try adjusting your search or role filter, or add new personnel to the registry.</div>
          <GoldBtn onClick={() => setShowAdd(true)}><Plus size={14} /> Add Personnel</GoldBtn>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.map((user, idx) => (
            <PersonnelRow
              key={user.id}
              user={user}
              index={idx}
              onView={(u) => { setActiveUser(u); setShowView(true); }}
              onEdit={(u) => { setActiveUser(u); setShowEdit(true); }}
              onCycleRole={handleRoleCycle}
              onDelete={(u) => { setActiveUser(u); setShowDelete(true); }}
            />
          ))}
        </AnimatePresence>
      )}

      {}
      {!loading && filtered.length > 0 && (
        <div style={{ padding: '12px 18px', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 10, color: T.sub, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
            Showing {filtered.length} of {users.length} records
          </span>
        </div>
      )}

      {}
      <AddPersonnelWizard isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAdd} submitting={submitting} />
      <EditPersonnelWorkspace isOpen={showEdit} onClose={() => setShowEdit(false)} user={activeUser} onSubmit={handleEdit} submitting={submitting} />
      <ViewProfileModal isOpen={showView} onClose={() => setShowView(false)} user={activeUser} onEditRequest={(u) => { setShowView(false); setActiveUser(u); setShowEdit(true); }} />
      <DeleteDialog isOpen={showDelete} onClose={() => setShowDelete(false)} user={activeUser} onConfirm={handleDeleteConfirm} deleting={deleting} />
    </div>
  );
};

export default UserManagement;
