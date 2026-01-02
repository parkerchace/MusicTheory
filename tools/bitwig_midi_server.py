import threading
import time
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mido
import signal
import atexit
import sys
import ctypes

try:
    import rtmidi  # noqa: F401  # ensure backend is available
except Exception as e:
    # Not fatal here; mido will raise if backend missing when opening ports
    pass

app = FastAPI(title="Music Theory → Bitwig MIDI Server", version="0.1.0")

# Enable CORS for browser requests from localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


class SelectOutputReq(BaseModel):
    name: str


class NoteReq(BaseModel):
    note: str
    velocity: int = 96
    duration_ms: int = 500
    channel: int = 0


class ChordReq(BaseModel):
    notes: List[str]
    velocity: int = 96
    duration_ms: int = 800
    channel: int = 0


class ProgChord(BaseModel):
    notes: List[str]
    duration_beats: float = 1.0


class ProgressionReq(BaseModel):
    chords: List[ProgChord]
    bpm: int = 96
    velocity: int = 90
    channel: int = 0


# --- MIDI Manager ---
class MidiOutManager:
    def __init__(self):
        self.lock = threading.RLock()
        self._out: Optional[mido.ports.BaseOutput] = None
        self._out_name: Optional[str] = None

    def list_outputs(self) -> List[str]:
        # Ensure we use rtmidi backend
        return mido.get_output_names()

    def connect(self, name: str):
        with self.lock:
            if self._out:
                try:
                    self._out.close()
                except Exception:
                    pass
                self._out = None
                self._out_name = None
            try:
                self._out = mido.open_output(name)
                self._out_name = name
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to open MIDI output '{name}': {e}")

    def connect_default(self):
        # On Windows, create a virtual device via loopMIDI named 'MusicTheoryApp' and select it.
        preferred = os.getenv('MT_MIDI_OUT', 'MusicTheoryApp')
        names = self.list_outputs()
        # Prefer exact preferred name, else first available
        target = preferred if preferred in names else (names[0] if names else None)
        if not target:
            raise HTTPException(status_code=404, detail="No MIDI outputs found. Create a loopMIDI port (e.g., 'MusicTheoryApp') and try again.")
        self.connect(target)

    def current_output(self) -> Optional[str]:
        with self.lock:
            return self._out_name

    def ensure(self):
        with self.lock:
            if not self._out:
                self.connect_default()

    def play_note(self, note: int, velocity: int, duration_ms: int, channel: int = 0):
        def _worker():
            with self.lock:
                if not self._out:
                    return
                self._out.send(mido.Message('note_on', note=note, velocity=velocity, channel=channel))
            time.sleep(max(0, duration_ms) / 1000.0)
            with self.lock:
                if self._out:
                    self._out.send(mido.Message('note_off', note=note, velocity=0, channel=channel))
        threading.Thread(target=_worker, daemon=True).start()

    def chord(self, notes: List[int], velocity: int, duration_ms: int, channel: int = 0):
        def _worker():
            with self.lock:
                if not self._out:
                    return
                for n in notes:
                    self._out.send(mido.Message('note_on', note=n, velocity=velocity, channel=channel))
            time.sleep(max(0, duration_ms) / 1000.0)
            with self.lock:
                if self._out:
                    for n in notes:
                        self._out.send(mido.Message('note_off', note=n, velocity=0, channel=channel))
        threading.Thread(target=_worker, daemon=True).start()

    def stop_all(self, channel: Optional[int] = None):
        with self.lock:
            if not self._out:
                return
            if channel is None:
                # All channels: send All Notes Off (CC 123)
                for ch in range(16):
                    self._out.send(mido.Message('control_change', control=123, value=0, channel=ch))
            else:
                self._out.send(mido.Message('control_change', control=123, value=0, channel=channel))

    def close(self):
        with self.lock:
            if self._out:
                try:
                    self._out.close()
                except Exception:
                    pass
            self._out = None
            self._out_name = None


midi = MidiOutManager()

# --- Utilities ---
NOTE_BASE = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0
}


