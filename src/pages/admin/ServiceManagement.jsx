import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Archive, RotateCcw, Search, X, Loader2,
  Clock, MapPin, Image as ImageIcon, Wallet, Eye,
  ChevronRight, ChevronLeft, Check, AlertCircle,
  RefreshCw, Edit3, Package, DollarSign, Tag, Command,
  ArrowRight, CheckCircle2, Sparkles, LayoutGrid, FolderCog, ArrowUpDown, Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';

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

const swalTheme = { background: T.ink2, color: T.text, confirmButtonColor: T.gold };

const toast = (icon, title, text = '') => Swal.mixin({
  toast: true, position: 'top-end',
  showConfirmButton: false, timer: 3000, timerProgressBar: true,
  background: T.ink2, color: T.text,
}).fire({ icon, title, text });

const WIZARD_STEPS = [
  { key: 'identity', label: 'Identity',  icon: <Tag size={14} /> },
  { key: 'pricing',  label: 'Pricing',   icon: <DollarSign size={14} /> },
  { key: 'media',    label: 'Media',     icon: <ImageIcon size={14} /> },
  { key: 'review',   label: 'Review',    icon: <CheckCircle2 size={14} /> },
];

const EMPTY_FORM = {
  title: '', category_id: '', price: '', duration: '',
  requires_survey: false, description: '', image_url: '',
  downpayment_amount: '', is_percentage_downpayment: true, package_items: [],
};

const normalizePackageItems = (items) => {
  if (Array.isArray(items)) return items;
  if (typeof items !== 'string') return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

const DarkTextarea = ({ label, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>{label}</label>}
      <textarea
        style={{
          width: '100%', background: focused ? T.surfaceHi : T.surface,
          border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10, color: T.text,
          fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
          padding: '12px 14px', outline: 'none', resize: 'vertical',
          transition: 'all 0.18s', minHeight: 100, boxSizing: 'border-box', lineHeight: 1.6,
          boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
        }}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
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
      <ChevronRight size={13} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: T.sub, pointerEvents: 'none' }} />
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
    {loading ? <Loader2 size={15} style={{ animation: 'sm-spin 0.8s linear infinite' }} /> : children}
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


