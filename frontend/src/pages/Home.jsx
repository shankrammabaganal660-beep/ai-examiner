import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Zap, Shield, BarChart3, FileText, Users, ChevronRight,
  Star, ArrowRight, CheckCircle, Sparkles, GraduationCap, BookOpen
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'Gemini AI Evaluation', desc: 'State-of-the-art semantic analysis powered by Google Gemini AI for contextual answer understanding.', color: 'from-violet-500 to-purple-600' },
  { icon: FileText, title: 'OCR Handwriting', desc: 'Advanced EasyOCR engine extracts handwritten text from PDFs and images with high accuracy.', color: 'from-blue-500 to-cyan-600' },
  { icon: Shield, title: 'Identity Masking', desc: 'Blind evaluation ensures complete fairness — examiners never see student names or IDs.', color: 'from-emerald-500 to-teal-600' },
  { icon: BarChart3, title: 'Deep Analytics', desc: 'Interactive dashboards with performance trends, rankings, and AI-generated insights.', color: 'from-orange-500 to-amber-600' },
  { icon: Zap, title: 'Instant Results', desc: 'AI evaluates answer sheets in seconds and auto-generates detailed feedback reports.', color: 'from-pink-500 to-rose-600' },
  { icon: Users, title: 'Multi-Role Platform', desc: 'Tailored dashboards for admins, teachers, examiners, and students.', color: 'from-indigo-500 to-blue-600' },
];

const STATS = [
  { value: '99.2%', label: 'OCR Accuracy' },
  { value: '<30s', label: 'Evaluation Time' },
  { value: '10K+', label: 'Sheets Evaluated' },
  { value: '100%', label: 'Blind Grading' },
];

const ROLES = [
  { role: 'student', label: 'Student', icon: GraduationCap, desc: 'Submit exams & track progress', color: 'from-blue-500 to-cyan-500', loginPath: '/login/student', registerPath: '/register/student' },
  { role: 'teacher', label: 'Teacher', icon: BookOpen, desc: 'Create exams & review evaluations', color: 'from-violet-500 to-purple-500', loginPath: '/login/teacher', registerPath: '/register/teacher' },
  { role: 'admin', label: 'Admin', icon: Shield, desc: 'Manage the entire platform', color: 'from-rose-500 to-pink-500', loginPath: '/login/admin', registerPath: null },
];

const AnimatedCounter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const num = parseFloat(target.replace(/[^0-9.]/g, ''));
    let start = 0;
    const step = num / 50;
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.round(start * 10) / 10);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  const prefix = target.startsWith('<') ? '<' : '';
  const sfx = target.endsWith('%') ? '%' : target.endsWith('+') ? '+' : target.endsWith('s') ? 's' : '';
  return <span>{prefix}{count}{sfx}</span>;
};

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow-primary">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg gradient-text">AI Examiner</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth/role')} className="btn-ghost text-sm">Sign In</button>
            <button onClick={() => navigate('/auth/role')} className="btn-primary text-sm">Get Started</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl animate-pulse-slow" style={{ background: 'radial-gradient(circle, #5865f2, transparent)' }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl animate-pulse-slow" style={{ background: 'radial-gradient(circle, #ff1fb4, transparent)', animationDelay: '1.5s' }} />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 badge-primary">
              <Sparkles className="w-3.5 h-3.5" /> Powered by Google Gemini AI + EasyOCR
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
              <span className="gradient-text">AI-Powered</span><br />
              <span className="text-gray-100">Examination Platform</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Automatically evaluate handwritten answer sheets with advanced OCR and Gemini AI.
              Save hours, ensure fairness, and deliver detailed feedback instantly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/auth/role')} className="btn-primary px-8 py-3.5 text-base">
                Start Evaluating <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/auth/role')} className="btn-outline px-8 py-3.5 text-base">
                View Demo
              </button>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="max-w-3xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div key={i} className="card text-center py-5">
              <div className="font-display text-2xl font-bold gradient-text"><AnimatedCounter target={stat.value} /></div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-100 mb-4">Everything You Need</h2>
            <p className="text-gray-400 max-w-xl mx-auto">A complete suite of tools for modern examination management</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card-hover group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Login CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-gray-100 mb-3">Choose Your Role</h2>
            <p className="text-gray-400">Access your personalized dashboard</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card-hover text-center group">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  <r.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-100 text-lg mb-1">{r.label}</h3>
                <p className="text-sm text-gray-400 mb-6">{r.desc}</p>
                <div className="flex flex-col gap-2">
                  <Link to={r.loginPath} className="btn-primary text-sm w-full justify-center">Sign In</Link>
                  {r.registerPath && <Link to={r.registerPath} className="btn-ghost text-sm w-full justify-center">Register</Link>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t py-8 px-6 text-center text-xs text-gray-600" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-gray-400">AI Examiner</span>
        </div>
        <p>© 2024 AI Examiner. Built with Google Gemini AI + EasyOCR. Enterprise-grade evaluation platform.</p>
      </footer>
    </div>
  );
}
