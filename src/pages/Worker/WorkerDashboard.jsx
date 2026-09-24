import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard, ClipboardList, LogOut, Loader2, Bell, MapPin,
  ChevronRight, Clock, CheckCircle2, Circle, AlertTriangle, Zap,
  Star, Wifi, FileText, Map, Menu, X, ClipboardCheck,
  MessageSquare, ShieldCheck, PlayCircle, Camera, ListChecks,
  Phone, User, Wrench, History, TrendingUp, Navigation, Sparkles, Package, ImagePlus
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

import DeploymentsView from './DeploymentsView';
import ServiceLogsView from './ServiceLogsView';
import NetworkMap from './NetworkMap';

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function greetingForNow(date) {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}


const PRIORITY_STYLES = {
  urgent: { label: 'Urgent', text: 'text-amber-300', bg: 'bg-amber-400/15', ring: 'ring-amber-400/40', dot: 'bg-amber-400', glow: 'shadow-[0_0_28px_-6px_rgba(251,191,36,0.45)]' },
  high: { label: 'High Priority', text: 'text-amber-200/90', bg: 'bg-amber-400/10', ring: 'ring-amber-400/25', dot: 'bg-amber-300/80', glow: 'shadow-[0_0_18px_-8px_rgba(251,191,36,0.3)]' },
  normal: { label: 'Standard', text: 'text-slate-300', bg: 'bg-white/[0.04]', ring: 'ring-white/10', dot: 'bg-slate-400', glow: '' },
};
function priorityStyle(p) {
  return PRIORITY_STYLES[(p || 'normal').toLowerCase()] || PRIORITY_STYLES.normal;
}

const STATUS_META = {
  pending: { label: 'Pending', order: 0, text: 'text-slate-400', bg: 'bg-white/[0.04]', ring: 'ring-white/10' },
  assigned: { label: 'Assigned', order: 1, text: 'text-slate-200', bg: 'bg-white/[0.05]', ring: 'ring-white/10' },
  in_progress: { label: 'In Progress', order: 2, text: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/30' },
  completed: { label: 'Completed', order: 3, text: 'text-slate-200', bg: 'bg-white/[0.06]', ring: 'ring-white/10' },
  cancelled: { label: 'Cancelled', order: -1, text: 'text-slate-500', bg: 'bg-white/[0.02]', ring: 'ring-white/5' },
};
function statusMeta(s) {
  return STATUS_META[(s || 'pending').toLowerCase()] || STATUS_META.pending;
}

function AmbientBackground() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const particles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${(i * 137.5) % 100}%`,
      top: `${(i * 71.3) % 100}%`,
      size: 2 + (i % 3),
      dur: 14 + (i % 7) * 3,
      delay: (i % 5) * -3,
    })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <motion.div
        className="absolute top-[-10%] left-[8%] h-[32rem] w-[32rem] rounded-full bg-amber-400/[0.05] blur-[110px]"
        animate={reduced ? {} : { x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] right-[5%] h-[28rem] w-[28rem] rounded-full bg-amber-500/[0.04] blur-[120px]"
        animate={reduced ? {} : { x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      {!reduced && particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-amber-300/20"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function GlassCard({ children, className = '', hover = true, glow = false, tilt = false, ...props }) {
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });

  const handleMove = (e) => {
    if (!tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 4);
    rx.set(-py * 4);
  };
  const handleLeave = () => {
    if (!tilt) return;
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -3 } : undefined}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`relative rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl
        shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.6)]
        ${glow ? 'shadow-[0_0_40px_-12px_rgba(251,191,36,0.18)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const s = priorityStyle(priority);
  const pulsing = (priority || '').toLowerCase() === 'urgent';
  return (
    <Badge className={`${s.bg} ${s.text} ${s.ring}`}>
      <motion.span
        animate={pulsing ? { opacity: [1, 0.35, 1] } : {}}
        transition={{ duration: 1.6, repeat: Infinity }}
        className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
      />
      {s.label}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const s = statusMeta(status);
  return <Badge className={`${s.bg} ${s.text} ${s.ring}`}>{s.label}</Badge>;
}

function useMagnetic(strength = 14) {
  const x = useSpring(0, { stiffness: 260, damping: 18 });
  const y = useSpring(0, { stiffness: 260, damping: 18 });
  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px * strength);
    y.set(py * strength);
  };
  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { x, y, onMouseMove, onMouseLeave };
}

