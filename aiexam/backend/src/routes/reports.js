const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Exam = require('../models/Exam');

// GET /api/reports/submission/:id — PDF report data
router.get('/submission/:id', protect, async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('exam', 'title subjectName totalMarks passingMarks department semester');
    if (!submission) return res.status(404).json({ success: false, message: 'Not found' });

    const evaluations = await Evaluation.find({ submission: submission._id });
    res.json({ success: true, data: { submission, evaluations } });
  } catch (err) { next(err); }
});

// GET /api/reports/exam/:id — exam-level analytics
router.get('/exam/:id', protect, async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Not found' });

    const submissions = await Submission.find({ exam: exam._id, status: 'evaluated' });
    const scoreDistribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    submissions.forEach(s => {
      const p = s.percentage;
      if (p <= 20) scoreDistribution['0-20']++;
      else if (p <= 40) scoreDistribution['21-40']++;
      else if (p <= 60) scoreDistribution['41-60']++;
      else if (p <= 80) scoreDistribution['61-80']++;
      else scoreDistribution['81-100']++;
    });

    res.json({ success: true, data: { exam, submissions, scoreDistribution } });
  } catch (err) { next(err); }
});

module.exports = router;