def note_to_midi(name: str) -> int:
    name = name.strip()
    # Extract letter+accidental and optional octave
    # Examples: C4, F#3, Eb5
    pitch = ''.join([c for c in name if c.isalpha() or c in ['#', 'b']])
    octv_str = ''.join([c for c in name if c.isdigit() or c == '-'])
    octave = int(octv_str) if octv_str not in ('', '-') else 4
    if pitch not in NOTE_BASE:
        raise ValueError(f"Unknown pitch name: {name}")
    semitone = NOTE_BASE[pitch]
    return (octave + 1) * 12 + semitone


# Simple close-position voicing: keep ascending within an octave band
# Uses a base octave per clef-like range (treble default around octave 4)

def voice_close(pitches: List[str], base_octave: int = 4) -> List[str]:
    out: List[str] = []
    prev_midi: Optional[int] = None
    for p in pitches:
        # strip existing octave if provided
        head = ''.join([c for c in p if c.isalpha() or c in ['#', 'b']])
        octv = base_octave
        midi = note_to_midi(f"{head}{octv}")
        while prev_midi is not None and midi <= prev_midi:
            octv += 1
            midi = note_to_midi(f"{head}{octv}")
        out.append(f"{head}{octv}")
        prev_midi = midi
    return out


# --- API ---
@app.get('/midi/outputs')
def list_outputs():
    return {"outputs": midi.list_outputs(), "selected": midi.current_output()}


