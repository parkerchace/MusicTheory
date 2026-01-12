/**
 * SimpleAudioEngine - Basic Web Audio API engine for playing notes and chords
 */
class SimpleAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playNote(midi, duration = 0.5, time = 0) {
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        const now = this.ctx.currentTime + time;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.start(now);
        osc.stop(now + duration + 0.1);
    }

    playChord(notes, duration = 1.0) {
        this.resume();
        notes.forEach(note => {
            let midi = note;
            if (typeof note === 'string') {
                midi = this.noteToMidi(note);
            }
            if (midi) this.playNote(midi, duration);
        });
    }

    noteToMidi(noteName) {
        const NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
        const match = String(noteName).match(/^([A-G][#b]?)(-?\d+)$/);
        if (!match) return null;
        const semitone = NOTE_TO_SEMITONE[match[1]];
        const octave = parseInt(match[2]);
        return (octave + 1) * 12 + semitone;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleAudioEngine;
}
