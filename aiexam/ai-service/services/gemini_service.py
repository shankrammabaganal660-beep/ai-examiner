import asyncio
import json
import re
import os
from typing import Optional

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("WARNING: google-generativeai not installed.")


EVALUATION_PROMPT = """You are an expert academic examiner. Evaluate the student's answer against the reference answer.

QUESTION: {question}

REFERENCE ANSWER: {reference_answer}

STUDENT ANSWER: {student_answer}

EXPECTED KEYWORDS: {keywords}
EXPECTED CONCEPTS: {concepts}
MAXIMUM MARKS: {max_marks}

Provide a detailed evaluation in the following JSON format (respond ONLY with valid JSON, no markdown):
{{
  "semantic_score": <float 0-1, how semantically similar the answer is>,
  "keyword_score": <float 0-1, fraction of expected keywords present>,
  "concept_score": <float 0-1, fraction of expected concepts covered>,
  "completeness_score": <float 0-1, how complete the answer is>,
  "gemini_raw_score": <float 0-1, your overall assessment>,
  "ai_marks": <float, marks awarded out of {max_marks}>,
  "ai_confidence": <float 0-1, your confidence in this evaluation>,
  "matched_keywords": [<list of matched keywords>],
  "missing_keywords": [<list of missing keywords>],
  "matched_concepts": [<list of matched concepts>],
  "missing_concepts": [<list of missing concepts as strings>],
  "missing_concepts_details": [
    {{"concept": "concept name", "status": "missing" or "partial"}}
  ],
  "strengths": [<list of 2-3 specific strengths in the answer>],
  "weaknesses": [
    {{"issue": "specific issue", "severity": "minor" | "moderate" | "major"}}
  ],
  "improvements": [<list of 2-3 specific learning suggestions>],
  "score_justification": "<Explain WHY marks were deducted. E.g. '2 marks deducted because...'>",
  "educational_feedback": "<Human-like examiner feedback. Encouraging but professional. E.g. 'Your answer demonstrates good understanding of...'>",
  "blooms_taxonomy_level": "<basic understanding | conceptual understanding | analytical explanation | advanced explanation>",
  "feedback_confidence": <int 0-100, confidence in this feedback>,
  "ai_explanation": "<Brief technical explanation of evaluation>"
}}"""

QUESTION_EXTRACTION_PROMPT = """You are an expert at reading exam question papers.
Your task is to extract ALL questions from the text below.

RULES:
- Detect questions starting with: Q1, Q2, Q.1, Q.2, 1., 2., Question 1, QUESTION 1, (1), (2) etc.
- Include the full question text including sub-parts.
- Detect marks patterns: [10 Marks], (10M), 10 marks, Max: 10 — extract as maxMarks integer.
- If no marks found, default to 10.
- Do NOT include solution/answer text.
- Return ONLY a valid JSON array, no markdown, no explanation.

EXAM PAPER TEXT:
{text}

Return a JSON array ONLY:
[
  {{
    "questionNumber": "1",
    "text": "Complete question text",
    "maxMarks": 10,
    "keywords": [],
    "expectedConcepts": [],
    "difficultyLevel": "medium"
  }}
]

If no questions found, return an empty array []."""

MODEL_ANSWER_EXTRACTION_PROMPT = """You are an expert at reading exam model answer keys.
Your task is to extract the reference/model answer for EACH question from this answer key document.

RULES:
- Detect answer sections starting with: Q1, Q2, 1., 2., Question 1, Answer 1, Ans 1 etc.
- Extract the FULL answer text for each question, including all sub-parts.
- Preserve important technical terms, formulas, and code snippets.
- Do NOT include the question text itself in the answer.
- Estimate your confidence (0-100) that this is the correct answer.
- NEVER merge answers for different questions together.
- Return ONLY a valid JSON object mapping question numbers to an object with "answer" and "confidence".

ANSWER KEY TEXT:
{text}

Return a JSON object ONLY (no markdown, no extra text):
{{
  "Q1": {{
    "answer": "Complete reference answer for question 1...",
    "confidence": 95
  }},
  "Q2": {{
    "answer": "Complete reference answer for question 2...",
    "confidence": 92
  }}
}}
"""
ANSWER_EXTRACTION_PROMPT = """You are an expert at extracting student answers from handwritten or scanned exam papers.
You are given the full OCR extracted text of a student's submission, and a list of questions that were asked.

YOUR CRITICAL TASKS:
1. Ignore any header information (e.g. Student Name, ID, Subject, Exam Title, Page Numbers).
2. Extract ONLY the EXACT text that the student wrote as the answer for EACH question.
3. NEVER include the text of the question itself in your extracted answer.
4. STRICT BOUNDARIES: Ensure that the answer for Q1 does NOT contain the answer for Q2.
5. If the student did not answer a question, leave it as an empty string "".

QUESTIONS:
{questions}

STUDENT SUBMISSION TEXT:
{text}

Return ONLY valid JSON in this format mapping question IDs to the extracted answer text. Do not include markdown formatting:
{{
  "question_id_1": "Extracted answer text for question 1 ONLY",
  "question_id_2": "Extracted answer text for question 2 ONLY"
}}
"""


