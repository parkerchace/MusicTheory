# Changelog

All notable changes to this project will be documented in this file.

## 2025-12-02

- Merge: Integrated local import with `origin/master` while preserving local files (safety tags: `local-import-20251202`, `merge-preserve-local-20251202`).
- Documentation:
  - Fixed hardcoded Windows user paths; now use `%USERPROFILE%` / `$env:USERPROFILE`.
  - Added Docs Index to `README.md` and clarified ES module usage.
  - Updated `BUILD_AND_RUN.md`, `BITWIG_MIDI_INTEGRATION.md`, `FINAL_STATUS.md`, `READ_ME_FIRST.txt`, `vst3-plugin/QUICKSTART.md`.
  - Expanded `TESTING_GUIDE.md` with browser/Node automated test instructions.
  - Added automated citation validation instructions to `SCALE_VERIFICATION.md`.
  - Updated `FILE_INDEX.md` last updated date.
- CI: Retained `update-readme` workflow to auto-refresh module table via `tools/update_readme.js`.

Notes:
- DAW/VST integration is optional and can be ignored if not in scope.
- Core browser modules and integration tests are ready to run without the MIDI server.
