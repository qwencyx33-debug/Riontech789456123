import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Search, Truck, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const gold = '#EAB308';
const steps = ['Appointment', 'Schedule', 'Project', 'Areas', 'Items', 'Requirements', 'Assignment'];
const PAGE_SIZE = 6;
const paidValues = ['paid', 'full_paid', 'downpayment_paid'];

const label = (value) => value ? String(value).replaceAll('_', ' ') : null;

const money = (value) => 
  Number.isFinite(Number(value)) 
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value)) 
    : null;

const date = (value) => 
  value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

const paid = (item) => paidValues.includes((item.payment_status || '').toLowerCase());

const isNew = (item) => item.created_at && Date.now() - new Date(item.created_at).getTime() < 86400000;

const timeForSort = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) { 
    let hour = Number(match[1]); 
    if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12; 
    if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0; 
    return `${String(hour).padStart(2, '0')}:${match[2]}:00`; 
  }
  const twentyFour = String(value || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  return twentyFour ? `${String(twentyFour[1]).padStart(2, '0')}:${twentyFour[2]}:${twentyFour[3] || '00'}` : '23:59:59';
};

const scheduledAt = (item) => 
  item.schedule_date ? new Date(`${String(item.schedule_date).slice(0, 10)}T${timeForSort(item.appointment_time)}`) : null;

const older = (item) => { 
  const d = scheduledAt(item); 
  const today = new Date(); 
  today.setHours(0, 0, 0, 0); 
  return Boolean(d && !Number.isNaN(d.getTime()) && d < today); 
};

const priority = (item) => ['emergency', 'urgent', 'high'].includes((item.priority || '').toLowerCase());

const monthKey = (item) => item.schedule_date ? String(item.schedule_date).slice(0, 7) : 'unscheduled';