class GeminiService:
    def __init__(self):
        self.model = None
        self._init_model(os.getenv("GEMINI_API_KEY", ""))

    def _init_model(self, api_key: str):
        if GEMINI_AVAILABLE and api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                print("✅ Gemini AI initialized")
            except Exception as e:
                print(f"⚠️ Gemini init failed: {e}")
                self.model = None

    def is_available(self) -> bool:
        return self.model is not None

    def _ensure_model(self, api_key: str):
        if not self.model and api_key:
            self._init_model(api_key)

    def _parse_json_response(self, text: str) -> dict:
        """Robustly parse JSON from Gemini response."""
        # Strip markdown code blocks
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON object
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            raise ValueError("Could not parse JSON from Gemini response")

    async def evaluate(self, student_answer: str, reference_answer: str, question: str,
                       max_marks: float, keywords: list, concepts: list, api_key: str) -> dict:
        """Evaluate a student answer using Gemini AI."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._evaluate_sync,
                                          student_answer, reference_answer, question,
                                          max_marks, keywords, concepts, api_key)

    def _evaluate_sync(self, student_answer, reference_answer, question,
                       max_marks, keywords, concepts, api_key) -> dict:
        self._ensure_model(api_key)

        # Fallback if no student answer or Gemini unavailable
        if not student_answer or not student_answer.strip():
            return self._empty_result(max_marks, "No answer provided")

        if not self.model:
            return self._fallback_evaluation(student_answer, reference_answer, keywords, concepts, max_marks)

        prompt = EVALUATION_PROMPT.format(
            question=question,
            reference_answer=reference_answer,
            student_answer=student_answer[:3000],  # Limit to 3000 chars
            keywords=", ".join(keywords) if keywords else "None specified",
            concepts=", ".join(concepts) if concepts else "None specified",
            max_marks=max_marks
        )

        try:
            response = self.model.generate_content(prompt)
            result = self._parse_json_response(response.text)
            # Clamp marks
            result["ai_marks"] = min(float(result.get("ai_marks", 0)), max_marks)
            return result
        except Exception as e:
            print(f"Gemini evaluation error: {e}")
            return self._fallback_evaluation(student_answer, reference_answer, keywords, concepts, max_marks)

    def _fallback_evaluation(self, student_answer, reference_answer, keywords, concepts, max_marks) -> dict:
        """Rule-based fallback when Gemini is unavailable."""
        answer_lower = student_answer.lower()
        ref_lower = reference_answer.lower()

        # Keyword matching
        matched_kw = [k for k in keywords if k.lower() in answer_lower]
        missing_kw = [k for k in keywords if k.lower() not in answer_lower]
        kw_score = len(matched_kw) / len(keywords) if keywords else 0.5

        # Concept matching
        matched_c = [c for c in concepts if c.lower() in answer_lower]
        missing_c = [c for c in concepts if c.lower() not in answer_lower]
        c_score = len(matched_c) / len(concepts) if concepts else 0.5

        # Simple word overlap for semantic score
        answer_words = set(answer_lower.split())
        ref_words = set(ref_lower.split())
        overlap = len(answer_words & ref_words) / len(ref_words) if ref_words else 0
        semantic_score = min(overlap * 1.5, 1.0)

        completeness = min(len(student_answer) / max(len(reference_answer), 1), 1.0)

        final_score = 0.4 * semantic_score + 0.25 * kw_score + 0.25 * c_score + 0.1 * completeness
        ai_marks = round(final_score * max_marks, 1)

        missing_concepts_details = [{"concept": c, "status": "missing"} for c in missing_c]
        weaknesses = []
        if missing_kw:
            weaknesses.append({"issue": f"Missing key terms: {', '.join(missing_kw[:3])}", "severity": "moderate"})
        if missing_c:
            weaknesses.append({"issue": f"Missing core concepts: {', '.join(missing_c[:2])}", "severity": "major"})
        if completeness < 0.5:
            weaknesses.append({"issue": "Answer lacks detail and completeness", "severity": "minor"})
            
        score_justification = f"{round((max_marks - ai_marks), 1)} marks deducted due to missing keywords and concepts." if max_marks > ai_marks else "Full marks awarded."
        educational_feedback = "Your answer covers some points but lacks comprehensive detail." if missing_c else "Good answer demonstrating basic understanding."

        return {
            "semantic_score": round(semantic_score, 3),
            "keyword_score": round(kw_score, 3),
            "concept_score": round(c_score, 3),
            "completeness_score": round(completeness, 3),
            "gemini_raw_score": round(final_score, 3),
            "ai_marks": ai_marks,
            "ai_confidence": 0.6,
            "matched_keywords": matched_kw,
            "missing_keywords": missing_kw,
            "matched_concepts": matched_c,
            "missing_concepts": missing_c,
            "missing_concepts_details": missing_concepts_details,
            "strengths": ["Answer provided" if student_answer else "No answer"],
            "weaknesses": weaknesses,
            "improvements": ["Review missing concepts and keywords to improve completeness."],
            "score_justification": score_justification,
            "educational_feedback": educational_feedback,
            "blooms_taxonomy_level": "basic understanding",
            "feedback_confidence": 60,
            "ai_explanation": f"Rule-based evaluation: keyword match {kw_score:.0%}, concept match {c_score:.0%}."
        }

    def _empty_result(self, max_marks, reason=""):
        return {
            "semantic_score": 0, "keyword_score": 0, "concept_score": 0,
            "completeness_score": 0, "gemini_raw_score": 0,
            "ai_marks": 0, "ai_confidence": 1.0,
            "matched_keywords": [], "missing_keywords": [],
            "matched_concepts": [], "missing_concepts": [],
            "missing_concepts_details": [],
            "strengths": [], 
            "weaknesses": [{"issue": "No answer provided", "severity": "major"}],
            "improvements": [reason or "Please attempt the question next time."],
            "score_justification": f"{max_marks} marks deducted as no answer was provided.",
            "educational_feedback": "It appears you missed this question. Don't worry, make sure to attempt all questions next time.",
            "blooms_taxonomy_level": "none",
            "feedback_confidence": 100,
            "ai_explanation": reason or "No answer was provided for this question."
        }

    async def extract_questions_from_text(self, text: str) -> list:
        """Extract structured questions from paper text."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_questions_sync, text)

    def _extract_questions_sync(self, text: str) -> list:
        print(f"[QuestionExtraction] Text received (first 400 chars):\n{text[:400]}")
        if not text.strip():
            print("[QuestionExtraction] Empty text received, cannot extract questions.")
            return []

        # --- Step 1: Try Gemini AI extraction ---
        if self.model:
            try:
                prompt = QUESTION_EXTRACTION_PROMPT.format(text=text[:6000])
                response = self.model.generate_content(prompt)
                print(f"[QuestionExtraction] Gemini raw response: {response.text[:500]}")
                clean = re.sub(r'```json\s*', '', response.text)
                clean = re.sub(r'```\s*', '', clean).strip()
                # Handle response that might be an array or wrapped in an object
                parsed = json.loads(clean)
                if isinstance(parsed, list) and len(parsed) > 0:
                    print(f"[QuestionExtraction] Gemini extracted {len(parsed)} questions.")
                    return parsed
                elif isinstance(parsed, dict) and 'questions' in parsed:
                    questions = parsed['questions']
                    print(f"[QuestionExtraction] Gemini (wrapped) extracted {len(questions)} questions.")
                    return questions
                print("[QuestionExtraction] Gemini returned empty/invalid list, trying regex fallback.")
            except Exception as e:
                print(f"[QuestionExtraction] Gemini failed: {e}. Trying regex fallback.")
        else:
            print("[QuestionExtraction] Gemini not available, using regex fallback.")

        # --- Step 2: Regex-based fallback ---
        return self._regex_extract_questions(text)

    def _regex_extract_questions(self, text: str) -> list:
        """Robust regex-based question extraction supporting multiple formats."""
        print("[QuestionExtraction] Running regex extraction...")
        questions = []

        # Patterns: Q1, Q.1, Q1., Q 1, Question 1, QUESTION 1, 1., (1), 1)
        # We find the START positions of each question, then slice between them
        delimiter_pattern = re.compile(
            r'(?:^|\n)\s*(?:'
            r'Q(?:uestion)?[\s\.]*(\d+)'
            r'|(?:\(?(\d+)\)?)[\s\.:\)]'
            r')',
            re.IGNORECASE | re.MULTILINE
        )

        marks_pattern = re.compile(
            r'\[?\s*(\d+)\s*(?:marks?|m|mks?)\s*\]?|'
            r'(?:max\.?\s*marks?\s*[:\.=]?\s*(\d+))|'
            r'\((\d+)\s*(?:marks?|m)\)',
            re.IGNORECASE
        )

        matches = list(delimiter_pattern.finditer(text))
        print(f"[QuestionExtraction] Regex found {len(matches)} question delimiters.")

        for i, match in enumerate(matches):
            q_num = match.group(1) or match.group(2)
            if not q_num:
                continue

            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            block = text[start:end].strip()

            # Remove the matched delimiter from the start of block text
            q_text = text[match.end():end].strip()

            # Detect marks in this block
            max_marks = 10  # default
            marks_match = marks_pattern.search(block)
            if marks_match:
                raw = marks_match.group(1) or marks_match.group(2) or marks_match.group(3)
                if raw:
                    try:
                        max_marks = int(raw)
                    except ValueError:
                        pass
                # Remove the marks marker from the question text
                q_text = marks_pattern.sub('', q_text).strip()

            # Skip if question text is too short (likely a false positive)
            if len(q_text.strip()) < 5:
                continue

            questions.append({
                "questionNumber": q_num,
                "text": q_text.strip(),
                "maxMarks": max_marks,
                "keywords": [],
                "expectedConcepts": [],
                "difficultyLevel": "medium"
            })

        print(f"[QuestionExtraction] Regex extracted {len(questions)} questions.")
        return questions


    async def extract_answers_from_text(self, text: str, questions: list) -> dict:
        """Map full OCR text into specific answers for each question."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_answers_sync, text, questions)

    def _extract_answers_sync(self, text: str, questions: list) -> dict:
        if not self.model or not text.strip() or not questions:
            return self._regex_fallback_extraction(text, questions)

        try:
            questions_context = json.dumps([
                {"id": str(q.get("_id", q.get("id"))), "number": q.get("questionNumber"), "text": q.get("text")}
                for q in questions
            ], indent=2)

            prompt = ANSWER_EXTRACTION_PROMPT.format(questions=questions_context, text=text[:10000])
            response = self.model.generate_content(prompt)
            clean = re.sub(r'```json\s*', '', response.text)
            clean = re.sub(r'```\s*', '', clean).strip()
            answers = json.loads(clean)
            
            # Post-processing validation
            if not isinstance(answers, dict):
                return self._regex_fallback_extraction(text, questions)
                
            validated_answers = {}
            full_text_clean = text.strip().lower()
            
            for q in questions:
                qid = str(q.get("_id", q.get("id")))
                ans = answers.get(qid, "")
                
                # Validation: if answer is suspiciously long or matches full text exactly
                if ans and (len(ans) > len(text) * 0.9 or ans.lower() == full_text_clean):
                    print(f"⚠️ Validation failed for Q{q.get('questionNumber')}: Answer too large, using regex fallback.")
                    fallback = self._regex_fallback_extraction(text, [q])
                    validated_answers[qid] = fallback.get(qid, "")
                else:
                    validated_answers[qid] = ans

            return validated_answers
            
        except Exception as e:
            print(f"Answer extraction error: {e}")
            return self._regex_fallback_extraction(text, questions)

    def _regex_fallback_extraction(self, text: str, questions: list) -> dict:
        """Fallback to splitting the text using regex if AI extraction fails."""
        print("ℹ️ Using Regex Fallback Extraction")
        answers = {}
        
        # Simple heuristic: find "1.", "Q1", "Question 1" etc.
        for i, q in enumerate(questions):
            qid = str(q.get("_id", q.get("id")))
            q_num = q.get("questionNumber", str(i+1))
            
            # Try to find where this question starts
            pattern = re.compile(rf'(?:Q(?:uestion)?\s*{q_num}\b|{q_num}\.)', re.IGNORECASE)
            match = pattern.search(text)
            
            if not match:
                answers[qid] = ""
                continue
                
            start_idx = match.end()
            
            # Try to find where the NEXT question starts to set the boundary
            end_idx = len(text)
            if i + 1 < len(questions):
                next_q_num = questions[i+1].get("questionNumber", str(i+2))
                next_pattern = re.compile(rf'(?:Q(?:uestion)?\s*{next_q_num}\b|{next_q_num}\.)', re.IGNORECASE)
                next_match = next_pattern.search(text[start_idx:])
                if next_match:
                    end_idx = start_idx + next_match.start()
                    
            extracted = text[start_idx:end_idx].strip()
            
            # Remove header-like artifacts that might bleed in
            extracted = re.sub(r'(?:Student ID|Name|Subject|Exam):\s*.*?\n', '', extracted, flags=re.IGNORECASE).strip()
            
            answers[qid] = extracted
            
        return answers

    async def extract_model_answers_from_text(self, text: str) -> dict:
        """Extract structured model answers from a model answer key document."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_model_answers_sync, text)

    def _extract_model_answers_sync(self, text: str) -> dict:
        print(f"[ModelAnswerExtraction] Text received (first 400 chars):\n{text[:400]}")
        if not text.strip():
            print("[ModelAnswerExtraction] Empty text received.")
            return {}

        # --- Step 1: Try Gemini AI extraction ---
        if self.model:
            try:
                prompt = MODEL_ANSWER_EXTRACTION_PROMPT.format(text=text[:10000])
                response = self.model.generate_content(prompt)
                clean = re.sub(r'```json\s*', '', response.text)
                clean = re.sub(r'```\s*', '', clean).strip()
                parsed = json.loads(clean)
                if isinstance(parsed, dict) and len(parsed) > 0:
                    print(f"[ModelAnswerExtraction] Gemini extracted {len(parsed)} answers.")
                    # Format standardisation
                    standardized = {}
                    for k, v in parsed.items():
                        # Standardize "Q1", "1", "1." into "Q1"
                        q_num_match = re.search(r'\d+', str(k))
                        if q_num_match:
                            std_key = f"Q{q_num_match.group(0)}"
                            if isinstance(v, dict):
                                standardized[std_key] = {"answer": v.get("answer", ""), "confidence": v.get("confidence", 90)}
                            else:
                                standardized[std_key] = {"answer": str(v), "confidence": 90}
                    if standardized:
                        return standardized
                print("[ModelAnswerExtraction] Gemini returned invalid format, trying regex fallback.")
            except Exception as e:
                print(f"[ModelAnswerExtraction] Gemini failed: {e}. Trying regex fallback.")
        
        # --- Step 2: Regex-based fallback ---
        return self._regex_extract_model_answers(text)

    def _regex_extract_model_answers(self, text: str) -> dict:
        """Regex-based fallback for extracting model answers."""
        print("[ModelAnswerExtraction] Running regex extraction...")
        answers = {}
        
        # Match "Q1", "Ans 1", "Answer 1", "1."
        pattern = re.compile(
            r'(?:^|\n)\s*(?:Q(?:uestion)?[\s\.]*(\d+)|Ans(?:wer)?[\s\.]*(\d+)|\(?(\d+)\)?)[\s\.:\)-]*',
            re.IGNORECASE | re.MULTILINE
        )
        
        matches = list(pattern.finditer(text))
        
        for i, match in enumerate(matches):
            q_num = match.group(1) or match.group(2) or match.group(3)
            if not q_num:
                continue
                
            std_key = f"Q{q_num}"
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            
            answer_text = text[start:end].strip()
            # Ignore empty or very short answers
            if len(answer_text) > 2:
                answers[std_key] = {"answer": answer_text, "confidence": 75} # Lower confidence for regex
                
        print(f"[ModelAnswerExtraction] Regex extracted {len(answers)} answers.")
        return answers

