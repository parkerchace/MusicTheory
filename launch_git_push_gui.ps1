<#
Launch-GitPushGUI.ps1
PowerShell launcher for the Git Push GUI. Double-clicking a .ps1 in Explorer will be blocked by ExecutionPolicy by default; right-click and "Run with PowerShell" or set ExecutionPolicy accordingly.
#>

$script = Join-Path $PSScriptRoot 'git_push_gui.py'
if (-not (Test-Path $script)) {
    Write-Error "Cannot find $script"
    exit 1
}

# Run python with the script path
& python $script
