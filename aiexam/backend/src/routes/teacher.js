const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');
const { uploadQuestionPaper, uploadModelAnswer, uploadQuestionParser } = require('../middleware/upload');

router.use(protect, authorize('teacher', 'examiner', 'admin'));

// Exams
router.get('/exams', teacherController.getExams);
router.post('/exams', teacherController.createExam);
router.get('/exams/:id', teacherController.getExam);
router.put('/exams/:id', teacherController.updateExam);
router.delete('/exams/:id', teacherController.deleteExam);
router.patch('/exams/:id/publish', teacherController.publishExam);
router.post('/exams/:id/upload-question-paper', uploadQuestionPaper.single('file'), teacherController.uploadQuestionPaper);
router.post('/exams/:id/upload-model-answer', uploadModelAnswer.single('file'), teacherController.uploadModelAnswer);

// Submissions
router.get('/submissions', teacherController.getSubmissions);
router.get('/submissions/:id/evaluations', teacherController.getEvaluations);
router.patch('/evaluations/:id/override', teacherController.overrideMarks);

// Analytics, Notifications & Settings
router.get('/analytics', teacherController.getAnalytics);
router.get('/notifications', teacherController.getNotifications);
router.patch('/notifications/:id/read', teacherController.markNotificationRead);
router.get('/settings', teacherController.getSettings);
router.patch('/settings', teacherController.updateSettings);
router.put('/change-password', teacherController.changePassword);

// Question Paper Parsing
router.post('/parse-question-paper', uploadQuestionParser.single('file'), teacherController.parseQuestionPaper);
router.post('/extract-model-answers', uploadQuestionParser.single('file'), teacherController.extractModelAnswers);

module.exports = router;
