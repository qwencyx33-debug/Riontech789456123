import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Search, Mail, Plus, X, UserCheck, ChevronLeft, ChevronRight,
  MapPin, User, Image as ImageIcon,
  CheckCircle2, Circle, XCircle, TrendingUp,
  Users, Calendar, LayoutGrid, RefreshCw,
  MoreHorizontal, ArrowRight, Radio, Layers,
  Settings, AlertTriangle, Wallet, Flag,
  BookOpen, Compass, Ruler, Package
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday, addDays
} from 'date-fns';
import Swal from 'sweetalert2';

const T = {
  navy:      '#0B1F3A',
  navyDeep:  '#071320',
  card:      '#0F213E',
  cardHi:    '#122649',
  yellow:    '#FFC107',
  gold:      '#FFD54F',
  hover:     '#F4B400',
  border:    'rgba(255,193,7,.15)',
  borderHi:  'rgba(255,193,7,.32)',
  glow:      'rgba(255,193,7,.25)',
  text:      '#FFFFFF',
  text2:     '#B8C3D6',
  muted:     '#72809A',
};

// Appointment status presentation. Values reflect appointments.status as stored (free text).
const APPT_STATUS = {
  scheduled:  { label: 'Scheduled', color: T.gold,    bg: 'rgba(255,213,79,0.10)',  border: 'rgba(255,213,79,0.28)' },
  assigned:   { label: 'Assigned',  color: T.gold,    bg: 'rgba(255,213,79,0.10)',  border: 'rgba(255,213,79,0.28)' },
  active:     { label: 'Active',    color: T.yellow,  bg: 'rgba(255,193,7,0.14)',   border: 'rgba(255,193,7,0.32)'  },
  in_progress:{ label: 'In Progress', color: T.yellow,bg: 'rgba(255,193,7,0.14)',   border: 'rgba(255,193,7,0.32)'  },
  completed:  { label: 'Done',      color: '#3DDC84', bg: 'rgba(61,220,132,0.10)',  border: 'rgba(61,220,132,0.26)' },
  pending:    { label: 'Pending',   color: '#FF9142', bg: 'rgba(255,145,66,0.10)',  border: 'rgba(255,145,66,0.26)' },
  standby:    { label: 'Standby',   color: '#8FA6C9', bg: 'rgba(143,166,201,0.10)', border: 'rgba(143,166,201,0.24)'},
  cancelled:  { label: 'Cancelled', color: '#FF5A5A', bg: 'rgba(255,90,90,0.08)',   border: 'rgba(255,90,90,0.22)'  },
};
const getAppt = (s) => APPT_STATUS[s?.toLowerCase()] || APPT_STATUS.pending;

// profiles has first_name / last_name, not full_name — resolve a display name safely.
const fullName = (p) => {
  const n = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
  return n || p?.email || 'Unnamed';
};
const initials = (p) => {
  const n = fullName(p);
  return n.charAt(0).toUpperCase() || '?';
};
const peso = (n) => `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const GlobalStyle = () => (
  <style>{`
    @keyframes fdIn      { from{opacity:0} to{opacity:1} }
    @keyframes slIn      { from{transform:translateX(100%)} to{transform:translateX(0)} }
    @keyframes riseIn    { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
    @keyframes popIn     { from{opacity:0; transform:scale(.94)} to{opacity:1; transform:scale(1)} }
    @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    .noscroll::-webkit-scrollbar{display:none}
    .noscroll{-ms-overflow-style:none;scrollbar-width:none}
    .yshimmer{background:linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,193,7,0.09) 50%,rgba(255,255,255,0.03) 100%);background-size:800px 100%;animation:shimmer 1.6s linear infinite}
    .rise{animation:riseIn .4s cubic-bezier(.16,1,.3,1) both}
    .pop{animation:popIn .25s cubic-bezier(.16,1,.3,1) both}
    .yfocus:focus{outline:none;border-color:${T.borderHi} !important;box-shadow:0 0 0 3px ${T.glow} !important}
    .ylift{transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s ease, border-color .22s ease}
    .ylift:hover{transform:translateY(-2px)}
  `}</style>
);

const Glass = ({ children, className = '', style = {}, onClick, hoverGlow = false }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border ${onClick ? 'cursor-pointer' : ''} ${hoverGlow ? 'ylift' : ''} ${className}`}
    style={{
      background: `linear-gradient(160deg, ${T.card} 0%, ${T.navyDeep} 130%)`,
      border: `1px solid ${T.border}`,
      backdropFilter: 'blur(18px)',
      boxShadow: '0 4px 28px rgba(0,0,0,0.45)',
      ...style,
    }}
  >
    {children}
  </div>
);

const Dot = ({ color, pulse = false, size = 7 }) => (
  <span className="relative inline-flex" style={{ width: size, height: size }}>
    {pulse && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: color }} />}
    <span className="relative inline-flex rounded-full w-full h-full" style={{ background: color, boxShadow: `0 0 6px ${color}90` }} />
  </span>
);

const Badge = ({ status, size = 'sm' }) => {
  const cfg = getAppt(status);
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full ${size === 'xs' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Dot color={cfg.color} size={5} />
      {cfg.label}
    </span>
  );
};

const Avatar = ({ person, size = 10 }) => (
  <div
    className="rounded-lg flex items-center justify-center font-black shrink-0"
    style={{
      width: size * 4, height: size * 4, fontSize: size * 1.1,
      background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, color: '#0B1F3A',
    }}
  >
    {initials(person)}
  </div>
);

