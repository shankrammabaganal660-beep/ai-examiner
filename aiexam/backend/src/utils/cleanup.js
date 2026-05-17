require('dotenv').config();
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Exam = require('../models/Exam');

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aiexaminer');
  console.log('✅ Connected to MongoDB');

  // 1. Find and delete submissions pointing to deleted exams
  const allSubmissions = await Submission.find().populate('exam');
  const orphanedSubmissions = allSubmissions.filter(s => !s.exam);
  if (orphanedSubmissions.length > 0) {
    const ids = orphanedSubmissions.map(s => s._id);
    await Submission.deleteMany({ _id: { $in: ids } });
    console.log(`🗑️  Deleted ${ids.length} orphaned submissions (exam was deleted).`);
  } else {
    console.log('✅ No orphaned submissions found.');
  }

  // 2. Find and delete evaluations pointing to deleted submissions
  const allEvaluations = await Evaluation.find().populate('submission');
  const orphanedEvals = allEvaluations.filter(e => !e.submission);
  if (orphanedEvals.length > 0) {
    const ids = orphanedEvals.map(e => e._id);
    await Evaluation.deleteMany({ _id: { $in: ids } });
    console.log(`🗑️  Deleted ${ids.length} orphaned evaluations (submission was deleted).`);
  } else {
    console.log('✅ No orphaned evaluations found.');
  }

  // 3. Find evaluations with missing exam reference
  const evalsWithBadExam = await Evaluation.find().populate('exam');
  const badExamEvals = evalsWithBadExam.filter(e => !e.exam);
  if (badExamEvals.length > 0) {
    const ids = badExamEvals.map(e => e._id);
    await Evaluation.deleteMany({ _id: { $in: ids } });
    console.log(`🗑️  Deleted ${ids.length} evaluations with missing exam reference.`);
  } else {
    console.log('✅ No evaluations with missing exam reference found.');
  }

  console.log('\n✅ Database cleanup complete!');
  await mongoose.disconnect();
}

cleanup().catch(err => { console.error('❌ Cleanup failed:', err); process.exit(1); });
