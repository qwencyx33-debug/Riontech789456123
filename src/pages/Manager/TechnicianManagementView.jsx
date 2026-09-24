import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle, Clock, ShieldAlert,
  Activity, Map, Award, Search, Radio,
  ChevronRight, Briefcase, Zap, TrendingUp,
  MoreVertical, Calendar, Star, Filter,
  ArrowUpRight, Loader2, Grid, List,
  Phone, Mail, MapPin, Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const mergeTechStats = (technicians, appointments) => {
  return technicians.map(tech => {
    const techJobs = appointments.filter(a => a.technician_id === tech.id);
    const completed  = techJobs.filter(a => a.status === 'completed').length;
    const pending    = techJobs.filter(a => a.status === 'pending').length;
    const inProgress = techJobs.filter(a => ['assigned', 'qc'].includes(a.status)).length;
    const total      = techJobs.length;
    const rate       = total > 0 ? Math.round((completed / total) * 100) : 0;

    
    let liveStatus = 'available';
    if (inProgress > 0) liveStatus = 'on-job';
    else if (pending > 0) liveStatus = 'standby';

    return { ...tech, completed, pending, inProgress, total, rate, liveStatus };
  });
};

const STATUS_CONFIG = {
  'on-job':   { label: 'On Job',    color: '#EAB308', bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.2)',    pulse: true  },
  'standby':  { label: 'Standby',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  pulse: false },
  'available':{ label: 'Available', color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  pulse: false },
};

const getInitials = (first, last) =>
  `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();

const AVATAR_COLORS = [
  '#EAB308', '#10b981', '#3b82f6', '#f97316',
  '#a855f7', '#06b6d4', '#ec4899', '#84cc16',
];

const avatarColor = (id) =>
  AVATAR_COLORS[parseInt(id?.slice(-2) || '0', 16) % AVATAR_COLORS.length];



const StatusDot = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.available;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.pulse
        ? <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: cfg.color }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: cfg.color }} />
          </span>
        : <Circle size={5} fill={cfg.color} style={{ color: cfg.color }} />
      }
      {cfg.label}
    </span>
  );
};

const MetricCard = ({ label, value, sub, color, icon: Icon, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl p-5 border group transition-all hover:border-white/10"
    style={{ background: '#0a0f18', borderColor: 'rgba(255,255,255,0.05)' }}
  >
    <div className="flex items-start justify-between mb-3">
      <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</p>
      <div className="p-2 rounded-xl transition-transform group-hover:rotate-12"
        style={{ background: `${color}15`, color }}>
        <Icon size={14} />
      </div>
    </div>
    <p className="text-2xl font-black tracking-tighter text-white mb-0.5">{value}</p>
    {sub && <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(100,116,139,0.7)' }}>{sub}</p>}
    <div className="absolute bottom-0 left-0 right-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
  </motion.div>
);

const TechCard = ({ tech, index, onClick }) => {
  const color   = avatarColor(tech.id);
  const initials = getInitials(tech.first_name, tech.last_name);

  return (
    <motion.div
      layout
      key={tech.id}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onClick(tech)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-white/10"
      style={{ background: '#0a0f18', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {}
      <div className="h-0.5 w-full transition-all" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />

      <div className="p-5">
        {}
        <div className="flex items-start gap-4 mb-5">
          {}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[13px] font-black transition-transform group-hover:scale-110"
              style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
              {initials}
            </div>
            {}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md border-2 flex items-center justify-center"
              style={{ background: STATUS_CONFIG[tech.liveStatus]?.color || '#10b981', borderColor: '#0a0f18' }}>
              {tech.liveStatus === 'on-job'
                ? <Zap size={7} className="text-black" fill="black" />
                : <Circle size={5} fill="black" className="text-black" />
              }
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-black text-white tracking-tight truncate group-hover:text-[#EAB308] transition-colors">
              {tech.first_name} {tech.last_name}
            </h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-0.5 truncate">
              {tech.email || `ID: ${tech.id?.slice(0, 8)}`}
            </p>
            <div className="mt-2">
              <StatusDot status={tech.liveStatus} />
            </div>
          </div>

          <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
        </div>

        {}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Total',     value: tech.total,     color: 'rgba(148,163,184,0.8)' },
            { label: 'Done',      value: tech.completed, color: '#10b981' },
            { label: 'Active',    value: tech.inProgress, color: '#EAB308' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[13px] font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest text-slate-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Completion Rate</p>
            <p className="text-[8px] font-black" style={{ color: tech.rate >= 80 ? '#10b981' : tech.rate >= 50 ? '#EAB308' : '#ef4444' }}>
              {tech.rate}%
            </p>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tech.rate}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: index * 0.04 + 0.3 }}
              className="h-full rounded-full"
              style={{
                background: tech.rate >= 80
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : tech.rate >= 50
                    ? 'linear-gradient(90deg, #EAB308, #fbbf24)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TechRow = ({ tech, index, onClick }) => {
  const color    = avatarColor(tech.id);
  const initials = getInitials(tech.first_name, tech.last_name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onClick(tech)}
      className="group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:border-white/10"
      style={{ background: '#0a0f18', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black"
          style={{ background: `${color}20`, color, border: `1px solid ${color}25` }}>
          {initials}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-md border-2 flex items-center justify-center"
          style={{ background: STATUS_CONFIG[tech.liveStatus]?.color || '#10b981', borderColor: '#0a0f18' }}>
          {tech.liveStatus === 'on-job' && <Zap size={6} className="text-black" fill="black" />}
        </div>
      </div>

      {}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-white tracking-tight group-hover:text-[#EAB308] transition-colors truncate">
          {tech.first_name} {tech.last_name}
        </p>
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5 truncate">
          {tech.email || `UID: ${tech.id?.slice(0, 10)}`}
        </p>
      </div>

      {}
      <div className="hidden sm:block flex-shrink-0">
        <StatusDot status={tech.liveStatus} />
      </div>

      {}
      <div className="hidden md:flex items-center gap-6 flex-shrink-0">
        {[
          { label: 'Jobs', value: tech.total },
          { label: 'Done', value: tech.completed, color: '#10b981' },
          { label: 'Active', value: tech.inProgress, color: '#EAB308' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[12px] font-black" style={{ color: s.color || 'rgba(255,255,255,0.8)' }}>{s.value}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {}
      <div className="hidden lg:block w-24 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Rate</p>
          <p className="text-[8px] font-black" style={{ color: tech.rate >= 80 ? '#10b981' : '#EAB308' }}>{tech.rate}%</p>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${tech.rate}%` }}
            transition={{ duration: 0.8, delay: index * 0.03 + 0.2 }}
            className="h-full rounded-full"
            style={{ background: tech.rate >= 80 ? '#10b981' : '#EAB308' }}
          />
        </div>
      </div>

      <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0" />
    </motion.div>
  );
};