@app.post('/midi/select_output')
def select_output(req: SelectOutputReq):
    try:
        print(f"Attempting to select MIDI output: {req.name}")
        midi.connect(req.name)
        print(f"Selected MIDI output: {req.name}")
        return {"selected": req.name, "available": midi.list_outputs()}
    except Exception as e:
        print(f"Failed to select MIDI output '{req.name}': {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/midi/stop')
def stop_all():
    midi.ensure()
    midi.stop_all()
    return {"stopped": True}


@app.post('/midi/note')
def play_note(req: NoteReq):
    midi.ensure()
    n = note_to_midi(req.note)
    midi.play_note(n, req.velocity, req.duration_ms, channel=req.channel)
    return {"status": "ok"}


@app.post('/midi/chord')
def play_chord(req: ChordReq):
    midi.ensure()
    notes = [note_to_midi(n) for n in voice_close(req.notes, base_octave=4)]
    midi.chord(notes, req.velocity, req.duration_ms, channel=req.channel)
    return {"status": "ok"}


@app.post('/midi/progression')
def play_progression(req: ProgressionReq):
    midi.ensure()
    if not req.chords:
        return {"status": "empty"}

    beat_ms = 60000.0 / max(1, req.bpm)

    def _worker():
        for ch in req.chords:
            try:
                voiced = voice_close(ch.notes, base_octave=4)
                note_nums = [note_to_midi(n) for n in voiced]
                dur_ms = int(max(1, ch.duration_beats) * beat_ms)
                midi.chord(note_nums, req.velocity, dur_ms, channel=req.channel)
                time.sleep(dur_ms / 1000.0)
            except Exception:
                # Continue to next chord if one fails
                pass

    threading.Thread(target=_worker, daemon=True).start()
    return {"status": "playing", "bpm": req.bpm, "count": len(req.chords)}


@app.get('/status')
def status():
        return {"service": "Music Theory → Bitwig MIDI", "outputs": midi.list_outputs(), "selected": midi.current_output()}

# Embedded minimal HTML UI for selecting MIDI output directly on the server
@app.get('/', response_class=HTMLResponse)
def root():
        outputs = midi.list_outputs()
        selected = midi.current_output() or 'None'
        options_html = ''.join([
            f"<option value='{o}' {'selected' if o == selected else ''}>{o}</option>" for o in outputs
        ])
        # Use plain triple-quoted string (no f-string) and replace placeholders to avoid
        # accidental interpretation of JS/CSS braces by Python's f-string parser.
        html = """
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='utf-8'/>
            <title>MIDI Server</title>
            <style>
                body{font-family:system-ui,Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:24px;}
                h1{margin-top:0;font-size:1.4rem;}
                select,button{font-size:14px;padding:6px 10px;margin:4px 4px 4px 0;border-radius:4px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;cursor:pointer;}
                button:hover,select:focus{outline:1px solid #3b82f6;}
                .status{margin:8px 0;padding:6px 10px;background:#1e293b;border:1px solid #334155;border-radius:4px;display:inline-block;}
                footer{margin-top:32px;font-size:12px;color:#94a3b8;}
                a{color:#3b82f6;text-decoration:none;}
            </style>
        </head>
        <body>
            <h1>Music Theory → Bitwig MIDI Server</h1>
            <div class='status'>Current Output: <strong>__SELECTED__</strong></div>
            <div>
                <label for='outSel'>Select Output:</label>
                <select id='outSel'>__OPTIONS__</select>
                <button id='applyBtn'>Select</button>
                <button id='refreshBtn'>Refresh</button>
                <button id='stopAllBtn' title='Send All Notes Off to all channels'>All Notes Off</button>
            </div>
            <p style='font-size:13px;max-width:620px;line-height:1.4;'>Create a loopMIDI virtual port (e.g. <code>MusicTheoryApp</code>) then select it here. The web app will send chords without needing its own selector.</p>
            <script>
                async function select(name){
                    const res = await fetch('/midi/select_output', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
                    if(res.ok){ location.reload(); } else { alert('Select failed: '+(await res.text())); }
                }
                document.getElementById('applyBtn').onclick = () => {
                    const v = document.getElementById('outSel').value; if(v) select(v);
                };
                document.getElementById('refreshBtn').onclick = () => { location.reload(); };
                document.getElementById('stopAllBtn').onclick = async () => {
                    try { await fetch('/midi/stop', { method: 'POST' }); alert('All Notes Off sent'); } catch(e){ alert('Failed: '+e); }
                };
            </script>
            <footer>FastAPI MIDI Bridge · <a href='/status'>JSON Status</a></footer>
        </body>
        </html>
        """
        html = html.replace('__SELECTED__', selected).replace('__OPTIONS__', options_html)
        return HTMLResponse(content=html)


# Run with: uvicorn tools.bitwig_midi_server:app --reload --port 5544
# Or directly: python tools/bitwig_midi_server.py

if __name__ == "__main__":
    import uvicorn
    print("\n🎹 Starting Music Theory → Bitwig MIDI Server")
    print("📡 Server: http://127.0.0.1:5544")
    print("🎵 Available MIDI outputs:", midi.list_outputs())
    try:
        midi.connect_default()
        print(f"✅ Selected output: {midi._out_name}")
    except Exception as e:
        print(f"⚠️  No output selected yet: {e}")
        print("   Will auto-select on first request")
    print("\nPress Ctrl+C or close window (X) to stop\n")

    # ---- Graceful shutdown handlers ----
    def _cleanup():
        try:
            print("\n🛑 Shutting down: sending All Notes Off & releasing MIDI port...")
            midi.stop_all()
        except Exception:
            pass
        try:
            midi.close()
        except Exception:
            pass
        print("✅ Cleanup complete.")

    atexit.register(_cleanup)

    def _sig_handler(signum, frame):
        _cleanup()
        sys.exit(0)

    for _s in (getattr(signal, 'SIGINT', None), getattr(signal, 'SIGTERM', None)):
        if _s is not None:
            try: signal.signal(_s, _sig_handler)
            except Exception: pass
    if hasattr(signal, 'SIGBREAK'):
        try: signal.signal(signal.SIGBREAK, _sig_handler)
        except Exception: pass

    # Console close handler (CTRL_CLOSE_EVENT)
    try:
        HandlerRoutine = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_ulong)
        def console_ctrl_handler(ctrl_type):
            if ctrl_type in (2, 5, 6):  # close / logoff / shutdown
                _cleanup()
            return False  # continue default close
        ctypes.windll.kernel32.SetConsoleCtrlHandler(HandlerRoutine(console_ctrl_handler), True)
    except Exception:
        pass

    uvicorn.run(app, host="127.0.0.1", port=5544, log_level="info")