function PrimaryButton({ children, onClick, className = '', loading = false, disabled = false, icon: Icon }) {
  const m = useMagnetic(10);
  return (
    <motion.button
      onMouseMove={m.onMouseMove}
      onMouseLeave={m.onMouseLeave}
      style={{ x: m.x, y: m.y }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
        bg-gradient-to-b from-amber-300 to-amber-500 text-[#0a0f1e]
        shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_10px_24px_-8px_rgba(251,191,36,0.55)]
        hover:shadow-[0_0_0_1px_rgba(253,224,71,0.7),0_12px_30px_-8px_rgba(251,191,36,0.7)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04060c]
        disabled:opacity-40 disabled:cursor-not-allowed transition-shadow duration-300 ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  );
}

function GhostButton({ children, onClick, className = '', icon: Icon, disabled = false }) {
  const m = useMagnetic(8);
  return (
    <motion.button
      onMouseMove={m.onMouseMove}
      onMouseLeave={m.onMouseLeave}
      style={{ x: m.x, y: m.y }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
        border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:border-amber-400/30
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04060c]
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors duration-200 ${className}`}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </motion.button>
  );
}

function SkeletonBlock({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/[0.04] ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function EmptyState({ title, subtitle, icon: Icon = ClipboardList }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl bg-amber-400/10 rounded-full" />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center"
        >
          <Icon size={24} className="text-amber-300/80" />
        </motion.div>
      </div>
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <p className="text-slate-500 text-sm mt-1.5 max-w-xs">{subtitle}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-36 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonBlock className="h-96 lg:col-span-2" />
        <SkeletonBlock className="h-96" />
      </div>
    </div>
  );
}

function ProgressRing({ value, size = 64, stroke = 6, label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped, 1000);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#f4c542" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white tabular-nums">{animated}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-300">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-600">{sublabel}</p>}
      </div>
    </div>
  );
}
const JOB_STAGES = [
  { key: 'assigned', label: 'Assigned', icon: ClipboardList },
  { key: 'started', label: 'Started', icon: PlayCircle },
  { key: 'working', label: 'Working', icon: Zap },
  { key: 'report', label: 'Report Submitted', icon: FileText },
  { key: 'qc', label: 'QC Review', icon: ShieldCheck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

function deriveStageIndex(job, reportSubmitted) {
  if (!job) return -1;
  const status = (job.status || '').toLowerCase();
  const qc = (job.qc_status || '').toLowerCase();
  if (status === 'completed' && (qc === 'approved' || qc === 'passed')) return 5;
  if (status === 'completed' || qc === 'pending' || qc === 'in_review') return 4;
  if (reportSubmitted) return 3;
  if (status === 'in_progress') return 2;
  if (job.started_at) return 1;
  return 0;
}

function JobProgressTimeline({ job, reportSubmitted }) {
  const activeIdx = deriveStageIndex(job, reportSubmitted);
  return (
    <div className="flex items-center w-full overflow-x-auto pb-1 -mx-1 px-1">
      {JOB_STAGES.map((stage, idx) => {
        const done = idx < activeIdx;
        const current = idx === activeIdx;
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-2 min-w-[76px]">
              <motion.div
                animate={current ? { boxShadow: ['0 0 0 0 rgba(251,191,36,0.5)', '0 0 0 10px rgba(251,191,36,0)'] } : {}}
                transition={{ duration: 1.6, repeat: current ? Infinity : 0 }}
                className={`h-9 w-9 rounded-full flex items-center justify-center border
                  ${done ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : ''}
                  ${current ? 'bg-amber-400 border-amber-300 text-[#0a0f1e]' : ''}
                  ${!done && !current ? 'bg-white/[0.03] border-white/10 text-slate-500' : ''}`}
              >
                <Icon size={16} />
              </motion.div>
              <span className={`text-[11px] text-center leading-tight ${current ? 'text-amber-300 font-semibold' : done ? 'text-slate-300' : 'text-slate-500'}`}>
                {stage.label}
              </span>
            </div>
            {idx < JOB_STAGES.length - 1 && (
              <div className="flex-1 h-px mx-1 min-w-[16px] bg-white/10 relative top-[-14px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: idx < activeIdx ? '100%' : '0%' }}
                  transition={{ duration: 0.6 }}
                  className="h-px bg-amber-400/70"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function valueOrNull(value) {
  return value === null || value === undefined || value === '' ? null : value;
}

function ProjectDetailsDrawer({ open, onClose, details, areas, items, notes, logs, loading }) {
  const facts = details ? [
    ['Property', details.property_type],
    ['Size', [details.property_size, details.property_size_unit].filter(valueOrNull).join(' ')],
    ['Floors', details.floor_count],
    ['Rooms', details.room_count],
  ].filter(([, value]) => valueOrNull(value)) : [];
  const latestNote = notes?.[0]?.note || notes?.[0]?.content || notes?.[0]?.manager_notes;
  return <AnimatePresence>{open && <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" />
    <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-white/[0.08] bg-[#070b14] shadow-[-30px_0_80px_-30px_rgba(0,0,0,.8)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[.06] bg-[#070b14]/95 px-5 py-4 backdrop-blur-xl"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Active assignment</p><h2 className="mt-1 text-lg font-bold text-white">Full project details</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-white"><X size={18} /></button></div>
      <div className="space-y-6 p-5">{loading ? <p className="text-sm text-slate-400">Loading project information…</p> : <>
        <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project details</p>{facts.length ? <div className="mt-3 grid grid-cols-2 gap-3">{facts.map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.03] p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-100">{value}</p></div>)}</div> : <p className="mt-2 text-sm text-slate-400">No project details provided.</p>}</section>
        {['customer_requirements', 'customer_comments', 'site_notes'].map((key) => details?.[key] ? <section key={key}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{key.replaceAll('_', ' ')}</p><p className="mt-2 rounded-xl border border-white/[.06] bg-white/[.03] p-3 text-sm leading-relaxed text-slate-200">{details[key]}</p></section> : null)}
        <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Areas</p>{areas?.length ? <div className="mt-3 space-y-2">{areas.map((area, i) => <div key={area.id || i} className="rounded-xl border border-white/[.06] bg-white/[.03] p-3"><p className="text-sm font-medium text-slate-100">{area.area_name || area.name || 'Unnamed area'}</p>{valueOrNull(area.area_size || area.size) && <p className="mt-1 text-xs text-slate-300">{area.area_size || area.size} {area.area_size_unit || area.size_unit || ''}</p>}{area.notes && <p className="mt-1 text-xs leading-relaxed text-slate-400">{area.notes}</p>}</div>)}</div> : <p className="mt-2 text-sm text-slate-400">No areas specified.</p>}</section>
        <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Required items</p>{items?.length ? <div className="mt-3 space-y-2">{items.map((item, i) => <div key={item.id || i} className="rounded-xl border border-white/[.06] bg-white/[.03] p-3"><p className="text-sm font-medium text-slate-100">{item.item_name || item.name || 'Required item'} <span className="text-slate-400">· Qty {item.quantity}</span></p>{(item.description || item.customer_comment) && <p className="mt-1 text-xs text-slate-400">{item.description || item.customer_comment}</p>}</div>)}</div> : <p className="mt-2 text-sm text-slate-400">No required items listed.</p>}</section>
        {(latestNote || logs?.length) && <section><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest activity</p>{latestNote && <p className="mt-2 rounded-xl border border-amber-400/15 bg-amber-400/[.05] p-3 text-sm text-slate-200">{latestNote}</p>}{logs?.slice(0, 4).map((log, i) => <p key={log.id || i} className="mt-2 text-sm text-slate-300">{log.action || log.description || 'Job activity'} <span className="text-xs text-slate-500">{timeAgo(log.created_at)}</span></p>)}</section>}
      </>}</div>
    </motion.aside>
  </>}</AnimatePresence>;
}

function JobWorkspace({ open, onClose, job, related, loading, actionLoading, onStart, onNavigate, onCall }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open, job?.id]);
  if (!job) return null;
  const note = related.notes?.[0]?.note || related.notes?.[0]?.content || related.notes?.[0]?.manager_notes || job.manager_notes;
  const fields = [
    ['Service', job.service_type], ['Description', job.details], ['Requirements', related.details?.customer_requirements],
    ['Customer comments', related.details?.customer_comments], ['Site notes', related.details?.site_notes],
  ].filter(([, value]) => valueOrNull(value));
  const titles = ['Job overview', 'Service details', 'Areas & items', 'Customer & location', 'Manager notes'];
  const atFinalStep = step === titles.length - 1;
  const content = [
    <div className="grid gap-4 sm:grid-cols-2" key="overview">{[['Service', job.service_type], ['Customer', job.full_name], ['Schedule', [job.schedule_date, job.appointment_time].filter(valueOrNull).join(' · ')], ['Location', job.address], ['Status', statusMeta(job.status).label]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.03] p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-sm font-semibold text-slate-100">{valueOrNull(value) || 'Not provided'}</p></div>)}</div>,
    <div className="space-y-3" key="details">{fields.length ? fields.map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.03] p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-sm leading-relaxed text-slate-200">{value}</p></div>) : <p className="rounded-xl border border-dashed border-white/[.1] p-5 text-center text-sm text-slate-400">No service details provided.</p>}</div>,
    <div className="grid gap-5 md:grid-cols-2" key="areas">{[['Service areas', related.areas, (area) => <><p className="text-sm font-semibold text-slate-100">{area.area_name || area.name || 'Unnamed area'}</p>{valueOrNull(area.area_size || area.size) && <p className="mt-1 text-xs text-slate-300">{area.area_size || area.size} {area.area_size_unit || area.size_unit || ''}</p>}{area.notes && <p className="mt-1 text-xs text-slate-400">{area.notes}</p>}</>], ['Service items', related.items, (item) => <><p className="text-sm font-semibold text-slate-100">{item.item_name || item.name || 'Required item'}</p><p className="mt-1 text-xs text-slate-300">Quantity: {item.quantity}</p>{(item.description || item.customer_comment) && <p className="mt-1 text-xs text-slate-400">{item.description || item.customer_comment}</p>}</>]].map(([title, rows, render]) => <section key={title}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>{rows?.length ? <div className="mt-3 space-y-2">{rows.map((row, i) => <div key={row.id || i} className="rounded-xl border border-white/[.07] bg-white/[.03] p-3">{render(row)}</div>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-white/[.1] p-4 text-center text-sm text-slate-400">No {title.toLowerCase()} specified.</p>}</section>)}</div>,
    <div className="space-y-4" key="customer"><section className="rounded-xl border border-white/[.07] bg-white/[.03] p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Customer</p><p className="mt-2 text-lg font-semibold text-white">{job.full_name || 'Customer not provided'}</p>{job.phone && <p className="mt-1 text-sm text-slate-300">{job.phone}</p>}</section><section className="rounded-xl border border-white/[.07] bg-white/[.03] p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Service address</p><p className="mt-2 text-sm text-slate-200">{job.address || 'Address not provided'}</p></section><div className="flex flex-wrap gap-3"><GhostButton icon={Phone} disabled={!job.phone} onClick={() => onCall(job)}>Call customer</GhostButton><GhostButton icon={Navigation} onClick={() => onNavigate(job)}>Open map</GhostButton></div></div>,
    <div key="notes">{note ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-5"><p className="text-sm leading-relaxed text-slate-100">{note}</p></div> : <p className="rounded-xl border border-dashed border-white/[.1] p-5 text-center text-sm text-slate-400">No manager instructions available.</p>}</div>,
  ];
  return <AnimatePresence>{open && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" /><motion.div initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[calc(100vh-2rem)] w-auto max-w-4xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/[.12] bg-[#070b14] shadow-2xl sm:inset-x-6"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Job workspace</p><h2 className="mt-1 text-lg font-bold text-white">{titles[step]}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-white"><X size={18} /></button></div><div className="flex gap-1.5 border-b border-white/[.06] px-5 py-3">{titles.map((title, index) => <div key={title} className="flex min-w-0 flex-1 items-center gap-1.5"><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === step ? 'bg-amber-400 text-[#070b14]' : index < step ? 'bg-amber-400/15 text-amber-300' : 'bg-white/[.06] text-slate-500'}`}>{String(index + 1).padStart(2, '0')}</span><span className={`hidden truncate text-xs sm:block ${index === step ? 'text-slate-100' : 'text-slate-500'}`}>{title}</span></div>)}</div><div className="min-h-0 overflow-y-auto p-5 md:p-6">{loading ? <p className="text-sm text-slate-400">Loading job information…</p> : <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .16 }}>{content[step]}</motion.div></AnimatePresence>}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] px-5 py-4"><GhostButton onClick={step === 0 ? onClose : () => setStep((current) => current - 1)}>{step === 0 ? 'Close' : '← Back'}</GhostButton>{atFinalStep && (job.status || '').toLowerCase() === 'assigned' ? <PrimaryButton loading={actionLoading} icon={PlayCircle} onClick={onStart}>Start service</PrimaryButton> : <PrimaryButton icon={ChevronRight} onClick={() => atFinalStep ? onClose() : setStep((current) => current + 1)}>{atFinalStep ? 'Done' : 'Next →'}</PrimaryButton>}</div></motion.div></>}</AnimatePresence>;
}

