<#
PowerShell helper to build the VST3 plugin on Windows.
Prereqs:
- Visual Studio 2022 (MSVC x64)
- CMake >= 3.20
- vcpkg (optional) with curl installed, or system libcurl available
- Steinberg VST3 SDK available at ../VST3_SDK or set environment variable VST3_SDK_ROOT
#>
param(
    [string] $VST3_SDK_ROOT = "",
    [string] $BuildDir = "build",
    [string] $Config = "Release",
    [string] $VcpkgToolchain = "$env:VCPKG_ROOT\scripts\buildsystems\vcpkg.cmake"
)

if (-not $VST3_SDK_ROOT) {
    if ($env:VST3_SDK_ROOT) { $VST3_SDK_ROOT = $env:VST3_SDK_ROOT }
    else { $VST3_SDK_ROOT = Join-Path $PSScriptRoot "..\VST3_SDK" }
}

if (-not (Test-Path $VST3_SDK_ROOT)) {
    Write-Error "VST3 SDK not found at '$VST3_SDK_ROOT'. Please download the SDK and place it at ../VST3_SDK or set VST3_SDK_ROOT env var."; exit 1
}

$cmakeArgs = @(
    "-S", "$PSScriptRoot",
    "-B", "$PSScriptRoot\$BuildDir",
    "-G", "Visual Studio 17 2022",
    "-A", "x64",
    "-DVST3_SDK_ROOT=$VST3_SDK_ROOT"
)

if (Test-Path $VcpkgToolchain) {
    Write-Host "Using vcpkg toolchain: $VcpkgToolchain"
    $cmakeArgs += "-DCMAKE_TOOLCHAIN_FILE=$VcpkgToolchain"
}

Write-Host "Running cmake configure..."
cmake @cmakeArgs
if ($LASTEXITCODE -ne 0) { Write-Error "CMake configure failed"; exit $LASTEXITCODE }

Write-Host "Building plugin ($Config)..."
cmake --build "$PSScriptRoot\$BuildDir" --config $Config
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit $LASTEXITCODE }

Write-Host "Build finished. Look in $PSScriptRoot\$BuildDir\bin\$Config or similar for the .dll/.vst3 artifact."
Write-Host "If your build produced a .dll, you may need to package it into a .vst3 bundle or place it in your DAW VST3 folder."