import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, ChevronDown, Calendar, Search, X, Printer,
  CheckCircle2, Clock, MapPin, FileText, UserCheck, Wrench, ShieldCheck,
  Info, Layers, CheckCheck, Star, Wallet, Receipt, Timer, ClipboardList,
  Image as ImageIcon, ZoomIn, ChevronLeft, Phone, Mail, User, Archive,
  Hash, CreditCard, Flag, PackageOpen, Tag,
} from 'lucide-react';

const GOLD = '#FFC107';
const NAVY = '#071A3D';
const CARD = '#0B2350';
const TEXT_LIGHT = '#F5F7FB';
const COMPANY = {
  name: 'RIONTECH SERVICES',
  address: '123 Service Road, Quezon City, Metro Manila, Philippines',
  contact: '+63 2 8123 4567 · support@riontech.ph',
};

const hasVal = (v) =>
  v !== null && v !== undefined && v !== '' &&
  !['n/a', 'na', 'null', 'undefined', '-', '—'].includes(String(v).trim().toLowerCase());

const money = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const getPaidAmount = (item) => {
  const status = (item.payment_status || '').toLowerCase();
  return ['paid', 'full_paid'].includes(status)
    ? Number(item.price || 0)
    : Number(item.actual_paid_amount ?? item.downpayment_paid ?? 0);
};
const getBalance = (item) => Math.max(Number(item.price || 0) - getPaidAmount(item), 0);
const formatStatus = (value) => (value || 'Pending').replaceAll('_', ' ');

const formatDate = (d) => {
  if (!hasVal(d)) return null;
  try {
    return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

const formatDateTime = (d) => {
  if (!hasVal(d)) return null;
  try {
    return new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return d; }
};

const apptNumber = (item) => `APT-${item.id.slice(0, 8).toUpperCase()}`;

const STATUS_CONFIG = {
  completed: {
    label: 'Completed', text: 'text-emerald-300', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30',
    dot: 'bg-emerald-400', glow: '', icon: CheckCheck, ring: 'ring-1 ring-emerald-400/15',
  },
  cancelled: {
    label: 'Cancelled', text: 'text-red-300', bg: 'bg-red-500/15', border: 'border-red-400/30',
    dot: 'bg-red-500', glow: '', icon: X, ring: '',
  },
  rejected: {
    label: 'Rejected', text: 'text-slate-300', bg: 'bg-white/10', border: 'border-white/20',
    dot: 'bg-slate-400', glow: '', icon: X, ring: '',
  },
};
const getStatus = (s) => STATUS_CONFIG[s?.toLowerCase()] || STATUS_CONFIG.completed;

const FILTERS = ['All', 'Completed', 'Cancelled', 'Rejected'];
const ARCHIVE_STATUSES = ['completed', 'cancelled', 'rejected'];

function InfoTile({ icon: Icon, label, value }) {
  if (!hasVal(value)) return null;
  return (
    <div className="p-3.5 bg-white/[0.035] border border-white/[0.08] rounded-xl">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={11} className="text-slate-400" />
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-semibold truncate" style={{ color: TEXT_LIGHT }}>{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: GOLD }} />
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: TEXT_LIGHT }}>{title}</p>
      </div>
      {children}
    </motion.div>
  );
}

