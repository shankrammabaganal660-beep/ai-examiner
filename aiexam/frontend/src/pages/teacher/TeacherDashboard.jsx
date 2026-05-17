import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import { BookOpen, FileText, CheckCircle, Clock, TrendingUp, Users, Plus, BarChart3, Bell, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import useAuthStore from '../../store/authStore';

const TOOLTIP_STYLE = { background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e8e8f0', fontSize: 12 };

function StatCard({ icon: Icon, label, value, subtext, color, loading, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {loading ? <div className="skeleton w-14 h-7 rounded" /> : <span className="text-2xl font-bold text-gray-100">{value}</span>}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
      </div>
    </motion.div>
  );
}

// Demo chart data when real data is limited
const DEMO_ACTIVITY = [
  { day: 'Mon', submissions: 12, evaluations: 10 },
  { day: 'Tue', submissions: 19, evaluations: 17 },
  { day: 'Wed', submissions: 8, evaluations: 8 },
  { day: 'Thu', submissions: 25, evaluations: 22 },
  { day: 'Fri', submissions: 31, evaluations: 28 },
  { day: 'Sat', submissions: 14, evaluations: 13 },
  { day: 'Sun', submissions: 7, evaluations: 6 },
];

export default function TeacherDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      teacherAPI.getAnalytics(),
      teacherAPI.getSubmissions({ limit: 5 })
    ]).then(([{ data: a }, { data: s }]) => {
      setAnalytics(a.data);
      setRecentSubmissions(s.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalExams = analytics?.exams?.length ?? 0;
  const totalSubmissions = analytics?.submissionStats?.reduce((s, x) => s + x.count, 0) ?? 0;
  const evaluated = analytics?.submissionStats?.find(x => x._id === 'evaluated')?.count ?? 0;
  const pending = analytics?.submissionStats?.find(x => x._id === 'pending')?.count ?? 0;

  const subjectData = analytics?.subjectPerformance?.map(s => ({ name: s._id?.slice(0, 12), avg: Math.round(s.avgScore) })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">Here's your evaluation overview</p>
        </div>
        <button onClick={() => navigate('/teacher/exams/create')} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Exams" value={totalExams} color="bg-primary-600" loading={loading} delay={0} />
        <StatCard icon={FileText} label="Submissions" value={totalSubmissions} color="bg-emerald-600" loading={loading} delay={0.05} />
        <StatCard icon={CheckCircle} label="Evaluated" value={evaluated} color="bg-cyan-600" loading={loading} delay={0.1} />
        <StatCard icon={Clock} label="Pending" value={pending} subtext="Awaiting AI" color="bg-amber-600" loading={loading} delay={0.15} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" /> Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_ACTIVITY}>
              <defs>
                <linearGradient id="sub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5865f2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5865f2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="eval" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="submissions" stroke="#5865f2" fill="url(#sub)" strokeWidth={2} name="Submissions" />
              <Area type="monotone" dataKey="evaluations" stroke="#10b981" fill="url(#eval)" strokeWidth={2} name="Evaluations" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-400" /> Subject Performance
          </h3>
          {subjectData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} width={80} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="avg" fill="#5865f2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2"><FileText className="w-4 h-4 text-primary-400" />Recent Submissions</h3>
          <button onClick={() => navigate('/teacher/submissions')} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">View all →</button>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : recentSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSubmissions.map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/submissions/${s._id}/evaluate`)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400">{s.anonymousId?.slice(-4)}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{s.exam?.title || 'Unknown Exam'}</p>
                    <p className="text-xs text-gray-500">{s.anonymousId} · {new Date(s.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`badge ${s.status === 'evaluated' ? 'badge-success' : s.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Create Exam', icon: BookOpen, action: () => navigate('/teacher/exams/create'), color: 'bg-primary-600/20 text-primary-400 border-primary-600/30' },
          { label: 'View Submissions', icon: FileText, action: () => navigate('/teacher/submissions'), color: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' },
          { label: 'Analytics', icon: BarChart3, action: () => navigate('/teacher/analytics'), color: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
          { label: 'Notifications', icon: Bell, action: () => navigate('/teacher/notifications'), color: 'bg-rose-600/20 text-rose-400 border-rose-600/30' },
        ].map((a, i) => (
          <button key={i} onClick={a.action} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:scale-105 ${a.color}`}>
            <a.icon className="w-5 h-5" />
            <span className="text-xs font-semibold">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
