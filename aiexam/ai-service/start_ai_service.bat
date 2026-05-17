@echo off
echo ============================================
echo   AI Examiner - AI Service Setup
echo ============================================
echo.
echo Detected Python version:
python --version
echo.

echo Installing core packages (Python 3.14 compatible)...
pip install fastapi==0.115.0 uvicorn[standard]==0.30.6 python-multipart==0.0.9 python-dotenv==1.0.1 google-generativeai==0.7.2 httpx==0.27.0 requests==2.32.3

echo.
echo Core packages installed. Trying optional OCR packages...
echo (These may fail on Python 3.14 - that's OK, Gemini Vision will be used instead)
echo.

pip install --prefer-binary pillow 2>nul && echo ✅ Pillow installed || echo ⚠️  Pillow skipped (Python 3.14 incompatible - using Gemini Vision)
pip install --prefer-binary numpy 2>nul && echo ✅ NumPy installed || echo ⚠️  NumPy skipped
pip install easyocr 2>nul && echo ✅ EasyOCR installed || echo ⚠️  EasyOCR skipped (Python 3.14 incompatible - Gemini Vision handles OCR)

echo.
echo ============================================
echo   Starting AI Microservice on port 8000...
echo ============================================
echo.
python main.py