/* ---------- Technician status derived from real appointment data (section 13) ---------- */
const technicianStatus = (tech, appointments) => {
  const now = new Date();
  const mine = appointments.filter(a => a.technician_id === tech.id);
  const inProgress = mine.some(a => ['active', 'in_progress'].includes(a.status?.toLowerCase()) || a.started_at);
  if (inProgress) return { key: 'in_progress', label: 'In Progress', color: T.yellow };
  const today = mine.filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), now) && !['completed', 'cancelled'].includes(a.status?.toLowerCase()));
  if (today.length >= 3) return { key: 'busy', label: 'Busy', color: '#FF9142' };
  if (today.length > 0) return { key: 'assigned', label: 'Assigned', color: T.gold };
  const upcoming = mine.some(a => a.schedule_date && new Date(a.schedule_date) > now && !['completed', 'cancelled'].includes(a.status?.toLowerCase()));
  if (upcoming) return { key: 'available', label: 'Available', color: '#3DDC84' };
  return { key: 'none', label: 'No Upcoming Job', color: T.muted };
};

const Counter = ({ to, prefix = '' }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(to) || 0;
    const start = 0;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - t0) / 500, 1);
      const ease = 1 - (1 - p) ** 3;
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{prefix}{val.toLocaleString()}</>;
};

const RingGauge = ({ pct, color, size = 40, stroke = 4, label }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <span className="absolute text-[9px] font-black" style={{ color }}>{label ?? `${pct}%`}</span>
    </div>
  );
};

const LiveClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-black tabular-nums text-white tracking-tight">{format(now, 'HH:mm:ss')}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>{format(now, 'zzz')}</span>
    </div>
  );
};

