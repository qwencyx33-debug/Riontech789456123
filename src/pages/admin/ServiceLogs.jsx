// ServiceLogs.jsx
// ---------------------------------------------------------------------------
// Redesigned "Service Operations" screen — single self-contained file.
//
// WHAT CHANGED vs the original:
//  - Chart / donut / top-services / activity feed are no longer permanently
//    on screen — they're grouped into one collapsible "Insights" panel the
//    admin opens on demand (progressive disclosure), so the default view
//    fits in roughly one viewport.
//  - The 5 overview cards are real navigation: clicking one filters the
//    table by that status instantly.
//  - Row click / "view" now opens a full progressive Appointment Detail
//    flow (Appointment → Customer → Property → Service → Job → QC →
//    Payment) with a clickable step nav and Back/Next, instead of one
//    dense side drawer dumping every field at once.
//  - A document-style Receipt view lives inside the Payment step.
//  - Typography now pulls from one shared type scale instead of ad-hoc
//    all-caps letter-spaced labels everywhere.
//
// WHAT DIDN'T CHANGE (preserved on purpose):
//  - Supabase queries, realtime subscription, search/sort/filter, CSV
//    export, delete/bulk delete, ⌘K shortcut, date-range logic, and the
//    existing status color language.
//
// DATA NOTE: only the `appointments` table was guaranteed by the original
// code. The extra tables named in the brief (appointment_project_details,
// appointment_areas, service_reports, job_logs, job_photos, qc_reports,
// service_types, profiles) are queried defensively in AppointmentDetail —
// if a table/column doesn't exist in your schema, that section just
// collapses instead of erroring or faking data.
// ---------------------------------------------------------------------------

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Search, Download, Trash2, Eye, CheckCircle2, Clock, XCircle, Calendar,
  Activity, ClipboardList, X, RefreshCw, ArrowUpDown, TrendingUp, BarChart2,
  Inbox, Star, Bell, Edit3, ChevronRight, Check,
  User, MapPin, CreditCard, Wrench, ClipboardCheck, Camera, Mail, Phone,
  Home, Ruler, Layers, MessageSquare, Package, Timer, ShieldCheck,
  Receipt as ReceiptIcon, Printer,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, PieChart, Pie,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';



const INK = '#06171A';
const INK2 = '#030E10';
const INK3 = '#0C2B30';
const GOLD = '#E8B000';
const S = '#8CA8AD';       
const TEXT = '#F2F7F8';    
const SURFACE = 'rgba(12,43,48,0.6)';
const SURFACE2 = 'rgba(6,23,26,0.8)';

const RADIUS = { sm: 6, md: 8, lg: 10, pill: 20 };
const EASE = [0.16, 1, 0.3, 1];


const TYPE = {
  pageTitle: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 30, letterSpacing: '0.04em', lineHeight: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.2 },
  metric: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.03em', lineHeight: 1 },
  metricSm: { fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, letterSpacing: '0.03em', lineHeight: 1 },
  body: { fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
  bodySm: { fontSize: 13, fontWeight: 600, lineHeight: 1.5 },
  caption: { fontSize: 12, fontWeight: 500, color: S, lineHeight: 1.5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: S, textTransform: 'none' },
  microLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: S, textTransform: 'uppercase' },
};

