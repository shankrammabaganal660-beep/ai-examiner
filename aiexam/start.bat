@echo off
echo Starting AI Examiner services...

:: Backend
start "AI Examiner - Backend :5001" cmd /k "cd /d %~dp0backend && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: AI Microservice
start "AI Examiner - AI Service :8000" cmd /k "cd /d %~dp0ai-service && python main.py"

:: Frontend
start "AI Examiner - Frontend :5173" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services starting in separate windows!
echo Open: http://localhost:5173
echo.
timeout /t 5
start http://localhost:5173
