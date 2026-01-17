@echo off
echo ========================================
echo   WeatherArchive - Server Starter
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Starte Backend Server...
start "WeatherArchive Backend" cmd /k "npm run dev:backend"
timeout /t 3 /nobreak >nul

echo [2/3] Starte Frontend Server...
start "WeatherArchive Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo [3/3] Teste Server...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Server gestartet!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Test Backend:
curl.exe http://localhost:3000/api/health
echo.
echo.
echo Druecke eine Taste um Browser zu oeffnen...
pause >nul

start http://localhost:5173

echo.
echo ========================================
echo   Anleitung
echo ========================================
echo.
echo 1. Backend testen:
echo    curl.exe http://localhost:3000/api/health
echo.
echo 2. Frontend im Browser:
echo    http://localhost:5173
echo.
echo 3. Server stoppen:
echo    Schliesse beide CMD-Fenster
echo.
echo ========================================

