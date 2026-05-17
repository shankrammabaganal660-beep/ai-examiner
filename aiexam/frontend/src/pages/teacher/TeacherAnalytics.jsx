import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const TS = { background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e8e8f0', fontSize: 12 };

export default function TeacherAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    teacherAPI.getAnalytics().then(({ data: d }) => { setData(d.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const subjectData = data?.subjectPerformance?.map(s => ({ name: s._id?.slice(0, 14), avg: Math.round(s.avgScore), total: s.total })) || [];
  const bucketData = data?.scoreDistribution?.map(b => ({ range: b._id, count: b.count })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500">Performance insights across your exams</p>
      </div>

      {loading ? <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-48 rounded-2xl"/>)}</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary-400" />Subject Performance</h3>
            {subjectData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`, 'Avg Score']} />
                  <Bar dataKey="avg" fill="#5865f2" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent-400" />Score Distribution</h3>
            {bucketData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No evaluated data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bucketData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip contentStyle={TS} />
                  <Bar dataKey="count" fill="#ff1fb4" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" />Exams Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(data?.exams || []).map(exam => (
                <div key={exam._id} className="p-3 rounded-xl" style={{ background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.15)' }}>
                  <p className="text-xs font-semibold text-gray-300 mb-1 truncate">{exam.title}</p>
                  <p className="text-xs text-gray-500">{exam.subjectName}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <span className="badge-primary badge text-xs">{exam.totalSubmissions ?? 0} submissions</span>
                  </div>
                </div>
              ))}
              {(!data?.exams?.length) && <div className="col-span-4 text-center py-6 text-gray-500 text-sm">No exams yet</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
