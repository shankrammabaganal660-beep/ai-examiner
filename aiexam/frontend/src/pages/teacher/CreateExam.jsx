import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherAPI } from '../../services/api';
import { Plus, Trash2, Upload, ChevronLeft, ChevronRight, Save, BookOpen, AlertCircle, FileText, Loader2, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Basic Info', 'Questions', 'Files & Weights', 'Review'];

const emptyQuestion = (idx = 0) => ({ questionNumber: idx + 1, text: '', referenceAnswer: '', maxMarks: 10, difficultyLevel: 'medium', keywords: '', expectedConcepts: '' });

export default function CreateExam() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState({
    title: '', description: '', instructions: '', subjectName: '', department: '',
    semester: '', examDate: '', totalMarks: 100, passingMarks: 40, duration: 180,
    difficultyLevel: 'medium',
    scoringWeights: { semantic: 0.4, keyword: 0.25, concept: 0.25, completeness: 0.1 }
  });
  const [questions, setQuestions] = useState([emptyQuestion(0)]);
  const [errors, setErrors] = useState([]);
  const [qpFile, setQpFile] = useState(null);
  const [maFile, setMaFile] = useState(null);
  const [savedExamId, setSavedExamId] = useState(id || null);
  const [questionMode, setQuestionMode] = useState('manual'); // 'manual' | 'upload'
  const [parseFile, setParseFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);

  const [maParseFile, setMaParseFile] = useState(null);
  const [maParsing, setMaParsing] = useState(false);
  const [maParseProgress, setMaParseProgress] = useState(0);
  const [isMaDragging, setIsMaDragging] = useState(false);
  const [previewMappings, setPreviewMappings] = useState(null);
  const maDropRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      teacherAPI.getExam(id).then(({ data }) => {
        const e = data.data;
        setExam({ title: e.title, description: e.description || '', instructions: e.instructions || '', subjectName: e.subjectName || '', department: e.department || '', semester: e.semester || '', examDate: e.examDate ? e.examDate.slice(0, 10) : '', totalMarks: e.totalMarks, passingMarks: e.passingMarks, duration: e.duration || 180, difficultyLevel: e.difficultyLevel || 'medium', scoringWeights: e.scoringWeights || { semantic: 0.4, keyword: 0.25, concept: 0.25, completeness: 0.1 } });
        if (e.questions?.length) {
          setQuestions(e.questions.map(q => ({ ...q, keywords: q.keywords?.join(', ') || '', expectedConcepts: q.expectedConcepts?.join(', ') || '' })));
        }
      }).catch(() => toast.error('Failed to load exam'));
    }
  }, [id]);

  const handleExamChange = (e) => setExam(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleQuestionChange = (idx, field, val) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion(prev.length)]);
  const removeQuestion = (idx) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }, []);

  const handleFileSelected = (file) => {
    const allowed = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExt = ['.pdf', '.txt', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExt.includes(ext)) {
      toast.error('Only PDF, TXT, and DOCX files are allowed');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB');
      return;
    }
    setParseFile(file);
  };

  const handleMaFileSelected = (file) => {
    const allowedExt = ['.pdf', '.txt', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExt.includes(ext)) {
      toast.error('Only PDF, TXT, and DOCX files are allowed');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB');
      return;
    }
    setMaParseFile(file);
  };

  const handleParseUpload = async () => {
    if (!parseFile) { toast.error('Please select a file first'); return; }
    setParsing(true);
    setParseProgress(0);
    try {
      const { data } = await teacherAPI.parseQuestionPaper(parseFile, setParseProgress);
      const extracted = data.data?.questions || [];
      const reason = data.data?.reason || 'unknown';
      const serverMsg = data.data?.message || '';

      if (extracted.length === 0) {
        const userMsg = reason === 'text_extraction_failed'
          ? '📄 PDF text extraction failed. Please ensure the file is a readable (not scanned) PDF or try a TXT file.'
          : reason === 'no_questions_detected'
            ? `📋 Text extracted but no question patterns found. ${serverMsg} Try formatting questions as: Q1, 1., or Question 1.`
            : serverMsg || 'No questions could be extracted. Try a different file or switch to Manual Entry.';
        toast.error(userMsg, { duration: 6000 });
        return;
      }
      // Convert array keywords to comma string for form compatibility
      setQuestions(extracted.map((q, i) => ({
        ...q,
        questionNumber: q.questionNumber || String(i + 1),
        maxMarks: q.maxMarks || 10,
        referenceAnswer: q.referenceAnswer || '',
        keywords: Array.isArray(q.keywords) ? q.keywords.join(', ') : q.keywords || '',
        expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts.join(', ') : q.expectedConcepts || '',
      })));
      setErrors([]);
      toast.success(`✅ ${extracted.length} questions extracted! Review and add reference answers below.`);
      setQuestionMode('manual');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Extraction failed';
      toast.error(`Extraction failed: ${msg}. You can switch to Manual Entry instead.`, { duration: 6000 });
    } finally {
      setParsing(false);
      setParseProgress(0);
    }
  };

  const handleMaParseUpload = async () => {
    if (!maParseFile) { toast.error('Please select a model answer file first'); return; }
    if (questions.length === 0 || !questions.some(q => q.text)) {
      toast.error('Please extract or add questions first before uploading answers');
      return;
    }

    setMaParsing(true);
    setMaParseProgress(0);
    try {
      const { data } = await teacherAPI.extractModelAnswers(maParseFile, setMaParseProgress);
      const extractedAnswers = data.data?.answers || {};

      if (Object.keys(extractedAnswers).length === 0) {
        toast.error('No answers could be extracted. Please check the file format.');
        return;
      }

      // Build preview mappings
      const mappings = questions.map(q => {
        // Try Q1, 1., or direct match
        const qNumStr = String(q.questionNumber).trim();
        const stdKey = `Q${qNumStr.replace(/\D/g, '')}`; // normalize to Q1

        let match = extractedAnswers[stdKey] || extractedAnswers[qNumStr] || null;
        if (!match) {
          // check if any key ends with this number
          const foundKey = Object.keys(extractedAnswers).find(k => k.endsWith(qNumStr));
          if (foundKey) match = extractedAnswers[foundKey];
        }

        return {
          ...q,
          extractedAnswer: match ? match.answer : '',
          confidence: match ? match.confidence : 0,
          apply: !!match
        };
      });

      // Check for answers that don't match any question
      const mappedKeys = mappings.filter(m => m.apply).map(m => String(m.questionNumber).trim());
      const mappedStdKeys = mappedKeys.map(k => `Q${k.replace(/\D/g, '')}`);

      const unmappedCount = Object.keys(extractedAnswers).filter(k => !mappedStdKeys.includes(k) && !mappedKeys.includes(k)).length;
      if (unmappedCount > 0) {
        toast.error(`Warning: ${unmappedCount} extracted answers could not be mapped to any question.`, { duration: 6000 });
      }

      setPreviewMappings(mappings);
    } catch (err) {
      toast.error(`Extraction failed: ${err.message}`);
    } finally {
      setMaParsing(false);
      setMaParseProgress(0);
    }
  };

  const applyMappings = () => {
    setQuestions(prev => prev.map((q, i) => {
      const mapping = previewMappings[i];
      if (mapping && mapping.apply && mapping.extractedAnswer) {
        return { ...q, referenceAnswer: mapping.extractedAnswer };
      }
      return q;
    }));
    toast.success('Model answers applied successfully!');
    setPreviewMappings(null);
  };

  const validateQuestions = (qs) => {
    const errs = qs.map((q, i) => {
      const e = {};
      if (!q.text?.trim()) e.text = 'Question text is required';
      if (!q.referenceAnswer?.trim()) e.referenceAnswer = 'Reference answer is required';
      if (!String(q.questionNumber).trim()) e.questionNumber = 'Question number is required';
      return e;
    });
    setErrors(errs);
    return errs.every(e => Object.keys(e).length === 0);
  };

  const saveExam = async () => {
    // Sanitize: trim and filter out completely empty questions
    const sanitized = questions
      .map((q, idx) => ({
        ...q,
        text: q.text?.trim() || '',
        referenceAnswer: q.referenceAnswer?.trim() || '',
        // Guarantee questionNumber is never empty — fallback to position index
        questionNumber: String(q.questionNumber).trim() || String(idx + 1),
        maxMarks: Number(q.maxMarks) || 10,
        keywords: Array.isArray(q.keywords)
          ? q.keywords
          : (q.keywords || '').split(',').map(k => k.trim()).filter(Boolean),
        expectedConcepts: Array.isArray(q.expectedConcepts)
          ? q.expectedConcepts
          : (q.expectedConcepts || '').split(',').map(c => c.trim()).filter(Boolean),
      }))
      .filter(q => q.text && q.referenceAnswer);

    if (sanitized.length === 0 && step >= 1) {
      toast.error('At least one valid question with text and reference answer is required');
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        ...exam,
        totalMarks: Number(exam.totalMarks),
        passingMarks: Number(exam.passingMarks),
        duration: Number(exam.duration),
        questions: sanitized,
      };
      console.log('[CreateExam] Submitting payload:', JSON.stringify(payload, null, 2));
      if (savedExamId) {
        await teacherAPI.updateExam(savedExamId, payload);
        toast.success('Exam updated!');
      } else {
        const { data } = await teacherAPI.createExam(payload);
        setSavedExamId(data.data._id);
        toast.success('Exam created!');
      }
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save';
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 0 && !exam.title?.trim()) { toast.error('Title is required'); return; }
    if (step === 0 && !exam.subjectName?.trim()) { toast.error('Subject is required'); return; }
    if (step === 1) {
      if (!validateQuestions(questions)) {
        toast.error('Please fill in all required question fields');
        return;
      }
    }
    const ok = await saveExam();
    if (ok) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleFileUpload = async (type) => {
    const file = type === 'qp' ? qpFile : maFile;
    if (!file || !savedExamId) { toast.error('Save exam first'); return; }
    setSaving(true);
    try {
      const fn = type === 'qp' ? teacherAPI.uploadQuestionPaper : teacherAPI.uploadModelAnswer;
      await fn(savedExamId, file);
      toast.success(`${type === 'qp' ? 'Question paper' : 'Model answer'} uploaded!`);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleFinish = async () => {
    const ok = await saveExam();
    if (ok) navigate('/teacher/exams');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/teacher/exams')} className="btn-ghost px-2"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">{isEdit ? 'Edit Exam' : 'Create Exam'}</h1>
          <p className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i === step ? 'bg-primary-600 text-white' : i < step ? 'bg-emerald-600/20 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}. {s}
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-emerald-600/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {/* Step 0 */}
          {step === 0 && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-200">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Exam Title *</label>
                  <input name="title" value={exam.title} onChange={handleExamChange} className="input" placeholder="Mid-Term Examination 2024" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Subject *</label>
                  <input name="subjectName" value={exam.subjectName} onChange={handleExamChange} className="input" placeholder="Data Structures" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Department</label>
                  <input name="department" value={exam.department} onChange={handleExamChange} className="input" placeholder="CSE" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Semester</label>
                  <input name="semester" value={exam.semester} onChange={handleExamChange} className="input" placeholder="4th" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Exam Date</label>
                  <input name="examDate" type="date" value={exam.examDate} onChange={handleExamChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total Marks</label>
                  <input name="totalMarks" type="number" value={exam.totalMarks} onChange={handleExamChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Passing Marks</label>
                  <input name="passingMarks" type="number" value={exam.passingMarks} onChange={handleExamChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Duration (minutes)</label>
                  <input name="duration" type="number" value={exam.duration} onChange={handleExamChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Difficulty</label>
                  <select name="difficultyLevel" value={exam.difficultyLevel} onChange={handleExamChange} className="input">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Instructions</label>
                  <textarea name="instructions" value={exam.instructions} onChange={handleExamChange} className="input h-20 resize-none" placeholder="Attempt all questions. Each question carries equal marks..." />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="card">
                <h2 className="font-semibold text-gray-200 mb-3">Choose Question Input Method</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setQuestionMode('upload')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${questionMode === 'upload' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    <Upload className="w-6 h-6" /><span className="text-sm font-semibold">Upload File</span>
                    <span className="text-xs opacity-70 text-center">PDF, TXT, DOCX — AI extracts questions</span>
                  </button>
                  <button onClick={() => setQuestionMode('manual')} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${questionMode === 'manual' ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    <FileText className="w-6 h-6" /><span className="text-sm font-semibold">Manual Entry</span>
                    <span className="text-xs opacity-70 text-center">Type questions and answers directly</span>
                  </button>
                </div>
              </div>

              {/* Upload Mode */}
              {questionMode === 'upload' && (
                <div className="card space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300">Upload Question Paper</h3>
                  <div ref={dropRef} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => document.getElementById('qpParseInput').click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${isDragging ? 'border-primary-400 bg-primary-400/10' : 'border-white/15 hover:border-primary-500/50 hover:bg-white/5'}`}>
                    <input id="qpParseInput" type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => { if (e.target.files[0]) handleFileSelected(e.target.files[0]); }} />
                    {parseFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                        <p className="font-semibold text-gray-200">{parseFile.name}</p>
                        <p className="text-xs text-gray-500">{(parseFile.size / 1024).toFixed(1)} KB</p>
                        <button onClick={(e) => { e.stopPropagation(); setParseFile(null); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"><X className="w-3 h-3" />Remove</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload className="w-10 h-10 opacity-40" /><p className="font-medium">Drag & drop or click to browse</p>
                        <p className="text-xs opacity-60">PDF, TXT, DOCX — max 50MB</p>
                      </div>
                    )}
                  </div>
                  {parsing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Extracting questions with AI...</span>
                        <span>{parseProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-primary-500 transition-all duration-300 rounded-full" style={{ width: `${parseProgress || 10}%` }} /></div>
                    </div>
                  )}
                  <button onClick={handleParseUpload} disabled={!parseFile || parsing} className="btn-primary w-full">
                    {parsing ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting...</> : <><Upload className="w-4 h-4" />Extract Questions</>}
                  </button>
                  <p className="text-xs text-gray-500 text-center">After extraction, questions appear below for you to review and add reference answers.</p>
                </div>
              )}

              {/* Upload Model Answer Mode (only active when questions exist) */}
              {questions.some(q => q.text) && (
                <div className="card space-y-4 border-emerald-500/20 bg-emerald-500/5">
                  <h3 className="text-sm font-semibold text-emerald-400">Upload Model Answer Key (Optional)</h3>
                  <div ref={maDropRef} onDragOver={(e) => { e.preventDefault(); setIsMaDragging(true); }} onDragLeave={() => setIsMaDragging(false)} onDrop={(e) => { e.preventDefault(); setIsMaDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleMaFileSelected(f); }} onClick={() => document.getElementById('maParseInput').click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${isMaDragging ? 'border-emerald-400 bg-emerald-400/10' : 'border-emerald-500/15 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}>
                    <input id="maParseInput" type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => { if (e.target.files[0]) handleMaFileSelected(e.target.files[0]); }} />
                    {maParseFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                        <p className="font-semibold text-gray-200 text-sm">{maParseFile.name}</p>
                        <button onClick={(e) => { e.stopPropagation(); setMaParseFile(null); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"><X className="w-3 h-3" />Remove</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-emerald-400/60">
                        <Upload className="w-8 h-8 opacity-40" /><p className="font-medium text-sm">Drag & drop Model Answer Key</p>
                      </div>
                    )}
                  </div>
                  {maParsing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Extracting model answers...</span>
                        <span>{maParseProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-emerald-500/20 overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${maParseProgress || 10}%` }} /></div>
                    </div>
                  )}
                  <button onClick={handleMaParseUpload} disabled={!maParseFile || maParsing} className="btn-primary w-full bg-emerald-600 hover:bg-emerald-500 border-none">
                    {maParsing ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting Answers...</> : <><Upload className="w-4 h-4" />Extract Answers</>}
                  </button>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">
                    {questionMode === 'upload' && questions.some(q => q.text) ? `Extracted Questions (${questions.length}) — Add Reference Answers` : `Questions (${questions.length})`}
                  </h3>
                  <button onClick={addQuestion} className="btn-outline text-xs"><Plus className="w-3.5 h-3.5" /> Add Question</button>
                </div>
                {questions.map((q, idx) => (
                  <div key={idx} className="card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-400 bg-primary-600/10 px-2.5 py-1 rounded-full">Q{idx + 1}</span>
                      {questions.length > 1 && <button onClick={() => removeQuestion(idx)} className="btn-danger px-2 py-1 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Question No. *</label>
                        <input value={q.questionNumber} onChange={(e) => handleQuestionChange(idx, 'questionNumber', e.target.value)} className={`input text-sm ${errors[idx]?.questionNumber ? 'border-red-500' : ''}`} placeholder="1" />
                        {errors[idx]?.questionNumber && <p className="text-xs text-red-400 mt-1">{errors[idx].questionNumber}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Max Marks</label>
                        <input type="number" value={q.maxMarks} onChange={(e) => handleQuestionChange(idx, 'maxMarks', e.target.value)} className="input text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Question Text *</label>
                        <textarea value={q.text} onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)} className={`input text-sm h-16 resize-none ${errors[idx]?.text ? 'border-red-500' : ''}`} placeholder="Write the question here..." />
                        {errors[idx]?.text && <p className="text-xs text-red-400 mt-1">{errors[idx].text}</p>}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Reference Answer *</label>
                        <textarea value={q.referenceAnswer} onChange={(e) => handleQuestionChange(idx, 'referenceAnswer', e.target.value)} className={`input text-sm h-20 resize-none ${errors[idx]?.referenceAnswer ? 'border-red-500' : ''}`} placeholder="Model answer the AI will compare against..." />
                        {errors[idx]?.referenceAnswer && <p className="text-xs text-red-400 mt-1">{errors[idx].referenceAnswer}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Keywords (comma-separated)</label>
                        <input value={q.keywords} onChange={(e) => handleQuestionChange(idx, 'keywords', e.target.value)} className="input text-sm" placeholder="algorithm, complexity, Big-O" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Key Concepts</label>
                        <input value={q.expectedConcepts} onChange={(e) => handleQuestionChange(idx, 'expectedConcepts', e.target.value)} className="input text-sm" placeholder="time complexity, space complexity" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Step 2 */}
          {step === 2 && (
            <div className="card space-y-6">
              <h2 className="font-semibold text-gray-200">Files & Scoring Weights</h2>
              {!savedExamId && <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-600/10 border border-amber-600/30 text-xs text-amber-400"><AlertCircle className="w-4 h-4 flex-shrink-0" />Save exam data first before uploading files</div>}
              {[{ label: 'Question Paper', key: 'qp', state: qpFile, setter: setQpFile }, { label: 'Model Answer Sheet', key: 'ma', state: maFile, setter: setMaFile }].map(({ label, key, state, setter }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">{label}</label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setter(e.target.files[0])} className="input text-sm flex-1" />
                    <button onClick={() => handleFileUpload(key)} disabled={!state || !savedExamId || saving} className="btn-primary text-xs px-3 py-2.5">
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Scoring Weights</h3>
                {Object.entries(exam.scoringWeights).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4 mb-3">
                    <span className="text-xs font-medium text-gray-400 w-28 capitalize">{key}</span>
                    <input type="range" min={0} max={1} step={0.05} value={val} onChange={(e) => setExam(prev => ({ ...prev, scoringWeights: { ...prev.scoringWeights, [key]: parseFloat(e.target.value) } }))} className="flex-1 accent-primary-500" />
                    <span className="text-xs text-primary-400 w-10 text-right">{Math.round(val * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-200">Review & Finish</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Title', exam.title], ['Subject', exam.subjectName], ['Department', exam.department], ['Total Marks', exam.totalMarks], ['Passing Marks', exam.passingMarks], ['Questions', questions.length]].map(([label, value]) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(88,101,242,0.06)' }}>
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="font-semibold text-gray-200">{value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-600/10 border border-primary-600/20 text-xs text-primary-400">
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                Your exam will be saved as a draft. You can publish it from the Exams list.
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={handleNext} disabled={saving} className="btn-primary">
            {saving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving} className="btn-primary">
            {saving ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <><Save className="w-4 h-4" /> Save & Finish</>}
          </button>
        )}
      </div>

      {/* Preview Mappings Modal */}
      <AnimatePresence>
        {previewMappings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h3 className="font-bold text-gray-100 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /> Review Answer Mappings</h3>
                <button onClick={() => setPreviewMappings(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {previewMappings.map((m, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${m.apply ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={m.apply} onChange={(e) => setPreviewMappings(prev => prev.map((p, j) => i === j ? { ...p, apply: e.target.checked } : p))} className="w-4 h-4 rounded border-white/20 bg-black/50 accent-emerald-500" />
                        <span className="font-bold text-sm text-gray-200">Q{m.questionNumber}</span>
                        {m.confidence > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.confidence > 85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>Conf: {m.confidence}%</span>}
                      </div>
                    </div>
                    <div className="pl-6 space-y-2">
                      <p className="text-xs text-gray-400 line-clamp-2">{m.text}</p>
                      <textarea className="input w-full text-sm h-24 resize-none" value={m.extractedAnswer} onChange={(e) => setPreviewMappings(prev => prev.map((p, j) => i === j ? { ...p, extractedAnswer: e.target.value } : p))} placeholder="No answer extracted..." />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-white/5">
                <button onClick={() => setPreviewMappings(null)} className="btn-ghost">Cancel</button>
                <button onClick={applyMappings} className="btn-primary bg-emerald-600 hover:bg-emerald-500 border-none">Apply Selected Mappings</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
