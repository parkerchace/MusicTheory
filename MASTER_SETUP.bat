@echo off
REM ========================================================================
REM Master Setup Wizard - Walks through entire setup process
REM This script auto-logs its output to logs/master_setup_YYYYMMDD_HHMMSS.log
REM ========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Self-logging wrapper - if called without --logged, re-invoke under PowerShell transcript
if "%~1" neq "--logged" (
    if not exist "logs" mkdir "logs"
    rem Export the absolute path into an env var so PowerShell can reference it safely
    set "THIS_BATCH=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=Get-Date -Format 'yyyyMMdd_HHmmss'; $log=Join-Path (Get-Location) ('logs/master_setup_' + $t + '.log'); Start-Transcript -Path $log -Force; $cmd = 'call \"' + $env:THIS_BATCH + '\" --logged'; cmd.exe /c $cmd; Stop-Transcript"
    exit /b
)

:MENU
cls
echo.
echo ========================================================================
echo              MUSIC THEORY VST3 - MASTER SETUP WIZARD
echo ========================================================================
echo.
echo This wizard will guide you through the complete setup process.
echo.
echo [1] Check Prerequisites (Run this first!)
echo [2] Install Python Packages
echo [3] Build VST3 Plugin
echo [4] Install Plugin to VST3 Folder
echo [5] Start MIDI Server
echo [6] Open Documentation
echo.
echo [9] Exit
echo.
echo ========================================================================
echo.

set /p choice="Enter your choice (1-6 or 9): "

if "%choice%"=="1" goto CHECK_PREREQ
if "%choice%"=="2" goto INSTALL_PYTHON
if "%choice%"=="3" goto BUILD_PLUGIN
if "%choice%"=="4" goto INSTALL_PLUGIN
if "%choice%"=="5" goto START_SERVER
if "%choice%"=="6" goto OPEN_DOCS
if "%choice%"=="9" goto END
goto MENU

:CHECK_PREREQ
cls
echo.
echo ========================================================================
echo                    CHECKING PREREQUISITES
echo ========================================================================
echo.
call SETUP_CHECK.bat
echo.
echo ========================================================================
echo.
echo Review the results above.
echo.
echo IMPORTANT: If you see any ERRORS, you must fix them before building!
echo.
echo Missing VST3 SDK? Download from: https://github.com/steinbergmedia/vst3sdk
echo Missing vcpkg/curl? See BUILD_AND_RUN.md for install commands
echo.
pause
goto MENU

:INSTALL_PYTHON
cls
echo.
echo ========================================================================
echo               INSTALLING PYTHON PACKAGES
echo ========================================================================
echo.
echo Installing: fastapi, uvicorn, mido, python-rtmidi
echo.
py -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    echo Make sure Python is installed and on PATH.
    echo.
    pause
    goto MENU
)
echo.
echo ========================================================================
echo SUCCESS! Python packages installed.
echo ========================================================================
echo.
pause
goto MENU

:BUILD_PLUGIN
cls
echo.
echo ========================================================================
echo                    BUILDING VST3 PLUGIN
echo ========================================================================
echo.
echo This will compile the MusicTheory Bridge VST3 plugin.
echo.
echo Make sure you have:
echo   - Visual Studio 2022 with C++ workload (ensure these components are included)
echo     - MSVC v143 - VS 2022 C++ x64/x86 build tools
echo     - CMake tools for Windows
echo     - Windows 10/11 SDK (10.0.x.x)
echo   - VST3 SDK downloaded and extracted
echo   - vcpkg + curl installed
echo.
echo If not, press Ctrl+C to cancel and run option [1] first!
echo.
pause
echo.

cd vst3-plugin
call QUICK_BUILD.bat
set BUILD_RESULT=%ERRORLEVEL%
cd ..

if !BUILD_RESULT! neq 0 (
    echo.
    echo ========================================================================
    echo BUILD FAILED!
    echo ========================================================================
    echo.
    echo Check the error messages above.
    echo Common issues:
    echo   - VST3 SDK not found (set VST3_SDK_ROOT)
    echo   - curl not installed (vcpkg install curl:x64-windows)
    echo   - Visual Studio not installed
    echo.
    echo See BUILD_AND_RUN.md for detailed troubleshooting.
    echo.
    pause
    goto MENU
)

