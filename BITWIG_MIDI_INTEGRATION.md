# Bitwig MIDI Integration Guide

> Note (Optional): This integration is optional. The core browser app works without Bitwig, the MIDI server, or the VST3 plugin.

This document explains how to stream the rendered sheet music progression into Bitwig Studio on Windows using the included FastAPI MIDI microservice and the `bitwig-midi.js` front‑end client.

## Overview

Components:
- `tools/bitwig_midi_server.py`: FastAPI app exposing MIDI endpoints (notes, chords, progression).
- `bitwig-midi.js`: Browser client exposing `window.BitwigMidi` helpers.
- `sheet-music-generator.js`: Adds a "Send → Bitwig" button and export helpers (`getBarMidiNotes()`, `sendProgressionToBitwig()`).

Workflow:
1. Run the Python server locally (default: `http://127.0.0.1:5544`).
2. Select or auto‑select a virtual MIDI output (loopMIDI port) that Bitwig listens to.
3. In the browser app, click "⇄ Send → Bitwig" to stream the current rendered bar progression as sustained whole‑note chords.

## Prerequisites

1. **Python 3.10+** installed (verify with `python --version`).
2. **loopMIDI** (or similar) installed to create a virtual MIDI port. Create a port named `MusicTheoryApp` (or any name you prefer).
3. **Bitwig Studio** set to receive MIDI from that virtual port (Settings → MIDI → Enable the port for input).

## Python Environment Setup (Windows PowerShell)

```powershell
# Navigate to project root
cd "$env:USERPROFILE\OneDrive - american.edu\music theory app\music theory v11"

# (Optional) Create & activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies (see requirements.txt)
pip install fastapi uvicorn mido python-rtmidi
```

If `python-rtmidi` fails to build wheels, install a prebuilt wheel or ensure you have Microsoft Build Tools installed. For many Windows setups it works directly with pip.

Create a `requirements.txt` (already recommended) containing:
```
fastapi
uvicorn
mido
python-rtmidi
```

## Running the MIDI Server

```powershell
# From project root (venv activated if used)
python tools/bitwig_midi_server.py
```

Server defaults:
- Host: 127.0.0.1
- Port: 5544

You should see logs indicating available MIDI outputs and selected output (auto‑select attempts `MusicTheoryApp`).

## Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/midi/outputs` | GET | List available MIDI outputs |
| `/midi/select_output` | POST | Select output by name `{ name }` |
| `/midi/stop` | POST | Send All Notes Off (CC123) |
| `/midi/note` | POST | Play single note `{ note, velocity, duration_ms }` |
| `/midi/chord` | POST | Play chord simultaneously `{ notes, velocity, duration_ms }` |
| `/midi/progression` | POST | Sequence chords with timing `{ chords:[{notes, duration_beats}], bpm }` |

## Front‑End Usage

`modular-music-theory.html` now includes:
```html
<script src="bitwig-midi.js"></script>
```

The sheet music controls expose a button:
- "⇄ Send → Bitwig" (disabled if `window.BitwigMidi` unavailable).

Programmatic usage example (browser console):
```javascript
// Ensure client loaded
BitwigMidi.configure({ serverUrl: 'http://127.0.0.1:5544' });

// List outputs
BitwigMidi.listOutputs().then(console.log);

// Select a specific output
BitwigMidi.selectOutput('MusicTheoryApp');

// Send current rendered progression directly (same as button)
window.sheetMusicGenerator.sendProgressionToBitwig({ bpm: 100, velocity: 90 });
```

## What Is Sent

The export builds one chord per rendered bar from `sheet-music-generator.js` voiced notes (`lastRenderedChords`). Each chord is transmitted as a whole note (default `duration_beats: 4`). Adjust by passing `duration_beats` in `sendProgressionToBitwig({ duration_beats: 2 })`.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Button disabled | `bitwig-midi.js` not loaded or server down | Check script tag & server status |
| No MIDI heard in Bitwig | Wrong port or track not armed | Verify port enabled; arm instrument track |
| Install failure for python-rtmidi | Missing build tools | Install Build Tools or use a prebuilt wheel |
| Progression incomplete | Sheet music not in per-bar mode | Ensure generated progression followed (`Follow generated progression` checked) |

## Optional: Auto Output Selection

On first send, the client attempts to auto‑select a MIDI output containing `MusicTheoryApp`. Override manually:
```javascript
BitwigMidi.selectOutput('YourPortName');
```

## Security Notes

- The server currently binds to localhost only; do not expose it publicly without adding auth.
- No rate limiting or validation beyond basic JSON checks.

## Next Ideas

- Add rhythmic patterns (arpeggiation) before sending progression.
- Map harmonization/melody mode into velocity accents.
- Bi-directional tempo sync (Bitwig → app) via WebSocket.

Happy composing!