function MissionControl({ job, tasks, details, checklist, related, loading, actionLoading, onStart, onComplete, onNavigate, onOpenDetails, onOpenJobs }) {
  if (!job) {
    const assigned = tasks.filter((task) => (task.status || '').toLowerCase() === 'assigned').length;
    const completed = tasks.filter((task) => (task.status || '').toLowerCase() === 'completed').length;
    return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><GlassCard hover={false} className="p-6"><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Technician status</p><div className="mt-4 flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,.7)]" /><div><h1 className="text-2xl font-bold text-white">Available</h1><p className="mt-1 text-sm text-slate-300">No active service assignment</p></div></div><div className="mt-6 grid grid-cols-3 gap-3">{[['Active', 0], ['Assigned', assigned], ['Completed', completed]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.03] p-3"><p className="text-xl font-bold text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div></GlassCard><GlassCard hover={false} className="p-6"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">System status</p><div className="mt-4 space-y-3">{['Connected', 'Live updates', 'Notifications'].map((label) => <p key={label} className="flex items-center gap-2 text-sm text-slate-200"><span className="h-2 w-2 rounded-full bg-amber-300" />{label}</p>)}</div></GlassCard></div>;
  }
  const status = (job.status || '').toLowerCase();
  const photoCount = related.photos?.length || 0;
  const report = related.reports?.[0];
  const note = related.notes?.[0]?.note || related.notes?.[0]?.content || related.notes?.[0]?.manager_notes || job.manager_notes;
  const next = status === 'assigned' ? { label: 'Start Job', detail: 'Confirm you have arrived and begin service.', icon: PlayCircle, onClick: onStart } : status === 'in_progress' && !photoCount ? { label: 'Upload Service Photos', detail: 'Document the service before finishing.', icon: Camera, onClick: onOpenJobs } : status === 'in_progress' && !report ? { label: 'Submit Service Report', detail: 'Record the service performed and technician notes.', icon: FileText, onClick: onOpenJobs } : status === 'in_progress' ? { label: 'Complete Service', detail: 'Photos and report are on file. Mark service complete.', icon: CheckCircle2, onClick: onComplete } : { label: job.qc_status ? 'Waiting for QC' : 'Ready for QC', detail: 'Service is complete. Quality review will be handled by the manager.', icon: ShieldCheck };
  const facts = details ? [['Property', details.property_type], ['Size', [details.property_size, details.property_size_unit].filter(valueOrNull).join(' ')], ['Floors', details.floor_count], ['Rooms', details.room_count]].filter(([, v]) => valueOrNull(v)) : [];
  const NextIcon = next.icon;
  return <div className="space-y-4">
    <GlassCard hover={false} glow className="overflow-hidden p-5 md:p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-300">Today's assignment</p><h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">{job.service_type || 'Service appointment'}</h1><p className="mt-1 text-lg font-medium text-slate-200">{job.full_name || 'Customer'}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300"><span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-300" />{job.schedule_date || 'Date to be confirmed'} · {job.appointment_time || 'Time to be confirmed'}</span><span className="flex items-center gap-1.5"><MapPin size={14} className="text-amber-300" />{job.address || 'Location not provided'}</span></div></div><StatusBadge status={job.status} /></div><div className="mt-5 border-t border-white/[.06] pt-4"><JobProgressTimeline job={job} reportSubmitted={!!report} /></div></GlassCard>
    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><GlassCard hover={false} className="border-amber-400/25 bg-amber-400/[.055] p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-300">Next action</p><div className="mt-2 flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-white">{next.label}</h2><p className="mt-1 text-sm text-slate-300">{next.detail}</p></div>{next.onClick && <PrimaryButton loading={actionLoading} icon={NextIcon} onClick={next.onClick}>{next.label}</PrimaryButton>}</div></GlassCard><GlassCard hover={false} className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service status</p><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><p className="text-lg font-bold text-white">{photoCount}</p><p className="text-xs text-slate-400">Photos</p></div><div><p className="text-lg font-bold text-white">{report ? 'Yes' : 'No'}</p><p className="text-xs text-slate-400">Report</p></div><div><p className="text-lg font-bold text-amber-300">{job.qc_status || '—'}</p><p className="text-xs text-slate-400">QC</p></div></div></GlassCard></div>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><GlassCard hover={false} className="p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project at a glance</p><GhostButton className="px-3 py-2 text-xs" onClick={onOpenDetails} icon={ChevronRight}>Full details</GhostButton></div>{loading ? <p className="mt-4 text-sm text-slate-400">Loading project details…</p> : facts.length ? <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{facts.map(([label, value]) => <div key={label}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-100">{value}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-400">No project details provided.</p>}</GlassCard><GlassCard hover={false} className="p-5">{note ? <><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300"><MessageSquare size={13} /> Manager instruction</p><p className="mt-3 text-sm leading-relaxed text-slate-200">{note}</p></> : <><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manager instruction</p><p className="mt-3 text-sm text-slate-400">No manager instructions.</p></>}</GlassCard></div>
    <div className="flex flex-wrap gap-3"><PrimaryButton icon={ChevronRight} onClick={onOpenDetails}>View job</PrimaryButton><GhostButton icon={Navigation} onClick={onNavigate}>Navigate</GhostButton><GhostButton icon={ImagePlus} onClick={onOpenJobs}>Photos & report</GhostButton><GhostButton icon={Package} onClick={onOpenDetails}>Areas & required items</GhostButton></div>
  </div>;
}

