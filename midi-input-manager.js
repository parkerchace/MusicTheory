/**
 * MIDIInputManager - Web MIDI API integration
 * Requests MIDI permissions and routes note events to audio engine
 */
class MIDIInputManager {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.midiAccess = null;
        this.inputs = new Map();
        this.activeNotes = new Map(); // Track active notes for note-off handling
        this.enabled = false;
        this.statusCallback = null;
        this.listeners = new Map();
    }

    /**
     * Request MIDI access and initialize
     */
    async init() {
        try {
            if (!navigator.requestMIDIAccess) {
                console.warn('Web MIDI API not supported in this browser');
                this.onStatusChange('error', 'Web MIDI API not supported');
                return false;
            }

            this.midiAccess = await navigator.requestMIDIAccess();
            
            // Handle existing inputs
            this.midiAccess.inputs.forEach((input) => {
                this.attachInput(input);
            });

            // Handle new inputs being connected
            this.midiAccess.addEventListener('statechange', (e) => {
                if (e.port.type === 'input') {
                    if (e.port.state === 'connected') {
                        console.log('MIDI device connected:', e.port.name);
                        this.attachInput(e.port);
                        this.onStatusChange('connected', `Connected: ${e.port.name}`);
                    } else if (e.port.state === 'disconnected') {
                        console.log('MIDI device disconnected:', e.port.name);
                        this.detachInput(e.port.id);
                        this.onStatusChange('disconnected', `Disconnected: ${e.port.name}`);
                    }
                }
            });

            this.enabled = true;
            const inputCount = this.midiAccess.inputs.size;
            
            if (inputCount > 0) {
                this.onStatusChange('ready', `${inputCount} MIDI device(s) ready`);
                console.log(`Initialized ${inputCount} MIDI input(s)`);
            } else {
                this.onStatusChange('waiting', 'Waiting for MIDI device...');
                console.log('No MIDI inputs detected, waiting for connection...');
            }

            return true;
        } catch (error) {
            console.error('MIDI initialization error:', error);
            this.onStatusChange('error', `MIDI Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Attach event listeners to a MIDI input
     */
    attachInput(input) {
        const self = this;
        input.addEventListener('midimessage', (e) => {
            self.handleMidiMessage(e.data, input.id);
        });
        this.inputs.set(input.id, input);
    }

    /**
     * Detach a MIDI input
     */
    detachInput(inputId) {
        this.inputs.delete(inputId);
        
        // Stop any active notes from this input
        const notesToStop = [];
        for (const [key, value] of this.activeNotes.entries()) {
            if (value.inputId === inputId) {
                notesToStop.push(key);
            }
        }
        notesToStop.forEach(key => this.activeNotes.delete(key));
    }

    /**
     * Handle incoming MIDI messages
     * Standard MIDI format: [command, note, velocity]
     */
    handleMidiMessage(data, inputId) {
        if (data.length < 2) return;

        const command = data[0] >> 4;
        const channel = data[0] & 0xf;
        const note = data[1];
        const velocity = data.length > 2 ? data[2] : 100;

        // Note on (command 9)
        if (command === 9 && velocity > 0) {
            this.noteOn(note, velocity, inputId);
        }
        // Note off (command 8) or Note on with velocity 0
        else if (command === 8 || (command === 9 && velocity === 0)) {
            this.noteOff(note, inputId);
        }
        // Control change (command 11) - unused for now
        else if (command === 11) {
            this.handleControlChange(channel, data[1], data[2]);
        }
    }

    /**
     * Process MIDI note on
     */
    noteOn(midi, velocity, inputId) {
        if (!this.audioEngine) return;

        // Normalize velocity to 0-1 range
        const normalizedVelocity = velocity / 127;

        // Play the note with long duration (will be stopped on note-off)
        if (typeof this.audioEngine.playNote === 'function') {
            this.audioEngine.playNote(midi, 10.0, 0, normalizedVelocity);
        }

        // Track active note
        const key = `${inputId}:${midi}`;
        this.activeNotes.set(key, {
            midi,
            velocity,
            inputId,
            timestamp: Date.now()
        });

        // Emit event
        this.emit('noteOn', { midi, velocity: normalizedVelocity, inputId });
    }

    /**
     * Process MIDI note off
     */
    noteOff(midi, inputId) {
        // Stop the note via audio engine
        if (this.audioEngine && typeof this.audioEngine.stopNote === 'function') {
            this.audioEngine.stopNote(midi);
        }
        
        const key = `${inputId}:${midi}`;
        this.activeNotes.delete(key);
        this.emit('noteOff', { midi, inputId });
    }

    /**
     * Handle control change messages (CC)
     */
    handleControlChange(channel, controller, value) {
        // CC #7 is Master Volume
        if (controller === 7 && this.audioEngine && typeof this.audioEngine.setVolume === 'function') {
            const volume = value / 127;
            this.audioEngine.setVolume(volume);
        }
        this.emit('controlChange', { controller, value, channel });
    }

    /**
     * Subscribe to MIDI events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from MIDI events
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in MIDI event listener for ${event}:`, e);
            }
        });
    }

    /**
     * Set status change callback (for UI updates)
     */
    onStatusChange(status, message) {
        if (this.statusCallback) {
            this.statusCallback(status, message);
        }
    }

    /**
     * Get list of connected MIDI inputs
     */
    getInputs() {
        const inputs = [];
        if (this.midiAccess) {
            this.midiAccess.inputs.forEach(input => {
                inputs.push({
                    id: input.id,
                    name: input.name,
                    state: input.state
                });
            });
        }
        return inputs;
    }

    /**
     * Check if MIDI is enabled and ready
     */
    isReady() {
        return this.enabled && this.midiAccess && this.midiAccess.inputs.size > 0;
    }

    /**
     * Get status string
     */
    getStatus() {
        if (!this.enabled) return 'disabled';
        if (!this.midiAccess) return 'unavailable';
        if (this.midiAccess.inputs.size === 0) return 'waiting';
        return 'ready';
    }

    /**
     * Get active MIDI notes
     */
    getActiveNotes() {
        return Array.from(this.activeNotes.values());
    }

    /**
     * Clear all active notes
     */
    clearActiveNotes() {
        this.activeNotes.clear();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MIDIInputManager;
}
