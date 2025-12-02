# Music Theory VST3 Plugin - QUICK START

## 🚀 Fast Track (Under 10 Minutes)

### Step 1: Get VST3 SDK (2 min)
1. Download: https://github.com/steinbergmedia/vst3sdk
2. Extract to: `C:\Users\spark\OneDrive - american.edu\music theory app\VST3_SDK`

### Step 2: Install vcpkg for curl (3 min)
```powershell
cd C:\
git clone https://github.com/microsoft/vcpkg
cd vcpkg
.\bootstrap-vcpkg.bat
.\vcpkg integrate install
.\vcpkg install curl:x64-windows
```

### Step 3: Build Plugin (2 min)
Double-click: `vst3-plugin\QUICK_BUILD.bat`

### Step 4: Install Python Requirements (1 min)
```powershell
py -m pip install fastapi uvicorn mido python-rtmidi
```

### Step 5: Start Server (30 sec)
```powershell
py tools/bitwig_midi_server.py
```

### Step 6: Copy Plugin to VST3 Folder
Copy `vst3-plugin\build\Release\MusicTheoryVST3.vst3` to:
`C:\Program Files\Common Files\VST3\`

## ✅ Done!
Load "MusicTheory Bridge" in your DAW and play MIDI notes!

---

## Troubleshooting Quick Fixes

**Build fails?**
- Ensure Visual Studio 2022 installed with C++ workload
- Check VST3_SDK folder exists at correct location

**Server won't start?**
- Install Python 3.9+: https://www.python.org/downloads/
- Run: `py -m pip install --upgrade pip`

**Plugin not sending MIDI?**
- Start server BEFORE loading plugin
- Open http://127.0.0.1:5544 and select MIDI output

---

See full README.md for detailed documentation.
