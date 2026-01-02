<#
Windows PowerShell helper to create a virtualenv and install requirements
Usage:
  Open PowerShell (not cmd.exe)
  cd to project root, then:
    powershell -ExecutionPolicy Bypass -File .\vst3-plugin\setup_python_env.ps1
This script avoids using '&&' which older PowerShell versions don't support.
#>

# Start strict mode and prepare logging
Set-StrictMode -Version Latest

# Create a logs directory and start a transcript so we capture stdout/stderr
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$logDir = Join-Path $scriptDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $logDir ("setup_python_env_$timestamp.log")
try {
    Start-Transcript -Path $logFile -Force | Out-Null
    Write-Host "Logging to: $logFile"
} catch {
    Write-Warning "Failed to start transcript logging: $_. Proceeding without transcript file."
}

try {
# Configuration
$venv = ".venv"
$reqCandidates = @("..\requirements.txt", "requirements.txt", "..\vst3-plugin\requirements.txt")

function Find-Python {
    $candidates = @(
        @{Exe = "py"; PrefixArgs = @("-3")},
        @{Exe = "py"; PrefixArgs = @()},
        @{Exe = "python"; PrefixArgs = @()},
        @{Exe = "python3"; PrefixArgs = @()}
    )
    foreach ($t in $candidates) {
        try {
            $exe = $t.Exe
            $prefix = $t.PrefixArgs
            $testArgs = $prefix + @("--version")
            $null = & $exe @testArgs 2>&1
            if ($LASTEXITCODE -eq 0) {
                return [PSCustomObject]@{ Exe = $exe; PrefixArgs = $prefix }
            }
        } catch {
            # ignore and continue
        }
    }
    return $null
}

Write-Host "Locating Python..."
$python = Find-Python
if (-not $python) {
    Write-Error "No Python interpreter found. Install Python 3 and ensure 'py' or 'python' is on PATH."; exit 1
}

# Resolve full paths (handles spaces)
$venvFull = Join-Path -Path (Get-Location) -ChildPath $venv

Write-Host "Creating virtual environment at '$venvFull' using '$($python.Exe) $($python.PrefixArgs -join ' ')'..."
try {
    $createArgs = @($python.PrefixArgs + @("-m","venv", $venvFull))
    & $python.Exe @createArgs
} catch {
    Write-Error "Failed to create virtualenv with command '$($python.Exe) $($python.PrefixArgs -join ' ') -m venv'. Error: $_"; exit 1
}

# Determine pip in venv (Windows)
$pip = Join-Path -Path $venvFull -ChildPath "Scripts\pip.exe"
if (-not (Test-Path $pip)) {
    Write-Error "pip not found at $pip; venv creation may have failed."; exit 1
}

# Find a requirements file from candidates
$req = $null
foreach ($candidate in $reqCandidates) {
    $candidateFull = Resolve-Path -Path $candidate -ErrorAction SilentlyContinue
    if ($candidateFull) { $req = $candidateFull; break }
}

if (-not $req) {
    Write-Warning "Requirements file not found in expected locations. Skipping pip install. Create a requirements.txt and re-run if you need packages installed."; 
    Write-Host "Virtual environment ready at '$venvFull'. To activate interactively, run:`n  .\$venv\Scripts\Activate.ps1"
    exit 0
}

Write-Host "Installing requirements from '$req' using pip at '$pip'..."
try {
    & $pip install -r $req
    if ($LASTEXITCODE -ne 0) { throw "pip exited with code $LASTEXITCODE" }
} catch {
    Write-Error "pip install failed: $_"; exit 1
}

Write-Host "Virtual environment ready. To activate interactively, run:`n  .\$venv\Scripts\Activate.ps1"

} finally {
    try { Stop-Transcript | Out-Null } catch { }
}