function MissionHeader({ technicianName, tasks, activeJob }) {
  const now = new Date();
  const greeting = greetingForNow(now);
  const firstName = (technicianName || 'Technician').split(' ')[0];
  const totalAssigned = useCountUp(tasks.length);

  return (
    <GlassCard hover={false} className="relative overflow-hidden p-7 md:p-8 mb-6">
      <motion.div
        className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, -8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="text-amber-300/80 text-xs font-semibold tracking-[0.2em] uppercase mb-2">Your mission today</p>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold text-white"
          >
            {greeting}, {firstName}
          </motion.h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            {activeJob
              ? <>You're currently on <span className="text-white font-medium">{activeJob.full_name || 'a job'}</span>.</>
              : tasks.length > 0
                ? 'No job in progress — pick up your next assignment when ready.'
                : "You're all clear. No jobs scheduled."}
          </p>
        </div>
        <div className="flex gap-6 md:gap-10">
          <div>
            <p className="text-3xl font-bold text-white tabular-nums">{totalAssigned}</p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">Jobs Today</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-300 tabular-nums">{activeJob ? 1 : 0}</p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">Active Now</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white tabular-nums">
              {tasks.filter((t) => t.status === 'completed').length}
            </p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-wide">Completed</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function ChecklistRow({ done, label, hint }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {done
        ? <CheckCircle2 size={18} className="text-amber-300 shrink-0" />
        : <Circle size={18} className="text-slate-600 shrink-0" />}
      <div className="min-w-0">
        <p className={`text-sm ${done ? 'text-slate-200' : 'text-slate-500'}`}>{label}</p>
        {hint && <p className="text-xs text-slate-600">{hint}</p>}
      </div>
    </div>
  );
}

