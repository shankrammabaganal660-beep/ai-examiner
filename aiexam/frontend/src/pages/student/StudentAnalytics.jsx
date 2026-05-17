import React, { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const TS = { background: '#16162a', border: '1px solid #2a2a4a', borderRadius: 8, color: '#e8e8f0', fontSize: 12 };

export default function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { studentAPI.getAnalytics().then(({ data: d }) => setData(d.data)).finally(() => setLoading(false)); }, []);

  const validSubjects = data?.subjects?.filter(s => s.name && !['Unknown', 'null', 'undefined', 'N/A'].includes(s.name)) || [];
  const radarData = validSubjects.map(s => ({ subject: s.name?.slice(0,12), score: s.average }));
  
  // Timeline: include all exams sorted by date (do NOT filter by subject)
  const timelineData = (data?.timeline || [])
    .filter(t => t.date && t.score != null && t.examTitle)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(t => ({
      date: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      score: +(t.score).toFixed(1),
      subject: t.subject,
      examTitle: t.examTitle
    }));

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-gray-100">My Analytics</h1><p className="text-sm text-gray-500">Performance insights across subjects</p></div>

      {loading ? <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-48 rounded-2xl"/>)}</div> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-200 mb-4">Subject Performance Radar</h3>
              {radarData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
              ) : radarData.length < 3 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={radarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={TS} />
                    <Bar dataKey="score" fill="#5865f2" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
                    <Radar dataKey="score" stroke="#5865f2" fill="#5865f2" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-200 mb-4">Score Timeline</h3>
              {timelineData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
                  <span className="text-3xl opacity-30">📈</span>
                  <p>Complete exams to view your performance trend</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={TS}
                      formatter={(value, name) => [`${value}%`, 'Score']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.examTitle || label}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#5865f2"
                      strokeWidth={2.5}
                      dot={{ fill: '#5865f2', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#5865f2', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Subject Cards */}
          <div className="card">
            <h3 className="font-semibold text-gray-200 mb-4">Subject Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {validSubjects.map((s, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.12)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-200 truncate">{s.name}</span>
                    {s.trend > 0 ? <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : s.trend < 0 ? <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" /> : <Minus className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                  </div>
                  <p className={`text-2xl font-bold ${s.average >= 60 ? 'text-emerald-400' : s.average >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{s.average}%</p>
                  <p className="text-xs text-gray-500 mt-1">{s.count} exam{s.count !== 1 ? 's' : ''}</p>
                  <div className="progress-bar mt-2"><div className="progress-fill" style={{ width: `${s.average}%` }} /></div>
                </div>
              ))}
              {validSubjects.length === 0 && <div className="col-span-3 text-center py-6 text-gray-500 text-sm">No valid subjects available yet</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
