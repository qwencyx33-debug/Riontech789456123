import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { 
  Banknote, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight, 
  Clock, History, LayoutDashboard, LogOut, MapPin,
  Receipt, Search, ShieldCheck, Smartphone, Wallet, X, Sun, Moon
} from 'lucide-react';
import './cashierTheme.css';

const C = {
  bg: '#020617',
  side: '#060e18',
  panel: '#0b1623',
  gold: '#EAB308',
  goldSoft: 'rgba(234,179,8,.12)',
  text: '#e2e8f0',
  sub: '#94a3b8',
  muted: '#64748b',
  border: 'rgba(255,255,255,.08)',
  green: '#10b981'
};

const peso = n => `₱${(Number(n) || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
const blank = v => v === null || v === undefined || v === '';
const nice = s => (s || 'Pending').replace(/_/g, ' ');
const isOldOrFinishedAppointment = appointment => {
  const status = (appointment.status || '').toLowerCase();
  const finishedStatuses = ['completed', 'awaiting_final_payment', 'cancelled', 'rejected'];
  if (finishedStatuses.includes(status) || appointment.completed_at) return true;
  if (!appointment.schedule_date) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return String(appointment.schedule_date).slice(0, 10) < today;
};

const Field = ({ label, value }) => (
  <div className="field">
    <small>{label}</small>
    <b>{blank(value) ? 'Not on record' : value}</b>
  </div>
);

const Section = ({ title, children }) => (
  <section className="section">
    <h3>{title}</h3>
    {children}
  </section>
);

function Sidebar({ go, logout, theme, onToggleTheme }) {
  return (
    <aside className="side">
      <div className="brand">
        <i><ShieldCheck size={19} /></i>
        <div>
          <b>Riontech</b>
          <small>Cashier desk</small>
        </div>
      </div>
      {[
        [LayoutDashboard, 'dashboard', 'Dashboard'],
        [Wallet, 'payment', 'Payment Process'],
        [History, 'history', 'Payment History']
      ].map(([I, k, l]) => (
        <button className={k === 'payment' ? 'active' : ''} key={k} onClick={() => go(k)}>
          <I size={16} />
          {l}
        </button>
      ))}
      <button className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        Switch to {theme === 'dark' ? 'light' : 'dark'} mode
      </button>
      <button className="out" onClick={logout}>
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}

function Card({ job, onReview, fresh = false, showBalance = false }) {
  let total = Number(job.price) || 0, down = Number(job.downpayment_paid) || 0;
  return (
    <motion.article 
      className="card" 
      initial={fresh ? { opacity: 0, y: 8, scale: .98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
    >
      <header>
        <i>{(job.full_name?.[0] || '?').toUpperCase()}</i>
        <div>
          <h2>{job.full_name || 'Customer'}</h2>
          <p>{job.service_type || 'Service'}</p>
        </div>
      </header>
      <div className="meta">
        <span><Calendar size={14} />{job.schedule_date || 'No date'}{job.appointment_time ? ` · ${job.appointment_time}` : ''}</span>
        <span><MapPin size={14} />{job.address || 'No location'}</span>
      </div>
      {showBalance && <div className="money">
        <span>Total <b>{peso(total)}</b></span>
        <span>Paid <b>{peso(down)}</b></span>
        <strong><span>Remaining balance</span><b>{peso(Math.max(0, total - down))}</b></strong>
      </div>}
      <div className="badges">
        <em>{nice(job.status)}</em>
        <em className="pending-badge">{nice(job.payment_status || 'Payment pending')}</em>
        {job.qc_status && <em>{job.qc_status}</em>}
      </div>
      <button className="review" onClick={() => onReview(job)}>
        Review Appointment <ChevronRight size={16} />
      </button>
    </motion.article>
  );
}

function useRelated(job) {
  const [data, setData] = useState({
    loading: true,
    project: null,
    areas: [],
    items: [],
    report: null,
    qc: null,
    notes: [],
    service: null,
    tech: null,
    customer: null
  });

  useEffect(() => {
    let alive = true;
    const logQueryError = (label, error) => {
      if (error) console.error(`Unable to load ${label} for payment processing.`, error);
    };

    const get = async () => {
      try {
        const emptyResult = Promise.resolve({ data: null, error: null });
        const [
          projectResult,
          areasResult,
          itemsResult,
          reportResult,
          qcResult,
          notesResult,
          serviceResult,
          technicianResult,
          customerResult
        ] = await Promise.all([
          supabase.from('appointment_project_details').select('*').eq('appointment_id', job.id).maybeSingle(),
          supabase.from('appointment_areas').select('*').eq('appointment_id', job.id).order('created_at'),
          supabase.from('appointment_items').select('*').eq('appointment_id', job.id).order('created_at'),
          supabase.from('service_reports').select('*').eq('appointment_id', job.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('qc_reports').select('*').eq('appointment_id', job.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('manager_notes').select('*').eq('appointment_id', job.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          job.service_id
            ? supabase.from('service_types').select('id, title, description, price, duration, requires_survey, category_id, service_categories(name)').eq('id', job.service_id).maybeSingle()
            : emptyResult,
          job.technician_id
            ? supabase.from('profiles').select('id, first_name, last_name, email, role').eq('id', job.technician_id).maybeSingle()
            : emptyResult,
          job.user_id
            ? supabase.from('profiles').select('id, first_name, last_name, email, phone, role').eq('id', job.user_id).maybeSingle()
            : emptyResult
        ]);

        [
          ['project details', projectResult.error], ['areas', areasResult.error], ['items', itemsResult.error],
          ['service report', reportResult.error], ['QC report', qcResult.error], ['manager notes', notesResult.error],
          ['service', serviceResult.error], ['technician', technicianResult.error], ['customer', customerResult.error]
        ].forEach(([label, error]) => logQueryError(label, error));

        if (alive) {
          setData({
            loading: false,
            project: projectResult.data || null,
            areas: areasResult.data || [],
            items: itemsResult.data || [],
            report: reportResult.data || null,
            qc: qcResult.data || null,
            notes: notesResult.data ? [notesResult.data] : [],
            service: serviceResult.data || null,
            tech: technicianResult.data || null,
            customer: customerResult.data || null
          });
        }
      } catch (error) {
        console.error('Unable to load related payment information.', error);
        if (alive) setData(previous => ({ ...previous, loading: false }));
      }
    };

    get();
    return () => { alive = false; };
  }, [job.id, job.service_id, job.technician_id, job.user_id]);

  return data;
}

const steps = ['Customer', 'Service', 'Project', 'Areas & Items', 'Technician Report', 'Payment', 'Confirmation'];

function Modal({ job, onClose, onDone }) {
  const data = useRelated(job);
  const [step, setStep] = useState(0);
  const [pay, setPay] = useState({ amount: '0', method: job.payment_method || 'Cash', refNo: job.payment_ref || '' });
  const [busy, setBusy] = useState(false);

  const total = Number(job.price) || 0;
  const down = Number(job.downpayment_paid) || 0;
  const due = Math.max(0, total - down);
  const customerSubmittedFinalPayment = (job.payment_status || '').toLowerCase() === 'awaiting_cashier_verification';
  const received = Number(pay.amount) || 0;
  const remain = Math.max(0, due - received);
  const change = Math.max(0, received - due);

  const next = () => {
    if (step === 5 && (!Number.isFinite(Number(pay.amount)) || received < 0)) {
      return Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: 'Enter a valid payment amount of 0 or more.',
        background: C.panel,
        color: '#fff',
        confirmButtonColor: C.gold
      });
    }
    setStep(s => Math.min(6, s + 1));
  };

  const confirm = async () => {
    if (busy) return;
    if (!Number.isFinite(Number(pay.amount)) || received < 0) {
      return Swal.fire({ icon: 'error', title: 'Invalid Amount', text: 'Enter a valid payment amount of 0 or more.', background: C.panel, color: '#fff', confirmButtonColor: C.gold });
    }
    if (received === 0) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'NO PAYMENT RECORDED',
        html: `<p>No additional payment has been recorded.</p><p>Remaining balance: <strong>${peso(due)}</strong></p>`,
        showCancelButton: true,
        confirmButtonText: 'Continue Without Payment',
        cancelButtonText: 'Go Back',
        background: C.panel,
        color: '#fff',
        confirmButtonColor: C.gold
      });
      if (result.isConfirmed) onDone({ noPayment: true, toPending: true });
      return;
    }
    setBusy(true);
    const totalPaid = down + received;
    const fullyPaid = totalPaid >= total;
    const paymentUpdate = {
      downpayment_paid: totalPaid,
      payment_status: fullyPaid ? 'paid' : 'downpayment_paid',
      payment_method: pay.method || job.payment_method,
      payment_ref: pay.refNo || job.payment_ref || null,
    };
    // Final-payment verification must not roll a completed service back into booking review.
    if (fullyPaid && !['completed', 'awaiting_final_payment'].includes((job.status || '').toLowerCase())) {
      paymentUpdate.status = 'awaiting_manager';
    }
    const { error } = await supabase.from('appointments').update(paymentUpdate).eq('id', job.id);
    
    setBusy(false);
    if (error) {
      return Swal.fire({
        icon: 'error',
        title: 'Payment could not be processed',
        text: 'Please try again.',
        background: C.panel,
        color: '#fff',
        confirmButtonColor: C.gold
      });
    }

    Swal.fire({
      icon: 'success',
      title: fullyPaid ? 'Payment Recorded' : 'PARTIAL PAYMENT RECORDED',
      text: fullyPaid
        ? ['completed', 'awaiting_final_payment'].includes((job.status || '').toLowerCase())
          ? `${job.full_name || 'Customer'} remaining balance has been verified.${change > 0 ? ` Change due: ${peso(change)}.` : ''}`
          : `${job.full_name || 'Customer'} payment has been sent for manager approval.${change > 0 ? ` Change due: ${peso(change)}.` : ''}`
        : `${peso(received)} received. Remaining balance: ${peso(Math.max(0, due - received))}.`,
      background: C.panel,
      color: '#fff',
      confirmButtonColor: C.gold,
      timer: 2200,
      showConfirmButton: false
    });
    onDone({ toPending: !fullyPaid });
  };

  const service = data.service || {}, project = data.project || {}, report = data.report || {};
  const paymentState = received === 0 ? 'Payment Pending' : received > due ? 'Overpayment' : received >= due ? 'Full Payment' : 'Partial Payment';
  const paymentStateDetail = received === 0 ? 'No additional payment has been recorded.' : received > due ? `Change due: ${peso(change)}` : received >= due ? 'The remaining balance is covered.' : `Remaining balance: ${peso(remain)}`;
  const totalPaidAfterPayment = down + received;
  const fullyPaidAfterPayment = received > 0 && totalPaidAfterPayment >= total;
  const technicianName = data.tech
    ? [data.tech.first_name, data.tech.last_name].filter(Boolean).join(' ')
    : '';
  
  let content = [
    <Section title="Customer & appointment">
      <div className="grid">
        <Field label="Customer" value={job.full_name} />
        <Field label="Phone" value={job.phone_number || data.customer?.phone} />
        <Field label="Email" value={data.customer?.email} />
        <Field label="Appointment" value={`${job.schedule_date || 'Not on record'}${job.appointment_time ? ` · ${job.appointment_time}` : ''}`} />
        <Field label="Address" value={job.address} />
        <Field label="Appointment status" value={nice(job.status)} />
        <Field label="Payment status" value={job.payment_status} />
        <Field label="Reference" value={job.reference_number || job.payment_ref} />
      </div>
    </Section>,
    <Section title="Service information">
      <div className="grid">
        <Field label="Service" value={job.service_type || service.title} />
        <Field label="Category" value={service.service_categories?.name} />
        <Field label="Price" value={peso(job.price)} />
        <Field label="Duration" value={service.duration || job.estimated_duration} />
        <Field label="Survey required" value={job.requires_survey === true ? 'Yes' : job.requires_survey === false ? 'No' : null} />
      </div>
      <p>{service.description || job.details || 'No service description on record.'}</p>
    </Section>,
    <Section title="Project details">
      <div className="grid">
        <Field label="Property type" value={project.property_type} />
        <Field label="Property size" value={project.property_size ? `${project.property_size} ${project.property_size_unit || ''}` : null} />
        <Field label="Floor count" value={project.floor_count} />
        <Field label="Room count" value={project.room_count} />
      </div>
      <p>{project.site_notes || project.customer_requirements || project.customer_comments || 'No project details on record.'}</p>
    </Section>,
    <Section title="Areas & requested items">
      <div className="lists">
        <div>
          <h4>Areas</h4>
          {data.areas.length ? data.areas.map(a => (
            <p key={a.id}>
              <b>{a.area_name}</b>
              <span>{a.area_size || '—'} {a.area_size_unit || ''} · Qty {a.quantity || 1} · {a.notes || 'No note'}</span>
            </p>
          )) : <p>No areas on record.</p>}
        </div>
        <div>
          <h4>Items</h4>
          {data.items.length ? data.items.map(i => (
            <p key={i.id}>
              <b>{i.item_name}</b>
              <span>Qty {i.quantity || 1} · Total {peso(i.total_price)} · {i.description || i.customer_comment || 'No note'}</span>
            </p>
          )) : <p>No items on record.</p>}
        </div>
      </div>
    </Section>,
    <Section title="Technician report">
      <div className="grid">
        <Field label="Service performed" value={report.service_performed} />
        <Field label="Technician" value={report.technician_name || technicianName} />
        <Field label="Completion time" value={report.completion_time || job.completed_at} />
        <Field label="QC status" value={data.qc?.approved === true ? 'Approved' : data.qc?.approved === false ? 'Needs review' : job.qc_status} />
      </div>
      <p>{report.technician_notes || data.qc?.findings || data.qc?.remarks || data.notes[0]?.note || job.manager_notes || 'Technician report not available.'}</p>
    </Section>,
    <Section title="Payment summary">
      <div className="payment-summary-card">
        <div><small>Total service</small><strong>{peso(total)}</strong></div>
        <div><small>Previously paid</small><strong>{peso(down)}</strong></div>
        <div className="balance-highlight"><small>Remaining balance</small><strong>{peso(due)}</strong></div>
      </div>
      {customerSubmittedFinalPayment && <div className="submitted-payment">
        <div className="verification-heading"><ShieldCheck size={18}/><b>Payment verification required</b></div>
        <div className="verification-grid"><Field label="Expected payment" value={peso(due)} /><Field label="Payment method" value={job.payment_method || 'GCash'} /><Field label="Reference" value={job.payment_ref || 'Not recorded'} /></div>
        <p className="submitted-note">Check the submitted receipt, then enter the amount you verified. Submission alone does not mark the payment as paid.</p>
        {job.receipt_image && <a className="submitted-receipt" href={job.receipt_image} target="_blank" rel="noreferrer"><img src={job.receipt_image} alt="Customer submitted payment proof" /><span>View customer payment receipt ↗</span></a>}
      </div>}
      <div className="payment-entry-card">
        <div className="entry-title"><div><small>Record payment</small><h4>Amount received / verified</h4></div><Banknote size={20}/></div>
        <label className="amount-input-label" htmlFor="cashier-received-amount">Amount received today</label>
        <div className="amount-input-wrap"><span>₱</span><input id="cashier-received-amount" type="number" min="0" step="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} aria-describedby="payment-entry-help" /></div>
        <small id="payment-entry-help" className="payment-hint">Enter the actual amount received from the customer. Start at ₱0 when no new payment was collected.</small>
        <div className="live-balance"><span>Balance after payment</span><strong>{peso(remain)}</strong></div>
        <div className={`payment-state ${paymentState.toLowerCase().replace(/\s+/g, '-')}`} role="status"><b>{paymentState}</b><span>{paymentStateDetail}</span></div>
        {change > 0 && <div className="change-notice"><span>Change to return</span><strong>{peso(change)}</strong></div>}
      </div>
      <label className="method-label">Payment method</label>
      <div className="methods">
        {[
          ['Cash', Banknote],
          ['GCash', Smartphone],
          ['Bank', Building2],
          ['COD', Receipt]
        ].map(([n, I]) => (
          <button type="button" aria-pressed={pay.method === n} className={pay.method === n ? 'selected' : ''} key={n} onClick={() => setPay({ ...pay, method: n })}>
            <I size={16} />
            {n}
          </button>
        ))}
      </div>
      {pay.method !== 'Cash' && (
        <label>
          Reference number
          <input value={pay.refNo} onChange={e => setPay({ ...pay, refNo: e.target.value })} placeholder="Transaction reference" />
        </label>
      )}
    </Section>,
    <Section title="Payment review">
      <div className="review-receipt">
        <header><div><small>Payment review</small><h4>{job.full_name || 'Customer'}</h4><span>{job.service_type || 'Service'} · {job.schedule_date || 'Date not set'} · {job.appointment_time || 'Time not set'}</span></div><em className={fullyPaidAfterPayment ? 'paid' : 'pending'}>{fullyPaidAfterPayment ? 'Fully paid' : received > 0 ? 'Partial payment' : 'Payment pending'}</em></header>
        <div className="review-lines">
          <div><span>Service total</span><b>{peso(total)}</b></div>
          <div><span>Previous amount paid</span><b>{peso(down)}</b></div>
          <div className="received-line"><span>Amount received today</span><b>{peso(received)}</b></div>
          <div className="total-paid-line"><span>Total paid</span><b>{peso(totalPaidAfterPayment)}</b></div>
          <div className="remaining-line"><span>Remaining balance</span><b>{peso(remain)}</b></div>
          {change > 0 && <div><span>Change to return</span><b>{peso(change)}</b></div>}
        </div>
        <div className="review-meta"><Field label="Payment method" value={pay.method} /><Field label="Reference" value={pay.refNo || job.payment_ref || 'Cash payment'} /></div>
      </div>
    </Section>
  ][step];

  return (
    <motion.div className="shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" initial={{ scale: .97, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 8 }}>
        <header>
          <div>
            <p>Payment processing · #{String(job.id).slice(0, 8).toUpperCase()}</p>
            <h1>{job.full_name || 'Customer'}</h1>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <div className="steps">
          {steps.map((s, i) => (
            <button key={s} className={i === step ? 'now' : i < step ? 'done' : ''} onClick={() => i < step && setStep(i)}>
              <b>{String(i + 1).padStart(2, '0')}</b>
              <span>{s}</span>
            </button>
          ))}
        </div>
        <main>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              {content}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer>
          <button className="back" disabled={!step} onClick={() => setStep(step - 1)}>
            <ChevronLeft size={16} />Back
          </button>
          {step < 6 ? (
            <button className="next" onClick={next}>
              {step === 5 ? 'Review Payment' : 'Next'}
              <ChevronRight size={16} />
            </button>
          ) : (
            <button className="next" disabled={busy} onClick={confirm}>
              {busy ? 'Processing…' : (received === 0 ? 'Confirm No Payment' : received < due ? 'Record Partial Payment' : 'Confirm Full Payment')}
              <CheckCircle2 size={16} />
            </button>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}

export default function PaymentProcess({ onNavigate = () => {}, onLogout = () => {}, theme = 'dark', onToggleTheme = () => {} }) {
  const [jobs, setJobs] = useState([]);
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('appointments');
  const [chosen, setChosen] = useState(null);
  const [toast, setToast] = useState(null);
  const [freshIds, setFreshIds] = useState([]);
  const knownIds = useRef(new Set());
  const selectedId = useRef(null);
  const toastTimer = useRef(null);
  selectedId.current = chosen?.id ?? null;

  const load = async (payload = null) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Unable to load appointments for payment processing.', error);
      setJobs([]);
      return;
    }
    const rows = data || [];
    const previous = knownIds.current;
    const newlyAvailable = rows.filter(row => !previous.has(row.id));
    const dateChangedId = payload?.eventType === 'UPDATE' && payload.old?.schedule_date !== payload.new?.schedule_date
      ? payload.new?.id
      : null;
    const changedAppointment = dateChangedId ? rows.find(row => row.id === dateChangedId) : null;
    const highlightedIds = [...newlyAvailable.map(row => row.id), ...(changedAppointment ? [changedAppointment.id] : [])];
    if (previous.size && highlightedIds.length) {
      setFreshIds(highlightedIds);
      const eventId = payload?.new?.id || payload?.old?.id;
      const announced = changedAppointment || newlyAvailable.find(row => row.id === eventId) || (payload?.eventType === 'INSERT' ? newlyAvailable[0] : null);
      if (announced) {
        setToast({ id: announced.id, kind: changedAppointment ? 'date' : 'new', customer: announced.full_name, service: announced.service_type });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 5000);
      }
    }
    if (selectedId.current && !rows.some(row => row.id === selectedId.current)) {
      // Keep the active form intact; the cashier can finish or close it deliberately.
      setToast({ id: `selected-${selectedId.current}`, kind: 'selected', customer: 'Appointment updated', service: 'This appointment is no longer in the payment queue.' });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    }
    knownIds.current = new Set(rows.map(row => row.id));
    setJobs(rows);
  };

  useEffect(() => {
    load();
    const c = supabase.channel('realtime_payment_process')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, (_payload) => load(_payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments' }, (_payload) => load(_payload))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'appointments' }, (_payload) => load(_payload))
      .subscribe();
    return () => { clearTimeout(toastTimer.current); supabase.removeChannel(c); };
  }, []);

  const list = useMemo(() => {
    const priority = job => freshIds.includes(job.id) ? 0 : job.status === 'completed' ? 1 : 2;
    return jobs
      .filter(j => `${j.full_name || ''} ${j.service_type || ''} ${j.id}`.toLowerCase().includes(term.toLowerCase()))
      .filter(j => {
        const paymentStatus = (j.payment_status || '').toLowerCase();
        const outstanding = Math.max(0, (Number(j.price) || 0) - (Number(j.downpayment_paid) || 0));
        if (filter === 'all') return true;
        if (filter === 'appointments') return !isOldOrFinishedAppointment(j);
        if (filter === 'pending') return !['paid', 'full_paid'].includes(paymentStatus) && outstanding > 0;
        return (j.status || '').toLowerCase() === 'completed';
      })
      .sort((a, b) => priority(a) - priority(b) || String(a.schedule_date || a.created_at || '').localeCompare(String(b.schedule_date || b.created_at || '')) || String(a.appointment_time || '').localeCompare(String(b.appointment_time || '')));
  }, [jobs, term, filter, freshIds]);

  const counts = useMemo(() => ({
    all: jobs.length,
    appointments: jobs.filter(j => !isOldOrFinishedAppointment(j)).length,
    pending: jobs.filter(j => !['paid', 'full_paid'].includes((j.payment_status || '').toLowerCase()) && Math.max(0, (Number(j.price) || 0) - (Number(j.downpayment_paid) || 0)) > 0).length,
    completed: jobs.filter(j => (j.status || '').toLowerCase() === 'completed').length
  }), [jobs]);

  return (
    <div className={`shell cashier-${theme}`}>
      <style>{css}</style>
      <style>{`.payment-summary-card{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:12px;margin-bottom:16px;padding:16px;border:1px solid ${C.border};border-radius:12px;background:linear-gradient(135deg,rgba(234,179,8,.075),rgba(255,255,255,.018))}.payment-summary-card>div{display:grid;gap:7px;padding:7px 10px}.payment-summary-card small,.entry-title small,.review-receipt header small{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.muted}}.payment-summary-card strong{font-size:20px;color:${C.text}}.payment-summary-card .balance-highlight{border-left:1px solid ${C.border}}.payment-summary-card .balance-highlight strong{font-size:25px;color:${C.gold}}.submitted-payment,.payment-entry-card,.review-receipt{margin:16px 0;padding:17px;border:1px solid ${C.border};border-radius:12px;background:${C.panel}}.verification-heading{display:flex;align-items:center;gap:8px;margin-bottom:14px;color:#fbbf24}.verification-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.verification-grid .field{padding:10px;border-radius:8px;background:rgba(255,255,255,.025)}.submitted-note{margin:12px 0 0!important;font-size:12px!important;color:${C.sub}!important;line-height:1.55}.submitted-receipt{display:flex;align-items:center;gap:12px;margin-top:13px;padding:9px;border-radius:9px;background:rgba(255,255,255,.035);color:${C.gold};font-size:12px;font-weight:700}.submitted-receipt img{width:76px;height:58px;object-fit:cover;border-radius:6px;background:${C.bg}}.entry-title{display:flex;justify-content:space-between;align-items:center;color:${C.gold}}.entry-title h4,.review-receipt h4{margin:4px 0 0;font-size:16px;color:${C.text}}.amount-input-label,.method-label{display:block;margin:18px 0 7px;font-size:12px;font-weight:700;color:${C.sub}}.amount-input-wrap{display:flex;align-items:center;gap:8px;padding:4px 14px;border:1px solid rgba(234,179,8,.32);border-radius:10px;background:${C.bg};color:${C.gold}}.amount-input-wrap:focus-within{border-color:${C.gold};box-shadow:0 0 0 3px ${C.goldSoft}}.amount-input-wrap>span{font-size:24px;font-weight:800}.amount-input-wrap input{width:100%;min-width:0;padding:12px 0;font-size:26px;font-weight:800;color:${C.text}}.amount-input-wrap input:focus-visible{outline:none}.payment-hint{display:block;margin-top:8px;color:${C.muted};font-size:11px;line-height:1.5}.live-balance{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:13px;border-radius:9px;background:rgba(234,179,8,.075)}.live-balance span{font-size:12px;color:${C.sub}}.live-balance strong{font-size:22px;color:${C.gold}}.payment-state,.change-notice{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px;padding:11px 12px;border:1px solid ${C.border};border-radius:9px}.payment-state b{text-transform:uppercase;font-size:11px;letter-spacing:.06em}.payment-state span,.change-notice span{font-size:12px;color:${C.sub};text-align:right}.payment-state.payment-pending{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.06)}.payment-state.payment-pending b{color:#fbbf24}.payment-state.partial-payment{border-color:rgba(249,115,22,.25);background:rgba(249,115,22,.06)}.payment-state.partial-payment b{color:#fb923c}.payment-state.full-payment{border-color:rgba(16,185,129,.25);background:rgba(16,185,129,.06)}.payment-state.full-payment b{color:${C.green}}.payment-state.overpayment,.change-notice{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.06)}.payment-state.overpayment b,.change-notice strong{color:#fbbf24}.methods button{min-height:68px;transition:border-color .16s,background .16s,transform .16s}.methods button:hover{transform:translateY(-1px)}.methods button:focus-visible,.steps button:focus-visible,.modal button:focus-visible,.review:focus-visible{outline:2px solid ${C.gold};outline-offset:2px}.review-receipt>header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding-bottom:15px;border-bottom:1px solid ${C.border}}.review-receipt>header h4{font-size:19px}.review-receipt>header span{display:block;margin-top:6px;font-size:12px;color:${C.sub}}.review-receipt>header em{padding:6px 9px;border-radius:99px;font-size:10px;font-weight:800;font-style:normal;text-transform:uppercase}.review-receipt>header em.paid{color:${C.green};background:rgba(16,185,129,.1)}.review-receipt>header em.pending{color:#fbbf24;background:rgba(245,158,11,.1)}.review-lines{display:grid;gap:0;padding:8px 0}.review-lines>div{display:flex;justify-content:space-between;gap:12px;padding:10px 2px;color:${C.sub};font-size:12px}.review-lines b{color:${C.text};font-size:13px}.review-lines .received-line{color:${C.gold}}.review-lines .received-line b{font-size:17px;color:${C.gold}}.review-lines .total-paid-line,.review-lines .remaining-line{padding-top:13px;border-top:1px solid ${C.border}}.review-lines .total-paid-line b{color:${C.text}}.review-lines .remaining-line b{font-size:19px;color:${C.gold}}.review-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px solid ${C.border}}.cashier-light .payment-summary-card,.cashier-light .submitted-payment,.cashier-light .payment-entry-card,.cashier-light .review-receipt{background:#eef1f4;border-color:#cbd2da}.cashier-light .payment-summary-card strong,.cashier-light .entry-title h4,.cashier-light .review-receipt h4,.cashier-light .review-lines b{color:#172033}.cashier-light .payment-summary-card .balance-highlight strong,.cashier-light .live-balance strong,.cashier-light .review-lines .remaining-line b,.cashier-light .review-lines .received-line b{color:#9a7100}.cashier-light .verification-grid .field,.cashier-light .submitted-receipt{background:#e2e7ec}.cashier-light .amount-input-wrap{background:#e2e7ec;border-color:#cbd2da}.cashier-light .amount-input-wrap input{color:#172033}.cashier-light .live-balance{background:rgba(234,179,8,.12)}.cashier-light .review-receipt>header span,.cashier-light .review-lines,.cashier-light .review-lines>div{color:#526174}@media(max-width:640px){.payment-summary-card{grid-template-columns:1fr 1fr}.payment-summary-card .balance-highlight{grid-column:1/-1;border-left:0;border-top:1px solid ${C.border};padding-top:13px}.verification-grid{grid-template-columns:1fr}.review-receipt>header{flex-direction:column}.review-meta{grid-template-columns:1fr}.amount-input-wrap input{font-size:22px}.payment-state,.change-notice{align-items:flex-start;flex-direction:column}.payment-state span,.change-notice span{text-align:left}}`}</style>
      <style>{`.money strong{display:flex;justify-content:space-between;align-items:center;padding:10px 11px;margin:2px -5px 0;background:rgba(234,179,8,.1);border-radius:8px;color:${C.gold};font-size:13px}.money strong b{font-size:17px;color:${C.gold}}.filter-count{margin-left:4px;padding:2px 6px;border-radius:99px;background:rgba(255,255,255,.08);color:inherit}.card{transition:border-color .18s,background .18s}.card:hover{border-color:rgba(234,179,8,.34)}.payment-toast{position:fixed;z-index:40;top:18px;right:20px;width:min(380px,calc(100vw - 32px));display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 15px;background:${C.panel};border:1px solid rgba(234,179,8,.38);border-left:3px solid ${C.gold};border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.35)}.payment-toast div{display:grid;gap:4px;min-width:0}.payment-toast b{font-size:13px;color:${C.gold}}.payment-toast span{font-size:12px;color:${C.text};overflow-wrap:anywhere}.payment-toast button{flex:none;border:0;background:transparent;color:${C.sub};cursor:pointer;padding:5px}.field b{color:${C.text}}.section h3{color:${C.text}}.steps button{border-radius:7px}.steps .done{color:${C.green}}.steps .now{color:${C.gold};outline:1px solid rgba(234,179,8,.3)}.methods button:hover,.filters button:hover{border-color:rgba(234,179,8,.45)}@media(max-width:760px){.queue>div{grid-template-columns:1fr}.filters{overflow-x:auto}.page{padding:16px}.modal>header,.modal main,.modal footer{padding-left:15px;padding-right:15px}}`}</style>
      <Sidebar go={onNavigate} logout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      <main className="page">
        <header>
          <div>
            <h1>Payment Processing</h1>
            <p>Appointments awaiting payment</p>
          </div>
          <div className="search">
            <Search size={16} />
            <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search customer, service, or appointment…" />
          </div>
        </header>
        <div className="filters">
          {[
            ['all', 'All'],
            ['appointments', 'Appointments'],
            ['pending', 'Payment Pending'],
            ['completed', 'Technician Completed']
          ].map(([k, l]) => (
            <button className={filter === k ? 'on' : ''} key={k} onClick={() => setFilter(k)}>
              {l} <b className="filter-count">{counts[k]}</b>
            </button>
          ))}
        </div>
        <section className="queue">
          <p>{list.length} appointment{list.length === 1 ? '' : 's'} {filter === 'pending' ? 'with a remaining balance' : filter === 'completed' ? 'completed by technicians' : 'in the appointment list'}</p>
          <div>
              {list.length ? (
              <AnimatePresence initial={false}>{list.map(j => <Card key={j.id} job={j} fresh={freshIds.includes(j.id)} showBalance={filter === 'pending'} onReview={setChosen} />)}</AnimatePresence>
            ) : (
              <article className="empty">No appointments match this filter.</article>
            )}
          </div>
        </section>
      </main>
      <AnimatePresence>
        {toast && <motion.aside className="payment-toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          <div><b>{toast.kind === 'date' ? 'Appointment date updated' : 'New payment appointment'}</b><span>{[toast.customer, toast.service].filter(Boolean).join(' — ') || toast.service}</span></div>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
        </motion.aside>}
        {chosen && <Modal job={chosen} onClose={() => setChosen(null)} onDone={(result) => { setChosen(null); if (result?.toPending) setFilter('pending'); load(); }} />}
      </AnimatePresence>
    </div>
  );
}

