import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { FileText, ChevronRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_META = {
  pending:        { color: 'badge-gray',    label: 'Pending' },
  ocr_processing: { color: 'badge-warning', label: 'OCR Processing' },
  ai_evaluating:  { color: 'badge-primary', label: 'AI Evaluating' },
  evaluated:      { color: 'badge-success', label: 'Evaluated' },
  failed:         { color: 'badge-danger',  label: 'Failed' },
};

export default function StudentResults() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    studentAPI.getSubmissions().then(({ data }) => setSubmissions(data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-gray-100">My Results</h1><p className="text-sm text-gray-500">{submissions.length} submissions</p></div>
        <button onClick={() => { setLoading(true); studentAPI.getSubmissions().then(({ data }) => setSubmissions(data.data)).finally(() => setLoading(false)); }} className="btn-ghost px-3"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? <div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-20 rounded-2xl"/>)}</div>
      : submissions.length === 0 ? (
        <div className="card text-center py-16"><FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" /><p className="text-gray-400">No submissions yet</p></div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s, i) => {
            const meta = STATUS_META[s.status] || STATUS_META.pending;
            return (
              <motion.div key={s._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => s.status === 'evaluated' && navigate(`/student/results/${s._id}`)}
                className={`card-hover flex items-center gap-4 ${s.status === 'evaluated' ? 'cursor-pointer' : 'cursor-default'}`}>
                <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center text-xs font-bold text-primary-400 flex-shrink-0">
                  {s.exam?.subjectName?.slice(0,2)?.toUpperCase() || 'EX'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-200 truncate">{s.exam?.title || 'Unknown Exam'}</p>
                  <p className="text-xs text-gray-500">{s.exam?.subjectName} · {new Date(s.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {s.status === 'evaluated' && (
                    <div className="text-right">
                      <p className={`text-sm font-bold ${s.percentage >= 60 ? 'text-emerald-400' : s.percentage >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{s.percentage?.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{s.grade}</p>
                    </div>
                  )}
                  <span className={`badge ${meta.color}`}>{meta.label}</span>
                  {s.status === 'evaluated' && <ChevronRight className="w-4 h-4 text-gray-500" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
