import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
// eslint-disable-next-line no-unused-vars -- `motion.*` is used as a JSX namespace.
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Loader2, User, Wrench, DollarSign, FileText,
  CheckCircle2, MapPin, Phone, AlertCircle, Check, Sparkles, Calendar, Clock, ClipboardList, ChevronDown, Plus, Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';

const T = {
  bg:        '#050D10',
  ink:       '#08191D',
  ink2:      '#030B0D',
  surface:   'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',
  border:    'rgba(232,176,0,0.12)',
  borderHi:  'rgba(232,176,0,0.32)',
  gold:      '#E8B000',
  goldSoft:  'rgba(232,176,0,0.10)',
  goldLine:  'rgba(232,176,0,0.22)',
  text:      '#F4F8F9',
  sub:       '#7E9CA1',
  success:   '#22C55E',
  danger:    '#EF4444',
  info:      '#3B82F6',
  warn:      '#F59E0B',
};

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending',      color: T.warn },
  { value: 'approved',    label: 'Approved',     color: T.info },
  { value: 'scheduled',   label: 'Scheduled',    color: '#8B5CF6' },
  { value: 'in_progress', label: 'In Progress',  color: '#F97316' },
  { value: 'completed',   label: 'Completed',    color: T.success },
  { value: 'cancelled',   label: 'Cancelled',    color: T.danger },
];

const PAYMENT_OPTIONS = [
  { value: 'pending',    label: 'Pending',    color: T.warn },
  { value: 'downpayment_paid', label: 'Downpayment Paid', color: T.info },
  { value: 'full_paid',  label: 'Fully Paid',  color: T.success },
  { value: 'downpaid',   label: 'Downpaid (legacy)', color: T.info },
  { value: 'paid',       label: 'Paid (legacy)', color: T.success },
  { value: 'cancelled',  label: 'Cancelled',  color: T.danger },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: T.info },
  { value: 'normal', label: 'Normal', color: T.sub },
  { value: 'high', label: 'High', color: T.warn },
  { value: 'urgent', label: 'Urgent', color: T.danger },
];

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;
const formatSchedule = (date, time) => [date, time].filter(Boolean).join(' · ') || 'Not scheduled';
const toValidNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const getItemTotal = (item) => toValidNumber(item.quantity) * toValidNumber(item.unit_price);
const getPackageItems = (packageItems) => {
  if (Array.isArray(packageItems)) return packageItems;
  if (typeof packageItems !== 'string') return [];
  try {
    const parsed = JSON.parse(packageItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const newAdditionalItem = () => ({ item_name: '', description: '', quantity: '', unit_price: '', customer_comment: '' });

const swalTheme = {
  background: T.ink2,
  color: T.text,
  confirmButtonColor: T.gold,
};

const Field = ({ label, hint, children, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.sub }}>
        {label}
      </label>
      {hint && <span style={{ fontSize: 10, color: T.sub, opacity: 0.7 }}>{hint}</span>}
    </div>
    {children}
    <AnimatePresence>
      {error && (
        <motion.span
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          style={{ fontSize: 11, color: T.danger, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <AlertCircle size={11} /> {error}
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

const DInput = ({ icon, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? T.gold : T.sub, display: 'flex', pointerEvents: 'none', zIndex: 1, transition: 'color 0.2s' }}>
          {icon}
        </div>
      )}
      <input
        style={{
          width: '100%', background: focused ? T.surfaceHi : T.surface,
          border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10,
          color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
          padding: icon ? '12px 14px 12px 40px' : '12px 14px',
          outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
          boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
        }}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
    </div>
  );
};


const DTextarea = (props) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      style={{
        width: '100%', background: focused ? T.surfaceHi : T.surface,
        border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10,
        color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
        padding: '12px 14px', outline: 'none', resize: 'vertical',
        transition: 'all 0.18s', minHeight: 86, boxSizing: 'border-box', lineHeight: 1.6,
        boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none',
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      {...props}
    />
  );
};

// Kept local to this modal so its native select has the same visual treatment
// as the other form controls without depending on an undeclared component.
const DarkSelect = ({ children, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
      style={{
        width: '100%', appearance: 'auto', background: focused ? T.surfaceHi : T.surface,
        border: `1px solid ${focused ? T.gold : T.border}`, borderRadius: 10,
        color: T.text, fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, fontWeight: 500,
        padding: '12px 14px', outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
        boxShadow: focused ? `0 0 0 3px ${T.goldSoft}` : 'none', ...props.style,
      }}
    >
      {children}
    </select>
  );
};


const PillSelector = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }} role="radiogroup">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <motion.button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(opt.value)}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '7px 14px', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.03em', borderRadius: 999,
            background: active ? `${opt.color}1F` : T.surface,
            border: `1px solid ${active ? opt.color : T.border}`,
            color: active ? opt.color : T.sub,
            cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s, color 0.18s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <motion.span
            initial={false}
            animate={{ width: active ? 12 : 0, opacity: active ? 1 : 0 }}
            style={{ overflow: 'hidden', display: 'flex' }}
          >
            <Check size={11} strokeWidth={3} />
          </motion.span>
          {opt.label}
        </motion.button>
      );
    })}
  </div>
);


