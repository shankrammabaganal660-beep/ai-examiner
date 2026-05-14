import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import { ChevronLeft, CheckCircle, AlertCircle, Edit, Save, Star, TrendingUp, Target, Brain, Zap, XCircle, Info, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

function ScoreBar({ label, value, color = 'bg-primary-500' }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span><span className="font-semibold">{Math.round(value * 100)}%</span>
      </div>
      <div className="progress-bar"><div className={`progress-fill ${color}`} style={{ width: `${value * 100}%` }} /></div>
    </div>
  );
}

export default function EvaluationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [override, setOverride] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      teacherAPI.getSubmissions({ page: 1, limit: 1 }),
      teacherAPI.getEvaluations(id)
    ]).then(async ([_, { data: evalData }]) => {
      setEvaluations(evalData.data || []);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  const ev = evaluations[selected];

  const handleOverrideSave = async (evalId) => {
    const o = override[evalId];
    if (!o?.finalMarks) return;
    setSaving(true);
    try {
      await teacherAPI.overrideMarks(evalId, { finalMarks: parseFloat(o.finalMarks), examinerRemarks: o.examinerRemarks || '' });
      toast.success('Marks updated!');
      setEditingId(null);
      const { data } = await teacherAPI.getEvaluations(id);
      setEvaluations(data.data || []);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/teacher/submissions')} className="btn-ghost px-2"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-100">Evaluation View</h1>
          <p className="text-sm text-gray-500">{evaluations.length} questions evaluated</p>
        </div>
      </div>

      {/* Question tabs */}
      <div className="flex gap-2 flex-wrap">
        {evaluations.filter(e => e.extractedTextConfidence > 0).length === 0 && (
          <p className="text-sm text-gray-500 italic">No valid extracted answers found. OCR may have failed.</p>
        )}
        {evaluations.filter(e => e.extractedTextConfidence > 0).map((e, i) => (
          <button key={e._id} onClick={() => setSelected(evaluations.findIndex(x => x._id === e._id))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${e._id === ev?._id ? 'bg-primary-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            Q{e.question?.questionNumber || i + 1}
            <span className="ml-1.5 opacity-70">{e.finalMarks?.toFixed(1)}/{e.maxMarks}</span>
          </button>
        ))}
      </div>

      {ev && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Extracted Text + Override */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary-400" /> Extracted Answer (OCR)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                {ev.extractedText || 'No text extracted'}
              </p>
              <div className="mt-2 pt-2 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                <span className="badge-gray badge text-xs">OCR Confidence: {Math.round(ev.extractedTextConfidence * 100)}%</span>
                <span className="badge-primary badge text-xs">AI Confidence: {Math.round(ev.aiConfidence * 100)}%</span>
              </div>
            </div>

            {/* Override Panel */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-accent-400" /> Manual Override
                  {ev.isManuallyOverridden && <span className="badge-warning badge text-xs">Overridden</span>}
                </h3>
                {editingId !== ev._id ? (
                  <button onClick={() => { setEditingId(ev._id); setOverride({ [ev._id]: { finalMarks: ev.finalMarks, examinerRemarks: ev.examinerRemarks || '' } }); }} className="btn-outline text-xs py-1 px-2">Edit</button>
                ) : (
                  <button onClick={() => setEditingId(null)} className="btn-ghost text-xs py-1 px-2">Cancel</button>
                )}
              </div>
              {editingId === ev._id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Override Marks (max {ev.maxMarks})</label>
                    <input type="number" min={0} max={ev.maxMarks} step={0.5} value={override[ev._id]?.finalMarks || ''} onChange={(e) => setOverride(o => ({ ...o, [ev._id]: { ...o[ev._id], finalMarks: e.target.value } }))} className="input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Examiner Remarks</label>
                    <textarea value={override[ev._id]?.examinerRemarks || ''} onChange={(e) => setOverride(o => ({ ...o, [ev._id]: { ...o[ev._id], examinerRemarks: e.target.value } }))} className="input text-sm h-16 resize-none" placeholder="Add remarks..." />
                  </div>
                  <button onClick={() => handleOverrideSave(ev._id)} disabled={saving} className="btn-primary text-xs w-full">
                    {saving ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> : <><Save className="w-3.5 h-3.5" /> Save Override</>}
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="text-3xl font-bold gradient-text">{ev.finalMarks?.toFixed(1)}<span className="text-base text-gray-500">/{ev.maxMarks}</span></div>
                  {ev.examinerRemarks && <p className="text-xs text-gray-400 mt-2 italic">"{ev.examinerRemarks}"</p>}
                </div>
              )}
            </div>
          </div>

          {/* Right: AI Analysis */}
          <div className="space-y-4">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-200">Question {ev.question?.questionNumber}: {ev.question?.text}</h3>
              
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
                <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Extracted Student Answer</h4>
                <p className="text-gray-300 text-sm whitespace-pre-wrap font-serif">
                  {ev.studentAnswer ? ev.studentAnswer : <span className="text-gray-500 italic">No answer detected for this question.</span>}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2 mt-2">
                  <Zap className="w-4 h-4 text-accent-400" /> AI Score Breakdown
                </h3>
                <div className="space-y-3">
                  <ScoreBar label="Semantic Similarity" value={ev.semanticScore || 0} />
                  <ScoreBar label="Keyword Match" value={ev.keywordScore || 0} color="bg-emerald-500" />
                  <ScoreBar label="Concept Coverage" value={ev.conceptScore || 0} color="bg-cyan-500" />
                  <ScoreBar label="Completeness" value={ev.completenessScore || 0} color="bg-amber-500" />
                </div>
              </div>

              {/* Educational Feedback */}
              {ev.educationalFeedback && (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
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
            </div>
            {/* Score Justification */}
            {ev.scoreJustification && (
              <div className="card border-blue-500/20 bg-blue-500/5">
                <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Score Justification
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">{ev.scoreJustification}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ev.strengths?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Strengths</h3>
                  <ul className="space-y-2">{ev.strengths.map((s, i) => <li key={i} className="text-xs text-gray-400 flex items-start gap-2"><span className="text-emerald-500 mt-0.5 font-bold">✓</span>{s}</li>)}</ul>
                </div>
              )}
              {ev.weaknesses?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2"><XCircle className="w-4 h-4" /> Weaknesses</h3>
                  <ul className="space-y-2">
                    {ev.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-gray-400 flex flex-col gap-1">
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
              <div className="card">
                <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Missing Concepts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ev.missingConceptsDetails.map((c, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
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
              <div className="card">
                <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Suggestions for Improvement</h3>
                <ul className="space-y-2">{ev.improvements.map((s, i) => <li key={i} className="text-xs text-gray-300 flex items-start gap-2"><span className="text-amber-500 mt-0.5 font-bold">→</span>{s}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