echo.
echo ========================================================================
echo BUILD SUCCESSFUL!
echo ========================================================================
echo.
echo Plugin location: vst3-plugin\build\Release\MusicTheoryVST3.vst3
echo.
echo Next step: Choose option [4] to install to VST3 folder
echo.
pause
goto MENU

:INSTALL_PLUGIN
cls
echo.
echo ========================================================================
echo              INSTALLING PLUGIN TO VST3 FOLDER
echo ========================================================================
echo.

if not exist "vst3-plugin\build\Release\MusicTheoryVST3.vst3" (
    echo ERROR: Plugin not found!
    echo You must build the plugin first (option 3^)
    echo.
    pause
    goto MENU
)

set "VST3_DIR=%ProgramFiles%\Common Files\VST3"
if not exist "%VST3_DIR%" (
    echo Creating VST3 folder: %VST3_DIR%
    mkdir "%VST3_DIR%"
)

echo Copying plugin to: %VST3_DIR%
echo.
copy /Y "vst3-plugin\build\Release\MusicTheoryVST3.vst3" "%VST3_DIR%\"
if errorlevel 1 (
    echo.
    echo ERROR: Copy failed! You may need administrator privileges.
    echo.
    echo Try manually copying:
    echo   FROM: %CD%\vst3-plugin\build\Release\MusicTheoryVST3.vst3
    echo   TO:   %VST3_DIR%\
    echo.
    pause
    goto MENU
)

echo.
echo ========================================================================
echo SUCCESS! Plugin installed.
echo ========================================================================
echo.
echo Location: %VST3_DIR%\MusicTheoryVST3.vst3
echo.
echo Next steps:
echo   1. Restart your DAW (or rescan plugins)
echo   2. Look for "MusicTheory Bridge" in your plugin list
echo   3. Start MIDI server (option 5)
echo   4. Load plugin and play MIDI notes!
echo.
pause
goto MENU

:START_SERVER
cls
echo.
echo ========================================================================
echo                    STARTING MIDI SERVER
echo ========================================================================
echo.
echo This will start the server on http://127.0.0.1:5544
echo.
echo AFTER SERVER STARTS:
echo   1. Open browser to: http://127.0.0.1:5544
echo   2. Select your MIDI output device
echo   3. Load plugin in DAW
echo   4. Play MIDI notes!
echo.
echo Press Ctrl+C in the server window to stop it.
echo.
pause

start "Music Theory MIDI Server" cmd /k "cd /d "%CD%" && START_SERVER.bat"

echo.
echo Server started in new window!
echo.
echo Opening browser to server UI...
timeout /t 2 /nobreak >nul
start http://127.0.0.1:5544

echo.
pause
goto MENU

:OPEN_DOCS
cls
echo.
echo ========================================================================
echo                        DOCUMENTATION
echo ========================================================================
echo.
echo Opening documentation files...
echo.

start BUILD_AND_RUN.md
timeout /t 1 /nobreak >nul
start vst3-plugin\QUICKSTART.md
timeout /t 1 /nobreak >nul
start FINAL_STATUS.md

echo.
echo Documentation opened in your default markdown viewer.
echo.
echo If files don't open, view them in VS Code or any text editor:
echo   - BUILD_AND_RUN.md       (Complete guide)
echo   - QUICKSTART.md          (Fast track)
echo   - FINAL_STATUS.md        (Current status)
echo.
pause
goto MENU

:END
cls
echo.
echo ========================================================================
echo                           GOODBYE!
echo ========================================================================
echo.
echo Quick reference:
echo   - Setup check:   SETUP_CHECK.bat
echo   - Build plugin:  cd vst3-plugin; QUICK_BUILD.bat
echo   - Start server:  START_SERVER.bat
echo   - Full guide:    BUILD_AND_RUN.md
echo.
echo Good luck with your music theory project! 🎵
echo.
pause
exit /b 0