const CountUp = ({ value, format }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    const duration = 600;
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


const LivePreviewCard = ({ form, categories }) => {
  const cat = categories.find((c) => c.id === form.category_id)?.name;
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.goldLine}`,
      background: T.ink, boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
    }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', background: T.ink3, overflow: 'hidden' }}>
        {form.image_url ? (
          <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.82)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={28} style={{ color: 'rgba(126,156,161,0.25)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(6,23,26,0.92) 100%)' }} />
        {cat && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(6,23,26,0.75)', backdropFilter: 'blur(10px)',
            border: `1px solid ${T.goldLine}`, borderRadius: 999,
            padding: '3px 10px', fontSize: 8.5, fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold,
          }}>
            {cat}
          </div>
        )}
      </div>
      <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <h4 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 17, letterSpacing: '0.02em', color: T.text, margin: 0, lineHeight: 1.15 }}>
            {form.title || 'Untitled Service'}
          </h4>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {form.duration && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: T.sub }}>
                <Clock size={10} /> {form.duration}
              </span>
            )}
            {form.requires_survey && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: T.info }}>
                <MapPin size={10} /> Survey Required
              </span>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', borderRadius: 11,
          background: T.goldSoft, border: `1px solid ${T.goldLine}`,
        }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginBottom: 2 }}>Price</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: '0.02em', color: T.gold }}>
              {form.price ? `₱${Number(form.price).toLocaleString()}` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.info, marginBottom: 2 }}>Downpayment</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.info }}>
              {form.downpayment_amount
                ? (form.is_percentage_downpayment ? `${form.downpayment_amount}%` : `₱${Number(form.downpayment_amount).toLocaleString()}`)
                : '—'}
            </div>
          </div>
        </div>
        {form.description && (
          <p style={{ fontSize: 11, color: T.sub, lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {form.description}
          </p>
        )}
      </div>
    </div>
  );
};

const ServiceCard = ({ service, onEdit, onArchive }) => {
  const [hovered, setHovered] = useState(false);
  const isArchived = service.is_archived;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.ink, borderRadius: 16,
        border: `1px solid ${hovered ? T.borderHi : T.border}`,
        display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hovered ? '0 20px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(232,176,0,0.08)' : 'none',
      }}
    >
      {}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: T.ink3 }}>
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)', transform: hovered ? 'scale(1.07)' : 'scale(1)', filter: isArchived ? 'grayscale(0.75) brightness(0.55)' : 'brightness(0.82)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={34} style={{ color: 'rgba(126,156,161,0.25)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 45%, rgba(6,23,26,0.92) 100%)' }} />

        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(6,23,26,0.75)', backdropFilter: 'blur(10px)',
          border: `1px solid ${T.goldLine}`, borderRadius: 999,
          padding: '4px 11px', fontSize: 9, fontWeight: 800,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold,
        }}>
          {service.service_categories?.name || 'Uncategorized'}
        </div>

        {isArchived && (
          <div style={{
            position: 'absolute', bottom: 10, left: 12,
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(6,23,26,0.75)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239,68,68,0.35)', borderRadius: 999,
            padding: '3px 10px', fontSize: 8.5, fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: T.danger,
          }}>
            <Archive size={9} /> Archived
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          aria-label={isArchived ? 'Restore service' : 'Archive service'}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: 10, background: 'rgba(6,23,26,0.75)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isArchived ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}`,
            color: isArchived ? T.success : T.danger,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isArchived ? T.success : T.danger; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,23,26,0.75)'; e.currentTarget.style.color = isArchived ? T.success : T.danger; }}
        >
          {isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
        </motion.button>
      </div>

      {}
      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 19, letterSpacing: '0.02em', color: hovered ? T.gold : T.text, margin: 0, lineHeight: 1.15, transition: 'color 0.2s' }}>
            {service.title}
          </h3>
          <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
            {service.duration && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: T.sub }}>
                <Clock size={10} /> {service.duration}
              </span>
            )}
            {service.requires_survey && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: T.info }}>
                <MapPin size={10} /> Survey Required
              </span>
            )}
            {normalizePackageItems(service.package_items).length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: T.gold }}>
                <Package size={10} /> {normalizePackageItems(service.package_items).length} included items
              </span>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '11px 14px', borderRadius: 12,
          background: T.goldSoft, border: `1px solid ${T.goldLine}`,
        }}>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginBottom: 3 }}>Base Price</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 21, letterSpacing: '0.02em', color: T.gold }}>
              ₱{Number(service.price).toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.info, marginBottom: 3 }}>Downpayment</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.info }}>
              {service.is_percentage_downpayment ? `${service.downpayment_amount}%` : `₱${Number(service.downpayment_amount).toLocaleString()}`}
            </div>
          </div>
        </div>

        {service.description && (
          <p style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {service.description}
          </p>
        )}
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <button
          onClick={onEdit}
          style={{
            width: '100%', padding: '11px', borderRadius: 10,
            background: hovered ? T.goldSoft : T.surface,
            border: `1px solid ${hovered ? T.borderHi : T.border}`,
            color: hovered ? T.gold : T.sub, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 10.5, fontWeight: 800,
            letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <Edit3 size={13} /> Modify Service
        </button>
      </div>
    </motion.div>
  );
};

