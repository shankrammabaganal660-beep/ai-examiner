const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const submissionSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Identity masking — examiners only see this
  anonymousId: { type: String, default: () => `ANON-${uuidv4().substring(0, 8).toUpperCase()}`, unique: true },

  // Uploaded file
  filePath: { type: String, required: true },
  originalName: String,
  fileType: { type: String, enum: ['pdf', 'jpg', 'jpeg', 'png'] },
  fileSize: Number,

  // Pipeline status
  status: {
    type: String,
    enum: ['pending', 'ocr_processing', 'ocr_complete', 'ai_evaluating', 'evaluated', 'failed', 'resubmitted'],
    default: 'pending'
  },
  failureReason: String,

  // Scores
  totalScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  grade: String, // A+, A, B, C, D, F
  isPassed: Boolean,
  rank: Number,

  // OCR result (raw text per page)
  ocrText: [{ page: Number, text: String, confidence: Number }],
  ocrConfidenceAvg: { type: Number, default: 0 },

  // Evaluation summary
  evaluationSummary: {
    strengths: [String],
    improvements: [String],
    overallFeedback: String,
    aiConfidence: Number,
  },

  // Timing
  submittedAt: { type: Date, default: Date.now },
  ocrStartedAt: Date,
  ocrCompletedAt: Date,
  evaluationStartedAt: Date,
  evaluationCompletedAt: Date,

  // Re-evaluation
  reEvaluationRequested: { type: Boolean, default: false },
  reEvaluationReason: String,
  reEvaluationCount: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