const monthLabel = (key) => 
  key === 'unscheduled' ? 'Schedule to be confirmed' : new Date(`${key}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

const sortAppointments = (a, b) => { 
  const aTime = scheduledAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER; 
  const bTime = scheduledAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER; 
  if (aTime !== bTime) return aTime - bTime; 
  const ranks = { emergency: 0, urgent: 1, high: 2, medium: 3, normal: 3, low: 4 }; 
  const diff = (ranks[(a.priority || '').toLowerCase()] ?? 5) - (ranks[(b.priority || '').toLowerCase()] ?? 5); 
  return diff || new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); 
};

const Info = ({ title, value }) => 
  value ? (
    <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500">{title}</p>
      <p className="mt-1.5 break-words text-sm font-medium text-slate-200">{value}</p>
    </div>
  ) : null;

const Blank = ({ children }) => (
  <div className="rounded-xl border border-white/[.07] bg-white/[.025] px-4 py-5 text-sm text-slate-400">
    {children}
  </div>
);

const Card = ({ item, index, onSelect }) => (
  <motion.article 
    layout 
    initial={{ opacity: 0, y: 10 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: .22, delay: Math.min(index * .035, .18) }} 
    whileHover={{ y: -2 }} 
    className="flex min-h-56 flex-col rounded-2xl border border-white/[.08] bg-[#0A0F18] p-4 hover:border-[#EAB308]/40"
  >
    <div className="flex justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-white">{date(item.schedule_date) || 'Schedule to be confirmed'}</p>
        <p className="mt-1 text-xs font-semibold text-[#EAB308]">{item.appointment_time || 'Time to be confirmed'}</p>
      </div>
      <div className="flex h-fit flex-wrap justify-end gap-1.5">
        {isNew(item) && <span className="rounded-full bg-[#EAB308]/15 px-2 py-1 text-[10px] font-bold text-[#EAB308]">NEW</span>}
        {priority(item) && <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400">{label(item.priority)}</span>}
      </div>
    </div>
    <h3 className="mt-5 text-base font-bold text-white">{item.full_name || 'Customer appointment'}</h3>
    <p className="mt-1 text-sm text-slate-400">{item.service_type || 'Service not specified'}</p>
    <p className="mt-4 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-400">
      <MapPin size={13} className="shrink-0" />
      {item.address || item.location || 'Location not provided'}
    </p>
    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
      <span className={paid(item) ? 'text-xs font-bold text-emerald-400' : 'text-xs font-semibold text-slate-400'}>
        {label(item.payment_status) || 'Payment pending'}
      </span>
      <button 
        type="button" 
        onClick={() => onSelect(item)} 
        className="text-xs font-bold text-[#EAB308] hover:text-yellow-300"
      >
        View appointment →
      </button>
    </div>
  </motion.article>
);

function Review({ item, technicians, details, loading, onClose, onAssign }) {
  const [step, setStep] = useState(0); 
  const [technicianId, setTechnicianId] = useState(''); 
  const [jobPriority, setJobPriority] = useState(item.priority || 'normal'); 
  const [notes, setNotes] = useState(item.manager_notes || ''); 
  const [confirming, setConfirming] = useState(false); 
  const [saving, setSaving] = useState(false); 
  const [feedback, setFeedback] = useState(null);

  const project = details.project || {}; 
  const tech = technicians.find((person) => person.id === technicianId); 
  const techName = tech && ([tech.first_name, tech.last_name].filter(Boolean).join(' ') || tech.full_name || tech.email);

  useEffect(() => { 
    const previous = document.body.style.overflow; 
    document.body.style.overflow = 'hidden'; 
    return () => { 
      document.body.style.overflow = previous; 
    }; 
  }, []);

  const assign = async () => { 
    setSaving(true); 
    const result = await onAssign(item, technicianId, jobPriority, notes); 
    setSaving(false); 
    setConfirming(false); 
    setFeedback(result.success ? { 
      success: true, 
      title: 'Appointment Assigned', 
      message: `${item.full_name || 'The customer'}'s appointment has been assigned successfully.` 
    } : { 
      success: false, 
      title: 'Assignment Failed', 
      message: result.message 
    }); 
  };

  const appointmentInfo = [
    ['Customer', item.full_name], 
    ['Service', item.service_type], 
    ['Appointment Status', label(item.status)], 
    ['Priority', label(item.priority)], 
    ['Price', money(item.price)], 
    ['Payment Status', label(item.payment_status)], 
    ['Payment Method', label(item.payment_method)], 
    ['Reference Number', item.reference_number], 
    ['Downpayment', money(item.downpayment_paid)], 
    ['Survey Required', item.requires_survey == null ? null : item.requires_survey ? 'Yes' : 'No'], 
    ['Materials Notes', item.materials_notes]
  ];

  const requirements = [
    ['Site Notes', project.site_notes], 
    ['Customer Requirements', project.customer_requirements], 
    ['Customer Comments', project.customer_comments], 
    ['Materials Notes', item.materials_notes], 
    ['Manager Notes', item.manager_notes]
  ].filter(([, value]) => value);

  const panels = [
    <div className="grid gap-3 sm:grid-cols-2">{appointmentInfo.map(([title, value]) => <Info key={title} title={title} value={value} />)}</div>, 
    <div className="grid gap-3 sm:grid-cols-2"><Info title="Scheduled Date" value={date(item.schedule_date)} /><Info title="Scheduled Time" value={item.appointment_time} /><div className="sm:col-span-2"><Info title="Service Location" value={item.address || item.location} /></div></div>, 
    loading ? <Blank>Loading project details…</Blank> : !details.project || details.fails.project ? <Blank>Project details are unavailable.</Blank> : <div className="grid gap-3 sm:grid-cols-2"><Info title="Property Type" value={project.property_type} /><Info title="Property Size" value={project.property_size ? `${project.property_size} ${project.property_size_unit || ''}`.trim() : null} /><Info title="Number of Floors" value={project.floor_count} /><Info title="Number of Rooms" value={project.room_count} /></div>, 
    loading ? <Blank>Loading service areas…</Blank> : details.fails.areas ? <Blank>Service area details are unavailable.</Blank> : !details.areas.length ? <Blank>No service areas were provided for this appointment.</Blank> : <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">{details.areas.map((area) => <div key={area.id} className="grid gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 sm:grid-cols-3"><Info title="Area" value={area.area_name} /><Info title="Area Size" value={area.area_size ? `${area.area_size} ${area.area_size_unit || ''}`.trim() : null} /><Info title="Quantity" value={area.quantity == null ? null : String(area.quantity)} />{area.notes && <div className="sm:col-span-3"><Info title="Notes" value={area.notes} /></div>}</div>)}</div>, 
    loading ? <Blank>Loading requested items…</Blank> : details.fails.items ? <Blank>Requested item details are unavailable.</Blank> : !details.items.length ? <Blank>No additional items were specified.</Blank> : <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">{details.items.map((entry) => <div key={entry.id} className="grid gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 sm:grid-cols-2"><Info title="Item" value={entry.item_name} /><Info title="Total" value={money(entry.total_price)} /><Info title="Description" value={entry.description} /><Info title="Quantity" value={entry.quantity == null ? null : String(entry.quantity)} /><Info title="Unit Price" value={money(entry.unit_price)} /><Info title="Customer Comment" value={entry.customer_comment} /></div>)}</div>, 
    loading ? <Blank>Loading requirements…</Blank> : !requirements.length ? <Blank>No additional requirements were provided.</Blank> : <div className="space-y-3">{requirements.map(([title, value]) => <Info key={title} title={title} value={value} />)}</div>, 
    <div className="space-y-5">
      <div>
        <label htmlFor="tech" className="text-sm font-semibold text-slate-200">Assigned Technician</label>
        {!technicians.length ? (
          <div className="mt-2"><Blank>No technicians are currently available for assignment.</Blank></div>
        ) : (
          <select 
            id="tech" 
            value={technicianId} 
            onChange={(event) => setTechnicianId(event.target.value)} 
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm text-white outline-none focus:border-[#EAB308]"
          >
            <option value="">Select a technician</option>
            {technicians.map((person) => (
              <option key={person.id} value={person.id} className="bg-slate-950">
                {[person.first_name, person.last_name].filter(Boolean).join(' ') || person.full_name || person.email || 'Technician'}
                {person.email ? ` — ${person.email}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">Priority</p>
        <div className="mt-2 flex gap-2">
          {['normal', 'high', 'urgent'].map((level) => (
            <button 
              type="button" 
              key={level} 
              onClick={() => setJobPriority(level)} 
              className="rounded-lg border px-3 py-2 text-xs font-bold" 
              style={jobPriority === level ? { color: '#020617', background: gold, borderColor: gold } : { color: '#94A3B8', borderColor: 'rgba(255,255,255,.12)' }}
            >
              {label(level)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="text-sm font-semibold text-slate-200">Manager Notes</label>
        <textarea 
          id="notes" 
          value={notes} 
          onChange={(event) => setNotes(event.target.value)} 
          placeholder="Write a note for the assigned technician…" 
          className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-[#EAB308]" 
        />
      </div>
    </div>
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
          {feedback.success && (
            <div className="mt-4 rounded-xl bg-white/[.03] p-3 text-left text-sm text-slate-400">
              <p>Technician: <span className="font-semibold text-slate-200">{techName}</span></p>
              <p className="mt-1">Schedule: <span className="font-semibold text-slate-200">{date(item.schedule_date)} · {item.appointment_time || 'Time to be confirmed'}</span></p>
            </div>
          )}
          <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-[#EAB308] px-5 py-2.5 text-sm font-bold text-[#020617]">
            {feedback.success ? 'Continue' : 'Close'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <button type="button" aria-label="Close review" onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <section className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111c] shadow-2xl">
        <header className="flex justify-between border-b border-white/[.07] px-5 py-4 md:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#EAB308]">Appointment review · {String(step + 1).padStart(2, '0')}/{steps.length}</p>
            <h2 className="mt-1 text-lg font-bold text-white">{item.full_name || 'Customer appointment'}</h2>
            <p className="mt-1 text-sm text-slate-400">{item.service_type || 'Service appointment'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="flex gap-1 border-b border-white/[.07] px-5 py-3 md:px-7">
          {steps.map((name, index) => (
            <div key={name} className="flex-1">
              <div className="h-1 rounded-full" style={{ background: index <= step ? gold : 'rgba(255,255,255,.1)' }} />
              <p className="mt-1.5 hidden text-[9px] font-semibold text-slate-500 sm:block" style={index === step ? { color: gold } : undefined}>
                {String(index + 1).padStart(2, '0')} {name}
              </p>
            </div>
          ))}
        </div>

        <div className="min-h-[310px] overflow-y-auto px-5 py-5 md:px-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .18 }}>
              <h3 className="mb-4 text-sm font-bold text-white">{steps[step]}</h3>
              {panels[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between border-t border-white/[.07] bg-[#08131f] px-5 py-4 md:px-7">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={!step} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:invisible">
            <ArrowLeft size={16} />Previous
          </button>
          {step === steps.length - 1 ? (
            <button type="button" disabled={!technicianId} onClick={() => setConfirming(true)} className="flex items-center gap-1.5 rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617] disabled:opacity-50">
              Assign job <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="flex items-center gap-1.5 rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617]">
              Next <ArrowRight size={16} />
            </button>
          )}
        </footer>
      </section>

      <AnimatePresence>
        {confirming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0F18] p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Confirm Assignment</h3>
              <div className="mt-4 space-y-2 rounded-xl bg-white/[.03] p-4 text-sm text-slate-400">
                <p>Customer: <span className="font-semibold text-slate-200">{item.full_name}</span></p>
                <p>Service: <span className="font-semibold text-slate-200">{item.service_type}</span></p>
                <p>Schedule: <span className="font-semibold text-slate-200">{date(item.schedule_date)} · {item.appointment_time || 'Time to be confirmed'}</span></p>
                <p>Technician: <span className="font-semibold text-slate-200">{techName}</span></p>
                <p>Priority: <span className="font-semibold text-slate-200">{label(jobPriority)}</span></p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" disabled={saving} onClick={() => setConfirming(false)} className="px-3 py-2 text-sm font-semibold text-slate-400">Cancel</button>
                <button type="button" disabled={saving} onClick={assign} className="rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617] disabled:opacity-60">
                  {saving ? 'Assigning…' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DispatchingView() {
  const [appointments, setAppointments] = useState([]); 
  const [technicians, setTechnicians] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [search, setSearch] = useState(''); 
  const [filter, setFilter] = useState('all'); 
  const [month, setMonth] = useState('all'); 
  const [page, setPage] = useState(1); 
  const [selected, setSelected] = useState(null); 
  const [details, setDetails] = useState({ project: null, areas: [], items: [], fails: {} }); 
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = async (showLoading = true) => { 
    if (showLoading) setLoading(true); 
    const results = await Promise.all([
      supabase.from('appointments').select('*').order('created_at', { ascending: false }), 
      supabase.from('profiles').select('*').eq('role', 'technician')
    ]); 
    if (results[0].error || results[1].error) {
      toast.error('Unable to load the dispatch queue. Please try again.'); 
    } else { 
      setAppointments(results[0].data || []); 
      setTechnicians(results[1].data || []); 
    } 
    if (showLoading) setLoading(false); 
  };

  useEffect(() => { 
    const initial = setTimeout(load, 0); 
    const channel = supabase.channel('dispatch_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => load(false)).subscribe(); 
    return () => { 
      clearTimeout(initial); 
      supabase.removeChannel(channel); 
    }; 
  }, []);

  const dispatchable = useMemo(() => appointments.filter((item) => (item.status || '').toLowerCase() !== 'assigned' && !item.technician_id), [appointments]);
  const months = useMemo(() => [...new Set(dispatchable.map(monthKey))].sort(), [dispatchable]);
  
  const searched = useMemo(() => { 
    const term = search.trim().toLowerCase(); 
    return dispatchable.filter((item) => !term || [item.full_name, item.service_type, item.address, item.location, item.id, item.reference_number].filter(Boolean).join(' ').toLowerCase().includes(term)); 
  }, [dispatchable, search]);

  const counts = useMemo(() => searched.reduce((result, item) => { 
    result.all += 1; 
    if (older(item)) result.older += 1; 
    else result.upcoming += 1; 
    if (priority(item)) result.priority += 1; 
    return result; 
  }, { all: 0, upcoming: 0, priority: 0, older: 0 }), [searched]);

  const queue = useMemo(() => searched.filter((item) => (month === 'all' || monthKey(item) === month) && (filter === 'all' || filter === 'older' && older(item) || filter === 'upcoming' && !older(item) || filter === 'priority' && priority(item))).sort(sortAppointments), [searched, month, filter]);
  
  const pageCount = Math.max(1, Math.ceil(queue.length / PAGE_SIZE)); 
  const visible = useMemo(() => queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [queue, page]); 
  const start = queue.length ? (page - 1) * PAGE_SIZE + 1 : 0; 
  const end = Math.min(page * PAGE_SIZE, queue.length);

  useEffect(() => setPage(1), [search, filter, month]); 
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const select = async (item) => { 
    setSelected(item); 
    setReviewLoading(true); 
    setDetails({ project: null, areas: [], items: [], fails: {} }); 
    const results = await Promise.all([
      supabase.from('appointment_project_details').select('*').eq('appointment_id', item.id).maybeSingle(), 
      supabase.from('appointment_areas').select('*').eq('appointment_id', item.id).order('created_at', { ascending: true }), 
      supabase.from('appointment_items').select('*').eq('appointment_id', item.id).order('created_at', { ascending: true })
    ]); 
    setDetails({ 
      project: results[0].data || null, 
      areas: results[1].data || [], 
      items: results[2].data || [], 
      fails: { project: Boolean(results[0].error), areas: Boolean(results[1].error), items: Boolean(results[2].error) } 
    }); 
    setReviewLoading(false); 
  };

  const assign = async (item, technicianId, jobPriority, notes) => { 
    const update = { technician_id: technicianId, status: 'assigned', priority: jobPriority, manager_notes: notes || null, assigned_at: new Date().toISOString() }; 
    const result = await supabase.from('appointments').update(update).eq('id', item.id); 
    if (result.error) return { success: false, message: 'The appointment could not be assigned. Please try again.' }; 
    setAppointments((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...update } : entry)); 
    return { success: true }; 
  };

  const filters = [['all', 'All'], ['upcoming', 'Upcoming'], ['priority', 'Priority'], ['older', 'Older']];

  return (
    <div className="min-h-screen bg-[#020617] px-5 py-6 font-sans text-slate-100 md:px-8">
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#EAB308]/15 p-2.5 text-[#EAB308]"><Truck size={20} /></span>
            <div>
              <h1 className="text-xl font-bold text-white">Dispatch Center</h1>
              <p className="mt-1 text-sm text-slate-400">Manage appointments and technician assignments.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users size={15} />{technicians.length} technicians on roster
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-white/[.08] bg-[#0A0F18] p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#EAB308]">Dispatch queue</p>
              <p className="mt-1 text-sm text-slate-400">{dispatchable.length} appointment{dispatchable.length === 1 ? '' : 's'} awaiting dispatch.</p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-slate-400 lg:w-80">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, service, ID, or reference" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map(([value, name]) => (
                <button type="button" key={value} onClick={() => setFilter(value)} className="whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold" style={filter === value ? { color: '#020617', background: gold, borderColor: gold } : { color: '#94A3B8', borderColor: 'rgba(255,255,255,.10)' }}>
                  {name} <span className="ml-1 opacity-70">{counts[value]}</span>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              Month
              <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-white outline-none focus:border-[#EAB308]">
                <option value="all">All months</option>
                {months.map((value) => <option key={value} value={value} className="bg-slate-950">{monthLabel(value)}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[.08] bg-[#07111c] p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Appointment Queue</h2>
              <p className="mt-1 text-sm text-slate-400">{month === 'all' ? 'All scheduled appointments' : monthLabel(month)}</p>
            </div>
            <span className="text-xs font-medium text-slate-500">Showing {start}–{end} of {queue.length}</span>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((number) => <div key={number} className="h-56 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.03]" />)}
            </div>
          ) : !queue.length ? (
            <Blank>No appointments match this view.</Blank>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={`${page}-${month}-${filter}-${search}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .2 }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((item, index) => <Card key={item.id} item={item} index={index} onSelect={select} />)}
              </motion.div>
            </AnimatePresence>
          )}

          <div className="mt-5 flex items-center justify-center gap-4 border-t border-white/[.07] pt-4">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || !queue.length} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowLeft size={16} />Previous
            </button>
            <span className="text-sm font-semibold text-slate-300">{page} / {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount || !queue.length} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-40">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </motion.main>

      <AnimatePresence>
        {selected && <Review item={selected} technicians={technicians} details={details} loading={reviewLoading} onClose={() => setSelected(null)} onAssign={assign} />}
      </AnimatePresence>
    </div>
  );
}