const InfoChip = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
};


const Section = ({ icon, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return <div style={{ border: `1px solid ${T.border}`, borderRadius: 13, background: T.surface, overflow: 'hidden' }}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ color: T.gold, display: 'flex' }}>{icon}</span><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{title}</span><span style={{ flex: 1 }} />
      <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ color: T.sub, display: 'flex' }}><ChevronDown size={15} /></motion.span>
    </button>
    <AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0, y: -4 }} animate={{ height: 'auto', opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: -4 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}><div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div></motion.div>}</AnimatePresence>
  </div>;
};

const Detail = ({ label, value }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ padding: '11px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
      <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, color: T.text, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
};

const EditAppointmentModal = ({ appointment, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    service_type:   '',
    status:         'pending',
    payment_status: 'pending',
    price:          0,
    notes:          '',
  });
  const [dirty, setDirty] = useState(false);
  const [serviceMeta, setServiceMeta] = useState(null);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [technicianName, setTechnicianName] = useState('');
  const [errors, setErrors] = useState({});
  const [additionalItems, setAdditionalItems] = useState([]);
  const [loadedItemIds, setLoadedItemIds] = useState([]);
  const [packagePrice, setPackagePrice] = useState(0);

  useEffect(() => {
    if (appointment) {
      setForm({
        service_type:   appointment.service_type   || '',
        status:         appointment.status         || 'pending',
        payment_status: appointment.payment_status || 'pending',
        price:          appointment.price          || 0,
        details:        appointment.details        || '',
        materials_notes: appointment.materials_notes || '',
        manager_notes:  appointment.manager_notes  || '',
        priority:       appointment.priority       || 'normal',
        service_id:     appointment.service_id     || '',
        schedule_date:  appointment.schedule_date  || '',
        appointment_time: appointment.appointment_time || '',
      });
      setDirty(false);
      setErrors({});
      setAdditionalItems([]);
      setLoadedItemIds([]);
      // Keep a saved appointment's amount stable until its package is explicitly changed.
      setPackagePrice(toValidNumber(appointment.price));
    }
  }, [appointment, isOpen]);

  useEffect(() => {
    if (!isOpen || !appointment) { setServiceMeta(null); return; }
    let active = true;
    Promise.all([
      supabase.from('service_types').select('id, title, description, price, duration, requires_survey, is_archived, package_items, service_categories(name)').order('title'),
      appointment.technician_id
        ? supabase.from('profiles').select('first_name, last_name').eq('id', appointment.technician_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('appointment_items').select('*').eq('appointment_id', appointment.id).order('created_at'),
    ]).then(([servicesResult, technicianResult, itemsResult]) => {
      if (!active) return;
      const services = servicesResult.data || [];
      setServiceOptions(services);
      const selectedService = services.find((service) => service.id === appointment.service_id) || services.find((service) => service.title === appointment.service_type) || null;
      setServiceMeta(selectedService);
      const tech = technicianResult.data;
      setTechnicianName(tech ? `${tech.first_name || ''} ${tech.last_name || ''}`.trim() : '');
      const items = itemsResult.data || [];
      setAdditionalItems(items);
      setLoadedItemIds(items.map((item) => item.id));
      // Catalog pricing is applied only when an admin explicitly saves this edit;
      // merely opening the modal never changes the historical appointment record.
      setPackagePrice(selectedService ? toValidNumber(selectedService.price) : Math.max(0, toValidNumber(appointment.price) - items.reduce((sum, item) => sum + getItemTotal(item), 0)));
    });
    return () => { active = false; };
  }, [appointment, isOpen]);

  const upd = (key, val) => { setForm((f) => ({ ...f, [key]: val })); setDirty(true); };

  const selectService = (id) => {
    const service = serviceOptions.find((item) => item.id === id);
    if (!service) return;
    setServiceMeta(service);
    setForm((current) => ({ ...current, service_id: service.id, service_type: service.title }));
    setPackagePrice(toValidNumber(service.price));
    setDirty(true);
  };

  const updateAdditionalItem = (index, key, value) => {
    setAdditionalItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
    setDirty(true);
  };

  const removeAdditionalItem = (index) => {
    setAdditionalItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setDirty(true);
  };

  const addAdditionalItem = () => {
    setAdditionalItems((items) => [...items, newAdditionalItem()]);
    setDirty(true);
  };

  const additionalTotal = useMemo(() => additionalItems.reduce((sum, item) => sum + getItemTotal(item), 0), [additionalItems]);
  const finalTotal = packagePrice + additionalTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.service_id || !form.service_type?.trim()) nextErrors.service_id = 'Select a package.';
    if ((form.schedule_date && !form.appointment_time) || (!form.schedule_date && form.appointment_time)) nextErrors.schedule = 'Provide both a date and time, or leave both empty.';
    const itemsToSave = additionalItems.filter((item) => [item.item_name, item.description, item.quantity, item.unit_price, item.customer_comment]
      .some((value) => String(value ?? '').trim() !== ''));
    itemsToSave.forEach((item, index) => {
      const itemNumber = index + 1;
      if (!item.item_name?.trim()) nextErrors.additionalItems = `Additional item ${itemNumber}: item name is required.`;
      else if (String(item.quantity ?? '').trim() === '' || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) nextErrors.additionalItems = `Additional item ${itemNumber}: quantity must be greater than 0.`;
      else if (String(item.unit_price ?? '').trim() === '' || !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) nextErrors.additionalItems = `Additional item ${itemNumber}: enter a valid non-negative unit price.`;
    });
    if (!Number.isFinite(finalTotal) || finalTotal < 0) nextErrors.price = 'The final total must be a valid non-negative amount.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setErrors({});
    const priceChanged = finalTotal !== Number(appointment.price || 0);
    if (priceChanged) {
      const result = await Swal.fire({ ...swalTheme, title: 'Confirm Price Update', html: `<div style="text-align:left"><p style="color:${T.sub}">Current price</p><strong style="font-size:22px">${formatCurrency(appointment.price)}</strong><p style="color:${T.sub};margin-top:16px">New final total</p><strong style="font-size:22px;color:${T.gold}">${formatCurrency(finalTotal)}</strong><p style="color:${T.sub};font-size:12px;margin-top:16px">The final appointment price will be updated when you save.</p></div>`, showCancelButton: true, confirmButtonText: 'Confirm Price Update' });
      if (!result.isConfirmed) return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          service_type:   form.service_type,
          service_id:     form.service_id || null,
          status:         form.status,
          payment_status: form.payment_status,
          price:          finalTotal,
          details:        form.details,
          materials_notes: form.materials_notes,
          manager_notes:  form.manager_notes,
          priority:       form.priority,
          schedule_date:  form.schedule_date || null,
          appointment_time: form.appointment_time || null,
        })
        .eq('id', appointment.id);

      if (error) throw error;

      const currentItemIds = itemsToSave.map((item) => item.id).filter(Boolean);
      const removedItemIds = loadedItemIds.filter((id) => !currentItemIds.includes(id));
      const itemWrites = [
        ...itemsToSave.filter((item) => item.id).map((item) => supabase.from('appointment_items').update({
          item_name: item.item_name.trim(), description: item.description || '', quantity: Number(item.quantity),
          unit_price: Number(item.unit_price), total_price: getItemTotal(item), customer_comment: item.customer_comment || '',
        }).eq('id', item.id)),
        ...itemsToSave.filter((item) => !item.id).map((item) => supabase.from('appointment_items').insert({
          appointment_id: appointment.id, item_name: item.item_name.trim(), description: item.description || '', quantity: Number(item.quantity),
          unit_price: Number(item.unit_price), total_price: getItemTotal(item), customer_comment: item.customer_comment || '',
        })),
      ];
      if (removedItemIds.length) itemWrites.push(supabase.from('appointment_items').delete().in('id', removedItemIds));
      const itemResults = await Promise.all(itemWrites);
      const itemError = itemResults.find((result) => result.error)?.error;
      if (itemError) throw itemError;

      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, background: T.ink2, color: T.text })
        .fire({ icon: 'success', title: 'Appointment updated' });

      onUpdate();
      onClose();
    } catch (err) {
      Swal.fire({ ...swalTheme, title: 'Update Failed', text: err.message, icon: 'error' });
    }
    setLoading(false);
  };

  const handleClose = async () => {
    if (dirty) {
      const res = await Swal.fire({
        ...swalTheme,
        title: 'Discard Changes?', text: 'Unsaved changes will be lost.',
        icon: 'question', showCancelButton: true,
        confirmButtonColor: T.danger, cancelButtonColor: '#0C2B30',
        confirmButtonText: 'Discard',
      });
      if (!res.isConfirmed) return;
    }
    onClose();
  };

  const statusOptions = useMemo(() => form.status && !STATUS_OPTIONS.some((s) => s.value === form.status)
    ? [...STATUS_OPTIONS, { value: form.status, label: form.status.replace(/_/g, ' '), color: T.sub }]
    : STATUS_OPTIONS, [form.status]);
  const paymentOptions = useMemo(() => form.payment_status && !PAYMENT_OPTIONS.some((s) => s.value === form.payment_status)
    ? [...PAYMENT_OPTIONS, { value: form.payment_status, label: form.payment_status.replace(/_/g, ' '), color: T.sub }]
    : PAYMENT_OPTIONS, [form.payment_status]);
  const statusMeta = statusOptions.find((s) => s.value === form.status);

  const infoRows = useMemo(() => (appointment ? [
    { icon: <User size={12} />,   label: 'Client',  value: appointment.full_name },
    { icon: <Phone size={12} />,  label: 'Phone',   value: appointment.phone },
    { icon: <MapPin size={12} />, label: 'Address', value: appointment.address },
  ] : []), [appointment]);

  if (!isOpen || !appointment) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(3,11,13,0.82)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
        onClick={handleClose}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit appointment"
          style={{
            width: '100%', maxWidth: 600,
            background: T.ink, border: `1px solid ${T.borderHi}`,
            borderRadius: 20,
            boxShadow: '0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.2)',
            overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {}
          <div style={{ background: T.ink2, borderBottom: `1px solid ${T.border}`, padding: '22px 26px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 15% 0%, ${T.goldSoft}, transparent 55%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.goldSoft, border: `1px solid ${T.goldLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gold, flexShrink: 0 }}>
                  <Sparkles size={17} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: '0.03em', color: T.text, lineHeight: 1.1 }}>
                    Service Project Brief
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub }}>{appointment.full_name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: `${statusMeta?.color}1F`, border: `1px solid ${statusMeta?.color}55`,
                      color: statusMeta?.color, padding: '2px 9px', borderRadius: 999,
                    }}>
                      {statusMeta?.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.gold; e.currentTarget.style.borderColor = T.borderHi; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border; }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {}
          <div style={{ background: 'rgba(232,176,0,0.025)', borderBottom: `1px solid ${T.border}`, padding: '16px 26px', display: 'flex', gap: 24, flexWrap: 'wrap', flexShrink: 0 }}>
            {infoRows.map((row, i) => <InfoChip key={i} {...row} />)}
          </div>

          {}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

              <Section icon={<ClipboardList size={13} />} title="Project Overview" defaultOpen>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                  <Detail label="Customer" value={appointment.full_name || 'Not specified'} /><Detail label="Service" value={form.service_type || 'Not specified'} />
                  <Detail label="Category" value={serviceMeta?.service_categories?.name || 'Service information unavailable'} /><Detail label="Address" value={appointment.address || 'Not specified'} />
                  <Detail label="Schedule" value={formatSchedule(form.schedule_date, form.appointment_time)} /><Detail label="Status" value={statusMeta?.label || 'Not specified'} />
                  <Detail label="Priority" value={form.priority || 'Normal'} /><Detail label="Technician" value={technicianName || 'Unassigned'} /><Detail label="Final Total" value={formatCurrency(finalTotal)} />
                </div>
              </Section>

              <Section icon={<MapPin size={13} />} title="Property / Site Details">
                <Detail label="Service Address" value={appointment.address || 'Not specified'} />
                <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.55 }}>Property size, floors, rooms, and area-level details are not stored in the current appointment schema.</div>
              </Section>

              <Section icon={<Wrench size={13} />} title="Service Details">
                <Field label="Service">
                  <DarkSelect value={form.service_id} onChange={(e) => selectService(e.target.value)} aria-invalid={!!errors.service_id}>
                    <option value="">Select service</option>{serviceOptions.map((service) => <option key={service.id} value={service.id}>{service.title}{service.is_archived ? ' (archived)' : ''}</option>)}
                  </DarkSelect>
                  {errors.service_id && <span style={{ color: T.danger, fontSize: 11 }}>{errors.service_id}</span>}
                </Field>
                {serviceMeta ? <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                    <Detail label="Category" value={serviceMeta.service_categories?.name || 'Uncategorized'} /><Detail label="Estimated Duration" value={serviceMeta.duration || 'Not specified'} /><Detail label="Site Survey" value={(appointment.requires_survey ?? serviceMeta.requires_survey) ? 'Required' : 'Not required'} /><Detail label="Package Price" value={formatCurrency(packagePrice)} />
                  </div>
                  <div style={{ padding: '12px', borderRadius: 10, background: T.goldSoft, border: `1px solid ${T.goldLine}` }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: T.gold, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Included Package Items</div>
                    {getPackageItems(serviceMeta.package_items).length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {getPackageItems(serviceMeta.package_items).map((item, index) => <div key={`${item.name || 'item'}-${index}`} style={{ color: T.text, fontSize: 12, lineHeight: 1.45 }}><strong>{item.name || 'Unnamed item'} × {toValidNumber(item.quantity) || 1}</strong>{item.description ? <span style={{ color: T.sub }}> — {item.description}</span> : null}</div>)}
                      </div>
                    ) : <div style={{ color: T.sub, fontSize: 11.5 }}>No included items have been defined for this package.</div>}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.sub }}>Package price is loaded automatically when you select a package.</div>
                  {serviceMeta.description && <Detail label="Service Description" value={serviceMeta.description} />}
                </> : <div style={{ fontSize: 11.5, color: T.sub }}>Service information unavailable.</div>}
              </Section>

              <Section icon={<ClipboardList size={13} />} title="Customer Requirements">
                <Field label="What does the customer need accomplished?"><DTextarea value={form.details} onChange={(e) => upd('details', e.target.value)} placeholder="No additional project details provided." rows={3} /></Field>
                <Field label="Materials / Site Access Notes"><DTextarea value={form.materials_notes} onChange={(e) => upd('materials_notes', e.target.value)} placeholder="Parking, building access, existing equipment, or material requirements." rows={3} /></Field>
              </Section>

              <Section icon={<Calendar size={13} />} title="Schedule">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <Field label="Appointment Date"><DInput icon={<Calendar size={13} />} type="date" value={form.schedule_date} onChange={(e) => upd('schedule_date', e.target.value)} /></Field>
                  <Field label="Appointment Time"><DInput icon={<Clock size={13} />} type="time" value={form.appointment_time} onChange={(e) => upd('appointment_time', e.target.value)} /></Field>
                </div>
                {errors.schedule && <span style={{ color: T.danger, fontSize: 11 }}>{errors.schedule}</span>}
              </Section>

              <Section icon={<CheckCircle2 size={13} />} title="Status">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Appointment Status">
                    <PillSelector options={statusOptions} value={form.status} onChange={(v) => upd('status', v)} />
                  </Field>
                  <Field label="Payment Status">
                    <PillSelector options={paymentOptions} value={form.payment_status} onChange={(v) => upd('payment_status', v)} />
                  </Field>
                  <Field label="Priority"><PillSelector options={PRIORITY_OPTIONS} value={form.priority} onChange={(v) => upd('priority', v)} /></Field>
                </div>
              </Section>

              <Section icon={<DollarSign size={13} />} title="Pricing">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                  <Detail label="Selected Package" value={form.service_type || 'No package selected'} /><Detail label="Package Price" value={formatCurrency(packagePrice)} />
                </div>
                <div style={{ fontSize: 10.5, color: T.sub, marginTop: -5 }}>The package price is automatic and cannot be edited here.</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.gold }}>Additional Items</div>
                  <button type="button" onClick={addAdditionalItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, background: T.goldSoft, border: `1px solid ${T.goldLine}`, color: T.gold, cursor: 'pointer', fontSize: 10.5, fontWeight: 800 }}><Plus size={13} /> Add Item</button>
                </div>
                {additionalItems.length === 0 ? <div style={{ padding: '14px', textAlign: 'center', color: T.sub, fontSize: 11.5, border: `1px dashed ${T.borderHi}`, borderRadius: 10 }}>No additional items. Add only customer-specific extras.</div> : additionalItems.map((item, index) => (
                  <div key={item.id || `new-item-${index}`} style={{ padding: 12, borderRadius: 11, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 10, color: T.sub, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Additional Item {index + 1}</span><button type="button" aria-label={`Remove additional item ${index + 1}`} onClick={() => removeAdditionalItem(index)} style={{ display: 'flex', padding: 5, border: 'none', background: 'transparent', color: T.danger, cursor: 'pointer' }}><Trash2 size={14} /></button></div>
                    <Field label="Item Name"><DInput value={item.item_name || ''} onChange={(e) => updateAdditionalItem(index, 'item_name', e.target.value)} placeholder="e.g. Additional CCTV Camera" /></Field>
                    <Field label="Description"><DTextarea value={item.description || ''} onChange={(e) => updateAdditionalItem(index, 'description', e.target.value)} rows={2} /></Field>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}><Field label="Quantity"><DInput type="number" min="0" step="1" value={item.quantity ?? ''} onChange={(e) => updateAdditionalItem(index, 'quantity', e.target.value)} /></Field><Field label="Unit Price"><DInput type="number" min="0" step="0.01" value={item.unit_price ?? ''} onChange={(e) => updateAdditionalItem(index, 'unit_price', e.target.value)} /></Field><Detail label="Item Total" value={formatCurrency(getItemTotal(item))} /></div>
                    <Field label="Customer Comment"><DTextarea value={item.customer_comment || ''} onChange={(e) => updateAdditionalItem(index, 'customer_comment', e.target.value)} rows={2} /></Field>
                  </div>
                ))}
                {errors.additionalItems && <span style={{ color: T.danger, fontSize: 11 }}>{errors.additionalItems}</span>}
                <div style={{ padding: '14px', borderRadius: 11, background: 'rgba(232,176,0,0.06)', border: `1px solid ${T.goldLine}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: T.sub, fontSize: 11.5 }}><span>Package price</span><strong style={{ color: T.text }}>{formatCurrency(packagePrice)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: T.sub, fontSize: 11.5 }}><span>Additional total</span><strong style={{ color: T.text }}>{formatCurrency(additionalTotal)}</strong></div>
                  <div style={{ borderTop: `1px solid ${T.goldLine}`, paddingTop: 9, display: 'flex', justifyContent: 'space-between', color: T.gold, fontSize: 13, fontWeight: 800 }}><span>Final Total</span><span>{formatCurrency(finalTotal)}</span></div>
                </div>
                {errors.price && <span style={{ color: T.danger, fontSize: 11 }}>{errors.price}</span>}
                {finalTotal !== Number(appointment.price || 0) && <div style={{ fontSize: 11.5, color: T.gold }}>New final total this save: {formatCurrency(finalTotal)}. Confirmation is required before it is updated.</div>}
              </Section>

              <Section icon={<FileText size={13} />} title="Notes">
                <Field label="Internal Admin Notes" hint="Visible to authorized staff only">
                  <DTextarea value={form.manager_notes} onChange={(e) => upd('manager_notes', e.target.value)} placeholder="Internal notes, special instructions, technician briefing." rows={3} />
                </Field>
              </Section>

              {}
              <AnimatePresence mode="wait">
                {form.status === 'cancelled' && (
                  <motion.div
                    key="cancel-warn"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', background: 'rgba(239,68,68,0.07)', border: `1px solid ${T.danger}33`, borderRadius: 12, overflow: 'hidden' }}
                  >
                    <AlertCircle size={15} style={{ color: T.danger, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: T.danger, margin: 0, lineHeight: 1.55 }}>
                      Confirm that this appointment should be marked as cancelled.
                    </p>
                  </motion.div>
                )}
                {form.status === 'completed' && (
                  <motion.div
                    key="complete-warn"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 15px', background: 'rgba(34,197,94,0.07)', border: `1px solid ${T.success}33`, borderRadius: 12, overflow: 'hidden' }}
                  >
                    <CheckCircle2 size={15} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11.5, color: T.success, margin: 0, lineHeight: 1.55 }}>
                      Confirm that this appointment has been completed.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {}
            <div style={{ padding: '16px 26px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.ink2, flexShrink: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700 }}>
                <AnimatePresence mode="wait">
                  {dirty ? (
                    <motion.span key="dirty" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ color: T.gold, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.gold, boxShadow: `0 0 8px ${T.gold}` }} />
                      Unsaved changes
                    </motion.span>
                  ) : (
                    <motion.span key="clean" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.success, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <Check size={12} /> Up to date
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  type="button" onClick={handleClose} whileTap={{ scale: 0.96 }}
                  style={{ padding: '11px 20px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.sub, fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.sub; }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit" disabled={loading} whileTap={{ scale: loading ? 1 : 0.96 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10,
                    background: loading ? 'rgba(232,176,0,0.55)' : T.gold,
                    color: T.ink2, border: 'none', padding: '11px 22px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 800,
                    letterSpacing: '0.06em', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : `0 6px 20px ${T.gold}30`,
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#F7C948'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = T.gold; }}
                >
                  {loading
                    ? <><Loader2 size={14} style={{ animation: 'eam-spin 0.8s linear infinite' }} /> Saving…</>
                    : <><Save size={14} /> Save Changes</>}
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
      <style>{`
        @keyframes eam-spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) {
          input, textarea, button { font-size: 16px !important; }
        }
      `}</style>
    </AnimatePresence>
  );
};

export default EditAppointmentModal;
