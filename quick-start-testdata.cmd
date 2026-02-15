@echo off
REM Quick start script for generating and uploading test data

echo.
echo ========================================
echo WeatherArchive Test Data Setup
echo ========================================
echo.
echo This will:
echo   1. Generate ~62 test images (takes ~2 minutes)
echo   2. Upload them to AWS (takes ~5 minutes)
echo.
echo Total time: ~7 minutes
echo.
pause

echo.
echo Step 1: Generating images...
echo.
powershell -ExecutionPolicy Bypass -File generate-all-images.ps1

if errorlevel 1 (
    echo.
    echo ERROR: Image generation failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Uploading to AWS...
echo.
call upload-from-testdata.cmd

echo.
echo ========================================
echo All done!
echo ========================================
echo.
pause

