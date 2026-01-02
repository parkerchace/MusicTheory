@echo off
REM ========================================
REM Quick Build Script for VST3 Plugin
REM ========================================
setlocal
cd /d "%~dp0"

if "%~1" neq "--logged" (
    if not exist "..\logs" mkdir "..\logs"
    set "THIS_BATCH=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=Get-Date -Format 'yyyyMMdd_HHmmss'; $log=Join-Path (Get-Location) ('..\\logs\\quick_build_' + $t + '.log'); Start-Transcript -Path $log -Force; $cmd = 'call \"' + $env:THIS_BATCH + '\" --logged'; cmd.exe /c $cmd; Stop-Transcript"
    exit /b
)

echo.
echo ========================================
echo Music Theory VST3 Plugin - Quick Build
echo ========================================
echo.

REM Check for Visual Studio 2022
set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\devenv.com"
if not exist "%VS_PATH%" (
    set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\IDE\devenv.com"
)
if not exist "%VS_PATH%" (
    set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\IDE\devenv.com"
)

REM Check for VST3 SDK
if not exist "..\VST3_SDK" (
    if not exist "VST3_SDK" (
        if not defined VST3_SDK_ROOT (
            echo ERROR: VST3 SDK not found!
            echo.
            echo Please download from: https://github.com/steinbergmedia/vst3sdk
            echo Extract to one of these locations:
            echo   - C:\Users\spark\OneDrive - american.edu\music theory app\VST3_SDK
            echo   - C:\Users\spark\OneDrive - american.edu\music theory app\music theory v11\VST3_SDK
            echo   - Or set VST3_SDK_ROOT environment variable
            echo.
            pause
            exit /b 1
        )
    )
)

REM Check for vcpkg curl
where vcpkg >nul 2>&1
if errorlevel 1 (
    echo WARNING: vcpkg not found. You'll need curl for HTTP requests.
    echo Install vcpkg and run: vcpkg install curl:x64-windows
    echo.
)

REM Create build directory
if not exist "build" mkdir build
cd build

echo Configuring with CMake...
cmake .. -G "Visual Studio 17 2022" -A x64
if errorlevel 1 (
    echo.
    echo ERROR: CMake configuration failed!
    echo Make sure you have:
    echo   1. Visual Studio 2022 installed
    echo   2. VST3 SDK downloaded and placed correctly
    echo   3. curl installed via vcpkg: vcpkg install curl:x64-windows
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo Building Release configuration...
cmake --build . --config Release
if errorlevel 1 (
    echo.
    echo ERROR: Build failed! Check the error messages above.
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Plugin built: build\Release\MusicTheoryVST3.vst3
echo.
echo To install, copy to:
echo   %ProgramFiles%\Common Files\VST3\
echo.
echo Or run: cmake --install . --config Release
echo.
cd ..
pause
