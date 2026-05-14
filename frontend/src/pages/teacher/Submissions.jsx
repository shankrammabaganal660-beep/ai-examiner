import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI, aiAPI } from '../../services/api';
import { Search, FileText, Eye, RefreshCw, ChevronDown, User } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_META = {
  pending:         { color: 'badge-gray',    label: 'Pending' },
  ocr_processing:  { color: 'badge-warning', label: 'OCR Processing' },
  ocr_complete:    { color: 'badge-warning', label: 'OCR Done' },
  ai_evaluating:   { color: 'badge-primary', label: 'AI Evaluating' },
  evaluated:       { color: 'badge-success', label: 'Evaluated' },
  failed:          { color: 'badge-danger',  label: 'Failed' },
};

export default function Submissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSubmissions = () => {
    setLoading(true);
    teacherAPI.getSubmissions({ status: statusFilter || undefined })
      .then(({ data }) => setSubmissions(data.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const handleReEval = async (id) => {
    try {
      await aiAPI.reEvaluate(id);
      toast.success('Re-evaluation triggered');
      setTimeout(fetchSubmissions, 2000);
    } catch (err) { toast.error(err.message); }
  };

  const filtered = submissions.filter(s =>
    !search || s.anonymousId?.toLowerCase().includes(search.toLowerCase()) || s.exam?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">Submissions</h1>
        <p className="text-sm text-gray-500">{filtered.length} answer sheets</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search by ID or exam..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={fetchSubmissions} className="btn-ghost px-3"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Anonymous ID</th><th>Exam</th><th>Status</th><th>Score</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="skeleton h-10 rounded my-1" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No submissions found</td></tr>
              ) : filtered.map((s, i) => {
                const meta = STATUS_META[s.status] || STATUS_META.pending;
                return (
                  <tr key={s._id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400">
                          {s.anonymousId?.slice(-3)}
                        </div>
                        <span className="text-sm font-mono text-gray-300">{s.anonymousId}</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-300">{s.exam?.title || '—'}</td>
                    <td><span className={`badge ${meta.color}`}>{meta.label}</span></td>
                    <td>
                      {s.status === 'evaluated' ? (
                        <span className="font-semibold text-gray-200">{s.percentage?.toFixed(1)}% <span className="text-xs text-gray-500">({s.grade})</span></span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="text-xs text-gray-500">{new Date(s.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/teacher/submissions/${s._id}/evaluate`)} className="btn-primary px-2 py-1 text-xs"><Eye className="w-3.5 h-3.5" /></button>
                        {(s.status === 'failed' || s.status === 'evaluated') && (
                          <button onClick={() => handleReEval(s._id)} className="btn-ghost px-2 py-1 text-xs" title="Re-evaluate"><RefreshCw className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
