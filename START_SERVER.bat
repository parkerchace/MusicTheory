REM ========================================================================
REM Python MIDI Server Startup Script
REM This script auto-logs to logs/server_YYYYMMDD_HHMMSS.log
REM ========================================================================
@echo off
setlocal
cd /d "%~dp0"

if "%~1" neq "--logged" (
    if not exist "logs" mkdir "logs"
    set "THIS_BATCH=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=Get-Date -Format 'yyyyMMdd_HHmmss'; $log=Join-Path (Get-Location) ('logs/server_' + $t + '.log'); Start-Transcript -Path $log -Force; $cmd = 'call \"' + $env:THIS_BATCH + '\" --logged'; cmd.exe /c $cmd; Stop-Transcript"
    exit /b
)

echo.
echo ========================================================================
echo         MUSIC THEORY MIDI SERVER
echo ========================================================================
echo.

REM Check if running from correct directory
if not exist "tools\bitwig_midi_server.py" (
    echo ERROR: Run this script from the project root directory
    echo Expected to find: tools\bitwig_midi_server.py
    pause
    exit /b 1
)

REM Check Python
py --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Checking Python packages...
py -c "import fastapi, uvicorn, mido, rtmidi" >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    py -m pip install fastapi uvicorn mido python-rtmidi
    if errorlevel 1 (
        echo ERROR: Failed to install packages
        pause
        exit /b 1
    )
)
echo [OK] Packages installed

echo.
echo [2/3] Starting MIDI server on http://127.0.0.1:5544
echo.
echo IMPORTANT:
echo   1. Open browser to: http://127.0.0.1:5544
echo   2. Select your MIDI output device (e.g., loopMIDI port)
echo   3. Load plugin in your DAW
echo   4. Play MIDI notes!
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================================================
echo.

py tools\bitwig_midi_server.py

echo.
echo Server stopped.
pause
