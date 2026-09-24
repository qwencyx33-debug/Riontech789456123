import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  ImagePlus,
  MapPin,
  Navigation,
  Package,
  Phone,
  Play,
  X
} from 'lucide-react';

const STEPS = [
  ['overview', 'Overview'],
  ['scope', 'Scope'],
  ['before', 'Before'],
  ['service', 'Service'],
  ['after', 'After'],
  ['report', 'Report'],
  ['completion', 'QC']
];

const TABS = ['active', 'upcoming', 'completed', 'history'];

const label = (v = 'pending') =>
  v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

const today = v =>
  new Date(v).toDateString() === new Date().toDateString();

function Button({ children, onClick, primary, disabled, icon: Icon, className = '' }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-amber-400 text-[#080d18] hover:bg-amber-300'
          : 'border border-white/10 bg-white/[.04] text-slate-200 hover:bg-white/[.08]'
      } ${className}`}
    >
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}

function Field({ label: heading, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{heading}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-100">
        {children || 'Not provided'}
      </div>
    </div>
  );
}

function Timer({ value }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!value) return '—';
  const x = Math.max(0, Math.floor((now - new Date(value)) / 1000));
  return (
    <span className="font-semibold tabular-nums text-amber-200">
      {String(Math.floor(x / 3600)).padStart(2, '0')}:
      {String(Math.floor((x % 3600) / 60)).padStart(2, '0')}:
      {String(x % 60).padStart(2, '0')}
    </span>
  );
}

function Photos({ job, photos, type, reload, notice }) {
  const [busy, setBusy] = useState(false);
  const items = photos.filter(p => (p.photo_type || '').toLowerCase() === type);

  const upload = async e => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const path = `job-photos/${job.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from('assets').upload(path, file);
        if (up.error) throw up.error;
        const url = supabase.storage.from('assets').getPublicUrl(path);
        const saved = await supabase.from('job_photos').insert({
          appointment_id: job.id,
          photo_url: url.data.publicUrl,
          photo_type: type
        });
        if (saved.error) throw saved.error;
      }
      await reload();
      notice('Photos saved', `${files.length} ${type} photo${files.length === 1 ? '' : 's'} added.`);
    } catch (error) {
      notice('Upload failed', error.message || 'Please try again.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            {type === 'before' ? 'Before service' : 'After service'}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Document the condition {type === 'before' ? 'before beginning.' : 'when the service is finished.'}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-[#080d18]">
          <ImagePlus size={16} />
          {busy ? 'Uploading…' : 'Add photo'}
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={upload}
          />
        </label>
      </div>
      <div className="mt-5 grid min-h-0 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(p => (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={p.id}
            src={p.photo_url}
            alt={`${type} evidence`}
            className="aspect-square w-full rounded-xl border border-white/10 object-cover"
          />
        ))}
        {!items.length && (
          <div className="col-span-full flex min-h-36 items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-slate-500">
            <Camera size={17} className="mr-2" />
            No {type} photos yet
          </div>
        )}
      </div>
    </div>
  );
}

