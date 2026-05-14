const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const path = require('path');
const aiService = require('../services/aiService');

// GET /api/student/exams
exports.getAvailableExams = async (req, res, next) => {
  try {
    const { search, subject } = req.query;
    const filter = { status: 'published' };
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (subject) filter.subjectName = { $regex: subject, $options: 'i' };

    const exams = await Exam.find(filter)
      .select('-questions.referenceAnswer -modelAnswerPath -questions.keywords -questions.expectedConcepts')
      .sort({ publishedAt: -1 });

    // Find which exams this student already submitted
    const mySubmissions = await Submission.find({ student: req.user._id }).select('exam status');
    const submittedMap = {};
    mySubmissions.forEach(s => { submittedMap[s.exam.toString()] = s.status; });

    const enriched = exams.map(e => ({
      ...e.toObject(),
      myStatus: submittedMap[e._id.toString()] || null
    }));

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
};

// POST /api/student/submit/:examId
exports.submitExam = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Answer sheet file is required' });

    const exam = await Exam.findOne({ _id: req.params.examId, status: 'published' });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found or not published' });

    // Prevent duplicate submissions
    const existing = await Submission.findOne({ student: req.user._id, exam: exam._id });
    if (existing) return res.status(409).json({ success: false, message: 'You have already submitted for this exam', data: existing });

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const submission = await Submission.create({
      exam: exam._id,
      student: req.user._id,
      filePath: req.file.path,
      originalName: req.file.originalname,
      fileType: ext,
      fileSize: req.file.size,
      status: 'pending'
    });

    // Update exam stats
    await Exam.findByIdAndUpdate(exam._id, { $inc: { totalSubmissions: 1 } });

    // Start async AI evaluation pipeline (don't await)
    aiService.triggerEvaluation(submission._id, exam._id, req.file.path).catch(console.error);

    // Create notification for teacher
    await Notification.create({
      recipient: exam.createdBy,
      type: 'submission_received',
      title: 'New Submission',
      message: `A new answer sheet was submitted for "${exam.title}"`,
      link: `/teacher/submissions`,
      metadata: { submissionId: submission._id, examId: exam._id, anonymousId: submission.anonymousId }
    });

    res.status(201).json({ success: true, data: submission, message: 'Submitted successfully. AI evaluation in progress.' });
  } catch (err) { next(err); }
};

// GET /api/student/submissions
exports.getMySubmissions = async (req, res, next) => {
  try {
    let submissions = await Submission.find({ student: req.user._id })
      .populate('exam', 'title subjectName totalMarks department semester examDate')
      .sort({ submittedAt: -1 });
      
    // Filter out submissions where the exam was deleted
    submissions = submissions.filter(s => s.exam != null);
    
    res.json({ success: true, data: submissions });
  } catch (err) { next(err); }
};

// GET /api/student/submissions/:id/result
exports.getResult = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ _id: req.params.id, student: req.user._id })
      .populate('exam', 'title subjectName totalMarks passingMarks department semester');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    const evaluations = await Evaluation.find({ submission: submission._id });
    res.json({ success: true, data: { submission, evaluations } });
  } catch (err) { next(err); }
};

// GET /api/student/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user._id, status: 'evaluated' })
      .populate('exam', 'title subjectName totalMarks');

    const subjectPerformance = {};
    const timeline = [];

    submissions.forEach(s => {
      const subj = s.exam?.subjectName;
      if (!subj || ['Unknown', 'null', 'undefined', 'N/A'].includes(subj)) {
        console.warn(`[StudentAnalytics] Missing subject detected for exam ${s.exam?._id || 'unknown'}`);
        return;
      }
      
      if (!subjectPerformance[subj]) subjectPerformance[subj] = { total: 0, count: 0, scores: [] };
      subjectPerformance[subj].total += s.percentage || 0;
      subjectPerformance[subj].count++;
      subjectPerformance[subj].scores.push(s.percentage || 0);
      timeline.push({ date: s.submittedAt, subject: subj, score: s.percentage, examTitle: s.exam?.title });
    });

    const subjects = Object.entries(subjectPerformance).map(([name, data]) => ({
      name,
      average: data.count ? +(data.total / data.count).toFixed(1) : 0,
      count: data.count,
      scores: data.scores,
      trend: data.scores.length > 1 ? data.scores[data.scores.length - 1] - data.scores[0] : 0
    }));

    const overallAvg = submissions.length ? +(submissions.reduce((s, x) => s + (x.percentage || 0), 0) / submissions.length).toFixed(1) : 0;

    res.json({ success: true, data: { subjects, timeline, overallAvg, totalExams: submissions.length } });
  } catch (err) { next(err); }
};

// GET /api/student/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

// PATCH /api/student/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

// POST /api/student/submissions/:id/re-evaluate
exports.requestReEvaluation = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const submission = await Submission.findOne({ _id: req.params.id, student: req.user._id });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.reEvaluationCount >= 2) return res.status(400).json({ success: false, message: 'Maximum re-evaluation requests reached' });

    submission.reEvaluationRequested = true;
    submission.reEvaluationReason = reason;
    submission.reEvaluationCount++;
    await submission.save();

    res.json({ success: true, message: 'Re-evaluation request submitted' });
  } catch (err) { next(err); }
};

// GET /api/student/settings
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -resetPasswordToken');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/student/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'rollNumber', 'usn', 'semester', 'department', 'notificationPreferences', 'themePreference', 'avatar'];
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, data: user, message: 'Settings updated successfully' });
  } catch (err) { next(err); }
};

// PUT /api/student/change-password
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