function StatusBadge({ status, size = 'sm' }) {
  const cfg = getStatus(status);
  const Icon = cfg.icon;
  const isCompleted = status?.toLowerCase() === 'completed';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow} ${
      size === 'lg' ? 'px-3.5 py-1.5 text-[9px]' : 'px-2.5 py-1 text-[8px]'
    }`}>
      {isCompleted ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}>
          <Icon size={size === 'lg' ? 12 : 10} />
        </motion.span>
      ) : (
        <Icon size={size === 'lg' ? 12 : 10} />
      )}
      {cfg.label}
    </span>
  );
}

function Chip({ children }) {
  if (!hasVal(children)) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[8.5px] font-bold uppercase tracking-wide text-slate-300">
      <Tag size={8} className="text-slate-500" />
      {children}
    </span>
  );
}

function AnimatedPrice({ value, className, style }) {
  const [display, setDisplay] = useState(0);
  const target = Number(value || 0);

  useEffect(() => {
    let frame;
    const duration = 550;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className={className} style={style}>
      {money(display)}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0B2350] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/5 bg-white/10 rounded-full" />
          <div className="h-2 w-1/3 bg-white/10 rounded-full" />
        </div>
        <div className="h-8 w-24 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}

function HistoryCard({ item, onClick, index }) {
  const cfg = getStatus(item.status);
  const StatusIcon = cfg.icon;
  const category = item.service_types?.service_categories?.name;
  const paid = getPaidAmount(item);
  const balance = getBalance(item);
  const schedule = [formatDate(item.schedule_date), item.appointment_time].filter(Boolean).join(' · ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={() => onClick(item)}
      className={`group relative bg-[#080e1c]/90 backdrop-blur-sm border border-white/[0.09] hover:border-[#FFC107]/40 rounded-2xl px-5 py-4 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-[0_12px_32px_-14px_rgba(255,193,7,0.28)] ${cfg.ring}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFC107]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {}
        <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.border} border shrink-0`}>
          <StatusIcon size={16} className={cfg.text} />
        </div>

        {}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-base font-bold truncate leading-tight" style={{ color: TEXT_LIGHT }}>
              {item.service_type}
            </h3>
            <span className="text-[11px] font-medium text-slate-500 shrink-0">
              {apptNumber(item)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {hasVal(item.schedule_date) && (
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <Calendar size={11} /> Appointment {schedule}
              </span>
            )}
            {hasVal(item.completed_at) && (
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <CheckCircle2 size={11} /> Completed {formatDate(item.completed_at)}
              </span>
            )}
          </div>

          {(hasVal(category) || hasVal(item.payment_method) || hasVal(item.payment_status)) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Chip>{category}</Chip>
              <Chip>{item.payment_method}</Chip>
            </div>
          )}
        </div>

        {}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-500 leading-none mb-1">
              Total amount
            </p>
            <AnimatedPrice
              value={item.price}
              className="text-[15px] font-black tracking-tight leading-none"
              style={{ color: TEXT_LIGHT }}
            />
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
        <div className="min-w-0 bg-[#0a1120] px-3.5 py-3">
          <p className="text-[10px] font-medium text-slate-500">Payment</p>
          <p className="mt-1 truncate text-sm font-semibold text-white capitalize">{formatStatus(item.payment_status)}{item.payment_method ? ` · ${item.payment_method}` : ''}</p>
        </div>
        <div className="min-w-0 bg-[#0a1120] px-3.5 py-3">
          <p className="text-[10px] font-medium text-slate-500">Paid · Balance</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{money(paid)} <span className="text-slate-500">·</span> <span className="text-amber-300">{money(balance)}</span></p>
        </div>
        <div className="min-w-0 bg-[#0a1120] px-3.5 py-3">
          <p className="text-[10px] font-medium text-slate-500">Service location</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{item.appointment_address || item.address || 'Not provided'}</p>
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-end border-t border-white/[0.06] pt-2.5">
        <motion.div
          whileHover={{ x: 3 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] group-hover:bg-amber-400/15 group-hover:border-amber-400/30 text-[8.5px] font-black uppercase tracking-widest text-slate-300 group-hover:text-amber-300 transition-all"
        >
          View service details
          <motion.span className="inline-flex" whileHover={{ x: 2 }}>
            <ChevronRight size={11} />
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PhotoGallery({ photos }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos?.length) return null;

  const groups = photos.reduce((acc, p) => {
    const key = hasVal(p.photo_type) ? p.photo_type : 'Photos';
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {});
  const flat = photos;
  const idx = lightbox ? flat.findIndex(p => p.id === lightbox.id) : -1;

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([type, imgs]) => (
        <div key={type}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 capitalize">{type}</p>
          <div className="grid grid-cols-3 gap-2">
            {imgs.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.03 }}
                onClick={() => setLightbox(p)}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group"
              >
                <img src={p.photo_url} alt={type} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(flat[(idx - 1 + flat.length) % flat.length]); }}
              className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={lightbox.photo_url}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] max-w-[85vw] rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(flat[(idx + 1) % flat.length]); }}
              className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceRecordModal({ item, onClose }) {
  const cfg = getStatus(item.status);
  const techName = item.technician
    ? `${item.technician.first_name || ''} ${item.technician.last_name || ''}`.trim()
    : item.service_reports?.[0]?.technician_name;

  const report = item.service_reports?.[0];
  const qc = item.qc_reports?.[0];
  const notes = item.manager_notes_rows?.length
    ? item.manager_notes_rows
    : (hasVal(item.manager_notes) ? [{ note: item.manager_notes, created_at: item.created_at }] : []);
  const category = item.service_types?.service_categories?.name;
  const areas = item.appointment_areas || [];
  const items = item.appointment_items || [];

  const subtotal = Number(item.price || 0);
  const discount = 0; 
  const grandTotal = subtotal - discount;
  const paidAmount = getPaidAmount(item);
  const remainingBalance = getBalance(item);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:p-0">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md print:hidden"
      />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 14 }}
        transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
        className="relative w-full max-w-2xl bg-[#0B2350] rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full border border-white/10"
      >
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${GOLD}, #ffe08a)` }} />

        {}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${cfg.bg} ${cfg.border} border`}>
              <Archive size={20} className={cfg.text} />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: TEXT_LIGHT }}>{item.service_type}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{apptNumber(item)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} size="lg" />
            <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-6 space-y-8 print:hidden">

          {}
          {(hasVal(item.full_name) || hasVal(item.address)) && (
            <Section title="Customer Information" icon={User}>
              <div className="grid grid-cols-2 gap-3">
                <InfoTile icon={User} label="Customer Name" value={item.full_name} />
                <InfoTile icon={MapPin} label="Address" value={item.address} />
              </div>
            </Section>
          )}

          {}
          <Section title="Appointment Information" icon={ClipboardList}>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile icon={Hash} label="Appointment Number" value={apptNumber(item)} />
              <InfoTile icon={Receipt} label="Reference Number" value={item.reference_number} />
              <InfoTile icon={Calendar} label="Booking Date" value={formatDate(item.created_at)} />
              <InfoTile icon={Calendar} label="Appointment Date" value={formatDate(item.schedule_date)} />
              <InfoTile icon={Clock} label="Appointment Time" value={item.appointment_time} />
              <InfoTile icon={CheckCircle2} label="Completion Date" value={formatDate(item.completed_at)} />
              <InfoTile icon={Info} label="Status" value={cfg.label} />
              <InfoTile icon={Flag} label="Priority" value={item.priority} />
            </div>
          </Section>

          {}
          <Section title="Service Information" icon={Layers}>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile icon={Wrench} label="Service Name" value={item.service_type} />
              <InfoTile icon={Layers} label="Category" value={category} />
              <InfoTile icon={Timer} label="Estimated Duration" value={item.service_types?.duration} />
              <InfoTile icon={PackageOpen} label="Quantity" value={item.quantity} />
            </div>
            {hasVal(item.service_types?.description) && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
                <p className="text-[12px] text-slate-300 leading-relaxed">{item.service_types.description}</p>
              </div>
            )}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 mb-1.5">Your request</p>
              <p className="text-sm text-slate-300 leading-relaxed">{item.details || 'No additional service details provided.'}</p>
            </div>
          </Section>

          <Section title="Service Location & Instructions" icon={MapPin}>
            <div className="grid grid-cols-1 gap-3">
              <InfoTile icon={MapPin} label="Full service address" value={item.appointment_address || item.address || 'No address provided'} />
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1.5">Special instructions</p>
                <p className="text-sm text-slate-300 leading-relaxed">{item.special_instructions || item.materials_notes || 'No special instructions provided.'}</p>
              </div>
            </div>
          </Section>

          {(areas.length > 0 || items.length > 0) && (
            <Section title="Areas & Equipment" icon={PackageOpen}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {areas.length > 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-bold text-slate-400 mb-2">Areas / rooms</p>{areas.map((area) => <p key={area.id || area.area_name} className="py-1 text-sm text-slate-300">{area.area_name} <span className="text-slate-500">· Qty {area.quantity || 1}{area.area_size ? ` · ${area.area_size} ${area.area_size_unit || 'sqm'}` : ''}</span></p>)}</div>}
                {items.length > 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-bold text-slate-400 mb-2">Equipment / items</p>{items.map((entry) => <p key={entry.id || entry.item_name} className="py-1 text-sm text-slate-300">{entry.item_name} <span className="text-slate-500">· Qty {entry.quantity || 1}</span></p>)}</div>}
              </div>
            </Section>
          )}

          {}
          {(techName || hasVal(item.assigned_at) || hasVal(item.started_at) || hasVal(item.completed_at) || report?.technician_notes) && (
            <Section title="Technician Information" icon={UserCheck}>
              <div className="grid grid-cols-2 gap-3">
                <InfoTile icon={UserCheck} label="Assigned Technician" value={techName} />
                <InfoTile icon={Clock} label="Arrival Time" value={formatDateTime(item.assigned_at)} />
                <InfoTile icon={Wrench} label="Work Started" value={formatDateTime(item.started_at)} />
                <InfoTile icon={CheckCircle2} label="Work Completed" value={formatDateTime(item.completed_at)} />
              </div>
              {hasVal(report?.technician_notes) && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Technician Notes</p>
                  <p className="text-[12px] text-slate-300 leading-relaxed">{report.technician_notes}</p>
                </div>
              )}
            </Section>
          )}

          {}
          <Section title="Payment Summary" icon={Wallet}>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 space-y-2.5">
                {hasVal(item.payment_method) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Method</span>
                    <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{item.payment_method}</span>
                  </div>
                )}
                {hasVal(item.payment_status) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Status</span>
                    <span className="text-xs font-black capitalize" style={{ color: TEXT_LIGHT }}>{item.payment_status}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Subtotal</span>
                  <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Amount Paid</span>
                  <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{money(paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Remaining Balance</span>
                  <span className="text-xs font-black text-amber-300">{money(remainingBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Discount</span>
                  <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{money(discount)}</span>
                </div>
                {(hasVal(item.payment_ref) || hasVal(item.reference_number)) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Reference Number</span>
                    <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{item.payment_ref || item.reference_number}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Receipt Number</span>
                  <span className="text-xs font-black" style={{ color: TEXT_LIGHT }}>{apptNumber(item)}</span>
                </div>
              </div>
              <div className="border-t border-white/10 p-4 flex items-center justify-between" style={{ background: `${GOLD}1F` }}>
                <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: TEXT_LIGHT }}>Total Amount</span>
                <span className="text-xl font-black" style={{ color: GOLD }}>{money(grandTotal)}</span>
              </div>
            </div>
          </Section>

          <Section title="Payment Receipt" icon={Receipt}>
            {item.receipt_image ? (
              <a href={item.receipt_image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 bg-white/5 hover:border-amber-400/40 transition-colors">
                <img src={item.receipt_image} alt="Payment receipt" className="h-44 w-full object-contain bg-black/20" />
                <p className="px-4 py-3 text-sm font-semibold text-amber-300">View payment receipt</p>
              </a>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No receipt has been uploaded yet.</div>
            )}
          </Section>

          {}
          {item.job_photos?.length > 0 && (
            <Section title="Job Photos" icon={ImageIcon}>
              <PhotoGallery photos={item.job_photos} />
            </Section>
          )}

          {}
          {(qc || hasVal(item.qc_status)) && (qc?.findings || qc?.remarks) && (
            <Section title="Quality Control Findings" icon={ShieldCheck}>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <InfoTile icon={Info} label="Findings" value={qc?.findings} />
                <InfoTile icon={FileText} label="Remarks" value={qc?.remarks} />
              </div>
            </Section>
          )}

          {}
          {notes.length > 0 && (
            <Section title="Manager Notes" icon={FileText}>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[12px] text-slate-300 leading-relaxed">{n.note}</p>
                    {formatDateTime(n.created_at) && (
                      <p className="text-[9px] text-slate-400 font-bold mt-2">{formatDateTime(n.created_at)}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {}
          {(hasVal(item.customer_rating) || hasVal(item.customer_feedback)) && (
            <Section title="Customer Feedback" icon={Star}>
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                {hasVal(item.customer_rating) && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={14} fill={n <= item.customer_rating ? GOLD : 'transparent'} stroke={n <= item.customer_rating ? GOLD : '#475569'} />
                    ))}
                  </div>
                )}
                {hasVal(item.customer_feedback) && (
                  <p className="text-[12px] text-slate-300 leading-relaxed">{item.customer_feedback}</p>
                )}
              </div>
            </Section>
          )}
        </div>

        {}
        <div className="p-5 border-t border-white/10 flex gap-3 print:hidden">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handlePrint}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
            style={{ color: TEXT_LIGHT }}
          >
            <Printer size={13} /> Print Receipt
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg"
            style={{ background: GOLD, color: NAVY, boxShadow: '0 10px 25px -8px rgba(255,193,7,0.5)' }}
          >
            <X size={13} /> Close
          </motion.button>
        </div>
      </motion.div>

      {}
      <div id="printable-receipt" className="hidden print:block">
        <div style={{ padding: '36px', fontFamily: 'Georgia, "Times New Roman", serif', color: '#0f172a' }}>

          {}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `4px solid ${NAVY}`, paddingBottom: '18px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontWeight: 900, fontSize: '20px', fontFamily: 'Arial, sans-serif' }}>R</div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: NAVY, fontFamily: 'Arial, sans-serif' }}>{COMPANY.name}</h1>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '3px 0 0', fontFamily: 'Arial, sans-serif' }}>{COMPANY.address}</p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0', fontFamily: 'Arial, sans-serif' }}>{COMPANY.contact}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 900, margin: 0, color: NAVY, letterSpacing: '1px' }}>SERVICE INVOICE</h2>
              <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0 0' }}>Invoice No. INV-{item.id.slice(0, 8).toUpperCase()}</p>
              <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>Receipt No. {apptNumber(item)}</p>
              <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>Appointment No. {apptNumber(item)}</p>
            </div>
          </div>

          {}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '22px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1px', color: '#94a3b8', margin: '0 0 6px' }}>BILLED TO</p>
              {hasVal(item.full_name) && <p style={{ fontSize: '12px', fontWeight: 700, margin: '2px 0' }}>{item.full_name}</p>}
              {hasVal(item.address) && <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}>{item.address}</p>}
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '1px', color: '#94a3b8', margin: '0 0 6px' }}>SERVICE DETAILS</p>
              <p style={{ fontSize: '11px', margin: '2px 0' }}>Booking Date: <b>{formatDate(item.created_at) || '—'}</b></p>
              <p style={{ fontSize: '11px', margin: '2px 0' }}>Completion Date: <b>{formatDate(item.completed_at) || '—'}</b></p>
            </div>
          </div>

          {}
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: NAVY, color: '#fff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '9px', letterSpacing: '0.5px' }}>SERVICE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '9px', letterSpacing: '0.5px' }}>TECHNICIAN</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '9px', letterSpacing: '0.5px' }}>PAYMENT METHOD</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '9px', letterSpacing: '0.5px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>{item.service_type}</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{techName || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#475569' }}>{item.payment_method || '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{money(subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif' }}>
            <div>
              {hasVal(item.payment_ref || item.reference_number) && (
                <p style={{ fontSize: '11px', color: '#475569' }}>Reference Number: <b style={{ color: '#0f172a' }}>{item.payment_ref || item.reference_number}</b></p>
              )}
            </div>
            <div style={{ width: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0' }}>
                <span style={{ color: '#64748b' }}>Subtotal</span><span>{money(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0' }}>
                <span style={{ color: '#64748b' }}>Discount</span><span>{money(discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, padding: '10px 0 0', marginTop: '6px', borderTop: `2px solid ${NAVY}`, color: NAVY }}>
                <span>GRAND TOTAL</span><span>{money(grandTotal)}</span>
              </div>
            </div>
          </div>

          {}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginTop: '64px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px' }}>
                <p style={{ fontSize: '10px', color: '#475569' }}>Customer Signature</p>
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px' }}>
                <p style={{ fontSize: '10px', color: '#475569' }}>Technician Signature</p>
              </div>
            </div>
          </div>

          <p style={{ marginTop: '40px', fontSize: '10px', color: '#94a3b8', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
            Thank you for choosing our services.
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-3 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:border-white/20"
        style={{ color: TEXT_LIGHT }}
      >
        <Flag size={13} style={{ color: GOLD }} /> {value}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 bg-[#0B2350] border border-white/10 rounded-2xl overflow-hidden shadow-xl z-50 min-w-[160px]"
            >
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => { onChange(f); setOpen(false); }}
                  className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left transition-colors hover:bg-white/10 flex items-center justify-between"
                  style={{ color: value === f ? GOLD : '#94a3b8' }}
                >
                  {f}
                  {value === f && <CheckCircle2 size={12} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="py-24 text-center flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.45 }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: `${GOLD}1A`, border: `1px solid ${GOLD}30` }}
      >
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
          <PackageOpen size={30} style={{ color: GOLD }} />
        </motion.div>
      </motion.div>
      <p className="text-sm font-black uppercase tracking-widest" style={{ color: TEXT_LIGHT }}>
        {hasFilters ? 'No records found' : 'No completed services yet'}
      </p>
      <p className="text-xs text-slate-500 mt-2 max-w-xs">
        {hasFilters ? 'Adjust your search or filter criteria.' : 'Your completed appointments will appear here.'}
      </p>
      {hasFilters && (
        <button onClick={onReset} className="text-[10px] font-black uppercase tracking-widest hover:underline mt-5" style={{ color: GOLD }}>
          Reset Filters
        </button>
      )}
    </motion.div>
  );
}

const ServiceHistory = ({ onBack }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service_types ( title, description, price, duration, requires_survey, service_categories ( name ) ),
          technician:profiles!fk_appointments_technician ( first_name, last_name, email ),
          service_reports ( * ),
          job_photos ( * ),
          qc_reports ( * ),
          manager_notes_rows:manager_notes ( * )
        `)
        .eq('user_id', user.id)
        .in('status', ARCHIVE_STATUSES)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const appointmentIds = (data || []).map((appointment) => appointment.id);
      const [areasRes, itemsRes] = await Promise.all([
        appointmentIds.length ? supabase.from('appointment_areas').select('*').in('appointment_id', appointmentIds) : Promise.resolve({ data: [] }),
        appointmentIds.length ? supabase.from('appointment_items').select('*').in('appointment_id', appointmentIds) : Promise.resolve({ data: [] }),
      ]);
      const areasByAppointment = (areasRes.data || []).reduce((map, area) => {
        (map[area.appointment_id] ||= []).push(area); return map;
      }, {});
      const itemsByAppointment = (itemsRes.data || []).reduce((map, entry) => {
        (map[entry.appointment_id] ||= []).push(entry); return map;
      }, {});
      setAppointments((data || []).map((appointment) => ({
        ...appointment,
        appointment_areas: areasByAppointment[appointment.id] || [],
        appointment_items: itemsByAppointment[appointment.id] || [],
      })));
      setLoadError(false);
    } catch (err) {
      console.error(err.message);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const sub = supabase
      .channel('appointments_history_archive')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchAppointments]);

  useEffect(() => {
    if (selected) {
      const match = appointments.find(a => a.id === selected.id);
      if (match) setSelected(match);
    }
  }, [appointments]); 

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return appointments.filter(item => {
      const matchSearch = !term ||
        item.service_type?.toLowerCase().includes(term) ||
        item.reference_number?.toLowerCase().includes(term) ||
        apptNumber(item).toLowerCase().includes(term) ||
        item.service_reports?.[0]?.technician_name?.toLowerCase().includes(term) ||
        `${item.technician?.first_name || ''} ${item.technician?.last_name || ''}`.toLowerCase().includes(term);
      const matchFilter = activeFilter === 'All' || getStatus(item.status).label === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [appointments, searchTerm, activeFilter]);

  const hasActiveFilters = searchTerm.trim() !== '' || activeFilter !== 'All';
  const resetFilters = () => { setSearchTerm(''); setActiveFilter('All'); };

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-6 p-1 min-h-screen" style={{ background: '#030E10' }}>
        <div className="space-y-3 pt-6">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="relative pb-20 min-h-screen" style={{ background: '#030E10' }}>
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt { position: absolute; top: 0; left: 0; width: 100%; background: #fff; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 -mx-1 px-1 pt-2 pb-4 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ background: 'rgba(7, 26, 61, 0.72)' }}
      >
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-4">
          <ArrowLeft size={13} /> Back
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: TEXT_LIGHT }}>Service history</h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">View your completed services, receipts, and previous appointments.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[220px] group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search appointment, service, receipt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl pl-11 pr-9 py-3 text-xs font-bold placeholder-slate-500 outline-none focus:border-[#FFC107] transition-all"
                style={{ color: TEXT_LIGHT }}
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
                  >
                    <X size={10} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <FilterDropdown value={activeFilter} onChange={setActiveFilter} />
          </div>
        </div>

        {!loading && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[9px] font-black hover:underline uppercase tracking-widest" style={{ color: GOLD }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </motion.div>

      {}
      <div className="px-1 pt-5">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] px-6 py-12 text-center">
            <p className="text-base font-bold text-white">We couldn’t load your appointments.</p>
            <button onClick={fetchAppointments} className="mt-4 text-sm font-semibold text-amber-300 hover:text-amber-200">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onReset={resetFilters} />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, index) => (
                <HistoryCard key={item.id} item={item} index={index} onClick={setSelected} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <ServiceRecordModal item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
};

export default ServiceHistory;
