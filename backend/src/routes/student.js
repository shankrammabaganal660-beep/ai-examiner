const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSubmission } = require('../middleware/upload');

router.use(protect, authorize('student'));

router.get('/exams', studentController.getAvailableExams);
router.post('/submit/:examId', uploadSubmission.single('file'), studentController.submitExam);
router.get('/submissions', studentController.getMySubmissions);
router.get('/submissions/:id/result', studentController.getResult);
router.post('/submissions/:id/re-evaluate', studentController.requestReEvaluation);
router.get('/analytics', studentController.getAnalytics);
router.get('/notifications', studentController.getNotifications);
router.patch('/notifications/read-all', studentController.markAllRead);

router.get('/settings', studentController.getSettings);
router.patch('/settings', studentController.updateSettings);
router.put('/change-password', studentController.changePassword);

module.exports = router;