const STATUS_CFG = {
  completed:   { color: '#10B981', bg: 'rgba(16,185,129,0.10)', label: 'Completed' },
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', label: 'Pending' },
  scheduled:   { color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', label: 'Scheduled' },
  approved:    { color: '#6366F1', bg: 'rgba(99,102,241,0.10)', label: 'Approved' },
  cancelled:   { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', label: 'Cancelled' },
  in_progress: { color: '#F97316', bg: 'rgba(249,115,22,0.10)', label: 'In Progress' },
};

const statusCfg = (s) => STATUS_CFG[s?.toLowerCase()] || STATUS_CFG.pending;

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(str) {
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(str)} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function jobDuration(startedAt, completedAt) {
  if (!startedAt) return 'Not started yet';
  if (!completedAt) return 'In progress';
  const ms = new Date(completedAt) - new Date(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function fmtCurrency(n) {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


function pick(row, keys) {
  if (!row) return null;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return null;
}

const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = statusCfg(status);
  const small = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 7px' : '3px 9px',
      background: cfg.bg, color: cfg.color,
      fontSize: small ? 9 : 10, fontWeight: 800,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      borderRadius: 4,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const Field = ({ label, value, mono = false, emphasis = false, icon = null }) => {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div>
      <div style={{ ...TYPE.microLabel, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        {icon}{label}
      </div>
      <div style={{
        fontSize: emphasis ? 16 : 14,
        fontWeight: emphasis ? 700 : 600,
        color: TEXT,
        fontFamily: mono ? 'monospace' : 'inherit',
        lineHeight: 1.4,
      }}>
        {value}
      </div>
    </div>
  );
};

const FieldGrid = ({ children, columns = 2 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${columns > 2 ? 130 : 190}px, 1fr))`, gap: '18px 16px' }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ ...TYPE.microLabel, marginBottom: 10 }}>{children}</div>
);

const SectionTitle = ({ children, right = null }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <div style={TYPE.sectionTitle}>{children}</div>
    {right}
  </div>
);

const StepNav = ({ steps, currentIndex, onSelect }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', paddingBottom: 2 }} className="ad-scroll">
    {steps.map((step, i) => {
      const done = i < currentIndex;
      const active = i === currentIndex;
      return (
        <React.Fragment key={step}>
          <button
            onClick={() => onSelect(i)}
            aria-current={active ? 'step' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 10px 6px 6px',
              borderRadius: RADIUS.pill,
              border: `1px solid ${active ? GOLD : 'transparent'}`,
              background: active ? 'rgba(232,176,0,0.10)' : 'transparent',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800,
              background: done ? '#10B981' : active ? GOLD : 'rgba(255,255,255,0.06)',
              color: done || active ? '#06171A' : S,
            }}>
              {done ? <Check size={11} /> : i + 1}
            </span>
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 600, color: active ? '#F2F7F8' : S }}>
              {step}
            </span>
          </button>
          {i < steps.length - 1 && <div style={{ width: 10, height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}
        </React.Fragment>
      );
    })}
  </div>
);

const StepFooter = ({ onBack, onNext, isFirst, isLast, currentStep, nextLabel = 'Next', backLabel = 'Back' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 18, marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
    <button
      onClick={onBack}
      disabled={isFirst}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: isFirst ? 'rgba(140,168,173,0.35)' : S,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: isFirst ? 'default' : 'pointer',
      }}
    >
      ← {backLabel}
    </button>
    <span style={{ fontSize: 11, fontWeight: 700, color: S }}>Step {currentStep + 1} of {STEPS.length}</span>
    <button
      onClick={onNext}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 7,
        background: GOLD,
        border: 'none',
        color: '#06171A',
        fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: 'pointer',
      }}
    >
      {isLast ? 'Done' : `${nextLabel} →`}
    </button>
  </div>
);

const AnimatedCounter = ({ value = 0, duration = 0.6 }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = prevRef.current;
    const to = Number(value) || 0;
    const step = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
};

const OverviewCard = ({ label, value, sub, icon, color = GOLD, loading, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15, ease: EASE }}
    style={{
      textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      background: SURFACE, border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: RADIUS.md, padding: '18px 18px 16px',
      display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
      minWidth: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      {onClick && <ChevronRight size={16} style={{ color: S, opacity: 0.6 }} />}
    </div>
    <div>
      {loading
        ? <div className="ad-shimmer" style={{ height: 30, width: '50%', borderRadius: 4 }} />
        : <div style={TYPE.metric}>{typeof value === 'number' ? <AnimatedCounter value={value} /> : value}</div>
      }
      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: S, marginTop: 2 }}>{sub}</div>}
    </div>
  </motion.button>
);


const EmptyState = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0' }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Inbox size={20} style={{ color: 'rgba(140,168,173,0.35)' }} />
    </div>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(242,247,248,0.6)' }}>{title}</div>
    {subtitle && <div style={{ fontSize: 11, color: S, maxWidth: 240, textAlign: 'center' }}>{subtitle}</div>}
    {action}
  </div>
);


const DashboardGlobalStyles = () => (
  <style>{`
    @keyframes ad-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes ad-spin { to { transform: rotate(360deg); } }
    @keyframes ad-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
    .ad-shimmer {
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.11) 37%, rgba(255,255,255,0.05) 63%);
      background-size: 400px 100%;
      animation: ad-shimmer 1.4s ease-in-out infinite;
    }
    .ad-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
    .ad-scroll::-webkit-scrollbar-track { background: transparent; }
    .ad-scroll::-webkit-scrollbar-thumb { background: rgba(232,176,0,0.15); border-radius: 2px; }
    button:focus-visible, [tabindex]:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
    @media (max-width: 820px) {
      .sl-analytics-grid, .sl-operations-grid { grid-template-columns: 1fr !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      .ad-shimmer, [style*="animation"] { animation-duration: 0.01ms !important; }
    }
  `}</style>
);


const STEPS = ['Appointment', 'Customer', 'Property', 'Areas', 'Items', 'Service', 'Job', 'Photos', 'Quality Control', 'Payment'];
const STEP_ICONS = [Calendar, User, Home, Wrench, ClipboardCheck, ShieldCheck, CreditCard];

async function safeSelect(table, matchCol, matchVal, opts = {}) {
  if (!matchVal) return opts.single ? null : [];
  try {
    let q = supabase.from(table).select('*').eq(matchCol, matchVal);
    if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? true });
    const { data, error } = opts.single ? await q.maybeSingle() : await q;
    if (error) return opts.single ? null : [];
    return data || (opts.single ? null : []);
  } catch {
    return opts.single ? null : [];
  }
}

function AppointmentDetail({ appointment, onClose, onEdit }) {
  const [step, setStep] = useState(0);
  const [extra, setExtra] = useState(null);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    setStep(0);
    if (!appointment) return;
    let cancelled = false;
    (async () => {
      setLoadingExtra(true);
      const id = appointment.id;
      const [
        project, areas, items, reports, logs, photos, qc, managerNotes, profile, technician, serviceType,
      ] = await Promise.all([
        safeSelect('appointment_project_details', 'appointment_id', id, { single: true }),
        safeSelect('appointment_areas', 'appointment_id', id),
        safeSelect('appointment_items', 'appointment_id', id),
        safeSelect('service_reports', 'appointment_id', id),
        safeSelect('job_logs', 'appointment_id', id, { order: 'created_at' }),
        safeSelect('job_photos', 'appointment_id', id),
        safeSelect('qc_reports', 'appointment_id', id, { single: true }),
        safeSelect('manager_notes', 'appointment_id', id, { order: 'created_at', ascending: false }),
        appointment.customer_id || appointment.user_id || appointment.profile_id
          ? safeSelect('profiles', 'id', appointment.customer_id || appointment.user_id || appointment.profile_id, { single: true })
          : null,
        appointment.technician_id
          ? safeSelect('profiles', 'id', appointment.technician_id, { single: true })
          : null,
        appointment.service_type_id
          ? safeSelect('service_types', 'id', appointment.service_type_id, { single: true })
          : null,
      ]);
      if (!cancelled) {
        const inspector = qc?.inspector_id
          ? await safeSelect('profiles', 'id', qc.inspector_id, { single: true }) : null;
        const managerIds = [...new Set((managerNotes || []).map(n => n.manager_id).filter(Boolean))];
        const managers = await Promise.all(managerIds.map(id => safeSelect('profiles', 'id', id, { single: true })));
        const managerMap = Object.fromEntries(managers.filter(Boolean).map(p => [p.id, p]));
        setExtra({ project, areas, items, reports, logs, photos, qc, managerNotes, profile, technician, inspector, managerMap, serviceType });
        setLoadingExtra(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appointment?.id]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!appointment) return null;
  const cfg = statusCfg(appointment.status);

  return (
    <AnimatePresence>
      <motion.div
        key="ad-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(3,14,16,0.8)', backdropFilter: 'blur(6px)', zIndex: 9998 }}
        onClick={onClose}
      />
      <motion.div
        key="ad-panel"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', top: '4vh', left: '50%', transform: 'translateX(-50%)',
          width: 'min(760px, 94vw)', height: '92vh', zIndex: 9999,
          background: `linear-gradient(180deg, ${INK3} 0%, ${INK2} 100%)`,
          border: '1px solid rgba(232,176,0,0.12)', borderRadius: 14,
          boxShadow: '0 40px 100px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: S, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                ← Back to list
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={TYPE.pageTitle}>{appointment.service_type || 'Appointment'}</div>
                <StatusBadge status={appointment.status} />
              </div>
              <div style={{ fontSize: 11, color: S, fontFamily: 'monospace', marginTop: 4 }}>
                #{appointment.id?.slice(0, 14).toUpperCase()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onEdit && (
                <button onClick={() => onEdit(appointment)} style={iconBtn}>
                  <Edit3 size={14} />
                </button>
              )}
              <button onClick={onClose} style={iconBtn} aria-label="Close">
                <X size={14} />
              </button>
            </div>
          </div>
          <StepNav steps={STEPS} currentIndex={step} onSelect={setStep} />
        </div>

        {}
        <div className="ad-scroll" style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
          {step === 0 && <StepAppointment appointment={appointment} />}
          {step === 1 && <StepCustomer appointment={appointment} profile={extra?.profile} loading={loadingExtra} />}
          {step === 2 && <StepProperty project={extra?.project} loading={loadingExtra} />}
          {step === 3 && <StepAreas areas={extra?.areas} loading={loadingExtra} />}
          {step === 4 && <StepItems items={extra?.items} loading={loadingExtra} />}
          {step === 5 && <StepService appointment={appointment} serviceType={extra?.serviceType} loading={loadingExtra} />}
          {step === 6 && <StepJob appointment={appointment} technician={extra?.technician} reports={extra?.reports} logs={extra?.logs} managerNotes={extra?.managerNotes} managerMap={extra?.managerMap} loading={loadingExtra} />}
          {step === 7 && <StepPhotos photos={extra?.photos} loading={loadingExtra} />}
          {step === 8 && <StepQC qc={extra?.qc} inspector={extra?.inspector} loading={loadingExtra} />}
          {step === 9 && <StepPayment appointment={appointment} />}
        </div>

        {}
        <div style={{ padding: '0 22px 20px', flexShrink: 0 }}>
          <StepFooter
            isFirst={step === 0}
            isLast={step === STEPS.length - 1}
            currentStep={step}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => step === STEPS.length - 1 ? onClose() : setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            nextLabel={STEPS[Math.min(step + 1, STEPS.length - 1)]}
            backLabel={step > 0 ? STEPS[step - 1] : 'Back'}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const iconBtn = {
  width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)', color: S, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

function StepAppointment({ appointment: a }) {
  const price = pick(a, ['price', 'total_price', 'amount', 'service_fee']);
  const time = fmtTime(a.schedule_date) || pick(a, ['schedule_time']);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', flex: '1 1 200px' }}>
          <SectionLabel>Schedule</SectionLabel>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{fmtDate(a.schedule_date)}</div>
          {time && <div style={{ fontSize: 13, color: S, marginTop: 2 }}>{time}</div>}
        </div>
        {price !== null && (
          <div style={{ padding: '16px 20px', background: 'rgba(232,176,0,0.06)', borderRadius: 10, border: '1px solid rgba(232,176,0,0.15)', flex: '1 1 160px' }}>
            <SectionLabel>Price</SectionLabel>
            <div style={{ ...TYPE.metricSm, color: GOLD }}>{fmtCurrency(price)}</div>
          </div>
        )}
      </div>

      <FieldGrid columns={2}>
        <Field label="Appointment Number" value={a.reference_number || a.id} mono />
        <Field label="Appointment Time" value={a.appointment_time || fmtTime(a.schedule_date)} />
        <Field label="Appointment Status" value={statusCfg(a.status).label} />
        <Field label="Priority" value={a.priority} />
        <Field label="Created" value={fmtDateTime(a.created_at)} />
        <Field label="Survey Required" value={a.requires_survey === null || a.requires_survey === undefined ? null : a.requires_survey ? 'Yes' : 'No'} />
        <Field label="Payment Status" value={a.payment_status} />
        <Field label="Payment Method" value={a.payment_method} />
        <Field label="Address" value={a.address} />
      </FieldGrid>

      {a.details && (
        <div>
          <SectionLabel>Notes</SectionLabel>
          <div style={{ fontSize: 13, color: '#C0D4D8', lineHeight: 1.7, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: `2px solid ${GOLD}40` }}>
            {a.details}
          </div>
        </div>
      )}
    </div>
  );
}

function StepCustomer({ appointment: a, profile, loading }) {
  const name = pick(profile, ['full_name', 'name']) || a.full_name;
  const email = pick(profile, ['email']) || a.email;
  const phone = pick(profile, ['phone', 'contact_number', 'phone_number']) || pick(a, ['phone', 'contact_number']);
  const address = a.address || pick(profile, ['address']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(232,176,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: GOLD, flexShrink: 0 }}>
          {name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{name || 'Unknown Customer'}</div>
          <div style={{ fontSize: 12, color: S }}>Customer</div>
        </div>
      </div>

      {loading ? (
        <div className="ad-shimmer" style={{ height: 80, borderRadius: 8 }} />
      ) : (
        <FieldGrid columns={2}>
          <Field label="Email" value={email} icon={<Mail size={11} />} />
          <Field label="Phone" value={phone} icon={<Phone size={11} />} />
          <Field label="Service Address" value={address} icon={<MapPin size={11} />} />
        </FieldGrid>
      )}
      {!loading && !email && !phone && !address && (
        <EmptyState title="No additional contact info on file" />
      )}
    </div>
  );
}

function StepProperty({ project, loading }) {
  if (loading) return <div className="ad-shimmer" style={{ height: 160, borderRadius: 8 }} />;
  if (!project) {
    return <EmptyState title="No property details were provided." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {project && (
        <>
          <div>
            <SectionLabel>Property</SectionLabel>
            <FieldGrid columns={2}>
              <Field label="Property Type" value={pick(project, ['property_type'])} icon={<Home size={11} />} />
              <Field label="Property Size" value={pick(project, ['property_size']) ? `${pick(project, ['property_size'])} ${pick(project, ['property_size_unit']) || ''}` : null} icon={<Ruler size={11} />} />
              <Field label="Floors" value={pick(project, ['floor_count', 'floors'])} icon={<Layers size={11} />} />
              <Field label="Rooms" value={pick(project, ['room_count', 'rooms'])} />
              <Field label="Unit" value={pick(project, ['unit', 'unit_number'])} />
            </FieldGrid>
          </div>

          {pick(project, ['site_notes']) && (
            <div>
              <SectionLabel>Site Notes</SectionLabel>
              <NoteBlock text={pick(project, ['site_notes'])} />
            </div>
          )}
          {pick(project, ['customer_requirements']) && (
            <div>
              <SectionLabel>Customer Requirements</SectionLabel>
              <NoteBlock text={pick(project, ['customer_requirements'])} />
            </div>
          )}
          {pick(project, ['customer_comments']) && (
            <div>
              <SectionLabel>Customer Comments</SectionLabel>
              <NoteBlock text={pick(project, ['customer_comments'])} icon={<MessageSquare size={11} />} />
            </div>
          )}
        </>
      )}

    </div>
  );
}

function StepAreas({ areas, loading }) {
  if (loading) return <div className="ad-shimmer" style={{ height: 160, borderRadius: 8 }} />;
  if (!areas?.length) return <EmptyState title="No area details were provided." />;
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
    {areas.map((area, i) => (
      <div key={area.id || i} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 14 }}>{area.area_name || `Area ${i + 1}`}</div>
        <FieldGrid columns={2}>
          <Field label="Size" value={area.area_size} />
          <Field label="Unit" value={area.area_size_unit} />
          <Field label="Quantity" value={area.quantity} />
        </FieldGrid>
        {area.notes && <div style={{ marginTop: 14 }}><NoteBlock text={area.notes} /></div>}
      </div>
    ))}
  </div>;
}

function StepItems({ items, loading }) {
  if (loading) return <div className="ad-shimmer" style={{ height: 160, borderRadius: 8 }} />;
  if (!items?.length) return <EmptyState title="No requested items were added." />;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {items.map((item, i) => (
      <div key={item.id || i} style={{ padding: '15px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9 }}>
        <SectionTitle right={<span style={{ color: GOLD, fontSize: 15, fontWeight: 800 }}>{fmtCurrency(item.total_price ?? (Number(item.quantity) * Number(item.unit_price)))}</span>}>{item.item_name || `Item ${i + 1}`}</SectionTitle>
        <FieldGrid columns={3}>
          <Field label="Quantity" value={item.quantity} />
          <Field label="Unit Price" value={item.unit_price !== null && item.unit_price !== undefined ? fmtCurrency(item.unit_price) : null} />
          <Field label="Total" value={item.total_price !== null && item.total_price !== undefined ? fmtCurrency(item.total_price) : null} />
        </FieldGrid>
        {item.description && <div style={{ fontSize: 12, color: S, marginTop: 12 }}>{item.description}</div>}
        {item.customer_comment && <div style={{ marginTop: 12 }}><NoteBlock text={item.customer_comment} icon={<MessageSquare size={11} />} /></div>}
      </div>
    ))}
  </div>;
}

function NoteBlock({ text, icon }) {
  return (
    <div style={{ fontSize: 13, color: '#C0D4D8', lineHeight: 1.7, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: `2px solid ${GOLD}40`, display: 'flex', gap: 8 }}>
      {icon && <span style={{ color: GOLD, opacity: 0.7, flexShrink: 0, marginTop: 2 }}>{icon}</span>}
      <span>{text}</span>
    </div>
  );
}

function StepService({ appointment: a, serviceType, loading }) {
  const name = pick(serviceType, ['name', 'title']) || a.service_type;
  const description = pick(serviceType, ['description']);
  const basePrice = pick(serviceType, ['base_price', 'price']) ?? pick(a, ['price', 'base_price']);
  const downpayment = pick(serviceType, ['downpayment_amount']) ?? pick(a, ['downpayment_paid']);
  const duration = pick(serviceType, ['duration', 'duration_minutes', 'estimated_duration']);
  const surveyRequired = pick(serviceType, ['requires_survey', 'survey_required']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <SectionLabel>Service</SectionLabel>
        <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{name}</div>
        {description && <div style={{ fontSize: 13, color: S, marginTop: 6, lineHeight: 1.6, maxWidth: 480 }}>{description}</div>}
      </div>

      {loading ? (
        <div className="ad-shimmer" style={{ height: 60, borderRadius: 8 }} />
      ) : (
        <FieldGrid columns={2}>
          <Field label="Base Price" value={basePrice !== null ? fmtCurrency(basePrice) : null} emphasis />
          <Field label="Downpayment" value={downpayment !== null ? fmtCurrency(downpayment) : null} />
          <Field label="Duration" value={duration ? (typeof duration === 'number' ? `${duration} min` : duration) : null} icon={<Timer size={11} />} />
          <Field label="Category" value={pick(serviceType, ['category_id'])} />
          <Field
            label="Survey Required"
            value={surveyRequired === null || surveyRequired === undefined ? null : (surveyRequired ? 'Yes' : 'No')}
          />
        </FieldGrid>
      )}
      {a.materials_notes && <div><SectionLabel>Materials & Requirements</SectionLabel><NoteBlock text={a.materials_notes} /></div>}
      {a.details && <div><SectionLabel>Customer Service Details</SectionLabel><NoteBlock text={a.details} /></div>}
    </div>
  );
}

function profileName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;
}

function StepJob({ appointment, technician, reports, logs, managerNotes, managerMap, loading }) {
  if (loading) return <div className="ad-shimmer" style={{ height: 160, borderRadius: 8 }} />;

  const latestReport = reports?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <SectionTitle>Technician Details</SectionTitle>
        {technician ? <FieldGrid columns={2}>
          <Field label="Technician" value={profileName(technician)} icon={<User size={11} />} />
          <Field label="Assigned" value={fmtDateTime(appointment.assigned_at)} />
          <Field label="Started" value={fmtDateTime(appointment.started_at)} />
          <Field label="Completed" value={fmtDateTime(appointment.completed_at)} />
          <Field label="Job Duration" value={jobDuration(appointment.started_at, appointment.completed_at)} emphasis />
        </FieldGrid> : <EmptyState title="No technician has been assigned yet." />}
      </div>

      {!latestReport && <EmptyState title="No service report has been submitted." />}
      {latestReport && (
        <div>
          <SectionLabel>Service Report</SectionLabel>
          <FieldGrid columns={2}>
            <Field label="Technician" value={pick(latestReport, ['technician_name', 'technician'])} icon={<User size={11} />} />
            <Field label="Status" value={pick(latestReport, ['status'])} />
            <Field label="Service Performed" value={pick(latestReport, ['service_performed', 'work_done'])} />
            <Field label="Items Used" value={pick(latestReport, ['items_used'])} icon={<Package size={11} />} />
            <Field label="Report Completion Time" value={pick(latestReport, ['completion_time']) ? fmtDateTime(pick(latestReport, ['completion_time'])) : null} />
          </FieldGrid>
          {pick(latestReport, ['technician_notes', 'notes']) && (
            <div style={{ marginTop: 14 }}>
              <NoteBlock text={pick(latestReport, ['technician_notes', 'notes'])} />
            </div>
          )}
        </div>
      )}

      {logs && logs.length > 0 && (
        <div>
          <SectionLabel>Activity History ({logs.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {logs.map((log, i) => (
              <div key={log.id || i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{log.action || 'Update'}</div>
                  <div style={{ fontSize: 10, color: S, marginTop: 2 }}>{fmtDateTime(log.created_at)}{log.performed_by ? ` · ${log.performed_by}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Manager Notes</SectionLabel>
        {!managerNotes?.length ? <EmptyState title="No manager notes are available." /> : managerNotes.map((note, i) => (
          <div key={note.id || i} style={{ marginBottom: 9 }}><NoteBlock text={note.note} icon={<MessageSquare size={11} />} /><div style={{ fontSize: 10, color: S, marginTop: 5 }}>{profileName(managerMap?.[note.manager_id]) || 'Manager'} · {fmtDateTime(note.created_at)}</div></div>
        ))}
      </div>
    </div>
  );
}

function StepPhotos({ photos, loading }) {
  const [preview, setPreview] = useState(null);
  if (loading) return <div className="ad-shimmer" style={{ height: 160, borderRadius: 8 }} />;
  if (!photos?.length) return <EmptyState title="No job photos were uploaded." />;
  const groups = ['before', 'during', 'after'].map(type => ({ type, photos: photos.filter(photo => String(photo.photo_type || '').toLowerCase() === type) })).filter(group => group.photos.length);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    {groups.length === 0 ? <EmptyState title="No categorized job photos were uploaded." /> : groups.map(group => (
      <div key={group.type}><SectionTitle>{group.type[0].toUpperCase() + group.type.slice(1)}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 9 }}>
          {group.photos.map((photo, i) => <button key={photo.id || i} onClick={() => setPreview(photo)} style={{ padding: 0, aspectRatio: '1', overflow: 'hidden', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}><img src={photo.photo_url} alt={`${group.type} job photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></button>)}
        </div>
      </div>
    ))}
    {preview && <ImagePreview src={preview.photo_url} label={preview.photo_type} onClose={() => setPreview(null)} />}
  </div>;
}

function ImagePreview({ src, label, onClose }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(3,14,16,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
    <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 100%)', maxHeight: '90vh', position: 'relative', background: INK2, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(232,176,0,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', color: TEXT, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}><span>{label || 'Image preview'}</span><button onClick={onClose} style={iconBtn}><X size={14} /></button></div>
      <img src={src} alt={label || 'Preview'} style={{ display: 'block', width: '100%', maxHeight: '76vh', objectFit: 'contain' }} />
    </motion.div>
  </motion.div>;
}

function StepQC({ qc, inspector, loading }) {
  if (loading) return <div className="ad-shimmer" style={{ height: 120, borderRadius: 8 }} />;
  if (!qc) return <EmptyState title="No QC report yet" subtitle="Quality control findings will appear here once inspection is complete." />;

  const isApproved = qc.approved === true;
  const qcStatus = qc.approved === true ? 'Approved' : qc.approved === false ? 'Not Approved' : 'Pending';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 10,
        background: isApproved ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
        border: `1px solid ${isApproved ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}>
        {isApproved ? <CheckCircle2 size={22} style={{ color: '#10B981' }} /> : <XCircle size={22} style={{ color: '#EF4444' }} />}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: isApproved ? '#10B981' : '#EF4444' }}>
            {qcStatus}
          </div>
          <div style={{ fontSize: 11, color: S }}>Quality control decision</div>
        </div>
      </div>

      <FieldGrid columns={2}>
        <Field label="Inspector" value={profileName(inspector) || 'Unknown inspector'} icon={<User size={11} />} />
        <Field label="Inspection Date" value={fmtDateTime(qc.created_at)} />
      </FieldGrid>

      {pick(qc, ['findings']) && (
        <div>
          <SectionLabel>Findings</SectionLabel>
          <NoteBlock text={pick(qc, ['findings'])} />
        </div>
      )}
      {pick(qc, ['remarks']) && (
        <div>
          <SectionLabel>Remarks</SectionLabel>
          <NoteBlock text={pick(qc, ['remarks'])} />
        </div>
      )}
    </div>
  );
}

function StepPayment({ appointment: a }) {
  const serviceFee = pick(a, ['price']);
  const downpayment = pick(a, ['downpayment_paid']);
  const amountPaid = downpayment;
  const balance = pick(a, ['remaining_balance', 'balance_due', 'balance']) ??
    (serviceFee !== null && amountPaid !== null ? Number(serviceFee) - Number(amountPaid) : null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReceiptImage, setShowReceiptImage] = useState(false);

  const rows = [
    { label: 'Service Fee', value: serviceFee },
    { label: 'Downpayment', value: downpayment },
    { label: 'Amount Paid', value: amountPaid },
    { label: 'Balance Due', value: balance },
  ].filter(r => r.value !== null && r.value !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {rows.length > 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: S, fontWeight: 600 }}>{r.label}</span>
              <span style={{
                fontSize: r.label === 'Balance Due' ? 18 : 14,
                fontWeight: 800,
                color: r.label === 'Balance Due' ? (Number(r.value) > 0 ? '#F59E0B' : '#10B981') : TEXT,
              }}>
                {fmtCurrency(r.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No financial data recorded for this appointment" />
      )}

      <FieldGrid columns={2}>
        <Field label="Payment Method" value={a.payment_method} icon={<CreditCard size={11} />} />
        <Field label="Payment Status" value={pick(a, ['payment_status'])} />
        <Field label="Payment Date" value={pick(a, ['payment_date']) ? fmtDate(pick(a, ['payment_date'])) : null} />
        <Field label="Payment Reference" value={a.payment_ref} mono />
        <Field label="Reference Number" value={a.reference_number} mono />
      </FieldGrid>

      {a.receipt_image && (
        <div>
          <SectionLabel>Receipt Image</SectionLabel>
          <button onClick={() => setShowReceiptImage(true)} style={{ padding: 0, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(232,176,0,0.15)', cursor: 'pointer', background: 'none' }}>
            <img src={a.receipt_image} alt="Receipt" style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 220 }} />
          </button>
        </div>
      )}

      <button
        onClick={() => setShowReceipt(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', borderRadius: 8, background: 'rgba(232,176,0,0.1)',
          border: '1px solid rgba(232,176,0,0.3)', color: GOLD, fontSize: 11, fontWeight: 800,
          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        <ReceiptIcon size={14} /> View Full Receipt
      </button>

      {showReceipt && (
        <Receipt appointment={a} rows={rows} balance={balance} onClose={() => setShowReceipt(false)} />
      )}
      {showReceiptImage && <ImagePreview src={a.receipt_image} label="Receipt" onClose={() => setShowReceiptImage(false)} />}
    </div>
  );
}

function Receipt({ appointment: a, rows, balance, onClose }) {
  const receiptId = pick(a, ['receipt_no', 'transaction_id']) || a.id?.slice(0, 8).toUpperCase();
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(3,14,16,0.85)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={onClose}>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(420px, 100%)', background: INK2, border: '1px solid rgba(232,176,0,0.2)',
            borderRadius: 12, padding: '28px 26px', fontFamily: 'monospace',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: S, textTransform: 'uppercase' }}>Service Receipt</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: GOLD, marginTop: 4 }}>#{receiptId}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <ReceiptRow label="Appointment ID" value={a.id?.slice(0, 14)} />
            <ReceiptRow label="Customer" value={a.full_name} />
            <ReceiptRow label="Service" value={a.service_type} />
            <ReceiptRow label="Appointment" value={`${fmtDate(a.schedule_date)}${fmtTime(a.schedule_date) ? ' · ' + fmtTime(a.schedule_date) : ''}`} />
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', borderBottom: '1px dashed rgba(255,255,255,0.15)', padding: '14px 0', margin: '14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.length > 0 ? rows.map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: S, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</span>
                <span style={{ color: TEXT, fontWeight: 700 }}>{fmtCurrency(r.value)}</span>
              </div>
            )) : <div style={{ fontSize: 11, color: S, textAlign: 'center' }}>No amounts recorded</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ReceiptRow label="Payment Method" value={a.payment_method} bold />
            <ReceiptRow label="Payment Status" value={pick(a, ['payment_status']) || (balance > 0 ? 'Partially Paid' : balance === 0 ? 'Paid' : null)} bold />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: TEXT, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: GOLD, border: 'none', borderRadius: 7, color: '#06171A', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReceiptRow({ label, value, bold }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: S, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: TEXT }}>{value}</div>
    </div>
  );
}

