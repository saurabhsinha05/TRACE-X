@echo off
cd /d "%~dp0"
echo Starting TRACE-X (frontend + backend)...
npm run start
echo.
echo TRACE-X stopped. Press any key to close this window.
pause >nul