const CategoryOverview = ({ categories, services, activeCategory, onView, onEdit, onAdd }) => (
  <motion.section
    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
    style={{ overflow: 'hidden', marginBottom: 20 }}
  >
    <div style={{ padding: 18, borderRadius: 16, background: T.ink, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 800 }}>Categories</div>
          <div style={{ color: T.sub, fontSize: 11.5, marginTop: 3 }}>Live service counts from your catalog.</div>
        </div>
        <button onClick={onAdd} style={{ background: T.goldSoft, border: `1px solid ${T.goldLine}`, color: T.gold, padding: '8px 11px', borderRadius: 8, fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}><Plus size={12} /> Add Category</button>
      </div>
      <div className="sm-category-grid">
        {categories.map((category) => {
          const entries = services.filter((service) => service.category_id === category.id);
          const active = entries.filter((service) => !service.is_archived).length;
          const archived = entries.length - active;
          const selected = activeCategory === category.id;
          return <div key={category.id} style={{ padding: 14, borderRadius: 12, background: selected ? T.goldSoft : T.surface, border: `1px solid ${selected ? T.borderHi : T.border}` }}>
            <div style={{ color: T.text, fontSize: 12.5, fontWeight: 800, lineHeight: 1.35 }}>{category.name}</div>
            <div style={{ display: 'flex', gap: 10, color: T.sub, fontSize: 10.5, marginTop: 8 }}><span>{entries.length} services</span><span>{active} active</span><span>{archived} archived</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => onView(selected ? '' : category.id)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text, borderRadius: 7, padding: '6px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{selected ? 'Clear view' : 'View services'}</button>
              <button onClick={() => onEdit(category)} style={{ background: 'transparent', border: 'none', color: T.gold, padding: '6px 3px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Edit name</button>
            </div>
          </div>;
        })}
      </div>
    </div>
  </motion.section>
);

const WizardProgress = ({ currentStep }) => {
  const idx = WIZARD_STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 30 }}>
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
                  width: 34, height: 34, borderRadius: 11,
                  background: done ? 'rgba(34,197,94,0.15)' : active ? T.goldSoft : 'rgba(126,156,161,0.06)',
                  border: `1.5px solid ${col}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: col, transition: 'background 0.3s, border-color 0.3s',
                  boxShadow: active ? `0 0 14px ${T.gold}40` : 'none',
                }}
              >
                {done ? <Check size={14} /> : step.icon}
              </motion.div>
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: col, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: done ? T.success : 'rgba(126,156,161,0.14)', margin: '0 8px', marginBottom: 22, transition: 'background 0.4s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ServiceWizard = ({ isOpen, onClose, editingId, initialForm, categories, onAddCategory, onSave, saving }) => {
  const [step, setStep] = useState('identity');
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initialForm || {}), package_items: normalizePackageItems(initialForm?.package_items) }));
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, ...(initialForm || {}), package_items: normalizePackageItems(initialForm?.package_items) });
      setStep('identity');
      setErrors({});
    }
  }, [isOpen, editingId]);

  const upd = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updatePackageItem = (index, key, value) => setForm((current) => ({
    ...current,
    package_items: current.package_items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
  const addPackageItem = () => setForm((current) => ({
    ...current, package_items: [...current.package_items, { name: '', quantity: 1, description: '' }],
  }));
  const removePackageItem = (index) => setForm((current) => ({
    ...current, package_items: current.package_items.filter((_, itemIndex) => itemIndex !== index),
  }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.category_id)  e.category_id = 'Required';
    if (form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) e.price = 'Enter a valid non-negative package price';
    form.package_items.forEach((item, index) => {
      if (!item.name?.trim()) e.package_items = `Included item ${index + 1}: name is required.`;
      else if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) e.package_items = `Included item ${index + 1}: quantity must be greater than 0.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 'identity' && (!form.title.trim() || !form.category_id)) {
      setErrors({ title: !form.title.trim() ? 'Required' : '', category_id: !form.category_id ? 'Required' : '' });
      return;
    }
    if (step === 'pricing' && (form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0)) { setErrors({ price: 'Enter a valid non-negative package price' }); return; }
    setErrors({});
    const idx = WIZARD_STEPS.findIndex((s) => s.key === step);
    if (idx < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[idx + 1].key);
  };

  const handleBack = () => {
    const idx = WIZARD_STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(WIZARD_STEPS[idx - 1].key);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `service-images/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('assets').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('assets').getPublicUrl(path);
      upd('image_url', data.publicUrl);
      toast('success', 'Image uploaded');
    } catch (err) {
      toast('error', err.message);
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!validate()) { setStep('identity'); return; }
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="wiz-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(3,11,13,0.86)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        onClick={onClose}
      >
        <motion.div
          key="wiz-panel"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true"
          style={{
            width: '100%', maxWidth: 980, borderRadius: 20,
            background: T.ink, border: `1px solid ${T.borderHi}`,
            boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
            overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {}
          <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 10% 0%, ${T.goldSoft}, transparent 55%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
                {editingId ? <Edit3 size={16} /> : <Sparkles size={16} />}
              </div>
              <div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 21, letterSpacing: '0.02em', color: T.text, lineHeight: 1 }}>
                  {editingId ? 'Update Service' : 'New Service'}
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginTop: 4 }}>
                  Step {WIZARD_STEPS.findIndex((s) => s.key === step) + 1} of {WIZARD_STEPS.length}
                </div>
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

          {}
          <div style={{ overflow: 'hidden', flex: 1, display: 'flex', minHeight: 0 }}>
            <div className="sm-scroll" style={{ overflowY: 'auto', flex: '1 1 55%', padding: '28px 28px', minWidth: 0 }}>
              <WizardProgress currentStep={step} />

              <AnimatePresence mode="wait">
                {step === 'identity' && (
                  <motion.div key="identity" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <DarkInput label="Service Title *" placeholder="e.g. HD CCTV Installation Package" value={form.title} onChange={(e) => upd('title', e.target.value)} />
                      {errors.title && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>{errors.title}</p>}
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                        <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>Category *</label>
                        <button onClick={onAddCategory} style={{ background: 'none', border: 'none', color: T.gold, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
                          + Add New
                        </button>
                      </div>
                      <DarkSelect value={form.category_id} onChange={(e) => upd('category_id', e.target.value)}>
                        <option value="">Select Category</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </DarkSelect>
                      {errors.category_id && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>Required</p>}
                    </div>

                    <DarkInput label="Work Duration" placeholder="e.g. 8 Hours" value={form.duration} onChange={(e) => upd('duration', e.target.value)} icon={<Clock size={14} />} />

                    <DarkTextarea label="Service Description" placeholder="Describe the scope, equipment, and deliverables…" value={form.description} onChange={(e) => upd('description', e.target.value)} />

                    <label htmlFor="survey" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', cursor: 'pointer' }}>
                      <input type="checkbox" id="survey" checked={form.requires_survey} onChange={(e) => upd('requires_survey', e.target.checked)} style={{ width: 17, height: 17, accentColor: T.gold, cursor: 'pointer' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
                        Requires Site Survey
                        <span style={{ display: 'block', fontSize: 10.5, color: T.sub, marginTop: 2 }}>Mandatory on-site inspection before deployment</span>
                      </span>
                    </label>
                  </motion.div>
                )}

                {step === 'pricing' && (
                  <motion.div key="pricing" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <DarkInput label="Base Price (PHP) *" type="number" placeholder="0.00" value={form.price} onChange={(e) => upd('price', e.target.value)} icon={<span style={{ fontSize: 13, fontWeight: 700 }}>₱</span>} />
                      {errors.price && <p style={{ fontSize: 11, color: T.danger, marginTop: 5 }}>{errors.price}</p>}
                    </div>

                    <div style={{ padding: 16, borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.gold }}>Included Package Items</div>
                          <div style={{ fontSize: 10.5, color: T.sub, marginTop: 3 }}>Included in the package price; no per-item pricing.</div>
                        </div>
                        <button type="button" onClick={addPackageItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 10px', borderRadius: 8, color: T.gold, background: T.goldSoft, border: `1px solid ${T.goldLine}`, cursor: 'pointer', fontSize: 10.5, fontWeight: 800 }}><Plus size={13} /> Add Item</button>
                      </div>
                      {form.package_items.length === 0 ? <div style={{ padding: '13px', border: `1px dashed ${T.borderHi}`, borderRadius: 10, color: T.sub, fontSize: 11.5, textAlign: 'center' }}>No included items added yet.</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{form.package_items.map((item, index) => (
                        <div key={`package-item-${index}`} style={{ padding: 12, borderRadius: 10, background: T.ink2, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: T.sub, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Item {index + 1}</span><button type="button" onClick={() => removePackageItem(index)} aria-label={`Remove included item ${index + 1}`} style={{ display: 'flex', padding: 4, border: 'none', background: 'transparent', color: T.danger, cursor: 'pointer' }}><Trash2 size={14} /></button></div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 10 }}><DarkInput label="Name" placeholder="e.g. CCTV Camera" value={item.name || ''} onChange={(e) => updatePackageItem(index, 'name', e.target.value)} /><DarkInput label="Quantity" type="number" min="1" step="1" value={item.quantity ?? ''} onChange={(e) => updatePackageItem(index, 'quantity', e.target.value)} /></div>
                          <DarkTextarea label="Description" placeholder="Optional item description" value={item.description || ''} onChange={(e) => updatePackageItem(index, 'description', e.target.value)} style={{ minHeight: 68 }} />
                        </div>
                      ))}</div>}
                      {errors.package_items && <p style={{ fontSize: 11, color: T.danger, margin: '9px 0 0' }}>{errors.package_items}</p>}
                    </div>

                    <div style={{ padding: 20, borderRadius: 14, background: T.goldSoft, border: `1px solid ${T.goldLine}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.gold, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Wallet size={13} /> Downpayment Settings
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {[{ label: 'Percentage (%)', val: true }, { label: 'Fixed (₱)', val: false }].map((opt) => (
                          <button
                            key={String(opt.val)} type="button"
                            onClick={() => upd('is_percentage_downpayment', opt.val)}
                            style={{
                              flex: 1, padding: '11px', borderRadius: 9, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em',
                              background: form.is_percentage_downpayment === opt.val ? T.gold : T.surface,
                              color: form.is_percentage_downpayment === opt.val ? T.ink2 : T.sub,
                              border: `1px solid ${form.is_percentage_downpayment === opt.val ? T.gold : T.border}`,
                              cursor: 'pointer', transition: 'all 0.2s',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <DarkInput
                        placeholder={form.is_percentage_downpayment ? '50' : '5000'}
                        type="number"
                        value={form.downpayment_amount}
                        onChange={(e) => upd('downpayment_amount', e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 'media' && (
                  <motion.div key="media" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }}>
                    <div
                      style={{
                        position: 'relative', border: `2px dashed ${T.goldLine}`, borderRadius: 16,
                        background: 'rgba(232,176,0,0.03)', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        minHeight: 260, overflow: 'hidden', transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.gold)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.goldLine)}
                    >
                      {form.image_url ? (
                        <>
                          <img src={form.image_url} alt="Preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={28} style={{ color: T.success }} />
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Image Uploaded</span>
                            <span style={{ fontSize: 10.5, color: T.sub }}>Click to replace</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold }}>
                            <ImageIcon size={24} />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 4 }}>Upload Service Image</div>
                            <div style={{ fontSize: 11.5, color: T.sub }}>PNG, JPG, WEBP — max 5MB</div>
                          </div>
                        </div>
                      )}
                      <input type="file" accept="image/*" disabled={uploading} onChange={handleImageUpload}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                      {uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,23,26,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: T.gold }}>
                          <Loader2 size={20} style={{ animation: 'sm-spin 0.8s linear infinite' }} />
                          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Uploading…</span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: 10.5, color: T.sub, marginTop: 12, textAlign: 'center' }}>
                      Image is optional but recommended for better service presentation.
                    </p>
                  </motion.div>
                )}

                {step === 'review' && (
                  <motion.div key="review" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Base Price', val: form.price ? `₱${Number(form.price).toLocaleString()}` : '—' },
                        { label: 'Downpayment', val: form.downpayment_amount ? (form.is_percentage_downpayment ? `${form.downpayment_amount}%` : `₱${Number(form.downpayment_amount).toLocaleString()}`) : '—' },
                        { label: 'Site Survey', val: form.requires_survey ? 'Required' : 'Not Required' },
                        { label: 'Category', val: categories.find((c) => c.id === form.category_id)?.name || '—' },
                        { label: 'Duration', val: form.duration || '—' },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.sub }}>{row.label}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{row.val}</span>
                        </div>
                      ))}
                      {form.description && (
                        <div style={{ padding: '12px 16px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.sub, marginBottom: 6 }}>Description</div>
                          <p style={{ fontSize: 12.5, color: T.text, lineHeight: 1.65, margin: 0 }}>{form.description}</p>
                        </div>
                      )}
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.sub, marginBottom: 8 }}>Included Package Items</div>
                        {form.package_items.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{form.package_items.map((item, index) => <div key={`review-package-item-${index}`} style={{ fontSize: 12, color: T.text }}><strong>{item.name || 'Unnamed item'} × {item.quantity || 0}</strong>{item.description ? <span style={{ color: T.sub }}> — {item.description}</span> : null}</div>)}</div> : <div style={{ fontSize: 12, color: T.sub }}>No included items.</div>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {}
            <div style={{ flex: '0 0 340px', borderLeft: `1px solid ${T.border}`, background: T.ink2, padding: '28px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }} className="sm-scroll sm-preview-col">
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Eye size={12} style={{ color: T.gold }} /> Live Preview
              </div>
              <LivePreviewCard form={form} categories={categories} />
              <p style={{ fontSize: 10, color: T.sub, lineHeight: 1.6, margin: 0 }}>
                This preview reflects exactly what you've entered so far — nothing is simulated.
              </p>
            </div>
          </div>

          {}
          <div style={{ padding: '18px 28px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: T.ink2 }}>
            <GhostBtn onClick={step === 'identity' ? onClose : handleBack}>
              <ChevronLeft size={14} /> {step === 'identity' ? 'Cancel' : 'Back'}
            </GhostBtn>
            {step === 'review' ? (
              <GoldBtn onClick={handleSubmit} loading={saving} disabled={saving}>
                <CheckCircle2 size={15} /> {editingId ? 'Update Service' : 'Deploy Service'}
              </GoldBtn>
            ) : (
              <GoldBtn onClick={handleNext}>
                Continue <ChevronRight size={14} />
              </GoldBtn>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const CommandPalette = ({ isOpen, onClose, services, onEdit }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isOpen]);

  const results = services.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="cmd-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(3,11,13,0.82)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '18vh' }}
        onClick={onClose}
      >
        <motion.div
          key="cmd-panel"
          initial={{ opacity: 0, scale: 0.96, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -10 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 540, borderRadius: 16, background: T.ink, border: `1px solid ${T.borderHi}`, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderBottom: `1px solid ${T.border}` }}>
            <Command size={16} style={{ color: T.gold, flexShrink: 0 }} />
            <input
              ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 14.5 }}
            />
            <kbd style={{ background: T.goldSoft, border: `1px solid ${T.goldLine}`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: T.gold }}>ESC</kbd>
          </div>
          {results.length === 0 ? (
            <div style={{ padding: '34px 18px', textAlign: 'center', color: T.sub, fontSize: 12.5 }}>No services found</div>
          ) : results.map((s) => (
            <div
              key={s.id} onClick={() => { onEdit(s); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', cursor: 'pointer', borderBottom: '1px solid rgba(232,176,0,0.05)', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,176,0,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={14} style={{ color: T.gold }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                <div style={{ fontSize: 10.5, color: T.sub }}>{s.service_categories?.name} · ₱{Number(s.price).toLocaleString()}</div>
              </div>
              <ArrowRight size={14} style={{ color: T.sub, flexShrink: 0 }} />
            </div>
          ))}
          <div style={{ padding: '11px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 16 }}>
            {[['↵', 'to select'], ['ESC', 'to close']].map(([k, l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: T.sub, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <kbd style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: T.text }}>{k}</kbd> {l}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sr, cr] = await Promise.all([
      supabase.from('service_types').select('*, service_categories(name)').order('created_at', { ascending: false }),
      supabase.from('service_categories').select('*').order('name'),
    ]);
    if (!sr.error) setServices(sr.data || []);
    if (!cr.error) setCategories(cr.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('sm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_types' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const handleAddCategory = async () => {
    const { value } = await Swal.fire({ ...swalTheme, title: 'New Category', input: 'text', inputLabel: 'Category Name', showCancelButton: true });
    if (!value) return;
    const { data, error } = await supabase.from('service_categories').insert([{ name: value.toUpperCase() }]).select();
    if (!error) { setCategories((c) => [...c, data[0]]); toast('success', 'Category added'); }
    else toast('error', error.message);
  };

  const handleEditCategory = async (category) => {
    const { value } = await Swal.fire({ ...swalTheme, title: 'Rename Category', input: 'text', inputValue: category.name, inputLabel: 'Category Name', showCancelButton: true });
    const name = value?.trim();
    if (!name || name === category.name) return;
    const { error } = await supabase.from('service_categories').update({ name: name.toUpperCase() }).eq('id', category.id);
    if (error) { toast('error', error.message); return; }
    toast('success', 'Category updated');
    fetchData();
  };

  const handleSave = async (form) => {
    setSaving(true);
    const package_items = normalizePackageItems(form.package_items)
      .filter((item) => String(item.name || '').trim() && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0)
      .map((item) => ({ name: String(item.name).trim(), quantity: Number(item.quantity), description: String(item.description || '').trim() }));
    const payload = {
      title: form.title, category_id: form.category_id,
      price: parseFloat(form.price), duration: form.duration || 'N/A',
      requires_survey: form.requires_survey, description: form.description || '',
      image_url: form.image_url || '',
      downpayment_amount: parseFloat(form.downpayment_amount || 0),
      is_percentage_downpayment: form.is_percentage_downpayment,
      package_items,
      is_archived: false,
    };
    try {
      const { error } = editingId
        ? await supabase.from('service_types').update(payload).eq('id', editingId)
        : await supabase.from('service_types').insert([payload]);
      if (error) throw error;
      toast('success', editingId ? 'Service updated' : 'Service deployed');
      setIsModalOpen(false); setEditingId(null); setEditingForm(null);
      fetchData();
    } catch (err) { toast('error', err.message); }
    setSaving(false);
  };

  const handleArchive = async (id, current) => {
    const label = current ? 'Restore' : 'Archive';
    const service = services.find((s) => s.id === id);
    const res = await Swal.fire({
      ...swalTheme,
      title: `${label} Service?`,
      html: service ? `
        <div style="text-align:left;font-family:'DM Sans',sans-serif;">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
            ${service.image_url ? `<img src="${service.image_url}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;" />` : ''}
            <div>
              <div style="font-weight:700;font-size:14px;">${service.title}</div>
              <div style="font-size:11px;color:${T.sub};margin-top:2px;">${service.service_categories?.name || 'Uncategorized'} · ₱${Number(service.price).toLocaleString()}</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:${T.sub};">Current status: <strong style="color:${T.text}">${current ? 'Archived' : 'Active'}</strong></div>
        </div>
      ` : undefined,
      icon: 'warning',
      showCancelButton: true, confirmButtonColor: current ? T.success : T.danger,
      cancelButtonColor: T.ink3,
      confirmButtonText: label,
    });
    if (!res.isConfirmed) return;
    const { error } = await supabase.from('service_types').update({ is_archived: !current }).eq('id', id);
    if (!error) { toast('success', `Service ${label}d`); fetchData(); }
    else toast('error', error.message);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setEditingForm({ title: s.title, category_id: s.category_id, price: s.price, duration: s.duration, requires_survey: s.requires_survey, description: s.description, image_url: s.image_url, downpayment_amount: s.downpayment_amount, is_percentage_downpayment: s.is_percentage_downpayment, package_items: normalizePackageItems(s.package_items) });
    setIsModalOpen(true);
  };

  const filtered = services.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ = s.title.toLowerCase().includes(q) || s.service_categories?.name?.toLowerCase().includes(q);
    const matchC = !filterCat || s.category_id === filterCat;
    return s.is_archived === showArchived && matchQ && matchC;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    if (sortBy === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
    if (sortBy === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const totalRevenue = services.filter((s) => !s.is_archived).reduce((a, s) => a + (Number(s.price) || 0), 0);

  const stats = useMemo(() => ([
    { label: 'Active Services', val: services.filter((s) => !s.is_archived).length, format: (n) => n, col: T.gold },
    { label: 'Catalog Value', val: totalRevenue, format: (n) => `₱${n.toLocaleString()}`, col: T.success },
    { label: 'Categories', val: categories.length, format: (n) => n, col: T.info },
  ]), [services, totalRevenue, categories.length]);

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700;800&display=swap');
        @keyframes sm-spin { to { transform: rotate(360deg); } }
        @keyframes sm-shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        .sm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        @media (max-width: 1200px) { .sm-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 700px)  { .sm-grid { grid-template-columns: 1fr; } }
        .sm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .sm-category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 900px) { .sm-category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 580px) { .sm-category-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .sm-stats { grid-template-columns: 1fr 1fr; } }
        .sm-scroll::-webkit-scrollbar { width: 5px; }
        .sm-scroll::-webkit-scrollbar-thumb { background: rgba(232,176,0,0.18); border-radius: 3px; }
        @media (max-width: 860px) { .sm-preview-col { display: none; } }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid ${T.gold}; outline-offset: 2px;
        }
      `}</style>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} services={services} onEdit={openEdit} />

      {}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 16,
        padding: '22px 24px', borderRadius: 18, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${T.ink} 0%, ${T.ink2} 100%)`, border: `1px solid ${T.border}`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 8% 0%, ${T.goldSoft}, transparent 55%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 5 }}>
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 40, height: 40, borderRadius: 12, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, boxShadow: `0 0 18px ${T.gold}30` }}
            >
              <LayoutGrid size={18} />
            </motion.div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.02em', color: T.text, lineHeight: 1 }}>Service Management</div>
            <span style={{ background: T.goldSoft, border: `1px solid ${T.goldLine}`, borderRadius: 999, color: T.gold, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '4px 11px' }}>
              {services.length} {showArchived ? 'ARCHIVED' : 'ACTIVE'}
            </span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginLeft: 52 }}>
            Manage your service catalog, categories, pricing and customer requirements.
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCategories((visible) => !visible)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: showCategories ? T.goldSoft : T.surface, border: `1px solid ${showCategories ? T.borderHi : T.border}`, color: showCategories ? T.gold : T.sub, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer' }}
          ><FolderCog size={13} /> Manage Categories</button>
          <button
            onClick={() => setCmdOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.borderHi; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; }}
          >
            <Command size={13} /> Search <span style={{ opacity: 0.6 }}>⌘K</span>
          </button>
          <button
            onClick={() => setShowArchived((a) => !a)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: showArchived ? T.goldSoft : T.surface, border: `1px solid ${showArchived ? T.borderHi : T.border}`, color: showArchived ? T.gold : T.sub, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.18s' }}
          >
            {showArchived ? <Eye size={13} /> : <Archive size={13} />} {showArchived ? 'View Active' : 'Archives'}
          </button>
          <button
            onClick={fetchData} aria-label="Refresh"
            style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, border: `1px solid ${T.border}`, color: T.sub, cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; }}
          >
            <RefreshCw size={14} />
          </button>
          <GoldBtn onClick={() => { setEditingId(null); setEditingForm(null); setIsModalOpen(true); }}>
            <Plus size={14} /> New Service
          </GoldBtn>
        </div>
      </div>

      <AnimatePresence>
        {showCategories && <CategoryOverview categories={categories} services={services} activeCategory={filterCat} onView={setFilterCat} onEdit={handleEditCategory} onAdd={handleAddCategory} />}
      </AnimatePresence>

      {}
      <div className="sm-stats" style={{ marginBottom: 20 }}>
        {stats.map((item, i) => (
          <div key={i} style={{ padding: '15px 18px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.sub }}>{item.label}</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, letterSpacing: '0.02em', color: item.col }}>
              <CountUp value={item.val} format={item.format} />
            </div>
          </div>
        ))}
      </div>

      {}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.sub }} />
          <input
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services or categories…"
            style={{ width: '100%', background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, padding: '11px 14px 11px 40px', outline: 'none', boxSizing: 'border-box', transition: 'all 0.18s' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.goldSoft}`; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 9px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
          <ArrowUpDown size={13} style={{ color: T.sub }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort services" style={{ background: 'transparent', border: 'none', color: T.text, fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
            <option value="newest">Newest</option><option value="name">Name A–Z</option><option value="price-high">Price: high to low</option><option value="price-low">Price: low to high</option>
          </select>
        </div>
        {(searchQuery || filterCat || sortBy !== 'newest') && <button onClick={() => { setSearchQuery(''); setFilterCat(''); setSortBy('newest'); }} style={{ background: 'transparent', color: T.gold, border: 'none', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>Clear filters</button>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '4px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
          <button
            onClick={() => setFilterCat('')}
            style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
              background: !filterCat ? T.gold : 'transparent', color: !filterCat ? T.ink2 : T.sub,
              border: 'none', cursor: 'pointer', transition: 'all 0.18s',
            }}
          >
            All
          </button>
          {categories.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                background: filterCat === c.id ? T.gold : 'transparent', color: filterCat === c.id ? T.ink2 : T.sub,
                border: 'none', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {}
      {loading ? (
        <div className="sm-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ background: T.ink, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ height: 150, background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(232,176,0,0.06) 50%, rgba(255,255,255,0.02) 100%)', backgroundSize: '300% 100%', animation: 'sm-shimmer 1.8s ease-in-out infinite' }} />
              <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[70, 45, 90].map((w, j) => <div key={j} style={{ height: 11, width: `${w}%`, background: 'rgba(232,176,0,0.07)', borderRadius: 4 }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '84px 20px', gap: 16, borderRadius: 16, border: `1px dashed ${T.border}`, background: 'rgba(232,176,0,0.015)' }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 18, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold }}>
            <Package size={28} />
          </div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: T.text, letterSpacing: '0.02em' }}>
            {showArchived ? 'No Archived Services' : 'No Services Found'}
          </div>
          <div style={{ fontSize: 12.5, color: T.sub, textAlign: 'center', maxWidth: 320 }}>
            {showArchived ? 'Archived services will appear here once you archive one.' : 'Try adjusting your search or filters, or add a new service.'}
          </div>
          {!showArchived && <GoldBtn onClick={() => { setEditingId(null); setEditingForm(null); setIsModalOpen(true); }}><Plus size={14} /> Add First Service</GoldBtn>}
        </motion.div>
      ) : (
        <div className="sm-grid">
          <AnimatePresence mode="popLayout">
            {filtered.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                onEdit={() => openEdit(s)}
                onArchive={() => handleArchive(s.id, s.is_archived)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ServiceWizard
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingId(null); setEditingForm(null); }}
        editingId={editingId}
        initialForm={editingForm}
        categories={categories}
        onAddCategory={handleAddCategory}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
};

export default ServiceManagement;
