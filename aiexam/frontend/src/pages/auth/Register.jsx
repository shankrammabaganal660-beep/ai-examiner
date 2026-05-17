import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const ROLE_META = {
  student: { label: 'Student', color: 'from-blue-500 to-cyan-500', loginPath: '/login/student', fields: ['rollNumber', 'semester', 'department', 'collegeName'] },
  teacher: { label: 'Teacher', color: 'from-violet-500 to-purple-500', loginPath: '/login/teacher', fields: ['employeeId', 'department'] },
  examiner: { label: 'Examiner', color: 'from-violet-500 to-purple-500', loginPath: '/login/examiner', fields: ['employeeId', 'department'] },
};

export default function Register() {
  const { role } = useParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const meta = ROLE_META[role] || ROLE_META.student;

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', rollNumber: '', semester: '', department: '', collegeName: '', employeeId: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.register({ ...form, role });
      setAuth(data.token, data.user);
      toast.success('Account created successfully!');
      navigate(role === 'student' ? '/student' : '/teacher');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg relative">
        <button onClick={() => navigate('/auth/role')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center mx-auto mb-4 shadow-glow-primary`}>
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-100">{meta.label} Registration</h1>
            <p className="text-sm text-gray-500 mt-1">Create your AI Examiner account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Dr. John Smith" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="input" placeholder="you@university.edu" required />
              </div>
              {meta.fields.includes('rollNumber') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Roll Number</label>
                  <input name="rollNumber" value={form.rollNumber} onChange={handleChange} className="input" placeholder="21CS001" />
                </div>
              )}
              {meta.fields.includes('semester') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Semester</label>
                  <input name="semester" value={form.semester} onChange={handleChange} className="input" placeholder="6th" />
                </div>
              )}
              {meta.fields.includes('department') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Department</label>
                  <input name="department" value={form.department} onChange={handleChange} className="input" placeholder="Computer Science" />
                </div>
              )}
              {meta.fields.includes('collegeName') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">College Name</label>
                  <input name="collegeName" value={form.collegeName} onChange={handleChange} className="input" placeholder="MIT University" />
                </div>
              )}
              {meta.fields.includes('employeeId') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Employee ID</label>
                  <input name="employeeId" value={form.employeeId} onChange={handleChange} className="input" placeholder="EMP001" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <input name="password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={handleChange} className="input pr-10" placeholder="••••••••" required minLength={6} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to={meta.loginPath} className="text-primary-400 hover:text-primary-300 font-semibold">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
