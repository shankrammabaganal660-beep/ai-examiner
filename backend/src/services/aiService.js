const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Exam = require('../models/Exam');
const Notification = require('../models/Notification');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Call Python AI service for OCR
exports.performOCR = async (filePath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  const response = await axios.post(`${AI_SERVICE_URL}/ocr`, form, {
    headers: form.getHeaders(),
    timeout: 120000
  });
  return response.data;
};

// Call Python AI service for Gemini evaluation
exports.evaluateAnswer = async (studentAnswer, referenceAnswer, question, maxMarks, keywords = [], concepts = []) => {
  const response = await axios.post(`${AI_SERVICE_URL}/evaluate`, {
    student_answer: studentAnswer,
    reference_answer: referenceAnswer,
    question: question,
    max_marks: maxMarks,
    keywords,
    concepts,
    gemini_api_key: GEMINI_API_KEY
  }, { timeout: 60000 });
  return response.data;
};

// Call Python AI service for question extraction from paper
exports.extractQuestions = async (filePath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  const response = await axios.post(`${AI_SERVICE_URL}/extract-questions`, form, {
    headers: form.getHeaders(),
    timeout: 120000
  });
  return response.data;
};

// Call Python AI service for model answer extraction
exports.extractModelAnswers = async (filePath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  const response = await axios.post(`${AI_SERVICE_URL}/extract-model-answers`, form, {
    headers: form.getHeaders(),
    timeout: 120000
  });
  return response.data;
};

// Call Python AI service to map full text to specific questions
exports.extractAnswers = async (fullText, questions) => {
  console.log(`[AI Pipeline] Calling /extract-answers with text length ${fullText.length} and ${questions.length} questions`);
  const response = await axios.post(`${AI_SERVICE_URL}/extract-answers`, {
    text: fullText,
    questions: questions
  }, { timeout: 120000 });
  return response.data;
};

