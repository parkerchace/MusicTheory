@echo off
REM ========================================================================
REM ALL-IN-ONE Setup Script for Music Theory VST3 Plugin
REM This script checks dependencies and guides you through setup
REM Auto-logs to logs/setup_check_YYYYMMDD_HHMMSS.log
REM ========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0.."

if "%~1" neq "--logged" (
    if not exist "logs" mkdir "logs"
    set "THIS_BATCH=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=Get-Date -Format 'yyyyMMdd_HHmmss'; $log = Join-Path (Get-Location) ('logs/setup_check_' + $t + '.log'); Start-Transcript -Path $log -Force; $cmd = 'call \"' + $env:THIS_BATCH + '\" --logged'; cmd.exe /c $cmd; Stop-Transcript"
    exit /b
)

echo.
echo ========================================================================
echo        MUSIC THEORY VST3 PLUGIN - COMPLETE SETUP
echo ========================================================================
echo.

set "ERRORS=0"
set "WARNINGS=0"

REM ============ Check 1: Python ============
echo [1/7] Checking Python installation...
py --version >nul 2>&1
if errorlevel 1 (
    python --version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found! Download from: https://www.python.org/downloads/
        set /a ERRORS+=1
    ) else (
        echo [OK] Python found
    )
) else (
    echo [OK] Python found
)

REM ============ Check 2: Visual Studio ============
echo [2/7] Checking Visual Studio (any installed version)...
set "VS_FOUND=0"
rem Search common Visual Studio install roots for vcvars64.bat (covers 2022, 2026, Preview/Insiders)
for /f "delims=" %%D in ('dir "C:\Program Files\Microsoft Visual Studio" /ad /b 2^>nul') do (
    if exist "C:\Program Files\Microsoft Visual Studio\%%D\VC\Auxiliary\Build\vcvars64.bat" set "VS_FOUND=1"
)
for /f "delims=" %%D in ('dir "C:\Program Files (x86)\Microsoft Visual Studio" /ad /b 2^>nul') do (
    if exist "C:\Program Files (x86)\Microsoft Visual Studio\%%D\VC\Auxiliary\Build\vcvars64.bat" set "VS_FOUND=1"
)

rem Also check user-specified/codebase roots on other drives (e.g., D:)
if exist "D:\codingapp" (
    for /f "delims=" %%F in ('dir "D:\codingapp\vcvars64.bat" /s /b 2^>nul') do (
        if exist "%%F" set "VS_FOUND=1"
    )
)
if exist "D:\coding" (
    for /f "delims=" %%F in ('dir "D:\coding\vcvars64.bat" /s /b 2^>nul') do (
        if exist "%%F" set "VS_FOUND=1"
    )
)

if !VS_FOUND!==0 (
    echo [ERROR] Visual Studio not found in common locations!
    echo Download from: https://visualstudio.microsoft.com/downloads/
    echo Install the "Desktop development with C++" workload and these components:
    echo   - MSVC C++ toolset (v143 or later)
    echo   - CMake tools for Windows
    echo   - Windows 10/11 SDK (10.0.x.x)
    echo After installing, restart this shell and re-run this check
    set /a ERRORS+=1
) else (
    echo [OK] Visual Studio detected
)

REM ============ Check 3: CMake ============
echo [3/7] Checking CMake...
cmake --version >nul 2>&1
if errorlevel 1 (
) else (
    echo [OK] CMake found
)

if errorlevel 1 (
    echo [WARNING] 'cmake' not on PATH. Attempting to locate common CMake installations...
    set "CMAKE_FOUND=0"
    if exist "C:\Program Files\CMake\bin\cmake.exe" (
        set "CMAKE_BIN=C:\Program Files\CMake\bin"
        set "CMAKE_FOUND=1"
    ) else if exist "C:\Program Files (x86)\CMake\bin\cmake.exe" (
        set "CMAKE_BIN=C:\Program Files (x86)\CMake\bin"
        set "CMAKE_FOUND=1"
    ) else (
        for /f "delims=" %%C in ('dir "C:\Program Files\CMake" /s /b 2^>nul ^| findstr /i "\\cmake.exe$"') do (
            if exist "%%~dpCcmake.exe" (
                set "CMAKE_BIN=%%~dpC"
                set "CMAKE_FOUND=1"
                goto :CMAKE_LOCATED
            )
        )
    )
:CMAKE_LOCATED
    if "%CMAKE_FOUND%"=="1" (
        echo Found CMake in %CMAKE_BIN%; adding to PATH for this session.
        set "PATH=%CMAKE_BIN%;%PATH%"
        cmake --version >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] Found CMake binary but failed to run it. Please check permissions.
            set /a ERRORS+=1
        ) else (
            echo [OK] CMake is now available.
        )
    ) else (
        echo [ERROR] CMake not found. Download from: https://cmake.org/download/
        set /a ERRORS+=1
    )
) else (
    rem (handled above)
)