function useDebouncedValue(value, delay = 180) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const RADIAN = Math.PI / 180;
const DonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill={TEXT} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: INK2, border: '1px solid rgba(232,176,0,0.2)', borderRadius: 6, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ ...TYPE.microLabel, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: p.color || GOLD }}>
          {fmtCurrency(p.value)} <span style={{ fontSize: 10, color: S, fontWeight: 500 }}>received</span>
        </div>
      ))}
    </div>
  );
};

const activityIcon = (type) => {
  if (type === 'INSERT') return { icon: <Calendar size={12} />, color: '#3B82F6', label: 'Created' };
  if (type === 'UPDATE') return { icon: <Edit3 size={12} />, color: '#6366F1', label: 'Updated' };
  if (type === 'DELETE') return { icon: <Trash2 size={12} />, color: '#EF4444', label: 'Deleted' };
  return { icon: <ClipboardList size={12} />, color: GOLD, label: 'Event' };
};

function ServiceLogs({ onEdit }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInputRaw] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const setSearchInput = (v) => { setSearchInputRaw(v); setIsFiltering(true); };
  const debouncedSearch = useDebouncedValue(searchInput, 180);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [activityFeed, setActivityFeed] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [showActivity, setShowActivity] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setLogs(data);
      setLastSync(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    const ch = supabase.channel('sl-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        fetchLogs();
        const rec = payload.new || payload.old;
        setActivityFeed(prev => [{
          id: Date.now(),
          type: payload.eventType,
          name: rec?.full_name || 'Unknown',
          service: rec?.service_type || '',
          status: rec?.status || '',
          ts: new Date().toISOString(),
        }, ...prev].slice(0, 20));
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'));
    return () => supabase.removeChannel(ch);
  }, [fetchLogs]);

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); document.getElementById('sl-search')?.focus(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { setSearchTerm(debouncedSearch); setIsFiltering(false); }, [debouncedSearch]);

  const filterByDateRange = useCallback((data) => {
    if (dateRange === 'all') return data;
    const now = new Date();
    const start = new Date();
    if (dateRange === 'today') { start.setHours(0, 0, 0, 0); }
    else if (dateRange === 'yesterday') {
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      return data.filter(r => { const d = new Date(r.created_at); return d >= start && d <= end; });
    }
    else if (dateRange === '7d') { start.setDate(start.getDate() - 7); }
    else if (dateRange === '30d') { start.setDate(start.getDate() - 30); }
    else if (dateRange === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
    return data.filter(r => new Date(r.created_at) >= start);
  }, [dateRange]);

  const rangedLogs = filterByDateRange(logs);

  const paymentAmount = (appointment) => {
    const price = Number(appointment.price);
    const downpayment = Number(appointment.downpayment_paid);
    const paymentStatus = String(appointment.payment_status || '').toLowerCase();
    if (['paid', 'completed', 'fully_paid', 'full'].includes(paymentStatus) && Number.isFinite(price)) return price;
    return Number.isFinite(downpayment) && downpayment > 0 ? downpayment : 0;
  };
  const hasPayment = (appointment) => paymentAmount(appointment) > 0;
  const isToday = (date) => {
    if (!date) return false;
    const value = new Date(date);
    const today = new Date();
    return !Number.isNaN(value.getTime()) && value.toDateString() === today.toDateString();
  };

  const kpis = useMemo(() => ({
    sales: rangedLogs.reduce((sum, appointment) => sum + paymentAmount(appointment), 0),
    total: rangedLogs.length,
    active: rangedLogs.filter(l => ['scheduled', 'approved', 'in_progress'].includes(String(l.status).toLowerCase())).length,
    completed: rangedLogs.filter(l => String(l.status).toLowerCase() === 'completed').length,
    pending: rangedLogs.filter(l => String(l.status).toLowerCase() === 'pending').length,
  }), [rangedLogs]);

  const rangedChartData = useMemo(() => {
    const byDay = rangedLogs.reduce((acc, appointment) => {
      const amount = paymentAmount(appointment);
      if (!amount) return acc;
      const date = fmtDateShort(appointment.created_at);
      acc[date] = (acc[date] || 0) + amount;
      return acc;
    }, {});
    return Object.entries(byDay).slice(-31).map(([name, sales]) => ({ name, sales }));
  }, [rangedLogs]);

  const rangedStatusDist = useMemo(() => {
    const byStatus = rangedLogs.reduce((acc, r) => {
      const s = r.status || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const colMap = { completed: '#10B981', pending: '#F59E0B', scheduled: '#3B82F6', approved: '#6366F1', cancelled: '#EF4444', in_progress: '#F97316' };
    return Object.entries(byStatus).map(([name, value]) => ({ name, value, color: colMap[name] || GOLD }));
  }, [rangedLogs]);

  const topServices = useMemo(() => {
    const svc = {};
    rangedLogs.forEach(l => { if (l.service_type) svc[l.service_type] = (svc[l.service_type] || 0) + 1; });
    const total = rangedLogs.length || 1;
    return Object.entries(svc).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count], i) => ({ name, count, pct: Math.round((count / total) * 100), rank: i + 1 }));
  }, [rangedLogs]);

  const attentionItems = useMemo(() => [
    { label: 'Pending appointments', value: rangedLogs.filter(l => String(l.status).toLowerCase() === 'pending').length, color: '#F59E0B', filter: 'pending' },
    { label: 'Pending payments', value: rangedLogs.filter(l => !hasPayment(l) && String(l.status).toLowerCase() !== 'cancelled').length, color: '#EF4444', filter: 'all' },
    { label: "Today's appointments", value: logs.filter(l => isToday(l.schedule_date)).length, color: '#3B82F6', filter: 'all' },
    { label: 'High priority', value: rangedLogs.filter(l => ['high', 'urgent'].includes(String(l.priority).toLowerCase())).length, color: '#F97316', filter: 'all' },
  ], [rangedLogs, logs]);

  const todaySchedule = useMemo(() => logs.filter(l => isToday(l.schedule_date))
    .sort((a, b) => String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')))
    .slice(0, 5), [logs]);
  const recentTransactions = useMemo(() => rangedLogs.filter(hasPayment)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [rangedLogs]);

  const filtered = rangedLogs
    .filter(l => {
      const q = searchTerm.toLowerCase();
      const matchQ = !q || [l.full_name, l.service_type, l.address, l.status, l.id].some(v => v?.toLowerCase().includes(q));
      const matchS = statusFilter === 'all' || l.status === statusFilter;
      return matchQ && matchS;
    })
    .sort((a, b) => {
      const av = a[sortField] || '', bv = b[sortField] || '';
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = (f) => { if (sortField === f) setSortAsc(x => !x); else { setSortField(f); setSortAsc(true); } };
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)));

  const handleExport = () => {
    const rows = selected.size ? filtered.filter(l => selected.has(l.id)) : filtered;
    if (!rows.length) return;
    const hdrs = ['ID', 'Full Name', 'Service', 'Status', 'Schedule', 'Address', 'Payment Method', 'Created'];
    const csv = [hdrs.join(','), ...rows.map(r => [r.id, r.full_name, r.service_type, r.status, r.schedule_date, r.address, r.payment_method, r.created_at].map(v => `"${v || ''}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Operations_Log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'Delete Record?', text: 'This action cannot be undone.', icon: 'error', showCancelButton: true,
      confirmButtonColor: '#EF4444', cancelButtonColor: INK3, background: INK2, color: TEXT, confirmButtonText: 'Delete',
    });
    if (!res.isConfirmed) return;
    await supabase.from('appointments').delete().eq('id', id);
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: INK2, color: TEXT }).fire({ icon: 'success', title: 'Record deleted' });
    fetchLogs();
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    const res = await Swal.fire({
      title: `Delete ${selected.size} records?`, icon: 'error', showCancelButton: true,
      confirmButtonColor: '#EF4444', cancelButtonColor: INK3, background: INK2, color: TEXT, confirmButtonText: 'Delete All',
    });
    if (!res.isConfirmed) return;
    await supabase.from('appointments').delete().in('id', [...selected]);
    setSelected(new Set());
    fetchLogs();
  };

  const ColHead = ({ label, field }) => (
    <th style={{ padding: '12px 16px', textAlign: 'left', position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', backdropFilter: 'blur(8px)', zIndex: 1 }}>
      <button onClick={() => toggleSort(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, ...TYPE.microLabel, color: sortField === field ? GOLD : S, padding: 0 }}>
        {label} <ArrowUpDown size={10} style={{ opacity: sortField === field ? 1 : 0.35 }} />
      </button>
    </th>
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT }}>
      <DashboardGlobalStyles />
      <style>{`
        .sl-row { transition: background 0.15s; cursor: pointer; }
        .sl-row:hover { background: rgba(232,176,0,0.035) !important; }
        .sl-pill-btn { transition: all 0.15s; }
        .sl-pill-btn:hover { opacity: 0.85; }
      `}</style>

      <AnimatePresence>
        {activeLog && (
          <AppointmentDetail appointment={activeLog} onClose={() => setActiveLog(null)} onEdit={onEdit} />
        )}
      </AnimatePresence>

      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
        <div>
          <div style={{ ...TYPE.microLabel, marginBottom: 4 }}>{greeting.toUpperCase()}, ADMIN</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={TYPE.pageTitle}>Business Overview</div>
            <LiveDot connected={connected} />
          </div>
          <div style={{ fontSize: 13, color: S, marginTop: 5 }}>Monitor sales, appointments, payments, and service activity.</div>
          <div style={{ fontSize: 11, color: S, marginTop: 4 }}>
            {dateStr}{lastSync && <span style={{ marginLeft: 10, opacity: 0.6 }}>· Synced {timeAgo(lastSync)}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ActivityBell open={showActivity} setOpen={setShowActivity} feed={activityFeed} />
          <IconBtn onClick={fetchLogs} title="Refresh"><RefreshCw size={13} style={{ animation: loading ? 'ad-spin 1.2s linear infinite' : 'none' }} /></IconBtn>
          <button onClick={handleExport} style={pillBtnStyle}>
            <Download size={12} /> Export{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} style={{ ...pillBtnStyle, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
              <Trash2 size={12} /> Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {DATE_RANGES.map(dr => (
          <button key={dr.value} className="sl-pill-btn" onClick={() => setDateRange(dr.value)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: dateRange === dr.value ? GOLD : 'rgba(255,255,255,0.04)', border: `1px solid ${dateRange === dr.value ? GOLD : 'rgba(255,255,255,0.08)'}`, color: dateRange === dr.value ? INK2 : S, cursor: 'pointer' }}>
            {dr.label}
          </button>
        ))}
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
        <OverviewCard label="Total sales" value={fmtCurrency(kpis.sales)} sub="Payments received" icon={<CreditCard size={15} />} color={GOLD} loading={loading} />
        <OverviewCard label="Appointments" value={kpis.total} sub="For selected period" icon={<ClipboardList size={15} />} color="#3B82F6" loading={loading} onClick={() => setStatusFilter('all')} />
        <OverviewCard label="Pending" value={kpis.pending} sub="Requires attention" icon={<Clock size={15} />} color="#F59E0B" loading={loading} onClick={() => setStatusFilter('pending')} />
        <OverviewCard label="In Progress" value={kpis.active} sub="Active jobs" icon={<Activity size={15} />} color="#3B82F6" loading={loading} onClick={() => setStatusFilter('in_progress')} />
        <OverviewCard label="Completed" value={kpis.completed} sub="Finished jobs" icon={<CheckCircle2 size={15} />} color="#10B981" loading={loading} onClick={() => setStatusFilter('completed')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: 12, marginBottom: 12 }} className="sl-analytics-grid">
                <Panel title="Sales Performance" sub="Payments received in the selected period" icon={<TrendingUp size={14} />}>
                  <div style={{ height: 160 }}>
                    {rangedChartData.length ? <ResponsiveContainer>
                      <AreaChart data={rangedChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sl-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GOLD} stopOpacity={0.22} />
                            <stop offset="95%" stopColor={GOLD} stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(140,168,173,0.06)" vertical={false} />
                        <XAxis dataKey="name" stroke="none" tick={{ fontSize: 9, fill: S }} axisLine={false} tickLine={false} />
                        <YAxis stroke="none" tick={{ fontSize: 9, fill: S }} axisLine={false} tickLine={false} tickFormatter={value => `₱${value}`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="sales" stroke={GOLD} strokeWidth={2} fill="url(#sl-grad)" dot={false} activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: S, fontSize: 12 }}>No sales data available for this period.</div>}
                  </div>
                </Panel>

                <Panel title="Appointment Status" sub="Distribution" icon={<BarChart2 size={14} />}>
                  {rangedStatusDist.length > 0 ? (
                    <>
                      <div style={{ height: 120 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={rangedStatusDist} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={2} labelLine={false} label={DonutLabel}>
                              {rangedStatusDist.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: INK2, border: '1px solid rgba(232,176,0,0.2)', borderRadius: 6, color: TEXT, fontSize: 11 }} formatter={(val, name) => [val, statusCfg(name).label]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
                        {rangedStatusDist.map(s => (
                          <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                              <span style={{ fontSize: 10, fontWeight: 600, color: S, textTransform: 'capitalize' }}>{s.name.replace('_', ' ')}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: TEXT }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S, fontSize: 11 }}>No data</div>}
                </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, .8fr) minmax(0, 1.2fr)', gap: 12, marginBottom: 12 }} className="sl-operations-grid">
        <Panel title="Needs Attention" sub="Items requiring follow-up" icon={<Bell size={13} />}>
          {attentionItems.map(item => <button key={item.label} onClick={() => setStatusFilter(item.filter)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent', color: TEXT, cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 13, color: S }}>{item.label}</span><span style={{ color: item.color, fontWeight: 800, fontSize: 16 }}>{item.value}</span>
          </button>)}
        </Panel>
        <Panel title="Today's Schedule" sub="Appointments scheduled for today" icon={<Calendar size={13} />}>
          {todaySchedule.length ? todaySchedule.map(appointment => <button key={appointment.id} onClick={() => setActiveLog(appointment)} style={{ width: '100%', display: 'grid', gridTemplateColumns: '78px minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '7px 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{fmtTime(appointment.appointment_time) || '—'}</span><span style={{ minWidth: 0 }}><span style={{ display: 'block', color: TEXT, fontSize: 13, fontWeight: 700 }}>{appointment.full_name || 'Unnamed customer'}</span><span style={{ display: 'block', color: S, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appointment.service_type || 'Service not specified'}</span></span><StatusBadge status={appointment.status} size="sm" />
          </button>) : <div style={{ height: 108, display: 'grid', placeItems: 'center', color: S, fontSize: 12 }}>No appointments scheduled for today.</div>}
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, .8fr)', gap: 12, marginBottom: 12 }} className="sl-operations-grid">
        <Panel title="Recent Transactions" sub="Received payments in the selected period" icon={<CreditCard size={13} />}>
          {recentTransactions.length ? recentTransactions.map(transaction => <button key={transaction.id} onClick={() => setActiveLog(transaction)} style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 12, alignItems: 'center', padding: '8px 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}><span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: TEXT }}>{transaction.full_name || 'Unnamed customer'}</span><span style={{ display: 'block', fontSize: 11, color: S }}>{transaction.service_type || 'Service not specified'} · {fmtDateShort(transaction.created_at)}</span></span><span style={{ color: GOLD, fontSize: 13, fontWeight: 800 }}>{fmtCurrency(paymentAmount(transaction))}</span><span style={{ color: S, fontSize: 11 }}>{transaction.payment_status || 'Payment received'}</span></button>) : <div style={{ height: 108, display: 'grid', placeItems: 'center', color: S, fontSize: 12 }}>No transactions available for this period.</div>}
        </Panel>
        <Panel title="Top Services" sub="By booking volume" icon={<Star size={13} />}>
          {topServices.length === 0 ? <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 11, color: S }}>No service data</div> : topServices.map(svc => <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0' }}><span style={{ color: GOLD, fontWeight: 800, fontSize: 11 }}>{svc.rank}</span><span style={{ flex: 1, minWidth: 0, color: TEXT, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</span><span style={{ color: S, fontSize: 11 }}>{svc.count}</span></div>)}
        </Panel>
      </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <Panel title="Top Services" sub="By booking volume" icon={<Star size={13} />}>
                  {topServices.length === 0 ? <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 11, color: S }}>No service data</div> : topServices.map((svc, i) => (
                    <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < topServices.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: `${GOLD}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{svc.rank}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.name}</div>
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                          <div style={{ width: `${svc.pct}%`, height: '100%', background: GOLD, borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{svc.count}</div>
                        <div style={{ fontSize: 9, color: S }}>{svc.pct}%</div>
                      </div>
                    </div>
                  ))}
                </Panel>

                <Panel title="Recent Activity" sub="Live updates" icon={<Bell size={13} />} live>
                  <div className="ad-scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {activityFeed.length === 0 ? (
                      <EmptyState title="Listening for events…" />
                    ) : activityFeed.map((ev, i) => {
                      const { icon, color, label } = activityIcon(ev.type);
                      return (
                        <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}><span style={{ color }}>{label}</span> — {ev.name}</div>
                            <div style={{ fontSize: 9, color: S, marginTop: 2 }}>{ev.status && <StatusBadge status={ev.status} size="sm" />}</div>
                          </div>
                          <div style={{ fontSize: 9, color: S, flexShrink: 0 }}>{timeAgo(ev.ts)}</div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>

      {}
      <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: S, pointerEvents: 'none' }} />
            <input
              id="sl-search" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search client, service, address… (⌘K)"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: TEXT, fontSize: 12, padding: '8px 36px', outline: 'none', borderRadius: 7, boxSizing: 'border-box' }}
            />
            {searchInput && !isFiltering && (
              <button onClick={() => setSearchInput('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: S, cursor: 'pointer' }}><X size={12} /></button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['all', 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => {
              const cfg = s === 'all' ? { color: GOLD } : statusCfg(s);
              const active = statusFilter === s;
              return (
                <button key={s} className="sl-pill-btn" onClick={() => setStatusFilter(s)}
                  style={{ padding: '5px 12px', fontSize: 9, fontWeight: 800, textTransform: 'capitalize', background: active ? `${cfg.color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? cfg.color + '50' : 'rgba(255,255,255,0.07)'}`, color: active ? cfg.color : S, cursor: 'pointer', borderRadius: 5 }}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              );
            })}
          </div>
          {(searchInput || statusFilter !== 'all') && (
            <button onClick={() => { setSearchInput(''); setStatusFilter('all'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 10, fontWeight: 600, color: S, background: 'none', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, cursor: 'pointer' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        <div className="ad-scroll" style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '12px 16px', width: 40, position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', zIndex: 1 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                </th>
                <ColHead label="Client" field="full_name" />
                <ColHead label="Service" field="service_type" />
                <ColHead label="Status" field="status" />
                <ColHead label="Schedule" field="schedule_date" />
                <ColHead label="Created" field="created_at" />
                <th style={{ padding: '12px 16px', textAlign: 'right', position: 'sticky', top: 0, background: 'rgba(3,14,16,0.95)', zIndex: 1 }}>
                  <span style={TYPE.microLabel}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td colSpan={7} style={{ padding: '13px 16px' }}><div className="ad-shimmer" style={{ height: 20, borderRadius: 4 }} /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    title="No records found"
                    subtitle={searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters or search term.' : 'No appointments have been created yet.'}
                    action={(searchTerm || statusFilter !== 'all') && (
                      <button onClick={() => { setSearchInput(''); setStatusFilter('all'); }} style={{ padding: '7px 16px', fontSize: 10, fontWeight: 700, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, borderRadius: 6, cursor: 'pointer' }}>Clear Filters</button>
                    )}
                  />
                </td></tr>
              ) : filtered.map((log, idx) => {
                const initials = log.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                return (
                  <motion.tr key={log.id} className="sl-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(idx * 0.015, 0.2) }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: selected.has(log.id) ? 'rgba(232,176,0,0.04)' : 'transparent' }}
                    onClick={() => setActiveLog(log)}>
                    <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} style={{ accentColor: GOLD, cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(232,176,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{log.full_name}</div>
                          <div style={{ fontSize: 9, color: S, fontFamily: 'monospace' }}>{log.id?.slice(0, 10)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 11, fontWeight: 600, color: '#C0D4D8' }}>{log.service_type}</td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={log.status} /></td>
                    <td style={{ padding: '13px 16px', fontSize: 11, color: S, fontFamily: 'monospace' }}>{log.schedule_date || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: 10, color: S }}>{log.created_at ? timeAgo(log.created_at) : '—'}</td>
                    <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <RowIconBtn onClick={() => setActiveLog(log)} title="View details" hoverColor={GOLD}><Eye size={13} /></RowIconBtn>
                        {onEdit && <RowIconBtn onClick={() => onEdit(log)} title="Edit" hoverColor="#6366F1"><Edit3 size={13} /></RowIconBtn>}
                        <RowIconBtn onClick={() => handleDelete(log.id)} title="Delete" hoverColor="#EF4444"><Trash2 size={13} /></RowIconBtn>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '11px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: S, fontWeight: 600 }}>
            {filtered.length} of {rangedLogs.length} records
            {selected.size > 0 && <span style={{ color: GOLD, marginLeft: 8 }}>· {selected.size} selected</span>}
          </span>
          {activityFeed.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: S }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
              Last event: {timeAgo(activityFeed[0]?.ts)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const pillBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, borderRadius: 8,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: S,
  fontSize: 10, fontWeight: 700, cursor: 'pointer',
};

function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: S, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function RowIconBtn({ children, onClick, title, hoverColor }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hover ? `${hoverColor}15` : 'none', border: `1px solid ${hover ? hoverColor + '60' : 'transparent'}`, color: hover ? hoverColor : S, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function LiveDot({ connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444' }} />
      <span style={{ fontSize: 9, fontWeight: 800, color: connected ? '#10B981' : '#EF4444' }}>{connected ? 'Live' : 'Offline'}</span>
    </div>
  );
}

function ActivityBell({ open, setOpen, feed }) {
  return (
    <div style={{ position: 'relative' }}>
      <IconBtn onClick={() => setOpen(x => !x)} title="Recent activity">
        <span style={{ position: 'relative' }}>
          <Bell size={14} />
          {feed.length > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#10B981', border: `1.5px solid ${INK2}` }} />}
        </span>
      </IconBtn>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            style={{ position: 'absolute', top: 44, right: 0, width: 300, background: INK2, border: '1px solid rgba(232,176,0,0.15)', borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', ...TYPE.microLabel }}>Recent Activity</div>
            <div className="ad-scroll" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {feed.length === 0 ? <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 11, color: S }}>No recent activity</div> : feed.map(ev => {
                const { icon, color, label } = activityIcon(ev.type);
                return (
                  <div key={ev.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}: {ev.name}</div>
                      <div style={{ fontSize: 9, color: S }}>{ev.service} · {timeAgo(ev.ts)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({ title, sub, icon, children, live }) {
  return (
    <div style={{ background: SURFACE, backdropFilter: 'blur(12px)', borderRadius: 10, padding: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{title}</div>
          <div style={{ fontSize: 10, color: S }}>{sub}</div>
        </div>
        {live ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981' }}>Live</span>
          </div>
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${GOLD}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>{icon}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export default ServiceLogs;
