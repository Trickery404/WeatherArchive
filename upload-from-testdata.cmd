@echo off
REM ========================================
REM Upload pre-generated test images
REM Uploads images from testdata/ folder
REM ========================================

set API_URL=https://iuuqxsiemk.execute-api.us-east-1.amazonaws.com/dev/webcam-gateway
set API_KEY=Oucs1touWZ2NhGmtwAK3IuwpU4G4AlA8BxGKLyQ3
set IMAGE_DIR=testdata

echo.
echo ========================================
echo WeatherArchive - Upload Test Images
echo ========================================
echo.

if not exist "%IMAGE_DIR%" (
    echo ERROR: Directory %IMAGE_DIR% not found!
    echo.
    echo Please run generate-all-images.ps1 first:
    echo   powershell -ExecutionPolicy Bypass -File generate-all-images.ps1
    echo.
    pause
    exit /b 1
)

set TOTAL_UPLOADS=0
set FAILED_UPLOADS=0

echo Uploading images from %IMAGE_DIR%...
echo.

REM Amsterdam 2026-02-16 Hour 6 (12 images)
for %%M in (00 05 10 15 20 25 30 35 40 45 50 55) do (
    call :upload_image amsterdam 2026-02-16T06:%%M:00Z amsterdam_2026-02-16_06-%%M.jpg 5.2 75 1013
)

REM Amsterdam 2026-02-16 Hour 7 (11 images)
for %%M in (00 05 10 15 20 25 30 35 40 45 50) do (
    call :upload_image amsterdam 2026-02-16T07:%%M:00Z amsterdam_2026-02-16_07-%%M.jpg 6.1 72 1013
)

REM Amsterdam 2026-02-16 Hour 8 (12 images)
for %%M in (00 05 10 15 20 25 30 35 40 45 50 55) do (
    call :upload_image amsterdam 2026-02-16T08:%%M:00Z amsterdam_2026-02-16_08-%%M.jpg 7.3 70 1014
)

REM Amsterdam 2026-02-16 Hour 9 (3 images)
for %%M in (00 15 30) do (
    call :upload_image amsterdam 2026-02-16T09:%%M:00Z amsterdam_2026-02-16_09-%%M.jpg 8.5 68 1014
)

REM Amsterdam 2026-02-16 Hour 10 (12 images)
for %%M in (00 05 10 15 20 25 30 35 40 45 50 55) do (
    call :upload_image amsterdam 2026-02-16T10:%%M:00Z amsterdam_2026-02-16_10-%%M.jpg 9.8 65 1015
)

REM Amsterdam 2026-02-16 Hour 11 (12 images)
for %%M in (00 05 10 15 20 25 30 35 40 45 50 55) do (
    call :upload_image amsterdam 2026-02-16T11:%%M:00Z amsterdam_2026-02-16_11-%%M.jpg 10.5 63 1015
)

echo.
echo ========================================
echo Upload completed!
echo ========================================
echo.
echo Total uploads: %TOTAL_UPLOADS%
echo Failed uploads: %FAILED_UPLOADS%
echo.
echo Check:
echo   1. S3 Bucket: weatherarchive-raw
echo   2. PostgreSQL: images table
echo   3. CloudWatch Logs: /aws/lambda/storeImage
echo.
pause
exit /b 0

REM ========================================
REM Upload Function
REM ========================================
:upload_image
set CITY=%~1
set TIMESTAMP=%~2
set FILENAME=%~3
set TEMP=%~4
set HUMID=%~5
set PRESSURE=%~6

set FILEPATH=%IMAGE_DIR%\%FILENAME%

set /A TOTAL_UPLOADS+=1

if not exist "%FILEPATH%" (
    echo [%TOTAL_UPLOADS%] ERROR: File not found: %FILENAME%
    set /A FAILED_UPLOADS+=1
    goto :eof
)

echo [%TOTAL_UPLOADS%] Uploading %FILENAME%...

curl -s -X POST "%API_URL%" ^
  -H "Content-Type: multipart/form-data" ^
  -H "x-api-key: %API_KEY%" ^
  -H "Accept: */*" ^
  -F "image=@%FILEPATH%" ^
  -F "metadata={\"city_slug\":\"%CITY%\",\"capture_time\":\"%TIMESTAMP%\",\"camera_id\":\"cam-01\",\"temperature\":%TEMP%,\"humidity\":%HUMID%,\"air_pressure\":%PRESSURE%}" ^
  > nul 2>&1

if errorlevel 1 (
    echo    [ERROR] Upload failed
    set /A FAILED_UPLOADS+=1
) else (
    echo    [OK] Uploaded successfully
)

goto :eof