REM ============ Check 4: VST3 SDK ============
echo [4/7] Checking VST3 SDK...
set "SDK_FOUND=0"
if exist "VST3_SDK\" set "SDK_FOUND=1"
if exist "..\VST3_SDK\" set "SDK_FOUND=1"
if defined VST3_SDK_ROOT (
    if exist "%VST3_SDK_ROOT%" set "SDK_FOUND=1"
)

REM If SDK found in default location but env var not set, set it for this session
if "%SDK_FOUND%"=="1" (
    if not defined VST3_SDK_ROOT (
        if exist "VST3_SDK\" (
            set "VST3_SDK_ROOT=%CD%\VST3_SDK"
            echo Found VST3 SDK at %VST3_SDK_ROOT%; using this path for the session
        ) else if exist "..\VST3_SDK\" (
            set "VST3_SDK_ROOT=%CD%\..\VST3_SDK"
            echo Found VST3 SDK at %VST3_SDK_ROOT%; using this path for the session
        )
    )
)

rem Try to auto-detect common SDK folders if not explicitly found (search limited locations)
if "%SDK_FOUND%"=="0" (
    echo Trying to auto-detect VST3 SDK locations...
    set "FOUND_SDK_PATH="
    rem Search within repo root and parent and OneDrive project folder for likely SDK directories
    for /f "delims=" %%S in ('dir /s /b /ad "%CD%" 2^>nul ^| findstr /i /c:"VST3_SDK" /c:"vst3sdk" /c:"pluginterfaces"') do (
        if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%S"
    )
    if not defined FOUND_SDK_PATH (
        rem also check one level up and the user's OneDrive project folder
        for /f "delims=" %%S in ('dir /s /b /ad "%CD%\.." 2^>nul ^| findstr /i /c:"VST3_SDK" /c:"vst3sdk" /c:"pluginterfaces"') do (
            if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%S"
        )
    )
    if not defined FOUND_SDK_PATH (
        for /f "delims=" %%S in ('dir /s /b /ad "C:\Users\%USERNAME%\OneDrive*" 2^>nul ^| findstr /i /c:"VST3_SDK" /c:"vst3sdk" /c:"pluginterfaces"') do (
            if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%S"
        )
    )
    rem Check for VST_SDK\vst3sdk layout (common when SDK extracted into VST_SDK folder)
    if not defined FOUND_SDK_PATH (
        if exist "%CD%\VST_SDK\vst3sdk\pluginterfaces" (
            set "FOUND_SDK_PATH=%CD%\VST_SDK\vst3sdk"
        ) else if exist "%CD%\VST_SDK\vst3sdk" (
            set "FOUND_SDK_PATH=%CD%\VST_SDK\vst3sdk"
        ) else (
            for /f "delims=" %%T in ('dir /s /b /ad "%CD%\..\VST_SDK\vst3sdk" 2^>nul') do (
                if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%T"
            )
            if not defined FOUND_SDK_PATH (
                for /f "delims=" %%U in ('dir /s /b /ad "C:\Users\%USERNAME%\OneDrive*\VST_SDK\vst3sdk" 2^>nul') do (
                    if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%U"
                )
            )
        )
    )
    rem Additionally, look for common 'vst3sdk' or 'vst3sdk-master' folders and prefer parent containing 'pluginterfaces'
    if not defined FOUND_SDK_PATH (
        for /f "delims=" %%R in ('dir /s /b /ad "%CD%\.." 2^>nul ^| findstr /i "vst3sdk"') do (
            if exist "%%R\pluginterfaces" if not defined FOUND_SDK_PATH set "FOUND_SDK_PATH=%%R"
        )
    )
    if defined FOUND_SDK_PATH (
        set "SDK_FOUND=1"
        if not defined VST3_SDK_ROOT (
            set "VST3_SDK_ROOT=%FOUND_SDK_PATH%"
            echo Auto-detected VST3 SDK at %VST3_SDK_ROOT% and using it for this session
        )
    )
)

if "%SDK_FOUND%"=="0" (
    echo [ERROR] VST3 SDK not found!
    echo.
    echo Download from: https://github.com/steinbergmedia/vst3sdk
    echo Extract to: %CD%\VST3_SDK
    echo Or set VST3_SDK_ROOT environment variable
    set /a ERRORS+=1
) else (
    echo [OK] VST3 SDK found
)

REM ============ Check 5: vcpkg/curl ============
echo [5/7] Checking vcpkg and curl...
set "VCPKG_FOUND=0"
where vcpkg >nul 2>&1 && set "VCPKG_FOUND=1"
if "%VCPKG_FOUND%"=="0" (
    echo [WARNING] vcpkg not found
    set /a WARNINGS+=1
) else (
    vcpkg list curl:x64-windows | find "curl" >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] curl not installed via vcpkg
        set /a WARNINGS+=1
    ) else (
        echo [OK] vcpkg and curl found
    )
)