// Full async evaluation pipeline
exports.triggerEvaluation = async (submissionId, examId, filePath) => {
  try {
    // 1. Update status → OCR processing
    await Submission.findByIdAndUpdate(submissionId, {
      status: 'ocr_processing',
      ocrStartedAt: new Date()
    });

    // 2. Run OCR
    let ocrResult;
    try {
      ocrResult = await exports.performOCR(filePath);
    } catch (ocrErr) {
      console.warn('[AI] OCR failed, using placeholder text:', ocrErr.message);
      ocrResult = { pages: [{ page: 1, text: '', confidence: 0 }], avg_confidence: 0 };
    }

    const fullText = (ocrResult.pages || []).map(p => p.text).join('\n');
    const avgConf = ocrResult.avg_confidence || 0;
    
    console.log(`[AI Pipeline] OCR Engine used: ${ocrResult.ocr_engine}, Avg Confidence: ${avgConf}`);
    console.log(`[AI Pipeline] Extracted Text (first 200 chars): ${fullText.substring(0, 200)}...`);

    if (!fullText.trim() || ocrResult.ocr_engine === 'failed') {
      console.warn('[AI Pipeline] OCR extraction returned empty text. Failing evaluation.');
      await Submission.findByIdAndUpdate(submissionId, { 
        status: 'failed', 
        failureReason: 'OCR Extraction Failed. Ensure the document is readable.' 
      });
      return;
    }

    await Submission.findByIdAndUpdate(submissionId, {
      status: 'ai_evaluating',
      ocrText: ocrResult.pages || [],
      ocrConfidenceAvg: avgConf,
      ocrCompletedAt: new Date(),
      evaluationStartedAt: new Date()
    });

    // 3. Get exam & questions
    const exam = await Exam.findById(examId);
    if (!exam || !exam.questions || exam.questions.length === 0) {
      await Submission.findByIdAndUpdate(submissionId, { status: 'failed', failureReason: 'No questions found in exam' });
      return;
    }

    // CLEANUP: Delete any previous evaluations for this submission to prevent duplicates
    console.log(`[AI Pipeline] Deleting old evaluations for submission ${submissionId}`);
    await Evaluation.deleteMany({ submission: submissionId });

    // 4. Map full text to specific question answers
    let extractedAnswersMap = {};
    try {
      const mappingResponse = await exports.extractAnswers(fullText, exam.questions);
      extractedAnswersMap = mappingResponse.answers || {};
      console.log('[AI Pipeline] Extracted mapped answers:', Object.keys(extractedAnswersMap).length, 'questions mapped.');
    } catch (err) {
      console.warn('[AI Pipeline] Answer extraction endpoint failed, falling back to full text for all:', err.message);
      exam.questions.forEach(q => {
        extractedAnswersMap[q._id.toString()] = fullText;
        extractedAnswersMap[q.questionNumber] = fullText;
      });
    }

    // 5. Evaluate each question
    const evaluations = [];
    let totalScore = 0;

    for (const q of exam.questions) {
      // Find the specific answer mapped to this question by ID or Number
      const studentAnswer = extractedAnswersMap[q._id.toString()] || extractedAnswersMap[q.questionNumber] || "";
      console.log(`[AI Pipeline] Evaluating Q${q.questionNumber}. Student Answer Length: ${studentAnswer.length}`);

      let evalResult;
      try {
        evalResult = await exports.evaluateAnswer(
          studentAnswer, q.referenceAnswer, q.text, q.maxMarks,
          q.keywords || [], q.expectedConcepts || []
        );
        console.log(`[AI Pipeline] Q${q.questionNumber} Evaluated: AI Marks = ${evalResult.ai_marks}`);
      } catch (evalErr) {
        console.warn(`[AI Pipeline] Evaluation failed for Q${q.questionNumber}:`, evalErr.message);
        evalResult = {
          semantic_score: 0, keyword_score: 0, concept_score: 0, completeness_score: 0,
          gemini_raw_score: 0, ai_marks: 0, ai_confidence: 0,
          matched_keywords: [], missing_keywords: [], matched_concepts: [], missing_concepts: [],
          missing_concepts_details: [], strengths: [], weaknesses: [{ issue: 'Evaluation failed', severity: 'major' }],
          improvements: ['Evaluation unavailable - manual review required'],
          ai_explanation: 'AI evaluation service unavailable.',
          score_justification: 'Evaluation failed due to system error. Requires manual grading.',
          educational_feedback: 'We could not evaluate this answer automatically. Please wait for a teacher to review it.',
          blooms_taxonomy_level: 'Unknown',
          feedback_confidence: 0
        };
      }

      const finalMarks = evalResult.ai_marks || 0;
      totalScore += finalMarks;

      const evaluation = await Evaluation.create({
        submission: submissionId,
        exam: examId,
        question: { questionId: q._id, questionNumber: q.questionNumber, text: q.text, maxMarks: q.maxMarks },
        studentAnswer: studentAnswer,
        extractedText: fullText,
        extractedTextConfidence: avgConf,
        semanticScore: evalResult.semantic_score || 0,
        keywordScore: evalResult.keyword_score || 0,
        conceptScore: evalResult.concept_score || 0,
        completenessScore: evalResult.completeness_score || 0,
        geminiRawScore: evalResult.gemini_raw_score || 0,
        aiMarks: finalMarks,
        finalMarks: finalMarks,
        maxMarks: q.maxMarks,
        aiConfidence: evalResult.ai_confidence || 0,
        matchedKeywords: evalResult.matched_keywords || [],
        missingKeywords: evalResult.missing_keywords || [],
        matchedConcepts: evalResult.matched_concepts || [],
        missingConcepts: evalResult.missing_concepts || [],
        missingConceptsDetails: evalResult.missing_concepts_details || [],
        strengths: evalResult.strengths || [],
        weaknesses: evalResult.weaknesses || [],
        improvements: evalResult.improvements || [],
        scoreJustification: evalResult.score_justification || '',
        educationalFeedback: evalResult.educational_feedback || '',
        bloomsTaxonomyLevel: evalResult.blooms_taxonomy_level || 'Unknown',
        feedbackConfidence: evalResult.feedback_confidence || 0,
        aiExplanation: evalResult.ai_explanation || '',
        status: 'auto_evaluated'
      });
      evaluations.push(evaluation);
    }

    // 5. Finalize submission
    const percentage = exam.totalMarks > 0 ? +(totalScore / exam.totalMarks * 100).toFixed(1) : 0;
    const isPassed = percentage >= (exam.passingMarks / exam.totalMarks * 100);
    const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';

    await Submission.findByIdAndUpdate(submissionId, {
      status: 'evaluated',
      totalScore,
      percentage,
      isPassed,
      grade,
      evaluationCompletedAt: new Date(),
      evaluationSummary: {
        overallFeedback: `Score: ${percentage}% | Grade: ${grade}`,
        aiConfidence: evaluations.reduce((s, e) => s + e.aiConfidence, 0) / evaluations.length
      }
    });

    // Update exam analytics
    const allEvaluated = await Submission.find({ exam: examId, status: 'evaluated' });
    const avgScore = allEvaluated.reduce((s, x) => s + x.percentage, 0) / allEvaluated.length;
    const passRate = allEvaluated.filter(x => x.isPassed).length / allEvaluated.length * 100;
    const topScore = Math.max(...allEvaluated.map(x => x.percentage));

    await Exam.findByIdAndUpdate(examId, {
      evaluatedCount: allEvaluated.length,
      averageScore: +avgScore.toFixed(1),
      passRate: +passRate.toFixed(1),
      topScore: +topScore.toFixed(1)
    });

    // 6. Notify student
    const submission = await Submission.findById(submissionId);
    await Notification.create({
      recipient: submission.student,
      type: 'evaluation_complete',
      title: 'Evaluation Complete',
      message: `Your answer sheet has been evaluated. Score: ${percentage}% (${grade})`,
      link: `/student/results/${submissionId}`,
      metadata: { submissionId, percentage, grade }
    });

    console.log(`✅ Evaluation complete for submission ${submissionId} — ${percentage}% (${grade})`);
  } catch (err) {
    console.error('[AI Pipeline] Fatal error:', err.message);
    await Submission.findByIdAndUpdate(submissionId, { status: 'failed', failureReason: err.message });
  }
};
