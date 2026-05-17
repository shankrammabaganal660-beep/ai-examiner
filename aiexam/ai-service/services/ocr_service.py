import asyncio
import base64
from pathlib import Path

# --- Optional OCR imports with graceful degradation ---
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("ℹ️  EasyOCR not available — using Gemini Vision fallback for OCR")

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pdf2image
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


class OCRService:
    def __init__(self):
        self.reader = None
        if EASYOCR_AVAILABLE:
            try:
                self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
                print("✅ EasyOCR initialized")
            except Exception as e:
                print(f"⚠️ EasyOCR init failed: {e}")
        else:
            print("ℹ️  EasyOCR skipped — Gemini Vision will handle OCR")

    def is_available(self) -> bool:
        return self.reader is not None or True  # always "available" via Gemini fallback

    def preprocess_image(self, img):
        if not PIL_AVAILABLE:
            return img
        try:
            img = img.convert('L')
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(2.0)
            img = img.filter(ImageFilter.SHARPEN)
            img = img.convert('RGB')
            return img
        except Exception:
            return img

    def ocr_image_easyocr(self, image) -> tuple:
        """Run EasyOCR on a PIL Image. Returns (text, confidence)."""
        if not self.reader or not NUMPY_AVAILABLE:
            return "", 0.0
        try:
            img_array = np.array(image)
            results = self.reader.readtext(img_array, detail=1)
            texts, confidences = [], []
            for (_, text, conf) in results:
                if conf > 0.2:
                    texts.append(text)
                    confidences.append(conf)
            combined = " ".join(texts)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            return combined, avg_conf
        except Exception as e:
            print(f"EasyOCR error: {e}")
            return "", 0.0

    def image_to_base64(self, file_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """Convert raw file bytes to base64 for Gemini Vision."""
        return base64.b64encode(file_bytes).decode("utf-8")

    async def extract_text(self, file_path: str, ext: str, raw_bytes: bytes = None) -> dict:
        """Extract text: try pypdf first for digital PDFs, then EasyOCR, fall back to Gemini Vision."""
        loop = asyncio.get_event_loop()

        # Try pure text extraction for digital PDFs first
        if ext == ".pdf" and PYPDF_AVAILABLE:
            try:
                reader = pypdf.PdfReader(file_path)
                pages = []
                for i, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        pages.append({"page": i + 1, "text": text.strip(), "confidence": 1.0})
                
                if pages:
                    print(f"✅ pypdf extracted {len(pages)} pages of digital text")
                    return {
                        "pages": pages,
                        "total_pages": len(pages),
                        "full_text": "\n\n".join([p["text"] for p in pages]),
                        "avg_confidence": 1.0,
                        "ocr_engine": "pypdf"
                    }
            except Exception as e:
                print(f"⚠️ pypdf extraction failed: {e}")

        # Try pure text extraction for DOCX
        if ext == ".docx" and DOCX_AVAILABLE:
            try:
                doc = docx.Document(file_path)
                full_text = "\n".join([para.text for para in doc.paragraphs])
                if full_text.strip():
                    print(f"✅ python-docx extracted text")
                    return {
                        "pages": [{"page": 1, "text": full_text.strip(), "confidence": 1.0}],
                        "total_pages": 1,
                        "full_text": full_text.strip(),
                        "avg_confidence": 1.0,
                        "ocr_engine": "python-docx"
                    }
            except Exception as e:
                print(f"⚠️ python-docx extraction failed: {e}")

        # Try EasyOCR path if available
        if self.reader and PIL_AVAILABLE:
            result = await loop.run_in_executor(None, self._extract_easyocr, file_path, ext)
            if result and any(p.get("text") for p in result.get("pages", [])):
                print(f"✅ EasyOCR extracted text")
                return result

        # Fall back to Gemini Vision OCR for handwritten / scanned
        if raw_bytes:
            print(f"ℹ️  Falling back to Gemini Vision for OCR")
            result = await self._extract_gemini_vision(raw_bytes, ext)
            if result:
                print(f"✅ Gemini Vision extracted text")
                return result

        # Last resort: return empty
        print(f"❌ All OCR methods failed")
        return {
            "pages": [{"page": 1, "text": "", "confidence": 0.0}],
            "total_pages": 1,
            "full_text": "",
            "avg_confidence": 0.0,
            "ocr_engine": "failed"
        }

    def _extract_easyocr(self, file_path: str, ext: str) -> dict:
        pages = []
        if ext == ".pdf":
            if PDF2IMAGE_AVAILABLE:
                try:
                    images = pdf2image.convert_from_path(file_path, dpi=200)
                    for i, img in enumerate(images):
                        if PIL_AVAILABLE:
                            img = self.preprocess_image(img)
                        text, conf = self.ocr_image_easyocr(img)
                        pages.append({"page": i + 1, "text": text, "confidence": round(conf, 3)})
                except Exception as e:
                    print(f"PDF→image error: {e}")
        elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
            if PIL_AVAILABLE:
                try:
                    img = Image.open(file_path)
                    img = self.preprocess_image(img)
                    text, conf = self.ocr_image_easyocr(img)
                    pages.append({"page": 1, "text": text, "confidence": round(conf, 3)})
                except Exception as e:
                    print(f"Image OCR error: {e}")

        if not pages:
            return None

        all_texts = [p["text"] for p in pages if p["text"]]
        all_confs = [p["confidence"] for p in pages if p["confidence"] > 0]
        avg_conf = sum(all_confs) / len(all_confs) if all_confs else 0.0

        return {
            "pages": pages,
            "total_pages": len(pages),
            "full_text": " ".join(all_texts),
            "avg_confidence": round(avg_conf, 3),
            "ocr_engine": "easyocr"
        }

    async def _extract_gemini_vision(self, raw_bytes: bytes, ext: str) -> dict:
        """Use Gemini Vision API to extract handwritten text from an image/PDF."""
        import os
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            mime_map = {
                ".pdf": "application/pdf",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".webp": "image/webp"
            }
            mime_type = mime_map.get(ext, "image/jpeg")

            prompt = (
                "You are an OCR engine. Extract ALL handwritten and printed text from this document exactly as written. "
                "Preserve question numbers, answers, and structure. Return only the extracted text, nothing else."
            )

            response = model.generate_content([
                {"mime_type": mime_type, "data": raw_bytes},
                prompt
            ])

            extracted = response.text.strip() if response.text else ""
            return {
                "pages": [{"page": 1, "text": extracted, "confidence": 0.85}],
                "total_pages": 1,
                "full_text": extracted,
                "avg_confidence": 0.85,
                "ocr_engine": "gemini-vision"
            }
        except Exception as e:
            print(f"Gemini Vision OCR error: {e}")
            return None
