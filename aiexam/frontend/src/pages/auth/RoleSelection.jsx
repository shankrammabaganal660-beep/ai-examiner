import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, GraduationCap, BookOpen, Shield, ArrowLeft } from 'lucide-react';

const ROLES = [
  { role: 'student', label: 'Student', icon: GraduationCap, desc: 'Submit answer sheets, track results, view AI feedback', color: 'from-blue-500 to-cyan-500', loginPath: '/login/student', registerPath: '/register/student' },
  { role: 'teacher', label: 'Teacher / Examiner', icon: BookOpen, desc: 'Create exams, manage submissions, review AI evaluations', color: 'from-violet-500 to-purple-500', loginPath: '/login/teacher', registerPath: '/register/teacher' },
  { role: 'admin', label: 'Administrator', icon: Shield, desc: 'Manage platform, users, departments, and system settings', color: 'from-rose-500 to-pink-500', loginPath: '/login/admin', registerPath: null },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl relative">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-100 mb-2">Select Your Role</h1>
          <p className="text-gray-400 text-sm">Choose how you want to access AI Examiner</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROLES.map((r, i) => (
            <motion.div key={r.role} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="card-hover text-center cursor-default">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.color} flex items-center justify-center mx-auto mb-4 shadow-xl`}>
                <r.icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-bold text-gray-100 mb-1">{r.label}</h2>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">{r.desc}</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(r.loginPath)} className="btn-primary text-xs">Sign In</button>
                {r.registerPath && <button onClick={() => navigate(r.registerPath)} className="btn-ghost text-xs">Create Account</button>}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
