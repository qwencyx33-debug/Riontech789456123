import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { 
  Banknote, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight, 
  Clock, History, LayoutDashboard, LogOut, MapPin,
  Receipt, Search, ShieldCheck, Smartphone, Wallet, X
} from 'lucide-react';

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

function Sidebar({ go, logout }) {
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
      <button className="out" onClick={logout}>
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}

function Card({ job, onReview }) {
  let total = Number(job.price) || 0, down = Number(job.downpayment_paid) || 0;
  return (
    <motion.article 
      className="card" 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      whileHover={{ y: -3 }}
    >
      <header>
        <i>{(job.full_name?.[0] || '?').toUpperCase()}</i>
        <div>
          <h2>{job.full_name || 'Customer'}</h2>
          <p>{job.service_type || 'Service'}</p>
        </div>
      </header>
      <div className="meta">
        <span><Calendar size={14} />{job.schedule_date || 'No date'}</span>
        <span><Clock size={14} />{job.appointment_time || 'No time'}</span>
        <span><MapPin size={14} />{job.address || 'No location'}</span>
      </div>
      <div className="money">
        <span>Total <b>{peso(total)}</b></span>
        <span>Downpayment <b>{peso(down)}</b></span>
        <strong>Balance <b>{peso(Math.max(0, total - down))}</b></strong>
      </div>
      <div className="badges">
        <em>{nice(job.status)}</em>
        <em>Payment pending</em>
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
            ? supabase.from('profiles').select('id, first_name, last_name, email, role').eq('id', job.user_id).maybeSingle()
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
  const [pay, setPay] = useState({ amount: '', method: 'Cash', refNo: '' });
  const [busy, setBusy] = useState(false);

  const total = Number(job.price) || 0;
  const down = Number(job.downpayment_paid) || 0;
  const due = Math.max(0, total - down);
  const received = Number(pay.amount) || 0;
  const remain = Math.max(0, due - received);
  const change = Math.max(0, received - due);

  useEffect(() => setPay(p => ({ ...p, amount: p.amount || String(due) })), [due]);

  const next = () => {
    if (step === 5) {
      if (received <= 0) {
        return Swal.fire({
          icon: 'error',
          title: 'Missing Amount',
          text: 'Enter the received payment amount.',
          background: C.panel,
          color: '#fff',
          confirmButtonColor: C.gold
        });
      }
    }
    setStep(s => Math.min(6, s + 1));
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from('appointments').update({
      payment_status: 'paid',
      payment_method: pay.method,
      payment_ref: pay.refNo || null,
      status: 'awaiting_manager'
    }).eq('id', job.id);
    
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
      title: 'Payment Recorded',
      text: `${job.full_name || 'Customer'} payment has been sent for manager approval.`,
      background: C.panel,
      color: '#fff',
      confirmButtonColor: C.gold,
      timer: 2200,
      showConfirmButton: false
    });
    onDone();
  };

  const service = data.service || {}, project = data.project || {}, report = data.report || {};
  const technicianName = data.tech
    ? [data.tech.first_name, data.tech.last_name].filter(Boolean).join(' ')
    : '';
  
  let content = [
    <Section title="Customer & appointment">
      <div className="grid">
        <Field label="Customer" value={job.full_name} />
        <Field label="Phone" value={null} />
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
      <div className="summary">
        <Field label="Total price" value={peso(total)} />
        <Field label="Downpayment paid" value={peso(down)} />
        <Field label="Amount due" value={peso(due)} />
      </div>
      <label>
        Amount received
        <input type="number" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
      </label>
      <div className="summary">
        <Field label="Remaining balance" value={peso(remain)} />
        <Field label="Change" value={peso(change)} />
      </div>
      <label>Payment method</label>
      <div className="methods">
        {[
          ['Cash', Banknote],
          ['GCash', Smartphone],
          ['Bank', Building2],
          ['COD', Receipt]
        ].map(([n, I]) => (
          <button className={pay.method === n ? 'selected' : ''} key={n} onClick={() => setPay({ ...pay, method: n })}>
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
    <Section title="Review payment">
      <div className="grid">
        <Field label="Customer" value={job.full_name} />
        <Field label="Service" value={job.service_type} />
        <Field label="Appointment" value={`${job.schedule_date || '—'} · ${job.appointment_time || '—'}`} />
        <Field label="Amount due" value={peso(due)} />
        <Field label="Amount received" value={peso(received)} />
        <Field label="Payment method" value={pay.method} />
        <Field label="Reference" value={pay.refNo || 'Cash payment'} />
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
              {busy ? 'Processing…' : 'Confirm Payment'}
              <CheckCircle2 size={16} />
            </button>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}

export default function PaymentProcess({ onNavigate = () => {}, onLogout = () => {} }) {
  const [jobs, setJobs] = useState([]);
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [chosen, setChosen] = useState(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .neq('payment_status', 'paid')
      .neq('status', 'awaiting_manager')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Unable to load appointments for payment processing.', error);
      setJobs([]);
      return;
    }
    setJobs(data || []);
  };

  useEffect(() => {
    load();
    const c = supabase.channel('realtime_payment_process')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe();
    return () => supabase.removeChannel(c);
  }, []);

  const list = useMemo(() => {
    return jobs
      .filter(j => `${j.full_name || ''} ${j.service_type || ''} ${j.id}`.toLowerCase().includes(term.toLowerCase()))
      .filter(j => {
        if (filter === 'all') return true;
        if (filter === 'pending') return j.payment_status !== 'paid';
        return j.status === 'completed';
      });
  }, [jobs, term, filter]);

  return (
    <div className="shell">
      <style>{css}</style>
      <Sidebar go={onNavigate} logout={onLogout} />
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
            ['pending', 'Payment Pending'],
            ['completed', 'Technician Completed']
          ].map(([k, l]) => (
            <button className={filter === k ? 'on' : ''} key={k} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
        <section className="queue">
          <p>{list.length} appointment{list.length === 1 ? '' : 's'} awaiting review</p>
          <div>
            {list.length ? (
              list.map(j => <Card key={j.id} job={j} onReview={setChosen} />)
            ) : (
              <article className="empty">No appointments match this filter.</article>
            )}
          </div>
        </section>
      </main>
      <AnimatePresence>
        {chosen && <Modal job={chosen} onClose={() => setChosen(null)} onDone={() => { setChosen(null); load(); }} />}
      </AnimatePresence>
    </div>
  );
}

const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}.shell{min-height:100vh;display:flex;background:${C.bg};color:${C.text};font-family:Inter,system-ui,sans-serif}.side{width:224px;background:${C.side};border-right:1px solid ${C.border};padding:24px 14px;display:flex;flex-direction:column;gap:3px}.brand{display:flex;gap:10px;align-items:center;padding:0 8px 28px}.brand i{width:35px;height:35px;display:grid;place-items:center;background:${C.gold};color:${C.bg};border-radius:10px}.brand b{display:block}.brand small{color:${C.gold};font-size:10px;text-transform:uppercase}.side button{border:0;background:none;color:${C.sub};padding:11px;display:flex;gap:10px;align-items:center;border-radius:9px;font:700 12px inherit;cursor:pointer}.side button.active{color:${C.gold};background:${C.goldSoft}}.side .out{margin-top:auto;border:1px solid ${C.border}}.page{flex:1;min-width:0;padding:30px 36px}.page>header{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid ${C.border};padding-bottom:18px}.page h1{font-size:25px;margin:0}.page header p{margin:5px 0 0;font-size:13px;color:${C.sub}}.search{display:flex;gap:8px;align-items:center;background:${C.panel};border:1px solid ${C.border};padding:10px 12px;border-radius:9px;color:${C.muted}}input{outline:0;border:0;background:transparent;color:${C.text};font:13px inherit}.search input{width:270px}.filters{display:flex;gap:8px;padding:16px 0}.filters button{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:7px;padding:7px 11px;font:700 12px inherit;cursor:pointer}.filters .on{background:${C.goldSoft};border-color:${C.gold};color:${C.gold}}.queue>p{font-size:12px;color:${C.muted}}.queue>div{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}.card{background:${C.panel};border:1px solid ${C.border};border-radius:13px;padding:16px}.card header{display:flex;gap:10px;align-items:center}.card header i{width:37px;height:37px;display:grid;place-items:center;border-radius:9px;background:${C.goldSoft};color:${C.gold};font-style:normal;font-weight:800}.card h2{font-size:15px;margin:0}.card p{font-size:12px;color:${C.sub};margin:3px 0}.meta{display:grid;gap:7px;margin:14px 0;font-size:12px;color:${C.sub}}.meta span{display:flex;gap:7px;align-items:center}.money{border-block:1px solid ${C.border};padding:10px 0;display:grid;gap:7px;font-size:12px;color:${C.sub}}.money span,.money strong{display:flex;justify-content:space-between}.money b{color:${C.text}}.money strong{color:${C.gold};font-size:13px}.badges{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.badges em{font-style:normal;font-size:11px;color:${C.gold};background:${C.goldSoft};padding:4px 7px;border-radius:5px}.review,.next{width:100%;background:${C.gold};color:${C.bg};border:0;border-radius:8px;padding:11px;display:flex;justify-content:center;align-items:center;gap:5px;font-weight:800;cursor:pointer}.empty{padding:35px;text-align:center;color:${C.muted};border:1px dashed ${C.border};border-radius:12px}.shade{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.72);backdrop-filter:blur(7px);display:grid;place-items:center;padding:24px}.modal{width:min(980px,100%);height:min(720px,calc(100vh - 48px));background:${C.side};border:1px solid rgba(234,179,8,.32);border-radius:14px;display:flex;flex-direction:column;overflow:hidden}.modal>header{padding:17px 22px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between}.modal>header p{font-size:11px;color:${C.gold};margin:0}.modal h1{font-size:20px;margin:4px 0 0}.modal>header button{width:34px;height:34px;border:1px solid ${C.border};border-radius:7px;background:${C.panel};color:${C.sub};display:grid;place-items:center;cursor:pointer}.steps{display:flex;gap:3px;padding:10px 18px;border-bottom:1px solid ${C.border};overflow:auto}.steps button{min-width:93px;border:0;background:none;color:${C.muted};font:600 11px inherit;cursor:pointer;text-align:left;padding:5px}.steps b{display:block;font-size:11px}.steps .now{color:${C.gold};background:${C.goldSoft};border-radius:6px}.steps .done{color:${C.sub}}.modal main{padding:18px 22px;overflow:auto;flex:1}.section h3{margin:0 0 14px;font-size:16px}.grid,.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.field small{display:block;color:${C.muted};font-size:11px;margin-bottom:4px}.field b{display:block;font-size:13px;overflow-wrap:anywhere}.section>p{font-size:13px;line-height:1.5;color:${C.sub};margin:15px 0 0}.lists{display:grid;grid-template-columns:1fr 1fr;gap:16px}.lists h4{font-size:12px;color:${C.gold};margin:0 0 8px}.lists p{border-bottom:1px solid ${C.border};padding:8px 0;margin:0;display:grid;gap:3px}.lists span{font-size:11px;color:${C.muted}}.section label{font-size:12px;color:${C.sub};display:block;margin-top:16px}.section label input{width:100%;margin-top:6px;border:1px solid ${C.border};border-radius:7px;background:${C.bg};padding:10px}.methods{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:7px}.methods button{border:1px solid ${C.border};background:${C.bg};color:${C.sub};border-radius:7px;padding:9px;display:grid;justify-items:center;gap:4px;font:700 11px inherit;cursor:pointer}.methods .selected{border-color:${C.gold};color:${C.gold};box-shadow:0 0 0 2px ${C.goldSoft}}.modal footer{padding:14px 22px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;gap:12px}.back{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:8px;padding:10px 14px;display:flex;gap:4px;align-items:center;font-weight:700;cursor:pointer}.back:disabled{opacity:.4}.next{width:auto;padding:10px 15px}.next:disabled{opacity:.65;cursor:wait}@media(max-width:760px){.shell{display:block}.side{width:100%;padding:12px;flex-direction:row;align-items:center;overflow:auto}.brand{padding:0 8px}.side .out{margin:0}.page{padding:18px}.page>header{align-items:start;gap:12px;flex-direction:column}.search input{width:220px}.shade{padding:8px}.modal{height:calc(100vh - 16px)}.grid,.summary,.lists{grid-template-columns:1fr}.steps{padding-inline:8px}.steps button{min-width:76px}}`;
