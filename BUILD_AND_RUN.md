# 🎵 Music Theory App - Complete Build & Run Guide

## ⚡ QUICK START (5 Commands)

```powershell
# 1. Check if you have everything needed
.\SETUP_CHECK.bat

# 2. Install Python packages
py -m pip install fastapi uvicorn mido python-rtmidi

# 3. Build the VST3 plugin (after installing prerequisites from SETUP_CHECK)
cd vst3-plugin
.\QUICK_BUILD.bat

# 4. Copy plugin to VST3 folder
copy build\Release\MusicTheoryVST3.vst3 "C:\Program Files\Common Files\VST3\"

# 5. Start MIDI server
cd ..
.\START_SERVER.bat
```

---

## 📋 Prerequisites Checklist

### Required (Must Have)
- [ ] **Python 3.9+** - https://www.python.org/downloads/
- [ ] **Visual Studio 2022** (Community/Pro/Enterprise) with "C++ Desktop Development" workload
  - https://visualstudio.microsoft.com/downloads/
  - During setup, select the following components (Individual Components / Workload options):
    - MSVC v143 - VS 2022 C++ x64/x86 build tools
    - CMake tools for Windows
    - Windows 10/11 SDK (10.0.x.x) or later
    - MSBuild (included with workload)
    - Optional: "C++ CMake tools for Windows" to simplify development
- [ ] **CMake 3.20+** - https://cmake.org/download/
- [ ] **VST3 SDK** - https://github.com/steinbergmedia/vst3sdk
  - Extract to: `"%USERPROFILE%\OneDrive - american.edu\music theory app\VST3_SDK"` (replace with your user folder)
- [ ] **vcpkg + curl**
  ```powershell
  cd C:\
  git clone https://github.com/microsoft/vcpkg
  cd vcpkg
  .\bootstrap-vcpkg.bat
  .\vcpkg integrate install
  .\vcpkg install curl:x64-windows
  ```

### Optional (Recommended for DAW Integration)
- [ ] **loopMIDI** - https://www.tobias-erichsen.de/software/loopmidi.html
  - Creates virtual MIDI ports for routing between VST3 and server

---

## 🔧 Detailed Build Instructions

### Step 1: Verify Environment
```powershell
# Run the automated check
.\SETUP_CHECK.bat
```

This will verify all prerequisites and show what's missing.

### Step 2: Install Python Dependencies
```powershell
py -m pip install -r requirements.txt
```

Or manually:
```powershell
py -m pip install fastapi uvicorn mido python-rtmidi
```

### Step 3: Build VST3 Plugin

#### Option A: Quick Build (Easiest)
```powershell
cd vst3-plugin
.\QUICK_BUILD.bat
```

#### Option B: Manual Build (Advanced)
```powershell
cd vst3-plugin
mkdir build
cd build

# Configure
cmake .. -G "Visual Studio 17 2022" -A x64

# Build
cmake --build . --config Release

# Optional: Install to VST3 folder
cmake --install . --config Release
```

### Step 4: Install Plugin
Copy the built plugin:
```powershell
copy vst3-plugin\build\Release\MusicTheoryVST3.vst3 "C:\Program Files\Common Files\VST3\"
```

Or use the CMake install command from step 3B.

---

## 🚀 Running the System

### 1. Start the MIDI Server

#### Option A: Quick Start Script
```powershell
.\START_SERVER.bat
```

#### Option B: Manual
```powershell
py tools\bitwig_midi_server.py
```

Server will start at: **http://127.0.0.1:5544**

### 2. Configure MIDI Output
1. Open browser to: http://127.0.0.1:5544
2. Select your MIDI output device from dropdown
   - If using loopMIDI: create a port first, then select it
   - For direct DAW integration: select appropriate device

### 3. Load Plugin in DAW
1. Restart your DAW (or rescan plugins)
2. Create a MIDI track
3. Insert "MusicTheory Bridge" plugin
4. Play MIDI notes → they'll appear in the web app!

### 4. Open Web Interface
Open `modular-music-theory.html` in a web browser to see visualizations.

---

## 🔍 Troubleshooting

### Build Issues

**"VST3_SDK_ROOT not set"**
```powershell
# Set environment variable
$env:VST3_SDK_ROOT = "C:\path\to\VST3_SDK"

# Or pass to cmake
cmake .. -DVST3_SDK_ROOT="C:\path\to\VST3_SDK"
```

**"Could not find CURL"**
```powershell
# Install via vcpkg
vcpkg install curl:x64-windows
vcpkg integrate install
```

**"No targets specified to build"**
- Make sure you're in the `build` subdirectory
- Re-run `cmake ..` to regenerate

**Link errors about missing VST3 symbols**
- Ensure VST3_SDK path is correct
- CMakeLists.txt now includes all required SDK sources

### Runtime Issues

**Plugin doesn't appear in DAW**
- Check plugin was copied to correct VST3 folder
- Restart DAW completely
- Check DAW's plugin scan log

**Plugin loads but doesn't send MIDI**
- Verify server is running: http://127.0.0.1:5544/status
- Check MIDI output selected in server web UI
- Verify DAW is sending MIDI to the plugin track
- Check Windows Firewall isn't blocking port 5544

