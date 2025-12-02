# MusicTheory VST3 Plugin (Prototype)

This VST3 plugin acts as a bridge between a DAW (e.g., Bitwig, Cubase, Reaper) and the local Sheet Music MIDI Server (`tools/bitwig_midi_server.py`). It captures incoming MIDI notes for each bar (based on host tempo), groups simultaneous notes into chords, and sends them asynchronously to the server via HTTP.

## Goals
- Capture live MIDI chords and forward them to the browser app/server.
- Reflect host tempo when determining bar boundaries.
- Avoid blocking the audio thread (use a background queue/thread for networking).
- Provide a minimal GUI with:
  - Enable/disable sending toggle
  - Current tempo and bar number
  - Last chord sent
  - Manual "Send Now" button.

## Architecture
```
[Host] --> process(ProcessData)
   |--> Extract tempo from processContext (if valid)
   |--> Collect note-on events into current bar chord accumulator
   |--> When sample position crosses next bar boundary or 'Send Now':
           Push chord (vector<string>) onto thread-safe queue
           Reset accumulator
[Background Thread]
   |--> Pop chord tasks
   |--> HTTP POST to http://127.0.0.1:5544/midi/chord { notes: [...], velocity, duration_ms }
GUI (UIDesc) <- poll status (atomic snapshot)
```

## Requirements
- **Steinberg VST3 SDK**: Download and place adjacent or set `VST3_SDK_ROOT` environment variable.
  - https://github.com/steinbergmedia/vst3sdk
- **CMake 3.20+**
- **libcurl** (Windows: `vcpkg install curl` or prebuilt binaries)

## Building (Windows, example)
```powershell
# Set SDK root if not in default location
$env:VST3_SDK_ROOT="C:\dev\vst3sdk"

# Optionally integrate vcpkg toolchain
cmake -S . -B build -DVST3_SDK_ROOT="$env:VST3_SDK_ROOT" -DCMAKE_TOOLCHAIN_FILE="C:/path/to/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build build --config Release
```

Output VST3 bundle will be under `build/` (platform-specific). Copy it to your DAW's VST3 plugin directory (e.g. `C:\Program Files\Common Files\VST3`).

## libcurl Notes
If not using vcpkg, link curl manually:
- Download prebuilt Win64 curl library (with SSL off is fine for localhost).
- Set `CURL_ROOT` or adjust `find_package(CURL REQUIRED)` path hints.

## Usage
1. Start the MIDI server: `py tools/bitwig_midi_server.py`.
2. Load the VST3 plugin on a MIDI track.
3. Arm the track and play chords.
4. Chords are POSTed to `/midi/chord` using a default duration (whole note of the bar).
5. Browser app can display/consume chords as needed.

## Extending
- Add a progression endpoint: accumulate multiple bars then send `/midi/progression` payload.
- WebSocket sync for low-latency bi-directional updates.
- Add parameters to scale velocity or alter duration per bar.

## Disclaimer
Prototype code; not production hardened. Network failures are logged but do not crash the audio thread. Consider adding retry/backoff and UI error indicators.
