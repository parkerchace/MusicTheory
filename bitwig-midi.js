(function(){
  const DEFAULT_URL = 'http://127.0.0.1:5544';

  function jsonFetch(url, options) {
    return fetch(url, Object.assign({
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    }, options)).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  const BitwigMidi = {
    _server: DEFAULT_URL,

    configure(opts) {
      if (opts && opts.serverUrl) this._server = opts.serverUrl.replace(/\/$/, '');
    },

    async listOutputs() {
      return jsonFetch(this._server + '/midi/outputs', { method: 'GET' });
    },

    async selectOutput(name) {
      return jsonFetch(this._server + '/midi/select_output', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
    },

    async stopAll() {
      return jsonFetch(this._server + '/midi/stop', { method: 'POST' });
    },

    async playNote(note, velocity = 96, durationMs = 500, channel = 0) {
      return jsonFetch(this._server + '/midi/note', {
        method: 'POST',
        body: JSON.stringify({ note, velocity, duration_ms: durationMs, channel })
      });
    },

    async playChord(notes, velocity = 96, durationMs = 800, channel = 0) {
      return jsonFetch(this._server + '/midi/chord', {
        method: 'POST',
        body: JSON.stringify({ notes, velocity, duration_ms: durationMs, channel })
      });
    },

    async playProgression(chordSeq, bpm = 96, velocity = 90, channel = 0) {
      const chords = chordSeq.map(ch => ({ notes: ch.notes || ch, duration_beats: ch.duration_beats || 1 }));
      return jsonFetch(this._server + '/midi/progression', {
        method: 'POST',
        body: JSON.stringify({ chords, bpm, velocity, channel })
      });
    }
  };

  window.BitwigMidi = BitwigMidi;
})();
