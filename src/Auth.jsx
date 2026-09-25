import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Mail, Lock, LogIn, Loader2,
  AlertCircle, User, ChevronLeft, Fingerprint,
  X, CheckCircle2, FileText, Eye, EyeOff,
  Shield, Zap
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Password strength checker ─── */
function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  if (score <= 4) return { score, label: 'Strong', color: '#22c55e' };
  return { score: 5, label: 'Very Strong', color: '#10b981' };
}

/* ─── Input field ─── */
const InputField = ({ icon, togglePassword, showPassword, label, ...props }) => (
  <div className="rt-field-wrap">
    {label && <label className="rt-field-label">{label}</label>}
    <div className="rt-field-inner">
      <div className="rt-field-icon">{React.cloneElement(icon, { size: 16 })}</div>
      <input className="rt-field" {...props} required />
      {props.name === 'password' && togglePassword && (
        <button type="button" onClick={togglePassword} className="rt-field-toggle">
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  </div>
);

/* ─── Primary action button ─── */
const ActionButton = ({ loading, icon, children }) => (
  <button disabled={loading} className="rt-btn-primary">
    {loading ? <Loader2 className="rt-spin" size={18} /> : icon}
    <span>{children}</span>
  </button>
);

/* ─── Main Auth component ─── */
function Auth({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });
  const [resetSent, setResetSent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  /* Reset state when modal opens/closes */
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('login');
        setStatus({ type: null, message: '' });
        setFormData({ email: '', password: '', firstName: '', lastName: '' });
        setAcceptedTerms(false);
        setShowPassword(false);
        setResetSent(false);
        setPasswordStrength({ score: 0, label: '', color: '' });
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'password') setPasswordStrength(getPasswordStrength(value));
  };

  const handleCheckboxChange = (e) => {
    setAcceptedTerms(e.target.checked);
    if (e.target.checked) setShowTermsModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email.trim(),
      password: formData.password,
    });

    if (error) {
      setStatus({ type: 'error', message: 'Invalid email or password. Please try again.' });
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single();

    if (profile) {
      setStatus({ type: 'success', message: 'Authentication successful. Redirecting to your dashboard...' });
      setTimeout(() => {
        onClose();
        const routes = {
          admin: '/admin/dashboard',
          manager: '/manager/dashboard',
          cashier: '/cashier/dashboard',
          technician: '/workers/dashboard',
        };
        navigate(routes[profile.role] || '/customer/dashboard');
      }, 2000);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setStatus({ type: 'error', message: 'You must agree to the Terms and Conditions to continue.' });
      return;
    }
    if (passwordStrength.score < 2) {
      setStatus({ type: 'error', message: 'Please choose a stronger password before continuing.' });
      return;
    }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
    });

    if (authError) {
      setStatus({ type: 'error', message: authError.message });
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      role: 'customer',
    }]);

    if (profileError) {
      setStatus({ type: 'error', message: 'Account created but profile setup failed.' });
    } else {
      await supabase.auth.signOut();
      setStatus({ type: 'success', message: 'Account created successfully! You can now sign in.' });
      setFormData({ email: '', password: '', firstName: '', lastName: '' });
      setAcceptedTerms(false);
      setTimeout(() => { setStatus({ type: null, message: '' }); setView('login'); }, 3000);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    });
    setLoading(false);
    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setResetSent(true);
    }
  };

  const viewTitles = {
    login: 'Secure Login',
    register: 'Create Account',
    forgot: 'Reset Password',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');

        .rt-overlay {
          position: fixed; inset: 0; z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .rt-backdrop {
          position: absolute; inset: 0;
          background: rgba(3, 14, 16, 0.88);
          backdrop-filter: blur(12px);
          cursor: pointer;
        }

        /* ── Modal shell ── */
        .rt-modal {
          position: relative;
          width: 100%; max-width: 480px;
          background: #06171A;
          border: 1px solid rgba(232,176,0,0.18);
          overflow: hidden;
          box-shadow: 0 0 80px rgba(0,0,0,0.7), 0 0 30px rgba(232,176,0,0.06);
        }

        /* ── Header ── */
        .rt-header {
          background: #030E10;
          border-bottom: 1px solid rgba(232,176,0,0.12);
          padding: 32px 40px 28px;
          position: relative;
          overflow: hidden;
        }
        .rt-header-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(232,176,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,176,0,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .rt-header-scanline {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 3px,
            rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px
          );
        }
        .rt-header-content {
          position: relative; z-index: 10;
          display: flex; align-items: center; gap: 18px;
        }
        .rt-header-hex {
          width: 52px; height: 52px; flex-shrink: 0;
          background: #E8B000;
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          display: flex; align-items: center; justify-content: center;
          color: #030E10;
          box-shadow: 0 0 20px rgba(232,176,0,0.3);
        }
        .rt-header-text {}
        .rt-header-brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px; letter-spacing: 0.06em;
          color: #F2F7F8; line-height: 1;
        }
        .rt-header-view {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.45em; text-transform: uppercase;
          color: #E8B000; margin-top: 4px;
        }
        .rt-close {
          position: absolute; top: 20px; right: 20px; z-index: 20;
          background: rgba(232,176,0,0.08);
          border: 1px solid rgba(232,176,0,0.15);
          color: #8CA8AD; width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s, color 0.2s;
        }
        .rt-close:hover { background: rgba(232,176,0,0.18); color: #E8B000; }

        /* ── Tab switcher ── */
        .rt-tabs {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid rgba(232,176,0,0.08);
        }
        .rt-tab {
          padding: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.25em; text-transform: uppercase;
          color: #8CA8AD; background: none; border: none;
          cursor: pointer; position: relative;
          transition: color 0.2s;
        }
        .rt-tab.active { color: #E8B000; }
        .rt-tab.active::after {
          content: '';
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: #E8B000;
        }
        .rt-tab:hover:not(.active) { color: #F2F7F8; }

        /* ── Body ── */
        .rt-body { padding: 32px 40px 36px; }

        /* ── Fields ── */
        .rt-field-wrap { display: flex; flex-direction: column; gap: 6px; }
        .rt-field-label {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.35em; text-transform: uppercase;
          color: #8CA8AD;
        }
        .rt-field-inner { position: relative; }
        .rt-field-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: #8CA8AD; transition: color 0.2s;
          display: flex; align-items: center;
        }
        .rt-field-inner:focus-within .rt-field-icon { color: #E8B000; }
        .rt-field {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(232,176,0,0.12);
          color: #F2F7F8;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          padding: 14px 44px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .rt-field::placeholder { color: rgba(140,168,173,0.5); }
        .rt-field:focus {
          border-color: rgba(232,176,0,0.5);
          background: rgba(232,176,0,0.03);
        }
        .rt-field-toggle {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          color: #8CA8AD; background: none; border: none; cursor: pointer;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .rt-field-toggle:hover { color: #E8B000; }

        /* ── Password strength ── */
        .rt-strength { margin-top: 8px; }
        .rt-strength-bars {
          display: flex; gap: 4px; margin-bottom: 4px;
        }
        .rt-strength-bar {
          flex: 1; height: 3px;
          background: rgba(255,255,255,0.06);
          transition: background 0.3s;
        }
        .rt-strength-label {
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.3em; text-transform: uppercase;
          text-align: right;
        }

        /* ── Terms checkbox ── */
        .rt-terms {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(232,176,0,0.04);
          border: 1px solid rgba(232,176,0,0.1);
        }
        .rt-checkbox {
          width: 16px; height: 16px; flex-shrink: 0;
          margin-top: 2px;
          accent-color: #E8B000;
          cursor: pointer;
        }
        .rt-terms-text {
          font-size: 10px; font-weight: 600; line-height: 1.6;
          color: #8CA8AD;
        }
        .rt-terms-link {
          color: #E8B000; background: none; border: none;
          cursor: pointer; text-decoration: underline;
          font-size: 10px; font-weight: 700;
        }

        /* ── Primary button ── */
        .rt-btn-primary {
          width: 100%;
          background: #E8B000; color: #030E10;
          border: none; padding: 16px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 800;
          letter-spacing: 0.3em; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          clip-path: polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%);
          transition: background 0.2s, transform 0.2s;
          box-shadow: 0 0 24px rgba(232,176,0,0.2);
        }
        .rt-btn-primary:hover:not(:disabled) { background: #F2F7F8; transform: translateY(-2px); }
        .rt-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Ghost button ── */
        .rt-btn-ghost {
          width: 100%; background: none;
          border: 1px solid rgba(232,176,0,0.15);
          color: #8CA8AD; padding: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.25em; text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: border-color 0.2s, color 0.2s;
        }
        .rt-btn-ghost:hover { border-color: rgba(232,176,0,0.4); color: #E8B000; }

        /* ── Divider ── */
        .rt-divider {
          display: flex; align-items: center; gap: 12px;
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.35em; text-transform: uppercase;
          color: rgba(140,168,173,0.4);
        }
        .rt-divider::before, .rt-divider::after {
          content: ''; flex: 1;
          height: 1px; background: rgba(232,176,0,0.08);
        }

        /* ── Footer link ── */
        .rt-footer-text {
          text-align: center;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(140,168,173,0.5);
        }
        .rt-footer-link {
          color: #E8B000; background: none; border: none;
          cursor: pointer; font-size: 10px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
        }
        .rt-footer-link:hover { text-decoration: underline; }

        /* ── Forgot password link ── */
        .rt-forgot {
          background: none; border: none;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: rgba(140,168,173,0.5); cursor: pointer;
          text-align: right; width: 100%;
          transition: color 0.2s;
        }
        .rt-forgot:hover { color: #E8B000; }

        /* ── Status overlay ── */
        .rt-status-overlay {
          position: absolute; inset: 0; z-index: 100;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px; text-align: center;
          background: rgba(6,23,26,0.97);
          backdrop-filter: blur(4px);
        }
        .rt-status-icon {
          width: 80px; height: 80px;
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }
        .rt-status-icon.success { background: rgba(34,197,94,0.15); color: #22c55e; }
        .rt-status-icon.error   { background: rgba(239,68,68,0.15);  color: #ef4444; }
        .rt-status-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px; letter-spacing: 0.06em;
          color: #F2F7F8; margin-bottom: 12px;
        }
        .rt-status-msg {
          font-size: 13px; font-weight: 500; line-height: 1.65;
          color: #8CA8AD; max-width: 320px; margin-bottom: 28px;
        }

        /* ── Terms modal ── */
        .rt-terms-modal {
          position: absolute; inset: 0; z-index: 110;
          background: #06171A;
          border-top: 2px solid #E8B000;
          display: flex; flex-direction: column;
          padding: 32px 40px;
        }
        .rt-terms-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px;
        }
        .rt-terms-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px; letter-spacing: 0.06em;
          color: #E8B000;
        }
        .rt-terms-body {
          flex: 1; overflow-y: auto;
          padding-right: 12px;
          scrollbar-width: thin;
          scrollbar-color: rgba(232,176,0,0.2) transparent;
        }
        .rt-terms-section { margin-bottom: 20px; }
        .rt-terms-section h4 {
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.4em; text-transform: uppercase;
          color: #E8B000; margin-bottom: 6px;
        }
        .rt-terms-section p {
          font-size: 12px; font-weight: 400; line-height: 1.75;
          color: #8CA8AD;
        }
        .rt-terms-divider {
          height: 1px; background: rgba(232,176,0,0.08);
          margin: 16px 0;
        }

        /* ── Reset sent ── */
        .rt-reset-sent {
          text-align: center; padding: 24px 0;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .rt-reset-hex {
          width: 64px; height: 64px;
          background: rgba(232,176,0,0.1);
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          display: flex; align-items: center; justify-content: center;
          color: #E8B000;
        }

        /* ── Notice box ── */
        .rt-notice {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: rgba(232,176,0,0.05);
          border-left: 2px solid #E8B000;
        }
        .rt-notice-text {
          font-size: 11px; font-weight: 500; line-height: 1.6;
          color: #8CA8AD;
        }

        /* ── Spin ── */
        .rt-spin { animation: rt-spin 1s linear infinite; }
        @keyframes rt-spin { to { transform: rotate(360deg); } }

        /* ── Security badge row ── */
        .rt-security-row {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; padding-top: 4px;
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: rgba(140,168,173,0.35);
        }
        .rt-security-dot {
          width: 4px; height: 4px;
          background: rgba(232,176,0,0.3);
        }

        /* ── Name grid ── */
        .rt-name-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* ── Form spacing ── */
        .rt-form { display: flex; flex-direction: column; gap: 16px; }
      `}</style>

      <div className="rt-overlay">
        {/* Backdrop */}
        <motion.div
          className="rt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="rt-modal"
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {/* ── Terms modal ── */}
          <AnimatePresence>
            {showTermsModal && (
              <motion.div
                className="rt-terms-modal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <div className="rt-terms-header">
                  <span className="rt-terms-title">Terms & Conditions</span>
                  <button className="rt-close" onClick={() => setShowTermsModal(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="rt-terms-body">
                  {[
                    { title: '1. Acceptance of Services', body: 'By registering an account at Riontech Security Services, you formally enter a service agreement. This platform is designed for automated security management and technician dispatching.' },
                    { title: '2. Data Privacy & Encryption', body: 'Your personal data, including contact information and service addresses, are protected under our end-to-end encryption protocols. We do not sell or share your data with third parties.' },
                    { title: '3. User Conduct & Responsibilities', body: 'Users are strictly prohibited from providing false service reports or attempting to bypass system security measures. Violations may result in account termination.' },
                    { title: '4. Service Limitations & Liabilities', body: 'Riontech provides real-time monitoring and dispatch services. However, we are not liable for service delays caused by incorrect information provided by the user.' },
                    { title: '5. Verification Protocols', body: 'All new accounts must undergo a mandatory email verification process to ensure the security of our service network and prevent unauthorized access.' },
                  ].map((s, i) => (
                    <div key={i} className="rt-terms-section">
                      <h4>{s.title}</h4>
                      <p>{s.body}</p>
                      {i < 4 && <div className="rt-terms-divider" />}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }}
                  className="rt-btn-primary"
                  style={{ marginTop: '24px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>I Understand and Agree</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Status overlay ── */}
          <AnimatePresence>
            {status.message && (
              <motion.div
                className="rt-status-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className={`rt-status-icon ${status.type}`}>
                  {status.type === 'success'
                    ? <CheckCircle2 size={36} />
                    : <AlertCircle size={36} />}
                </div>
                <div className="rt-status-title">
                  {status.type === 'success' ? 'Success' : 'Notice'}
                </div>
                <p className="rt-status-msg">{status.message}</p>
                {status.type === 'error' && (
                  <button
                    onClick={() => setStatus({ type: null, message: '' })}
                    className="rt-btn-primary"
                    style={{ maxWidth: 220 }}
                  >
                    <span>Dismiss</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Header ── */}
          <div className="rt-header">
            <div className="rt-header-grid" />
            <div className="rt-header-scanline" />
            <div className="rt-header-content">
              <div className="rt-header-hex">
                <ShieldCheck size={24} />
              </div>
              <div className="rt-header-text">
                <div className="rt-header-brand">Riontech Portal</div>
                <div className="rt-header-view">{viewTitles[view]}</div>
              </div>
            </div>
            <button className="rt-close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* ── Tab switcher (login / register only) ── */}
          {view !== 'forgot' && (
            <div className="rt-tabs">
              <button
                className={`rt-tab ${view === 'login' ? 'active' : ''}`}
                onClick={() => setView('login')}
              >
                Sign In
              </button>
              <button
                className={`rt-tab ${view === 'register' ? 'active' : ''}`}
                onClick={() => setView('register')}
              >
                Register
              </button>
            </div>
          )}

          {/* ── Body ── */}
          <div className="rt-body">
            <AnimatePresence mode="wait">

              {/* LOGIN */}
              {view === 'login' && (
                <motion.form
                  key="login"
                  className="rt-form"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <InputField
                    icon={<Mail />}
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    label="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                  />
                  <div>
                    <InputField
                      icon={<Lock />}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      label="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      togglePassword={() => setShowPassword(p => !p)}
                      showPassword={showPassword}
                      autoComplete="current-password"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="button" className="rt-forgot" onClick={() => setView('forgot')}>
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                  <ActionButton loading={loading} icon={<LogIn size={16} />}>
                    Sign In
                  </ActionButton>
                  <div className="rt-security-row">
                    <Shield size={10} />
                    <span>256-bit encrypted connection</span>
                    <div className="rt-security-dot" />
                    <Zap size={10} />
                    <span>Secure session</span>
                  </div>
                </motion.form>
              )}

              {/* REGISTER */}
              {view === 'register' && (
                <motion.form
                  key="register"
                  className="rt-form"
                  onSubmit={handleRegister}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="rt-name-grid">
                    <InputField
                      icon={<User />}
                      name="firstName"
                      placeholder="First Name"
                      label="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                    <InputField
                      icon={<User />}
                      name="lastName"
                      placeholder="Last Name"
                      label="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <InputField
                    icon={<Mail />}
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    label="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                  />
                  <div>
                    <InputField
                      icon={<Lock />}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Create Password"
                      label="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      togglePassword={() => setShowPassword(p => !p)}
                      showPassword={showPassword}
                      autoComplete="new-password"
                    />
                    {/* Password strength meter */}
                    {formData.password && (
                      <div className="rt-strength">
                        <div className="rt-strength-bars">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className="rt-strength-bar"
                              style={{
                                background: i <= passwordStrength.score
                                  ? passwordStrength.color
                                  : undefined,
                              }}
                            />
                          ))}
                        </div>
                        <div
                          className="rt-strength-label"
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.label}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rt-terms">
                    <input
                      type="checkbox"
                      id="terms"
                      className="rt-checkbox"
                      checked={acceptedTerms}
                      onChange={handleCheckboxChange}
                    />
                    <label htmlFor="terms" className="rt-terms-text">
                      I have read and agree to the{' '}
                      <button type="button" className="rt-terms-link" onClick={() => setShowTermsModal(true)}>
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button type="button" className="rt-terms-link" onClick={() => setShowTermsModal(true)}>
                        Privacy Policy
                      </button>
                    </label>
                  </div>
                  <ActionButton loading={loading} icon={<CheckCircle2 size={16} />}>
                    Create Account
                  </ActionButton>
                  <div className="rt-security-row">
                    <Shield size={10} />
                    <span>256-bit encrypted connection</span>
                    <div className="rt-security-dot" />
                    <Zap size={10} />
                    <span>Secure session</span>
                  </div>
                </motion.form>
              )}

              {/* FORGOT PASSWORD */}
              {view === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {resetSent ? (
                    <div className="rt-reset-sent">
                      <div className="rt-reset-hex">
                        <Mail size={28} />
                      </div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '0.06em', color: '#F2F7F8' }}>
                        Check Your Inbox
                      </div>
                      <p style={{ fontSize: 13, color: '#8CA8AD', lineHeight: 1.65, textAlign: 'center', maxWidth: 300 }}>
                        A password reset link has been sent to <strong style={{ color: '#E8B000' }}>{formData.email}</strong>.
                        Check your inbox and spam folder.
                      </p>
                      <button
                        type="button"
                        className="rt-btn-ghost"
                        onClick={() => { setView('login'); setResetSent(false); }}
                      >
                        <ChevronLeft size={14} /> Back to Login
                      </button>
                    </div>
                  ) : (
                    <form className="rt-form" onSubmit={handleForgotPassword}>
                      <div className="rt-notice">
                        <FileText size={18} style={{ color: '#E8B000', flexShrink: 0, marginTop: 2 }} />
                        <p className="rt-notice-text">
                          Enter your registered email address and we'll send you a secure reset link.
                        </p>
                      </div>
                      <InputField
                        icon={<Mail />}
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        label="Registered Email"
                        value={formData.email}
                        onChange={handleInputChange}
                        autoComplete="email"
                      />
                      <ActionButton loading={loading} icon={<Fingerprint size={16} />}>
                        Send Reset Link
                      </ActionButton>
                      <button
                        type="button"
                        className="rt-btn-ghost"
                        onClick={() => setView('login')}
                      >
                        <ChevronLeft size={14} /> Back to Login
                      </button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default Auth;
