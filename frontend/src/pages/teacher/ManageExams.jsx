import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import { Plus, Search, BookOpen, Clock, CheckCircle, Edit, Trash2, Eye, Globe, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_META = {
  draft:      { color: 'badge-gray',    label: 'Draft' },
  published:  { color: 'badge-success', label: 'Published' },
  closed:     { color: 'badge-warning', label: 'Closed' },
  archived:   { color: 'badge-danger',  label: 'Archived' },
};

export default function ManageExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchExams = () => {
    setLoading(true);
    teacherAPI.getExams({ search, status: statusFilter || undefined })
      .then(({ data }) => setExams(data.data))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExams(); }, [search, statusFilter]);

  const handlePublish = async (id) => {
    try {
      await teacherAPI.publishExam(id);
      toast.success('Exam published!');
      fetchExams();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam and all submissions?')) return;
    try {
      await teacherAPI.deleteExam(id);
      toast.success('Exam deleted');
      fetchExams();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">Manage Exams</h1>
          <p className="text-sm text-gray-500">{exams.length} exams total</p>
        </div>
        <button onClick={() => navigate('/teacher/exams/create')} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search exams..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full sm:w-36">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <h3 className="font-semibold text-gray-300 mb-1">No Exams Found</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first exam to get started</p>
          <button onClick={() => navigate('/teacher/exams/create')} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Create Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam, i) => {
            const statusMeta = STATUS_META[exam.status] || STATUS_META.draft;
            return (
              <motion.div key={exam._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-hover group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary-400" />
                  </div>
                  <span className={`badge ${statusMeta.color}`}>{statusMeta.label}</span>
                </div>
                <h3 className="font-semibold text-gray-100 mb-1 line-clamp-2">{exam.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{exam.subjectName} · {exam.department}</p>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(88,101,242,0.08)' }}>
                    <p className="text-sm font-bold text-primary-400">{exam.totalMarks}</p>
                    <p className="text-xs text-gray-600">Marks</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <p className="text-sm font-bold text-emerald-400">{exam.totalSubmissions ?? 0}</p>
                    <p className="text-xs text-gray-600">Submitted</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)' }}>
                    <p className="text-sm font-bold text-amber-400">{exam.questions?.length ?? 0}</p>
                    <p className="text-xs text-gray-600">Questions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {exam.status === 'draft' && (
                    <button onClick={() => handlePublish(exam._id)} className="btn-success flex-1 text-xs py-1.5">
                      <Globe className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  <button onClick={() => navigate(`/teacher/exams/${exam._id}/edit`)} className="btn-ghost px-2.5 py-1.5 text-xs">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigate(`/teacher/submissions?examId=${exam._id}`)} className="btn-ghost px-2.5 py-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(exam._id)} className="btn-danger px-2.5 py-1.5 text-xs">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
