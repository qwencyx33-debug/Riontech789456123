import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import DispatchingView from './DispatchingView';
import QCVerificationView from './QCVerificationView';
import TechnicianManagementView from './TechnicianManagementView';

const colors = {
  blue: '#3B82F6',
  gold: '#EAB308',
  green: '#10B981',
};

const workflowSteps = [
  'Appointment',
  'Payment',
  'Manager Review',
  'Dispatch',
  'Service',
  'QC',
  'Completed',
];

const formatDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
    : 'Not provided';
};

const readable = (value) => value
  ? String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : 'Not provided';

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-slate-200">
      {value || 'Not provided'}
    </p>
  </div>
);

const EmptyDetail = ({ children }) => (
  <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
    {children}
  </p>
);

const ActionCard = ({ icon: Icon, title, count, description, emptyText, onClick, delay }) => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    whileHover={{ y: -3 }}
    className="flex min-h-[188px] flex-col rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-5 shadow-xl"
  >
    <div className="flex items-start justify-between">
      <div className="rounded-xl border border-[#EAB308]/25 bg-[#EAB308]/10 p-2.5 text-[#EAB308]">
        <Icon size={18} />
      </div>
      <span className="text-3xl font-bold tabular-nums text-white">{count}</span>
    </div>
    <h3 className="mt-5 text-sm font-bold text-white">{title}</h3>
    <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-slate-400">
      {count ? description : emptyText}
    </p>
    <button
      type="button"
      onClick={onClick}
      className="mt-auto pt-4 text-left text-xs font-bold text-[#EAB308] hover:text-yellow-300"
    >
      {count === 0 ? 'VIEW STATUS' : title === 'Payment Approvals' ? 'REVIEW NOW' : title === 'Ready for Dispatch' ? 'OPEN DISPATCH' : 'REVIEW QC'} →
    </button>
  </motion.article>
);

