/**
 * PianoSampleEngine - High-quality sampled piano audio engine
 * Uses Salamander Grand Piano samples from the Web Audio API
 * Provides realistic piano sounds for music theory applications
 */
class PianoSampleEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.samples = new Map();
        this.loading = false;
        this.loaded = false;
        this.activeVoices = new Map(); // Track active oscillators/sources for note-off
        
        // Sample configuration - we'll sample every 3rd note for efficiency
        // and use pitch shifting for notes in between
        this.sampleNotes = [
            21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 
            51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 
            81, 84, 87, 90, 93, 96, 99, 102, 105, 108
        ];
        
        // Use a public CDN for Salamander Grand Piano samples
        // Alternative: Tonejs samples or generate our own
        this.sampleBaseUrl = 'https://tonejs.github.io/audio/salamander/';
    }

    async init() {
        if (this.ctx) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);
        
        // Load samples in background
        if (!this.loaded && !this.loading) {
            this.loadSamples();
        }
    }

    async loadSamples() {
        if (this.loading || this.loaded) return;
        this.loading = true;
        
        console.log('Loading piano samples...');
        
        try {
            // Try to load Salamander samples from Tone.js CDN
            const promises = this.sampleNotes.map(async midi => {
                try {
                    const note = this.midiToNoteName(midi);
                    const url = `${this.sampleBaseUrl}${note}.mp3`;
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.samples.set(midi, audioBuffer);
                    return true;
                } catch (error) {
                    console.warn(`Failed to load sample for MIDI ${midi}:`, error.message);
                    return false;
                }
            });
            
            const results = await Promise.allSettled(promises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            
            console.log(`Loaded ${successCount}/${this.sampleNotes.length} piano samples`);
            
            if (successCount > 0) {
                this.loaded = true;
            } else {
                console.warn('Failed to load piano samples, falling back to synthesized sound');
            }
        } catch (error) {
            console.error('Error loading piano samples:', error);
        } finally {
            this.loading = false;
        }
    }

    resume() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Find the closest sampled note for a given MIDI number
     */
    findClosestSample(midi) {
        let closest = this.sampleNotes[0];
        let minDist = Math.abs(midi - closest);
        
        for (const sampleMidi of this.sampleNotes) {
            const dist = Math.abs(midi - sampleMidi);
            if (dist < minDist) {
                minDist = dist;
                closest = sampleMidi;
            }
        }
        
        return closest;
    }

    /**
     * Play a note using sampled audio with pitch shifting
     */
    playNoteSampled(midi, duration = 0.5, time = 0, velocity = 1.0) {
        this.resume();
        
        const closestSample = this.findClosestSample(midi);
        const buffer = this.samples.get(closestSample);
        
        if (!buffer) {
            // Fallback to synthesized sound if sample not loaded
            this.playNoteSynthesized(midi, duration, time, velocity);
            return;
        }
        
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        
        source.buffer = buffer;
        
        // Calculate pitch shift ratio
        const semitoneShift = midi - closestSample;
        source.playbackRate.value = Math.pow(2, semitoneShift / 12);
        
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const now = this.ctx.currentTime + time;
        
        // Apply velocity
        const initialGain = velocity * 0.8;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(initialGain, now + 0.005);
        
        // Natural decay envelope
        const decayTime = Math.min(duration, 2.0);
        gainNode.gain.exponentialRampToValueAtTime(initialGain * 0.3, now + decayTime * 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
        
        source.start(now);
        source.stop(now + decayTime + 0.1);
        
        // Track active voice for note-off
        const voiceKey = `${midi}`;
        if (!this.activeVoices.has(voiceKey)) {
            this.activeVoices.set(voiceKey, []);
        }
        this.activeVoices.get(voiceKey).push({
            source,
            gainNode,
            startTime: now,
            midi
        });
        
        // Clean up after note ends
        source.onended = () => {
            const voices = this.activeVoices.get(voiceKey);
            if (voices) {
                const index = voices.findIndex(v => v.source === source);
                if (index > -1) {
                    voices.splice(index, 1);
                }
            }
        };
    }

    /**
     * Fallback synthesized piano-like sound
     * Better than simple oscillator - uses multiple partials
     */
    playNoteSynthesized(midi, duration = 0.5, time = 0, velocity = 1.0) {
        this.resume();
        
        const frequency = 440 * Math.pow(2, (midi - 69) / 12);
        const now = this.ctx.currentTime + time;
        
        // Create multiple oscillators for richer sound
        const partials = [
            { ratio: 1.0, gain: 1.0 },      // Fundamental
            { ratio: 2.0, gain: 0.4 },      // 2nd harmonic
            { ratio: 3.0, gain: 0.2 },      // 3rd harmonic
            { ratio: 4.0, gain: 0.15 },     // 4th harmonic
            { ratio: 5.0, gain: 0.1 }       // 5th harmonic
        ];
        
        const masterGain = this.ctx.createGain();
        masterGain.connect(this.masterGain);
        
        partials.forEach(({ ratio, gain: partialGain }) => {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = frequency * ratio;
            
            osc.connect(oscGain);
            oscGain.connect(masterGain);
            
            const gain = partialGain * velocity * 0.2;
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(gain, now + 0.005);
            oscGain.gain.exponentialRampToValueAtTime(gain * 0.3, now + duration * 0.3);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.1);
        });
        
        // Add attack transient (percussive click)
        const noise = this.ctx.createBufferSource();
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        noise.buffer = noiseBuffer;
        
        const noiseGain = this.ctx.createGain();
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noiseGain.gain.setValueAtTime(velocity * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        noise.start(now);
    }

    /**
     * Main play note method - uses samples if available, falls back to synthesis
     */
    playNote(midi, duration = 0.5, time = 0, velocity = 1.0) {
        if (this.loaded && this.samples.size > 0) {
            this.playNoteSampled(midi, duration, time, velocity);
        } else {
            this.playNoteSynthesized(midi, duration, time, velocity);
        }
    }

    /**
     * Play multiple notes (chord)
     */
    playChord(notes, duration = 1.0, velocity = 1.0) {
        this.resume();
        notes.forEach((note, index) => {
            let midi = note;
            if (typeof note === 'string') {
                midi = this.noteToMidi(note);
            }
            if (midi) {
                // Slight delay for each note to create natural arpeggio effect
                const delay = index * 0.01;
                this.playNote(midi, duration, delay, velocity);
            }
        });
    }

    /**
     * Play notes in sequence (arpeggio/melody)
     */
    playSequence(notes, noteDuration = 0.5, gap = 0.1, velocity = 1.0) {
        this.resume();
        let time = 0;
        notes.forEach(note => {
            let midi = note;
            if (typeof note === 'string') {
                midi = this.noteToMidi(note);
            }
            if (midi) {
                this.playNote(midi, noteDuration, time, velocity);
                time += noteDuration + gap;
            }
        });
    }

    /**
     * Convert MIDI number to note name for sample loading
     */
    midiToNoteName(midi) {
        const notes = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return notes[noteIndex] + octave;
    }

    /**
     * Convert note name to MIDI number
     */
    noteToMidi(noteName) {
        const NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Cs': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Ds': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Fs': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Gs': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'As': 10, 'Bb': 10, 'B': 11
        };
        
        const match = String(noteName).match(/^([A-G][#sb]?)(-?\d+)$/);
        if (!match) return null;
        
        const semitone = NOTE_TO_SEMITONE[match[1]];
        const octave = parseInt(match[2]);
        return (octave + 1) * 12 + semitone;
    }

    /**
     * Stop a note immediately (for MIDI note-off)
     */
    stopNote(midi) {
        const voiceKey = `${midi}`;
        const voices = this.activeVoices.get(voiceKey);
        
        if (!voices || voices.length === 0) return;
        
        // Stop the most recent voice for this MIDI note
        const voice = voices[voices.length - 1];
        const releaseTime = 0.3; // 300ms release
        
        const now = this.ctx.currentTime;
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
        
        voice.source.stop(now + releaseTime);
        voices.pop();
    }

    /**
     * Stop all active notes
     */
    stopAllNotes() {
        this.activeVoices.forEach((voices) => {
            voices.forEach((voice) => {
                try {
                    voice.source.stop();
                } catch (e) {
                    // Already stopped
                }
            });
        });
        this.activeVoices.clear();
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Get loading status
     */
    isReady() {
        return this.loaded;
    }

    /**
     * Get loading progress (0 to 1)
     */
    getLoadProgress() {
        if (this.loaded) return 1.0;
        if (!this.loading) return 0.0;
        return this.samples.size / this.sampleNotes.length;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PianoSampleEngine;
}
