@echo off
echo ============================================
echo   AI Examiner - Windows Startup Script
echo ============================================

:: ── Step 1: Install Backend Dependencies ─────────────────────────────────────
echo.
echo [1/5] Installing Backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 ( echo ERROR: Backend npm install failed & pause & exit /b 1 )

:: ── Step 2: Install Frontend Dependencies ────────────────────────────────────
echo.
echo [2/5] Installing Frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 ( echo ERROR: Frontend npm install failed & pause & exit /b 1 )

:: ── Step 3: Install Python AI Service ────────────────────────────────────────
echo.
echo [3/5] Installing Python AI service dependencies...
cd /d "%~dp0ai-service"
pip install -r requirements.txt
if %errorlevel% neq 0 ( echo WARNING: Some Python packages may have failed. Check manually. )

:: ── Step 4: Seed Database ────────────────────────────────────────────────────
echo.
echo [4/5] Seeding database with demo data...
cd /d "%~dp0backend"
call npm run seed

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo   Now start each service in a SEPARATE terminal:
echo.
echo   Terminal 1 (Backend):      cd backend   ^&^& npm run dev
echo   Terminal 2 (AI Service):   cd ai-service ^&^& python main.py
echo   Terminal 3 (Frontend):     cd frontend  ^&^& npm run dev
echo.
echo   Then open: http://localhost:5173
echo.
echo   Demo Credentials:
echo     Admin:   admin@aiexaminer.com   / admin123
echo     Teacher: teacher@aiexaminer.com / teacher123
echo     Student: student@aiexaminer.com / student123
echo.
pause