**Server won't start - "Port already in use"**
```powershell
# Find and kill process on port 5544
netstat -ano | findstr :5544
taskkill /PID <process_id> /F
```

**Server won't start - Missing packages**
```powershell
# Reinstall all packages
py -m pip install --force-reinstall fastapi uvicorn mido python-rtmidi
```

---

## 📁 Project Structure

```
music theory v11/
├── SETUP_CHECK.bat              # ✅ Verify all prerequisites
├── START_SERVER.bat             # ✅ Start MIDI server with one click
├── requirements.txt             # Python dependencies
├── modular-music-theory.html    # Web UI for visualization
│
├── tools/
│   └── bitwig_midi_server.py    # FastAPI MIDI server
│
├── vst3-plugin/
│   ├── QUICK_BUILD.bat          # ✅ One-click build script
│   ├── QUICKSTART.md            # Quick reference guide
│   ├── CMakeLists.txt           # Build configuration
│   │
│   ├── src/
│   │   ├── plugin/
│   │   │   ├── MusicTheoryPlugin.cpp      # Main processor
│   │   │   ├── MusicTheoryPlugin.h
│   │   │   ├── MusicTheoryController.cpp  # Parameter interface
│   │   │   └── MusicTheoryController.h
│   │   │
│   │   ├── network/
│   │   │   ├── HttpClient.cpp             # Async HTTP client
│   │   │   └── HttpClient.h
│   │   │
│   │   ├── entry.cpp                      # VST3 factory
│   │   └── version.h                      # Version info
│   │
│   └── build/                   # Build output (created by CMake)
│       └── Release/
│           └── MusicTheoryVST3.vst3  # ← Your plugin!
│
└── VST3_SDK/                    # ← Download and extract here
    ├── pluginterfaces/
    ├── public.sdk/
    └── base/
```

---

## 🎹 Usage Workflow

```
┌─────────────┐
│   Your DAW  │  Play MIDI notes
│  (Bitwig/   │
│   Reaper)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ MusicTheory Bridge  │  VST3 Plugin captures notes
│   VST3 Plugin       │  Groups into chords per bar
└──────┬──────────────┘
       │ HTTP POST
       ▼
┌─────────────────────┐
│  MIDI Server        │  Port 5544
│  (Python/FastAPI)   │  Converts to MIDI events
└──────┬──────────────┘
       │ MIDI Output
       ▼
┌─────────────────────┐
│  Virtual MIDI Port  │  loopMIDI or hardware
│  (loopMIDI)         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Web Visualizer     │  modular-music-theory.html
│  (Sheet Music)      │  Shows notation & analysis
└─────────────────────┘
```

---

## 🛠️ Development

### Rebuild After Code Changes
```powershell
cd vst3-plugin\build
cmake --build . --config Release
copy Release\MusicTheoryVST3.vst3 "C:\Program Files\Common Files\VST3\"
```

### View Plugin Console Output
- Most DAWs show plugin stdout/stderr in their console
- Or use DebugView: https://learn.microsoft.com/sysinternals/downloads/debugview

### Test Server Endpoints
```powershell
# Check status
Invoke-RestMethod http://127.0.0.1:5544/status

# List MIDI outputs
Invoke-RestMethod http://127.0.0.1:5544/midi/outputs

# Send test chord
Invoke-RestMethod http://127.0.0.1:5544/midi/chord -Method POST `
  -ContentType "application/json" `
  -Body '{"notes":["C4","E4","G4"],"velocity":96,"duration_ms":1000}'
```

---

## 📚 Additional Documentation

- **VST3 Plugin Details**: `vst3-plugin\README.md`
- **Quick Start**: `vst3-plugin\QUICKSTART.md`
- **MIDI Integration**: `BITWIG_MIDI_INTEGRATION.md`
- **Sheet Music**: `SHEET_MUSIC_QUICKSTART.md`

---

## ✅ Success Checklist

After setup, you should be able to:
- [ ] Run `.\SETUP_CHECK.bat` with no errors
- [ ] Build completes successfully
- [ ] Plugin appears in DAW plugin list
- [ ] Server starts and web UI accessible at http://127.0.0.1:5544
- [ ] MIDI output device selectable in server UI
- [ ] Playing notes in DAW triggers events in web app
- [ ] Sheet music displays chords from DAW

---

## 🆘 Still Having Issues?

1. Check **all** prerequisite versions match requirements
2. Run `.\SETUP_CHECK.bat` and fix any errors/warnings
3. Review `vst3-plugin\logs\` for build/setup error logs
4. Check server console output for Python errors
5. Verify firewall allows port 5544
6. Ensure no other process using port 5544

---

## 📝 Notes

- First time build may take 5-10 minutes
- Plugin size ~2-5MB depending on linked libraries
- Server uses ~50MB RAM
- HTTP latency typically <10ms on localhost
- Supports all DAWs with VST3 support (Bitwig, Reaper, Cubase, FL Studio, etc.)

---

**Good luck with your build! 🎶**
