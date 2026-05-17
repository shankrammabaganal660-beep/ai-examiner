import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../../services/api';
import { ChevronLeft, Brain, CheckCircle, AlertCircle, Target, Star, RefreshCw, BookOpen, Info, XCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

function ScoreBar({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400"><span>{label}</span><span className="font-semibold">{Math.round(value * 100)}%</span></div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${value * 100}%` }} /></div>
    </div>
  );
}

const GRADE_COLOR = { 'A+': 'text-emerald-400', A: 'text-emerald-400', B: 'text-blue-400', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400' };

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reEvalReason, setReEvalReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    studentAPI.getResult(id).then(({ data: d }) => setData(d.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  const handleReEval = async () => {
    setRequesting(true);
    try {
      await studentAPI.requestReEval(id, reEvalReason);
      toast.success('Re-evaluation request submitted!');
      setReEvalReason('');
    } catch (err) { toast.error(err.message); }
    finally { setRequesting(false); }
  };

  if (loading) return <div className="space-y-4">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton h-32 rounded-2xl"/>)}</div>;
  if (!data) return <div className="card text-center py-16 text-gray-500">Result not found</div>;

  const { submission, evaluations } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/student/results')} className="btn-ghost px-2"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-100">{submission?.exam?.title}</h1>
          <p className="text-sm text-gray-500">{submission?.exam?.subjectName}</p>
        </div>
      </div>

      {/* Score Card */}
      <div className="card text-center py-8">
        <div className={`font-display text-6xl font-bold ${GRADE_COLOR[submission?.grade] || 'text-gray-100'}`}>{submission?.grade}</div>
        <div className="text-2xl font-bold text-gray-100 mt-2">{submission?.percentage?.toFixed(1)}<span className="text-gray-500 text-base">%</span></div>
        <p className="text-sm text-gray-500 mt-1">{submission?.totalScore?.toFixed(1)} / {submission?.exam?.totalMarks} marks</p>
        <span className={`badge mt-3 ${submission?.isPassed ? 'badge-success' : 'badge-danger'}`}>
          {submission?.isPassed ? '✓ Passed' : '✗ Failed'}
        </span>
      </div>

      {/* Per Question */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-200">Question-wise Breakdown</h2>
        {evaluations.filter(e => e.extractedTextConfidence > 0).length === 0 && (
          <div className="card text-center text-gray-400 italic">No valid extracted answers found for this submission.</div>
        )}
        {evaluations.filter(e => e.extractedTextConfidence > 0).map((ev, i) => (
          <motion.div key={ev._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200">Q{ev.question?.questionNumber || i + 1}: <span className="font-normal text-gray-400 text-sm">{ev.question?.text}</span></h3>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-lg font-bold gradient-text">{ev.finalMarks?.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">/{ev.maxMarks}</span>
                {ev.isManuallyOverridden && <p className="text-xs text-amber-400">Manually reviewed</p>}
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 border border-white/5 relative">
              <div className="absolute top-3 right-3 flex gap-2">
                {ev.extractedTextConfidence < 0.5 && (
                  <span className="text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                    Low OCR Confidence
                  </span>
                )}
                <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  OCR Conf: {(ev.extractedTextConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Your Extracted Answer</h4>
              <p className="text-gray-300 text-sm whitespace-pre-wrap font-serif">
                {ev.studentAnswer ? ev.studentAnswer : <span className="text-gray-500 italic">No answer detected for this question.</span>}
              </p>
            </div>

            <div className="space-y-2">
              <ScoreBar label="Semantic Similarity" value={ev.semanticScore || 0} />
              <ScoreBar label="Keyword Match" value={ev.keywordScore || 0} />
              <ScoreBar label="Concept Coverage" value={ev.conceptScore || 0} />
            </div>

            {/* Educational Feedback */}
            {ev.educationalFeedback && (
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mt-4">
                <h3 className="text-sm font-semibold text-primary-400 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Examiner Feedback
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed italic">"{ev.educationalFeedback}"</p>
                {ev.bloomsTaxonomyLevel && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Bloom's Taxonomy:</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                      {ev.bloomsTaxonomyLevel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Score Justification */}
            {ev.scoreJustification && (
              <div className="card border-blue-500/20 bg-blue-500/5 mt-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Score Justification
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">{ev.scoreJustification}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {ev.strengths?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Strengths</h3>
                  <ul className="space-y-2">{ev.strengths.map((s, j) => <li key={j} className="text-xs text-gray-400 flex items-start gap-2"><span className="text-emerald-500 mt-0.5 font-bold">✓</span>{s}</li>)}</ul>
                </div>
              )}
              {ev.weaknesses?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2"><XCircle className="w-4 h-4" /> Weaknesses</h3>
                  <ul className="space-y-2">
                    {ev.weaknesses.map((w, j) => (
                      <li key={j} className="text-xs text-gray-400 flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <span className="text-rose-500 mt-0.5 font-bold">✗</span>
                          <span>{w.issue}</span>
                        </div>
                        <span className={`self-start ml-5 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                          w.severity === 'major' ? 'bg-rose-500/20 text-rose-400' : 
                          w.severity === 'moderate' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>{w.severity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Missing Concepts Details */}
            {ev.missingConceptsDetails?.length > 0 && (
              <div className="card mt-4">
                <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Missing Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ev.missingConceptsDetails.map((c, j) => (
                    <div key={j} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
                      c.status === 'missing' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    }`}>
                      <span className="font-semibold">{c.concept}</span>
                      <span className="opacity-60 text-[10px] uppercase tracking-wider">({c.status})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ev.improvements?.length > 0 && (
              <div className="card mt-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Suggestions for Improvement</h3>
                <ul className="space-y-2">{ev.improvements.map((s, j) => <li key={j} className="text-xs text-gray-300 flex items-start gap-2"><span className="text-amber-500 mt-0.5 font-bold">→</span>{s}</li>)}</ul>
              </div>
            )}
            {ev.examinerRemarks && <div className="p-3 rounded-xl bg-blue-600/10 border border-blue-600/20 text-xs text-blue-300">Examiner: {ev.examinerRemarks}</div>}
          </motion.div>
        ))}
      </div>

      {/* Re-evaluation */}
      {submission?.reEvaluationCount < 2 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-amber-400" />Request Re-evaluation</h3>
          <textarea value={reEvalReason} onChange={(e) => setReEvalReason(e.target.value)} className="input h-20 resize-none text-sm" placeholder="Reason for re-evaluation request..." />
          <button onClick={handleReEval} disabled={!reEvalReason.trim() || requesting} className="btn-outline text-sm">
            {requesting ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : 'Submit Request'}
          </button>
        </div>
      )}
    </div>
  );
}