const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}.shell{min-height:100vh;display:flex;background:#030E10;color:${C.text};font-family:Inter,system-ui,sans-serif}.side{width:224px;background:${C.side};border-right:1px solid ${C.border};padding:24px 14px;display:flex;flex-direction:column;gap:3px}.brand{display:flex;gap:10px;align-items:center;padding:0 8px 28px}.brand i{width:35px;height:35px;display:grid;place-items:center;background:${C.gold};color:${C.bg};border-radius:10px}.brand b{display:block}.brand small{color:${C.gold};font-size:10px;text-transform:uppercase}.side button{border:0;background:none;color:${C.sub};padding:11px;display:flex;gap:10px;align-items:center;border-radius:9px;font:700 12px inherit;cursor:pointer}.side button.active{color:${C.gold};background:${C.goldSoft}}.side .out{margin-top:auto;border:1px solid ${C.border}}.page{flex:1;min-width:0;padding:30px 36px}.page>header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid ${C.border};padding-bottom:18px}.page h1{font-size:25px;margin:0}.page header p{margin:5px 0 0;font-size:13px;color:${C.sub}}.search{display:flex;gap:8px;align-items:center;background:${C.panel};border:1px solid ${C.border};padding:10px 12px;border-radius:9px;color:${C.muted}}input{outline:0;border:0;background:transparent;color:${C.text};font:13px inherit}.search input{width:270px}.filters{display:flex;gap:8px;padding:16px 0}.filters button{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:7px;padding:7px 11px;font:700 12px inherit;cursor:pointer}.filters .on{background:${C.goldSoft};border-color:${C.gold};color:${C.gold}}.queue>p{font-size:12px;color:${C.muted}}.queue>div{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}.card{background:${C.panel};border:1px solid ${C.border};border-radius:13px;padding:16px}.card header{display:flex;gap:10px;align-items:center}.card header i{width:37px;height:37px;display:grid;place-items:center;border-radius:9px;background:${C.goldSoft};color:${C.gold};font-style:normal;font-weight:800}.card h2{font-size:15px;margin:0}.card p{font-size:12px;color:${C.sub};margin:3px 0}.meta{display:grid;gap:7px;margin:14px 0;font-size:12px;color:${C.sub}}.meta span{display:flex;gap:7px;align-items:center}.money{border-block:1px solid ${C.border};padding:10px 0;display:grid;gap:7px;font-size:12px;color:${C.sub}}.money span,.money strong{display:flex;justify-content:space-between}.money b{color:${C.text}}.money strong{color:${C.gold};font-size:13px}.badges{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.badges em{font-style:normal;font-size:11px;color:${C.gold};background:${C.goldSoft};padding:4px 7px;border-radius:5px}.review,.next{width:100%;background:${C.gold};color:${C.bg};border:0;border-radius:8px;padding:11px;display:flex;justify-content:center;align-items:center;gap:5px;font-weight:800;cursor:pointer}.empty{padding:35px;text-align:center;color:${C.muted};border:1px dashed ${C.border};border-radius:12px}.shade{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.72);backdrop-filter:blur(7px);display:grid;place-items:center;padding:24px}.modal{width:min(980px,100%);height:min(720px,calc(100vh - 48px));background:${C.side};border:1px solid rgba(234,179,8,.32);border-radius:14px;display:flex;flex-direction:column;overflow:hidden}.modal>header{padding:17px 22px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between}.modal>header p{font-size:11px;color:${C.gold};margin:0}.modal h1{font-size:20px;margin:4px 0 0}.modal>header button{width:34px;height:34px;border:1px solid ${C.border};border-radius:7px;background:${C.panel};color:${C.sub};display:grid;place-items:center;cursor:pointer}.steps{display:flex;gap:3px;padding:10px 18px;border-bottom:1px solid ${C.border};overflow:auto}.steps button{min-width:93px;border:0;background:none;color:${C.muted};font:600 11px inherit;cursor:pointer;text-align:left;padding:5px}.steps b{display:block;font-size:11px}.steps .now{color:${C.gold};background:${C.goldSoft};border-radius:6px}.steps .done{color:${C.sub}}.modal main{padding:18px 22px;overflow:auto;flex:1}.section h3{margin:0 0 14px;font-size:16px}.grid,.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field small{display:block;color:${C.muted};font-size:11px;margin-bottom:4px}.field b{display:block;font-size:13px;overflow-wrap:anywhere}.section>p{font-size:13px;line-height:1.5;color:${C.sub};margin:15px 0 0}.lists{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lists h4{font-size:12px;color:${C.gold};margin:0 0 8px}.lists p{border-bottom:1px solid ${C.border};padding:8px 0;margin:0;display:grid;gap:3px}.lists span{font-size:11px;color:${C.muted}}.section label{font-size:12px;color:${C.sub};display:block;margin-top:16px}.section label input{width:100%;margin-top:6px;border:1px solid ${C.border};border-radius:7px;background:${C.bg};padding:10px}.methods{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:7px}.methods button{border:1px solid ${C.border};background:${C.bg};color:${C.sub};border-radius:7px;padding:9px;display:grid;justify-items:center;gap:4px;font:700 11px inherit;cursor:pointer}.methods .selected{border-color:${C.gold};color:${C.gold};box-shadow:0 0 0 2px ${C.goldSoft}}.modal footer{padding:14px 22px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;gap:12px}.back{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:8px;padding:10px 14px;display:flex;gap:4px;align-items:center;font-weight:700;cursor:pointer}.back:disabled{opacity:.4}.next{width:auto;padding:10px 15px}.next:disabled{opacity:.65;cursor:wait}@media(max-width:760px){.shell{display:block}.side{width:100%;padding:12px;flex-direction:row;align-items:center;overflow:auto}.brand{padding:0 8px}.side .out{margin:0}.page{padding:18px}.page>header{align-items:start;gap:12px;flex-direction:column}.search input{width:220px}.shade{padding:8px}.modal{height:calc(100vh - 16px)}.grid,.summary,.lists{grid-template-columns:1fr}.steps{padding-inline:8px}.steps button{min-width:76px}}`;
