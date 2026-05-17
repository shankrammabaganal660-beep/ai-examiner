import os
import io
import json
import base64
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Lazy import services to avoid startup crash if heavy deps missing
from services.ocr_service import OCRService
from services.gemini_service import GeminiService

app = FastAPI(title="AI Examiner - AI Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5001", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_service = OCRService()
gemini_service = GeminiService()

UPLOAD_DIR = Path("temp_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "AI Examiner Microservice",
        "version": "1.0.0",
        "ocr_available": ocr_service.is_available(),
        "gemini_available": gemini_service.is_available(),
    }


@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    """Extract text from uploaded handwritten PDF or image."""
    try:
        content = await file.read()
        ext = Path(file.filename or "file.pdf").suffix.lower()

        temp_path = UPLOAD_DIR / f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        result = await ocr_service.extract_text(str(temp_path), ext, content)

        temp_path.unlink(missing_ok=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


class EvaluationRequest(BaseModel):
    student_answer: str
    reference_answer: str
    question: str
    max_marks: float
    keywords: List[str] = []
    concepts: List[str] = []
    gemini_api_key: Optional[str] = None


@app.post("/evaluate")
async def evaluate_answer(req: EvaluationRequest):
    """Evaluate a student answer using Gemini AI."""
    try:
        api_key = req.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        result = await gemini_service.evaluate(
            student_answer=req.student_answer,
            reference_answer=req.reference_answer,
            question=req.question,
            max_marks=req.max_marks,
            keywords=req.keywords,
            concepts=req.concepts,
            api_key=api_key
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@app.post("/extract-questions")
async def extract_questions(file: UploadFile = File(...)):
    """Extract questions from a question paper using OCR + AI."""
    try:
        content = await file.read()
        ext = Path(file.filename or "file.pdf").suffix.lower()
        temp_path = UPLOAD_DIR / f"qp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        print(f"[ExtractQuestions] File: {file.filename}, Ext: {ext}, Size: {len(content)} bytes")

        ocr_result = await ocr_service.extract_text(str(temp_path), ext, content)
        pages = ocr_result.get("pages", [])
        full_text = "\n".join([p["text"] for p in pages if p.get("text")]).strip()

        print(f"[ExtractQuestions] OCR engine: {ocr_result.get('ocr_engine', 'unknown')}")
        print(f"[ExtractQuestions] Extracted text length: {len(full_text)} chars")
        print(f"[ExtractQuestions] First 500 chars:\n{full_text[:500]}")

        temp_path.unlink(missing_ok=True)

        if not full_text:
            return {
                "questions": [],
                "raw_text": "",
                "reason": "text_extraction_failed",
                "message": "Could not extract any text from the uploaded file. Ensure it is a readable PDF or text file."
            }

        questions = await gemini_service.extract_questions_from_text(full_text)
        print(f"[ExtractQuestions] Final question count: {len(questions)}")

        if not questions:
            return {
                "questions": [],
                "raw_text": full_text[:2000],
                "reason": "no_questions_detected",
                "message": "Text was extracted successfully, but no question patterns were detected. Check that the document uses standard question numbering (Q1, 1., Question 1, etc.)."
            }

        return {"questions": questions, "raw_text": full_text[:2000], "reason": "success", "message": f"{len(questions)} questions extracted."}
    except Exception as e:
        print(f"[ExtractQuestions] Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Question extraction failed: {str(e)}")

@app.post("/extract-model-answers")
async def extract_model_answers(file: UploadFile = File(...)):
    """Extract reference answers from a model answer key document."""
    try:
        content = await file.read()
        ext = Path(file.filename or "file.pdf").suffix.lower()
        temp_path = UPLOAD_DIR / f"ma_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        print(f"[ExtractModelAnswers] File: {file.filename}, Ext: {ext}")

        ocr_result = await ocr_service.extract_text(str(temp_path), ext, content)
        pages = ocr_result.get("pages", [])
        full_text = "\n".join([p["text"] for p in pages if p.get("text")]).strip()

        print(f"[ExtractModelAnswers] OCR engine: {ocr_result.get('ocr_engine', 'unknown')}")
        print(f"[ExtractModelAnswers] Extracted text length: {len(full_text)} chars")
        
        temp_path.unlink(missing_ok=True)

        if not full_text:
            return {
                "answers": {},
                "raw_text": "",
                "reason": "text_extraction_failed",
                "message": "Could not extract any text from the uploaded file."
            }

        answers = await gemini_service.extract_model_answers_from_text(full_text)
        print(f"[ExtractModelAnswers] Final answer count: {len(answers)}")

        if not answers:
            return {
                "answers": {},
                "raw_text": full_text[:2000],
                "reason": "no_answers_detected",
                "message": "Text was extracted, but no answer patterns were detected."
            }

        return {"answers": answers, "raw_text": full_text[:2000], "reason": "success"}
    except Exception as e:
        print(f"[ExtractModelAnswers] Exception: {e}")
        raise HTTPException(status_code=500, detail=f"Answer extraction failed: {str(e)}")

class ExtractAnswersRequest(BaseModel):
    text: str
    questions: List[dict]

@app.post("/extract-answers")
async def extract_answers(req: ExtractAnswersRequest):
    """Extract and map the OCR text to specific questions."""
    try:
        answers = await gemini_service.extract_answers_from_text(req.text, req.questions)
        return {"answers": answers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answer extraction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 AI Examiner Microservice starting on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
