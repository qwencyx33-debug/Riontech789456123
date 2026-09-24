import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, Calendar, CheckCircle2, ClipboardCheck,
  FileText, MapPin, Search, ShieldCheck, User, X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const gold = '#EAB308';
const ITEMS_PER_PAGE = 6;
const steps = ['Overview', 'Schedule', 'Project', 'Areas', 'Items', 'Assignment', 'Service Report', 'Quality Review', 'Activity'];
const statusLabels = { assigned: 'Active Assignment', qc: 'For Quality Review', completed: 'Completed' };
const priorityRanks = { emergency: 0, urgent: 1, high: 2, medium: 3, normal: 3, low: 4 };

const displayDate = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
  : null;

const displayDateTime = (value) => value
  ? new Date(value).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : null;

const money = (value) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value))
  : null;

const label = (value) => value ? String(value).replaceAll('_', ' ') : null;

const paymentLabel = (value) => ({ 
  full_paid: 'Paid in Full', 
  downpayment_paid: 'Downpayment Paid', 
  pending: 'Payment Pending' 
}[String(value).toLowerCase()] || label(value));

const monthKey = (item) => item.schedule_date ? String(item.schedule_date).slice(0, 7) : 'unscheduled';

const monthLabel = (key) => key === 'unscheduled' 
  ? 'Schedule to be confirmed' 
  : new Date(`${key}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

const normalizeTime = (value) => {
  const twelveHour = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    if (twelveHour[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (twelveHour[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${twelveHour[2]}:00`;
  }
  const twentyFourHour = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  return twentyFourHour ? `${String(twentyFourHour[1]).padStart(2, '0')}:${twentyFourHour[2]}:${twentyFourHour[3] || '00'}` : '23:59:59';
};

const scheduledAt = (item) => item.schedule_date 
  ? new Date(`${String(item.schedule_date).slice(0, 10)}T${normalizeTime(item.appointment_time)}`) 
  : null;