REM Optional: Ask to auto-install vcpkg if missing
if "%VCPKG_FOUND%"=="0" (
    echo.
    echo Would you like to try installing vcpkg and curl now? (Y/N)
    set /p CHOICE="Install vcpkg and curl now? (Y/N): "
    if /I "%CHOICE%"=="Y" (
        where git >nul 2>&1
        if errorlevel 1 (
            echo git not found on PATH.
            echo I can download the vcpkg ZIP and bootstrap it for you (no git required).
            set /p GCHOICE="Download vcpkg ZIP and bootstrap to C:\vcpkg now? (Y/N): "
            if /I "%GCHOICE%"=="Y" (
                echo Downloading vcpkg ZIP and bootstrapping (this may take a few minutes)...
                powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $zip='C:\vcpkg.zip'; Invoke-WebRequest -Uri 'https://github.com/microsoft/vcpkg/archive/refs/heads/master.zip' -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath 'C:\'; Remove-Item -Path $zip -Force; if(Test-Path 'C:\vcpkg-master') { if(Test-Path 'C:\vcpkg') { Remove-Item -Recurse -Force 'C:\vcpkg' }; Move-Item -Path 'C:\vcpkg-master' -Destination 'C:\vcpkg' } ; exit 0 } catch { Write-Error $_; exit 1 }"
                if errorlevel 1 (
                    echo ERROR: Failed to download or extract vcpkg ZIP. Please install Git or download vcpkg manually.
                    goto :END_VCPKG
                )
                echo Bootstrapping vcpkg...
                pushd C:\vcpkg
                .\bootstrap-vcpkg.bat || (echo ERROR: vcpkg bootstrap failed & popd & goto :END_VCPKG)
                .\vcpkg integrate install || (echo WARNING: vcpkg integrate install failed)
                .\vcpkg install curl:x64-windows || (echo WARNING: vcpkg install curl failed)
                popd
                echo vcpkg installation complete. Please re-open this shell and re-run SETUP_CHECK.bat
            ) else (
                echo Skipping vcpkg installation. You can install it later manually.
            )
        ) else (
            echo Installing vcpkg to C:\vcpkg using git...
            pushd C:\
            git clone https://github.com/microsoft/vcpkg vcpkg || (echo ERROR: git clone failed & popd & goto :END_VCPKG)
            cd vcpkg
            .\bootstrap-vcpkg.bat || (echo ERROR: vcpkg bootstrap failed & popd & goto :END_VCPKG)
            .\vcpkg integrate install || (echo WARNING: vcpkg integrate install failed)
            .\vcpkg install curl:x64-windows || (echo WARNING: vcpkg install curl failed)
            popd
            echo vcpkg installation complete. Please re-open this shell and re-run SETUP_CHECK.bat
        )
    )
)

:END_VCPKG

REM ============ Check 6: Python packages ============
echo [6/7] Checking Python packages...
py -c "import fastapi, uvicorn, mido, rtmidi" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Python packages not installed
    echo Run: py -m pip install fastapi uvicorn mido python-rtmidi
    set /a WARNINGS+=1
) else (
    echo [OK] Python packages installed
)

REM ============ Check 7: loopMIDI ============
echo [7/7] Checking loopMIDI (optional)...
if exist "C:\Program Files\Tobias Erichsen\loopMIDI\loopMIDI.exe" (
    echo [OK] loopMIDI found
) else (
    echo [INFO] loopMIDI not detected (optional for DAW integration)
    echo Download: https://www.tobias-erichsen.de/software/loopmidi.html
)

echo.
echo ========================================================================
echo                          SUMMARY
echo ========================================================================
if !ERRORS! GTR 0 (
    echo Status: !ERRORS! CRITICAL ERROR(S) - Cannot build yet
    echo Fix the errors above before building
) else (
    if !WARNINGS! GTR 0 (
        echo Status: !WARNINGS! WARNING(S) - May build but features limited
        echo Consider fixing warnings for full functionality
    ) else (
        echo Status: ALL CHECKS PASSED! Ready to build
    )
)
echo.

if !ERRORS! GTR 0 (
    echo Press any key to exit and fix errors...
    pause >nul
    exit /b 1
)

echo.
echo ========================================================================
echo                    QUICK SETUP COMMANDS
echo ========================================================================
echo.
echo To install Python packages:
echo   py -m pip install fastapi uvicorn mido python-rtmidi
echo.
echo To build the plugin:
echo   cd vst3-plugin
echo   Double-click QUICK_BUILD.bat
echo.
echo To start MIDI server:
echo   py tools\bitwig_midi_server.py
echo.
echo To install plugin:
echo   Copy vst3-plugin\build\Release\MusicTheoryVST3.vst3
echo   To: C:\Program Files\Common Files\VST3\
echo.
echo ========================================================================
echo.
pause
