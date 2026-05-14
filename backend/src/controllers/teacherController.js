const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const path = require('path');
const aiService = require('../services/aiService');

// ── EXAMS ──────────────────────────────────────────────────────────────────────

// GET /api/teacher/exams
exports.getExams = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const total = await Exam.countDocuments(filter);
    const exams = await Exam.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: exams, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/teacher/exams/:id
exports.getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
};

// POST /api/teacher/exams
exports.createExam = async (req, res, next) => {
  try {
    const { title, description, subjectName, department, semester, examDate, totalMarks, passingMarks, duration, difficultyLevel, instructions, questions, scoringWeights } = req.body;
    console.log('[createExam] Questions received:', JSON.stringify(questions, null, 2));
    
    const validQuestions = (questions || []).filter(q => q.text?.trim() && q.referenceAnswer?.trim());
    // Only reject if questions were explicitly sent but ALL of them are invalid
    if (questions && questions.length > 0 && validQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'All provided questions must have question text and a reference answer' });
    }

    const exam = await Exam.create({
      title, description, subjectName, department, semester, examDate,
      totalMarks, passingMarks, duration, difficultyLevel, instructions,
      questions: validQuestions,
      scoringWeights: scoringWeights || {},
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: exam });
  } catch (err) { next(err); }
};

// PUT /api/teacher/exams/:id
exports.updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
};

// PATCH /api/teacher/exams/:id/publish
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.questions.length === 0) return res.status(400).json({ success: false, message: 'Cannot publish an exam without questions' });
    exam.status = 'published';
    exam.publishedAt = new Date();
    await exam.save();
    res.json({ success: true, data: exam, message: 'Exam published' });
  } catch (err) { next(err); }
};

// DELETE /api/teacher/exams/:id
exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    
    // Cascade delete orphaned records
    await Submission.deleteMany({ exam: exam._id });
    await Evaluation.deleteMany({ exam: exam._id });
    await Notification.deleteMany({ 'metadata.examId': exam._id });
    await Exam.findByIdAndDelete(exam._id);
    
    res.json({ success: true, message: 'Exam and related records deleted' });
  } catch (err) { next(err); }
};

// POST /api/teacher/exams/:id/upload-question-paper
exports.uploadQuestionPaper = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { questionPaperPath: req.file.path, questionPaperOriginalName: req.file.originalname },
      { new: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Try AI extraction of questions
    try {
      const extracted = await aiService.extractQuestions(req.file.path);
      if (extracted && extracted.questions && extracted.questions.length > 0) {
        exam.questions = extracted.questions;
        await exam.save();
      }
    } catch (aiErr) {
      console.warn('AI question extraction failed (non-fatal):', aiErr.message);
    }

    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
};

// POST /api/teacher/exams/:id/upload-model-answer
exports.uploadModelAnswer = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { modelAnswerPath: req.file.path, modelAnswerOriginalName: req.file.originalname },
      { new: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, data: exam });
  } catch (err) { next(err); }
};

// ── SUBMISSIONS ────────────────────────────────────────────────────────────────