const compareRecords = (left, right) => {
  if (left.status === 'completed' && right.status === 'completed') {
    const completedDifference = new Date(right.completed_at || right.schedule_date || 0).getTime() - new Date(left.completed_at || left.schedule_date || 0).getTime();
    if (completedDifference) return completedDifference;
  }
  const dateDifference = (scheduledAt(left)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (scheduledAt(right)?.getTime() ?? Number.MAX_SAFE_INTEGER);
  if (dateDifference) return dateDifference;
  const priorityDifference = (priorityRanks[(left.priority || '').toLowerCase()] ?? 5) - (priorityRanks[(right.priority || '').toLowerCase()] ?? 5);
  return priorityDifference || new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
};

const profileName = (profile) => profile && ([profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name || profile.email);

const Info = ({ title, value }) => value ? (
  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
    <p className="text-xs font-semibold text-slate-500">{title}</p>
    <p className="mt-1.5 break-words text-sm text-slate-200">{value}</p>
  </div>
) : null;

const Empty = ({ children }) => (
  <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-5 text-sm text-slate-400">
    {children}
  </div>
);

function RecordCard({ record, technician, index, onOpen }) {
  const statusColor = record.status === 'qc' 
    ? 'text-[#EAB308] bg-[#EAB308]/10' 
    : record.status === 'completed' 
    ? 'text-emerald-400 bg-emerald-400/10' 
    : 'text-sky-400 bg-sky-400/10';

  return (
    <motion.article 
      layout 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }} 
      whileHover={{ y: -2 }} 
      className="flex min-h-64 flex-col rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-4 hover:border-[#EAB308]/35"
    >
      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${statusColor}`}>{statusLabels[record.status]}</span>
      <h3 className="mt-4 text-base font-bold text-white">{record.full_name || 'Customer appointment'}</h3>
      <p className="mt-1 text-sm text-slate-400">{record.service_type || 'Service not specified'}</p>
      
      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <p className="flex items-center gap-1.5">
          <Calendar size={13} />
          {displayDate(record.schedule_date) || 'Schedule to be confirmed'} · {record.appointment_time || 'Time to be confirmed'}
        </p>
        <p className="flex items-center gap-1.5 truncate">
          <MapPin size={13} className="shrink-0" />
          {record.address || 'Location not provided'}
        </p>
        <p className="flex items-center gap-1.5">
          <User size={13} />
          {profileName(technician) || 'Technician not available'}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="text-xs">
          <p className="font-semibold text-slate-300">{paymentLabel(record.payment_status) || 'Payment status unavailable'}</p>
          {record.priority && <p className="mt-1 text-slate-500">Priority: {label(record.priority)}</p>}
        </div>
        <button type="button" onClick={() => onOpen(record)} className="text-xs font-bold text-[#EAB308] hover:text-yellow-300">
          View Service Record →
        </button>
      </div>
    </motion.article>
  );
}

function RecordModal({ record, profiles, details, loading, onClose, onAction }) {
  const [step, setStep] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const technician = profiles.find((profile) => profile.id === record.technician_id);
  const assignedBy = profiles.find((profile) => profile.id === record.assigned_by);
  const project = details.project || {};

  useEffect(() => { 
    const overflow = document.body.style.overflow; 
    document.body.style.overflow = 'hidden'; 
    return () => { 
      document.body.style.overflow = overflow; 
    }; 
  }, []);

  const update = async (status) => { 
    setSaving(true); 
    const result = await onAction(record.id, status); 
    setSaving(false); 
    setDialog(null); 
    setFeedback(result.success ? { 
      success: true, 
      title: status === 'completed' ? 'Service Certified' : 'Service Returned for Review', 
      message: status === 'completed' ? `${record.full_name || 'The customer'}'s service record has been certified successfully.` : 'This service has been returned to the pending workflow.' 
    } : { 
      success: false, 
      title: 'Unable to Update Service', 
      message: result.message 
    }); 
  };

  const overview = [
    ['Customer', record.full_name], ['Service', record.service_type], 
    ['Appointment Status', statusLabels[record.status]], ['Priority', label(record.priority)], 
    ['Price', money(record.price)], ['Payment Status', paymentLabel(record.payment_status)], 
    ['Payment Method', label(record.payment_method)], ['Reference Number', record.reference_number || record.payment_ref], 
    ['Downpayment', money(record.downpayment_paid)], ['Survey Required', record.requires_survey == null ? null : record.requires_survey ? 'Yes' : 'No'], 
    ['Materials Notes', record.materials_notes]
  ];

  const activity = [
    ['Appointment Created', record.created_at], ['Technician Assigned', record.assigned_at], 
    ['Service Started', record.started_at], ['Service Completed', record.completed_at],
    ...details.logs.map((log) => [log.action || log.event || log.status || 'Service activity', log.created_at || log.timestamp]),
  ].filter(([, value]) => value);

  const panels = [
    <div className="grid gap-3 sm:grid-cols-2">{overview.map(([title, value]) => <Info key={title} title={title} value={value} />)}</div>,
    <div className="grid gap-3 sm:grid-cols-2">
      <Info title="Scheduled Date" value={displayDate(record.schedule_date)} />
      <Info title="Scheduled Time" value={record.appointment_time} />
      <div className="sm:col-span-2"><Info title="Service Location" value={record.address} /></div>
    </div>,
    loading ? <Empty>Loading project details…</Empty> : !details.project || details.fails.project ? <Empty>Project details are unavailable.</Empty> : (
      <div className="grid gap-3 sm:grid-cols-2">
        <Info title="Property Type" value={project.property_type} />
        <Info title="Property Size" value={project.property_size ? `${project.property_size} ${project.property_size_unit || ''}`.trim() : null} />
        <Info title="Number of Floors" value={project.floor_count} />
        <Info title="Number of Rooms" value={project.room_count} />
        <Info title="Site Notes" value={project.site_notes} />
        <Info title="Customer Requirements" value={project.customer_requirements} />
        <Info title="Customer Comments" value={project.customer_comments} />
      </div>
    ),
    loading ? <Empty>Loading service areas…</Empty> : details.fails.areas ? <Empty>Service areas are unavailable.</Empty> : !details.areas.length ? <Empty>No service areas were specified.</Empty> : (
      <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        {details.areas.map((area) => (
          <div key={area.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <div className="grid gap-2 sm:grid-cols-3">
              <Info title="Area" value={area.area_name} />
              <Info title="Area Size" value={area.area_size ? `${area.area_size} ${area.area_size_unit || ''}`.trim() : null} />
              <Info title="Quantity" value={area.quantity == null ? null : String(area.quantity)} />
            </div>
            <Info title="Notes" value={area.notes} />
          </div>
        ))}
      </div>
    ),
    loading ? <Empty>Loading requested items…</Empty> : details.fails.items ? <Empty>Requested items are unavailable.</Empty> : !details.items.length ? <Empty>No additional items were specified.</Empty> : (
      <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        {details.items.map((item) => (
          <div key={item.id} className="grid gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:grid-cols-2">
            <Info title="Item" value={item.item_name} />
            <Info title="Description" value={item.description} />
            <Info title="Quantity" value={item.quantity == null ? null : String(item.quantity)} />
            <Info title="Unit Price" value={money(item.unit_price)} />
            <Info title="Total" value={money(item.total_price)} />
            <Info title="Customer Comment" value={item.customer_comment} />
          </div>
        ))}
      </div>
    ),
    <div className="grid gap-3 sm:grid-cols-2">
      <Info title="Assigned Technician" value={profileName(technician)} />
      <Info title="Assigned By" value={profileName(assignedBy)} />
      <Info title="Assigned At" value={displayDateTime(record.assigned_at)} />
      <Info title="Priority" value={label(record.priority)} />
      <div className="sm:col-span-2"><Info title="Manager Notes" value={record.manager_notes} /></div>
    </div>,
    loading ? <Empty>Loading service report…</Empty> : details.fails.report ? <Empty>Service report details are unavailable.</Empty> : !details.report ? <Empty>No service report has been submitted.</Empty> : (
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(details.report).filter(([key, value]) => !['id', 'appointment_id', 'created_at', 'updated_at'].includes(key) && value != null && value !== '').map(([key, value]) => (
          <Info key={key} title={label(key)} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
        ))}
      </div>
    ),
    loading ? <Empty>Loading quality review…</Empty> : (
      <div className="space-y-3">
        <Info title="QC Status" value={label(record.qc_status)} />
        {details.fails.qc ? <Empty>Quality review details are unavailable.</Empty> : details.qc ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(details.qc).filter(([key, value]) => !['id', 'appointment_id', 'created_at', 'updated_at'].includes(key) && value != null && value !== '').map(([key, value]) => (
              <Info key={key} title={label(key)} value={typeof value === 'object' ? JSON.stringify(value) : String(value)} />
            ))}
          </div>
        ) : <Empty>No quality review report has been submitted.</Empty>}
        {record.status === 'qc' && (
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={() => setDialog('certify')} className="rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617]">Certify Service</button>
            <button type="button" onClick={() => setDialog('return')} className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10">Return for Review</button>
          </div>
        )}
      </div>
    ),
    loading ? <Empty>Loading activity…</Empty> : details.fails.logs ? <Empty>Activity records are unavailable.</Empty> : !activity.length ? <Empty>No activity records are available.</Empty> : (
      <div className="space-y-3">
        {activity.map(([name, timestamp], index) => (
          <div key={`${name}-${index}`} className="flex gap-3 border-l border-[#EAB308]/40 pl-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">{label(name)}</p>
              <p className="mt-1 text-xs text-slate-500">{displayDateTime(timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  ];

  if (feedback) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-5">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0F18] p-7 text-center shadow-2xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: feedback.success ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)', color: feedback.success ? '#10B981' : '#EF4444' }}>
            {feedback.success ? <CheckCircle2 size={24} /> : '!'}
          </span>
          <h3 className="mt-5 text-lg font-bold text-white">{feedback.title}</h3>
          <p className="mt-2 text-sm text-slate-400">{feedback.message}</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-[#EAB308] px-5 py-2.5 text-sm font-bold text-[#020617]">Continue</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <button type="button" aria-label="Close service record" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <section className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111c] shadow-2xl">
        <header className="flex justify-between border-b border-white/[0.07] px-5 py-4 md:px-7">
          <div>
            <p className="text-xs font-semibold text-[#EAB308]">Service record · {step + 1} of {steps.length}</p>
            <h2 className="mt-1 text-lg font-bold text-white">{record.full_name || 'Customer appointment'}</h2>
            <p className="mt-1 text-sm text-slate-400">{record.service_type || 'Service record'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        <div className="flex gap-1 border-b border-white/[0.07] px-5 py-3 md:px-7">
          {steps.map((name, index) => (
            <div key={name} className="flex-1">
              <div className="h-1 rounded-full" style={{ background: index <= step ? gold : 'rgba(255,255,255,.1)' }} />
              <p className="mt-1 hidden text-[10px] font-medium text-slate-500 lg:block" style={index === step ? { color: gold } : undefined}>{index + 1}. {name}</p>
            </div>
          ))}
        </div>

        <div className="min-h-[320px] overflow-y-auto px-5 py-5 md:px-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
              <h3 className="mb-4 text-base font-bold text-white">{steps[step]}</h3>
              {panels[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between border-t border-white/[0.07] bg-[#08131f] px-5 py-4 md:px-7">
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:invisible">
            <ArrowLeft size={16} />Previous
          </button>
          <button type="button" disabled={step === steps.length - 1} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} className="flex items-center gap-1.5 rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617] disabled:invisible">
            Next <ArrowRight size={16} />
          </button>
        </footer>
      </section>

      <AnimatePresence>
        {dialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0F18] p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white">{dialog === 'certify' ? 'Confirm Service Certification' : 'Return Service for Review'}</h3>
              <div className="mt-4 space-y-2 rounded-xl bg-white/[0.03] p-4 text-sm text-slate-400">
                <p>Customer: <span className="font-semibold text-slate-200">{record.full_name}</span></p>
                <p>Service: <span className="font-semibold text-slate-200">{record.service_type}</span></p>
                <p>Technician: <span className="font-semibold text-slate-200">{profileName(technician) || 'Not available'}</span></p>
                <p>Service Date: <span className="font-semibold text-slate-200">{displayDate(record.schedule_date)} · {record.appointment_time || 'Time to be confirmed'}</span></p>
              </div>
              <p className="mt-4 text-sm text-slate-400">{dialog === 'certify' ? 'Confirm that this service record is ready to be completed.' : 'This service will be returned to the pending workflow.'}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={saving} onClick={() => setDialog(null)} className="px-3 py-2 text-sm font-semibold text-slate-400">Cancel</button>
                <button type="button" disabled={saving} onClick={() => update(dialog === 'certify' ? 'completed' : 'pending')} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${dialog === 'certify' ? 'bg-[#EAB308] text-[#020617]' : 'bg-red-500 text-white'} disabled:opacity-60`}>
                  {saving ? 'Saving…' : dialog === 'certify' ? 'Confirm Certification' : 'Return for Review'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function QCVerificationView() {
  const [records, setRecords] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ project: null, areas: [], items: [], report: null, qc: null, logs: [], fails: {} });
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async (showLoading = true) => { 
    if (showLoading) setLoading(true); 
    const results = await Promise.all([
      supabase.from('appointments').select('*').in('status', ['assigned', 'qc', 'completed']), 
      supabase.from('profiles').select('*').eq('role', 'technician')
    ]); 
    if (results[0].error || results[1].error) {
      toast.error('Unable to load service records. Please try again.'); 
    } else { 
      setRecords(results[0].data || []); 
      setProfiles(results[1].data || []); 
    } 
    if (showLoading) setLoading(false); 
  };

  useEffect(() => { 
    const initial = setTimeout(load, 0); 
    const channel = supabase.channel('qc_realtime_stream').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load(false)).subscribe(); 
    return () => { 
      clearTimeout(initial); 
      supabase.removeChannel(channel); 
    }; 
  }, []);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const months = useMemo(() => [...new Set(records.map(monthKey))].sort(), [records]);
  
  const counts = useMemo(() => records.reduce((result, record) => { 
    if (record.status === 'assigned') result.assigned += 1; 
    if (record.status === 'qc') result.qc += 1; 
    if (record.status === 'completed') result.completed += 1; 
    return result; 
  }, { assigned: 0, qc: 0, completed: 0 }), [records]);

  const filtered = useMemo(() => { 
    const term = search.trim().toLowerCase(); 
    return records.filter((record) => { 
      const technician = profileById.get(record.technician_id); 
      const content = [record.full_name, record.service_type, record.address, record.id, record.reference_number, profileName(technician)].filter(Boolean).join(' ').toLowerCase(); 
      return (!term || content.includes(term)) && 
             (statusFilter === 'all' || record.status === statusFilter) && 
             (month === 'all' || monthKey(record) === month) && 
             (priorityFilter === 'all' || (record.priority || '').toLowerCase() === priorityFilter) && 
             (technicianFilter === 'all' || record.technician_id === technicianFilter) && 
             (paymentFilter === 'all' || (record.payment_status || '').toLowerCase() === paymentFilter); 
    }).sort(compareRecords); 
  }, [records, search, statusFilter, month, priorityFilter, technicianFilter, paymentFilter, profileById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const visible = useMemo(() => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [filtered, page]);
  const first = filtered.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
  const last = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  useEffect(() => setPage(1), [search, statusFilter, month, priorityFilter, technicianFilter, paymentFilter]); 
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const openRecord = async (record) => { 
    setSelected(record); 
    setDetailLoading(true); 
    setDetails({ project: null, areas: [], items: [], report: null, qc: null, logs: [], fails: {} }); 
    const results = await Promise.all([
      supabase.from('appointment_project_details').select('*').eq('appointment_id', record.id).maybeSingle(), 
      supabase.from('appointment_areas').select('*').eq('appointment_id', record.id).order('created_at', { ascending: true }), 
      supabase.from('appointment_items').select('*').eq('appointment_id', record.id).order('created_at', { ascending: true }), 
      supabase.from('service_reports').select('*').eq('appointment_id', record.id).maybeSingle(), 
      supabase.from('qc_reports').select('*').eq('appointment_id', record.id).maybeSingle(), 
      supabase.from('job_logs').select('*').eq('appointment_id', record.id).order('created_at', { ascending: true })
    ]); 
    setDetails({ 
      project: results[0].data || null, 
      areas: results[1].data || [], 
      items: results[2].data || [], 
      report: results[3].data || null, 
      qc: results[4].data || null, 
      logs: results[5].data || [], 
      fails: { 
        project: Boolean(results[0].error), 
        areas: Boolean(results[1].error), 
        items: Boolean(results[2].error), 
        report: Boolean(results[3].error), 
        qc: Boolean(results[4].error), 
        logs: Boolean(results[5].error) 
      } 
    }); 
    setDetailLoading(false); 
  };

  const updateStatus = async (id, status) => { 
    const result = await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id); 
    if (result.error) return { success: false, message: 'The service record could not be updated. Please try again.' }; 
    setRecords((current) => current.map((record) => record.id === id ? { ...record, status } : record)); 
    return { success: true }; 
  };

  const statusFilters = [['all', 'All'], ['assigned', 'Active Assignments'], ['qc', 'Quality Review'], ['completed', 'Completed']];
  const emptyMessage = search 
    ? 'No service records match your search.' 
    : statusFilter === 'assigned' 
    ? 'No active assignments.' 
    : statusFilter === 'qc' 
    ? 'No services are currently waiting for quality review.' 
    : statusFilter === 'completed' 
    ? 'No completed service records found.' 
    : 'No service records match this view.';

  return (
    <div className="min-h-screen bg-[#020617] px-5 py-6 font-sans text-slate-100 md:px-8">
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Quality &amp; Service Records</h1>
            <p className="mt-2 text-sm text-slate-400">Review active assignments, quality reviews, and completed service records.</p>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Active Assignments', counts.assigned, 'text-sky-400', Activity], 
            ['For Quality Review', counts.qc, 'text-[#EAB308]', ClipboardCheck], 
            ['Completed Records', counts.completed, 'text-emerald-400', CheckCircle2]
          ].map(([title, value, color, Icon]) => (
            <div key={title} className="rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-400">{title}</p>
                <Icon size={18} className={color} />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-400">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, service, address, ID, reference, or technician" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
            </label>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map(([value, name]) => (
                <button type="button" key={value} onClick={() => setStatusFilter(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={statusFilter === value ? { color: '#020617', background: gold, borderColor: gold } : { color: '#94A3B8', borderColor: 'rgba(255,255,255,.10)' }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Month', month, setMonth, [['all', 'All months'], ...months.map((value) => [value, monthLabel(value)])]], 
              ['Priority', priorityFilter, setPriorityFilter, [['all', 'All priorities'], ...['normal', 'medium', 'high', 'urgent', 'emergency', 'low'].map((value) => [value, label(value)])]], 
              ['Technician', technicianFilter, setTechnicianFilter, [['all', 'All technicians'], ...profiles.map((profile) => [profile.id, profileName(profile)])]], 
              ['Payment', paymentFilter, setPaymentFilter, [['all', 'All payment statuses'], ...[...new Set(records.map((record) => record.payment_status).filter(Boolean))].map((value) => [value, paymentLabel(value)])]]
            ].map(([name, value, setter, options]) => (
              <label key={name} className="text-xs font-semibold text-slate-500">
                {name}
                <select value={value} onChange={(event) => setter(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#EAB308]">
                  {options.map(([optionValue, optionName]) => (
                    <option key={optionValue} value={optionValue} className="bg-slate-950">{optionName}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#07111c] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">Service Records</h2>
            <span className="text-xs text-slate-500">Showing {first}–{last} of {filtered.length}</span>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((number) => <div key={number} className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />)}
            </div>
          ) : !filtered.length ? (
            <Empty>{emptyMessage}</Empty>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={`${page}-${statusFilter}-${search}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((record, index) => (
                  <RecordCard key={record.id} record={record} technician={profileById.get(record.technician_id)} index={index} onOpen={openRecord} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          <div className="mt-5 flex items-center justify-center gap-4 border-t border-white/[0.07] pt-4">
            <button type="button" disabled={page === 1 || !filtered.length} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:opacity-40">
              <ArrowLeft size={16} />Previous
            </button>
            <span className="text-sm font-semibold text-slate-300">{page} / {totalPages}</span>
            <button type="button" disabled={page === totalPages || !filtered.length} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:opacity-40">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </motion.main>

      <AnimatePresence>
        {selected && <RecordModal record={selected} profiles={profiles} details={details} loading={detailLoading} onClose={() => setSelected(null)} onAction={updateStatus} />}
      </AnimatePresence>
    </div>
  );
}