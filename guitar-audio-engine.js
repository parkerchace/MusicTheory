// guitar-audio-engine.js
// Lightweight WebAudio 'guitar-like' pluck engine.
// Exposes: playNote(midi, {velocity, duration})

(function(){
    class GuitarAudioEngine {
        constructor(ctx) {
            this.ctx = ctx || (typeof window !== 'undefined' && window.AudioContext ? new AudioContext() : null);
            this.master = null;
            this.active = new Map();
            if (!this.ctx) return;
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.9;
            this.master.connect(this.ctx.destination);
        }

        _midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

        // Simple pluck: filtered noise burst + detuned dual-oscillator body with envelope
        playNote(midi, opts={}){
            if (!this.ctx) return;
            const o = Object.assign({velocity: 0.9, duration: 1.2}, opts || {});
            const t0 = this.ctx.currentTime;
            const freq = this._midiToFreq(midi);

            // transient: short filtered noise for attack
            const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.exp(-i/(data.length*0.6));
            const nb = this.ctx.createBufferSource(); nb.buffer = noiseBuf;
            const noiseFilt = this.ctx.createBiquadFilter(); noiseFilt.type = 'highpass'; noiseFilt.frequency.value = 200;
            const noiseGain = this.ctx.createGain(); noiseGain.gain.value = 0.6 * o.velocity;
            nb.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(this.master);
            nb.start(t0);
            nb.stop(t0 + 0.06);

            // body - two detuned oscillators
            const osc1 = this.ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = freq;
            const osc2 = this.ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = freq * 1.0008; // slight detune

            const bodyFilter = this.ctx.createBiquadFilter(); bodyFilter.type = 'lowpass'; bodyFilter.frequency.value = 4200; bodyFilter.Q.value = 0.8;
            const bodyGain = this.ctx.createGain();
            // plucked envelope
            const g = bodyGain.gain;
            g.setValueAtTime(0.0001, t0);
            g.cancelScheduledValues(t0);
            g.setValueAtTime(0.0001, t0);
            g.linearRampToValueAtTime(0.9 * o.velocity, t0 + 0.01);
            g.exponentialRampToValueAtTime(0.001, t0 + o.duration);

            osc1.connect(bodyFilter); osc2.connect(bodyFilter); bodyFilter.connect(bodyGain); bodyGain.connect(this.master);

            osc1.start(t0); osc2.start(t0);
            osc1.stop(t0 + o.duration + 0.2); osc2.stop(t0 + o.duration + 0.2);

            // keep reference in active map for optional stop
            const id = Symbol('note');
            this.active.set(id, {osc1, osc2, bodyGain, nb});
            // cleanup
            setTimeout(()=>{ try { this.active.delete(id); } catch(e){} }, (o.duration+0.5)*1000);
            return id;
        }

        stopNote(id){
            const entry = this.active.get(id);
            if (!entry) return;
            try{
                if (entry.osc1) entry.osc1.stop();
                if (entry.osc2) entry.osc2.stop();
                if (entry.nb) entry.nb.stop();
            }catch(e){}
            this.active.delete(id);
        }

        setMasterGain(v){ if (this.master) this.master.gain.value = v; }
    }

    // Auto-install onto global modularApp if present
    try{
        if (typeof window !== 'undefined'){
            if (!window.modularApp) window.modularApp = {};
            if (!window.modularApp.guitarEngine) window.modularApp.guitarEngine = new GuitarAudioEngine(window.audioContext || null);
        }
    }catch(e){ /* ignore on non-browser env */ }

    // Expose class for manual instantiation
    if (typeof window !== 'undefined') window.GuitarAudioEngine = GuitarAudioEngine;
    if (typeof module !== 'undefined' && module.exports) module.exports = GuitarAudioEngine;
})();
