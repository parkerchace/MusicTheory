/**
 * ScaleIntelligenceEngine.js
 * 
 * Provides musical scale recommendations based on emotional and semantic context.
 * Replaces missing legacy engine to stabilize the music dashboard.
 */

class ScaleIntelligenceEngine {
    constructor(musicTheory = null) {
        this.musicTheory = musicTheory;
        this.scaleDatabase = {};
        this.initializeDatabase();
    }

    initializeDatabase() {
        // Essential emotional scales mapping
        this.emotionalMap = {
            'joyful': ['major', 'lydian', 'mixolydian', 'major_pentatonic'],
            'hopeful': ['major', 'lydian', 'mixolydian'],
            'peaceful': ['major', 'major_pentatonic', 'lydian'],
            'sad': ['aeolian', 'dorian', 'harmonic_minor', 'phrygian'],
            'dark': ['phrygian', 'locrian', 'harmonic_minor', 'phrygian_dominant', 'altered'],
            'mysterious': ['dorian', 'phrygian', 'lydian_augmented', 'whole_tone'],
            'angry': ['phrygian_dominant', 'locrian', 'altered', 'harmonic_minor'],
            'intense': ['phrygian_dominant', 'super_locrian', 'diminished'],
            'dreamy': ['lydian', 'lydian_augmented', 'whole_tone'],
            'chaotic': ['diminished', 'altered', 'locrian_b4', 'chromatic']
        };

        // Populate scale database from global SCALES if available
        if (typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals) {
            this.scaleDatabase = window.SCALES.intervals;
        } else {
            // Minimal fallback database
            this.scaleDatabase = {
                major: [0, 2, 4, 5, 7, 9, 11],
                aeolian: [0, 2, 3, 5, 7, 8, 10],
                dorian: [0, 2, 3, 5, 7, 9, 10],
                phrygian: [0, 1, 3, 5, 7, 8, 10],
                lydian: [0, 2, 4, 6, 7, 9, 11],
                mixolydian: [0, 2, 4, 5, 7, 9, 10],
                locrian: [0, 1, 3, 5, 6, 8, 10],
                harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
                phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
                altered: [0, 1, 3, 4, 6, 8, 10],
                whole_tone: [0, 2, 4, 6, 8, 10],
                diminished: [0, 2, 3, 5, 6, 8, 9, 11]
            };
        }
    }

    /**
     * Select the best scale based on emotional attributes
     * @param {Object} attributes - {darkness, energy, mystery, brightness, tension, words}
     * @returns {Object} {name, score, primaryReason}
     */
    selectScale(attributes = {}) {
        const { darkness = 0.5, energy = 0.5, mystery = 0, brightness = 0.5, tension = 0.5, words = [] } = attributes;

        // Determine target "Emotional Profile"
        let targetTone = 'calm';
        if (darkness > 0.7) targetTone = 'dark';
        else if (brightness > 0.7) targetTone = 'joyful';
        else if (energy > 0.8 && tension > 0.6) targetTone = 'intense';
        else if (mystery > 0.6) targetTone = 'mysterious';
        else if (energy < 0.3 && darkness > 0.4) targetTone = 'sad';
        else if (brightness > 0.6) targetTone = 'hopeful';

        const candidates = this.emotionalMap[targetTone] || ['major'];
        
        // Pick best candidate (for now just pick the first one, or use a seeded random if we wanted)
        // In a more advanced version, we'd score every scale in scaleDatabase against the attributes.
        const scaleName = candidates[0];

        return {
            name: scaleName,
            emotion: targetTone,
            score: 0.95,
            primaryReason: `Mapped ${targetTone} profile from attributes (energy:${energy.toFixed(2)}, tension:${tension.toFixed(2)})`
        };
    }
}

// Global exposure
if (typeof window !== 'undefined') {
    window.ScaleIntelligenceEngine = ScaleIntelligenceEngine;
}
