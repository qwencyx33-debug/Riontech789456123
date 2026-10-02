import React, { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion.*` is used as a JSX namespace.
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Banknote, CheckCircle2,
  Info, Loader2, MapPin, Package,
  Upload, Wallet, X
} from 'lucide-react';

const places = {
  'NCR (Metro Manila)': { 
    'Quezon City': ['Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Payatas', 'Bagong Silangan'], 
    Manila: ['Sampaloc', 'Ermita', 'Malate', 'Binondo', 'Quiapo'], 
    Caloocan: ['Bagong Barrio', 'Monumento', 'Camarin'] 
  },
  'Region III (Central Luzon)': { 
    Pampanga: ['Angeles City', 'San Fernando', 'Mabalacat'], 
    Bulacan: ['Malolos', 'Meycauayan', 'San Jose del Monte'], 
    Zambales: ['Olongapo', 'Subic', 'Iba'] 
  },
  'Region IV-A (CALABARZON)': { 
    Cavite: ['Tagaytay', 'Dasmariñas', 'Bacoor', 'Imus'], 
    Laguna: ['Sta. Rosa', 'Calamba', 'Biñan'], 
    Batangas: ['Batangas City', 'Lipa', 'Tanauan'] 
  },
  'CAR (Cordillera)': { 
    Benguet: ['Baguio City', 'La Trinidad', 'Itogon'], 
    Ifugao: ['Banaue', 'Lagawe'] 
  },
};

const groups = { 
  Morning: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM'], 
  Afternoon: ['12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'], 
  Evening: ['05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'] 
};
const timeSlots = Object.values(groups).flat();
const newFormRowId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const normalizeTime = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return String(value || '').trim().toUpperCase();
  let hour = Number(match[1]);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();
  if (period) hour = (hour % 12) + (period === 'PM' ? 12 : 0);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${minutes} ${suffix}`;
};

const input = 'w-full rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm text-white outline-none transition focus:border-[#F5C518]/60 placeholder:text-slate-600 disabled:opacity-40';
const shell = 'rounded-[1.75rem] border border-white/[.08] bg-[#080E1C] p-6 md:p-8 shadow-2xl shadow-black/10';

const getPackageItems = (packageItems) => {
  let source = packageItems;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { return []; }
  }
  if (!Array.isArray(source)) {
    if (Array.isArray(source?.items)) source = source.items;
    else if (Array.isArray(source?.package_items)) source = source.package_items;
    else if (source && typeof source === 'object' && (source.name || source.item_name || source.title)) source = [source];
    else return [];
  }
  return source.map((item) => {
    if (typeof item === 'string') return { name: item.trim(), quantity: null, description: '' };
    if (!item || typeof item !== 'object') return null;
    const quantity = Number(item.quantity);
    return {
      name: String(item.name || item.item_name || item.title || '').trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      description: String(item.description || '').trim(),
    };
  }).filter((item) => item?.name);
};

const Field = ({ label, children }) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-slate-300">{label}</span>
    {children}
  </label>
);

const Nav = ({ back, next, disabled, label = 'Continue' }) => (
  <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/[.07] pt-5 sm:flex-row sm:justify-between">
    <button 
      type="button" 
      onClick={back} 
      className="rounded-2xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/[.05]"
    >
      <span className="flex items-center justify-center gap-2">
        <ArrowLeft size={16} />Back
      </span>
    </button>
    <button 
      type="button" 
      disabled={disabled} 
      onClick={next} 
      className="rounded-2xl bg-[#F5C518] px-7 py-3.5 text-sm font-black text-[#0A1120] hover:bg-[#FFD43B] disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span className="flex items-center justify-center gap-2">
        {label}<ArrowRight size={16} />
      </span>
    </button>
  </div>
);

