import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { Users, BookOpen, FileText, CheckCircle, Clock, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#5865f2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {loading ? <div className="skeleton w-12 h-6 rounded" /> : <span className="text-2xl font-bold text-gray-100">{value}</span>}
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats().then(({ data }) => { setStats(data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const roleData = stats?.roleBreakdown?.map(r => ({ name: r._id, value: r.count })) || [];
  const activityData = stats?.dailyActivity?.map(d => ({ date: d._id?.slice(5), count: d.count })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and system health</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? '—'} color="bg-primary-600" loading={loading} />
        <StatCard icon={BookOpen} label="Total Exams" value={stats?.totalExams ?? '—'} color="bg-emerald-600" loading={loading} />
        <StatCard icon={FileText} label="Submissions" value={stats?.totalSubmissions ?? '—'} color="bg-amber-600" loading={loading} />
        <StatCard icon={AlertCircle} label="Pending Approvals" value={stats?.pendingApprovals ?? '—'} color="bg-rose-600" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Daily Activity (7 days)</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e8e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#5865f2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-200 mb-4">Users by Role</h3>
          {loading ? <div className="skeleton h-48 rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
