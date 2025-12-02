@echo off
REM ========================================================================
REM Test MIDI Server - Verifies server is running and responsive
REM ========================================================================
setlocal
cd /d "%~dp0"

if "%~1" neq "--logged" (
    if not exist "logs" mkdir "logs"
    set "THIS_BATCH=%~f0"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=Get-Date -Format 'yyyyMMdd_HHmmss'; $log=Join-Path (Get-Location) ('logs/test_server_' + $t + '.log'); Start-Transcript -Path $log -Force; $cmd = 'call \"' + $env:THIS_BATCH + '\" --logged'; cmd.exe /c $cmd; Stop-Transcript"
    exit /b
)

echo.
echo ========================================================================
echo              TESTING MIDI SERVER CONNECTIVITY
echo ========================================================================
echo.

echo [1/4] Checking if server is running...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5544/status' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
    echo [FAIL] Server not responding!
    echo.
    echo The server is not running or not accessible.
    echo.
    echo To start server:
    echo   1. Run: START_SERVER.bat
    echo   2. Or manually: py tools\bitwig_midi_server.py
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Server is running!
)

echo.
echo [2/4] Checking status endpoint...
powershell -NoProfile -Command "$r = Invoke-RestMethod -Uri 'http://127.0.0.1:5544/status'; Write-Host 'Status:' $r.status; Write-Host 'MIDI Output:' $r.current_output"
echo.

echo [3/4] Listing available MIDI outputs...
powershell -NoProfile -Command "$r = Invoke-RestMethod -Uri 'http://127.0.0.1:5544/midi/outputs'; Write-Host 'Available outputs:'; $r.outputs | ForEach-Object { Write-Host '  -' $_ }"
echo.

echo [4/4] Testing chord endpoint...
powershell -NoProfile -Command "try { $body = @{ notes = @('C4', 'E4', 'G4'); velocity = 96; duration_ms = 1000 } | ConvertTo-Json; $r = Invoke-RestMethod -Uri 'http://127.0.0.1:5544/midi/chord' -Method POST -ContentType 'application/json' -Body $body; Write-Host '[OK] Chord endpoint working'; exit 0 } catch { Write-Host '[FAIL] Chord endpoint error:' $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo.
    echo [WARNING] Chord endpoint test failed.
    echo This may be normal if no MIDI output is selected yet.
) else (
    echo [OK] Chord sent successfully!
)

echo.
echo ========================================================================
echo                        TEST COMPLETE
echo ========================================================================
echo.
echo Server is ready! Next steps:
echo   1. Open browser to: http://127.0.0.1:5544
echo   2. Select MIDI output device
echo   3. Load VST3 plugin in DAW
echo   4. Play MIDI notes!
echo.
echo To test in browser:
echo   start http://127.0.0.1:5544
echo.
pause