const AppointmentReviewModal = ({ appointment, review, loading, onClose, onDispatch }) => {
  if (!appointment) return null;
  const { projectDetails, serviceAreas, requestedItems, errors } = review;
  const projectFields = [
    ['Property type', projectDetails?.property_type],
    ['Property size', projectDetails?.property_size ? `${projectDetails.property_size} ${projectDetails.property_size_unit || ''}` : null],
    ['Floors', projectDetails?.floor_count],
    ['Rooms', projectDetails?.room_count],
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
    >
      <button
        type="button"
        aria-label="Close appointment review"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#07111c] shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-white/[0.07] px-5 py-4 md:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EAB308]">
              Appointment review
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {appointment.full_name || 'Customer appointment'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review project details before technician assignment.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 md:px-7">
          <section>
            <h3 className="text-sm font-bold text-white">Appointment</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Customer" value={appointment.full_name} />
              <Detail label="Service" value={appointment.service_type} />
              <Detail label="Schedule date" value={formatDate(appointment.schedule_date)} />
              <Detail label="Appointment time" value={appointment.appointment_time} />
              <Detail label="Address" value={appointment.address || appointment.location} />
              <Detail label="Payment method" value={readable(appointment.payment_method)} />
              <Detail label="Payment status" value={readable(appointment.payment_status)} />
              <Detail label="Price" value={formatMoney(appointment.price)} />
              <Detail label="Priority" value={readable(appointment.priority)} />
              <Detail label="Appointment status" value={readable(appointment.status)} />
            </div>
          </section>

          <section className="mt-7">
            <h3 className="text-sm font-bold text-white">Project overview</h3>
            {loading ? <EmptyDetail>Loading project details…</EmptyDetail> : errors.project ? <EmptyDetail>Project details are unavailable. Core appointment information is still available.</EmptyDetail> : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {projectFields.map(([label, value]) => <Detail key={label} label={label} value={value} />)}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Detail label="Site notes" value={projectDetails?.site_notes} />
                  <Detail label="Customer requirements" value={projectDetails?.customer_requirements} />
                  <Detail label="Customer comments" value={projectDetails?.customer_comments} />
                </div>
              </>
            )}
          </section>

          <section className="mt-7">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold text-white">Service areas</h3>
              {!loading && !errors.areas && <span className="text-xs text-slate-400">{serviceAreas.length} service area{serviceAreas.length === 1 ? '' : 's'}</span>}
            </div>
            {loading ? <EmptyDetail>Loading service areas…</EmptyDetail> : errors.areas ? <EmptyDetail>Service area details unavailable.</EmptyDetail> : serviceAreas.length === 0 ? <EmptyDetail>No service areas were provided.</EmptyDetail> : (
              <div className="mt-3 space-y-2">
                {serviceAreas.map((area) => (
                  <div key={area.id} className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm md:grid-cols-4">
                    <p className="font-semibold text-slate-200">{area.area_name || 'Unnamed area'}</p>
                    <p className="text-slate-400">Size: {area.area_size ? `${area.area_size} ${area.area_size_unit || ''}` : 'Not provided'}</p>
                    <p className="text-slate-400">Quantity: {area.quantity ?? 'Not provided'}</p>
                    <p className="break-words text-slate-400">{area.notes || 'No notes'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-7">
            <h3 className="text-sm font-bold text-white">Requested items</h3>
            {loading ? <EmptyDetail>Loading requested items…</EmptyDetail> : errors.items ? <EmptyDetail>Requested item details unavailable.</EmptyDetail> : requestedItems.length === 0 ? <EmptyDetail>No requested items were provided.</EmptyDetail> : (
              <div className="mt-3 space-y-2">
                {requestedItems.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-200">{item.item_name || 'Unnamed item'}</p>
                      <p className="mt-1 text-slate-400">{item.description || 'No description'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-slate-400">
                      <p>Qty: {item.quantity ?? '—'}</p>
                      <p>Unit: {formatMoney(item.unit_price)}</p>
                      <p>Total: {formatMoney(item.total_price)}</p>
                    </div>
                    {item.customer_comment && <p className="text-slate-400 md:col-span-2">Customer comment: {item.customer_comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-white/[0.07] bg-[#08131f] px-5 py-4 md:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EAB308]">Next action</p>
            <p className="mt-1 text-sm text-slate-400">Continue to the existing dispatch workspace.</p>
          </div>
          <button type="button" onClick={onDispatch} className="rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-bold text-[#020617] hover:bg-yellow-300">
            Continue to dispatch →
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
};

const ManagerDashboard = ({ onLogout }) => {
  const [activeView, setActiveView] = useState('Dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewAppointment, setReviewAppointment] = useState(null);
  const [review, setReview] = useState({ projectDetails: null, serviceAreas: [], requestedItems: [], errors: {} });
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    const [appointmentsResult, techniciansResult] = await Promise.all([
      supabase.from('appointments').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'technician'),
    ]);
    setAppointments(appointmentsResult.data || []);
    setTechnicians(techniciansResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
    const subscription = supabase
      .channel('manager_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadDashboardData)
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const metrics = useMemo(() => {
    const status = (appointment) => (appointment.status || '').toLowerCase();
    const paid = (appointment) => ['paid', 'full_paid', 'downpayment_paid'].includes((appointment.payment_status || '').toLowerCase());
    const cashierApprovals = appointments.filter((appointment) => paid(appointment) && ['pending', 'awaiting_manager'].includes(status(appointment)));
    const readyForDispatch = appointments.filter((appointment) => status(appointment) === 'pending' && paid(appointment));
    const qualityReview = appointments.filter((appointment) => status(appointment) === 'qc' || (status(appointment) === 'completed' && !appointment.qc_status));
    const activeServices = appointments.filter((appointment) => ['assigned', 'travelling', 'arrived', 'working', 'ongoing'].includes(status(appointment))).length;
    const completedServices = appointments.filter((appointment) => status(appointment) === 'completed').length;
    return { cashierApprovals, readyForDispatch, qualityReview, activeServices, completedServices };
  }, [appointments]);

  const openReview = async (appointment) => {
    setReviewAppointment(appointment);
    setReviewLoading(true);
    setReview({ projectDetails: null, serviceAreas: [], requestedItems: [], errors: {} });
    const [projectResult, areasResult, itemsResult] = await Promise.all([
      supabase.from('appointment_project_details').select('*').eq('appointment_id', appointment.id).maybeSingle(),
      supabase.from('appointment_areas').select('*').eq('appointment_id', appointment.id).order('created_at', { ascending: true }),
      supabase.from('appointment_items').select('*').eq('appointment_id', appointment.id).order('created_at', { ascending: true }),
    ]);
    setReview({
      projectDetails: projectResult.data || null,
      serviceAreas: areasResult.data || [],
      requestedItems: itemsResult.data || [],
      errors: { project: Boolean(projectResult.error), areas: Boolean(areasResult.error), items: Boolean(itemsResult.error) },
    });
    setReviewLoading(false);
  };

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const menuItems = [['Dashboard', 'Dashboard', LayoutDashboard], ['Dispatching', 'Dispatch Center', Truck], ['QC Verification', 'QC Center', ClipboardCheck], ['Technician Registry', 'Technicians', Users]];
  const attentionCount = metrics.cashierApprovals.length + metrics.readyForDispatch.length + metrics.qualityReview.length;

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-slate-100">
      <AnimatePresence>{mobileNav && <motion.button type="button" aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />}</AnimatePresence>
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-[#031418] transition-transform md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6"><span className="rounded-lg bg-[#EAB308] p-2 text-[#031418]"><ShieldCheck size={17} /></span><div><p className="text-sm font-bold text-white">Riontech</p><p className="text-[10px] uppercase tracking-wider text-slate-500">Manager portal</p></div></div>
        <nav className="flex-1 space-y-1 p-3">{menuItems.map(([id, label, Icon]) => <button type="button" key={id} onClick={() => { setActiveView(id); setMobileNav(false); }} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold" style={activeView === id ? { color: colors.gold, background: `${colors.gold}12` } : { color: '#94A3B8' }}><Icon size={17} />{label}</button>)}</nav>
        <button type="button" onClick={onLogout} className="m-3 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-red-500/10 hover:text-red-400"><LogOut size={17} />Logout</button>
      </aside>
      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#020617]/90 px-5 backdrop-blur-xl md:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-slate-400 md:hidden"><Menu size={20} /></button><div><p className="text-sm font-bold text-white">{greeting}, Manager</p><p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">{today}<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Real-time operational updates</p></div></div><button type="button" onClick={() => setActiveView('Dashboard')} className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Bell size={18} />{attentionCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#EAB308]" />}</button></header>
        {activeView === 'Dashboard' && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto w-full max-w-7xl space-y-5 p-5 md:p-7"><section><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#EAB308]">Manager command center</p><div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div><h1 className="text-2xl font-bold tracking-tight text-white">Action required</h1><p className="mt-1 text-sm text-slate-400">Review and process appointments that require your attention.</p></div>{loading && <span className="text-xs text-slate-500">Updating operations…</span>}</div><div className="mt-4 grid gap-4 md:grid-cols-3"><ActionCard icon={CheckCircle2} title="Payment Approvals" count={metrics.cashierApprovals.length} description="Appointments cleared by Cashier and ready for Manager review." emptyText="All payment reviews are clear." onClick={() => metrics.cashierApprovals[0] && openReview(metrics.cashierApprovals[0])} delay={0.05} /><ActionCard icon={Truck} title="Ready for Dispatch" count={metrics.readyForDispatch.length} description="Confirmed appointments awaiting technician assignment." emptyText="No confirmed appointments are waiting for assignment." onClick={() => setActiveView('Dispatching')} delay={0.1} /><ActionCard icon={ClipboardCheck} title="Quality Review" count={metrics.qualityReview.length} description="Completed services awaiting quality verification." emptyText="No completed services are awaiting quality review." onClick={() => setActiveView('QC Verification')} delay={0.15} /></div></section><section className="grid gap-5 lg:grid-cols-[1.05fr_1.95fr]"><div className="rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Operations overview</p><div className="mt-4 grid grid-cols-3 gap-3"><Detail label="Active services" value={metrics.activeServices} /><Detail label="Field team" value={technicians.length} /><Detail label="Completed services" value={metrics.completedServices} /></div></div><div className="rounded-2xl border border-white/[0.08] bg-[#0A0F18] p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Service workflow</p><div className="mt-5 flex items-start overflow-x-auto pb-1">{workflowSteps.map((step, index) => <React.Fragment key={step}><div className="min-w-[78px] text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-bold text-slate-300" style={index === 2 ? { borderColor: `${colors.gold}88`, color: colors.gold, background: `${colors.gold}12` } : undefined}>{index + 1}</span><p className="mt-2 text-[10px] font-semibold text-slate-400">{step}</p></div>{index < workflowSteps.length - 1 && <div className="mt-3.5 h-px min-w-4 flex-1 bg-white/10" />}</React.Fragment>)}</div></div></section></motion.div>}
        {activeView === 'Dispatching' && <DispatchingView onNavigateToDashboard={() => setActiveView('Dashboard')} />}{activeView === 'QC Verification' && <QCVerificationView />}{activeView === 'Technician Registry' && <TechnicianManagementView />}
      </main>
      <AnimatePresence>{reviewAppointment && <AppointmentReviewModal appointment={reviewAppointment} review={review} loading={reviewLoading} onClose={() => setReviewAppointment(null)} onDispatch={() => { setReviewAppointment(null); setActiveView('Dispatching'); }} />}</AnimatePresence>
    </div>
  );
};

export default ManagerDashboard;