/* ---------- Needs Attention (section 19) — real, dynamically calculated counts only ---------- */
const AttentionBar = ({ appointments, filter, setFilter }) => {
  const unassigned = appointments.filter(a => !a.technician_id && !['completed', 'cancelled'].includes(a.status?.toLowerCase())).length;
  const paymentReview = appointments.filter(a => a.payment_status?.toLowerCase() === 'pending' && Number(a.downpayment_paid) > 0).length;
  const priority = appointments.filter(a => a.priority?.toLowerCase() === 'high' || a.priority?.toLowerCase() === 'urgent').length;

  const items = [
    { key: 'unassigned', label: 'Unassigned', count: unassigned, icon: AlertTriangle, color: '#FF9142' },
    { key: 'payment', label: 'Payment Review', count: paymentReview, icon: Wallet, color: T.gold },
    { key: 'priority', label: 'Priority', count: priority, icon: Flag, color: '#FF5A5A' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ key, label, count, icon: Icon, color }) => {
        const active = filter === key;
        return (
          <button
            key={key}
            onClick={() => setFilter(active ? null : key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition-all"
            style={{
              background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? color : T.border}`,
              color: active ? color : T.text2,
            }}
          >
            <Icon size={11} style={{ color }} />
            {label}
            <span className="font-black" style={{ color }}>{count}</span>
          </button>
        );
      })}
      {filter && (
        <button onClick={() => setFilter(null)} className="text-[9px] font-semibold underline" style={{ color: T.muted }}>
          Clear filter
        </button>
      )}
    </div>
  );
};

/* ---------- Today's schedule / Next Up (sections 17-18) ---------- */
const TodayPanel = ({ appointments, techsById, selectedDate, onOpen }) => {
  const target  = selectedDate || new Date();
  const dayApps = appointments
    .filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), target))
    .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));

  const completion = dayApps.length ? Math.round((dayApps.filter(a => a.status?.toLowerCase() === 'completed').length / dayApps.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white">
            {selectedDate ? format(selectedDate, 'EEE d MMM') : "Today's Schedule"}
          </h3>
          <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>{dayApps.length} appointment{dayApps.length !== 1 ? 's' : ''}{dayApps.length ? ` · ${completion}% complete` : ''}</p>
        </div>
        {dayApps.length > 0 && <RingGauge pct={completion} color={T.yellow} size={30} stroke={3} label={`${completion}`} />}
      </div>

      <div className="flex-1 overflow-y-auto pr-0.5 min-h-0 noscroll">
        {dayApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
              <Calendar size={15} style={{ color: T.muted }} />
            </div>
            <p className="text-[10px] font-medium" style={{ color: T.muted }}>No appointments scheduled</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {dayApps.map((app) => {
              const tech = techsById.get(app.technician_id);
              const cfg  = getAppt(app.status);
              return (
                <button key={app.id} onClick={() => onOpen(app)} className="w-full text-left group">
                  <div className="p-2.5 rounded-xl transition-all duration-150 group-hover:translate-x-0.5"
                    style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-black" style={{ color: T.gold }}>{app.appointment_time || '—'}</span>
                      <Badge status={app.status} size="xs" />
                    </div>
                    <p className="text-[10px] font-bold truncate" style={{ color: T.text2 }}>{app.full_name || 'Anonymous'}</p>
                    <p className="text-[9px] truncate" style={{ color: cfg.color }}>{app.service_type || 'Service'}</p>
                    <p className="text-[9px] truncate mt-1" style={{ color: T.muted }}>
                      {tech ? fullName(tech) : 'Unassigned'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const UpcomingJobs = ({ appointments, techsById, onOpen }) => {
  const upcoming = appointments
    .filter(a => a.schedule_date && new Date(a.schedule_date) >= new Date(format(new Date(), 'yyyy-MM-dd')))
    .filter(a => !['completed', 'cancelled'].includes(a.status?.toLowerCase()))
    .sort((a, b) => new Date(a.schedule_date) - new Date(b.schedule_date) || (a.appointment_time || '').localeCompare(b.appointment_time || ''))[0];

  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: T.muted }}>Next Up</p>
      {!upcoming ? (
        <p className="text-[10px] font-medium" style={{ color: T.muted }}>No upcoming appointments</p>
      ) : (
        <button onClick={() => onOpen(upcoming)} className="w-full text-left p-3 rounded-xl transition-all hover:brightness-110"
          style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
          <p className="text-[9px] font-bold mb-1" style={{ color: T.gold }}>
            {format(new Date(upcoming.schedule_date), 'MMM d')} · {upcoming.appointment_time || '—'}
          </p>
          <p className="text-[11px] font-bold text-white truncate">{upcoming.full_name}</p>
          <p className="text-[9px] truncate" style={{ color: T.text2 }}>{upcoming.service_type}</p>
          <p className="text-[9px] truncate mt-1" style={{ color: T.muted }}>
            {techsById.get(upcoming.technician_id) ? fullName(techsById.get(upcoming.technician_id)) : 'Unassigned'}
          </p>
        </button>
      )}
    </div>
  );
};

/* ---------- Calendar day cell (sections 4-8) ---------- */
const DayCell = ({ day, appts, techsById, inMonth, onDayClick, onAppClick, selectedDate, index = 0 }) => {
  const isSelected = selectedDate && isSameDay(day, selectedDate);
  const today      = isToday(day);
  const maxShow    = 3;
  const sorted     = [...appts].sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));

  if (!inMonth) {
    return <div className="rounded-xl" style={{ minHeight: 116, opacity: 0.045, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }} />;
  }

  return (
    <div
      onClick={() => onDayClick(day)}
      className="relative rounded-xl flex flex-col cursor-pointer transition-all duration-200 group ylift pop"
      style={{
        minHeight: 116,
        height: '100%',
        overflow: 'hidden',
        padding: '8px 8px 6px',
        background: isSelected ? 'rgba(255,193,7,0.10)' : today ? 'rgba(255,193,7,0.045)' : 'rgba(255,255,255,0.014)',
        border: isSelected ? `1px solid ${T.borderHi}` : today ? `1px solid ${T.border}` : '1px solid rgba(255,255,255,0.035)',
        boxShadow: isSelected ? `0 0 18px ${T.glow}` : today ? `0 0 12px rgba(255,193,7,0.12)` : 'none',
        animationDelay: `${Math.min(index * 12, 260)}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <span
          className="w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black"
          style={today
            ? { background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, color: '#0B1F3A', boxShadow: `0 0 10px ${T.glow}` }
            : { color: isSelected ? T.gold : T.muted }
          }
        >
          {format(day, 'd')}
        </span>
        {appts.length > 0 && (
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,193,7,0.14)', color: T.gold }}>
            {appts.length}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {sorted.slice(0, maxShow).map((app) => {
          const cfg  = getAppt(app.status);
          const tech = techsById.get(app.technician_id);
          return (
            <div key={app.id}
              onClick={e => { e.stopPropagation(); onAppClick(app); }}
              className="px-1.5 py-1 rounded-lg transition-all duration-100 hover:brightness-110"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black shrink-0" style={{ color: cfg.color }}>{app.appointment_time || ''}</span>
                <span className="flex-1 truncate text-[8px] font-semibold" style={{ color: cfg.color }}>{app.full_name || 'Customer'}</span>
                {tech && (
                  <span className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center text-[7px] font-black text-[#0B1F3A]" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
                    {initials(tech)}
                  </span>
                )}
              </div>
              <p className="text-[7.5px] truncate opacity-85" style={{ color: cfg.color }}>{app.service_type || 'Service'}</p>
            </div>
          );
        })}
        {appts.length > maxShow && (
          <button
            onClick={e => { e.stopPropagation(); onDayClick(day); }}
            className="text-[8px] font-bold pl-1 hover:underline"
            style={{ color: T.muted }}
          >
            +{appts.length - maxShow} more
          </button>
        )}
      </div>

      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => { e.stopPropagation(); onDayClick(day); }}>
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})` }}>
          <Plus size={8} className="text-[#0B1F3A]" />
        </div>
      </div>
    </div>
  );
};

const AgendaView = ({ appointments, techsById, onOpen }) => {
  const days = eachDayOfInterval({ start: new Date(), end: addDays(new Date(), 13) });
  return (
    <div className="flex-1 overflow-y-auto pr-1 noscroll">
      {days.map((day, i) => {
        const da = appointments
          .filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), day))
          .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));
        return (
          <div key={i} className="flex gap-4 group">
            <div className="w-12 shrink-0 pt-1 text-right pb-4">
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: isToday(day) ? T.gold : T.muted, opacity: isToday(day) ? 1 : 0.6 }}>{format(day, 'EEE')}</div>
              <div className="text-xl font-black leading-none" style={{ color: isToday(day) ? '#fff' : T.muted, opacity: isToday(day) ? 1 : 0.5 }}>{format(day, 'd')}</div>
            </div>
            <div className="flex-1 border-l pl-4 pb-4 space-y-1.5 min-h-[48px]" style={{ borderColor: T.border }}>
              {da.length === 0 ? (
                <span className="inline-block mt-2 text-[9px] font-medium" style={{ color: T.muted, opacity: 0.5 }}>No appointments</span>
              ) : da.map((app) => {
                const tech = techsById.get(app.technician_id);
                const cfg  = getAppt(app.status);
                return (
                  <div key={app.id} onClick={() => onOpen(app)}
                    className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <span className="text-[9px] font-black w-12 shrink-0" style={{ color: cfg.color }}>{app.appointment_time || '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate" style={{ color: cfg.color }}>{app.full_name}</p>
                      <p className="text-[8px] truncate" style={{ color: T.muted }}>{app.service_type} · {tech ? fullName(tech) : 'Unassigned'}</p>
                    </div>
                    <Badge status={app.status} size="xs" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Appointment detail drawer (section 9) ---------- */
const DetailDrawer = ({ app, techsById, areas, items, onClose }) => {
  const tech = techsById.get(app?.technician_id);
  const cfg  = getAppt(app?.status);
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const itemsTotal = items.reduce((s, it) => s + Number(it.total_price ?? (it.quantity * it.unit_price) ?? 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" style={{ animation: 'fdIn .2s ease' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-md flex flex-col" style={{ background: T.navyDeep, borderLeft: `1px solid ${T.border}`, animation: 'slIn .28s cubic-bezier(.16,1,.3,1)', boxShadow: '-40px 0 80px rgba(0,0,0,0.6)' }}>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />

        <div className="p-6 pb-5" style={{ background: `linear-gradient(160deg, ${T.card}, ${T.navyDeep})`, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge status={app?.status} />
                <span className="text-[9px] font-mono" style={{ color: T.muted }}>#{app?.id?.substring(0, 8)}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">{app?.service_type}</h2>
              <p className="text-[10px] font-semibold mt-1" style={{ color: T.gold }}>
                {app?.schedule_date ? format(new Date(app.schedule_date), 'EEEE, MMMM d, yyyy') : 'No date set'}
                {app?.appointment_time ? ` · ${app.appointment_time}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all ml-3 shrink-0" style={{ color: T.muted }}><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 noscroll">

          {/* Customer */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Customer</p>
            <div className="space-y-2">
              {[
                { icon: User,  label: 'Name',    val: app?.full_name || 'Anonymous' },
                { icon: MapPin, label: 'Address', val: app?.address || 'Not specified' },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                  <div className="p-1.5 rounded-lg mt-0.5 shrink-0" style={{ background: 'rgba(255,193,7,0.12)' }}>
                    <Icon size={11} style={{ color: T.yellow }} />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{label}</p>
                    <p className="text-[11px] font-semibold" style={{ color: T.text2 }}>{val}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Service + price */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Service</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>Service Type</p>
                <p className="text-[11px] font-bold" style={{ color: T.text2 }}>{app?.service_type || 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>Price</p>
                <p className="text-[11px] font-bold" style={{ color: T.gold }}>{app?.price != null ? peso(app.price) : 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Technician */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Assigned Technician</p>
            {tech ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
                <Avatar person={tech} size={10} />
                <div>
                  <p className="font-bold text-white text-sm">{fullName(tech)}</p>
                  <p className="text-[9px] font-semibold mt-0.5" style={{ color: T.gold }}>{tech.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl text-center text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.01)', border: `1px dashed ${T.border}`, color: T.muted }}>No technician assigned</div>
            )}
          </section>

          {/* Project Scope — appointment_areas */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>
              Project Scope {areas.length > 0 && <span style={{ color: T.gold }}>· {areas.length} Area{areas.length !== 1 ? 's' : ''}</span>}
            </p>
            {areas.length === 0 ? (
              <div className="p-3 rounded-xl text-center text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.01)', border: `1px dashed ${T.border}`, color: T.muted }}>No project areas</div>
            ) : (
              <div className="space-y-1.5">
                {areas.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                    <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(255,193,7,0.12)' }}>
                      <Ruler size={11} style={{ color: T.yellow }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold truncate" style={{ color: T.text2 }}>{a.area_name}</p>
                      <p className="text-[9px]" style={{ color: T.muted }}>
                        {a.area_size ? `${a.area_size} ${a.area_size_unit || 'sqm'}` : ''}{a.area_size ? ' · ' : ''}Qty {a.quantity ?? 1}
                      </p>
                      {a.notes && <p className="text-[9px] italic mt-0.5" style={{ color: T.muted }}>{a.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Project Items — appointment_items */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>
              Project Items {items.length > 0 && <span style={{ color: T.gold }}>· {items.length} Item{items.length !== 1 ? 's' : ''} · {peso(itemsTotal)}</span>}
            </p>
            {items.length === 0 ? (
              <div className="p-3 rounded-xl text-center text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.01)', border: `1px dashed ${T.border}`, color: T.muted }}>No project items</div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-[1fr,auto,auto] gap-2 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.03)', color: T.muted }}>
                  <span>Item</span><span>Qty</span><span>Total</span>
                </div>
                {items.map(it => (
                  <div key={it.id} className="grid grid-cols-[1fr,auto,auto] gap-2 px-2.5 py-2 items-center" style={{ borderTop: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.01)' }}>
                    <div className="min-w-0 flex items-center gap-1.5">
                      <Package size={10} style={{ color: T.muted }} className="shrink-0" />
                      <span className="text-[10px] font-semibold truncate" style={{ color: T.text2 }}>{it.item_name}</span>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: T.text2 }}>{it.quantity}</span>
                    <span className="text-[10px] font-black" style={{ color: T.gold }}>{peso(it.total_price ?? it.quantity * it.unit_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payment */}
          <section>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Payment</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Method',   val: app?.payment_method || 'N/A' },
                { label: 'Status',   val: app?.payment_status || 'N/A' },
                { label: 'Priority', val: app?.priority || 'Normal' },
                { label: 'Downpayment', val: app?.downpayment_paid ? peso(app.downpayment_paid) : 'None' },
              ].map(({ label, val }) => (
                <div key={label} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
                  <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>{label}</p>
                  <p className="text-[11px] font-bold" style={{ color: T.text2 }}>{val}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Manager notes */}
          {app?.manager_notes && (
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Manager Notes</p>
              <div className="p-3 rounded-xl text-[11px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${T.border}`, color: T.text2 }}>
                {app.manager_notes}
              </div>
            </section>
          )}

          {/* Details / notes */}
          {app?.details && (
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Notes</p>
              <div className="p-3 rounded-xl text-[11px] italic leading-relaxed" style={{ background: 'rgba(255,255,255,0.015)', border: `1px solid ${T.border}`, color: T.text2 }}>
                {app.details}
              </div>
            </section>
          )}

          {app?.receipt_image && (
            <section>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2.5" style={{ color: T.muted }}>Attachments</p>
              <a href={app.receipt_image} target="_blank" rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl transition-all hover:brightness-110"
                style={{ background: 'rgba(255,193,7,0.08)', border: `1px solid ${T.border}` }}>
                <ImageIcon size={13} style={{ color: T.gold }} />
                <span className="text-[10px] font-bold" style={{ color: T.gold }}>View Attachment</span>
                <ArrowRight size={11} className="ml-auto" style={{ color: T.gold }} />
              </a>
            </section>
          )}
        </div>

        <div className="p-5 flex gap-2.5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:text-white" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, color: T.muted }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

/* ---------- Assign technician drawer (sections 15-16) ----------
   Assigns a REAL technician to an EXISTING unassigned appointment by
   updating appointments.technician_id. Never inserts fake appointments. */
const AssignDrawer = ({ date, techs, appointments, onAssign, onClose }) => {
  const [selAppt, setSelAppt] = useState(null);
  const [selTech, setSelTech] = useState(null);

  const dayUnassigned = appointments.filter(a =>
    a.schedule_date && isSameDay(new Date(a.schedule_date), date) &&
    !a.technician_id && !['completed', 'cancelled'].includes(a.status?.toLowerCase())
  );

  const busyIds = new Set(
    appointments
      .filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), date) && a.technician_id)
      .map(a => a.technician_id)
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" style={{ animation: 'fdIn .2s ease' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[110] w-full max-w-sm flex flex-col" style={{ background: T.navyDeep, borderLeft: `1px solid ${T.border}`, animation: 'slIn .28s cubic-bezier(.16,1,.3,1)', boxShadow: '-40px 0 80px rgba(0,0,0,0.6)' }}>
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${T.yellow}, transparent)` }} />
        <div className="p-6" style={{ background: `linear-gradient(160deg, ${T.card}, ${T.navyDeep})`, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Assign Technician</h2>
              <p className="text-[9px] font-semibold mt-1" style={{ color: T.gold }}>{format(date, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all" style={{ color: T.muted }}><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 noscroll">

          {/* Step 1: pick the real unassigned appointment */}
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: T.muted }}>Unassigned Appointment</p>
            {dayUnassigned.length === 0 ? (
              <div className="p-4 rounded-xl text-center text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.01)', border: `1px dashed ${T.border}`, color: T.muted }}>
                No unassigned appointments for this date
              </div>
            ) : (
              <div className="space-y-1.5">
                {dayUnassigned.map(app => {
                  const isSel = selAppt === app.id;
                  return (
                    <button key={app.id} onClick={() => setSelAppt(app.id)}
                      className="w-full text-left p-2.5 rounded-xl transition-all"
                      style={{ background: isSel ? 'rgba(255,193,7,0.10)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSel ? T.borderHi : T.border}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold truncate" style={{ color: T.text2 }}>{app.full_name}</span>
                        <span className="text-[9px] font-black shrink-0" style={{ color: T.gold }}>{app.appointment_time || '—'}</span>
                      </div>
                      <p className="text-[9px] truncate" style={{ color: T.muted }}>{app.service_type}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: pick a real technician profile */}
          {dayUnassigned.length > 0 && (
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: T.muted }}>Technician</p>
              <div className="space-y-1.5">
                {techs.map(tech => {
                  const busy       = busyIds.has(tech.id);
                  const isSel      = selTech === tech.id;
                  const totalJobs  = appointments.filter(a => a.technician_id === tech.id).length;
                  const todaysJobs = appointments.filter(a => a.technician_id === tech.id && a.schedule_date && isSameDay(new Date(a.schedule_date), date)).length;

                  return (
                    <button key={tech.id} onClick={() => setSelTech(tech.id)}
                      className="w-full text-left p-3 rounded-2xl border transition-all duration-150 hover:scale-[1.01]"
                      style={{
                        background: isSel ? 'rgba(255,193,7,0.08)' : 'rgba(255,255,255,0.015)',
                        border: isSel ? `1px solid ${T.borderHi}` : `1px solid ${T.border}`,
                        boxShadow: isSel ? `0 0 16px ${T.glow}` : 'none',
                      }}>
                      <div className="flex items-center gap-3">
                        <Avatar person={tech} size={9} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{fullName(tech)}</p>
                          <p className="text-[8px] font-semibold mt-0.5" style={{ color: busy ? '#FF9142' : '#3DDC84' }}>
                            {busy ? `● ${todaysJobs} job(s) that day` : '● Free that day'} · {totalJobs} total
                          </p>
                        </div>
                        <div className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all shrink-0" style={{ width: 18, height: 18, borderColor: isSel ? T.yellow : 'rgba(255,255,255,0.15)', background: isSel ? T.yellow : 'transparent' }}>
                          {isSel && <div className="w-2 h-2 rounded-full" style={{ background: '#0B1F3A' }} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {techs.length === 0 && (
                  <p className="text-[10px] font-medium text-center py-4" style={{ color: T.muted }}>No technician profiles found</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5" style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => selAppt && selTech && onAssign(selAppt, selTech)} disabled={!selAppt || !selTech}
            className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
            style={{ background: (selAppt && selTech) ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'rgba(255,255,255,0.04)', color: (selAppt && selTech) ? '#0B1F3A' : T.muted, boxShadow: (selAppt && selTech) ? `0 4px 18px ${T.glow}` : 'none' }}>
            Assign Technician
          </button>
        </div>
      </div>
    </>
  );
};

/* ---------- Technician Registry card (section 12-14) ---------- */
const TechCard = ({ tech, appointments, index = 0 }) => {
  const mine       = appointments.filter(a => a.technician_id === tech.id);
  const total      = mine.length;
  const completed  = mine.filter(a => a.status?.toLowerCase() === 'completed').length;
  const pending    = mine.filter(a => a.status?.toLowerCase() === 'pending').length;
  const today      = mine.filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), new Date())).length;
  const upcoming   = mine.filter(a => a.schedule_date && new Date(a.schedule_date) > new Date() && !['completed', 'cancelled'].includes(a.status?.toLowerCase())).length;
  const currentJob = mine.find(a => (['active', 'in_progress'].includes(a.status?.toLowerCase()) || a.started_at) && !a.completed_at);
  const rate       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const tStatus    = technicianStatus(tech, appointments);

  return (
    <Glass hoverGlow className="p-5 rise" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: `${tStatus.color}14`, border: `1px solid ${tStatus.color}30` }}>
          <Dot color={tStatus.color} pulse={tStatus.key === 'in_progress'} size={5} />
          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: tStatus.color }}>{tStatus.label}</span>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><MoreHorizontal size={13} /></button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Avatar person={tech} size={12} />
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2" style={{ background: tStatus.color, borderColor: T.card }} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-black text-sm text-white tracking-tight truncate">{fullName(tech)}</h4>
          <p className="text-[8px] font-semibold truncate mt-0.5" style={{ color: T.muted }}>{tech.email}</p>
        </div>
      </div>

      <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
        <p className="text-[7px] font-bold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Current Job</p>
        <p className="text-[10px] font-bold truncate" style={{ color: currentJob ? T.gold : T.muted }}>
          {currentJob ? currentJob.service_type : 'No active job'}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {[
          { label: 'Today', val: today },
          { label: 'Upcoming', val: upcoming },
          { label: 'Done', val: completed },
          { label: 'Pending', val: pending },
        ].map(({ label, val }) => (
          <div key={label} className="p-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}` }}>
            <p className="text-sm font-black" style={{ color: T.gold }}>{val}</p>
            <p className="text-[6.5px] font-bold uppercase tracking-wider mt-0.5" style={{ color: T.muted }}>{label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[8px] font-bold mb-1" style={{ color: T.muted }}>
          <span>Completion Rate · {total} total jobs</span><span style={{ color: T.gold }}>{rate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full rounded-full transition-all duration-700 origin-left" style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 0 8px ${T.glow}` }} />
        </div>
      </div>
    </Glass>
  );
};

const FABMenu = ({ onAssign }) => {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: 'Assign Technician', icon: UserCheck, action: onAssign },
    { label: 'View Logs',         icon: BookOpen,  action: () => {} },
    { label: 'Settings',          icon: Settings,  action: () => {} },
  ];
  return (
    <div className="fixed bottom-7 right-7 z-50 flex flex-col-reverse items-end gap-2">
      {open && actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white px-2 py-1 rounded-lg" style={{ background: T.navyDeep, border: `1px solid ${T.border}` }}>
              {a.label}
            </span>
            <button onClick={() => { a.action(); setOpen(false); }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-[#0B1F3A] transition-all hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 14px ${T.glow}` }}>
              <Icon size={15} />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#0B1F3A] shadow-2xl transition-all hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 8px 28px ${T.glow}`, transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .25s cubic-bezier(.16,1,.3,1)' }}>
        <Plus size={20} />
      </button>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans','Syne',system-ui,sans-serif" }}>
    <div className="flex items-center justify-between mb-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl yshimmer" />
        <div>
          <div className="w-40 h-4 rounded yshimmer mb-1.5" />
          <div className="w-28 h-2.5 rounded yshimmer" />
        </div>
      </div>
    </div>
    <div className="flex-1 flex gap-3 min-h-0">
      <Glass className="flex-1 overflow-hidden relative"><div className="yshimmer absolute inset-0" /></Glass>
      <div className="w-72 flex flex-col gap-3 shrink-0">
        <Glass className="flex-1 overflow-hidden relative"><div className="yshimmer absolute inset-0" /></Glass>
        <Glass className="h-40 overflow-hidden relative shrink-0"><div className="yshimmer absolute inset-0" /></Glass>
      </div>
    </div>
  </div>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3 shrink-0" style={{ background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.28)' }}>
    <AlertTriangle size={14} style={{ color: '#FF5A5A' }} className="shrink-0" />
    <p className="text-[11px] font-semibold flex-1" style={{ color: '#FF5A5A' }}>{message}</p>
    <button onClick={onRetry} className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg hover:brightness-125" style={{ background: 'rgba(255,90,90,0.14)', color: '#FF5A5A' }}>
      Retry
    </button>
  </div>
);

const TechnicianManagement = ({ isDark }) => {
  const [techs,        setTechs]        = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [areas,        setAreas]        = useState([]);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [curMonth,     setCurMonth]     = useState(new Date());
  const [viewMode,     setViewMode]     = useState('calendar');
  const [calView,      setCalView]      = useState('month');
  const [selDate,      setSelDate]      = useState(null);
  const [openApp,      setOpenApp]      = useState(null);
  const [assignDate,   setAssignDate]   = useState(null);
  const [attention,    setAttention]    = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ data: p, error: pErr }, { data: a, error: aErr }, { data: ar, error: arErr }, { data: it, error: itErr }] = await Promise.all([
        // Technicians are resolved from profiles.role = 'technician' (never appointments.user_id).
        supabase.from('profiles').select('*').eq('role', 'technician'),
        supabase.from('appointments').select('*'),
        supabase.from('appointment_areas').select('*'),
        supabase.from('appointment_items').select('*'),
      ]);
      if (pErr || aErr || arErr || itErr) throw (pErr || aErr || arErr || itErr);
      setTechs(p || []);
      setAppointments(a || []);
      setAreas(ar || []);
      setItems(it || []);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to load dispatch data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('dispatch-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_areas' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_items' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  // technician_id -> profiles.id, filtered to role='technician'. Never resolved via appointments.user_id.
  const techsById = useMemo(() => new Map(techs.map(t => [t.id, t])), [techs]);

  const areasByAppointment = useMemo(() => {
    const map = new Map();
    areas.forEach(a => {
      if (!map.has(a.appointment_id)) map.set(a.appointment_id, []);
      map.get(a.appointment_id).push(a);
    });
    return map;
  }, [areas]);

  const itemsByAppointment = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      if (!it.appointment_id) return;
      if (!map.has(it.appointment_id)) map.set(it.appointment_id, []);
      map.get(it.appointment_id).push(it);
    });
    return map;
  }, [items]);

  // Assignment updates appointments.technician_id on the EXISTING appointment — never inserts a new row.
  const assignTech = async (appointmentId, techId) => {
    const { error: updErr } = await supabase
      .from('appointments')
      .update({ technician_id: techId, assigned_at: new Date().toISOString(), status: 'scheduled' })
      .eq('id', appointmentId);
    setAssignDate(null);
    if (!updErr) {
      load();
      Swal.fire({ title: 'Assigned', text: 'Technician assigned to appointment.', icon: 'success', background: T.navyDeep, color: '#fff', confirmButtonColor: T.yellow });
    } else {
      Swal.fire({ title: 'Error', text: updErr.message, icon: 'error', background: T.navyDeep, color: '#fff', confirmButtonColor: T.yellow });
    }
  };

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(curMonth)),
    end: endOfWeek(endOfMonth(curMonth)),
  });

  const filteredTechs = techs.filter(t => fullName(t).toLowerCase().includes(search.toLowerCase()));

  const matchesAttention = useCallback((a) => {
    if (attention === 'unassigned') return !a.technician_id && !['completed', 'cancelled'].includes(a.status?.toLowerCase());
    if (attention === 'payment') return a.payment_status?.toLowerCase() === 'pending' && Number(a.downpayment_paid) > 0;
    if (attention === 'priority') return a.priority?.toLowerCase() === 'high' || a.priority?.toLowerCase() === 'urgent';
    return true;
  }, [attention]);

  const filterAppts = useCallback((day) => {
    let base = appointments.filter(a => a.schedule_date && isSameDay(new Date(a.schedule_date), day));
    base = base.filter(matchesAttention);
    if (!search) return base;
    return base.filter(a =>
      a.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      a.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [appointments, search, matchesAttention]);

  const filteredAppointments = useMemo(() => appointments.filter(matchesAttention), [appointments, matchesAttention]);

  const activeCount  = appointments.filter(a => ['active', 'in_progress', 'scheduled', 'assigned'].includes(a.status?.toLowerCase())).length;
  const pendingCount = appointments.filter(a => a.status?.toLowerCase() === 'pending').length;

  if (loading) return (<><GlobalStyle /><LoadingScreen /></>);

  return (
    <>
      <GlobalStyle />

      <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans','Syne',system-ui,sans-serif", background: `radial-gradient(1200px 500px at 10% -10%, rgba(255,193,7,0.05), transparent), ${T.navy}` }}>

        {error && <ErrorBanner message={error} onRetry={load} />}

        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3 shrink-0 rise flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 0 14px ${T.glow}` }}>
              <Compass size={13} className="text-[#0B1F3A]" strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-none">Dispatch Center</h2>
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest mt-1" style={{ color: '#3DDC84' }}>
                <Dot color="#3DDC84" pulse size={5} /> Live
              </span>
            </div>
            <div className="hidden md:flex items-center gap-4 ml-4 pl-4" style={{ borderLeft: `1px solid ${T.border}` }}>
              <LiveClock />
              <div className="flex items-center gap-1.5">
                <Radio size={11} style={{ color: T.yellow }} />
                <span className="text-[11px] font-black text-white"><Counter to={activeCount} /></span>
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.muted }}>Active</span>
              </div>
            </div>
          </div>

          <AttentionBar appointments={appointments} filter={attention} setFilter={setAttention} />

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
              {[{ k: 'calendar', Icon: LayoutGrid, l: 'Calendar' }, { k: 'registry', Icon: Users, l: 'Registry' }].map(({ k, Icon, l }) => (
                <button key={k} onClick={() => setViewMode(k)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background: viewMode === k ? `linear-gradient(135deg, ${T.yellow}, ${T.gold})` : 'transparent',
                    color: viewMode === k ? '#0B1F3A' : T.muted,
                  }}>
                  <Icon size={11} />{l}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-1.5 rounded-lg hover:rotate-180 duration-500 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, color: T.muted }}>
              <RefreshCw size={12} />
            </button>
            <button onClick={() => setAssignDate(selDate || new Date())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-[#0B1F3A] transition-all hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${T.yellow}, ${T.gold})`, boxShadow: `0 4px 14px ${T.glow}` }}>
              <UserCheck size={12} /> Assign
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

            {/* Calendar — the main visual focus (section 3) */}
            <Glass className="flex-1 flex flex-col overflow-hidden p-4 min-w-0 min-h-0 rise">

              <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
                <button
                  onClick={() => setCurMonth(new Date())}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all hover:brightness-110"
                  style={{ background: 'rgba(255,193,7,0.14)', border: `1px solid ${T.border}`, color: T.gold }}>
                  Today
                </button>
                <div className="flex gap-0.5">
                  <button onClick={() => setCurMonth(subMonths(curMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><ChevronLeft size={13} /></button>
                  <button onClick={() => setCurMonth(addMonths(curMonth, 1))} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: T.muted }}><ChevronRight size={13} /></button>
                </div>
                <h3 className="text-sm font-black text-white">{format(curMonth, 'MMMM yyyy')}</h3>

                <div className="flex-1" />

                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search jobs…"
                    className="yfocus pl-7 pr-3 py-1.5 text-[10px] font-medium text-white outline-none rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, width: 140 }}
                  />
                </div>

                <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                  {[{ k: 'month', l: 'Month' }, { k: 'agenda', l: 'Agenda' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setCalView(k)}
                      className="px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                      style={{ background: calView === k ? 'rgba(255,193,7,0.14)' : 'transparent', color: calView === k ? T.gold : T.muted }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {calView === 'month' ? (
                <>
                  <div className="grid grid-cols-7 mb-2 shrink-0">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-[9px] font-black uppercase tracking-widest py-1.5" style={{ color: T.muted }}>{d}</div>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 grid grid-cols-7 gap-2 overflow-y-auto noscroll pr-1" style={{ gridTemplateRows: `repeat(${Math.ceil(calDays.length / 7)}, minmax(116px, 1fr))` }}>
                    {calDays.map((day, i) => (
                      <DayCell
                        key={i}
                        index={i}
                        day={day}
                        appts={filterAppts(day)}
                        techsById={techsById}
                        inMonth={format(day, 'MM') === format(curMonth, 'MM')}
                        selectedDate={selDate}
                        onDayClick={(d) => { setSelDate(d); }}
                        onAppClick={setOpenApp}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <AgendaView appointments={filteredAppointments} techsById={techsById} onOpen={setOpenApp} />
              )}
            </Glass>

            {/* Sidebar: today's schedule, next up (sections 3, 17, 18) */}
            <div className="w-72 flex flex-col gap-3 shrink-0 min-h-0">
              <Glass className="flex-1 p-4 min-h-0 rise" style={{ animationDelay: '60ms' }}>
                <TodayPanel appointments={filteredAppointments} techsById={techsById} selectedDate={selDate} onOpen={setOpenApp} />
              </Glass>
              <Glass className="p-4 shrink-0 rise" style={{ animationDelay: '100ms' }}>
                <UpcomingJobs appointments={filteredAppointments} techsById={techsById} onOpen={setOpenApp} />
              </Glass>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="relative mb-4 shrink-0">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search technicians…"
                className="yfocus w-full pl-10 pr-4 py-2.5 text-[11px] font-medium text-white outline-none rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }} />
            </div>
            <div className="flex-1 overflow-y-auto noscroll">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
                {filteredTechs.map((tech, i) => (
                  <TechCard key={tech.id} tech={tech} appointments={appointments} index={i} />
                ))}
                {filteredTechs.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center py-16">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,193,7,0.06)', border: `1px solid ${T.border}` }}>
                      <Users size={22} style={{ color: T.muted }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: T.text2 }}>No technicians found</p>
                    <p className="text-[10px] mt-1" style={{ color: T.muted }}>
                      {techs.length === 0 ? 'No profiles with role = technician yet' : 'Try a different search term'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {openApp && (
          <DetailDrawer
            app={openApp}
            techsById={techsById}
            areas={areasByAppointment.get(openApp.id) || []}
            items={itemsByAppointment.get(openApp.id) || []}
            onClose={() => setOpenApp(null)}
          />
        )}
        {assignDate && !openApp && (
          <AssignDrawer date={assignDate} techs={techs} appointments={appointments} onAssign={assignTech} onClose={() => setAssignDate(null)} />
        )}

        <FABMenu onAssign={() => setAssignDate(selDate || new Date())} />
      </div>
    </>
  );
};

export default TechnicianManagement;
