import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentAPI } from '../../services/api';
import { BookOpen, Clock, Upload, X, CheckCircle, Search, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AvailableExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchExams = (q = '') => {
    setLoading(true);
    studentAPI.getExams({ search: q }).then(({ data }) => setExams(data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchExams(); }, []);

  const handleSubmit = async (examId) => {
    if (!file) { toast.error('Please select your answer sheet'); return; }
    setUploadProgress(0);
    try {
      await studentAPI.submitExam(examId, file, (p) => setUploadProgress(p));
      toast.success('Submitted! AI evaluation started.');
      setSubmitting(null); setFile(null); setUploadProgress(0);
      fetchExams();
    } catch (err) { toast.error(err.message); }
  };

  const DIFF_COLOR = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-danger' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">Available Exams</h1>
        <p className="text-sm text-gray-500">{exams.length} published exams</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); fetchExams(e.target.value); }} className="input pl-9" placeholder="Search exams..." />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">No exams available right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam, i) => (
            <motion.div key={exam._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center"><BookOpen className="w-5 h-5 text-blue-400" /></div>
                <div className="flex items-center gap-1.5">
                  <span className={`badge ${DIFF_COLOR[exam.difficultyLevel] || 'badge-gray'}`}>{exam.difficultyLevel}</span>
                  {exam.myStatus === 'evaluated' && <span className="badge-success badge">Done</span>}
                  {exam.myStatus && exam.myStatus !== 'evaluated' && <span className="badge-warning badge">{exam.myStatus}</span>}
                </div>
              </div>
              <h3 className="font-semibold text-gray-100 mb-1 line-clamp-2">{exam.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{exam.subjectName} · {exam.department}</p>
              <div className="grid grid-cols-3 gap-1.5 mb-4 text-center text-xs">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <p className="font-bold text-blue-400">{exam.totalMarks}</p><p className="text-gray-600">Marks</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(88,101,242,0.08)' }}>
                  <p className="font-bold text-primary-400">{exam.duration}m</p><p className="text-gray-600">Duration</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <p className="font-bold text-emerald-400">{exam.questions?.length ?? 0}</p><p className="text-gray-600">Questions</p>
                </div>
              </div>

              {exam.myStatus ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-xs text-emerald-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /> Already submitted
                </div>
              ) : (
                <button onClick={() => setSubmitting(exam._id)} className="btn-primary w-full text-sm">
                  <Upload className="w-4 h-4" /> Submit Answer Sheet
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {submitting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-100">Upload Answer Sheet</h3>
                <button onClick={() => { setSubmitting(null); setFile(null); }} className="text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-600/10 border border-amber-600/30 text-xs text-amber-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Upload a clear photo or scanned PDF of your handwritten answer sheet. Max 50MB.
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Select File (PDF, JPG, PNG)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0])} className="input text-sm" />
              </div>
              {file && <p className="text-xs text-gray-400">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}
              <button onClick={() => handleSubmit(submitting)} disabled={!file} className="btn-primary w-full">
                <Upload className="w-4 h-4" /> Submit & Start AI Evaluation
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
