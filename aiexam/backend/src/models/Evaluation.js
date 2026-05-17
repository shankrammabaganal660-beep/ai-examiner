const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  question: {
    questionId: String,
    questionNumber: String,
    text: String,
    maxMarks: Number,
  },

  // Extracted text
  studentAnswer: { type: String, default: '' },
  extractedText: String,
  extractedTextConfidence: { type: Number, default: 0 },

  // Component scores
  semanticScore: { type: Number, default: 0 },    // 0-1
  keywordScore: { type: Number, default: 0 },     // 0-1
  conceptScore: { type: Number, default: 0 },     // 0-1
  completenessScore: { type: Number, default: 0 }, // 0-1
  geminiRawScore: { type: Number, default: 0 },   // 0-1 from Gemini

  // Final marks
  aiMarks: { type: Number, default: 0 },          // AI suggested
  finalMarks: { type: Number, default: 0 },       // Final (may be overridden)
  maxMarks: { type: Number, default: 0 },

  // AI confidence
  aiConfidence: { type: Number, default: 0 },     // 0-1
  evaluationReliability: { type: Number, default: 0 },

  // Explainable AI
  matchedKeywords: [String],
  missingKeywords: [String],
  matchedConcepts: [String],
  missingConcepts: [String],
  missingConceptsDetails: [{
    concept: String,
    status: { type: String, enum: ['missing', 'partial'] }
  }],
  strengths: [String],
  weaknesses: [{
    issue: String,
    severity: { type: String, enum: ['minor', 'moderate', 'major'] }
  }],
  improvements: [String],
  scoreJustification: String,
  educationalFeedback: String,
  bloomsTaxonomyLevel: String,
  feedbackConfidence: { type: Number, default: 0 },
  aiExplanation: String,
  geminiAnalysis: String,
  deductions: [{ reason: String, marksLost: Number }],

  // Answer location on document
  answerRegion: {
    page: Number,
    topPercent: Number,
    bottomPercent: Number,
    boundingBox: { x: Number, y: Number, width: Number, height: Number }
  },

  // Manual override
  isManuallyOverridden: { type: Boolean, default: false },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  overrideReason: String,
  examinerRemarks: String,

  // Status
  status: {
    type: String,
    enum: ['pending', 'auto_evaluated', 'examiner_reviewed', 'flagged', 'disputed'],
    default: 'pending'
  },
  evaluationVersion: { type: Number, default: 1 },

  // Audit trail
  auditLog: [{
    timestamp: { type: Date, default: Date.now },
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    oldMarks: Number,
    newMarks: Number,
    notes: String,
  }],

}, { timestamps: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);