const AreaEditor = ({ formData, set, selectedService, onContinue }) => {
  const areas = formData.areas || [];
  const items = formData.items || [];
  const update = (collection, index, changes) => set({ [collection]: (formData[collection] || []).map((entry, i) => i === index ? { ...entry, ...changes } : entry) });
  const remove = (collection, index) => set({ [collection]: (formData[collection] || []).filter((_, i) => i !== index) });
  const addArea = () => set({ areas: [...areas, { id: newFormRowId(), name: '', size: '', unit: 'sqm', quantity: 1, notes: '' }] });
  const addItem = () => set({ items: [...items, { id: newFormRowId(), name: '', description: '', quantity: 1, comment: '' }] });
  const project = formData.project_details || {};
  const updateProject = (field, value) => set({ project_details: { ...project, [field]: value } });
  const isEquipmentService = /cctv|camera|access control|alarm|fire|security system/i.test(`${selectedService?.title || ''} ${selectedService?.service_categories?.name || ''}`);
  const filledAreas = areas.filter((area) => area.name?.trim());
  const overviewValues = [
    project.property_size && [`${project.property_size} ${project.property_size_unit || 'sqm'}`, 'Property size'],
    project.floor_count && [project.floor_count, 'Floors'],
    project.room_count && [project.room_count, 'Rooms'],
  ].filter(Boolean);

  return <div className="mt-7 space-y-8">
    <section className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5 md:p-6">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#F5C518]">Property overview</p><p className="mt-1 text-sm text-slate-400">Share only what helps our team prepare.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Property type"><select value={project.property_type || ''} onChange={(event) => updateProject('property_type', event.target.value)} className={input}><option value="">Select property type</option>{['House', 'Apartment', 'Office', 'Commercial', 'Other'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <div className="grid grid-cols-[1fr_110px] gap-3"><Field label="Property size"><input type="number" min="1" value={project.property_size || ''} onChange={(event) => updateProject('property_size', event.target.value)} className={input} placeholder="e.g. 120" /></Field><Field label="Unit"><select value={project.property_size_unit || 'sqm'} onChange={(event) => updateProject('property_size_unit', event.target.value)} className={input}><option value="sqm">sqm</option><option value="sq ft">sq ft</option></select></Field></div>
        <Field label="Number of floors"><input type="number" min="1" step="1" value={project.floor_count || ''} onChange={(event) => updateProject('floor_count', event.target.value)} className={input} placeholder="Optional" /></Field>
        <Field label="Number of rooms"><input type="number" min="1" step="1" value={project.room_count || ''} onChange={(event) => updateProject('room_count', event.target.value)} className={input} placeholder="Optional" /></Field>
      </div>
      {overviewValues.length > 0 && <div className="mt-5 rounded-xl border border-[#F5C518]/15 bg-[#F5C518]/[.04] p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#F5C518]">Project overview</p><div className="mt-3 grid grid-cols-3 gap-3">{overviewValues.map(([value, label]) => <div key={label}><p className="text-lg font-black text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div></div>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Site notes"><textarea rows="2" value={project.site_notes || ''} onChange={(event) => updateProject('site_notes', event.target.value)} className={`${input} resize-y`} placeholder="Optional details about the property" /></Field><Field label="Customer requirements"><textarea rows="2" value={project.customer_requirements || ''} onChange={(event) => updateProject('customer_requirements', event.target.value)} className={`${input} resize-y`} placeholder="What should our team know?" /></Field><Field label="Additional comments"><textarea rows="2" value={project.customer_comments || ''} onChange={(event) => updateProject('customer_comments', event.target.value)} className={`${input} resize-y`} placeholder="Optional comments" /></Field></div>
    </section>

    <section>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-white">Areas / rooms</h2><p className="mt-1 text-sm text-slate-500">Optional details help us understand the work.</p></div><button type="button" onClick={addArea} className="rounded-xl border border-[#F5C518]/35 px-4 py-2 text-sm font-semibold text-[#F5C518] hover:bg-[#F5C518]/10">+ Add area</button></div>
      <div className="mt-4 space-y-3"><AnimatePresence initial={false}>{areas.map((area, index) => <motion.div key={area.id || index} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-white">Area {String(index + 1).padStart(2, '0')}</h3><button type="button" onClick={() => remove('areas', index)} className="text-sm font-semibold text-slate-400 hover:text-red-300">Remove</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Room / area"><input value={area.name} onChange={event => update('areas', index, { name: event.target.value })} className={input} placeholder="e.g. Living room" /></Field><div className="grid grid-cols-[1fr_110px] gap-3"><Field label="Size"><input type="number" min="1" value={area.size} onChange={event => update('areas', index, { size: event.target.value })} className={input} placeholder="Optional" /></Field><Field label="Unit"><select value={area.unit || 'sqm'} onChange={event => update('areas', index, { unit: event.target.value })} className={input}><option value="sqm">sqm</option><option value="sq ft">sq ft</option></select></Field></div><Field label="Quantity"><input type="number" min="1" value={area.quantity || 1} onChange={event => update('areas', index, { quantity: Math.max(1, Number(event.target.value) || 1) })} className={input} /></Field><Field label="Notes"><input value={area.notes || ''} onChange={event => update('areas', index, { notes: event.target.value })} className={input} placeholder="Optional details" /></Field></div></motion.div>)}</AnimatePresence></div>
      {filledAreas.length > 0 && <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4"><p className="text-sm font-bold text-white">{filledAreas.length} {filledAreas.length === 1 ? 'area' : 'areas'} added</p><div className="mt-2 space-y-1">{filledAreas.map((area, index) => <p key={`${area.id || index}-summary`} className="text-sm text-slate-400">{area.name}{area.size ? ` — ${area.size} ${area.unit || 'sqm'}` : ''}{Number(area.quantity) > 1 ? ` · Qty ${area.quantity}` : ''}</p>)}</div></div>}
    </section>

    <section className="border-t border-white/[.07] pt-6">
      <h2 className="text-lg font-bold text-white">{isEquipmentService ? 'Equipment / system requirements' : 'Additional items or requirements'}</h2>
      <p className="mt-1 text-sm text-slate-500">Would you like to add equipment or additional items?</p>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" aria-pressed={formData.include_items === true} onClick={() => set({ include_items: true })} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${formData.include_items ? 'border-[#F5C518]/50 bg-[#F5C518]/10 text-[#F5C518]' : 'border-white/10 text-slate-300 hover:border-white/20'}`}>Yes, add items</button><button type="button" aria-pressed={formData.include_items !== true} onClick={() => { set({ include_items: false, items: [] }); onContinue(); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-white/20">No, continue</button></div>
      {formData.include_items && <div className="mt-5"><div className="space-y-3"><AnimatePresence initial={false}>{items.map((item, index) => <motion.div key={item.id || index} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-white">Item {String(index + 1).padStart(2, '0')}</h3><button type="button" onClick={() => remove('items', index)} className="text-sm font-semibold text-slate-400 hover:text-red-300">Remove</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Item name"><input value={item.name} onChange={event => update('items', index, { name: event.target.value })} className={input} placeholder="Item or equipment" /></Field><Field label="Quantity"><input type="number" min="1" value={item.quantity || 1} onChange={event => update('items', index, { quantity: Math.max(1, Number(event.target.value) || 1) })} className={input} /></Field><Field label="Description"><input value={item.description || ''} onChange={event => update('items', index, { description: event.target.value })} className={input} placeholder="Optional details" /></Field><Field label="Customer request"><input value={item.comment || ''} onChange={event => update('items', index, { comment: event.target.value })} className={input} placeholder="Optional preference" /></Field></div></motion.div>)}</AnimatePresence></div><button type="button" onClick={addItem} className="mt-4 rounded-xl border border-[#F5C518]/35 px-4 py-2.5 text-sm font-semibold text-[#F5C518] hover:bg-[#F5C518]/10">+ Add another item</button></div>}
      {formData.include_items && <button type="button" onClick={onContinue} className="mt-6 rounded-2xl bg-[#F5C518] px-6 py-3.5 text-sm font-black text-[#0A1120] hover:bg-[#FFD43B]">Continue to location <ArrowRight size={16} className="ml-2 inline" /></button>}
    </section>
  </div>;
};

function ServiceFormUI({ 
  formData, 
  setFormData, 
  selectedService, 
  handlePaymentTypeChange, 
  handleReceiptUpload, 
  uploadingReceipt, 
  getDownpaymentAmount, 
  onBack, 
  onContinue, 
  step, 
  onStepChange, 
  bookedAppointmentsByDate = {},
  availabilityLoading = false,
  availabilityError = false,
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selectedDate = formData.date ? new Date(`${formData.date}T00:00:00`) : new Date();
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });
  const [dragging, setDragging] = useState(false);

  const region = formData.location_region || '';
  const city = formData.location_city || '';
  const barangay = formData.location_barangay || '';
  const street = formData.location_street || '';
  const receipt = useRef(null);
  const set = data => setFormData(previous => ({ ...previous, ...data }));

  useEffect(() => {
    const address = [street, barangay, city, region].filter(Boolean).join(', ');
    if (!address || address === formData.appointment_address) return;
    setFormData(previous => ({
      ...previous,
      appointment_address: address,
    }));
  }, [region, city, barangay, street, formData.appointment_address, setFormData]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthDayCount = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: monthStart.getDay() + monthDayCount }, (_, index) =>
    index < monthStart.getDay() ? null : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - monthStart.getDay() + 1)
  );
  const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const occupiedSlots = new Set((bookedAppointmentsByDate[formData.date] || []).map(normalizeTime));
  const referenceNumber = String(formData.reference_number || '');
  const referenceNumberError = referenceNumber && !/^\d+$/.test(referenceNumber)
    ? 'Numbers only. Letters and symbols are not allowed.'
    : referenceNumber.length !== 11
      ? `Enter exactly 11 digits (${referenceNumber.length}/11).`
      : '';
  const referenceNumberValid = /^\d{11}$/.test(referenceNumber);
  const selectedDateLabel = formData.date
    ? new Date(`${formData.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const previousMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  const previousMonthDisabled = previousMonth < new Date(today.getFullYear(), today.getMonth(), 1);

  const total = Number(formData.price || 0);
  const due = Number(formData.actual_paid_amount || 0);
  const packageItems = getPackageItems(selectedService?.package_items);
  const panel = { initial: { opacity: 0, x: 22 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -22 }, transition: { duration: .25 } };
  const uploadDrop = files => files?.[0] && handleReceiptUpload({ target: { files } });

  return (
    <AnimatePresence mode="wait">
      {step === 2 && (
        <motion.section key="details" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 2 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Service details</h1>
          <p className="mt-2 text-sm text-slate-400">Tell us a little about the work you need.</p>
          
          {selectedService && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.03] md:flex">
              <div className="h-40 bg-white/[.04] md:h-auto md:w-52">
                {selectedService.image_url ? (
                  <img src={selectedService.image_url} alt={selectedService.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 p-5">
                <p className="text-sm text-[#F5C518]">{selectedService.service_categories?.name || 'Service'}</p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-xl font-black text-white">{selectedService.title}</h2>
                  <strong className="text-xl text-white">₱{total.toLocaleString()}</strong>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {selectedService.duration || 'Duration to be confirmed'} · {selectedService.is_percentage_downpayment ? selectedService.downpayment_amount + '% downpayment' : '₱' + Number(selectedService.downpayment_amount || 0).toLocaleString() + ' downpayment'}
                </p>
              </div>
            </div>
          )}

          {packageItems.length > 0 && (
            <section className="mt-6 rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/[.05] p-5">
              <h2 className="text-base font-bold text-white">Included in this service</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {packageItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex gap-2.5 rounded-xl bg-black/10 px-3 py-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#F5C518]" />
                    <div className="min-w-0"><p className="text-sm font-semibold text-slate-200">{item.name}{item.quantity ? ` × ${item.quantity}` : ''}</p>{item.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.description}</p>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Nav back={onBack} next={() => onStepChange(3)} />
        </motion.section>
      )}

      {step === 3 && (
        <motion.section key="areas" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 3 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Tell us about your space</h1>
          {!formData.project_details_enabled ? <>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">A few project details can help our team prepare for your service. You can skip this if they are not needed.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => set({ project_details_enabled: true })} className="rounded-2xl border border-[#F5C518]/35 bg-[#F5C518]/[.06] p-5 text-left transition hover:border-[#F5C518]/60 hover:bg-[#F5C518]/[.1]"><span className="block text-sm font-black text-[#F5C518]">Add project details</span><span className="mt-1 block text-xs text-slate-400">Property overview, areas, and optional items</span></button>
              <button type="button" onClick={() => onStepChange(4)} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-left transition hover:border-white/20"><span className="block text-sm font-black text-white">Skip for now</span><span className="mt-1 block text-xs text-slate-400">Continue directly to the service location</span></button>
            </div>
            <Nav back={() => onStepChange(2)} next={() => onStepChange(4)} />
          </> : <>
            <p className="mt-2 text-sm text-slate-400">Share any details that will help our team understand the work.</p>
            <AreaEditor formData={formData} set={set} selectedService={selectedService} onContinue={() => onStepChange(4)} />
            <Nav back={() => onStepChange(2)} next={() => onStepChange(4)} />
          </>}
        </motion.section>
      )}

      {step === 4 && (
        <motion.section key="location" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 4 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Where is the service needed?</h1>
          <p className="mt-2 text-sm text-slate-400">Enter the location where our team will provide the service.</p>
          
          <div className="mt-7"><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#F5C518]">01 — Area</p><div className="grid gap-5 md:grid-cols-3">
            <Field label="Region">
              <select value={region} onChange={e => set({ location_region: e.target.value, location_city: '', location_barangay: '' })} className={input}>
                <option value="">Select region</option>
                {Object.keys(places).map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="City / Province">
              <select disabled={!region} value={city} onChange={e => set({ location_city: e.target.value, location_barangay: '' })} className={input}>
                <option value="">Select city</option>
                {region && Object.keys(places[region]).map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Barangay / Area">
              <select disabled={!city} value={barangay} onChange={e => set({ location_barangay: e.target.value })} className={input}>
                <option value="">Select barangay</option>
                {city && places[region][city].map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
          </div></div>

          <div className="mt-6"><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#F5C518]">02 — Exact location</p>
            <Field label="Street / complete address">
              <input value={street} onChange={e => set({ location_street: e.target.value })} className={input} placeholder="House number, street, landmark" />
            </Field>
          </div>

          <div className="mt-6"><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#F5C518]">03 — Access information</p>
            <Field label="Special instructions">
              <textarea
                rows="3"
                value={formData.special_instructions || ''}
                onChange={e => set({ special_instructions: e.target.value })}
                className={input + ' resize-none'}
                placeholder="Add any instructions our team should know..."
              />
              <span className="block text-xs text-slate-500">Optional — include access instructions, landmarks, parking information, or other requests.</span>
            </Field>
          </div>

          {region && city && barangay && street.trim() && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/[.05] p-4">
              <MapPin className="shrink-0 text-[#F5C518]" size={18} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#F5C518]">Service location</p>
                <p className="mt-1 text-sm text-slate-400">{formData.appointment_address}</p>
              </div>
            </div>
          )}

          <Nav back={() => onStepChange(3)} next={() => onStepChange(5)} disabled={!(region && city && barangay && street.trim())} />
        </motion.section>
      )}

      {step === 5 && (
        <motion.section key="schedule" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 5 of 7</p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white md:text-3xl">When should we come?</h1>
          <p className="mt-2 text-sm text-slate-400">Choose a date and an available time.</p>
          
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
            <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5" aria-label="Appointment calendar">
              <div className="flex items-center justify-between gap-3 border-b border-white/[.07] pb-4">
                <button type="button" aria-label="Previous month" disabled={previousMonthDisabled} onClick={() => setCalendarMonth(previousMonth)} className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:border-[#F5C518]/40 hover:text-[#F5C518] disabled:cursor-not-allowed disabled:opacity-30"><ArrowLeft size={16} /></button>
                <h2 className="text-base font-black text-white sm:text-lg">{monthLabel}</h2>
                <button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:border-[#F5C518]/40 hover:text-[#F5C518]"><ArrowRight size={16} /></button>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1 text-center">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{day}</span>)}</div>
              <AnimatePresence mode="wait" initial={false}><motion.div key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .16 }} className="grid grid-cols-7 gap-1">
                {calendarCells.map((date, index) => {
                  if (!date) return <span key={`blank-${index}`} />;
                  const key = dateKey(date);
                  const past = date < today;
                  const full = timeSlots.every((slot) => (bookedAppointmentsByDate[key] || []).map(normalizeTime).includes(slot));
                  const selected = formData.date === key;
                  const disabled = past || full;
                  const stateLabel = past ? 'Past date' : full ? 'Fully booked' : selected ? 'Selected' : 'Available';
                  return <button key={key} type="button" disabled={disabled} aria-label={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${stateLabel}`} aria-pressed={selected} onClick={() => set({ date: key, time: '' })} className={`relative min-h-11 rounded-xl border text-sm font-bold transition sm:min-h-12 ${selected ? 'border-[#F5C518] bg-[#F5C518] text-[#0A1120]' : full ? 'cursor-not-allowed border-white/[.04] bg-white/[.015] text-slate-700 line-through' : past ? 'cursor-not-allowed border-transparent text-slate-700' : 'border-transparent text-slate-300 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/[.06]'}`}><span>{date.getDate()}</span>{!past && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selected ? 'bg-[#0A1120]' : full ? 'bg-slate-700' : 'bg-[#F5C518]/70'}`} />}</button>;
                })}
              </motion.div></AnimatePresence>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[.07] pt-4 text-[11px] text-slate-400"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#F5C518]" />Available</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-slate-700" />Fully booked</span><span>Past dates cannot be selected</span></div>
              {availabilityLoading && <p className="mt-3 text-xs text-slate-500">Checking current appointment availability…</p>}
              {availabilityError && <p className="mt-3 text-xs text-amber-300">Availability could not be refreshed. We will check again before you submit.</p>}
            </section>

            <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5">
              <h2 className="text-base font-black text-white">Available times</h2>
              <p className="mt-1 text-sm text-slate-500">{formData.date ? 'Choose an open time for your selected date.' : 'Select a date to view its available times.'}</p>
              <div className="mt-5 space-y-5">{Object.entries(groups).map(([group, slots]) => <div key={group}><h3 className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{group}</h3><div className="mt-2 grid grid-cols-2 gap-2">{slots.map((slot) => { const unavailable = occupiedSlots.has(normalizeTime(slot)); const selected = formData.time === slot; return <button key={slot} type="button" disabled={!formData.date || unavailable} aria-pressed={selected} onClick={() => set({ time: slot })} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${selected ? 'border-[#F5C518] bg-[#F5C518] text-[#0A1120]' : unavailable ? 'cursor-not-allowed border-white/[.04] bg-white/[.015] text-slate-600 line-through' : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-[#F5C518]/40'}`}>{slot}{unavailable && <span className="ml-1 text-[10px] no-underline">Booked</span>}</button>; })}</div></div>)}</div>
            </section>
          </div>

          {formData.date && formData.time && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/[.05] p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#F5C518]">Your appointment</p><p className="mt-2 text-lg font-black text-white">{selectedDateLabel}</p><p className="mt-1 text-sm font-semibold text-slate-300">{formData.time} <span className="font-normal text-slate-500">· Appointment time</span></p></motion.div>}

          <Nav back={() => onStepChange(4)} next={() => onStepChange(6)} disabled={!formData.date || !formData.time} />
        </motion.section>
      )}

      {step === 6 && (
        <motion.section key="payment" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 6 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">How would you like to pay?</h1>
          <p className="mt-2 text-sm text-slate-400">Choose a payment method and attach your proof of payment.</p>
          
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button 
              type="button" 
              onClick={() => set({ payment_method: 'GCASH' })} 
              className={'rounded-2xl border p-5 text-left ' + (formData.payment_method === 'GCASH' ? 'border-[#F5C518]/60 bg-[#F5C518]/10' : 'border-white/10 bg-white/[.03]')}
            >
              <Wallet className="text-[#F5C518]" />
              <h2 className="mt-3 font-bold text-white">GCash</h2>
              <p className="mt-1 text-sm text-slate-500">Pay securely online.</p>
            </button>
            <button 
              type="button" 
              onClick={() => set({ payment_method: 'COD', payment_type: 'downpayment' })} 
              className={'rounded-2xl border p-5 text-left ' + (formData.payment_method === 'COD' ? 'border-[#F5C518]/60 bg-[#F5C518]/10' : 'border-white/10 bg-white/[.03]')}
            >
              <Banknote className="text-[#F5C518]" />
              <h2 className="mt-3 font-bold text-white">Cash on delivery</h2>
              <p className="mt-1 text-sm text-slate-500">Pay the balance when we arrive.</p>
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-[#F5C518]/15 bg-[#F5C518]/[.05] p-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Service total</p>
              <strong className="text-lg text-white">₱{total.toLocaleString()}</strong>
            </div>
            <div>
              <p className="text-sm text-slate-500">Downpayment</p>
              <strong className="text-lg text-white">₱{Number(getDownpaymentAmount()).toLocaleString()}</strong>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5C518]">Due today</p>
              <strong className="text-2xl text-[#F5C518]">₱{due.toLocaleString()}</strong>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <h2 className="text-base font-bold text-white">Payment amount</h2>
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => handlePaymentTypeChange('downpayment')} 
                  className={'flex-1 rounded-xl border px-3 py-3 text-sm font-semibold ' + (formData.payment_type === 'downpayment' ? 'border-[#F5C518] bg-[#F5C518] text-[#0A1120]' : 'border-white/10 text-slate-400')}
                >
                  Downpayment
                </button>
                <button 
                  disabled={formData.payment_method === 'COD'} 
                  onClick={() => handlePaymentTypeChange('full')} 
                  className={'flex-1 rounded-xl border px-3 py-3 text-sm font-semibold disabled:opacity-30 ' + (formData.payment_type === 'full' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-white/10 text-slate-400')}
                >
                  Full payment
                </button>
              </div>
            </div>
            <Field label="GCash reference number">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{11}"
                autoComplete="off"
                spellCheck="false"
                value={referenceNumber}
                onChange={event => set({ reference_number: event.target.value })}
                className={`${input} ${referenceNumberError ? 'border-amber-400/50 focus:border-amber-400' : ''}`}
                placeholder="Enter 11-digit reference number"
                aria-invalid={Boolean(referenceNumberError)}
                aria-describedby="gcash-reference-warning"
              />
              <p id="gcash-reference-warning" aria-live="polite" className={`mt-1 text-xs ${referenceNumberError ? 'text-amber-300' : 'text-slate-500'}`}>
                {referenceNumberError || 'Use exactly 11 numbers.'}
              </p>
            </Field>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-bold text-white">Upload receipt</h2>
            {formData.receipt_url ? (
              <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#F5C518]/25">
                <img src={formData.receipt_url} alt="Payment receipt" className="h-40 w-full object-cover" />
                <button type="button" onClick={() => set({ receipt_url: '' })} className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => receipt.current?.click()} 
                onDragOver={e => { e.preventDefault(); setDragging(true); }} 
                onDragLeave={() => setDragging(false)} 
                onDrop={e => { e.preventDefault(); setDragging(false); uploadDrop(e.dataTransfer.files); }} 
                className={'mt-3 flex w-full flex-col items-center rounded-2xl border-2 border-dashed p-6 text-sm transition ' + (dragging ? 'border-[#F5C518] bg-[#F5C518]/10' : 'border-white/10 text-slate-400 hover:border-[#F5C518]/40')}
              >
                {uploadingReceipt ? <Loader2 className="animate-spin text-[#F5C518]" /> : <Upload className="text-[#F5C518]" />}
                <span className="mt-2">{uploadingReceipt ? 'Uploading receipt…' : 'Upload your payment receipt'}</span>
                <input ref={receipt} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
              </button>
            )}
          </div>

          {formData.payment_method === 'COD' && (
            <p className="mt-4 flex gap-2 text-sm text-[#F5C518]">
              <Info size={17} />A GCash downpayment is required to confirm a COD booking.
            </p>
          )}

          <Nav 
            back={() => onStepChange(5)} 
            next={onContinue} 
            disabled={uploadingReceipt || !formData.payment_method || !referenceNumberValid || !formData.receipt_url}
            label="Review request" 
          />
        </motion.section>
      )}
    </AnimatePresence>
  );
}

export default ServiceFormUI;
