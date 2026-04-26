/**
 * local-music-lexicon.js
 * 
 * Defines the core "Musical Archetypes". 
 * The Semantic Contour Engine maps words to these archetypes to determine
 * the melodic contour, density, and preferred tension intervals.
 */

window.MusicalArchetypes = {
    // ============================================
    // EMOTIONAL TENSION (Affects Intervals/Chords)
    // ============================================
    dark: {
        type: 'tension',
        preferredIntervals: ['b2', 'b3', 'b6'],
        harmonyBias: 'minor',
        complexity: 0.8
    },
    bright: {
        type: 'tension',
        preferredIntervals: ['3', '#4', '7'],
        harmonyBias: 'major',
        complexity: 0.3
    },
    peaceful: {
        type: 'tension',
        preferredIntervals: ['1', '5', '9'],
        harmonyBias: 'sus',
        complexity: 0.1
    },
    chaotic: {
        type: 'tension',
        preferredIntervals: ['b2', 'b5', '7'],
        harmonyBias: 'diminished',
        complexity: 1.0
    },

    // ============================================
    // MOTION CONTOUR (Affects Pitch Direction)
    // ============================================
    rise: {
        type: 'contour',
        direction: 'up',
        leapSize: 'step' // moves up step-wise
    },
    fall: {
        type: 'contour',
        direction: 'down',
        leapSize: 'step'
    },
    jump: {
        type: 'contour',
        direction: 'up',
        leapSize: 'leap' // wide intervals
    },
    drop: {
        type: 'contour',
        direction: 'down',
        leapSize: 'leap'
    },
    wander: {
        type: 'contour',
        direction: 'oscillate',
        leapSize: 'step'
    },

    // ============================================
    // RHYTHMIC DENSITY (Affects Tempo/Divisions)
    // ============================================
    fast: {
        type: 'density',
        rhythmValue: 0.25, // 16th notes
        articulation: 'staccato'
    },
    slow: {
        type: 'density',
        rhythmValue: 1.0, // whole/half notes
        articulation: 'legato'
    },
    frantic: {
        type: 'density',
        rhythmValue: 0.125, // 32nd notes or tuplets
        articulation: 'marcato'
    },
    steady: {
        type: 'density',
        rhythmValue: 0.5, // 8th notes, rigid
        articulation: 'tenuto'
    }
};