function Scope({ job, data }) {
  const d = data.details || {};
  const facts = [
    ['Property', d.property_type],
    ['Size', [d.property_size, d.property_size_unit].filter(Boolean).join(' ')],
    ['Floors', d.floor_count],
    ['Rooms', d.room_count]
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-2">
      <section className="min-h-0 overflow-y-auto pr-1">
        <h3 className="text-base font-semibold text-white">Property & service scope</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {facts.map(([k, v]) => (
            <Field key={k} label={k}>
              {v}
            </Field>
          ))}
          <Field label="Service details" className="col-span-2">
            {job.details || 'No additional service details.'}
          </Field>
          {d.customer_requirements && (
            <Field label="Customer requirements" className="col-span-2">
              {d.customer_requirements}
            </Field>
          )}
        </div>
      </section>
      <section className="min-h-0 overflow-y-auto rounded-xl border border-white/[.07] bg-white/[.02] p-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white">
          <Package size={16} className="text-amber-300" />
          Areas & items
        </h3>
        <div className="mt-3 space-y-3">
          {data.areas.map(a => (
            <div key={a.id} className="rounded-lg bg-white/[.04] p-3 text-sm text-slate-200">
              <b>{a.area_name}</b>
              {a.area_size && (
                <span className="text-slate-400">
                  {' '}
                  · {a.area_size} {a.area_size_unit || ''}
                </span>
              )}
            </div>
          ))}
          {data.items.map(i => (
            <div key={i.id} className="rounded-lg bg-white/[.04] p-3 text-sm text-slate-200">
              <b>{i.item_name}</b>
              <span className="text-slate-400"> × {i.quantity}</span>
              {i.description && <p className="mt-1 text-xs text-slate-400">{i.description}</p>}
            </div>
          ))}
          {job.materials_notes && <Field label="Material notes">{job.materials_notes}</Field>}
          {!data.areas.length && !data.items.length && !job.materials_notes && (
            <p className="text-sm text-slate-500">No areas, items, or material notes supplied.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Report({ job, report, reload, notice }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(
    () =>
      setForm({
        service_performed: report?.service_performed || '',
        items_used: report?.items_used || '',
        technician_notes: report?.technician_notes || ''
      }),
    [job.id, report]
  );

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        appointment_id: job.id,
        ...form,
        completion_time: new Date().toISOString()
      };
      const r = report
        ? await supabase.from('service_reports').update(payload).eq('id', report.id)
        : await supabase.from('service_reports').insert(payload);
      if (r.error) throw r.error;
      await reload();
      notice('Service report saved', 'The report is ready for QC.');
    } catch (e) {
      notice('Report not saved', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-white">Service report</h3>
      <p className="mt-1 text-sm text-slate-400">Record the completed work before submitting it for QC.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          ['service_performed', 'Service performed'],
          ['items_used', 'Items used'],
          ['technician_notes', 'Technician notes']
        ].map(([key, name]) => (
          <label
            key={key}
            className={`text-sm font-medium text-slate-300 ${
              key === 'technician_notes' ? 'md:col-span-2' : ''
            }`}
          >
            {name}
            <textarea
              rows={key === 'technician_notes' ? 4 : 3}
              value={form[key] || ''}
              onChange={e => setForm(x => ({ ...x, [key]: e.target.value }))}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-white outline-none focus:border-amber-400/50"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button primary icon={FileText} disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save report'}
        </Button>
      </div>
    </div>
  );
}

function Workspace({ job, onClose, onRefresh, notice }) {
  const [step, setStep] = useState(job.status === 'in_progress' ? 'service' : 'overview');
  const [data, setData] = useState({
    details: null,
    areas: [],
    items: [],
    photos: [],
    report: null,
    qc: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [d, a, i, p, r, q] = await Promise.all([
      supabase.from('appointment_project_details').select('*').eq('appointment_id', job.id).maybeSingle(),
      supabase.from('appointment_areas').select('*').eq('appointment_id', job.id).order('created_at'),
      supabase.from('appointment_items').select('*').eq('appointment_id', job.id).order('created_at'),
      supabase.from('job_photos').select('*').eq('appointment_id', job.id).order('created_at'),
      supabase.from('service_reports').select('*').eq('appointment_id', job.id).maybeSingle(),
      supabase.from('qc_reports').select('*').eq('appointment_id', job.id).maybeSingle()
    ]);
    setData({
      details: d.data,
      areas: a.data || [],
      items: i.data || [],
      photos: p.data || [],
      report: r.data,
      qc: q.data
    });
    setLoading(false);
  }, [job.id]);

  useEffect(() => {
    setStep(job.status === 'in_progress' ? 'service' : 'overview');
    reload();
  }, [job.id, reload]);

  const before = data.photos.some(p => (p.photo_type || '').toLowerCase() === 'before');
  const after = data.photos.some(p => (p.photo_type || '').toLowerCase() === 'after');
  const index = STEPS.findIndex(([k]) => k === step);

  const start = async () => {
    if (!before) return notice('Before photos required', 'Add before-service documentation before starting.');
    setSaving(true);
    try {
      const r = await supabase
        .from('appointments')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', job.id);
      if (r.error) throw r.error;
      await supabase.from('job_logs').insert({
        appointment_id: job.id,
        action: 'Status changed to in progress'
      });
      await onRefresh();
      setStep('service');
      notice('Service started', 'Your work timer is now running.');
    } catch (e) {
      notice('Unable to start service', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!before || !after || !data.report) {
      setStep(!after ? 'after' : 'report');
      return notice('Documentation missing', 'Add after photos and a service report before QC.');
    }
    setSaving(true);
    try {
      const r = await supabase
        .from('appointments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', job.id);
      if (r.error) throw r.error;
      await supabase.from('job_logs').insert({
        appointment_id: job.id,
        action: 'Status changed to completed'
      });
      await onRefresh();
      notice('Submitted for QC', 'The job has been completed and is ready for review.');
    } catch (e) {
      notice('Unable to complete job', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 'before') return start();
    if (step === 'service') return setStep('after');
    if (step === 'after' && !after)
      return notice('After photos required', 'Add after-service documentation before continuing.');
    if (step === 'report' && !data.report)
      return notice('Save your report', 'Save the service report before continuing.');
    if (step === 'completion') return finish();
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)][0]);
  };

  const names = {
    overview: 'Next: Scope',
    scope: 'Next: Before',
    before: 'Start service',
    service: 'Finish service',
    after: 'Next: Report',
    report: 'Continue to QC',
    completion: 'Submit for QC'
  };

  const overview = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Customer">{job.full_name || 'Customer'}</Field>
      <Field label="Service">{job.service_type || 'Service'}</Field>
      <Field label="Service location">{job.address}</Field>
      <Field label="Schedule">
        {job.schedule_date || 'Date not set'} · {job.appointment_time || 'Time not set'}
      </Field>
      <Field label="Priority">{label(job.priority || 'standard')}</Field>
      <Field label="Current status">{label(job.status)}</Field>
      {job.manager_notes && (
        <Field label="Manager note" className="sm:col-span-2">
          {job.manager_notes}
        </Field>
      )}
      <div className="sm:col-span-2 flex gap-3">
        <Button
          icon={Navigation}
          onClick={() =>
            job.address &&
            window.open(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`,
              '_blank'
            )
          }
        >
          Navigate
        </Button>
        {job.phone && (
          <Button icon={Phone} onClick={() => (window.location.href = `tel:${job.phone}`)}>
            Call customer
          </Button>
        )}
      </div>
    </div>
  );

  const service = (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/[.06] p-4">
        <p className="text-sm font-semibold text-amber-300">● WORK IN PROGRESS</p>
        <h3 className="mt-2 text-xl font-bold text-white">
          {job.full_name || 'Customer'} · {job.service_type || 'Service'}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Started">
            {job.started_at
              ? new Date(job.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </Field>
          <Field label="Elapsed">
            <Timer value={job.started_at} />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          [before, 'Before photos'],
          [true, 'Service running'],
          [after, 'After photos'],
          [!!data.report, 'Report']
        ].map(([ok, n]) => (
          <div key={n} className="flex items-center gap-2 rounded-lg bg-white/[.035] px-2.5 py-2 text-slate-300">
            {ok ? <CheckCircle2 size={14} className="text-amber-300" /> : <Circle size={14} className="text-slate-600" />}
            {n}
          </div>
        ))}
      </div>
    </div>
  );

  const completion = (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold text-white">Job readiness</h3>
      <p className="mt-1 text-sm text-slate-400">Check the evidence required before submitting this job for QC.</p>
      <div className="mt-5 space-y-2">
        {[
          [true, 'Service performed'],
          [before, 'Before photos'],
          [after, 'After photos'],
          [!!data.report, 'Service report'],
          [!!data.qc, 'QC review']
        ].map(([ok, n]) => (
          <div
            key={n}
            className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3.5 text-sm text-slate-200"
          >
            {ok ? <CheckCircle2 size={18} className="text-amber-300" /> : <Circle size={18} className="text-slate-600" />}
            {n}
            {n === 'QC review' && !ok && <span className="ml-auto text-xs text-slate-500">Pending</span>}
          </div>
        ))}
      </div>
      {(!after || !data.report) && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-sm text-amber-100">
          <AlertTriangle size={17} className="shrink-0 text-amber-300" />
          Missing: {['after photos', 'service report'].filter((_, i) => (!after && i === 0) || (!data.report && i === 1)).join(' and ')}.
        </div>
      )}
    </div>
  );

  const content = {
    overview,
    scope: <Scope job={job} data={data} />,
    before: <Photos job={job} photos={data.photos} type="before" reload={reload} notice={notice} />,
    service,
    after: <Photos job={job} photos={data.photos} type="after" reload={reload} notice={notice} />,
    report: <Report job={job} report={data.report} reload={reload} notice={notice} />,
    completion
  }[step];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[.09] bg-[#0a0f1e] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/[.07] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-300">Selected job</p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {job.service_type || 'Service'}{' '}
            <span className="font-medium text-slate-400">· {job.full_name || 'Customer'}</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/[.07] px-4 py-3">
        {STEPS.map(([key, name], i) => (
          <button
            key={key}
            onClick={() => setStep(key)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
              step === key
                ? 'bg-amber-400 text-[#080d18]'
                : i < index
                ? 'bg-amber-400/10 text-amber-200'
                : 'text-slate-500 hover:bg-white/[.04]'
            }`}
          >
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span className="hidden sm:inline">{name}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading job workspace…</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[.07] px-5 py-4">
        <Button
          icon={ArrowLeft}
          onClick={index ? () => setStep(STEPS[index - 1][0]) : onClose}
        >
          {index ? 'Back' : 'Close'}
        </Button>
        <Button
          primary
          disabled={loading || saving}
          icon={step === 'before' ? Play : ArrowRight}
          onClick={next}
        >
          {saving ? 'Saving…' : names[step]}
        </Button>
      </div>
    </div>
  );
}

function JobList({ jobs, tab, onSelect }) {
  if (!jobs.length)
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
        No {tab} jobs.
      </div>
    );
  return (
    <div className="grid h-full content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map(j => (
        <button
          key={j.id}
          onClick={() => onSelect(j)}
          className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-left transition hover:border-amber-400/35 hover:bg-white/[.045]"
        >
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-semibold text-white">{j.service_type || 'Service'}</p>
              <p className="mt-1 truncate text-sm text-slate-300">{j.full_name || 'Customer'}</p>
            </div>
            <ChevronRight size={17} className="shrink-0 text-amber-300" />
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-slate-400">
            <p className="flex gap-1.5">
              <MapPin size={13} />
              {j.address || 'No address'}
            </p>
            <p className="flex gap-1.5">
              <Clock size={13} />
              {j.appointment_time || 'Time not set'} · {label(j.status)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function DeploymentsView({ tasks = [], onRefresh, technicianName }) {
  const [tab, setTab] = useState('active');
  const [selected, setSelected] = useState(null);
  const [toasts, setToasts] = useState([]);

  const notice = useCallback((title, body) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(x => [...x, { id, title, body }]);
    setTimeout(() => setToasts(x => x.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const c = supabase
      .channel('technician-deployments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, p => {
        if (p.eventType === 'INSERT') notice('New job assigned', p.new?.full_name || p.new?.service_type);
        onRefresh?.();
      })
      .subscribe();
    return () => supabase.removeChannel(c);
  }, [notice, onRefresh]);

  useEffect(() => {
    if (selected) {
      const fresh = tasks.find(t => t.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [tasks, selected]);

  const groups = useMemo(
    () => ({
      active: tasks.filter(j => j.status === 'in_progress'),
      upcoming: tasks.filter(j => ['assigned', 'pending'].includes(j.status)),
      completed: tasks.filter(j => j.status === 'completed' && today(j.completed_at || j.schedule_date)),
      history: tasks.filter(j => j.status === 'completed' && !today(j.completed_at || j.schedule_date))
    }),
    [tasks]
  );

  const done = groups.completed.length;
  const total = done + groups.active.length + groups.upcoming.length;

  return (
    <div className="h-[calc(100vh-9.5rem)] min-h-[560px] overflow-hidden md:h-[calc(100vh-8.5rem)]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-300">
              Technician workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              My Jobs{technicianName ? ` · ${technicianName}` : ''}
            </h1>
          </div>
          <div className="rounded-xl border border-white/[.08] bg-white/[.03] px-3.5 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-100">
              {done} / {total} completed{' '}
              <span className="ml-1 text-amber-300">{total ? Math.round((done / total) * 100) : 0}%</span>
            </p>
          </div>
        </div>
        {selected ? (
          <Workspace
            job={selected}
            onClose={() => setSelected(null)}
            onRefresh={onRefresh}
            notice={notice}
          />
        ) : (
          <>
            <div className="mb-4 flex shrink-0 gap-2 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize ${
                    tab === t
                      ? 'bg-amber-400 text-[#080d18]'
                      : 'border border-white/10 bg-white/[.03] text-slate-400 hover:text-white'
                  }`}
                >
                  {t} <span className="ml-1 opacity-70">{groups[t].length}</span>
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
                  <JobList jobs={groups[tab]} tab={tab} onSelect={setSelected} />
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
      <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm space-y-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="rounded-xl border border-white/10 bg-[#0a0f1e]/95 p-4 shadow-xl"
            >
              <div className="flex gap-3">
                <CheckCircle2 size={18} className="shrink-0 text-amber-300" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t.body}</p>
                </div>
                <button onClick={() => setToasts(x => x.filter(v => v.id !== t.id))}>
                  <X size={15} className="text-slate-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}