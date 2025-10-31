@echo off
REM This script build the docker-image and exports it as svelte-docker-latest.tar

docker build -t weatherarchive:latest .
IF %ERRORLEVEL% NEQ 0 (
  echo Docker Build failed!
  exit /b %ERRORLEVEL%
)
docker save -o svelte-docker-latest.tar weatherarchive:latest
IF %ERRORLEVEL% NEQ 0 (
  echo Docker Save failed!
  exit /b %ERRORLEVEL%
)
echo Docker-Image successfully exported as svelte-docker-latest.tar.

