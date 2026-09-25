import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Info, HelpCircle, Loader2, X,
} from 'lucide-react';

const TYPE_STYLES = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-500/30', iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-400', bar: 'bg-emerald-400' },
  error:   { icon: XCircle,      ring: 'ring-red-500/30',     iconBg: 'bg-red-500/15',     iconText: 'text-red-400',     bar: 'bg-red-400'     },
  warning: { icon: AlertTriangle,ring: 'ring-[#F5C518]/30',   iconBg: 'bg-[#F5C518]/15',   iconText: 'text-[#F5C518]',   bar: 'bg-[#F5C518]'   },
  info:    { icon: Info,         ring: 'ring-blue-400/20',    iconBg: 'bg-white/10',       iconText: 'text-slate-200',   bar: 'bg-slate-300'   },
};

let idCounter = 0;
const nextId = () => `msg_${++idCounter}_${Date.now()}`;

export function useMessageCenter() {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); 
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const push = useCallback((type, title, message, opts = {}) => {
    const id = nextId();
    const autoDismiss = opts.autoDismiss ?? (type === 'success' || type === 'info');
    setToasts((t) => [...t, { id, type, title, message }]);
    if (autoDismiss) {
      timers.current[id] = setTimeout(() => dismiss(id), opts.duration || 3200);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((title, message, opts) => push('success', title, message, opts), [push]);
  const error   = useCallback((title, message, opts) => push('error', title, message, { autoDismiss: false, ...opts }), [push]);
  const warning = useCallback((title, message, opts) => push('warning', title, message, { autoDismiss: false, ...opts }), [push]);
  const info    = useCallback((title, message, opts) => push('info', title, message, opts), [push]);

  const confirm = useCallback((title, message, opts = {}) => {
    return new Promise((resolve) => {
      setModal({
        type: 'confirm',
        title, message,
        confirmLabel: opts.confirmLabel || 'Confirm',
        cancelLabel: opts.cancelLabel || 'Cancel',
        danger: !!opts.danger,
        resolve,
      });
    });
  }, []);

  const loading = useCallback((title, message) => {
    setModal({ type: 'loading', title: title || 'Please wait', message });
    return { close: () => setModal((m) => (m?.type === 'loading' ? null : m)) };
  }, []);

  const closeModal = useCallback((result) => {
    setModal((m) => {
      if (m?.type === 'confirm' && m.resolve) m.resolve(!!result);
      return null;
    });
  }, []);

  return { toasts, modal, dismiss, closeModal, success, error, warning, info, confirm, loading };
}

export const MessageCenter = ({ toasts = [], modal = null, dismiss, closeModal }) => {
  
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && modal) closeModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);

  return (
    <>
      {}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
            const Icon = s.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-white/10 ring-1 ${s.ring} bg-[#0A1120]/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-4 flex gap-3 items-start`}
              >
                <div className={`w-8 h-8 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={s.iconText} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[12.5px] font-bold text-white leading-tight">{t.title}</p>
                  {t.message && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-slate-600 hover:text-white transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="mc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#020509]/80 backdrop-blur-sm"
            onClick={() => modal.type === 'confirm' && closeModal(false)}
          >
            <motion.div
              key="mc-panel"
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0A1120] shadow-2xl shadow-black/60 overflow-hidden"
            >
              {modal.type === 'loading' ? (
                <div className="p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center">
                    <Loader2 size={22} className="text-[#F5C518] animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{modal.title}</p>
                    {modal.message && <p className="text-[11px] text-slate-500 mt-1">{modal.message}</p>}
                  </div>
                </div>
              ) : (
                <div className="p-7">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${modal.danger ? 'bg-red-500/15' : 'bg-[#F5C518]/15'}`}>
                    <HelpCircle size={20} className={modal.danger ? 'text-red-400' : 'text-[#F5C518]'} />
                  </div>
                  <p className="text-base font-black text-white mb-1.5">{modal.title}</p>
                  {modal.message && <p className="text-[12.5px] text-slate-400 leading-relaxed mb-6">{modal.message}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => closeModal(false)}
                      className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                    >
                      {modal.cancelLabel}
                    </button>
                    <button
                      onClick={() => closeModal(true)}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg ${
                        modal.danger
                          ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25'
                          : 'bg-[#F5C518] hover:bg-[#FFD43B] text-[#0A1120] shadow-[#F5C518]/25'
                      }`}
                    >
                      {modal.confirmLabel}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageCenter;
