@echo off
REM Wrapper to run the PowerShell setup script and keep the window open afterwards.
REM Run this by double-clicking if you don't want the window to close immediately.
setlocal

REM Deprecated shim - use setup_python_env.ps1 directly.
echo NOTE: This wrapper is deprecated. Forwarding to setup_python_env.ps1...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_python_env.ps1"
echo.
pause





pause >nulecho Press any key to close...echo.powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_python_env.ps1"ncd /d "%~dp0"