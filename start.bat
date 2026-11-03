@echo off
echo ===================================================
echo       Starting LinguaLive AI (Backend + Web)
echo ===================================================
echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "LinguaLive Backend" cmd /k "cd /d %~dp0backend && python run.py"

echo [2/2] Starting Vite Frontend on http://localhost:3000 ...
start "LinguaLive Web" cmd /k "cd /d %~dp0web && npm run dev"

echo.
echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo.
echo ===================================================
echo   LinguaLive AI is running!
echo   - Backend: http://localhost:8000
echo   - Web UI:  http://localhost:3000
echo ===================================================
pause
