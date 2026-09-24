import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldCheck, Phone, MapPin, Mail, ChevronRight,
  Facebook, Instagram, Zap, Settings, Eye, Lock,
  MessageCircle, Globe, Send, Cpu, Award,
  Cctv, Fingerprint, ShieldAlert, Siren, BellRing, Activity,
  Twitter, Menu, X as XIcon, Star, CheckCircle2, Clock,
  BadgeCheck, Wrench, Headphones, Package, Bolt, ChevronDown,
  Building2, Home, Calendar, MapPinned
} from 'lucide-react';

import Auth from './Auth';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import CashierDashboard from './pages/cashier/CashierDashboard';
import PaymentProcess from './pages/cashier/PaymentProcess';
import PaymentHistory from './pages/cashier/PaymentHistory';
import WorkerDashboard from './pages/Worker/WorkerDashboard';
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import { supabase } from './supabaseClient';

import HeroImg1 from './assets/Picture/hero1.jpg';
import HeroImg2 from './assets/Picture/hero2.jpg';
import HeroImg3 from './assets/Picture/hero3.jpg';
import AgentImg1 from './assets/Picture/agent1.jpg';
import AgentImg2 from './assets/Picture/agent2.jpg';
import AgentImg3 from './assets/Picture/agent3.jpg';


function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}


function StatCard({ num, suffix, label, sublabel, icon, delay, animate }) {
  const count = useCounter(num, 1600, animate);
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-number">{animate ? count : 0}{suffix}</div>
      <div className="stat-label">{label}</div>
      {sublabel && <div className="stat-sublabel">{sublabel}</div>}
      <div className="stat-bar" />
    </div>
  );
}


function ServiceCard({ icon, title, desc, index }) {
  return (
    <div className="service-card" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="service-icon-wrap">
        <div className="service-icon">{icon}</div>
        <div className="service-glow" />
      </div>
      <h4 className="service-title">{title}</h4>
      <p className="service-desc">{desc}</p>
      <div className="service-cta">
        <span>Request Quote</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}


function FeaturedServiceCard({ icon, title, desc, price, time, onBook }) {
  return (
    <div className="feat-card">
      <div className="feat-card-icon">{icon}</div>
      <h4 className="feat-card-title">{title}</h4>
      <p className="feat-card-desc">{desc}</p>
      <div className="feat-card-meta">
        <div className="feat-meta-item">
          <span className="feat-meta-label">Starting at</span>
          <span className="feat-meta-value">{price}</span>
        </div>
        <div className="feat-meta-item">
          <Clock size={12} style={{ color: 'var(--slate)' }} />
          <span className="feat-meta-value">{time}</span>
        </div>
      </div>
      <button className="feat-card-btn" onClick={onBook}>
        Book Service <ChevronRight size={14} />
      </button>
    </div>
  );
}


function WhyCard({ icon, title, desc }) {
  return (
    <div className="why-card">
      <div className="why-icon">{icon}</div>
      <h4 className="why-title">{title}</h4>
      <p className="why-desc">{desc}</p>
    </div>
  );
}


function ProjectCard({ img, category, location, date, title }) {
  return (
    <div className="project-card">
      <div className="project-img-wrap">
        <img src={img} alt={title} className="project-img" />
        <div className="project-overlay" />
        <div className="project-category">{category}</div>
      </div>
      <div className="project-body">
        <h4 className="project-title">{title}</h4>
        <div className="project-meta">
          <span className="project-meta-item"><MapPinned size={12} />{location}</span>
          <span className="project-meta-item"><Calendar size={12} />{date}</span>
        </div>
      </div>
    </div>
  );
}


function TestimonialCard({ name, role, text, stars }) {
  return (
    <div className="testi-card">
      <div className="testi-stars">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={14} fill="var(--gold)" color="var(--gold)" />
        ))}
      </div>
      <p className="testi-text">"{text}"</p>
      <div className="testi-author">
        <div className="testi-avatar">{name[0]}</div>
        <div>
          <div className="testi-name">{name}</div>
          <div className="testi-role">{role}</div>
        </div>
      </div>
    </div>
  );
}


function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <ChevronDown size={18} className={`faq-chevron ${open ? 'rotated' : ''}`} />
      </button>
      <div className="faq-body" style={{ maxHeight: open ? '200px' : '0' }}>
        <p className="faq-a">{answer}</p>
      </div>
    </div>
  );
}