function ActiveJobCenter({ job, checklist, onStart, onContinue, onComplete, onNavigate, onCall, onViewCustomer }) {
  if (!job) {
    return (
      <GlassCard className="p-0 overflow-hidden">
        <EmptyState
          title="No Active Job"
          subtitle="You're all caught up. Start your next assignment from today's timeline below."
          icon={Zap}
        />
      </GlassCard>
    );
  }

  const p = priorityStyle(job.priority);
  const allDone = checklist.serviceCompleted && checklist.photosUploaded && checklist.reportSubmitted && checklist.qcReady;

  return (
    <GlassCard hover={false} glow tilt className={`p-6 md:p-7 relative overflow-hidden ${p.glow}`}>
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <PriorityBadge priority={job.priority} />
            <StatusBadge status={job.status} />
          </div>
          <button
            onClick={() => onViewCustomer?.(job)}
            className="group flex items-center gap-1.5 text-left focus-visible:outline-none"
          >
            <h2 className="text-xl md:text-2xl font-bold text-white truncate group-hover:text-amber-200 transition-colors">
              {job.full_name || 'Customer'}
            </h2>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
          <p className="text-slate-400 text-sm mt-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-amber-300/70 shrink-0" /> {job.address || 'Address not provided'}
          </p>
          {job.phone && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
              <Phone size={12} className="text-amber-300/60 shrink-0" /> {job.phone}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Scheduled</p>
          <p className="text-white font-semibold flex items-center gap-1.5 sm:justify-end mt-1">
            <Clock size={14} className="text-amber-300" /> {job.appointment_time || '—'}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">{job.schedule_date || ''}</p>
        </div>
      </div>

      {}
      <div className="relative mt-6 pt-5 border-t border-white/[0.06]">
        <JobProgressTimeline job={job} reportSubmitted={checklist.reportSubmitted} />
      </div>

      {}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Service Requested</p>
          <p className="text-slate-100 text-sm font-medium mt-1">{job.service_type || 'General Service'}</p>
          {job.details && <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{job.details}</p>}
        </div>
        <div className="rounded-xl bg-amber-400/[0.05] border border-amber-400/[0.15] p-3.5">
          <p className="text-amber-300/80 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare size={12} /> Manager Instructions
          </p>
          <p className="text-slate-200 text-sm mt-1 leading-relaxed">
            {job.manager_notes || 'No special instructions for this job.'}
          </p>
        </div>
      </div>

      {}
      <div className="relative mt-5 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
          <ListChecks size={13} /> Job Completion Checklist
        </p>
        <div className="divide-y divide-white/[0.04]">
          <ChecklistRow done={checklist.serviceCompleted} label="Service completed" />
          <ChecklistRow done={checklist.photosUploaded} label="Photos uploaded" hint={`${checklist.photoCount} photo${checklist.photoCount === 1 ? '' : 's'} on file`} />
          <ChecklistRow done={checklist.reportSubmitted} label="Report submitted" />
          <ChecklistRow done={checklist.qcReady} label="QC ready" />
        </div>
      </div>

      {/* Actions */}
      <div className="relative flex flex-wrap gap-3 mt-5">
        <GhostButton icon={MapPin} onClick={() => onNavigate?.(job)}>Navigate</GhostButton>
        <GhostButton icon={Phone} onClick={() => onCall?.(job)} disabled={!job.phone}>Call Customer</GhostButton>
        {job.status === 'in_progress' ? (
          <>
            <PrimaryButton icon={Zap} onClick={() => onContinue?.(job)}>Continue Job</PrimaryButton>
            <GhostButton
              icon={CheckCircle2}
              onClick={() => allDone && onComplete?.(job)}
              className={!allDone ? 'opacity-40 cursor-not-allowed' : ''}
            >
              Complete Job
            </GhostButton>
          </>
        ) : job.status === 'completed' ? null : (
          <PrimaryButton icon={PlayCircle} onClick={() => onStart?.(job)}>Start Job</PrimaryButton>
        )}
      </div>
    </GlassCard>
  );
}

function TodayTimeline({ tasks, activeJob }) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || '')),
    [tasks]
  );

  if (sorted.length === 0) {
    return (
      <GlassCard className="p-0 overflow-hidden">
        <EmptyState title="No Jobs Scheduled" subtitle="Nothing on the mission plan for today." icon={Clock} />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
        <Clock size={15} className="text-amber-300" /> Today's Mission Plan
      </h3>
      <div className="relative pl-5">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-amber-400/40 via-white/10 to-transparent" />
        <div className="space-y-3.5">
          {sorted.map((job, idx) => {
            const isActive = activeJob && job.id === activeJob.id;
            const isDone = job.status === 'completed';
            return (
              <motion.div
                key={job.id || idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ x: 2 }}
                className="relative flex items-start gap-3"
              >
                <span className={`absolute -left-5 top-2 h-3 w-3 rounded-full ring-4 ring-[#04060c]
                  ${isActive ? 'bg-amber-400' : isDone ? 'bg-white/40' : 'bg-white/15'}`} />
                <div className={`flex-1 rounded-xl border px-3.5 py-2.5 transition-colors
                  ${isActive ? 'bg-amber-400/[0.06] border-amber-400/25' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>
                      {job.full_name || 'Job'}
                    </p>
                    <span className="text-xs text-slate-500 shrink-0">{job.appointment_time || '—'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{job.service_type || 'Service'}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

function PerformancePanel({ tasks }) {
  const completed = tasks.filter((t) => t.status === 'completed');
  const ratings = completed.map((t) => t.customer_rating).filter((r) => typeof r === 'number');
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
  const satisfactionPct = ratings.length ? Math.round((avgRating / 5) * 100) : 0;
  const successPct = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  const durations = completed
    .filter((t) => t.started_at && t.completed_at)
    .map((t) => new Date(t.completed_at) - new Date(t.started_at))
    .filter((d) => d > 0);
  const fastest = durations.length ? Math.min(...durations) : null;

  const latestFeedback = [...completed]
    .filter((t) => t.customer_feedback)
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];

  return (
    <GlassCard className="p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
        <TrendingUp size={15} className="text-amber-300" /> Performance
      </h3>

      <div className="flex items-center justify-around">
        <ProgressRing value={successPct} label="Success Rate" sublabel={`${completed.length}/${tasks.length} jobs`} />
        <ProgressRing value={satisfactionPct} label="Satisfaction" sublabel={ratings.length ? `${avgRating.toFixed(1)} avg rating` : 'No ratings yet'} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-xl font-bold text-white">{completed.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Completed</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-xl font-bold text-amber-300">{fastest ? formatDuration(fastest) : '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Fastest Job</p>
        </div>
      </div>

      {latestFeedback && (
        <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-xs text-slate-500 mb-1">Latest feedback</p>
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">"{latestFeedback.customer_feedback}"</p>
        </div>
      )}
    </GlassCard>
  );
}

function NotificationCenter({ open, onClose, notifications }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed top-16 right-4 md:right-8 w-[calc(100%-2rem)] max-w-sm z-50 rounded-2xl border border-white/10
              bg-[#0a0f1e]/95 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <p className="text-white font-semibold text-sm">Mission Feed</p>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <EmptyState title="Nothing new" subtitle="Manager updates and job activity will show up here." icon={Bell} />
              ) : (
                notifications.map((n, i) => (
                  <motion.div
                    key={n.id || i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-4 py-3 border-b border-white/[0.04] last:border-0 flex items-start gap-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <Bell size={14} className="text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200">{n.message}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CustomerSlideOver({ open, onClose, job, tasks }) {
  const history = useMemo(() => {
    if (!job) return [];
    return tasks
      .filter((t) => t.id !== job.id && (
        (job.phone && t.phone === job.phone) ||
        (job.full_name && t.full_name === job.full_name)
      ))
      .sort((a, b) => new Date(b.schedule_date || b.appointment_time || 0) - new Date(a.schedule_date || a.appointment_time || 0));
  }, [job, tasks]);

  if (!job) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#070b14] border-l border-white/[0.08]
              shadow-[-30px_0_80px_-30px_rgba(0,0,0,0.7)] overflow-y-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]
              bg-[#070b14]/90 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <User size={16} className="text-amber-300" />
                <p className="text-white font-semibold text-sm">Customer Profile</p>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">{job.full_name || 'Customer'}</h2>
                <div className="mt-2 space-y-1.5">
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <MapPin size={14} className="text-amber-300/70 shrink-0" /> {job.address || 'Address not provided'}
                  </p>
                  {job.phone && (
                    <a href={`tel:${job.phone}`} className="text-sm text-slate-400 flex items-center gap-2 hover:text-amber-300 transition-colors w-fit">
                      <Phone size={14} className="text-amber-300/70 shrink-0" /> {job.phone}
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1.5">Appointment Notes</p>
                <p className="text-sm text-slate-200 leading-relaxed">{job.details || 'No additional notes for this appointment.'}</p>
              </div>

              <div className="rounded-xl bg-amber-400/[0.05] border border-amber-400/[0.15] p-4">
                <p className="text-amber-300/80 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Previous Technician Notes
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {history.find((h) => h.manager_notes)?.manager_notes || 'No notes on file from previous visits.'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <Wrench size={13} /> Installed Equipment
                </p>
                {job.equipment_installed ? (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                    <p className="text-sm text-slate-200">{job.equipment_installed}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-3.5 text-center">
                    <p className="text-xs text-slate-600">No equipment on file for this address.</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <History size={13} /> Service History
                </p>
                {history.length === 0 ? (
                  <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] p-4 text-center">
                    <p className="text-xs text-slate-600">This is the first visit on file for this customer.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {history.map((h, i) => (
                      <motion.div
                        key={h.id || i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-200">{h.service_type || 'Service'}</p>
                          <StatusBadge status={h.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{h.schedule_date || h.appointment_time || ''}</p>
                        {h.customer_feedback && (
                          <p className="text-xs text-slate-500 mt-1.5 italic">"{h.customer_feedback}"</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LogoutModal({ open, onClose, onConfirm, activeJob }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1e] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
              <div className="h-11 w-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
                <LogOut size={20} className="text-amber-300" />
              </div>
              <h3 className="text-white font-semibold text-lg">Log out of Mission Control?</h3>
              <p className="text-slate-400 text-sm mt-1.5">You'll need to sign back in to view or update your jobs.</p>

              {activeJob && (
                <div className="mt-4 rounded-xl bg-amber-400/[0.06] border border-amber-400/20 p-3">
                  <p className="text-xs text-amber-300/80 uppercase tracking-wide mb-1">Active job in progress</p>
                  <p className="text-sm text-slate-200 font-medium">{activeJob.full_name || 'Customer'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activeJob.service_type || 'Service'} · {activeJob.status}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <GhostButton className="flex-1 justify-center" onClick={onClose}>Cancel</GhostButton>
                <PrimaryButton className="flex-1 justify-center" onClick={onConfirm} icon={LogOut}>Logout</PrimaryButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QuickActionsDock({ activeJob, onNavigate, onCall, onUploadPhotos, onSubmitReport, onViewCustomer }) {
  const [expanded, setExpanded] = useState(false);
  if (!activeJob) return null;

  const actions = [
    { key: 'navigate', label: 'Navigate', icon: Navigation, onClick: () => onNavigate?.(activeJob) },
    { key: 'call', label: 'Call Customer', icon: Phone, onClick: () => onCall?.(activeJob), disabled: !activeJob.phone },
    { key: 'photos', label: 'Upload Photos', icon: Camera, onClick: () => onUploadPhotos?.(activeJob) },
    { key: 'report', label: 'Submit Report', icon: FileText, onClick: () => onSubmitReport?.(activeJob) },
    { key: 'customer', label: 'View Customer', icon: User, onClick: () => onViewCustomer?.(activeJob) },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {expanded && (
          <motion.div className="flex flex-col items-end gap-2.5 mb-1">
            {actions.map((a, i) => {
              const m = { initial: { opacity: 0, y: 10, scale: 0.9 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: 0.9 } };
              return (
                <motion.button
                  key={a.key}
                  {...m}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 320, damping: 24 }}
                  whileHover={!a.disabled ? { scale: 1.05, x: -2 } : undefined}
                  whileTap={!a.disabled ? { scale: 0.95 } : undefined}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className="group flex items-center gap-2.5 pl-3.5 pr-1.5 py-1.5 rounded-full border border-white/10
                    bg-[#0a0f1e]/95 backdrop-blur-xl shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]
                    disabled:opacity-30 disabled:cursor-not-allowed
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors whitespace-nowrap">{a.label}</span>
                  <span className="h-8 w-8 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                    <a.icon size={15} />
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setExpanded((e) => !e)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        animate={{ rotate: expanded ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="h-14 w-14 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-[#0a0f1e]
          flex items-center justify-center shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_16px_40px_-10px_rgba(251,191,36,0.6)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Quick actions"
      >
        <Sparkles size={20} />
      </motion.button>
    </div>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'assigned', label: 'My Jobs', icon: ClipboardList },
  { key: 'network', label: 'Network Map', icon: Map },
  { key: 'logs', label: 'Service Logs', icon: FileText },
];

function Sidebar({ active, setActive, onLogoutClick, collapsed, setCollapsed }) {
  return (
    <motion.nav
      animate={{ width: collapsed ? 84 : 260 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="hidden md:flex flex-col border-r border-white/[0.06] bg-white/[0.015] backdrop-blur-xl p-4 shrink-0"
    >
      <div className="flex items-center justify-between px-2 mb-8">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.h2
              key="logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white font-black italic text-lg"
            >
              RION <span className="text-amber-300">TECH</span>
            </motion.h2>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Menu size={16} />
        </button>
      </div>

      <div className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300
                ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-amber-400/10 border border-amber-400/25"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <motion.span whileHover={{ scale: 1.12 }} className="relative shrink-0">
                <item.icon size={18} className={isActive ? 'text-amber-300' : ''} />
              </motion.span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <button
        onClick={onLogoutClick}
        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-amber-300 hover:bg-white/[0.05] transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <LogOut size={18} className="shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Logout
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.nav>
  );
}

function MobileNav({ active, setActive, onLogoutClick, open, setOpen }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-[#04060c] border-r border-white/[0.08] z-50 p-4 md:hidden"
          >
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-white font-black italic text-lg">RION <span className="text-amber-300">TECH</span></h2>
              <button onClick={() => setOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setActive(item.key); setOpen(false); }}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                    active === item.key ? 'bg-amber-400/10 text-white border border-amber-400/25' : 'text-slate-400'
                  }`}
                >
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
              <button onClick={onLogoutClick} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 mt-6">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TopHeader({ technicianName, onMenuClick, onBellClick, unreadCount }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden h-9 w-9 rounded-lg flex items-center justify-center text-slate-300 bg-white/[0.04] border border-white/10
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <Menu size={16} />
        </button>
        <div>
          <p className="text-slate-500 text-xs">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-slate-300 text-sm font-medium">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge className="bg-white/[0.04] text-slate-300 ring-white/10 hidden sm:inline-flex">
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <Wifi size={12} /> Live
        </Badge>
        <button
          onClick={onBellClick}
          className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-300 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
          )}
        </button>
        <div className="h-9 w-9 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 text-sm font-semibold">
          {technicianName?.charAt(0)?.toUpperCase() || 'T'}
        </div>
      </div>
    </header>
  );
}

export default function TechnicianDashboard({ onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [technicianName, setTechnicianName] = useState('Technician');
  const [technicianId, setTechnicianId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mapJobId, setMapJobId] = useState(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [customerPanelJob, setCustomerPanelJob] = useState(null);

  const [checklist, setChecklist] = useState({
    serviceCompleted: false,
    photosUploaded: false,
    reportSubmitted: false,
    qcReady: false,
    photoCount: 0,
  });
  const [related, setRelated] = useState({ details: null, areas: [], items: [], notes: [], photos: [], reports: [], logs: [], qcReports: [], error: false });
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  
  const fetchTasks = useCallback(async (techId) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('technician_id', techId); 

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTechnicianName(user.user_metadata?.full_name || 'Technician');
        setTechnicianId(user.id);
        fetchTasks(user.id);

        
        const channel = supabase
          .channel('tech-assignments')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `technician_id=eq.${user.id}`,
          }, (payload) => {
            fetchTasks(user.id);
            const message =
              payload.eventType === 'INSERT'
                ? `New job assigned: ${payload.new?.full_name || 'a customer'}`
                : payload.eventType === 'UPDATE'
                  ? `Job updated: ${payload.new?.full_name || 'a customer'}`
                  : 'A job assignment changed';
            setNotifications((prev) => [{ id: `${Date.now()}`, message, created_at: new Date().toISOString() }, ...prev].slice(0, 20));
          })
          .subscribe();

        return () => supabase.removeChannel(channel);
      }
    };
    init();
  }, [fetchTasks]);

  const activeJob = useMemo(
    () => tasks.find((t) => t.status === 'in_progress') || tasks.find((t) => t.status === 'assigned'),
    [tasks]
  );

  
  useEffect(() => {
    const loadChecklist = async () => {
      if (!activeJob) {
        setChecklist({ serviceCompleted: false, photosUploaded: false, reportSubmitted: false, qcReady: false, photoCount: 0 });
        return;
      }
      const [photosRes, reportRes, qcRes] = await Promise.all([
        supabase.from('job_photos').select('id', { count: 'exact', head: true }).eq('appointment_id', activeJob.id),
        supabase.from('service_reports').select('appointment_id').eq('appointment_id', activeJob.id).maybeSingle(),
        supabase.from('qc_reports').select('appointment_id, approved').eq('appointment_id', activeJob.id).maybeSingle(),
      ]);
      setChecklist({
        serviceCompleted: activeJob.status === 'completed' || !!activeJob.completed_at,
        photosUploaded: (photosRes.count || 0) > 0,
        photoCount: photosRes.count || 0,
        reportSubmitted: !!reportRes.data,
        qcReady: !!qcRes.data,
      });
    };
    loadChecklist();
  }, [activeJob]);

  const loadRelated = useCallback(async (appointmentId) => {
    if (!appointmentId) return;
    setRelatedLoading(true);
    const results = await Promise.all([
      supabase.from('appointment_project_details').select('*').eq('appointment_id', appointmentId).maybeSingle(),
      supabase.from('appointment_areas').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: true }),
      supabase.from('appointment_items').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: true }),
      supabase.from('manager_notes').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false }),
      supabase.from('job_photos').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: true }),
      supabase.from('service_reports').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false }),
      supabase.from('job_logs').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false }),
      supabase.from('qc_reports').select('*').eq('appointment_id', appointmentId).order('created_at', { ascending: false }),
    ]);
    setRelated({ details: results[0].data || null, areas: results[1].data || [], items: results[2].data || [], notes: results[3].data || [], photos: results[4].data || [], reports: results[5].data || [], logs: results[6].data || [], qcReports: results[7].data || [], error: results.some((result) => result.error) });
    setRelatedLoading(false);
  }, []);

  useEffect(() => {
    if (!activeJob?.id) {
      setRelated({ details: null, areas: [], items: [], notes: [], photos: [], reports: [], logs: [], qcReports: [], error: false });
      return;
    }
    loadRelated(activeJob.id);
  }, [activeJob?.id, loadRelated]);

  const updateJobStatus = useCallback(async (job, status) => {
    if (!job?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const timestampField = status === 'in_progress' ? 'started_at' : 'completed_at';
      const { error } = await supabase.from('appointments').update({ status, [timestampField]: new Date().toISOString() }).eq('id', job.id);
      if (error) throw error;
      await supabase.from('job_logs').insert({ appointment_id: job.id, action: status === 'in_progress' ? 'Started job' : 'Completed service' });
      await fetchTasks(technicianId);
      await loadRelated(job.id);
    } catch (error) {
      console.error('Unable to update job status:', error);
      setNotifications((previous) => [{ id: `${Date.now()}`, message: `Unable to update job: ${error.message}`, created_at: new Date().toISOString() }, ...previous].slice(0, 20));
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, fetchTasks, loadRelated, technicianId]);

  const handleLogoutConfirm = async () => {
    setLogoutModalOpen(false);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleNavigate = useCallback((job) => {
    if (job?.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, '_blank');
    }
  }, []);

  const handleCall = useCallback((job) => {
    if (job?.phone) {
      window.location.href = `tel:${job.phone}`;
    }
  }, []);

  const renderContent = () => {
    if (isLoading) return <DashboardSkeleton />;

    switch (activeModule) {
      case 'assigned':
        return <DeploymentsView tasks={tasks} onRefresh={() => technicianId && fetchTasks(technicianId)} initialJobId={mapJobId} onInitialJobOpened={() => setMapJobId(null)} />;
      case 'network':
        return <NetworkMap tasks={tasks.map((job) => ({ ...job, technician_name: technicianName }))} activeJob={activeJob} onViewJob={(job) => { setMapJobId(job.id); setActiveModule('assigned'); }} />;
      case 'logs':
        return <ServiceLogsView />;
      default:
        return (
          <MissionControl job={activeJob} tasks={tasks} details={related.details} checklist={checklist} related={related} loading={relatedLoading} actionLoading={actionLoading}
            onStart={() => updateJobStatus(activeJob, 'in_progress')} onComplete={() => updateJobStatus(activeJob, 'completed')}
            onNavigate={() => handleNavigate(activeJob)} onOpenDetails={() => setDetailsOpen(true)} onOpenJobs={() => setActiveModule('assigned')} />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#04060c] text-slate-300 flex relative">
      <AmbientBackground />
      <Sidebar
        active={activeModule}
        setActive={setActiveModule}
        onLogoutClick={() => setLogoutModalOpen(true)}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <MobileNav
        active={activeModule}
        setActive={setActiveModule}
        onLogoutClick={() => setLogoutModalOpen(true)}
        open={mobileNavOpen}
        setOpen={setMobileNavOpen}
      />

      <main className="relative z-10 flex-1 p-5 md:p-8 max-w-[1400px] mx-auto w-full">
        <TopHeader
          technicianName={technicianName}
          onMenuClick={() => setMobileNavOpen(true)}
          onBellClick={() => setNotifOpen((o) => !o)}
          unreadCount={notifications.length}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule + (isLoading ? '-loading' : '-loaded')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <QuickActionsDock
        activeJob={activeJob}
        onNavigate={handleNavigate}
        onCall={handleCall}
        onUploadPhotos={() => setActiveModule('assigned')}
        onSubmitReport={() => setActiveModule('assigned')}
        onViewCustomer={(job) => setCustomerPanelJob(job)}
      />

      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />
      <CustomerSlideOver
        open={!!customerPanelJob}
        onClose={() => setCustomerPanelJob(null)}
        job={customerPanelJob}
        tasks={tasks}
      />
      <JobWorkspace open={detailsOpen} onClose={() => setDetailsOpen(false)} job={activeJob} related={related} loading={relatedLoading} actionLoading={actionLoading}
        onStart={() => updateJobStatus(activeJob, 'in_progress')} onNavigate={handleNavigate} onCall={handleCall} />
      <LogoutModal
        open={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        activeJob={activeJob}
      />
    </div>
  );
}