const TechDetailPanel = ({ tech, onClose }) => {
  if (!tech) return null;
  const color    = avatarColor(tech.id);
  const initials = getInitials(tech.first_name, tech.last_name);
  const cfg      = STATUS_CONFIG[tech.liveStatus] || STATUS_CONFIG.available;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="fixed top-0 right-0 h-full z-[200] flex flex-col overflow-hidden"
      style={{ width: 'min(400px, 100vw)', background: '#0a0f18', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-40px 0 80px rgba(0,0,0,0.6)' }}
    >
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: color }} />

      {}
      <div className="p-6 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between mb-5">
          <StatusDot status={tech.liveStatus} />
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all"
            style={{ color: 'rgba(148,163,184,0.5)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {tech.first_name} {tech.last_name}
            </h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Field Technician</p>
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-6 space-y-5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

        {}
        <div className="space-y-2">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Contact</p>
          {[
            { icon: Mail,  value: tech.email   || 'Not provided' },
            { icon: Phone, value: tech.phone   || 'Not provided' },
            { icon: MapPin,value: tech.address || 'Not assigned' },
          ].map(({ icon: Icon, value }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Icon size={12} className="text-slate-600 flex-shrink-0" />
              <p className="text-[10px] font-bold text-white/70 truncate">{value}</p>
            </div>
          ))}
        </div>

        {}
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">Performance</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Total Jobs',  value: tech.total,     color: 'rgba(255,255,255,0.8)' },
              { label: 'Completed',   value: tech.completed, color: '#10b981' },
              { label: 'In Progress', value: tech.inProgress, color: '#EAB308' },
              { label: 'Pending',     value: tech.pending,   color: '#3b82f6' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-2xl font-black tracking-tighter" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {}
          <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Completion Rate</p>
              <p className="text-[13px] font-black" style={{ color: tech.rate >= 80 ? '#10b981' : '#EAB308' }}>{tech.rate}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${tech.rate}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: tech.rate >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#EAB308,#fbbf24)' }}
              />
            </div>
          </div>
        </div>

        {}
        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">Technician ID</p>
          <p className="text-[10px] font-black text-slate-400 tracking-widest font-mono">{tech.id}</p>
        </div>

      </div>
    </motion.div>
  );
};

const TechnicianManagementView = () => {
  const [technicians,   setTechnicians]   = useState([]);
  const [appointments,  setAppointments]  = useState([]);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [isLoading,     setIsLoading]     = useState(true);
  const [viewMode,      setViewMode]      = useState('grid');  
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [selectedTech,  setSelectedTech]  = useState(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [techRes, apptRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'technician').order('first_name', { ascending: true }),
      supabase.from('appointments').select('id, technician_id, status'),
    ]);
    setTechnicians(techRes.data || []);
    setAppointments(apptRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('tech_registry_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.technician' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAll)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const enriched = useMemo(() => mergeTechStats(technicians, appointments), [technicians, appointments]);

  const filtered = useMemo(() => enriched.filter(t => {
    const name = `${t.first_name} ${t.last_name}`.toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.liveStatus === statusFilter;
    return matchSearch && matchStatus;
  }), [enriched, searchTerm, statusFilter]);

  const onJob     = enriched.filter(t => t.liveStatus === 'on-job').length;
  const available = enriched.filter(t => t.liveStatus === 'available').length;
  const standby   = enriched.filter(t => t.liveStatus === 'standby').length;
  const avgRate   = enriched.length > 0
    ? Math.round(enriched.reduce((a, t) => a + t.rate, 0) / enriched.length)
    : 0;

  return (
    <div className="min-h-screen w-full pb-20" style={{ background: '#020617' }}>

      {}
      <AnimatePresence>
        {selectedTech && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190]"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedTech(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTech && <TechDetailPanel tech={selectedTech} onClose={() => setSelectedTech(null)} />}
      </AnimatePresence>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

        {}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
              </span>
              <p className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: '#EAB308' }}>Live · Riontech Field Ops</p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Technician Registry</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-600">Field Personnel Monitoring</p>
          </div>

          {}
          <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { v: 'grid', icon: <Grid size={13} /> },
              { v: 'list', icon: <List size={13} /> },
            ].map(({ v, icon }) => (
              <button key={v} onClick={() => setViewMode(v)}
                className="px-3 py-2.5 transition-all"
                style={{ background: viewMode === v ? '#EAB308' : 'rgba(255,255,255,0.03)', color: viewMode === v ? '#000' : 'rgba(148,163,184,0.5)' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Personnel" value={enriched.length} sub="registered"       color="#EAB308" icon={Users}     delay={0}    />
          <MetricCard label="On Job"           value={onJob}           sub="currently active" color="#EAB308" icon={Zap}       delay={0.05} />
          <MetricCard label="Available"        value={available}       sub="ready to deploy"  color="#10b981" icon={CheckCircle} delay={0.1} />
          <MetricCard label="Avg Completion"   value={`${avgRate}%`}  sub="completion rate"  color="#3b82f6" icon={TrendingUp} delay={0.15} />
        </div>

        {}
        <div className="flex flex-col sm:flex-row gap-3">
          {}
          <div className="relative flex-1 group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: searchTerm ? '#EAB308' : 'rgba(100,116,139,0.6)' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full py-3 pl-11 pr-4 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none transition-all"
              style={{ background: '#0a0f18', border: `1px solid ${searchTerm ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.07)'}`, color: '#fff' }}
            />
          </div>

          {}
          <div className="flex items-center gap-1 p-1 rounded-xl flex-shrink-0"
            style={{ background: '#0a0f18', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { key: 'all',       label: 'All',       count: enriched.length },
              { key: 'on-job',    label: 'On Job',    count: onJob },
              { key: 'available', label: 'Available', count: available },
              { key: 'standby',   label: 'Standby',   count: standby },
            ].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                style={{
                  background: statusFilter === f.key ? '#EAB308' : 'transparent',
                  color: statusFilter === f.key ? '#000' : 'rgba(148,163,184,0.5)',
                }}>
                {f.label}
                <span className="px-1.5 py-0.5 rounded-full text-[7px]"
                  style={{ background: statusFilter === f.key ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)' }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ color: 'rgba(71,85,105,0.8)' }}>
            <Loader2 className="animate-spin" size={32} />
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">Syncing Personnel Data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-28 rounded-2xl"
            style={{ background: '#0a0f18', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="p-6 rounded-full mb-4" style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.1)' }}>
              <ShieldAlert size={36} style={{ color: 'rgba(234,179,8,0.2)' }} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">No Personnel Found</p>
            <p className="text-[9px] font-bold uppercase tracking-widest mt-2 text-slate-700">Adjust your search or filters.</p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((tech, i) => (
                <TechCard key={tech.id} tech={tech} index={i} onClick={setSelectedTech} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {}
            <div className="hidden lg:grid grid-cols-[1fr_120px_200px_140px_100px_20px] gap-4 px-4 pb-2">
              {['Technician', 'Status', 'Job Counts', 'Completion', ''].map(h => (
                <p key={h} className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">{h}</p>
              ))}
            </div>
            <AnimatePresence mode="popLayout">
              {filtered.map((tech, i) => (
                <TechRow key={tech.id} tech={tech} index={i} onClick={setSelectedTech} />
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};

export default TechnicianManagementView;