// GET /api/teacher/submissions
exports.getSubmissions = async (req, res, next) => {
  try {
    const { examId, status, page = 1, limit = 20 } = req.query;
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id');
    const examIds = exams.map(e => e._id);
    const filter = { exam: { $in: examIds } };
    if (examId) filter.exam = examId;
    if (status) filter.status = status;

    const total = await Submission.countDocuments(filter);
    const submissions = await Submission.find(filter)
      .populate('exam', 'title subjectName totalMarks')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mask student identity — return anonymousId only
    const masked = submissions.map(s => {
      const obj = s.toObject();
      delete obj.student;
      return obj;
    });

    res.json({ success: true, data: masked, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/teacher/submissions/:id/evaluations
exports.getEvaluations = async (req, res, next) => {
  try {
    const evals = await Evaluation.find({ submission: req.params.id });
    res.json({ success: true, data: evals });
  } catch (err) { next(err); }
};

// PATCH /api/teacher/evaluations/:id/override
exports.overrideMarks = async (req, res, next) => {
  try {
    const { finalMarks, examinerRemarks } = req.body;
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ success: false, message: 'Evaluation not found' });

    evaluation.auditLog.push({
      action: 'manual_override',
      performedBy: req.user._id,
      oldMarks: evaluation.finalMarks,
      newMarks: finalMarks,
      notes: examinerRemarks
    });
    evaluation.finalMarks = finalMarks;
    evaluation.examinerRemarks = examinerRemarks;
    evaluation.isManuallyOverridden = true;
    evaluation.overriddenBy = req.user._id;
    evaluation.overrideReason = examinerRemarks;
    evaluation.status = 'examiner_reviewed';
    await evaluation.save();

    // Update submission total score
    const allEvals = await Evaluation.find({ submission: evaluation.submission });
    const totalScore = allEvals.reduce((sum, e) => sum + e.finalMarks, 0);
    await Submission.findByIdAndUpdate(evaluation.submission, { totalScore });

    res.json({ success: true, data: evaluation });
  } catch (err) { next(err); }
};

// GET /api/teacher/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const exams = await Exam.find({ createdBy: req.user._id }).select('_id title subjectName totalMarks');
    const examIds = exams.map(e => e._id);
    const Evaluation = require('../models/Evaluation');

    const [submissionStats, scoreDistribution, subjectPerformance, commonWeaknesses, mostMissedConcepts] = await Promise.all([
      Submission.aggregate([
        { $match: { exam: { $in: examIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Submission.aggregate([
        { $match: { exam: { $in: examIds }, status: 'evaluated' } },
        { $bucket: { groupBy: '$percentage', boundaries: [0, 20, 40, 60, 80, 100], default: '100+', output: { count: { $sum: 1 } } } }
      ]),
      Submission.aggregate([
        { $match: { exam: { $in: examIds } } },
        { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examData' } },
        { $unwind: '$examData' },
        { $group: { _id: '$examData.subjectName', avgScore: { $avg: '$percentage' }, total: { $sum: 1 } } }
      ]),
      Evaluation.aggregate([
        { $match: { exam: { $in: examIds } } },
        { $unwind: '$weaknesses' },
        { $group: { _id: '$weaknesses.issue', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Evaluation.aggregate([
        { $match: { exam: { $in: examIds } } },
        { $unwind: '$missingConceptsDetails' },
        { $match: { 'missingConceptsDetails.status': 'missing' } },
        { $group: { _id: '$missingConceptsDetails.concept', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({ success: true, data: { exams, submissionStats, scoreDistribution, subjectPerformance, commonWeaknesses, mostMissedConcepts } });
  } catch (err) { next(err); }
};

// GET /api/teacher/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

// PATCH /api/teacher/notifications/:id/read
exports.markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
};

// POST /api/teacher/parse-question-paper
exports.parseQuestionPaper = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    console.log('[parseQuestionPaper] File received:', req.file.originalname, req.file.path);
    
    // Call AI service to extract questions
    const extracted = await aiService.extractQuestions(req.file.path);
    
    // Clean up temp file
    const fs = require('fs');
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore cleanup errors */ }
    
    const questions = (extracted.questions || []).map((q, i) => ({
      questionNumber: q.questionNumber || String(i + 1),
      text: q.text || '',
      maxMarks: Number(q.maxMarks) || 10,
      referenceAnswer: q.referenceAnswer || '',
      keywords: q.keywords || [],
      expectedConcepts: q.expectedConcepts || [],
      difficultyLevel: q.difficultyLevel || 'medium',
    }));
    
    console.log('[parseQuestionPaper] Extracted', questions.length, 'questions');
    res.json({ success: true, data: { questions, rawText: extracted.raw_text || '' } });
  } catch (err) {
    console.error('[parseQuestionPaper] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to extract questions: ' + err.message });
  }
};

// POST /api/teacher/extract-model-answers
exports.extractModelAnswers = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    console.log('[extractModelAnswers] File received:', req.file.originalname, req.file.path);
    
    // Call AI service to extract model answers
    const extracted = await aiService.extractModelAnswers(req.file.path);
    
    // Clean up temp file
    const fs = require('fs');
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore cleanup errors */ }
    
    const answers = extracted.answers || {};
    
    console.log('[extractModelAnswers] Extracted', Object.keys(answers).length, 'answers');
    res.json({ success: true, data: { answers, rawText: extracted.raw_text || '' } });
  } catch (err) {
    console.error('[extractModelAnswers] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to extract model answers: ' + err.message });
  }
};

// GET /api/teacher/settings
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -resetPasswordToken');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/teacher/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'employeeId', 'department', 'subjects', 'notificationPreferences', 'themePreference', 'avatar', 'bio', 'phoneNumber'];
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, data: user, message: 'Settings updated successfully' });
  } catch (err) { next(err); }
};

// PUT /api/teacher/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};
