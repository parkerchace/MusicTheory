/**
 * EnhancedAudioEngine - Web Audio API with reverb, sustain, and higher fidelity
 * Features:
 * - Adjustable sustain envelope (for progressions and voice leading examples)
 * - Optional reverb convolver effect
 * - Master volume control
 * - Multiple oscillator types for richer tone
 */
class EnhancedAudioEngine {
    constructor(options = {}) {
        this.ctx = null;
        this.masterGain = null;
        this.dryGain = null;
        this.wetGain = null;
        this.convolver = null;
        
        // Configuration
        this.config = {
            masterVolume: options.masterVolume || 0.3,
            oscillatorType: options.oscillatorType || 'sine', // 'sine', 'triangle', 'sawtooth'
            useReverb: options.useReverb !== false, // Enable reverb by default
            reverbAmount: options.reverbAmount || 0.15, // 0-0.5
            attackTime: options.attackTime || 0.02, // seconds
            releaseTime: options.releaseTime || 0.3, // seconds (default, can be overridden per note)
            sustainTime: options.sustainTime || 1.0, // seconds (added between attack and release)
            // For progressions (voice leading examples)
            progressionAttackTime: options.progressionAttackTime || 0.05,
            progressionSustainTime: options.progressionSustainTime || 1.2,
            progressionReleaseTime: options.progressionReleaseTime || 0.4
        };
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.config.masterVolume;
        
        // Dry and wet signals for reverb
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 1.0 - this.config.reverbAmount;
        
        this.wetGain = this.ctx.createGain();
        this.wetGain.gain.value = this.config.reverbAmount;
        
        // Connect dry signal
        this.dryGain.connect(this.masterGain);
        
        // Setup reverb if enabled
        if (this.config.useReverb) {
            this.setupReverb();
        } else {
            this.wetGain.connect(this.masterGain);
        }
        
        this.masterGain.connect(this.ctx.destination);
    }

    setupReverb() {
        // Create a simple reverb using impulse response
        // For better quality, this could load actual convolver impulses
        // For now, we'll create a basic synthetic reverb effect
        try {
            this.convolver = this.ctx.createConvolver();
            
            // Create a simple impulse response (1 second of decaying white noise)
            const impulseLength = this.ctx.sampleRate;
            const impulse = this.ctx.createBuffer(2, impulseLength, this.ctx.sampleRate);
            const impulseLeft = impulse.getChannelData(0);
            const impulseRight = impulse.getChannelData(1);
            
            for (let i = 0; i < impulseLength; i++) {
                impulseLeft[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
                impulseRight[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
            }
            
            this.convolver.buffer = impulse;
            this.wetGain.connect(this.convolver);
            this.convolver.connect(this.masterGain);
        } catch (e) {
            console.warn('Reverb setup failed, using dry signal only:', e);
            this.wetGain.connect(this.masterGain);
        }
    }

    resume() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Play a single note with rich envelope
     * @param {number} midi - MIDI note number
     * @param {Object} options - { duration, sustainTime, attackTime, releaseTime, isDry, time }
     */
    playNote(midi, options = {}) {
        this.resume();
        
        // Extract options or use defaults
        const {
            duration = this.config.releaseTime,
            sustainTime = this.config.sustainTime,
            attackTime = this.config.attackTime,
            releaseTime = this.config.releaseTime,
            isDry = false,
            time = 0,
            type = this.config.oscillatorType
        } = typeof options === 'number' ? { duration: options } : options;
        
        // Create oscillator and gain
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
        
        // Route through either dry or wet path
        osc.connect(gain);
        if (isDry) {
            gain.connect(this.dryGain);
        } else {
            // Split signal: dry + wet (with reverb)
            gain.connect(this.dryGain);
            gain.connect(this.wetGain);
        }
        
        // Envelope: Attack -> Sustain -> Release
        const now = this.ctx.currentTime + time;
        const attackEnd = now + attackTime;
        const sustainEnd = attackEnd + sustainTime;
        const releaseEnd = sustainEnd + releaseTime;
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, attackEnd);
        gain.gain.setValueAtTime(1, sustainEnd);
        gain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);
        
        osc.start(now);
        osc.stop(releaseEnd + 0.05);
        
        return { osc, gain, releaseEnd };
    }

    /**
     * Play a chord with rich envelope
     * @param {number[]} notes - Array of MIDI note numbers
     * @param {Object} options - { duration, sustainTime, ... }
     */
    playChord(notes, options = {}) {
        this.resume();
        
        const optionsObj = typeof options === 'number' ? { duration: options } : options;
        
        notes.forEach(note => {
            let midi = note;
            if (typeof note === 'string') {
                midi = this.noteToMidi(note);
            }
            if (midi) this.playNote(midi, optionsObj);
        });
    }

    /**
     * Play a sequence of chords with timing
     * Useful for voice leading and progression examples
     * @param {Array} progression - [{ notes: [60, 64, 67], duration: 1.0 }, ...]
     * @param {Object} options - { sustainTime, ... }
     */
    playProgression(progression, options = {}) {
        this.resume();
        
        // Use progression timing settings by default
        const optionsObj = {
            attackTime: this.config.progressionAttackTime,
            sustainTime: this.config.progressionSustainTime,
            releaseTime: this.config.progressionReleaseTime,
            ...options
        };
        
        let currentTime = 0;
        progression.forEach((chord, idx) => {
            const notes = Array.isArray(chord.notes) ? chord.notes : [chord.notes];
            const duration = chord.duration || 1.0;
            
            notes.forEach(midi => {
                this.playNote(midi, { ...optionsObj, time: currentTime, duration });
            });
            
            currentTime += duration;
        });
    }

    /**
     * Play an arpeggio (notes in sequence, not simultaneously)
     */
    playArpeggio(notes, options = {}) {
        this.resume();
        
        const {
            noteDuration = 0.3,
            delay = 0.15,
            sustainTime = this.config.sustainTime,
            attackTime = this.config.attackTime,
            releaseTime = this.config.releaseTime
        } = typeof options === 'number' ? { noteDuration: options } : options;
        
        notes.forEach((note, idx) => {
            let midi = note;
            if (typeof note === 'string') {
                midi = this.noteToMidi(note);
            }
            if (midi) {
                const time = idx * delay;
                this.playNote(midi, {
                    duration: noteDuration,
                    sustainTime,
                    attackTime,
                    releaseTime,
                    time
                });
            }
        });
    }

    /**
     * Stop all sounds immediately (panic button)
     */
    stopAll() {
        if (this.ctx) {
            this.ctx.createGain().gain.setValueAtTime(0, this.ctx.currentTime);
        }
    }

    /**
     * Update reverb amount (wet signal balance)
     */
    setReverbAmount(amount) {
        if (!this.dryGain || !this.wetGain) return;
        const wet = Math.max(0, Math.min(1, amount));
        const dry = 1 - wet;
        this.dryGain.gain.value = dry;
        this.wetGain.gain.value = wet;
        this.config.reverbAmount = wet;
    }

    /**
     * Update sustain time for current notes
     */
    setSustainTime(time) {
        this.config.sustainTime = time;
    }

    /**
     * Update progression sustain time (for voice leading examples)
     */
    setProgressionSustainTime(time) {
        this.config.progressionSustainTime = time;
    }

    /**
     * Update master volume
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
            this.config.masterVolume = volume;
        }
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
    module.exports = EnhancedAudioEngine;
}
