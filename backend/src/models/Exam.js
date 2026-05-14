const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionNumber: { type: String, required: true },
  text: { type: String, required: true },
  referenceAnswer: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  keywords: [{ type: String }],
  expectedConcepts: [{ type: String }],
  difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  isOptional: { type: Boolean, default: false },
  subQuestions: [{
    label: String,
    text: String,
    referenceAnswer: String,
    maxMarks: Number,
    keywords: [String],
  }]
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  instructions: String,
  subjectName: { type: String, required: true },
  department: String,
  semester: String,
  examDate: Date,
  totalMarks: { type: Number, default: 100 },
  passingMarks: { type: Number, default: 40 },
  duration: Number, // minutes
  difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

  // Creator
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedExaminers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Files
  questionPaperPath: String,
  questionPaperOriginalName: String,
  modelAnswerPath: String,
  modelAnswerOriginalName: String,

  // Questions (extracted or manually entered)
  questions: [questionSchema],

  // Status
  status: { type: String, enum: ['draft', 'published', 'closed', 'archived'], default: 'draft' },
  publishedAt: Date,
  closedAt: Date,

  // AI Scoring Weights
  scoringWeights: {
    semantic: { type: Number, default: 0.4 },
    keyword: { type: Number, default: 0.25 },
    concept: { type: Number, default: 0.25 },
    completeness: { type: Number, default: 0.1 },
  },

  // Analytics cache
  totalSubmissions: { type: Number, default: 0 },
  evaluatedCount: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  passRate: { type: Number, default: 0 },
  topScore: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