function App() {
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [fabOpen, setFabOpen] = useState(false);
  const statsRef = useRef(null);

  const images = [HeroImg1, HeroImg2, HeroImg3];

  const services = [
    { icon: <Cctv size={28} />, title: 'CCTV Installation', desc: 'HD surveillance with AI motion detection and 24/7 mobile access.', category: 'Surveillance' },
    { icon: <Fingerprint size={28} />, title: 'Biometric Access', desc: 'Facial recognition and RFID systems for precision entry control.', category: 'Access Control' },
    { icon: <Siren size={28} />, title: 'Intrusion Alarms', desc: 'Smart sensor networks with instant alerts for unauthorized access.', category: 'Alarm' },
    { icon: <BellRing size={28} />, title: 'Nurse Call Systems', desc: 'Specialized communication for healthcare rapid response needs.', category: 'Healthcare' },
    { icon: <Activity size={28} />, title: 'Fire Detection', desc: 'Integrated fire and smoke alarms with auto suppression controls.', category: 'Fire Safety' },
    { icon: <Settings size={28} />, title: 'System Maintenance', desc: 'Health checks and firmware updates for zero-downtime operations.', category: 'Maintenance' },
  ];

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(serviceSearch.toLowerCase()) || s.desc.toLowerCase().includes(serviceSearch.toLowerCase());
    const matchCat = activeCategory === 'All' || s.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featuredServices = [
    { icon: <Cctv size={32} />, title: 'CCTV Installation', desc: 'Full HD & 4K systems with remote monitoring.', price: '₱8,500', time: '1–2 days' },
    { icon: <Fingerprint size={32} />, title: 'Biometric Access', desc: 'Touchless facial & RFID entry solutions.', price: '₱12,000', time: '1 day' },
    { icon: <Siren size={32} />, title: 'Intrusion Alarm', desc: 'Smart perimeter & motion sensor network.', price: '₱6,000', time: '4–8 hrs' },
  ];

  const whyItems = [
    { icon: <BadgeCheck size={28} />, title: 'Certified Technicians', desc: 'Every installer is licensed, trained, and field-tested for top-quality results.' },
    { icon: <ShieldCheck size={28} />, title: 'Warranty Protection', desc: 'All installations come with full parts & labor warranty for your peace of mind.' },
    { icon: <Headphones size={28} />, title: '24/7 Support', desc: 'Round-the-clock technical assistance — we are always ready when you need us.' },
    { icon: <Package size={28} />, title: 'Quality Equipment', desc: 'We source only from trusted global security brands with proven reliability.' },
    { icon: <Bolt size={28} />, title: 'Fast Installation', desc: 'Efficient deployment without compromising quality — most projects done in a day.' },
    { icon: <Award size={28} />, title: 'Professional Service', desc: 'Enterprise-grade professionalism from consultation to post-installation support.' },
  ];

  const testimonials = [
    { name: 'Maria Santos', role: 'Homeowner, Antipolo', text: 'Riontech installed our CCTV system seamlessly. The team was professional, fast, and the quality is outstanding. Highly recommended!', stars: 5 },
    { name: 'Carlo Reyes', role: 'Business Owner, Marikina', text: 'We upgraded our entire office security with Riontech. The biometric system works flawlessly and their support is always available.', stars: 5 },
    { name: 'Jenny Lim', role: 'Property Manager, Quezon City', text: 'From quotation to installation, everything was smooth. Our residents feel much safer now. Great value for the service.', stars: 5 },
    { name: 'Rodel Cruz', role: 'Clinic Owner, Pasig', text: 'The nurse call system they installed has improved our response times significantly. Very reliable and easy to use.', stars: 5 },
  ];

  const faqs = [
    { question: 'How long does installation take?', answer: 'Most residential CCTV installations are completed within 1–2 days. Larger commercial projects may take 3–5 days depending on scope and site conditions.' },
    { question: 'Do you offer warranty on installations?', answer: 'Yes. All our installations come with a minimum 1-year warranty covering both parts and labor. Extended warranty options are also available.' },
    { question: 'Do you provide ongoing maintenance?', answer: 'Absolutely. We offer scheduled preventive maintenance plans to keep your security systems running at peak performance year-round.' },
    { question: 'What payment methods are accepted?', answer: 'We accept cash, bank transfer (BDO, BPI, UnionBank), GCash, Maya, and installment plans for qualifying projects.' },
  ];

  const coverageAreas = [
    { name: 'Antipolo', type: 'Primary HQ' },
    { name: 'Marikina', type: 'Service Area' },
    { name: 'Pasig', type: 'Service Area' },
    { name: 'Quezon City', type: 'Service Area' },
    { name: 'Makati', type: 'Service Area' },
    { name: 'Taguig', type: 'Service Area' },
    { name: 'Mandaluyong', type: 'Service Area' },
    { name: 'San Juan', type: 'Service Area' },
  ];

  const projects = [
    { img: HeroImg1, category: 'CCTV', location: 'Antipolo City', date: 'May 2025', title: 'Residential Complex Surveillance' },
    { img: HeroImg2, category: 'Biometric', location: 'Marikina', date: 'March 2025', title: 'Corporate HQ Access Control' },
    { img: HeroImg3, category: 'Fire Safety', location: 'Quezon City', date: 'January 2025', title: 'Hospital Fire Detection System' },
  ];

  
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) await fetchUserRole(session.user.id);
      setInitializing(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setSession(session);
      if (session) await fetchUserRole(session.user.id);
      else setUserRole(null);
      setInitializing(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (!error && data) setUserRole(data.role);
    } catch (err) {
      console.error('System error:', err);
    }
  };

 
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % images.length), 4500);
    return () => clearInterval(timer);
  }, [images.length]);

  
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#051F24] flex flex-col items-center justify-center">
        <div className="hexagon-path bg-[#EAB308] w-16 h-18 flex items-center justify-center animate-spin mb-4 shadow-[0_0_30px_rgba(234,179,8,0.5)]">
          <ShieldCheck className="text-[#051F24]" size={32} />
        </div>
        <p className="text-[#EAB308] font-black text-[10px] tracking-[0.6em] uppercase animate-pulse">
          Authenticating System...
        </p>
      </div>
    );
  }

  if (session && userRole === 'admin') return <AdminDashboard onLogout={() => supabase.auth.signOut()} />;
  if (session && userRole === 'manager') return <ManagerDashboard onLogout={() => supabase.auth.signOut()} />;
  if (session && userRole === 'cashier') {
    const onLogout = () => supabase.auth.signOut();
    if (location.pathname === '/cashier/payment-process') return <PaymentProcess onLogout={onLogout} />;
    if (location.pathname === '/cashier/payment-history') return <PaymentHistory onLogout={onLogout} />;
    return <CashierDashboard onLogout={onLogout} />;
  }
  if (session && userRole === 'technician') return <WorkerDashboard onLogout={() => supabase.auth.signOut()} />;
  if (session && userRole === 'customer') return <CustomerDashboard userEmail={session.user.email} onLogout={() => supabase.auth.signOut()} />;

  return (
    <>
      {}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --gold: #E8B000;
          --gold-dim: #C99500;
          --gold-glow: rgba(232,176,0,0.18);
          --ink: #06171A;
          --ink-deep: #030E10;
          --ink-mid: #0C2B30;
          --ink-light: #163640;
          --slate: #8CA8AD;
          --white: #F2F7F8;
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-body);
          background: var(--ink-deep);
          color: var(--white);
          overflow-x: hidden;
        }

        /* ── Top bar ── */
        .top-bar {
          background: var(--ink-deep);
          border-bottom: 1px solid rgba(232,176,0,0.12);
          padding: 8px 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 60;
        }
        .top-bar-badges {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .top-bar-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--slate);
        }
        .top-bar-badge svg { color: var(--gold); flex-shrink: 0; }
        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .top-bar-icon {
          color: var(--slate);
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
        }
        .top-bar-icon:hover { color: var(--gold); transform: scale(1.2); }
        .active-pill {
          background: var(--gold);
          color: var(--ink-deep);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
        }

        /* ── Navbar ── */
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 0 48px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
          border-bottom: 1px solid transparent;
        }
        .navbar.scrolled {
          background: rgba(6,23,26,0.95);
          backdrop-filter: blur(16px);
          border-color: rgba(232,176,0,0.12);
          box-shadow: 0 4px 40px rgba(0,0,0,0.5);
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          text-decoration: none;
        }
        .nav-hex {
          width: 44px; height: 44px;
          background: var(--gold);
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-deep);
          transition: transform 0.8s ease;
        }
        .nav-logo:hover .nav-hex { transform: rotate(360deg); }
        .nav-brand { line-height: 1; }
        .nav-brand-name {
          font-family: var(--font-display);
          font-size: 28px;
          letter-spacing: 0.06em;
          color: var(--white);
        }
        .nav-brand-sub {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: var(--slate);
        }
        .nav-links {
          display: flex;
          gap: 36px;
          list-style: none;
        }
        .nav-links a {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--slate);
          text-decoration: none;
          transition: color 0.2s;
          position: relative;
        }
        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 0; height: 2px;
          background: var(--gold);
          transition: width 0.3s;
        }
        .nav-links a:hover { color: var(--white); }
        .nav-links a:hover::after { width: 100%; }
        .nav-cta {
          background: var(--gold);
          color: var(--ink-deep);
          border: none;
          padding: 10px 26px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          clip-path: polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
          transition: background 0.2s, transform 0.2s;
        }
        .nav-cta:hover { background: var(--white); transform: translateY(-2px); }
        .nav-hamburger {
          display: none;
          background: none;
          border: none;
          color: var(--white);
          cursor: pointer;
        }

        /* ── Hero ── */
        .hero {
          position: relative;
          min-height: 100vh;
          background: var(--ink-deep);
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 60% 40%, rgba(232,176,0,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 50% at 20% 80%, rgba(232,176,0,0.04) 0%, transparent 60%);
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(232,176,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,176,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        }
        .hero-scanline {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.08) 3px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
        }
        .hero-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .hero-eyebrow-line { width: 32px; height: 2px; background: var(--gold); }
        .hero-eyebrow-text {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: var(--gold);
        }
        /* Social proof rating bar */
        .hero-rating-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .hero-stars {
          display: flex;
          gap: 2px;
        }
        .hero-rating-text {
          font-size: 12px;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.05em;
        }
        .hero-rating-divider {
          width: 1px; height: 16px;
          background: rgba(232,176,0,0.3);
        }
        .hero-rating-sub {
          font-size: 11px;
          color: var(--slate);
          letter-spacing: 0.05em;
        }
        .hero-headline {
          font-family: var(--font-display);
          font-size: clamp(64px, 7vw, 100px);
          line-height: 0.92;
          letter-spacing: 0.03em;
          color: var(--white);
          margin-bottom: 20px;
        }
        .hero-headline em {
          font-style: normal;
          color: var(--gold);
          display: block;
        }
        /* Social proof badges under headline */
        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .hero-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(232,176,0,0.08);
          border: 1px solid rgba(232,176,0,0.2);
          padding: 6px 14px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          backdrop-filter: blur(8px);
          transition: background 0.3s;
        }
        .hero-badge:hover { background: rgba(232,176,0,0.15); }
        .hero-sub {
          font-size: 15px;
          font-weight: 400;
          color: var(--slate);
          line-height: 1.7;
          max-width: 420px;
          margin-bottom: 40px;
          border-left: 2px solid rgba(232,176,0,0.3);
          padding-left: 20px;
          font-style: italic;
        }
        .hero-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .hero-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--gold);
          color: var(--ink-deep);
          border: none;
          padding: 14px 32px;
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          clip-path: polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
          transition: background 0.2s, transform 0.25s;
          box-shadow: 0 0 32px rgba(232,176,0,0.25);
        }
        .hero-btn-primary:hover { background: var(--white); transform: translateY(-3px); }
        .hero-btn-primary .arrow { transition: transform 0.25s; }
        .hero-btn-primary:hover .arrow { transform: translateX(4px); }
        .hero-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid rgba(232,176,0,0.3);
          color: var(--gold);
          padding: 13px 26px;
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .hero-btn-ghost:hover {
          background: rgba(232,176,0,0.08);
          border-color: var(--gold);
          color: var(--white);
        }

        /* ── Hero image panel ── */
        .hero-visual {
          position: relative;
          height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-img-main {
          position: relative;
          z-index: 10;
          width: 300px;
          height: 380px;
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          overflow: hidden;
          border: 4px solid var(--gold);
          box-shadow: 0 0 60px rgba(232,176,0,0.2), inset 0 0 20px rgba(232,176,0,0.05);
          animation: floatY 6s ease-in-out infinite;
        }
        .hero-img-main img {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: all 0.8s ease;
          filter: brightness(0.8) saturate(0.7);
        }
        .hero-img-main:hover img { filter: brightness(1) saturate(1); }
        .hero-img-ghost {
          position: absolute;
          top: 10px; right: -20px;
          width: 180px; height: 220px;
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          overflow: hidden;
          opacity: 0.15;
          rotate: 15deg;
          z-index: 5;
          animation: floatY 8s ease-in-out infinite reverse;
        }
        .hero-img-ghost img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); }
        .hero-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(232,176,0,0.15);
          animation: ringPulse 3s ease-in-out infinite;
        }
        .hero-ring-1 { width: 420px; height: 420px; }
        .hero-ring-2 { width: 520px; height: 520px; animation-delay: 0.7s; border-color: rgba(232,176,0,0.08); }
        .hero-corner {
          position: absolute;
          width: 20px; height: 20px;
          border-color: var(--gold);
          border-style: solid;
          opacity: 0.5;
        }
        .hero-corner-tl { top: 60px; left: 60px; border-width: 2px 0 0 2px; }
        .hero-corner-tr { top: 60px; right: 60px; border-width: 2px 2px 0 0; }
        .hero-corner-bl { bottom: 60px; left: 60px; border-width: 0 0 2px 2px; }
        .hero-corner-br { bottom: 60px; right: 60px; border-width: 0 2px 2px 0; }

        /* ── Why Choose Us ── */
        .why-section {
          padding: 100px 48px;
          max-width: 1280px;
          margin: 0 auto;
        }
        .why-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 56px;
        }
        .why-card {
          background: rgba(12,43,48,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232,176,0,0.12);
          padding: 36px 32px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.35s, transform 0.35s, box-shadow 0.35s;
          cursor: default;
        }
        .why-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(232,176,0,0.06), transparent 60%);
          opacity: 0;
          transition: opacity 0.35s;
        }
        .why-card:hover {
          border-color: rgba(232,176,0,0.4);
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,176,0,0.1);
        }
        .why-card:hover::before { opacity: 1; }
        .why-icon {
          width: 54px; height: 54px;
          background: var(--ink-light);
          border: 1px solid rgba(232,176,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
          margin-bottom: 20px;
          transition: background 0.3s, color 0.3s;
        }
        .why-card:hover .why-icon {
          background: var(--gold);
          color: var(--ink-deep);
        }
        .why-title {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.05em;
          color: var(--white);
          margin-bottom: 10px;
          transition: color 0.3s;
        }
        .why-card:hover .why-title { color: var(--gold); }
        .why-desc {
          font-size: 13px;
          line-height: 1.75;
          color: var(--slate);
        }

        /* ── Stats ── */
        .stats-section {
          padding: 0 48px;
          margin-top: -44px;
          position: relative;
          z-index: 20;
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
          background: rgba(232,176,0,0.12);
          border: 1px solid rgba(232,176,0,0.15);
        }
        .stat-card {
          background: var(--ink-deep);
          padding: 36px 28px;
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: fadeUp 0.6s ease both;
          transition: background 0.3s;
        }
        .stat-card:hover { background: var(--ink-mid); }
        .stat-icon-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
          color: rgba(232,176,0,0.4);
        }
        .stat-number {
          font-family: var(--font-display);
          font-size: 52px;
          letter-spacing: 0.04em;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: var(--white);
          margin-bottom: 4px;
        }
        .stat-sublabel {
          font-size: 9px;
          color: var(--slate);
          letter-spacing: 0.15em;
        }
        .stat-bar {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          width: 0;
          background: var(--gold);
          transition: width 1.2s ease;
        }
        .stat-card:hover .stat-bar { width: 100%; }

        /* ── Featured Services ── */
        .feat-section {
          padding: 100px 48px;
          background: var(--ink-mid);
          position: relative;
        }
        .feat-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
        }
        .feat-section-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .feat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 56px;
        }
        .feat-card {
          background: rgba(6,23,26,0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(232,176,0,0.12);
          padding: 40px 32px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.35s, transform 0.35s, box-shadow 0.35s;
        }
        .feat-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--gold), transparent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }
        .feat-card:hover {
          border-color: rgba(232,176,0,0.35);
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .feat-card:hover::after { transform: scaleX(1); }
        .feat-card-icon {
          width: 64px; height: 64px;
          background: var(--ink-light);
          border: 1px solid rgba(232,176,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          margin-bottom: 24px;
          transition: background 0.3s;
        }
        .feat-card:hover .feat-card-icon {
          background: var(--gold);
          color: var(--ink-deep);
        }
        .feat-card-title {
          font-family: var(--font-display);
          font-size: 26px;
          letter-spacing: 0.05em;
          color: var(--white);
          margin-bottom: 12px;
          transition: color 0.3s;
        }
        .feat-card:hover .feat-card-title { color: var(--gold); }
        .feat-card-desc {
          font-size: 13px;
          line-height: 1.7;
          color: var(--slate);
          margin-bottom: 24px;
        }
        .feat-card-meta {
          display: flex;
          gap: 20px;
          margin-bottom: 28px;
          padding-top: 16px;
          border-top: 1px solid rgba(232,176,0,0.1);
        }
        .feat-meta-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .feat-meta-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--slate);
        }
        .feat-meta-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--gold);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .feat-card-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--gold);
          color: var(--ink-deep);
          border: none;
          padding: 11px 22px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          clip-path: polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
          transition: background 0.2s, transform 0.2s;
        }
        .feat-card-btn:hover { background: var(--white); transform: translateX(3px); }

        /* ── Services ── */
        .services-section {
          padding: 120px 48px;
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
        }
        .section-header { margin-bottom: 48px; }
        .section-eyebrow {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .section-eyebrow-line { width: 40px; height: 1px; background: var(--gold); }
        .section-eyebrow-text {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .section-title {
          font-family: var(--font-display);
          font-size: clamp(44px, 5vw, 72px);
          letter-spacing: 0.04em;
          line-height: 0.95;
          color: var(--white);
        }
        .section-title em {
          font-style: normal;
          color: transparent;
          -webkit-text-stroke: 1px var(--gold);
        }

        /* Service filters */
        .service-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 36px;
        }
        .service-search {
          flex: 1;
          min-width: 220px;
          background: var(--ink-mid);
          border: 1px solid rgba(232,176,0,0.15);
          color: var(--white);
          padding: 11px 18px;
          font-family: var(--font-body);
          font-size: 13px;
          outline: none;
          transition: border-color 0.3s;
        }
        .service-search::placeholder { color: var(--slate); }
        .service-search:focus { border-color: var(--gold); }
        .service-cats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .service-cat-btn {
          background: none;
          border: 1px solid rgba(232,176,0,0.2);
          color: var(--slate);
          padding: 7px 16px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
        }
        .service-cat-btn:hover, .service-cat-btn.active {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--ink-deep);
        }
        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(232,176,0,0.08);
          border: 1px solid rgba(232,176,0,0.08);
        }
        .service-card {
          background: var(--ink-deep);
          padding: 40px 36px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          animation: fadeUp 0.5s ease both;
          transition: background 0.3s;
        }
        .service-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 2px;
          height: 0;
          background: var(--gold);
          transition: height 0.4s ease;
        }
        .service-card:hover { background: var(--ink-mid); }
        .service-card:hover::before { height: 100%; }
        .service-icon-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 28px;
        }
        .service-icon {
          width: 56px; height: 56px;
          background: var(--ink-light);
          border: 1px solid rgba(232,176,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
          clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
          transition: background 0.3s, transform 0.3s;
        }
        .service-card:hover .service-icon {
          background: var(--gold);
          color: var(--ink-deep);
          transform: scale(1.1) rotate(10deg);
        }
        .service-glow {
          position: absolute;
          inset: -6px;
          background: radial-gradient(circle, rgba(232,176,0,0.15), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .service-card:hover .service-glow { opacity: 1; }
        .service-title {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.06em;
          color: var(--white);
          margin-bottom: 12px;
          transition: color 0.3s;
        }
        .service-card:hover .service-title { color: var(--gold); }
        .service-desc {
          font-size: 13px;
          line-height: 1.75;
          color: var(--slate);
          margin-bottom: 24px;
        }
        .service-cta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--gold);
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.3s, transform 0.3s;
        }
        .service-card:hover .service-cta { opacity: 1; transform: translateX(0); }

        /* ── Projects ── */
        .projects-section {
          padding: 100px 48px;
          background: var(--ink-mid);
          position: relative;
        }
        .projects-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,176,0,0.4), transparent);
        }
        .projects-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .projects-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 56px;
        }
        .project-card {
          background: var(--ink-deep);
          border: 1px solid rgba(232,176,0,0.1);
          overflow: hidden;
          transition: border-color 0.35s, transform 0.35s, box-shadow 0.35s;
        }
        .project-card:hover {
          border-color: rgba(232,176,0,0.4);
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        }
        .project-img-wrap {
          position: relative;
          height: 220px;
          overflow: hidden;
        }
        .project-img {
          width: 100%; height: 100%;
          object-fit: cover;
          filter: brightness(0.7) saturate(0.6);
          transition: filter 0.5s, transform 0.5s;
        }
        .project-card:hover .project-img {
          filter: brightness(0.9) saturate(0.9);
          transform: scale(1.05);
        }
        .project-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(3,14,16,0.8), transparent 50%);
        }
        .project-category {
          position: absolute;
          top: 16px; left: 16px;
          background: var(--gold);
          color: var(--ink-deep);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          padding: 4px 12px;
        }
        .project-body {
          padding: 24px 28px;
        }
        .project-title {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.05em;
          color: var(--white);
          margin-bottom: 12px;
          transition: color 0.3s;
        }
        .project-card:hover .project-title { color: var(--gold); }
        .project-meta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .project-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--slate);
          letter-spacing: 0.05em;
        }
        .project-meta-item svg { color: var(--gold); flex-shrink: 0; }

        /* ── Testimonials ── */
        .testi-section {
          padding: 100px 48px;
          max-width: 1280px;
          margin: 0 auto;
          overflow: hidden;
        }
        .testi-track-wrap {
          overflow: hidden;
          margin-top: 56px;
          position: relative;
        }
        .testi-track-wrap::before,
        .testi-track-wrap::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          z-index: 2;
          pointer-events: none;
        }
        .testi-track-wrap::before {
          left: 0;
          background: linear-gradient(to right, var(--ink-deep), transparent);
        }
        .testi-track-wrap::after {
          right: 0;
          background: linear-gradient(to left, var(--ink-deep), transparent);
        }
        .testi-track {
          display: flex;
          gap: 24px;
          animation: scrollTrack 28s linear infinite;
          width: max-content;
        }
        .testi-track:hover { animation-play-state: paused; }
        @keyframes scrollTrack {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .testi-card {
          background: rgba(12,43,48,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232,176,0,0.12);
          padding: 32px 28px;
          width: 340px;
          flex-shrink: 0;
          transition: border-color 0.3s;
        }
        .testi-card:hover { border-color: rgba(232,176,0,0.35); }
        .testi-stars {
          display: flex;
          gap: 3px;
          margin-bottom: 16px;
        }
        .testi-text {
          font-size: 14px;
          line-height: 1.75;
          color: var(--slate);
          margin-bottom: 24px;
          font-style: italic;
        }
        .testi-author {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .testi-avatar {
          width: 44px; height: 44px;
          background: var(--gold);
          color: var(--ink-deep);
          font-family: var(--font-display);
          font-size: 22px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .testi-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--white);
          letter-spacing: 0.05em;
        }
        .testi-role {
          font-size: 10px;
          color: var(--slate);
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        /* ── FAQ ── */
        .faq-section {
          padding: 100px 48px;
          background: var(--ink-mid);
          position: relative;
        }
        .faq-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,176,0,0.4), transparent);
        }
        .faq-inner {
          max-width: 860px;
          margin: 0 auto;
        }
        .faq-list {
          margin-top: 56px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: rgba(232,176,0,0.08);
          border: 1px solid rgba(232,176,0,0.08);
        }
        .faq-item {
          background: var(--ink-deep);
          overflow: hidden;
          transition: background 0.3s;
        }
        .faq-item.faq-open { background: var(--ink-mid); }
        .faq-q {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          background: none;
          border: none;
          color: var(--white);
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          text-align: left;
          gap: 16px;
          transition: color 0.3s;
        }
        .faq-open .faq-q { color: var(--gold); }
        .faq-chevron {
          flex-shrink: 0;
          color: var(--gold);
          transition: transform 0.3s;
        }
        .faq-chevron.rotated { transform: rotate(180deg); }
        .faq-body {
          overflow: hidden;
          transition: max-height 0.4s ease;
        }
        .faq-a {
          padding: 0 28px 24px;
          font-size: 14px;
          line-height: 1.75;
          color: var(--slate);
        }

        /* ── Coverage ── */
        .coverage-section {
          padding: 100px 48px;
          max-width: 1280px;
          margin: 0 auto;
        }
        .coverage-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 56px;
        }
        .coverage-card {
          background: rgba(12,43,48,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232,176,0,0.1);
          padding: 28px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: border-color 0.35s, transform 0.35s;
        }
        .coverage-card:hover {
          border-color: rgba(232,176,0,0.4);
          transform: translateY(-4px);
        }
        .coverage-card.primary { border-color: rgba(232,176,0,0.3); }
        .coverage-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--gold);
          margin: 0 auto 14px;
          animation: pulseDot 2s ease-in-out infinite;
        }
        .coverage-card.primary .coverage-dot {
          box-shadow: 0 0 12px rgba(232,176,0,0.6);
        }
        @keyframes pulseDot {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        .coverage-name {
          font-family: var(--font-display);
          font-size: 22px;
          letter-spacing: 0.05em;
          color: var(--white);
          margin-bottom: 6px;
          transition: color 0.3s;
        }
        .coverage-card:hover .coverage-name { color: var(--gold); }
        .coverage-type {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: var(--slate);
        }
        .coverage-card.primary .coverage-type { color: var(--gold); }

        /* ── Contact ── */
        .contact-section {
          padding: 120px 48px;
          background: var(--ink-deep);
          position: relative;
        }
        .contact-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,176,0,0.4), transparent);
        }
        .contact-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 5fr 7fr;
          border: 1px solid rgba(232,176,0,0.12);
          overflow: hidden;
        }
        .contact-info {
          background: var(--ink-mid);
          padding: 64px 56px;
        }
        .contact-title {
          font-family: var(--font-display);
          font-size: 56px;
          letter-spacing: 0.05em;
          color: var(--gold);
          margin-bottom: 12px;
          line-height: 0.95;
        }
        .contact-subtitle {
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--slate);
          margin-bottom: 48px;
        }
        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 32px;
          padding: 20px;
          border: 1px solid rgba(232,176,0,0.07);
          background: rgba(6,23,26,0.4);
          backdrop-filter: blur(8px);
          transition: border-color 0.3s, background 0.3s;
        }
        .contact-item:hover {
          border-color: rgba(232,176,0,0.25);
          background: rgba(6,23,26,0.7);
        }
        .contact-icon-box {
          width: 48px; height: 48px;
          flex-shrink: 0;
          background: var(--ink-light);
          border: 1px solid rgba(232,176,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--gold);
          transition: background 0.3s, border-color 0.3s;
        }
        .contact-item:hover .contact-icon-box {
          background: var(--gold);
          color: var(--ink-deep);
          border-color: var(--gold);
        }
        .contact-item-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--slate);
          margin-bottom: 6px;
        }
        .contact-item-value {
          font-size: 14px;
          font-weight: 500;
          color: var(--white);
          transition: color 0.3s;
          line-height: 1.5;
        }
        .contact-item:hover .contact-item-value { color: var(--gold); }
        .contact-map {
          position: relative;
          background: var(--ink);
          min-height: 480px;
        }
        .contact-map iframe {
          width: 100%; height: 100%;
          border: none;
          filter: grayscale(1) brightness(0.4) contrast(1.2);
          transition: filter 1s;
        }
        .contact-map:hover iframe { filter: grayscale(0.3) brightness(0.6); }
        .contact-map-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(to right, var(--ink-mid) 0%, transparent 30%),
            linear-gradient(to top, var(--ink-mid) 0%, transparent 30%);
        }

        /* ── Footer ── */
        .footer {
          background: var(--ink-deep);
          border-top: 1px solid rgba(232,176,0,0.1);
          padding: 28px 48px;
          text-align: center;
        }
        .footer-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.55em;
          text-transform: uppercase;
          color: rgba(140,168,173,0.4);
        }

        /* ── Mobile nav ── */
        .mobile-nav {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(3,14,16,0.98);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.77, 0, 0.175, 1);
        }
        .mobile-nav.open { transform: translateX(0); }
        .mobile-nav a {
          font-family: var(--font-display);
          font-size: 48px;
          letter-spacing: 0.05em;
          color: var(--white);
          text-decoration: none;
          transition: color 0.2s;
        }
        .mobile-nav a:hover { color: var(--gold); }
        .mobile-nav-close {
          position: absolute;
          top: 24px; right: 24px;
          background: none;
          border: none;
          color: var(--gold);
          cursor: pointer;
        }

        /* ── FAB ── */
        .fab-wrap {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 90;
          display: flex;
          flex-direction: column-reverse;
          align-items: flex-end;
          gap: 12px;
        }
        .fab-main {
          width: 56px; height: 56px;
          background: var(--gold);
          color: var(--ink-deep);
          border: none;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 32px rgba(232,176,0,0.4);
          transition: background 0.2s, transform 0.2s;
          z-index: 2;
        }
        .fab-main:hover { background: var(--white); transform: scale(1.1); }
        .fab-main-icon {
          transition: transform 0.3s;
        }
        .fab-main-icon.rotated { transform: rotate(45deg); }
        .fab-action {
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(12px) scale(0.9);
          transition: opacity 0.25s, transform 0.25s;
          pointer-events: none;
        }
        .fab-action.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .fab-action:nth-child(2) { transition-delay: 0.05s; }
        .fab-action:nth-child(3) { transition-delay: 0.1s; }
        .fab-action:nth-child(4) { transition-delay: 0.15s; }
        .fab-action-label {
          background: var(--ink-mid);
          border: 1px solid rgba(232,176,0,0.2);
          color: var(--white);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 6px 14px;
          white-space: nowrap;
        }
        .fab-action-btn {
          width: 46px; height: 46px;
          border-radius: 50%;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .fab-action-btn:hover { transform: scale(1.12); }
        .fab-call { background: #22c55e; color: #fff; }
        .fab-msg  { background: #1877f2; color: #fff; }
        .fab-book { background: var(--gold); color: var(--ink-deep); }

        /* ── Keyframes ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes floatY {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-16px); }
        }
        @keyframes ringPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.4; transform: scale(1.04); }
        }
        @keyframes scanline { from { top: -2px; } to { top: 100%; } }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .services-grid { grid-template-columns: repeat(2, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); }
          .feat-grid { grid-template-columns: repeat(2, 1fr); }
          .projects-grid { grid-template-columns: repeat(2, 1fr); }
          .coverage-grid { grid-template-columns: repeat(4, 1fr); }
          .contact-inner { grid-template-columns: 1fr; }
          .contact-map { min-height: 340px; }
          .hero-container { grid-template-columns: 1fr; text-align: center; }
          .hero-visual { display: none; }
          .hero-sub { max-width: 100%; }
          .hero-actions { justify-content: center; }
          .hero-badges { justify-content: center; }
          .hero-rating-bar { justify-content: center; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .top-bar { display: none; }
          .nav-links { display: none; }
          .nav-hamburger { display: flex; }
          .navbar { padding: 0 24px; }
          .hero-container, .services-section, .contact-info, .footer { padding-left: 24px; padding-right: 24px; }
          .contact-section, .stats-section, .why-section, .feat-section, .projects-section,
          .testi-section, .faq-section, .coverage-section { padding-left: 24px; padding-right: 24px; }
          .services-grid, .why-grid, .feat-grid, .projects-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .coverage-grid { grid-template-columns: repeat(2, 1fr); }
          .fab-wrap { bottom: 20px; right: 20px; }
          .testi-card { width: 280px; }
        }
      `}</style>

      <Auth isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {}
      <div className={`mobile-nav ${mobileNavOpen ? 'open' : ''}`}>
        <button className="mobile-nav-close" onClick={() => setMobileNavOpen(false)}>
          <XIcon size={28} />
        </button>
        <a href="#services" onClick={() => setMobileNavOpen(false)}>Services</a>
        <a href="#projects" onClick={() => setMobileNavOpen(false)}>Projects</a>
        <a href="#contact" onClick={() => setMobileNavOpen(false)}>Contact</a>
        <button className="nav-cta" onClick={() => { setMobileNavOpen(false); setIsAuthOpen(true); }}>
          Access Portal
        </button>
      </div>

      {}
      <div className="top-bar">
        <div className="top-bar-badges">
          <div className="top-bar-badge"><CheckCircle2 size={11} /><span>24/7 Technical Support</span></div>
          <div className="top-bar-badge"><BadgeCheck size={11} /><span>Certified Installation Team</span></div>
          <div className="top-bar-badge"><ShieldCheck size={11} /><span>Warranty Coverage</span></div>
          <div className="top-bar-badge"><Zap size={11} /><span>Fast Response Service</span></div>
        </div>
        <div className="top-bar-right">
          <Facebook size={14} className="top-bar-icon" />
          <Instagram size={14} className="top-bar-icon" />
          <span className="active-pill">Active 24/7</span>
        </div>
      </div>

      {}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <a href="#" className="nav-logo">
          <div className="nav-hex"><ShieldCheck size={22} /></div>
          <div className="nav-brand">
            <div className="nav-brand-name">Riontech</div>
            <div className="nav-brand-sub">Security Services</div>
          </div>
        </a>
        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <button className="nav-cta" onClick={() => setIsAuthOpen(true)}>
          Access Portal
        </button>
        <button className="nav-hamburger" onClick={() => setMobileNavOpen(true)}>
          <Menu size={26} />
        </button>
      </nav>

      {}
      <header className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-scanline" />
        <div className="hero-container">
          <div>
            {}
            <div className="hero-rating-bar">
              <div className="hero-stars">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="var(--gold)" color="var(--gold)" />)}
              </div>
              <span className="hero-rating-text">4.9 Customer Rating</span>
              <div className="hero-rating-divider" />
              <span className="hero-rating-sub">1,200+ Installations</span>
              <div className="hero-rating-divider" />
              <span className="hero-rating-sub">Trusted by Homes & Businesses</span>
            </div>

            <div className="hero-eyebrow">
              <div className="hero-eyebrow-line" />
              <span className="hero-eyebrow-text">Security Excellence</span>
            </div>

            <h1 className="hero-headline">
              Modernizing<br />
              <em>Security</em>
              For A Safer Future
            </h1>

            {}
            <div className="hero-badges">
              <div className="hero-badge"><BadgeCheck size={12} />Certified Team</div>
              <div className="hero-badge"><ShieldCheck size={12} />Warranty Included</div>
              <div className="hero-badge"><Headphones size={12} />24/7 Support</div>
            </div>

            <p className="hero-sub">
              "Innovative & cost-efficient solutions tailored to your specific safety needs."
            </p>

            <div className="hero-actions">
              <button className="hero-btn-primary" onClick={() => setIsAuthOpen(true)}>
                Get Started <ChevronRight size={16} className="arrow" />
              </button>
              <a href="#services" className="hero-btn-ghost">
                Our Services
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-ring hero-ring-1" />
            <div className="hero-ring hero-ring-2" />
            <div className="hero-corner hero-corner-tl" />
            <div className="hero-corner hero-corner-tr" />
            <div className="hero-corner hero-corner-bl" />
            <div className="hero-corner hero-corner-br" />
            <div className="hero-img-ghost">
              <img src={images[(currentSlide + 1) % images.length]} alt="" />
            </div>
            <div className="hero-img-main">
              <img src={images[currentSlide]} alt="Security" key={currentSlide} />
            </div>
          </div>
        </div>
      </header>

      {}
      <section ref={statsRef} className="stats-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="stats-grid">
          <StatCard num={1200} suffix="+" label="Completed Projects" sublabel="Across Metro Manila" icon={<Building2 size={20} />} delay={0} animate={statsVisible} />
          <StatCard num={980} suffix="+" label="Active Customers" sublabel="Homes & Businesses" icon={<Home size={20} />} delay={100} animate={statsVisible} />
          <StatCard num={24} suffix="/7" label="Support Availability" sublabel="Always Ready" icon={<Headphones size={20} />} delay={200} animate={statsVisible} />
          <StatCard num={5} suffix="yr+" label="Years Experience" sublabel="Field-proven Expertise" icon={<Award size={20} />} delay={300} animate={statsVisible} />
        </div>
      </section>

      {}
      <section className="why-section">
        <div className="section-header">
          <div className="section-eyebrow">
            <div className="section-eyebrow-line" />
            <span className="section-eyebrow-text">Our Edge</span>
          </div>
          <h2 className="section-title">Why Choose <em>Riontech</em></h2>
        </div>
        <div className="why-grid">
          {whyItems.map((w, i) => (
            <WhyCard key={i} icon={w.icon} title={w.title} desc={w.desc} />
          ))}
        </div>
      </section>

      {}
      <section className="feat-section">
        <div className="feat-section-inner">
          <div className="section-header">
            <div className="section-eyebrow">
              <div className="section-eyebrow-line" />
              <span className="section-eyebrow-text">Top Picks</span>
            </div>
            <h2 className="section-title">Most Requested <em>Services</em></h2>
          </div>
          <div className="feat-grid">
            {featuredServices.map((s, i) => (
              <FeaturedServiceCard
                key={i}
                icon={s.icon}
                title={s.title}
                desc={s.desc}
                price={s.price}
                time={s.time}
                onBook={() => setIsAuthOpen(true)}
              />
            ))}
          </div>
        </div>
      </section>

      {}
      <section id="services" className="services-section">
        <div className="section-header">
          <div className="section-eyebrow">
            <div className="section-eyebrow-line" />
            <span className="section-eyebrow-text">Our Specialties</span>
          </div>
          <h2 className="section-title">Our Core <em>Solutions</em></h2>
        </div>

        <div className="service-controls">
          <input
            className="service-search"
            type="text"
            placeholder="Search services…"
            value={serviceSearch}
            onChange={e => setServiceSearch(e.target.value)}
          />
          <div className="service-cats">
            {categories.map(c => (
              <button
                key={c}
                className={`service-cat-btn ${activeCategory === c ? 'active' : ''}`}
                onClick={() => setActiveCategory(c)}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="services-grid">
          {filteredServices.map((s, i) => (
            <ServiceCard key={i} icon={s.icon} title={s.title} desc={s.desc} index={i} />
          ))}
        </div>
      </section>

      {}
      <section id="projects" className="projects-section">
        <div className="projects-inner">
          <div className="section-header">
            <div className="section-eyebrow">
              <div className="section-eyebrow-line" />
              <span className="section-eyebrow-text">Our Work</span>
            </div>
            <h2 className="section-title">Recent Projects <em>& Installations</em></h2>
          </div>
          <div className="projects-grid">
            {projects.map((p, i) => (
              <ProjectCard key={i} img={p.img} category={p.category} location={p.location} date={p.date} title={p.title} />
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="testi-section">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
            <div className="section-eyebrow-line" />
            <span className="section-eyebrow-text">Client Feedback</span>
            <div className="section-eyebrow-line" />
          </div>
          <h2 className="section-title">What Our <em>Clients Say</em></h2>
        </div>
        <div className="testi-track-wrap">
          {}
          <div className="testi-track">
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={i} name={t.name} role={t.role} text={t.text} stars={t.stars} />
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="faq-section">
        <div className="faq-inner">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
              <div className="section-eyebrow-line" />
              <span className="section-eyebrow-text">Common Questions</span>
              <div className="section-eyebrow-line" />
            </div>
            <h2 className="section-title">Frequently <em>Asked</em></h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <FaqItem key={i} question={f.question} answer={f.answer} />
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="coverage-section">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
            <div className="section-eyebrow-line" />
            <span className="section-eyebrow-text">Where We Operate</span>
            <div className="section-eyebrow-line" />
          </div>
          <h2 className="section-title">Service <em>Coverage</em></h2>
        </div>
        <div className="coverage-grid">
          {coverageAreas.map((a, i) => (
            <div key={i} className={`coverage-card ${a.type === 'Primary HQ' ? 'primary' : ''}`}>
              <div className="coverage-dot" />
              <div className="coverage-name">{a.name}</div>
              <div className="coverage-type">{a.type}</div>
            </div>
          ))}
        </div>
      </section>

      {}
      <section id="contact" className="contact-section">
        <div className="contact-inner">
          <div className="contact-info">
            <h2 className="contact-title">Get In<br />Touch</h2>
            <p className="contact-subtitle">We respond within 24 hours</p>
            <div className="contact-item">
              <div className="contact-icon-box"><Phone size={22} /></div>
              <div>
                <p className="contact-item-label">Direct Line</p>
                <p className="contact-item-value" style={{ fontSize: '22px', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                  0995-357-9907
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon-box"><Mail size={22} /></div>
              <div>
                <p className="contact-item-label">Email</p>
                <p className="contact-item-value" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                  riontechsss012524@gmail.com
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon-box"><MapPin size={22} /></div>
              <div>
                <p className="contact-item-label">Location</p>
                <p className="contact-item-value" style={{ fontSize: '13px' }}>
                  Lot 38-A Block 30 Peñafrancia Subd.<br />
                  Brgy. Cupang, Antipolo City
                </p>
              </div>
            </div>
          </div>
          <div className="contact-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.972346765725!2d121.1192!3d14.6125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b96000000001%3A0x0!2zMTTCsDM2JzQ1LjAiTiAxMjHCsDA3JzA5LjEiRQ!5e0!3m2!1sen!2sph!4v1710000000000"
              allowFullScreen=""
              loading="lazy"
              title="Riontech Map"
            />
            <div className="contact-map-overlay" />
          </div>
        </div>
      </section>

      {}
      <footer className="footer">
        <p className="footer-text">© 2026 Riontech Security System Services — All Rights Reserved</p>
      </footer>

      {}
      <div className="fab-wrap">
        <button className="fab-main" onClick={() => setFabOpen(o => !o)}>
          <XIcon size={22} className={`fab-main-icon ${fabOpen ? 'rotated' : ''}`}
            style={{ display: fabOpen ? 'block' : 'none' }} />
          <MessageCircle size={22} style={{ display: fabOpen ? 'none' : 'block' }} />
        </button>
        <div className={`fab-action ${fabOpen ? 'visible' : ''}`}>
          <span className="fab-action-label">Book Service</span>
          <button className="fab-action-btn fab-book" onClick={() => { setFabOpen(false); setIsAuthOpen(true); }}>
            <Send size={18} />
          </button>
        </div>
        <div className={`fab-action ${fabOpen ? 'visible' : ''}`}>
          <span className="fab-action-label">Messenger</span>
          <button className="fab-action-btn fab-msg" onClick={() => window.open('https://m.me/', '_blank')}>
            <MessageCircle size={18} />
          </button>
        </div>
        <div className={`fab-action ${fabOpen ? 'visible' : ''}`}>
          <span className="fab-action-label">Call Us</span>
          <button className="fab-action-btn fab-call" onClick={() => window.open('tel:09953579907', '_self')}>
            <Phone size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
