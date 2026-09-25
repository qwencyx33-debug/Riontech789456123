import React, { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars -- `motion.*` is used as a JSX namespace.
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Package, Zap, ArrowRight, Clock, Search, CheckCircle2, Shield,
  Users, Star, X, Calendar, Tag, ChevronRight, Layers, BadgeCheck, Headphones,
  CheckCheck, Sparkles, Copy, Home as HomeIcon, CreditCard,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ServiceFormUI from './ServiceFormUI';
import { MessageCenter, useMessageCenter } from './PremiumMessageCenter';

const Shimmer = ({ className = '' }) => (
  <div
    className={`rounded-2xl bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%] ${className}`}
    style={{ animation: 'shimmer 1.8s infinite' }}
  />
);


const BookingSteps = ({ step }) => {
  const steps = [
    { n: 1, label: 'Service', icon: Layers },
    { n: 2, label: 'Details', icon: Package },
    { n: 3, label: 'Areas', icon: Package },
    { n: 4, label: 'Location', icon: HomeIcon },
    { n: 5, label: 'Schedule', icon: Calendar },
    { n: 6, label: 'Payment', icon: CreditCard },
    { n: 7, label: 'Review', icon: CheckCheck },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const done   = step > s.n;
        const active = step === s.n;
        const Icon   = s.icon;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                done   ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_16px_rgba(52,211,153,0.3)]' :
                active ? 'bg-[#F5C518] border-[#F5C518] shadow-[0_0_18px_rgba(245,197,24,0.35)]' :
                'bg-white/[0.04] border-white/10'
              }`}>
                {done
                  ? <CheckCheck size={15} className="text-white" />
                  : <Icon size={14} className={active ? 'text-[#0A1120]' : 'text-slate-600'} />
                }
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${
                done ? 'text-emerald-400' : active ? 'text-[#F5C518]' : 'text-slate-600'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 relative h-px bg-white/[0.07] mb-5">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F5C518] to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: step > s.n ? '100%' : '0%' }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


// eslint-disable-next-line no-unused-vars -- `Icon` is rendered as a JSX component.
const TrustCard = ({ icon: Icon, title, desc, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    whileHover={{ y: -3 }}
    className="bg-white/[0.03] border border-white/[0.07] hover:border-[#F5C518]/30 rounded-2xl p-5 transition-all group"
  >
    <div className="w-9 h-9 bg-[#F5C518]/10 rounded-xl flex items-center justify-center mb-3">
      <Icon size={16} className="text-[#F5C518]" />
    </div>
    <p className="text-sm font-bold text-white mb-1">{title}</p>
    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
  </motion.div>
);


const ServiceCard = ({ service: s, onSelect, index = 0 }) => {
  const [hovered, setHovered] = useState(false);
  const downpaymentLabel = s.is_percentage_downpayment
    ? `${s.downpayment_amount}% down`
    : `₱${Number(s.downpayment_amount || 0).toLocaleString()} down`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(s)}
      className="bg-[#080E1C] border border-white/[0.07] hover:border-[#F5C518]/40 rounded-2xl overflow-hidden cursor-pointer group flex flex-col relative transition-all duration-300 shadow-lg hover:shadow-[0_16px_35px_rgba(0,0,0,0.28)]"
    >
      {}
      <div className="aspect-[16/9] relative overflow-hidden bg-white/[0.04]">
        {s.image_url ? (
          <motion.img
            src={s.image_url}
            alt={s.title}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.07 : 1 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            style={{ opacity: 0.85 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080E1C] via-transparent to-transparent opacity-80" />

        <div className="absolute top-3.5 left-3.5 flex gap-1.5 flex-wrap">
          {s.service_categories?.name && (
            <span className="bg-[#0A1120]/90 border border-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200">
              {s.service_categories.name}
            </span>
          )}
          {s.requires_survey && (
            <span className="bg-[#F5C518] backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-[#0A1120]">
              Survey Required
            </span>
          )}
        </div>

        <div className="absolute bottom-3.5 right-3.5">
          <span className="bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-xl text-base font-black text-white">
            ₱{Number(s.price).toLocaleString()}
          </span>
        </div>
      </div>

      {}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-white group-hover:text-[#F5C518] transition-colors leading-tight mb-2">
          {s.title}
        </h3>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {s.duration && (
            <div className="flex items-center gap-1 text-slate-500">
              <Clock size={11} />
              <span className="text-xs font-semibold">{s.duration}</span>
            </div>
          )}
          {s.downpayment_amount != null && (
            <div className="flex items-center gap-1 text-slate-500">
              <Tag size={11} />
              <span className="text-xs font-semibold">{downpaymentLabel}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2 mb-4">{s.description || 'Professional service tailored to your requirements.'}</p>

        <div className="mt-auto">
          <motion.div
            animate={hovered ? { backgroundColor: 'rgba(245,197,24,1)' } : { backgroundColor: 'rgba(255,255,255,0.05)' }}
            transition={{ duration: 0.2 }}
            className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/[0.07] group-hover:border-[#F5C518]/30 ${hovered ? 'text-[#0A1120]' : 'text-white'}`}
          >
            <span>Select Service</span>
            <ArrowRight size={13} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};


