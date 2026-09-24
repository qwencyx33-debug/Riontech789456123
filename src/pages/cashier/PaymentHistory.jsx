import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import { 
  Banknote, Calendar, CheckCircle2, ChevronLeft, ChevronRight, 
  FileText, MapPin, Receipt, Search, Smartphone, Building2, X 
} from 'lucide-react';

const C = {
  bg: '#020617',
  panel: '#0b1623',
  side: '#060e18',
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
const date = v => v ? new Date(v).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not provided';

const Field = ({ label, value }) => (
  <div className="f">
    <small>{label}</small>
    <b>{blank(value) ? 'Not provided' : value}</b>
  </div>
);

const Section = ({ title, children }) => (
  <section>
    <h3>{title}</h3>
    {children}
  </section>
);

function Card({ t, onOpen }) {
  const method = (t.payment_method || 'Cash');
  const I = method.toLowerCase().includes('gcash') 
    ? Smartphone 
    : method.toLowerCase().includes('bank') 
      ? Building2 
      : Banknote;

  return (
    <motion.article 
      className="card" 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      whileHover={{ y: -3 }}
    >
      <header>
        <div>
          <h2>{t.full_name || 'Customer'}</h2>
          <p>{t.service_type || 'Service'}</p>
        </div>
        <em><CheckCircle2 size={13} />Paid</em>
      </header>
      <div className="meta">
        <span><Calendar size={14} />{date(t.schedule_date || t.completed_at)}</span>
        <span><MapPin size={14} />{t.address || 'Location not recorded'}</span>
      </div>
      <strong>{peso(t.price)}</strong>
      <div className="method">
        <I size={15} />
        {method}
        {(t.payment_ref || t.reference_number) && (
          <small>REF: {t.payment_ref || t.reference_number}</small>
        )}
      </div>
      <p className="receipt">
        {t.receipt_image ? '✓ Receipt available' : 'No receipt uploaded'}
      </p>
      <button onClick={() => onOpen(t)}>
        View Transaction <ChevronRight size={16} />
      </button>
    </motion.article>
  );
}

function useRelated(t) {
  const [d, setD] = useState({ project: null, areas: [], items: [], service: null });

  useEffect(() => {
    let live = true;
    const load = async () => {
      const q = [
        supabase.from('appointment_project_details').select('*').eq('appointment_id', t.id).maybeSingle(),
        supabase.from('appointment_areas').select('*').eq('appointment_id', t.id),
        supabase.from('appointment_items').select('*').eq('appointment_id', t.id)
      ];
      if (t.service_id) {
        q.push(supabase.from('service_types').select('*').eq('id', t.service_id).maybeSingle());
      }
      const r = await Promise.all(q);
      if (live) {
        setD({
          project: r[0].data,
          areas: r[1].data || [],
          items: r[2].data || [],
          service: r[3]?.data
        });
      }
    };
    load();
    return () => { live = false; };
  }, [t.id, t.service_id]);

  return d;
}

const steps = ['Appointment', 'Service', 'Project', 'Payment', 'Receipt', 'Summary'];

function Modal({ t, onClose }) {
  const [d] = useRelated(t);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(false);

  const service = d.service || {};
  const project = d.project || {};
  const due = Math.max(0, (Number(t.price) || 0) - (Number(t.downpayment_paid) || 0));

  const pages = [
    <Section title="Appointment details">
      <div className="grid">
        <Field label="Customer" value={t.full_name} />
        <Field label="Email" value={t.email} />
        <Field label="Appointment reference" value={t.id} />
        <Field label="Date" value={date(t.schedule_date)} />
        <Field label="Time" value={t.appointment_time} />
        <Field label="Address" value={t.address} />
        <Field label="Appointment status" value={t.status} />
        <Field label="Payment status" value={t.payment_status} />
      </div>
    </Section>,
    <Section title="Service information">
      <div className="grid">
        <Field label="Service" value={t.service_type || service.name || service.title} />
        <Field label="Category" value={service.service_categories?.name || t.service_category} />
        <Field label="Service price" value={peso(t.price)} />
        <Field label="Duration" value={service.duration} />
        <Field label="Survey required" value={t.requires_survey === true ? 'Yes' : t.requires_survey === false ? 'No' : null} />
      </div>
      <p>{service.description || t.details || 'No service description was recorded.'}</p>
    </Section>,
    <Section title="Project details">
      <div className="grid">
        <Field label="Property type" value={project.property_type} />
        <Field label="Property size" value={project.property_size ? `${project.property_size} ${project.property_size_unit || ''}` : null} />
        <Field label="Floor count" value={project.floor_count} />
        <Field label="Room count" value={project.room_count} />
      </div>
      <p>{project.site_notes || project.customer_requirements || project.customer_comments || 'No project details were recorded for this appointment.'}</p>
      {(d.areas.length || d.items.length) > 0 && (
        <div className="lists">
          {d.areas.map(a => (
            <p key={a.id}>
              <b>{a.area_name}</b>
              <span>{a.area_size || '—'} {a.area_size_unit || ''} · Qty {a.quantity || 1}</span>
            </p>
          ))}
          {d.items.map(i => (
            <p key={i.id}>
              <b>{i.item_name}</b>
              <span>{i.quantity || 1} × {peso(i.unit_price)}</span>
            </p>
          ))}
        </div>
      )}
    </Section>,
    <Section title="Payment summary">
      <div className="grid">
        <Field label="Total price" value={peso(t.price)} />
        <Field label="Downpayment paid" value={peso(t.downpayment_paid)} />
        <Field label="Amount paid" value={peso(t.price)} />
        <Field label="Remaining balance" value={peso(due)} />
        <Field label="Payment method" value={t.payment_method} />
        <Field label="Payment reference" value={t.payment_ref} />
        <Field label="Reference number" value={t.reference_number} />
        <Field label="Payment date" value={date(t.completed_at || t.updated_at)} />
        <Field label="Payment status" value={t.payment_status} />
      </div>
    </Section>,
    <Section title="Payment receipt">
      {t.receipt_image ? (
        <div className="receiptbox">
          <p>✓ Receipt available</p>
          <img src={t.receipt_image} alt="Payment receipt" />
          <button onClick={() => setPreview(true)}>View Receipt</button>
        </div>
      ) : (
        <p>No receipt uploaded.</p>
      )}
    </Section>,
    <Section title="Transaction summary">
      <div className="grid">
        <Field label="Customer" value={t.full_name} />
        <Field label="Service" value={t.service_type} />
        <Field label="Appointment" value={`${date(t.schedule_date)} · ${t.appointment_time || 'Not provided'}`} />
        <Field label="Amount paid" value={peso(t.price)} />
        <Field label="Payment method" value={t.payment_method} />
        <Field label="Payment reference" value={t.payment_ref || t.reference_number} />
        <Field label="Receipt" value={t.receipt_image ? 'Available' : 'Not uploaded'} />
        <Field label="Payment status" value={t.payment_status} />
      </div>
    </Section>
  ][step];

  return (
    <motion.div className="shade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" initial={{ scale: .97, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 8 }}>
        <header>
          <div>
            <p>Payment record</p>
            <h1>{t.full_name || 'Customer'} <em>● Paid</em></h1>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <nav>
          {steps.map((s, i) => (
            <button key={s} className={i === step ? 'now' : i < step ? 'done' : ''} onClick={() => i < step && setStep(i)}>
              <b>{String(i + 1).padStart(2, '0')}</b>
              {s}
            </button>
          ))}
        </nav>
        <main>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
              {pages}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer>
          <button disabled={!step} onClick={() => setStep(step - 1)}>
            <ChevronLeft size={16} />Back
          </button>
          {step < 5 ? (
            <button className="next" onClick={() => setStep(step + 1)}>
              Next<ChevronRight size={16} />
            </button>
          ) : (
            <button className="next" onClick={onClose}>
              Done<CheckCircle2 size={16} />
            </button>
          )}
        </footer>
      </motion.div>
      {preview && (
        <div className="receiptshade" onClick={() => setPreview(false)}>
          <div onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(false)}><X size={17} /></button>
            <img src={t.receipt_image} alt="Full receipt" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PaymentHistory() {
  const [rows, setRows] = useState([]);
  const [term, setTerm] = useState('');
  const [method, setMethod] = useState('all');
  const [range, setRange] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('payment_status', 'paid')
      .order('completed_at', { ascending: false });

    if (error) {
      console.error(error);
      setError(true);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const c = supabase.channel('realtime_payment_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe();
    return () => supabase.removeChannel(c);
  }, []);

  const list = useMemo(() => {
    return rows
      .filter(t => `${t.full_name || ''} ${t.service_type || ''} ${t.reference_number || ''} ${t.payment_ref || ''} ${t.id}`.toLowerCase().includes(term.toLowerCase()))
      .filter(t => method === 'all' || (t.payment_method || '').toLowerCase().includes(method))
      .filter(t => {
        if (range === 'all') return true;
        const d = new Date(t.completed_at || t.updated_at || 0), now = new Date();
        if (range === 'today') return d.toDateString() === now.toDateString();
        if (range === 'week') return d >= new Date(now - 6048e5);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
  }, [rows, term, method, range]);

  return (
    <div className="page">
      <style>{css}</style>
      <header>
        <div>
          <h1>Payment History</h1>
          <p>Completed payment transactions</p>
          <small>View and review previously processed appointments and payment records.</small>
        </div>
        <div className="search">
          <Search size={16} />
          <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search customer, service, or reference…" />
        </div>
      </header>
      <div className="filters">
        {['all', 'cash', 'gcash', 'cod'].map(m => (
          <button className={method === m ? 'on' : ''} onClick={() => setMethod(m)} key={m}>
            {m === 'all' ? 'All' : m === 'gcash' ? 'GCash' : m.toUpperCase()}
          </button>
        ))}
        <select value={range} onChange={e => setRange(e.target.value)}>
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      </div>
      <h2>Transaction History <span>{list.length}</span></h2>
      {error ? (
        <div className="empty">Payment history could not be loaded. Please try again.</div>
      ) : loading ? (
        <div className="empty">Loading completed payment transactions…</div>
      ) : (
        <div className="cards">
          {list.length ? (
            list.map(t => <Card key={t.id} t={t} onOpen={setSelected} />)
          ) : (
            <div className="empty">No transactions match your current search or filter.</div>
          )}
        </div>
      )}
      <AnimatePresence>
        {selected && <Modal t={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

const css = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}.page{min-height:100vh;background:${C.bg};color:${C.text};padding:30px 36px;font-family:Inter,system-ui,sans-serif}.page>header{display:flex;justify-content:space-between;align-items:end;gap:16px;border-bottom:1px solid ${C.border};padding-bottom:18px}.page h1{font-size:25px;margin:0}.page header p{margin:5px 0;color:${C.sub};font-size:13px}.page header small{color:${C.muted};font-size:12px}.search{display:flex;align-items:center;gap:8px;border:1px solid ${C.border};background:${C.panel};border-radius:9px;padding:10px;color:${C.muted}}input{border:0;outline:0;background:transparent;color:${C.text};font:13px inherit}.search input{width:280px}.filters{display:flex;gap:8px;padding:17px 0}.filters button,.filters select{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:7px;padding:8px 11px;font:700 12px inherit;cursor:pointer}.filters .on{background:${C.goldSoft};color:${C.gold};border-color:${C.gold}}.page>h2{font-size:17px;margin:0 0 14px}.page>h2 span{font-size:12px;color:${C.gold}}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(305px,1fr));gap:14px}.card{background:${C.panel};border:1px solid ${C.border};border-radius:13px;padding:16px}.card header{display:flex;justify-content:space-between}.card h2{font-size:15px;margin:0}.card p{font-size:12px;color:${C.sub};margin:3px 0}.card header em{display:flex;gap:4px;align-items:center;color:${C.green};font-size:11px;font-style:normal}.meta{display:grid;gap:7px;margin:13px 0;font-size:12px;color:${C.sub}}.meta span{display:flex;gap:7px;align-items:center}.card>strong{display:block;font-size:19px;color:${C.gold};border-block:1px solid ${C.border};padding:11px 0}.method{display:flex;gap:6px;align-items:center;margin:12px 0;color:${C.sub};font-size:12px}.method small{margin-left:auto;color:${C.muted}}.receipt{color:${C.muted}!important}.card>button,.next{width:100%;border:0;border-radius:8px;background:${C.gold};color:${C.bg};padding:11px;font-weight:800;display:flex;gap:5px;align-items:center;justify-content:center;cursor:pointer}.empty{padding:45px;text-align:center;border:1px dashed ${C.border};border-radius:12px;color:${C.muted};font-size:13px}.shade{position:fixed;z-index:50;inset:0;background:rgba(0,0,0,.73);backdrop-filter:blur(6px);display:grid;place-items:center;padding:24px}.modal{width:min(900px,100%);height:min(650px,calc(100vh - 48px));border:1px solid rgba(234,179,8,.32);border-radius:14px;background:${C.side};display:flex;flex-direction:column;overflow:hidden}.modal>header{padding:17px 22px;border-bottom:1px solid ${C.border};display:flex;justify-content:space-between}.modal header p{color:${C.gold};font-size:11px;margin:0}.modal h1{font-size:20px;margin:5px 0}.modal h1 em{color:${C.green};font-size:12px;font-style:normal}.modal header button{background:${C.panel};border:1px solid ${C.border};color:${C.sub};border-radius:7px;width:34px;height:34px}.modal nav{display:flex;overflow:auto;padding:10px;border-bottom:1px solid ${C.border};gap:3px}.modal nav button{min-width:104px;border:0;background:none;color:${C.muted};font:600 11px inherit;text-align:left;cursor:pointer;padding:5px}.modal nav b{display:block}.modal nav .now{color:${C.gold};background:${C.goldSoft};border-radius:6px}.modal main{overflow:auto;flex:1;padding:20px 23px}.section h3{font-size:16px;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.f small{display:block;color:${C.muted};font-size:11px;margin-bottom:4px}.f b{display:block;font-size:13px;overflow-wrap:anywhere}.section>p{font-size:13px;color:${C.sub};line-height:1.5}.lists p{border-bottom:1px solid ${C.border};padding:7px 0;display:flex;justify-content:space-between;font-size:12px}.lists span{color:${C.muted}}.receiptbox img{max-height:190px;max-width:100%;display:block;margin:12px auto;border-radius:8px}.receiptbox button{background:${C.goldSoft};border:1px solid ${C.gold};color:${C.gold};border-radius:7px;padding:9px 12px;cursor:pointer}.modal footer{padding:14px 22px;border-top:1px solid ${C.border};display:flex;justify-content:space-between}.modal footer>button{border:1px solid ${C.border};background:${C.panel};color:${C.sub};border-radius:8px;padding:10px 13px;display:flex;gap:4px;align-items:center;font-weight:700;cursor:pointer}.modal footer .next{width:auto;background:${C.gold};color:${C.bg};border-color:${C.gold}}.receiptshade{position:fixed;z-index:60;inset:0;background:rgba(0,0,0,.85);display:grid;place-items:center;padding:20px}.receiptshade>div{max-width:min(800px,100%);max-height:100%;position:relative}.receiptshade img{max-width:100%;max-height:80vh;display:block}.receiptshade button{position:absolute;right:8px;top:8px;z-index:1;border:0;border-radius:50%;padding:8px;background:${C.panel};color:white}@media(max-width:700px){.page{padding:18px}.page>header{align-items:start;flex-direction:column}.search input{width:220px}.shade{padding:8px}.modal{height:calc(100vh - 16px)}.grid{grid-template-columns:1fr}.modal nav button{min-width:82px}}`;