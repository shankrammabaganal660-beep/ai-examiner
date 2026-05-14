const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Submission = require('../models/Submission');
const aiService = require('../services/aiService');

// POST /api/ai/re-evaluate/:submissionId — manual trigger (teacher)
router.post('/re-evaluate/:submissionId', protect, async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    submission.status = 'pending';
    submission.reEvaluationCount++;
    await submission.save();

    aiService.triggerEvaluation(submission._id, submission.exam, submission.filePath).catch(console.error);

    res.json({ success: true, message: 'Re-evaluation triggered' });
  } catch (err) { next(err); }
});

// GET /api/ai/status/:submissionId
router.get('/status/:submissionId', protect, async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).select('status ocrConfidenceAvg percentage grade evaluationCompletedAt');
    if (!submission) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: submission });
  } catch (err) { next(err); }
});

// GET /api/ai/health — check if Python AI service is up
router.get('/health', async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`, { timeout: 5000 });
    res.json({ success: true, aiService: response.data });
  } catch (err) {
    res.json({ success: false, aiService: { status: 'unavailable', error: err.message } });
  }
});

module.exports = router;
