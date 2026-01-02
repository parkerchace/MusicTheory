Build Status Notes
===================

> Note (Optional): This build status pertains to the optional VST3 plugin. The core browser app can be used without building the plugin or running a MIDI server.

Current Source Files Added:
- src/network/HttpClient.h / HttpClient.cpp (async libcurl POST queue)
- src/plugin/MusicTheoryPlugin.h / .cpp (MIDI accumulation, bar-flush, duration estimation)
- src/entry.cpp (factory registration)

Pending / Enhancements:
- Better bar boundary logic (use kBarPositionValid when available for precision).
- Time signature / tempo fallbacks if host context missing.
- Optional GUI editor class (status + enable toggle + last chord display).
- Error surface: expose lastError_ and lastStatus_ via parameter or GUI.
- Progression batching endpoint (/midi/progression) integration from plugin.

Build Instructions Recap:
1. Ensure Steinberg VST3 SDK cloned: ../VST3_SDK next to vst3-plugin folder.
2. Install libcurl dev (Windows: vcpkg install curl:x64-windows or use prebuilt).
3. Generate build: cmake -S . -B build -G "Visual Studio 17 2022" -A x64
4. Build: cmake --build build --config Release
5. Copy resulting .vst3 bundle from build/bin to your DAW's VST3 folder.

Testing Flow:
- Start FastAPI MIDI server on 127.0.0.1:5544
- Load plugin in DAW instrument slot.
- Play or route MIDI into plugin track; at each bar boundary current chord pushed to server /midi/chord.
- Monitor server logs for POSTs.

Next Steps Suggested:
1. Add silence-based flush (if no notes for N ms mid-bar).
2. Provide GUI minimal editor (UIDesc XML or custom view).
3. Expose HTTP status/errors to host parameters.
4. Optionally batch progression arrays (/midi/progression) instead of per-bar chord.
5. Consider WebSocket/keep-alive for lower latency.
Build Status Notes\n===================\n\nCurrent Source Files Added:\n- src/network/HttpClient.h (previous)\n- src/network/HttpClient.cpp (libcurl async worker)\n- src/plugin/MusicTheoryPlugin.h / .cpp (basic MIDI accumulation + bar flush)\n- src/entry.cpp (factory registration)\n\nPending / Enhancements:\n- Better bar boundary logic using samples from processContext if available.\n- More accurate chord duration (track note-on timestamps).\n- Time signature / tempo fallbacks if host context missing.\n- Optional GUI editor class (parameter view + last sent chord display).\n- Error surface: expose lastError_ string via parameter or GUI.\n\nBuild Instructions Recap:\n1. Ensure Steinberg VST3 SDK cloned: ../VST3_SDK next to vst3-plugin folder.\n2. Install libcurl dev (Windows: vcpkg install curl:x64-windows or use prebuilt).\n3. Generate build: cmake -S . -B build -G "Visual Studio 17 2022" -A x64\n4. Build: cmake --build build --config Release\n5. Copy resulting .vst3 bundle from build/bin to your DAW's VST3 folder.\n\nTesting Flow:\n- Start FastAPI MIDI server on 127.0.0.1:5544\n- Load plugin in DAW instrument slot.\n- Play or route MIDI into plugin track; at each bar boundary current chord pushed to server /midi/chord.\n- Monitor server logs for POSTs.\n\nNext Steps Suggested:\n1. Implement chord timing (collect note-on timestamps).\n2. Add flush on silence (no active notes for N ms).\n3. Provide GUI minimal editor.\n4. Add endpoint batching (send progression arrays).\n