const BookingSuccess = ({ result, onTrack, onDashboard }) => {
  const [copied, setCopied] = useState(false);
  const copyRef = () => {
    navigator.clipboard?.writeText(result.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#050912] flex items-center justify-center p-6 overflow-y-auto"
    >
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-[#F5C518]/[0.06] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-6"
          >
            <CheckCircle2 size={38} className="text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-black text-white mb-2">Booking Confirmed</h1>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Your request has been received. Our team will review and confirm your appointment shortly.
          </p>
        </div>

        <div className="bg-[#080E1C] border border-white/[0.07] rounded-3xl p-6 space-y-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Reference Number</p>
              <p className="text-lg font-black text-[#F5C518] font-mono tracking-wide">{result.reference}</p>
            </div>
            <button
              onClick={copyRef}
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#F5C518]/40 transition-all"
            >
              {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          </div>

          <div className="border-t border-white/[0.06] pt-5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Status</span>
            <span className="px-3 py-1 rounded-full bg-[#F5C518]/15 border border-[#F5C518]/25 text-[#F5C518] text-[10px] font-black uppercase tracking-wider">
              {result.status || 'Pending'}
            </span>
          </div>

          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">What Happens Next</p>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              Our team verifies your payment and appointment details, then confirms your scheduled slot. You'll be notified once your booking status changes.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onTrack}
            className="w-full py-4 rounded-2xl bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-[#F5C518]/20 transition-all"
          >
            Track Booking <ArrowRight size={15} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDashboard}
            className="w-full py-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-slate-300 font-bold text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
          >
            <HomeIcon size={14} /> Return to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RequestService = ({ profile, onBack, onSuccess }) => {
  const [step,             setStep]             = useState(1);
  const [loading,          setLoading]          = useState(false);
  const [services,         setServices]         = useState([]);
  const [fetchingServices, setFetchingServices] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [activeFilter,     setActiveFilter]     = useState('All');
  const [selectedService,  setSelectedService]  = useState(null);
  const [bookingResult,    setBookingResult]    = useState(null);
  const [currentPage,      setCurrentPage]      = useState(1);

  const mc = useMessageCenter();

  const [formData, setFormData] = useState({
    service_type: '',
    description: '',
    materials_needed: '',
    special_instructions: '',
    appointment_address: profile?.address || '',
    date: '',
    time: '',
    price: 0,
    unit_price: 0,
    quantity: 1,
    requires_survey: false,
    downpayment: 0,
    is_percentage: true,
    payment_method: 'COD',
    payment_type: 'downpayment',
    reference_number: '',
    receipt_url: '',
    actual_paid_amount: 0,
    areas: [],
    items: [],
  });

  
  const getDownpaymentAmount = () => {
    const totalPrice = formData.unit_price * formData.quantity;
    return formData.is_percentage
      ? (totalPrice * (formData.downpayment / 100))
      : formData.downpayment;
  };

  
  useEffect(() => {
    const fetchActiveServices = async () => {
      setFetchingServices(true);
      const { data, error } = await supabase
        .from('service_types')
        .select('*, service_categories(name)')
        .eq('is_archived', false)
        .order('title', { ascending: true });
      if (!error) setServices(data || []);
      else mc.error('Could not load services', error.message);
      setFetchingServices(false);
    };
    fetchActiveServices();
    
  }, []);

  
  const handleServiceSelect = (service) => {
    const basePrice = service.price;
    const minDownpayment = service.is_percentage_downpayment
      ? (basePrice * (service.downpayment_amount / 100))
      : service.downpayment_amount;

    setSelectedService(service);
    setFormData({
      ...formData,
      service_type: service.title,
      price: basePrice,
      unit_price: basePrice,
      quantity: 1,
      requires_survey: service.requires_survey,
      downpayment: service.downpayment_amount,
      is_percentage: service.is_percentage_downpayment,
      description: '',
      actual_paid_amount: minDownpayment,
      payment_type: 'downpayment',
    });
    setStep(2);
  };

  const handlePaymentTypeChange = (type) => {
    const amount = type === 'full' ? formData.price : getDownpaymentAmount();
    setFormData({ ...formData, payment_type: type, actual_paid_amount: amount });
  };

  const handleReceiptUpload = async (e) => {
    try {
      setUploadingReceipt(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setFormData({ ...formData, receipt_url: data.publicUrl });
      mc.success('Receipt uploaded', 'Your payment receipt was attached successfully.');
    } catch (error) {
      mc.error('Upload failed', error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.time || !formData.description || !formData.appointment_address) {
      mc.warning('Information Required', 'Please complete all required fields before submitting.');
      return false;
    }

    const confirmed = await mc.confirm(
      'Confirm Booking?',
      `You're about to book "${formData.service_type}" for ₱${Number(formData.actual_paid_amount).toLocaleString()} due now. This cannot be edited after submission.`,
      { confirmLabel: 'Submit Booking' }
    );
    if (!confirmed) return false;

    setLoading(true);
    const loader = mc.loading('Submitting your booking', 'Please don\u2019t close this window.');
    try {
      const { data, error } = await supabase.from('appointments').insert([{
        user_id:           profile.id,
        full_name:         `${profile.first_name} ${profile.last_name}`,
        address:           formData.appointment_address,
        service_type:      formData.service_type,
        service_id:        selectedService?.id || null,
        details:           `${formData.description} (Qty: ${formData.quantity})`,
        // The appointments schema stores customer access/request notes in
        // materials_notes. Keep the form-specific name separate from the DB field.
        materials_notes:   formData.special_instructions || '',
        schedule_date:     formData.date,
        appointment_time:  formData.time,
        price:             formData.price,
        payment_method:    formData.payment_method,
        reference_number:  formData.reference_number,
        receipt_image:     formData.receipt_url,
        downpayment_paid:  formData.actual_paid_amount,
        status:            'pending',
        requires_survey:   formData.requires_survey,
        payment_status:    formData.payment_type === 'full' ? 'full_paid' : 'downpayment_paid',
      }]).select().single();
      if (error) throw error;

      const areaRows = (formData.areas || [])
        .filter(area => area.name?.trim())
        .map(area => ({
          appointment_id: data.id,
          area_name: area.name.trim(),
          area_size: area.size === '' ? null : Number(area.size),
          area_size_unit: area.unit || 'sqm',
          quantity: Number(area.quantity) || 1,
          notes: area.notes?.trim() || null,
        }));
      const itemRows = (formData.items || [])
        .filter(item => item.name?.trim())
        .map(item => ({
          appointment_id: data.id,
          item_name: item.name.trim(),
          description: item.description?.trim() || null,
          quantity: Number(item.quantity) || 1,
          unit_price: 0,
          customer_comment: item.comment?.trim() || null,
        }));
      if (areaRows.length) {
        const { error: areasError } = await supabase.from('appointment_areas').insert(areaRows);
        if (areasError) throw areasError;
      }
      if (itemRows.length) {
        const { error: itemsError } = await supabase.from('appointment_items').insert(itemRows);
        if (itemsError) throw itemsError;
      }

      loader.close();
      const ref = data?.id ? `BK-${String(data.id).slice(0, 8).toUpperCase()}` : `BK-${Date.now().toString(36).toUpperCase()}`;
      setBookingResult({ reference: ref, status: data?.status || 'pending' });
      return true;
    } catch (error) {
      loader.close();
      mc.error('Submission Error', error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(services.map(s => s.service_categories?.name).filter(Boolean))];
    return cats;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.service_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        activeFilter === 'All' || s.service_categories?.name === activeFilter;
      return matchesSearch && matchesCat;
    });
  }, [services, searchQuery, activeFilter]);
  const servicesPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / servicesPerPage));
  const visibleServices = filteredServices.slice((currentPage - 1) * servicesPerPage, currentPage * servicesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  
  if (bookingResult) {
    return (
      <>
        <AnimatePresence>
          <BookingSuccess
            result={bookingResult}
            onTrack={() => { setBookingResult(null); onSuccess(); }}
            onDashboard={() => { setBookingResult(null); onSuccess(); }}
          />
        </AnimatePresence>
        <MessageCenter {...mc} />
      </>
    );
  }

  
  if (fetchingServices) return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[#080E1C] p-8 md:p-12 mb-8">
        <Shimmer className="h-5 w-32 mb-6" />
        <Shimmer className="h-10 w-2/3 mb-3" />
        <Shimmer className="h-4 w-1/2 mb-8" />
        <div className="flex gap-3">
          <Shimmer className="h-10 w-36" />
          <Shimmer className="h-10 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#080E1C] border border-white/[0.06] rounded-[1.75rem] overflow-hidden">
            <Shimmer className="aspect-video w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Shimmer className="h-5 w-3/4" />
              <Shimmer className="h-3.5 w-1/2" />
              <Shimmer className="h-3 w-full" />
              <Shimmer className="h-3 w-4/5" />
              <Shimmer className="h-11 w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-[#050912] min-h-full">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 pb-24 overflow-x-hidden"
      >
        <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>

        {/* ── Back nav ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={step === 1 ? onBack : () => setStep(step - 1)}
            className="group flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-[11px] font-semibold uppercase tracking-[0.18em]"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            {step === 1 ? 'Cancel Request' : 'Back'}
          </motion.button>
        </div>

        {}
        <BookingSteps step={step} />

        <AnimatePresence mode="wait">

          {}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >

              {}
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] mb-5">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F1B32] via-[#0A1120] to-[#050912]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#F5C518]/[0.07] via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#F5C518]/[0.06] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-10 w-56 h-56 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative z-10 px-6 py-6 md:px-8">
                  <p className="mb-2 text-sm font-semibold text-[#F5C518]">Step 1 of 7 · Service</p>
                  <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">Choose a service</h1>
                  <p className="mt-2 text-slate-400 text-sm md:text-base">Browse available services and select the one you need.</p>
                </div>
              </div>

              {}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#F5C518] transition-colors" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-3.5 pl-11 pr-10 text-base text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#F5C518]/60 focus:bg-white/[0.06] focus:ring-2 ring-[#F5C518]/15 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map(cat => (
                    <motion.button
                      key={cat}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveFilter(cat)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                        activeFilter === cat
                          ? 'bg-[#F5C518] border-[#F5C518] text-[#0A1120] shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {cat}
                    </motion.button>
                  ))}
                </div>
              )}

              {}
              {}
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {visibleServices.map((s, i) => (
                    <ServiceCard key={s.id} service={s} onSelect={handleServiceSelect} index={i} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5">
                    <Search size={24} className="text-slate-700" />
                  </div>
                  <p className="text-base font-bold text-slate-400 mb-2">No services found</p>
                  <p className="text-[12px] text-slate-600 mb-5">
                    {searchQuery ? `No results for "${searchQuery}". Try a different search.` : 'No services match the selected filter.'}
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}
                    className="px-4 py-2 bg-[#F5C518]/15 border border-[#F5C518]/25 text-[#F5C518] rounded-xl text-[11px] font-bold hover:bg-[#F5C518]/25 transition-all"
                  >
                    Clear filters
                  </button>
                </motion.div>
              )}

              {}
              {filteredServices.length > 0 && (
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm text-slate-400">Showing {Math.min((currentPage - 1) * servicesPerPage + 1, filteredServices.length)}–{Math.min(currentPage * servicesPerPage, filteredServices.length)} of {filteredServices.length} services</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-35">Previous</button>
                    <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="rounded-xl border border-[#F5C518]/35 px-3 py-2 text-sm font-semibold text-[#F5C518] disabled:cursor-not-allowed disabled:opacity-35">Next</button>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {}
          {step >= 2 && step <= 6 && (
            <motion.div
              key={`step${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <ServiceFormUI
                formData={formData}
                setFormData={setFormData}
                selectedService={selectedService}
                handlePaymentTypeChange={handlePaymentTypeChange}
                handleReceiptUpload={handleReceiptUpload}
                uploadingReceipt={uploadingReceipt}
                getDownpaymentAmount={getDownpaymentAmount}
                onBack={() => setStep(1)}
                onContinue={() => setStep(7)}
                step={step}
                onStepChange={setStep}
              />
            </motion.div>
          )}

          {}
          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-2xl mx-auto"
            >
              <ReviewPanel
                profile={profile}
                formData={formData}
                loading={loading}
                onEdit={setStep}
                onSubmit={handleSubmit}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      <MessageCenter {...mc} />
    </div>
  );
};


const ReviewPanel = ({ profile, formData, loading, onEdit, onSubmit }) => {
  const rows = [
    { label: 'Customer', value: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '—' },
    { label: 'Selected Service', value: formData.service_type || '—' },
    { label: 'Quantity', value: formData.quantity },
    { label: 'Price', value: `₱${Number(formData.price || 0).toLocaleString()}` },
    { label: 'Schedule', value: formData.date && formData.time ? `${formData.date} • ${formData.time}` : '—' },
    { label: 'Address', value: formData.appointment_address || '—' },
    { label: 'Payment Method', value: formData.payment_method || '—' },
    { label: 'Reference Number', value: formData.reference_number || '—' },
    { label: 'Amount Due Now', value: `₱${Number(formData.actual_paid_amount || 0).toLocaleString()}` },
    { label: 'Special Instructions', value: formData.special_instructions || '—' },
  ];
  const areas = (formData.areas || []).filter(area => area.name?.trim());
  const items = (formData.items || []).filter(item => item.name?.trim());

  return (
    <div className="bg-[#080E1C] border border-white/[0.07] rounded-[2rem] p-7 md:p-9">
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-[#F5C518]/10 flex items-center justify-center">
          <CheckCheck size={18} className="text-[#F5C518]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Review your request</h2>
          <p className="text-sm text-slate-400">Check your details before confirming.</p>
        </div>
      </div>

      {(areas.length > 0 || items.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {areas.length > 0 && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><div className="flex justify-between"><h3 className="font-bold text-white">Project / areas</h3><button onClick={() => onEdit(3)} className="text-sm font-semibold text-[#F5C518]">Change</button></div><div className="mt-3 space-y-2">{areas.map((area, index) => <p key={index} className="text-sm text-slate-400">{area.name} {area.size ? '— ' + area.size + ' ' + (area.unit || 'sqm') : ''} · Qty {area.quantity || 1}</p>)}</div></div>}
          {items.length > 0 && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><div className="flex justify-between"><h3 className="font-bold text-white">Items / equipment</h3><button onClick={() => onEdit(3)} className="text-sm font-semibold text-[#F5C518]">Change</button></div><div className="mt-3 space-y-2">{items.map((item, index) => <p key={index} className="text-sm text-slate-400">{item.name} · Qty {item.quantity || 1}</p>)}</div></div>}
        </div>
      )}

      <div className="divide-y divide-white/[0.05] mb-8">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-6 py-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">{r.label}</span>
            <span className="text-[13px] font-semibold text-white text-right break-words">{r.value}</span>
          </div>
        ))}
      </div>

      {formData.requires_survey && (
        <div className="flex items-start gap-3 p-4 bg-[#F5C518]/[0.06] border border-[#F5C518]/20 rounded-2xl mb-6">
          <Shield size={15} className="text-[#F5C518] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#F5C518]/90 font-semibold leading-relaxed">
            This service requires a site survey. Final pricing may be adjusted after inspection.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onEdit(6)}
          className="flex-1 py-4 rounded-2xl border border-white/10 text-slate-300 font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
        >
          Edit Details
        </button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          onClick={onSubmit}
          className="flex-[2] py-4 rounded-2xl bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-[#F5C518]/20 transition-all disabled:opacity-50"
        >
          <Sparkles size={15} /> Confirm & Submit Booking
        </motion.button>
      </div>
    </div>
  );
};

export default RequestService;
