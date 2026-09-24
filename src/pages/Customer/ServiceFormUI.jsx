import React, { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion.*` is used as a JSX namespace.
import { AnimatePresence, motion } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  ArrowLeft, ArrowRight, Banknote, Calendar, CheckCircle2, 
  Info, Loader2, MapPin, Package, Plus,
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

const AreaEditor = ({ formData, set }) => {
  const areas = formData.areas || [];
  const items = formData.items || [];
  const update = (collection, index, changes) => set({ [collection]: (formData[collection] || []).map((entry, i) => i === index ? { ...entry, ...changes } : entry) });
  const remove = (collection, index) => set({ [collection]: (formData[collection] || []).filter((_, i) => i !== index) });
  const addArea = () => set({ areas: [...areas, { name: '', size: '', unit: 'sqm', quantity: 1, notes: '' }] });
  const addItem = () => set({ items: [...items, { name: '', description: '', quantity: 1, comment: '' }] });

  return <div className="mt-7 space-y-7">
    <section>
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-white">Areas / rooms</h2><p className="mt-1 text-sm text-slate-500">Optional, but helpful for an accurate assessment.</p></div><button type="button" onClick={addArea} className="rounded-xl border border-[#F5C518]/35 px-4 py-2 text-sm font-semibold text-[#F5C518] hover:bg-[#F5C518]/10">+ Add area</button></div>
      <div className="mt-4 space-y-4">{areas.map((area, index) => <div key={index} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-white">Area {String(index + 1).padStart(2, '0')}</h3><button type="button" onClick={() => remove('areas', index)} className="text-sm font-semibold text-red-300 hover:text-red-200">Remove</button></div><div className="grid gap-4 md:grid-cols-2"><Field label="Room / area"><input value={area.name} onChange={e => update('areas', index, { name: e.target.value })} className={input} placeholder="e.g. Living room"/></Field><div className="grid grid-cols-[1fr_110px] gap-3"><Field label="Size"><input type="number" min="0" value={area.size} onChange={e => update('areas', index, { size: e.target.value })} className={input} placeholder="25"/></Field><Field label="Unit"><select value={area.unit} onChange={e => update('areas', index, { unit: e.target.value })} className={input}><option value="sqm">sqm</option><option value="sq ft">sq ft</option></select></Field></div><Field label="Quantity"><input type="number" min="1" value={area.quantity} onChange={e => update('areas', index, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={input}/></Field><Field label="Notes"><input value={area.notes} onChange={e => update('areas', index, { notes: e.target.value })} className={input} placeholder="Add details about this area..."/></Field></div></div>)}</div>
      {!areas.length && <button type="button" onClick={addArea} className="mt-4 rounded-2xl border border-dashed border-white/15 px-5 py-4 text-sm text-slate-400 hover:border-[#F5C518]/40 hover:text-[#F5C518]">+ Add another area</button>}
    </section>
    <section className="border-t border-white/[.07] pt-6">
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-white">Equipment / items</h2><p className="mt-1 text-sm text-slate-500">Optional items or equipment preferences.</p></div><button type="button" onClick={addItem} className="rounded-xl border border-[#F5C518]/35 px-4 py-2 text-sm font-semibold text-[#F5C518] hover:bg-[#F5C518]/10">+ Add item</button></div>
      <div className="mt-4 space-y-4">{items.map((item, index) => <div key={index} className="rounded-2xl border border-white/[.08] bg-white/[.03] p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-white">Item {String(index + 1).padStart(2, '0')}</h3><button type="button" onClick={() => remove('items', index)} className="text-sm font-semibold text-red-300 hover:text-red-200">Remove</button></div><div className="grid gap-4 md:grid-cols-2"><Field label="Item name"><input value={item.name} onChange={e => update('items', index, { name: e.target.value })} className={input} placeholder="e.g. CCTV camera"/></Field><Field label="Quantity"><input type="number" min="1" value={item.quantity} onChange={e => update('items', index, { quantity: Math.max(1, Number(e.target.value) || 1) })} className={input}/></Field><Field label="Description"><input value={item.description} onChange={e => update('items', index, { description: e.target.value })} className={input} placeholder="Optional details"/></Field><Field label="Customer comment"><input value={item.comment} onChange={e => update('items', index, { comment: e.target.value })} className={input} placeholder="Your preference or request"/></Field></div></div>)}</div>
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
  bookedDates = [], 
  bookedTimes = [] 
}) {
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [dragging, setDragging] = useState(false);
  
  const receipt = useRef(null);
  const set = data => setFormData(previous => ({ ...previous, ...data }));

  useEffect(() => {
    const address = [street, barangay, city, region].filter(Boolean).join(', ');
    if (!address) return;
    setFormData(previous => ({
      ...previous,
      appointment_address: address,
    }));
  }, [region, city, barangay, street, setFormData]);

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

          <div className="mt-7">
            <Field label="Tell us about the work">
              <textarea
                rows="4"
                value={formData.description}
                onChange={e => set({ description: e.target.value })}
                className={input + ' resize-none'}
                placeholder="Describe what you need..."
              />
              <span className="block text-xs text-slate-500">Add any specific requirements or instructions to help our team prepare.</span>
            </Field>
          </div>

          <Nav back={onBack} next={() => onStepChange(3)} disabled={!formData.description?.trim()} />
        </motion.section>
      )}

      {step === 3 && (
        <motion.section key="areas" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 3 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Tell us about the space</h1>
          <p className="mt-2 text-sm text-slate-400">Add the rooms or areas that need service so our team can better understand the work.</p>
          <AreaEditor formData={formData} set={set} />
          <Nav back={() => onStepChange(2)} next={() => onStepChange(4)} />
        </motion.section>
      )}

      {step === 4 && (
        <motion.section key="location" {...panel} className={shell}>
          <p className="text-sm font-semibold text-[#F5C518]">Step 4 of 7</p>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Where is the service needed?</h1>
          <p className="mt-2 text-sm text-slate-400">Enter the location where our team will provide the service.</p>
          
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <Field label="Region">
              <select value={region} onChange={e => { setRegion(e.target.value); setCity(''); setBarangay(''); }} className={input}>
                <option value="">Select region</option>
                {Object.keys(places).map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="City / Province">
              <select disabled={!region} value={city} onChange={e => { setCity(e.target.value); setBarangay(''); }} className={input}>
                <option value="">Select city</option>
                {region && Object.keys(places[region]).map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Barangay / Area">
              <select disabled={!city} value={barangay} onChange={e => setBarangay(e.target.value)} className={input}>
                <option value="">Select barangay</option>
                {city && places[region][city].map(value => <option key={value}>{value}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-5">
            <Field label="Street / complete address">
              <input value={street} onChange={e => setStreet(e.target.value)} className={input} placeholder="House number, street, landmark" />
            </Field>
          </div>

          <div className="mt-5">
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

          {formData.appointment_address && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/[.05] p-4">
              <MapPin className="shrink-0 text-[#F5C518]" size={18} />
              <div>
                <p className="text-sm font-semibold text-white">Service location</p>
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
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">When should we come?</h1>
          <p className="mt-2 text-sm text-slate-400">Choose a date and an available time.</p>
          
          <div className="mt-7 max-w-md">
            <Field label="Preferred date">
              <DatePicker 
                selected={formData.date ? new Date(formData.date + 'T00:00:00') : null} 
                onChange={date => set({ date: date.toISOString().slice(0, 10), time: '' })} 
                excludeDates={bookedDates.map(date => new Date(date + 'T00:00:00'))} 
                minDate={new Date()} 
                placeholderText="Select an available date" 
                className={input} 
              />
            </Field>
          </div>

          <div className="mt-7">
            <h2 className="text-base font-bold text-white">Available times</h2>
            <p className="mt-1 text-sm text-slate-500">Unavailable times are disabled.</p>
            <div className="mt-5 space-y-5">
              {Object.entries(groups).map(([group, slots]) => (
                <div key={group}>
                  <h3 className="text-sm font-semibold text-slate-400">{group}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {slots.map(slot => { 
                      const unavailable = bookedTimes.includes(slot);
                      const selected = formData.time === slot; 
                      return (
                        <button 
                          key={slot} 
                          disabled={unavailable || !formData.date} 
                          onClick={() => set({ time: slot })} 
                          className={'rounded-xl border px-3 py-3 text-sm font-semibold transition ' + (selected ? 'border-[#F5C518] bg-[#F5C518] text-[#0A1120]' : unavailable ? 'cursor-not-allowed border-red-500/15 bg-red-500/[.04] text-slate-700 line-through' : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-[#F5C518]/40')}
                        >
                          {slot}
                        </button>
                      ); 
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              <input value={formData.reference_number} onChange={e => set({ reference_number: e.target.value })} className={input} placeholder="Enter reference number" />
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
            disabled={uploadingReceipt || !formData.payment_method || !formData.reference_number || !formData.receipt_url} 
            label="Review request" 
          />
        </motion.section>
      )}
    </AnimatePresence>
  );
}

export default ServiceFormUI;
