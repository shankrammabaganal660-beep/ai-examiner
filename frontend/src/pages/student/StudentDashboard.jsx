import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { studentAPI } from '../../services/api';
import { LayoutDashboard, BookOpen, FileText, BarChart3, Trophy, Star, TrendingUp, Clock } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import useAuthStore from '../../store/authStore';

const TS = { background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e8e8f0', fontSize: 12 };

function CircleProgress({ percent, size = 80, color = '#5865f2' }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">{percent}%</text>
    </svg>
  );
}

export default function StudentDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [exams, setExams] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([studentAPI.getSubmissions(), studentAPI.getExams(), studentAPI.getAnalytics()])
      .then(([{ data: s }, { data: e }, { data: a }]) => {
        // Filter out any orphaned submissions (deleted exam)
        const validSubs = (s.data || []).filter(sub =>
          sub.exam != null && sub.exam.title && sub.exam.subjectName &&
          !['Unknown', 'null', 'undefined'].includes(sub.exam.subjectName)
        );
        setSubmissions(validSubs); setExams(e.data || []); setAnalytics(a.data);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const evaluated = submissions.filter(s => s.status === 'evaluated');
  const pending = submissions.filter(s => !['evaluated', 'failed'].includes(s.status));
  const avg = analytics?.overallAvg ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">
            Welcome, {user?.name?.split(' ')[0]} 🎓
          </h1>
          <p className="text-sm text-gray-500">{user?.rollNumber && `Roll: ${user.rollNumber} · `}{user?.semester && `Sem ${user.semester}`}</p>
        </div>
        <button onClick={() => navigate('/student/exams')} className="btn-primary"><BookOpen className="w-4 h-4" /> Browse Exams</button>
      </div>

      {/* Stat Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Available Exams', value: exams.length, color: 'bg-blue-600' },
          { icon: FileText, label: 'Submitted', value: submissions.length, color: 'bg-violet-600' },
          { icon: Trophy, label: 'Evaluated', value: evaluated.length, color: 'bg-emerald-600' },
          { icon: Clock, label: 'Pending', value: pending.length, color: 'bg-amber-600' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5 text-white" /></div>
              {loading ? <div className="skeleton w-10 h-7 rounded" /> : <span className="text-2xl font-bold text-gray-100">{s.value}</span>}
            </div>
            <p className="text-sm font-medium text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress + Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card text-center">
          <h3 className="font-semibold text-gray-200 mb-4">Overall Average</h3>
          <div className="flex justify-center"><CircleProgress percent={avg} size={120} color={avg >= 80 ? '#10b981' : avg >= 60 ? '#5865f2' : avg >= 40 ? '#f59e0b' : '#ef4444'} /></div>
          <p className="text-xs text-gray-500 mt-2">{evaluated.length} exams evaluated</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(88,101,242,0.08)' }}>
              <p className="text-gray-500">Subjects</p>
              <p className="font-bold text-gray-200">{analytics?.subjects?.length ?? 0}</p>
            </div>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
              <p className="text-gray-500">Best Subject</p>
              <p className="font-bold text-emerald-400 truncate">{analytics?.subjects?.sort((a,b)=>b.average-a.average)[0]?.name || '—'}</p>
            </div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-400" />Recent Results</h3>
            <button onClick={() => navigate('/student/results')} className="text-xs text-primary-400 hover:text-primary-300">View all →</button>
          </div>
          {loading ? <div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
          : evaluated.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No results yet</p></div>
          ) : (
            <div className="space-y-2">
              {evaluated.slice(0, 5).map(s => (
                <div key={s._id} onClick={() => navigate(`/student/results/${s._id}`)} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{s.exam?.title}</p>
                    <p className="text-xs text-gray-500">{s.exam?.subjectName} · {new Date(s.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${s.percentage >= 60 ? 'text-emerald-400' : s.percentage >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{s.percentage?.toFixed(1)}%</span>
                    <p className="text-xs text-gray-500">{s.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
