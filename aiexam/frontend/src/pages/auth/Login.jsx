import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CONFIG = {
  student:  { label: 'Student',          color: 'from-blue-600 to-indigo-600',   icon: '🎓', endpoint: 'login' },
  teacher:  { label: 'Teacher',          color: 'from-violet-600 to-purple-600', icon: '📚', endpoint: 'login' },
  examiner: { label: 'Examiner',         color: 'from-rose-600 to-pink-600',     icon: '🔍', endpoint: 'login' },
  admin:    { label: 'Administrator',    color: 'from-amber-600 to-orange-600',  icon: '⚙️', endpoint: 'admin-login' },
};

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const endpoint = config.endpoint === 'admin-login' ? authAPI.adminLogin : authAPI.login;
      const { data } = await endpoint(form);
      
      console.log('Login API Response:', data);
      
      if (data.success && data.token && data.user) {
        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);

        const dest = { admin: '/admin', teacher: '/teacher', examiner: '/teacher', student: '/student' };
        const route = dest[data.user.role] || '/';
        console.log(`Navigating to: ${route}`);
        navigate(route);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Check your credentials.';
      console.error('Login error:', err.response?.data || err);
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const demoCredentials = {
    admin:    { email: 'admin@aiexaminer.com',   password: 'admin123' },
    teacher:  { email: 'teacher@aiexaminer.com', password: 'teacher123' },
    examiner: { email: 'teacher@aiexaminer.com', password: 'teacher123' },
    student:  { email: 'student@aiexaminer.com', password: 'student123' },
  };

  const fillDemo = () => {
    const d = demoCredentials[role] || demoCredentials.student;
    setForm(d);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, rgba(88,101,242,0.6), transparent)` }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md">

        {/* Back button */}
        <button onClick={() => navigate('/auth/role')} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to role selection
        </button>

        <div className="card p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center text-2xl mx-auto mb-4`}>
              {config.icon}
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-semibold text-primary-400 uppercase tracking-widest">AI Examiner</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-100">{config.label} Login</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

          {/* Demo fill */}
          <button onClick={fillDemo} className="w-full py-2 rounded-xl text-xs text-gray-400 border border-dashed border-gray-700 hover:border-primary-600/50 hover:text-primary-400 transition-all">
            ⚡ Use demo credentials
          </button>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  className="input pl-10" placeholder="your@email.com" autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPwd ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  className="input pl-10 pr-10" placeholder="••••••••" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-sm text-red-400 border border-red-600/30 bg-red-600/10">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full text-sm py-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Register link (not for admin) */}
          {role !== 'admin' && (
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to={`/register/${role}`} className="text-primary-400 hover:text-primary-300 font-medium">
                Register here
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
