/**
 * @module MusicTheoryEngine
 * @description Core music theory calculations, scales, and chord analysis used by all other modules
 * @exports class MusicTheoryEngine
 * @feature 60+ authentic scales from multiple traditions
 * @feature Complete chord formula system
 * @feature Functional harmony analysis
 * @feature Container chord analysis
 * @feature Scale degree calculations
 */

// Import RegionalScaleManager for ethnomusicological context management
let RegionalScaleManager;
try {
    if (typeof require !== 'undefined') {
        RegionalScaleManager = require('./regional-scale-manager.js');
    } else if (typeof window !== 'undefined' && window.RegionalScaleManager) {
        RegionalScaleManager = window.RegionalScaleManager;
    }
} catch (error) {
    // RegionalScaleManager not available - will be handled in constructor
    RegionalScaleManager = null;
}

class MusicTheoryEngine {
    constructor() {
        this.chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        this.noteValues = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        // Shared state for grading system
        this.gradingMode = 'functional'; // 'functional' | 'emotional' | 'color'
        this.listeners = new Set();
        
        // Enhanced centralized grading event system
        this.gradingEventQueue = [];
        this.moduleStates = new Map(); // moduleId -> grading state
        this.eventRetryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 100; // ms
        this.eventTimeout = 5000; // ms for event propagation timeout

        // Regional scale management for ethnomusicological context
        this.regionalScaleManager = RegionalScaleManager ? 
            new RegionalScaleManager() : null;

        // Key signatures and their preferred accidentals
        this.keySignatures = {
            // Sharp keys
            'C': { accidentals: [], type: 'natural' },
            'G': { accidentals: ['F#'], type: 'sharp' },
            'D': { accidentals: ['F#', 'C#'], type: 'sharp' },
            'A': { accidentals: ['F#', 'C#', 'G#'], type: 'sharp' },
            'E': { accidentals: ['F#', 'C#', 'G#', 'D#'], type: 'sharp' },
            'B': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#'], type: 'sharp' },
            'F#': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'], type: 'sharp' },
            'C#': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'], type: 'sharp' },
            
            // Flat keys
            'F': { accidentals: ['Bb'], type: 'flat' },
            'Bb': { accidentals: ['Bb', 'Eb'], type: 'flat' },
            'Eb': { accidentals: ['Bb', 'Eb', 'Ab'], type: 'flat' },
            'Ab': { accidentals: ['Bb', 'Eb', 'Ab', 'Db'], type: 'flat' },
            'Db': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'], type: 'flat' },
            'Gb': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'], type: 'flat' },
            'Cb': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'], type: 'flat' }
        };

        this.scales = {
            // Western Major & Modes (Church Modes)
            major: [0, 2, 4, 5, 7, 9, 11],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            aeolian: [0, 2, 3, 5, 7, 8, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10],

            // Melodic Minor & Modes
            melodic: [0, 2, 3, 5, 7, 9, 11],
            dorian_b2: [0, 1, 3, 5, 7, 9, 10],
            lydian_augmented: [0, 2, 4, 6, 8, 9, 11],
            lydian_dominant: [0, 2, 4, 6, 7, 9, 10],
            mixolydian_b6: [0, 2, 4, 5, 7, 8, 10],
            locrian_nat2: [0, 2, 3, 5, 6, 8, 10],
            altered: [0, 1, 3, 4, 6, 8, 10],

            // Harmonic Minor & Modes
            harmonic: [0, 2, 3, 5, 7, 8, 11],
            locrian_nat6: [0, 1, 3, 5, 6, 9, 10],
            ionian_augmented: [0, 2, 4, 5, 8, 9, 11],
            dorian_sharp4: [0, 2, 3, 6, 7, 9, 10],
            phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
            lydian_sharp2: [0, 3, 4, 6, 7, 9, 11],
            altered_diminished: [0, 1, 3, 4, 6, 8, 9],

            // Harmonic Major & Modes
            harmonic_major: [0, 2, 4, 5, 7, 8, 11],
            dorian_b5: [0, 2, 3, 5, 6, 9, 10],
            phrygian_b4: [0, 1, 3, 4, 7, 8, 10],
            lydian_b3: [0, 2, 3, 6, 7, 9, 11],
            mixolydian_b2: [0, 1, 4, 5, 7, 9, 10],
            aeolian_b1: [0, 1, 3, 5, 7, 8, 10],
            locrian_bb7: [0, 1, 3, 5, 6, 8, 9],

            // Double Harmonic & Modes
            double_harmonic_major: [0, 1, 4, 5, 7, 8, 11],
            lydian_sharp2_sharp6: [0, 3, 4, 6, 7, 10, 11],
            ultraphrygian: [0, 1, 4, 5, 6, 9, 10],
            hungarian_minor: [0, 2, 3, 6, 7, 8, 11],
            oriental: [0, 1, 4, 5, 6, 9, 10],
            ionian_augmented_sharp2: [0, 3, 4, 5, 8, 9, 11],
            locrian_bb3_bb7: [0, 1, 2, 5, 6, 8, 9],

            // Symmetric Scales
            whole_tone: [0, 2, 4, 6, 8, 10],
            octatonic_dim: [0, 2, 3, 5, 6, 8, 9, 11],
            octatonic_dom: [0, 1, 3, 4, 6, 7, 9, 10],
            augmented: [0, 3, 4, 7, 8, 11],
            tritone: [0, 1, 4, 6, 7, 10],
            prometheus: [0, 2, 4, 6, 9, 10],

            // Pentatonic Scales
            major_pentatonic: [0, 2, 4, 7, 9],
            minor_pentatonic: [0, 3, 5, 7, 10],
            egyptian_pentatonic: [0, 2, 5, 7, 10],
            blues_minor_pentatonic: [0, 3, 5, 6, 7, 10],
            blues_major_pentatonic: [0, 2, 3, 4, 7, 9],
            hirajoshi: [0, 2, 3, 7, 8],
            iwato: [0, 1, 5, 6, 10],
            insen: [0, 1, 5, 7, 10],
            yo: [0, 2, 5, 7, 9],

            // Hexatonic Scales
            blues_hexatonic: [0, 3, 5, 6, 7, 10],
            whole_tone_hexatonic: [0, 2, 4, 6, 8, 10],
            augmented_hexatonic: [0, 3, 4, 7, 8, 11],
            prometheus_hexatonic: [0, 2, 4, 6, 9, 10],

            // Middle Eastern Scales
            hijaz: [0, 1, 4, 5, 7, 8, 10],
            hijaz_kar: [0, 1, 4, 5, 7, 8, 11],
            maqam_bayati: [0, 1, 3, 5, 7, 8, 10],
            maqam_rast: [0, 2, 4, 5, 7, 9, 10],
            maqam_ajam: [0, 2, 4, 5, 7, 9, 11],
            maqam_nahawand: [0, 2, 3, 5, 7, 8, 10],
            maqam_kurd: [0, 1, 3, 5, 7, 8, 10],
            persian: [0, 1, 4, 5, 6, 8, 11],

            // Indian Ragas (12-TET approximations)
            raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
            raga_todi: [0, 1, 3, 6, 7, 8, 11],
            raga_marwa: [0, 1, 4, 6, 7, 9, 11],
            raga_purvi: [0, 1, 4, 6, 7, 8, 11],
            raga_kafi: [0, 2, 3, 5, 7, 9, 10],
            raga_bhairavi: [0, 1, 3, 5, 7, 8, 10],

            // Spanish/Flamenco Scales
            spanish_phrygian: [0, 1, 4, 5, 7, 8, 10],
            spanish_gypsy: [0, 1, 4, 5, 7, 8, 11],
            flamenco: [0, 1, 3, 4, 5, 7, 8, 10],

            // Jazz Scales
            bebop_major: [0, 2, 4, 5, 7, 8, 9, 11],
            bebop_dominant: [0, 2, 4, 5, 7, 9, 10, 11],
            bebop_minor: [0, 2, 3, 5, 7, 8, 9, 10],
            bebop_dorian: [0, 2, 3, 4, 5, 7, 9, 10],

            // Barry Harris Scales
            barry_major6dim: [0, 2, 3, 4, 5, 7, 9, 10],
            barry_dom7dim: [0, 2, 3, 4, 6, 7, 9, 10],
            barry_minor6dim: [0, 2, 3, 5, 6, 8, 9, 11],

            // Exotic/Modern Scales
            enigmatic: [0, 1, 4, 6, 8, 10, 11],
            neapolitan_major: [0, 1, 3, 5, 7, 9, 11],
            neapolitan_minor: [0, 1, 3, 5, 7, 8, 11],
            romanian_minor: [0, 2, 3, 6, 7, 9, 10],
            ukrainian_dorian: [0, 2, 3, 6, 7, 9, 10],
            leading_whole_tone: [0, 2, 4, 6, 8, 10, 11],

            // South American Scales (12-TET approximations for orchestral compatibility)
            // Argentine Scales
            chacarera: [0, 2, 4, 5, 7, 9, 11],
            zamba: [0, 2, 3, 5, 7, 9, 10],
            milonga: [0, 2, 3, 5, 7, 8, 11],
            tango_minor: [0, 1, 3, 5, 7, 8, 11],
            vidala: [0, 3, 5, 7, 10],
            
            // Chilean Scales
            cueca: [0, 2, 4, 5, 7, 9, 10],
            tonada: [0, 2, 4, 5, 7, 9, 11],
            
            // Peruvian Scales
            marinera: [0, 1, 4, 5, 7, 8, 11],
            huayno: [0, 2, 3, 5, 7, 8, 10],
            yaraví: [0, 1, 3, 5, 7, 8, 10],
            
            // Colombian Scales
            bambuco: [0, 2, 3, 5, 7, 8, 10],
            cumbia: [0, 2, 4, 5, 7, 9, 10],
            vallenato: [0, 2, 4, 5, 7, 9, 11],
            
            // Venezuelan Scales
            joropo: [0, 2, 4, 5, 7, 9, 11],
            merengue_venezolano: [0, 2, 4, 5, 7, 9, 10],
            
            // Brazilian Scales
            samba: [0, 2, 4, 5, 7, 9, 10],
            bossa_nova: [0, 2, 4, 5, 7, 9, 11],
            choro: [0, 2, 3, 5, 7, 9, 10],
            forró: [0, 2, 4, 5, 7, 9, 10],
            
            // Bolivian Scales
            morenada: [0, 1, 3, 5, 7, 8, 10],
            tinku: [0, 2, 3, 5, 7, 8, 11],
            
            // Ecuadorian Scales
            pasillo: [0, 2, 3, 5, 7, 9, 10],
            sanjuanito: [0, 2, 4, 5, 7, 9, 10],
            
            // Paraguayan Scales
            guarania: [0, 2, 3, 5, 7, 8, 10],
            polka_paraguaya: [0, 2, 4, 5, 7, 9, 11],
            
            // Uruguayan Scales
            candombe: [0, 2, 3, 5, 7, 9, 10],

            // African Scales (12-TET approximations for orchestral compatibility)
            // West African Scales
            pentatonic_african: [0, 2, 5, 7, 10],
            heptatonic_akan: [0, 2, 3, 5, 7, 9, 10],
            kora_scale: [0, 2, 3, 5, 7, 8, 10],
            balafon_scale: [0, 2, 4, 5, 7, 9, 11],
            yoruba_traditional: [0, 2, 3, 5, 7, 9, 10],
            ewe_traditional: [0, 2, 4, 5, 7, 9, 11],
            hausa_pentatonic: [0, 2, 4, 7, 9],
            fulani_pastoral: [0, 2, 4, 5, 7, 9, 11],
            mandinka_griot: [0, 1, 3, 5, 7, 8, 10],
            wolof_sabar: [0, 3, 5, 6, 7, 10],
            
            // Central African Scales
            mbira_tuning: [0, 2, 4, 7, 9, 11],
            pygmy_polyphonic: [0, 2, 4, 7, 9],
            bantu_traditional: [0, 2, 3, 5, 7, 8, 10],
            congolese_rumba: [0, 2, 4, 5, 7, 9, 10],
            
            // East African Scales
            ethiopian_pentatonic: [0, 2, 5, 7, 10],
            ethiopian_tezeta: [0, 1, 3, 5, 6, 8, 10],
            kenyan_benga: [0, 2, 4, 5, 7, 9, 11],
            ugandan_traditional: [0, 2, 3, 5, 7, 9, 10],
            tanzanian_taarab: [0, 1, 4, 5, 7, 8, 11],
            
            // Southern African Scales
            xylophone_chopi: [0, 3, 5, 7, 10],
            zulu_traditional: [0, 2, 3, 5, 7, 8, 10],
            xhosa_traditional: [0, 2, 4, 5, 7, 9, 11],
            sotho_traditional: [0, 2, 3, 5, 7, 9, 10],
            south_african_jazz: [0, 2, 3, 4, 5, 7, 9, 10],
            marabi_scale: [0, 3, 4, 5, 7, 10],
            
            // North African Scales
            berber_traditional: [0, 1, 4, 5, 7, 8, 11],
            tuareg_pentatonic: [0, 2, 5, 7, 9],
            moroccan_andalusi: [0, 1, 3, 4, 7, 8, 10],
            algerian_chaabi: [0, 1, 4, 5, 7, 8, 10],
            egyptian_maqam_influenced: [0, 1, 4, 5, 7, 8, 11],
            
            // Additional Regional Variations
            san_bushmen: [0, 3, 5, 8, 10],
            dogon_traditional: [0, 2, 3, 6, 7, 9, 10],
            bambara_traditional: [0, 2, 4, 5, 7, 9, 11],
            senufo_traditional: [0, 2, 3, 5, 7, 8, 10]
        };

        // Scale citations and derivations with references
        this.scaleCitations = {
            major: {
                description: 'Ionian mode - 1st mode of major scale, fundamental to Western tonal music',
                culturalContext: {
                    region: "Western Europe",
                    culturalGroup: "European classical tradition",
                    historicalPeriod: "Medieval to present",
                    musicalFunction: "Primary tonal center in Western music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Major scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Major_scale",
                        "description": "[1] A major scale is a diatonic scale. The sequence of intervals between the notes of a major scale is: whole, whole, half, whole, whole, whole, half ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Major Scale Patterns, Positions and Theory Introduction to Intervals - Universit",
                        "url": "https://appliedguitartheory.com/lessons/major-scale/",
                        "description": "A common misperception of guitar scales is that they’re only useful for soloing. This couldn’t be further from the truth. Yes, scales can provide the ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Intervals in Major and Minor Scales - Music Crash Courses",
                        "url": "https://musiccrashcourses.com/lessons/intervals_maj_min.html",
                        "description": "When measured up from the tonic, use only major intervals (2nd, 3rd, 6th, and 7th) and perfect intervals (unison, 4th, 5th, and octave). Also, the nam",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            dorian: {
                description: 'Dorian mode - 2nd mode of major scale, natural minor with raised 6th',
                culturalContext: {
                    region: "Ancient Greece, Medieval Europe",
                    culturalGroup: "Ancient Greek modes, Medieval church music",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Modal harmony, jazz, folk music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Dorian mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Dorian_mode",
                        "description": "Applied to a whole octave, the Dorian octave species was built upon two tetrachords (four-note segments) separated by a whole tone, running from the h",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Dorian Mode: A Comprehensive Guide - Blog | Splice Dorian scales - overview with",
                        "url": "https://splice.com/blog/music-modes-dorian/",
                        "description": "Among the most popular and versatile of these modes, the Dorian mode can be used in an incredibly wide variety of musical contexts. In this article, l",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Dorian scales - overview with pictures",
                        "url": "https://www.pianoscales.org/dorian.html",
                        "description": "Relevant scales are Dorian b2 (flat second), Dorian #4 (sharp four) and Dorian b5 (flat five), which all are altered Dorian scales . In addition, ther",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            phrygian: {
                description: 'Phrygian mode - 3rd mode of major scale, natural minor with flat 2nd',
                culturalContext: {
                    region: "Ancient Greece, Spain, Middle East",
                    culturalGroup: "Ancient Greek modes, Flamenco, Arabic music influences",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Modal harmony, flamenco, exotic scales",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Phrygian mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Phrygian_mode",
                        "description": "In modern western music (from the 18th century onward), the Phrygian mode is related to the modern natural minor scale, also known as the Aeolian mode",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "What Is The Phrygian Mode? - Hello Music Theory",
                        "url": "https://hellomusictheory.com/learn/phrygian-mode/",
                        "description": "Apr 17, 2024 · Even though the Phrygian scale is a mode of the major scale, it’s actually a type of minor scale. This is because the 3rd note is an in",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Phrygian mode: A comprehensive guide - Blog | Splice",
                        "url": "https://splice.com/blog/music-modes-phrygian/",
                        "description": "Apr 24, 2023 · While familiarizing yourself with the sequence of intervals is far more valuable (and easier) than memorizing every scale one-by-one, h",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian: {
                description: 'Lydian mode - 4th mode of major scale, major with raised 4th',
                culturalContext: {
                    region: "Ancient Greece, Modern jazz",
                    culturalGroup: "Ancient Greek modes, Jazz harmony",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Modal harmony, jazz, film music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Lydian mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Lydian_mode",
                        "description": "In Greek music theory , there was a Lydian scale or \"octave species\" extending from parhypate hypaton to trite diezeugmenon, equivalent in the diatoni",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "What Is The Lydian Mode? - Hello Music Theory Lydian Mode: A Comprehensive Guide",
                        "url": "https://hellomusictheory.com/learn/lydian-mode/",
                        "description": "The modal scales, or modes, as they’re more commonly known, are a series of seven diatonic scales. Each of them has its own distinct sound, but they a",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Lydian Scale - Music Interval Theory Academy",
                        "url": "https://musicintervaltheory.academy/learn-how-to-write-music/lydian-scale/",
                        "description": "Learn how the Lydian scale connects to so many musical places, such as the Harmonic series, the Circle of Fifths, and many more!",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            mixolydian: {
                description: 'Mixolydian mode - 5th mode of major scale, major with flat 7th',
                culturalContext: {
                    region: "Ancient Greece, Celtic music, Blues",
                    culturalGroup: "Ancient Greek modes, Celtic tradition, Blues and rock",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Modal harmony, blues, rock, Celtic music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "What Is The Mixolydian Mode? - Hello Music Theory Images The Mixolydian Mode: Un",
                        "url": "https://hellomusictheory.com/learn/mixolydian-mode/",
                        "description": "The modes are a set of seven diatonic scales , each with its own unique sound and formula. Even though they’re all different, they are all based on th",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "What is the Mixolydian Mode: A Complete Music Theory Guide",
                        "url": "https://www.pdmusic.org/mixolydian-mode/",
                        "description": "It is characterized by a sequence of intervals : Whole-Whole-Half-Whole-Whole-Half-Whole (W-W-H-W-W-H-W). This pattern distinguishes the Mixolydian mo",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Mixolydian Mode: Unlocking Its Melodic & Harmonic ...",
                        "url": "https://musiversal.com/blog/master-mixolydian-mode",
                        "description": "Understanding the Mixolydian mode begins with grasping the foundation of music modes theory . Two primary ways to approach its construction are its re",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            aeolian: {
                description: 'Aeolian mode - 6th mode of major scale, natural minor scale',
                culturalContext: {
                    region: "Ancient Greece, Western Europe",
                    culturalGroup: "Ancient Greek modes, Western classical tradition",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Natural minor scale, classical music, popular music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Aeolian mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Aeolian_mode",
                        "description": "In modern usage, the Aeolian mode is the sixth mode of the major scale and has the following formula: The Aeolian mode is the sixth mode of the major ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "What is the Aeolian Mode?: A Complete Music Theory Guide",
                        "url": "https://www.pdmusic.org/aeolian-mode/",
                        "description": "The mode’s characteristic intervals , particularly the minor third and sixth, provide a depth of feeling and complexity to melodies and harmonies. In ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Aeolian mode: A comprehensive guide - Blog | Splice",
                        "url": "https://splice.com/blog/music-modes-aeolian/",
                        "description": "Jul 3, 2023 · While familiarizing yourself with the sequence of intervals is arguably far more important than memorizing every scale one-by-one, here’",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            locrian: {
                description: 'Locrian mode - 7th mode of major scale, diminished scale',
                culturalContext: {
                    region: "Ancient Greece, Modern jazz",
                    culturalGroup: "Ancient Greek modes, Jazz theory",
                    historicalPeriod: "Ancient Greece to present",
                    musicalFunction: "Modal harmony, jazz theory, diminished harmony",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Locrian mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Locrian_mode",
                        "description": "Slipknot 's track \"Everything Ends\" uses an A Locrian scale with the fourth note sometimes flattened. Numerous other tracks by Slipknot use Locrian mo",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "What Is The Locrian Mode? - Hello Music Theory Locrian Mode: A Comprehensive Gui",
                        "url": "https://hellomusictheory.com/learn/locrian-mode/",
                        "description": "In music , a mode is a lot like a scale – it starts on a note and goes up (or down) through the rest of the notes until it reaches that same note agai",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "What is the Locrian Mode: A Complete Music Theory Guide",
                        "url": "https://www.pdmusic.org/locrian-mode/",
                        "description": "Characterized by its diminished fifth and minor second intervals , the Locrian mode occupies a unique space in music theory and composition, offering ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            melodic: {
                description: 'Melodic minor scale - minor scale with raised 6th and 7th ascending',
                culturalContext: {
                    region: "Western Europe",
                    culturalGroup: "Western classical tradition, Jazz harmony",
                    historicalPeriod: "Baroque period to present",
                    musicalFunction: "Classical composition, jazz improvisation",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Melodic Minor Scales - My Music Theory",
                        "url": "https://mymusictheory.com/scales-and-keys/melodic-minor-scales/",
                        "description": "Just in case you were wondering, in music theory the words “harmonic” and “melodic” can be used to describe intervals as well as scales – but when we ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Minor Scales: Natural, Harmonic And Melodic Interval (music) - Wikipedia Ima",
                        "url": "https://hellomusictheory.com/learn/minor-scales/",
                        "description": "We tend to say that major scales have a ‘happier’ and ‘cheerier’ sound, whereas minor scales have a ‘darker’ and ‘sadder’ sound. Minor scales have a d",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Scale Formulas, Patterns & Intervals Chart for Quick ...",
                        "url": "https://muted.io/scale-formulas-intervals/",
                        "description": "Chart of the scale formula/pattern & intervals of many popular scales like the major scale, natural minor scale, melodic minor scale and harmonic mino",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            dorian_b2: {
                description: 'Dorian b2 - 2nd mode of melodic minor, Phrygian with natural 6th',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Dorian b2, Phrygian ♮6 Scale - Guitar Lesson With shapes",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-melodic-minor-scale/the-dorian-b2-mode-lesson-with-guitar-diagrams.html",
                        "description": "This guitar lesson with neck diagrams, scale charts and music theory diagrams is about the Dorian b2 mode also known as dorian b9 or Phrygian natural ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Dorian B2 Scales on guitar: Fretboard Patterns and Tabs",
                        "url": "https://www.fachords.com/guitar-scale/dorian-b2/",
                        "description": "In this post we're going to learn how to play the Dorian B2 scale, with the help of fretboard diagrams and guitar tabs. The intervals in the Dorian b2",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "How to play B dorian b2 scale on guitar and piano ... - Solfej",
                        "url": "https://www.solfej.io/scales/b-dorian-b2",
                        "description": "What notes and intervals are in B dorian b2 ? Find out how and search through 1000s of scales .",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian_augmented: {
                description: 'Lydian Augmented - 3rd mode of melodic minor, Lydian with augmented 5th',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Lydian augmented scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Lydian_augmented_scale",
                        "description": "In music , the Lydian augmented scale (Lydian ♯5 scale) is the third mode of the ascending melodic minor scale. Starting on C, the notes would be as f",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Scale 2901: \"Lydian Augmented\" - Ian Ring Images Lydian #5 Scales for piano (Lyd",
                        "url": "https://ianring.com/musictheory/scales/2901",
                        "description": "If tones of the scale are imagined as identical physical objects spaced around a unit circle, the center of gravity is the point where the scale is ba",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Lydian Augmented Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/lydian-augmented-scale/",
                        "description": "Compared to the Lydian mode, the Lydian augmented scale has a raised 5th scale degree to arrive at the following interval formula: 1 - 2 - 3 - #4 - #5",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian_dominant: {
                description: 'Lydian Dominant - 4th mode of melodic minor, Mixolydian with raised 4th',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Lydian Dominant Scale : How To Create Exciting Tracks (+ Tips)",
                        "url": "https://unison.audio/lydian-dominant-scale/",
                        "description": "The basics, theory , and scale formula of the Lydian Dominant scale ✓Unique characteristics that set it apart ✓",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Lydian Dominant Scale - The Complete Guide - Piano With Jonny",
                        "url": "https://pianowithjonny.com/piano-lessons/lydian-dominant-scale-the-complete-guide/",
                        "description": "In today’s Quick Tip, Lydian Dominant Scale —The Complete Guide, John Proulx shows you everything you need to know about this enchanting jazz scale. Y",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Lydian Dominant Scale - Dare to Venture Outside Major and Minor",
                        "url": "https://www.fretjam.com/lydian-dominant-scale.html",
                        "description": "Basic Lydian Dominant Scale Theory . So, from the video we know that lydian dominant works over dominant 7th chords with the same root (e.g. C lydian ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            mixolydian_b6: {
                description: 'Mixolydian b6 - 5th mode of melodic minor, Mixolydian with flat 6th',
                references: [
                    {
                        "type": "verified_source",
                        "title": "B Mixolydian b6 Scale: Degrees, Notes, Intervals, and ...",
                        "url": "https://dmitrypimonov.com/en/tools/circle-of-fifths/b-mixolydian-flat6",
                        "description": "Study the formula and intervals , keep color tones in the top voice, build diatonic chords, and try integrating the mode into your own progressions — ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Musical Scale Info: B mixolydian b6 - Scales-Chords.com",
                        "url": "https://www.scales-chords.com/scaleinfo.php?skey=B&sname=mixolydian+b6",
                        "description": "Detailed information for the scale B mixolydian b6 . Notes, Intervals and relations to other scales in the database.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Easy Ways To Play The Mixolydian B6 scale on guitar - FaChords",
                        "url": "https://www.fachords.com/guitar-scale/mixolydian-b6/",
                        "description": "Here you find the guitar tabs and the fretboard diagrams for learning the Mixolydian B6 scale on guitar. The intervals in the Mixolydian b6 Scale scal",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            locrian_nat2: {
                description: 'Locrian Natural 2 - 6th mode of melodic minor, Locrian with natural 2nd',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            altered: {
                description: 'Altered scale - 7th mode of melodic minor, dominant scale with all altered extensions',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Altered scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Altered_scale",
                        "description": "In jazz, the altered scale , altered dominant scale , or super-Locrian scale (Locrian ♭4 scale ) is a seven-note scale that is a dominant scale where ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "What is the Altered Scale?: A Complete Music Theory Guide",
                        "url": "https://www.pdmusic.org/altered-scales/",
                        "description": "Mastering the altered scale requires practice and a deep understanding of its relationship to the underlying chord progressions. Musicians should begi",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Altered Scale Piano Reference With Notes & Intervals - muted.io",
                        "url": "https://muted.io/altered-scale/",
                        "description": "The name altered scale can be confusing as it's also used as the name for a number of other scales that are altered. Here you'll find an interactive p",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            harmonic: {
                description: 'Harmonic minor scale - natural minor with raised 7th degree',
                culturalContext: {
                    region: "Western Europe, Middle East influences",
                    culturalGroup: "Western classical tradition, Eastern European folk",
                    historicalPeriod: "Baroque period to present",
                    musicalFunction: "Classical composition, dramatic harmony, exotic scales",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Minor scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Minor_scale",
                        "description": "In Western classical music theory , the minor scale refers to three scale patterns – the natural minor scale (or Aeolian mode), the harmonic minor sca",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Harmonic Minor everything",
                        "url": "https://music.youtube.com/playlist?list=PLP6H9iq9bswaWX1QqN7vNtzZpikcqCD-d",
                        "description": "C Harmonic Minor Scale \" Music Theory \" #harmonic #scalemodel @ harmonic - scale .",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Melodic and Harmonic Intervals",
                        "url": "https://ru.pinterest.com/ideas/melodic-and-harmonic-intervals/947871163998/",
                        "description": "harmonic minor key chords. sheet music for scale degrees and intervals . Теория Музыки. Interval , in music , the inclusive distance between one tone ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            locrian_nat6: {
                description: 'Locrian Natural 6 - 2nd mode of harmonic minor, Locrian with natural 6th',
                culturalContext: {
                    region: "Jazz theory development",
                    culturalGroup: "Jazz harmony, modern classical",
                    historicalPeriod: "20th century to present",
                    musicalFunction: "Jazz improvisation, modal harmony, exotic scales",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            ionian_augmented: {
                description: 'Ionian Augmented - 3rd mode of harmonic minor, major with augmented 5th',
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Ionian #5 Mode For Guitar - Diagrams and Theory",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-minor-scale/the-ionian-5-mode-guitar-diagrams-and-formula.html",
                        "description": "Difference With The Ionian Mode? The diagrams below show the unique difference between the Ionian mode (better known as major scale) and the Ionian au",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "How to play A ionian augmented scale on guitar and piano ...",
                        "url": "https://www.solfej.io/scales/a-ionian-augmented",
                        "description": "What notes and intervals are in A ionian augmented ? Find out how and search through 1000s of scales .",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "C Ionian Augmented Scale . All Piano Scales : Interactive piano app...",
                        "url": "https://pianoencyclopedia.com/scales/ionian-augmented/C-ionian-augmented.html",
                        "description": "C Ionian Augmented scale . Play it on the piano: C, D, E, F, G#, A, and B notes . Learn how to improvise, compose, its fingering and harmonization. Do",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            dorian_sharp4: {
                description: 'Dorian #4 - 4th mode of harmonic minor, Dorian with raised 4th',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            phrygian_dominant: {
                description: 'Phrygian Dominant - 5th mode of harmonic minor, dominant scale with flat 2nd',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Composing in Phrygian Dominant Scale - Film Music Theory",
                        "url": "https://filmmusictheory.com/article/composing-in-phrygian-dominant-scale/",
                        "description": "May 31, 2024 · Compared to a major scale, it has the following intervals : 1–♭2–3–4–5–♭6–♭7. The key difference is the major third (3) instead of a mi",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Phrygian Dominant Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/phrygian-dominant-scale/",
                        "description": "The Phrygian dominant scale is the 5th mode of the harmonic minor scale. Here you'll find an interactive piano reference for the Phrygian dominant sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Phrygian Dominant Scale 101: Master This Exotic ... - Unison",
                        "url": "https://unison.audio/phrygian-dominant-scale/",
                        "description": "Jul 8, 2024 · Unlike the major scale, the Phrygian dominant scale features an augmented second interval between the second and third notes. This diffe",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian_sharp2: {
                description: 'Lydian #2 - 6th mode of harmonic minor, Lydian with raised 2nd',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            altered_diminished: {
                description: 'Altered Diminished - 7th mode of harmonic minor, diminished scale with altered intervals',
                references: [
                    {
                        "type": "verified_source",
                        "title": "C Altered Diminished Scale . All Piano Scales: Interactive piano app...",
                        "url": "https://pianoencyclopedia.com/scales/altered-diminished/C-altered-diminished.html",
                        "description": "C Altered Diminished scale . Play it on the piano: C, Db, Eb, Fb, Gb, Ab, and Bbb notes. Learn how to improvise, compose, its fingering and harmonizat",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Altered Diminished Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/altered-diminished/",
                        "description": "Altered Diminished scale for piano in all keys. Learn how to improvise and create your own music with the Altered Diminished scales . Master their har",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            augmented_hexatonic: {
                description: 'Augmented scale - hexatonic scale alternating minor thirds and half steps',
                culturalContext: {
                    region: "20th century classical development",
                    culturalGroup: "Modernist composers, contemporary theorists",
                    historicalPeriod: "20th century",
                    musicalFunction: "Contemporary composition, augmented chord contexts",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Augmented Hexatonic Piano Scales - Tomplay",
                        "url": "https://tomplay.com/tools/scales/piano/augmented_hexatonic/",
                        "description": "For piano students, the augmented hexatonic scale offers a fascinating study in symmetry. Its regular pattern of alternating intervals creates logical",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Augmented Hexatonic System | Cochrane Music",
                        "url": "https://cochranemusic.com/node/236",
                        "description": "Augmented Hexatonic is a symmetrical scale with two modes, both of which have a \"major seventh\" kind of flavour.The Augmented Hexatonic can be thought",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "G Augmented ( hexatonic ) scale — notes , intervals... | PianoChords",
                        "url": "https://pianochords.samesound.ru/en/scale/G/augmented-hexatonic",
                        "description": "G Augmented ( hexatonic ) scale : scale degrees, interval formula, keyboard diagram and audio example.Name: G Augmented hexatonic scale . Type: Symmet",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            prometheus_hexatonic: {
                description: 'Prometheus scale - Scriabin\'s mystic chord as a scale',
                culturalContext: {
                    region: "Russia, late Romantic/early modern period",
                    culturalGroup: "Russian late Romantic composers",
                    historicalPeriod: "Early 20th century",
                    musicalFunction: "Late Romantic composition, mystical/theosophical musical expression",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            hijaz: {
                description: 'Maqam Hijaz - characteristic augmented 2nd (12-TET approximation), with regional variations and scholarly debate about microtonal intervals',
                culturalContext: {
                    region: "Middle East, North Africa, Turkey",
                    culturalGroup: "Arabic maqam tradition, Turkish classical music, North African music",
                    historicalPeriod: "Medieval Islamic period to present",
                    musicalFunction: "Classical compositions, religious music, folk melodies",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Middle Eastern Piano Scales Explained - Cooper Piano",
                        "url": "https://cooperpiano.com/middle-eastern-piano-scales-explained/",
                        "description": "Mar 28, 2025 · The Hijaz scale is one of the most familiar Middle Eastern scales to Western listeners. Its defining feature is the augmented second in",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Hijaz Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/hijaz/",
                        "description": "Hijaz scale for piano in all keys. Learn how to improvise and create your own music with the Hijaz scales . Master their harmonization, notes, and mor",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Learn Arabic Guitar Scales Ultimate Guitar",
                        "url": "https://www.ultimate-guitar.com/lessons/scales/arabic_guitar_scales_-_lesson_1.html",
                        "description": "Phrygian Dominant ( Hijaz ). Today I share with you a simple backing track with scale diagrams that will help you start playing Arabic sound guitar ea",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            hijaz_kar: {
                description: 'Maqam Hijaz Kar (12-TET approximation)',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Arabic ( Hijaz Kar ) Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/arabic-hijaz-kar/",
                        "description": "The Arabic ( Hijaz Kar ) scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive musi",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Guitar - Scales - E Hijaz Kar - Chord.Rocks",
                        "url": "https://chord.rocks/guitar/scales/e-hijaz-kar",
                        "description": "E Hijaz Kar Scale lookup on Guitar. notes : E, F, G, A, B, C, D. aka: Hijazkiar, Bhairav. other names: E Hijazkiar, E Bhairav. Select a root note and ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Middle Eastern Maqams: Scales Lesson | Ultimate Guitar",
                        "url": "https://www.ultimate-guitar.com/lessons/scales/middle_eastern_maqams_scales_lesson.html",
                        "description": "Hijaz Kar Maqam has these intervals from the major scale : 1 b2 3 4 5 b6 7.Yeah dude, scales are totally dumb. So are chords and notes and rhythms. It",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            maqam_bayati: {
                description: 'Maqam Bayati (12-TET approximation) - fundamental maqam with different regional interpretations and scholarly debate about interval sizes',
                culturalContext: {
                    region: "Arab world, Turkey, Central Asia",
                    culturalGroup: "Arabic classical music, Turkish classical music, folk traditions",
                    historicalPeriod: "Medieval Islamic period to present",
                    musicalFunction: "Classical compositions, folk songs, religious music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Maqam Bayati - My Noota",
                        "url": "https://mynoota.com/en/blog/bayati",
                        "description": "Sep 20, 2024 · Maqam Bayati is characterized by its unique scale and intervallic structure, which imparts a distinct flavor that is instantly recogniz",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Maqam Bayati",
                        "url": "https://www.maqamworld.com/en/maqam/bayati.php",
                        "description": "Maqam Bayati is by far one of the most popular and common maqamat in the Arabic repertory. It is also the main maqam in the Bayati Family. Its scale s",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            maqam_rast: {
                description: 'Maqam Rast (12-TET approximation)',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Arabic Scales (Maqamat) – soundjuce",
                        "url": "https://soundjuce.com/blogs/news/arabic-scales-maqamat",
                        "description": "Maqam Rast Scale . Tip: Use it as the \"major scale\" of Arabic music ; warm, noble vibe. In Arabic music , maqamat (singular: maqam) are more than just",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "MofA Week 3: Music in theory , theory in practice - CCE wiki archived",
                        "url": "https://www.artsrn.ualberta.ca/fwa_mediawiki/index.php/MofA_Week_3:_Music_in_theory,_theory_in_practice",
                        "description": "Music Practicum and theory intro. Ear training. maqam Rast : scale degrees, qafla. Durub: wahda, maqsum.Pitch, interval , tetrachord, scale, mode (nag",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Maqam Rast",
                        "url": "https://www.maqamworld.com/en/maqam/rast.php",
                        "description": "Maqam Index. Pronunciation of Rast . Click the notes and hold using the mouse to hear them play.Its scale starts with the root Jins Rast on the tonic,",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            maqam_ajam: {
                description: 'Maqam Ajam (12-TET approximation; close to major/Ionian)',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Ajam ( maqam ) - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Ajam_(maqam)",
                        "description": "Characteristic trichord of maqam ajam on B flat. ‘ Ajam (Turkish: Acem) is the name of a maqam ( musical mode) in Arabic, Turkish, and related systems",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Arabic Scales (Maqamat) – soundjuce",
                        "url": "https://soundjuce.com/blogs/news/arabic-scales-maqamat",
                        "description": "Maqam Ajam Scale .Unlike Western music , which primarily uses whole and half steps, many Arabic maqamat incorporate microtonal intervals , particularl",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Ajam ( maqam ) — Wikipedia Republished // WIKI 2",
                        "url": "https://wiki2.org/en/Ajam_(maqam)",
                        "description": "Characteristic trichord of maqam ajam on B flat. ‘Ajam (Turkish: Acem) is the name of a maqam ( musical mode) in Arabic, Turkish, and related systems ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            maqam_nahawand: {
                description: 'Maqam Nahawand (12-TET approximation; close to natural minor)',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Arabic Scales (Maqamat) – soundjuce",
                        "url": "https://soundjuce.com/blogs/news/arabic-scales-maqamat",
                        "description": "Maqam Nahawand Scale . Tip: Arabic minor scale. In Arabic music , maqamat (singular: maqam) are more than just scales—they are expressive frameworks t",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "C Maqam Nahawand Scale . All Piano Scales: Interactive piano app...",
                        "url": "https://pianoencyclopedia.com/scales/maqam-nahawand/C-maqam-nahawand.html",
                        "description": "C Maqam Nahawand scale . Play it on the piano: C, D, Eb, C, G, Ab, and Bb notes.If we take a look a the key signature of the C Maqam Nahawand Scale we",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Maqam Nahawand",
                        "url": "https://www.maqamworld.com/en/maqam/nahawand.php",
                        "description": "Maqam Nahawand is the main maqam in the Nahawand Family. Its scale starts with the root Jins Nahawand on the tonic, followed by either Jins Hijaz or J",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            maqam_kurd: {
                description: 'Maqam Kurd (12-TET approximation; close to Phrygian)',
                references: [
                    {
                        "type": "verified_source",
                        "title": "Arabic Scales (Maqamat) – soundjuce",
                        "url": "https://soundjuce.com/blogs/news/arabic-scales-maqamat",
                        "description": "Maqam Kurd Scale .Unlike Western music , which primarily uses whole and half steps, many Arabic maqamat incorporate microtonal intervals , particularl",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "C Maqam Kurd Scale . All Piano Scales: Interactive piano app will let...",
                        "url": "https://pianoencyclopedia.com/scales/maqam-kurd/C-maqam-kurd.html",
                        "description": "C Maqam Kurd scale . Play it on the piano: C, Db, Eb, F, G, Ab, and Bb notes. Learn how to improvise, compose, its fingering and harmonization. Downlo",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Maqam Kurd Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/maqam-kurd/",
                        "description": "Maqam Kurd scale for piano in all keys. Learn how to improvise and create your own music with the Maqam Kurd scales . Master their harmonization, note",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            persian: {
                description: 'Persian scale - similar to Locrian ♮3, with scholarly debate about its relationship to traditional Persian dastgah system',
                culturalContext: {
                    region: "Iran, Central Asia, Afghanistan",
                    culturalGroup: "Persian classical music, traditional dastgah system",
                    historicalPeriod: "Ancient Persian empire to present",
                    musicalFunction: "Classical Persian compositions, traditional melodies",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Persian Music Theory – RHYTHMITICA | ONLINE MUSIC ACADEMY",
                        "url": "https://rhythmitica.com/persian-music-theory/",
                        "description": "Dec 4, 2023 · There are three theories about Persian music intervals . The first one, which was done in 1920 by Ali Naqi Vaziri, identifies Persian mu",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Persian Music Scales - Article - Google Sites",
                        "url": "https://sites.google.com/view/persianmusicscales/article",
                        "description": "Interval Representation Persian music is built on a complex system of modal structures, known as \"Dastgah,\" which are characterized by specific tonal ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "(PDF) Exploring Persian Music Scales through Interactive ... 2 - Intervals and s",
                        "url": "https://www.researchgate.net/publication/386572215_Exploring_Persian_Music_Scales_through_Interactive_Visualizations",
                        "description": "Dec 9, 2024 · Gridded visualization of Persian musical scales , illustrating the angular distribution of tonal intervals . Sep 22, 2009 · In the cours",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            raga_bhairav: {
                description: 'Raga Bhairav (Bhairavi Thaat) - morning raga with scholarly debate about its relationship to ancient scales and regional variations',
                culturalContext: {
                    region: "Northern India, Pakistan",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Ancient Vedic period to present",
                    musicalFunction: "Morning raga, devotional music, classical compositions",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Chords For Raga Bhairav Part I Bhairav PDF",
                        "url": "https://www.scribd.com/document/435989428/chords-for-raga-bhairav-part-I-bhairav-pdf",
                        "description": "The document provides information about the Raga Bhairav scale and chords that can be derived from its melodic phrases. Raga Bhairav has a double harm",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Raga Bhairav - Musicianself",
                        "url": "https://musicianself.com/wp-content/uploads/products/chordsanyragascalesong/bhaiirav/chords-for-raga-bhairav-part-I-bhairav.pdf",
                        "description": "It is a V to I movement of chords, giving a complete resolution to the chord movement. If we just need one chord with both the B and C notes, the C ma",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Raga Bhairavi Tutorial and Scale Practice. - YouTube",
                        "url": "https://www.youtube.com/watch?v=ddw1rC3nXg4",
                        "description": "In this tutorial, we take a look at aroh and avaroh of raga Bhairavi or Phrygian mode and do scale exercises at the end. Notes are : Sa, Komal Ri, Kom",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            raga_todi: {
                description: 'Raga Todi - morning raga with distinctive flat 2nd and 6th degrees',
                culturalContext: {
                    region: "North India",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Classical Indian music tradition to present",
                    musicalFunction: "Morning raga, classical Indian compositions, devotional music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Raga Todi: A Technical Guide 2025 - Musikclass Raga Todi - kksongs.org Images To",
                        "url": "https://musikclass.bookmetickets.com/content/raga-todi-a-technical-guide",
                        "description": "Raga Todi , an illustrious sampurna raga in Carnatic music, encompasses all seven notes of the Carnatic music scale . As a melakarta raga, it serves a",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            raga_marwa: {
                description: 'Raga Marwa - evening raga with distinctive augmented 4th and flat 2nd',
                culturalContext: {
                    region: "North India",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Classical Indian music tradition to present",
                    musicalFunction: "Evening raga, classical Indian compositions, meditative music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Raga Marwa - KKSongs.org",
                        "url": "https://kksongs.org/raga/list/marwa.html",
                        "description": "Marwa that has a Pa in it, however, Marwa ’ s behavior and scale is absolutely different. Usually, almost all representative ragas will share the same",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            raga_purvi: {
                description: 'Raga Purvi - evening raga from Purvi thaat with distinctive flat 2nd and augmented 4th',
                culturalContext: {
                    region: "North India",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Classical Indian music tradition to present",
                    musicalFunction: "Evening raga, classical Indian compositions, devotional music",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            raga_kafi: {
                description: 'Raga Kafi (Kafi Thaat) - natural minor equivalent in Indian classical music',
                culturalContext: {
                    region: "North India",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Classical Indian music tradition to present",
                    musicalFunction: "Classical Indian compositions, folk-influenced ragas, devotional music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Difference b/n scale & raga - Pt. 1 |One scale, many ragas ... Different Kinds o",
                        "url": "https://musescore.com/raag-hindustani/ragas-of-the-kafi-scale-dorian-mode",
                        "description": "Within the framework of the scale , the ascending and descending scales are defined separately. This makes it possible to get many ragas from each sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Different Kinds of Ragas by Structure - Raag Hindustani Raga Kafi- A Scale of Ro",
                        "url": "https://raag-hindustani.com/Scales2.html",
                        "description": "This page gives you an introduction to the structures of ragas using a few light ragas as examples – Kafi , Durga, Dhani, Des, Pahadi, Bhairavi and Ba",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            raga_bhairavi: {
                description: 'Raga Bhairavi - morning raga with all flat degrees except tonic and fifth',
                culturalContext: {
                    region: "North India",
                    culturalGroup: "Hindustani classical music tradition",
                    historicalPeriod: "Classical Indian music tradition to present",
                    musicalFunction: "Morning raga, classical Indian compositions, devotional music, concluding raga",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Bhairavi (Carnatic) - Wikipedia Raga Bhairav - Musicianself Raga Bhairavi - Ocea",
                        "url": "https://en.wikipedia.org/wiki/Bhairavi_(Carnatic)",
                        "description": "Bhairavi is a janya rāgam in Carnatic music ( musical scale of South Indian classical music). Though it is a sampoorna rāgam ( scale having all 7 note",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            spanish_phrygian: {
                description: 'Spanish Phrygian - Phrygian dominant with scholarly debate about its relationship to ancient Greek modes and Arabic maqam influences',
                culturalContext: {
                    region: "Andalusia, Spain, North Africa",
                    culturalGroup: "Flamenco tradition, Andalusian music, Moorish influences",
                    historicalPeriod: "Medieval Moorish period to present",
                    musicalFunction: "Flamenco guitar, cante jondo, traditional Spanish folk music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Scale 1467: \"Spanish Phrygian\" - Ian Ring",
                        "url": "https://ianring.com/musictheory/scales/1467",
                        "description": "Notes are arranged in a lattice where perfect 5th intervals are from left to right, major third are northeast, and major 6th intervals are northwest. ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            flamenco: {
                description: 'Flamenco mode - complex modal system with Arabic, Romani, and Spanish influences',
                culturalContext: {
                    region: "Andalusia, Spain",
                    culturalGroup: "Flamenco artists, Andalusian culture",
                    historicalPeriod: "Medieval Moorish period to present",
                    musicalFunction: "Flamenco guitar, cante jondo, traditional Spanish dance music",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Flamenco mode - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Flamenco_mode",
                        "description": "In music theory , the flamenco mode (also Major-Phrygian) is a harmonized mode or scale abstracted from its use in flamenco music. In other words, it ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Flamenco Guitar Scale | ChordsScales",
                        "url": "https://www.chordsscales.com/scales/guitar/type/flamenco",
                        "description": "Flamenco Scales/Mode for Guitar Scale typ : Flamenco Formula in degree of C Flamenco scale : 1-b2-b3-3-4-5-b6-b7 Interval Formula : h W h h W h W W Ex",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Spanish Guitar Scales: The Soul of Flamenco Music",
                        "url": "https://classicalguitarshed.com/spanish-guitar-scales/",
                        "description": "This article explores the fundamental scales behind Spanish guitar music, with a special focus on the Phrygian Mode. We explore the scale and how guit",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            bebop_major: {
                description: 'Major scale with chromatic passing tone between 5th and 6th degrees',
                culturalContext: {
                    region: "United States",
                    culturalGroup: "Bebop jazz musicians",
                    historicalPeriod: "1940s to present",
                    musicalFunction: "Jazz improvisation, bebop melodic lines",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Bebop scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Bebop_scale",
                        "description": "The bebop major scale is derived from the Ionian mode (major scale) and has a chromatic passing note added (a ♯ 5) between the 5th and 6th degrees of ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Scale 2997: \"Bebop Major\" - Ian Ring Images A Bebop Major - Music Theory The 5 T",
                        "url": "https://ianring.com/musictheory/scales/2997",
                        "description": "These are the common triads (major, minor, augmented and diminished) that you can create from members of this scale. See full list on ianring.com Mode",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "A Bebop Major - Music Theory",
                        "url": "https://pianoowl.com/scales/bebop-major/a-bebop-major",
                        "description": "Jazz musicians often practice applying the bebop major scale through all twelve keys, transposing it to match tonic major chords throughout the circle",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            bebop_minor: {
                description: 'Dorian + major 3rd passing tone - bebop scale for minor ii-V-i progressions',
                culturalContext: {
                    region: "United States",
                    culturalGroup: "Bebop jazz musicians",
                    historicalPeriod: "1940s to present",
                    musicalFunction: "Jazz improvisation over minor chords, bebop melodic lines",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Scale 1725: \"Bebop Minor\" - Ian Ring Images The 5 Types Of Bebop Scales And How ",
                        "url": "https://ianring.com/musictheory/scales/1725",
                        "description": "These are the common triads (major, minor , augmented and diminished) that you can create from members of this scale . See full list on ianring.com Mo",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "The G sharp Bebop minor scale - sonid.app",
                        "url": "https://www.sonid.app/en/scale/g-sharp/bebop-minor",
                        "description": "This is how you play the G sharp Bebop minor scale . Checkout our guitar-diagrams, piano and sheetmusic images in any key!",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            bebop_dorian: {
                description: 'Dorian + major 3rd passing tone - modal bebop scale for Dorian contexts',
                culturalContext: {
                    region: "United States",
                    culturalGroup: "Bebop and modal jazz musicians",
                    historicalPeriod: "1940s-1960s development",
                    musicalFunction: "Modal jazz improvisation, bebop melodic lines over Dorian chords",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Minor Bebop Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/minor-bebop-scale/",
                        "description": "🎹 The minor bebop scale, also known as the bebop dorian scale, is an 8-note scale used mainly for jazz soloing and improvisation. Based on the Dorian ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "BEBOP DORIAN - ROB SILVER",
                        "url": "https://www.rob-silver.com/2012/05/bebop-dorian.html",
                        "description": "May 26, 2012 · THE BEBOP DORIAN SCALE is an eight note (or eight tone if you are American) scale that contains the intervals : 1,2,b3,4,5,6,b7,7.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Dorian Bebop Scales - overview with pictures",
                        "url": "https://www.pianoscales.org/bebop-dorian.html",
                        "description": "As the name imply, this scale is fitting for bebop jazz. Bebop Dorian is similar to the Minor Bebop, only one note differs. It is also the same as Dor",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            barry_major6dim: {
                description: 'Barry Harris: Major 6th + diminished passing tones',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            barry_dom7dim: {
                description: 'Barry Harris: Dominant 7th + diminished passing tones',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            barry_minor6dim: {
                description: 'Barry Harris: Minor 6th + diminished passing tones',
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            enigmatic: {
                description: 'Enigmatic scale - used by Verdi and other composers for mysterious effects',
                culturalContext: {
                    region: "Italy, 19th century opera",
                    culturalGroup: "Italian Romantic composers",
                    historicalPeriod: "Late 19th century",
                    musicalFunction: "Operatic composition, exotic harmonic color",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Enigmatic Scale - Theory With Guitar Charts and Shapes",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/other-scales/the-enigmatic-scale-for-guitar.html",
                        "description": "Here are seven positions to play the Enigmatic scale all over the guitar neck using the 3NPS technique. This PDF eBook provides over 550 guitar chord ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Unlocking the Enigmatic Scale: A Comprehensive Guide",
                        "url": "https://www.musicogram.com/en/post/unlocking-the-enigmatic-scale-a-comprehensive-guide/",
                        "description": "The Enigmatic Scale is a heptatonic (seven-note) scale with a unique and asymmetrical intervallic pattern. The ascending pattern, measured in semitone",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Enigmatic Scales - overview with pictures",
                        "url": "https://pianoscales.org/enigmatic.html",
                        "description": "Notice that the Enigmatic Scale is played differently, with one variation, ascending and descending. The diagrams show the ascending versions of the s",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            neapolitan_major: {
                description: 'Neapolitan major - major scale with flattened 2nd degree, derived from Neapolitan sixth chord',
                culturalContext: {
                    region: "Italy, classical period development",
                    culturalGroup: "Classical and Romantic composers",
                    historicalPeriod: "18th-19th centuries",
                    musicalFunction: "Classical composition, exotic harmonic color, chromatic harmony",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Scale 2731: \"Neapolitan Major\" - Ian Ring",
                        "url": "https://ianring.com/musictheory/scales/2731",
                        "description": "Notes are arranged in a lattice where perfect 5th intervals are from left to right, major third are northeast, and major 6th intervals are northwest. ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Neapolitan Major Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/neapolitan-major/",
                        "description": "Neapolitan Major scale for piano in all keys. Learn how to improvise and create your own music with the Neapolitan Major scales . Master their harmoni",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Neapolitan Major Scale - freemusiclessons4u.com",
                        "url": "https://freemusiclessons4u.com/Guitar/Scales/Neopolitan_Major/neopolitan_major_scales_R.htm",
                        "description": "The Neapolitan Major scale is similar to a Major scale with the 2nd and 3rd notes lowered by a half tone. There are 3 types of scale fingering pattern",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            romanian_minor: {
                description: 'Romanian minor - Dorian mode with raised 4th degree, characteristic of Romanian folk music',
                culturalContext: {
                    region: "Romania, Eastern Europe",
                    culturalGroup: "Romanian folk music traditions",
                    historicalPeriod: "Traditional folk music to present",
                    musicalFunction: "Romanian folk melodies, Eastern European classical compositions",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Romanian Minor Scale - Guitar Lesson With Diagrams",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/other-scales/the-romanian-minor-scale-for-guitar-diagrams-theory-and-charts.html",
                        "description": "These four \"One Octave\" Shapes will help you learn and practice the Romanian minor scale in a simple and efficient way. Here is the Romanian minor sca",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Romanian Minor Scales Guide | PDF - Scribd",
                        "url": "https://www.scribd.com/document/421186341/Piano-Romanian-Scales-Overview-With-Pictures",
                        "description": "The document discusses the Romanian minor scale, which has a flat third, sharp fourth, and flat seventh note. It provides the note names for each of t",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "How to play A romanian minor scale on guitar and piano? What ...",
                        "url": "https://www.solfej.io/scales/a-romanian-minor",
                        "description": "What notes and intervals are in A romanian minor ? Find out how and search through 1000s of scales.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            ukrainian_dorian: {
                description: 'Ukrainian Dorian - Dorian mode with raised 4th degree, characteristic of Ukrainian folk music',
                culturalContext: {
                    region: "Ukraine, Eastern Europe",
                    culturalGroup: "Ukrainian folk music traditions",
                    historicalPeriod: "Traditional folk music to present",
                    musicalFunction: "Ukrainian folk melodies, Eastern European classical compositions",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Ukrainian Dorian scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Ukrainian_Dorian_scale",
                        "description": "In music, the Ukrainian Dorian scale (or the Dorian ♯4 scale) is a modified minor scale with raised 4th and 6th degrees (when compared to the natural ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Mi Sheberach Scales for piano (Dorian #4) - overview with ...",
                        "url": "https://pianoscales.org/mi-sheberach.html",
                        "description": "Mi Sheberach is rooted in the music of Eastern Europe and it is also known as Ukrainian Dorian Scale , or simply Dorian #4 Scale. The Dorian #4 Scale ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Ukrainian Dorian Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/ukrainian-dorian/",
                        "description": "The Ukrainian Dorian scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive music ca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            leading_whole_tone: {
                description: 'Whole tone + leading tone - whole tone scale with added leading tone for tonal resolution',
                culturalContext: {
                    region: "20th century theoretical development",
                    culturalGroup: "Modern composers and theorists",
                    historicalPeriod: "20th century",
                    musicalFunction: "Contemporary composition, impressionist-influenced harmony with tonal resolution",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Musical Scale Info: A Leading Whole Tone - Scales-Chords.com",
                        "url": "https://www.scales-chords.com/scaleinfo.php?skey=A&sname=Leading+Whole+Tone",
                        "description": "Detailed information for the scale A Leading Whole Tone . Notes , Intervals and relations to other scales in the database.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            chacarera: {
                description: 'Traditional Argentine folk dance scale from Santiago del Estero region, fundamental to chacarera music',
                culturalContext: {
                    region: "Argentina, particularly Santiago del Estero province",
                    culturalGroup: "Argentine folk traditions, rural communities",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Traditional folk dance music, social gatherings",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            zamba: {
                description: 'Traditional Argentine folk dance scale, characterized by its melancholic minor character and distinctive rhythmic patterns',
                culturalContext: {
                    region: "Northwestern Argentina, particularly Salta and Tucumán provinces",
                    culturalGroup: "Argentine folk traditions, indigenous and Spanish colonial influences",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Slow, expressive folk dance music, courtship rituals",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Geronimo Bianqui Pinero - Zamba | PDF | Tempo | Musical Notation",
                        "url": "https://www.scribd.com/document/529506711/Geronimo-Bianqui-Pinero-Zamba",
                        "description": "This document provides a musical score and notes for \" Zamba \", a traditional Argentine dance composed by Geronimo Bianqui Pinero. The 3/4 time signat",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Zamba from Suite del Recuerdo Sheet music for Guitar (Solo ... Musical Scale Fin",
                        "url": "https://musescore.com/user/14484256/scores/11110834",
                        "description": "Download and print in PDF or MIDI free sheet music of Suite del Recuerdo (2. Zamba ) - José Luis Merlín for Suite Del Recuerdo (2. Zamba ) by José Lui",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            cueca: {
                description: 'National dance of Chile, featuring distinctive mixolydian character with flattened seventh degree',
                culturalContext: {
                    region: "Chile, Peru, Bolivia, Argentina",
                    culturalGroup: "Andean folk traditions, mestizo cultural synthesis",
                    historicalPeriod: "18th century to present",
                    musicalFunction: "National folk dance, celebrations, cultural identity expression",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            marinera: {
                description: 'Peruvian national dance scale featuring phrygian dominant character with distinctive augmented second interval',
                culturalContext: {
                    region: "Peru, particularly coastal regions",
                    culturalGroup: "Peruvian criollo traditions, Afro-Peruvian influences",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "National folk dance, courtship dance, cultural celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Marinera Limeña Sheet Music for Piano, Flute, Oboe, Bassoon ... Musical Scale Fi",
                        "url": "https://musescore.com/user/48314331/scores/11670409",
                        "description": "Download and print in PDF or MIDI free sheet music of Marinera Limeña - kraulioale for Marinera Limeña arranged by kraulioale for Piano, Flute, Oboe, ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            bambuco: {
                description: 'Colombian folk music scale in natural minor, fundamental to Andean Colombian musical traditions',
                culturalContext: {
                    region: "Colombia, particularly Andean regions",
                    culturalGroup: "Colombian folk traditions, mestizo cultural synthesis",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Traditional folk music, serenades, cultural celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Bambuco no. 1 en Si menor – Adolfo Mejía Navarro Sheet Music ... Images A small ",
                        "url": "https://musescore.com/user/5732991/scores/20640157",
                        "description": "Download and print in PDF or MIDI free sheet music of Bambuco no. 1 en Si menor - Adolfo Mejía Navarro for Bambuco No. 1 En Si Menor by Adolfo Mejía N",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            joropo: {
                description: 'Venezuelan and Colombian plains music scale in major mode, characteristic of llanero musical traditions',
                culturalContext: {
                    region: "Venezuelan and Colombian plains (Los Llanos)",
                    culturalGroup: "Llanero culture, cattle-herding communities",
                    historicalPeriod: "18th century to present",
                    musicalFunction: "Traditional plains music, cattle-herding songs, social dances",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            milonga: {
                description: 'Argentine folk music scale, precursor to tango, characterized by its melancholic harmonic minor character',
                culturalContext: {
                    region: "Argentina, particularly Buenos Aires and rural pampas",
                    culturalGroup: "Argentine gaucho culture, urban working class",
                    historicalPeriod: "Mid-19th century to present",
                    musicalFunction: "Folk narrative songs, early tango development",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "MUSIC THEORY 842: Are these intervals the same ... - YouTube Milonga (dance) - W",
                        "url": "https://www.youtube.com/watch?v=HF-ir5yXpVk",
                        "description": "🎵 MUSIC THEORY 842: Are these intervals the same? #bachdmc # music #tutorial #musictheory # intervals Bach DMC 1.45K subscribers Subscribe The beat of",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            tango_minor: {
                description: 'Traditional tango scale in harmonic minor, fundamental to Argentine tango music',
                culturalContext: {
                    region: "Argentina, particularly Buenos Aires",
                    culturalGroup: "Urban Argentine culture, European immigrant communities",
                    historicalPeriod: "Late 19th century to present",
                    musicalFunction: "Tango dance music, urban popular music",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            vidala: {
                description: 'Traditional Argentine folk scale in minor pentatonic, characteristic of northwestern Argentina',
                culturalContext: {
                    region: "Northwestern Argentina, particularly Salta and Jujuy provinces",
                    culturalGroup: "Indigenous Quechua and mestizo communities",
                    historicalPeriod: "Pre-Columbian to present",
                    musicalFunction: "Ritual songs, work songs, traditional ceremonies",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            tonada: {
                description: 'Chilean folk song scale in major mode, fundamental to traditional Chilean music',
                culturalContext: {
                    region: "Chile, particularly central valleys",
                    culturalGroup: "Chilean rural communities, mestizo culture",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Folk songs, rural celebrations, traditional storytelling",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Music Scales: A Beginner's Guide - Hello Music Theory Tonada - Wikiwand Scale De",
                        "url": "https://hellomusictheory.com/learn/music-scales-beginners-guide/",
                        "description": "A scaleis a group of notes that are arranged by ascending or descending order of pitch . In an ascending scale, each note is higher in pitch than the ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            huayno: {
                description: 'Traditional Andean folk scale, fundamental to Peruvian and Bolivian highland music',
                culturalContext: {
                    region: "Peruvian and Bolivian Andes, highland regions",
                    culturalGroup: "Quechua and Aymara indigenous communities",
                    historicalPeriod: "Pre-Columbian to present",
                    musicalFunction: "Traditional dances, ceremonial music, community celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Huayño | Andean, Peruvian, Folk Music | Britannica Huayno Intros: Musical Guide ",
                        "url": "https://www.britannica.com/art/huayno",
                        "description": "The music is in 2/4 time. The melodies are rhythmic and pentatonic, i.e., built on a scale of five notes, as D–E–G–A–B–D. Couples perform various figu",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Benjamin A. Wigley - Huayno-Peruvian Music - Google Sites",
                        "url": "https://sites.google.com/view/benjaminwigleyportfolio/huayno-peruvian-music",
                        "description": "Melody: The melodies are rhythmic and pentatonic, built on a scale of five notes , as D–E–G–A–B–D. Rhythms: The dotted 8th note rhythm is very common ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            yaraví: {
                description: 'Traditional Peruvian melancholic song scale, characterized by its phrygian modal character',
                culturalContext: {
                    region: "Peru, particularly Arequipa and southern highlands",
                    culturalGroup: "Peruvian mestizo and indigenous communities",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Melancholic songs, love ballads, traditional poetry",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            cumbia: {
                description: 'Colombian coastal folk dance scale in mixolydian mode, fundamental to Caribbean Colombian music',
                culturalContext: {
                    region: "Colombian Caribbean coast",
                    culturalGroup: "Afro-Colombian, indigenous, and mestizo communities",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Traditional dance music, celebrations, cultural festivals",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Would there be a scale or technique to describe or explain ...",
                        "url": "https://www.reddit.com/r/musictheory/comments/189hs5y/would_there_be_a_scale_or_technique_to_describe/",
                        "description": "Normally Latin cumbia involves really simple chord progressions that involve dominant 7ths (ex. A, E7) over a very basic 2/4 or 4/4 time signature, ty",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "MUSIC THEORY 842: Are these intervals the same ... - YouTube Essential Music The",
                        "url": "https://www.youtube.com/watch?v=HF-ir5yXpVk",
                        "description": "🎵 MUSIC THEORY 842: Are these intervals the same? #bachdmc # music #tutorial #musictheory # intervals Bach DMC 1.45K subscribers Subscribe 5 days ago ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            vallenato: {
                description: 'Colombian folk music scale in major mode, characteristic of vallenato accordion music',
                culturalContext: {
                    region: "Colombian Caribbean coast, particularly Valledupar region",
                    culturalGroup: "Colombian coastal communities, mestizo culture",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Traditional accordion music, storytelling songs, regional celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            merengue_venezolano: {
                description: 'Venezuelan merengue scale in mixolydian mode, distinct from Dominican merengue',
                culturalContext: {
                    region: "Venezuela, particularly Caracas and central regions",
                    culturalGroup: "Venezuelan urban and rural communities",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Traditional dance music, social celebrations, folk festivals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            samba: {
                description: 'Brazilian samba scale in mixolydian mode, fundamental to Brazilian popular music',
                culturalContext: {
                    region: "Brazil, particularly Rio de Janeiro and Bahia",
                    culturalGroup: "Afro-Brazilian communities, urban Brazilian culture",
                    historicalPeriod: "Late 19th century to present",
                    musicalFunction: "Carnival music, dance music, popular celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "MUSIC THEORY 842: Are these intervals the same ... - YouTube Samba music - Music",
                        "url": "https://www.youtube.com/watch?v=HF-ir5yXpVk",
                        "description": "🎵 MUSIC THEORY 842: Are these intervals the same? #bachdmc # music #tutorial #musictheory # intervals Bach DMC 1.45K subscribers Subscribe Learn and r",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            bossa_nova: {
                description: 'Brazilian bossa nova scale in major mode with jazz influences, characteristic of sophisticated Brazilian popular music',
                culturalContext: {
                    region: "Brazil, particularly Rio de Janeiro",
                    culturalGroup: "Brazilian middle class, jazz-influenced musicians",
                    historicalPeriod: "1950s to present",
                    musicalFunction: "Sophisticated popular music, jazz-influenced compositions, urban entertainment",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            choro: {
                description: 'Brazilian choro scale in natural minor, fundamental to Brazilian instrumental music',
                culturalContext: {
                    region: "Brazil, particularly Rio de Janeiro",
                    culturalGroup: "Brazilian urban musicians, European immigrant communities",
                    historicalPeriod: "Late 19th century to present",
                    musicalFunction: "Instrumental virtuoso music, urban entertainment, musical competitions",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            forró: {
                description: 'Brazilian northeastern folk dance scale in mixolydian mode, characteristic of accordion-based music',
                culturalContext: {
                    region: "Northeastern Brazil, particularly Pernambuco and Ceará",
                    culturalGroup: "Brazilian northeastern rural communities",
                    historicalPeriod: "Early 20th century to present",
                    musicalFunction: "Traditional dance music, rural celebrations, regional festivals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            morenada: {
                description: 'Bolivian folk dance scale in phrygian mode, characteristic of Altiplano ceremonial music',
                culturalContext: {
                    region: "Bolivia, particularly La Paz and Altiplano regions",
                    culturalGroup: "Aymara indigenous communities, mestizo urban culture",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Ceremonial dance music, religious festivals, cultural celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            tinku: {
                description: 'Bolivian ritual combat dance scale in harmonic minor, characteristic of highland ceremonial music',
                culturalContext: {
                    region: "Bolivia, particularly Potosí and highland regions",
                    culturalGroup: "Quechua and Aymara indigenous communities",
                    historicalPeriod: "Pre-Columbian to present",
                    musicalFunction: "Ritual combat dances, ceremonial music, community festivals",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Instruments — TINKU Music Scale Notes | Мusic Gateway Musical Scale Finder Tool ",
                        "url": "https://tinkumusic.com/instruments/",
                        "description": "The WIND family of instruments consists of the Zampoña, Toyos, Antara, Maltas, Rondador, Quena & Quenacho as well as some unique instruments designed ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            pasillo: {
                description: 'Ecuadorian waltz-like folk dance scale in natural minor, characteristic of Andean romantic music',
                culturalContext: {
                    region: "Ecuador, particularly highland regions",
                    culturalGroup: "Ecuadorian mestizo communities, urban middle class",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Romantic songs, social dances, cultural celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Pasillo Sheet Music for Piano (Solo) Easy | MuseScore.com Music Theory Cheat She",
                        "url": "https://musescore.com/user/45085439/scores/10495282",
                        "description": "Download and print in PDF or MIDI free sheet music of Pasillo - dabguitar93 for Pasillo arranged by dabguitar93 for Piano (Solo) An interactive music ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            sanjuanito: {
                description: 'Ecuadorian indigenous folk dance scale in mixolydian mode, fundamental to highland celebrations',
                culturalContext: {
                    region: "Ecuador, particularly Imbabura and highland provinces",
                    culturalGroup: "Indigenous Quechua communities, mestizo culture",
                    historicalPeriod: "Pre-Columbian to present",
                    musicalFunction: "Traditional dances, religious festivals, community celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            guarania: {
                description: 'Paraguayan folk song scale in natural minor, characteristic of romantic Paraguayan music',
                culturalContext: {
                    region: "Paraguay, particularly Asunción and central regions",
                    culturalGroup: "Paraguayan mestizo culture, Guaraní-Spanish synthesis",
                    historicalPeriod: "1920s to present",
                    musicalFunction: "Romantic songs, cultural identity expression, popular music",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            polka_paraguaya: {
                description: 'Paraguayan polka scale in major mode, adapted from European polka with local characteristics',
                culturalContext: {
                    region: "Paraguay, throughout the country",
                    culturalGroup: "Paraguayan rural and urban communities",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Traditional dances, social celebrations, folk festivals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            candombe: {
                description: 'Uruguayan Afro-descendant music scale in natural minor, fundamental to Uruguayan cultural identity',
                culturalContext: {
                    region: "Uruguay, particularly Montevideo",
                    culturalGroup: "Afro-Uruguayan communities, urban Uruguayan culture",
                    historicalPeriod: "Colonial period to present",
                    musicalFunction: "Traditional drum music, carnival celebrations, cultural resistance",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            pentatonic_african: {
                description: 'Traditional African pentatonic scale found across multiple regions, fundamental to many African musical traditions',
                culturalContext: {
                    region: "Sub-Saharan Africa, particularly West and Central Africa",
                    culturalGroup: "Various African ethnic groups including Yoruba, Akan, Shona, and others",
                    historicalPeriod: "Ancient origins to present",
                    musicalFunction: "Traditional songs, ceremonial music, work songs, storytelling",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            heptatonic_akan: {
                description: 'Seven-tone scale from Akan musical traditions of Ghana, characterized by specific interval patterns used in traditional Akan music',
                culturalContext: {
                    region: "Ghana, particularly Ashanti and other Akan regions",
                    culturalGroup: "Akan people including Ashanti, Fante, Akuapem, and other subgroups",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Court music, ceremonial occasions, traditional dances, storytelling",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            mbira_tuning: {
                description: 'Traditional tuning system of the mbira dzavadzimu, the ancestral mbira of the Shona people of Zimbabwe',
                culturalContext: {
                    region: "Zimbabwe, particularly among Shona communities",
                    culturalGroup: "Shona people of Zimbabwe",
                    historicalPeriod: "Ancient origins, documented from at least 1000 CE to present",
                    musicalFunction: "Spiritual ceremonies, ancestor communication, healing rituals, social gatherings",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Tinotenda -mbira tunings",
                        "url": "https://tinotenda.org/tunings.htm",
                        "description": "Several authors have attempted to represent some common mbira tunings in terms of Western scales or modes. How accurate and how helpful this is perhap",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            kora_scale: {
                description: 'Traditional scale used in kora music of the Mandinka people, fundamental to West African griot traditions',
                culturalContext: {
                    region: "West Africa, particularly Mali, Senegal, Gambia, Guinea-Bissau",
                    culturalGroup: "Mandinka people and other Mande groups, griot families",
                    historicalPeriod: "Medieval Mali Empire to present (documented from 13th century)",
                    musicalFunction: "Griot storytelling, praise songs, historical narratives, court music",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            balafon_scale: {
                description: 'Traditional scale of the balafon xylophone, central to Mande musical traditions across West Africa',
                culturalContext: {
                    region: "West Africa, particularly Mali, Burkina Faso, Ivory Coast, Guinea",
                    culturalGroup: "Mande peoples including Bambara, Malinke, and related groups",
                    historicalPeriod: "Ancient origins, documented from medieval period to present",
                    musicalFunction: "Traditional ceremonies, social gatherings, praise music, storytelling accompaniment",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            xylophone_chopi: {
                description: 'Pentatonic scale of the Chopi timbila xylophone orchestras of Mozambique, UNESCO recognized cultural heritage',
                culturalContext: {
                    region: "Southern Mozambique, particularly Inhambane Province",
                    culturalGroup: "Chopi people of Mozambique",
                    historicalPeriod: "Traditional origins to present, UNESCO recognition in 2005",
                    musicalFunction: "Timbila orchestras, ceremonial music, social commentary, cultural preservation",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            yoruba_traditional: {
                description: 'Traditional Yoruba scale used in ceremonial and social music, fundamental to Yoruba musical expression',
                culturalContext: {
                    region: "Nigeria, Benin, Togo, and Yoruba diaspora communities",
                    culturalGroup: "Yoruba people",
                    historicalPeriod: "Ancient origins to present",
                    musicalFunction: "Religious ceremonies, social gatherings, praise singing, traditional festivals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            ewe_traditional: {
                description: 'Traditional Ewe scale from Ghana and Togo, characterized by complex polyrhythmic accompaniment',
                culturalContext: {
                    region: "Ghana, Togo, and southeastern regions",
                    culturalGroup: "Ewe people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional dances, ceremonial music, social celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            hausa_pentatonic: {
                description: 'Traditional Hausa pentatonic scale used in praise singing and ceremonial music',
                culturalContext: {
                    region: "Northern Nigeria, Niger, and Hausa-speaking regions",
                    culturalGroup: "Hausa people",
                    historicalPeriod: "Medieval Islamic period to present",
                    musicalFunction: "Praise singing, ceremonial music, traditional storytelling",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            fulani_pastoral: {
                description: 'Traditional Fulani pastoral scale reflecting nomadic cattle-herding culture',
                culturalContext: {
                    region: "West and Central Africa, particularly Sahel region",
                    culturalGroup: "Fulani (Fula) people",
                    historicalPeriod: "Ancient nomadic traditions to present",
                    musicalFunction: "Pastoral songs, cattle-herding calls, traditional ceremonies",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            mandinka_griot: {
                description: 'Traditional Mandinka griot scale, distinct from kora tuning, used for historical narratives',
                culturalContext: {
                    region: "Mali, Senegal, Gambia, Guinea-Bissau, and Mandinka regions",
                    culturalGroup: "Mandinka griot families and oral historians",
                    historicalPeriod: "Medieval Mali Empire to present",
                    musicalFunction: "Historical narratives, genealogical recitation, praise singing",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            wolof_sabar: {
                description: 'Traditional Wolof sabar drumming scale from Senegal, characterized by complex rhythmic patterns',
                culturalContext: {
                    region: "Senegal, particularly Dakar and surrounding regions",
                    culturalGroup: "Wolof people",
                    historicalPeriod: "Traditional origins to present, modern urban development",
                    musicalFunction: "Traditional ceremonies, modern celebrations, urban dance music",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            pygmy_polyphonic: {
                description: 'Traditional Central African Pygmy polyphonic scale, fundamental to forest-dwelling communities',
                culturalContext: {
                    region: "Central African rainforests, particularly Cameroon, Central African Republic, Democratic Republic of Congo",
                    culturalGroup: "Baka, Aka, Efe, and other Pygmy groups",
                    historicalPeriod: "Ancient forest traditions to present",
                    musicalFunction: "Polyphonic singing, hunting songs, forest ceremonies, healing rituals",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Regional musical styles and their characteristics | World Music Class...",
                        "url": "https://fiveable.me/world-music/unit-2/regional-musical-styles-characteristics/study-guide/EwhrCzJEEVH0NdHS",
                        "description": "Pygmy polyphonic singing a unique tradition from this region. East African music characterized by the use of pentatonic scales , vocal polyphony , and",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            bantu_traditional: {
                description: 'Traditional Bantu scale representing common musical elements across Bantu-speaking peoples',
                culturalContext: {
                    region: "Sub-Saharan Africa, particularly Central and Southern Africa",
                    culturalGroup: "Various Bantu-speaking peoples",
                    historicalPeriod: "Ancient Bantu migrations to present",
                    musicalFunction: "Traditional ceremonies, social gatherings, storytelling, work songs",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            congolese_rumba: {
                description: 'Congolese rumba scale blending traditional African and Cuban influences, fundamental to modern African popular music',
                culturalContext: {
                    region: "Democratic Republic of Congo, Republic of Congo",
                    culturalGroup: "Urban Congolese communities, particularly Kinshasa and Brazzaville",
                    historicalPeriod: "1940s to present",
                    musicalFunction: "Popular dance music, social celebrations, urban entertainment",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Major Scale and Number System for Congolese Rumba Rhythm Notes & Credits Congole",
                        "url": "https://www.youtube.com/watch?v=GZwGxlq8Ug8",
                        "description": "In this lesson, you’re going to learn how to use the major scale and number system to understand and play Congolese Rumba Music Style like a pro. ...m",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            ethiopian_pentatonic: {
                description: 'Traditional Ethiopian pentatonic scale, fundamental to highland Ethiopian music',
                culturalContext: {
                    region: "Ethiopian highlands, particularly Amhara and Tigray regions",
                    culturalGroup: "Amhara, Tigray, and other highland Ethiopian peoples",
                    historicalPeriod: "Ancient Ethiopian traditions to present",
                    musicalFunction: "Traditional songs, religious music, folk celebrations",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Tizita minor scale ( Ethiopian pentatonic ...) - GTDB Videos gtdb.org",
                        "url": "https://www.gtdb.org/video/DLsEDnsro-0",
                        "description": "Ethiopian Pentatonic scales - Tizita, Bati, Ambassel, Anchihoye.Tizita minor Ethiopian Scale . This scale is also known as the Japanese Hirajoshi scal",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Stream 2. Ethiopian Waltz (a Short Example) by KAPİKO",
                        "url": "https://soundcloud.com/kapiko/ethiopian-waltz",
                        "description": "The word ‘tizita/ትዝታ’ means ‘nostalgia’ or ‘longing’ in Amharic; at the same time, it is the name of a ‘kinit’ - an Ethiopian pentatonic scale – a sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Ethiopian Music Modes (Kiñit) - የኢትዮጵያ ሙዚቃ Images Common Ethiopian Pentatonic Sc",
                        "url": "https://music-of-ethiopia.pubpub.org/pub/v1v1u0fy",
                        "description": "Tizita is a very commonly used kiñit.1It has a major as well has a minor version. Although Tizita major is the same as the major pentatonic scale , Ti",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            ethiopian_tezeta: {
                description: 'Ethiopian tezeta mode, expressing nostalgia and longing, characteristic of Ethiopian popular music with scholarly debate about its modal variations and cultural significance',
                culturalContext: {
                    region: "Ethiopia, particularly urban centers like Addis Ababa",
                    culturalGroup: "Ethiopian musicians and urban communities",
                    historicalPeriod: "20th century to present",
                    musicalFunction: "Popular music, nostalgic songs, modern Ethiopian compositions",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            kenyan_benga: {
                description: 'Kenyan benga scale, fundamental to this popular East African dance music style',
                culturalContext: {
                    region: "Kenya, particularly Luo regions and urban centers",
                    culturalGroup: "Luo people and urban Kenyan communities",
                    historicalPeriod: "1960s to present",
                    musicalFunction: "Popular dance music, social celebrations, urban entertainment",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            ugandan_traditional: {
                description: 'Traditional Ugandan scale representing common elements across various Ugandan ethnic groups',
                culturalContext: {
                    region: "Uganda, particularly central and southern regions",
                    culturalGroup: "Baganda, Basoga, and other Ugandan peoples",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, court music, social gatherings",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            tanzanian_taarab: {
                description: 'Tanzanian taarab scale blending Arabic, Indian, and African musical influences',
                culturalContext: {
                    region: "Tanzania, particularly Zanzibar and coastal regions",
                    culturalGroup: "Swahili-speaking communities, particularly Zanzibari",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Popular entertainment, wedding celebrations, social commentary",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            zulu_traditional: {
                description: 'Traditional Zulu scale fundamental to Zulu musical expression and cultural identity',
                culturalContext: {
                    region: "KwaZulu-Natal, South Africa",
                    culturalGroup: "Zulu people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, praise singing, social gatherings, cultural celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            xhosa_traditional: {
                description: 'Traditional Xhosa scale reflecting the musical heritage of the Xhosa people',
                culturalContext: {
                    region: "Eastern Cape, South Africa",
                    culturalGroup: "Xhosa people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, praise poetry, social gatherings, cultural rituals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            sotho_traditional: {
                description: 'Traditional Sotho scale representing the musical heritage of Sotho-speaking peoples',
                culturalContext: {
                    region: "Lesotho, Free State, and parts of Gauteng, South Africa",
                    culturalGroup: "Basotho people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, praise singing, social gatherings, cultural celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            south_african_jazz: {
                description: 'South African jazz scale blending traditional African elements with American jazz influences',
                culturalContext: {
                    region: "South Africa, particularly Johannesburg and Cape Town",
                    culturalGroup: "Urban South African jazz musicians and communities",
                    historicalPeriod: "1940s to present",
                    musicalFunction: "Jazz performance, popular entertainment, cultural expression during apartheid and post-apartheid eras",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            marabi_scale: {
                description: 'South African marabi scale, fundamental to early urban South African popular music',
                culturalContext: {
                    region: "South Africa, particularly Johannesburg townships",
                    culturalGroup: "Urban South African communities, particularly during early 20th century",
                    historicalPeriod: "1920s-1940s",
                    musicalFunction: "Popular dance music, social entertainment, urban cultural expression",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            berber_traditional: {
                description: 'Traditional Berber (Amazigh) scale from North African indigenous communities',
                culturalContext: {
                    region: "Morocco, Algeria, Tunisia, Libya, and Berber-speaking regions",
                    culturalGroup: "Berber (Amazigh) peoples",
                    historicalPeriod: "Ancient North African traditions to present",
                    musicalFunction: "Traditional ceremonies, folk celebrations, cultural preservation",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            tuareg_pentatonic: {
                description: 'Traditional Tuareg pentatonic scale from Saharan nomadic communities',
                culturalContext: {
                    region: "Sahara Desert regions of Mali, Niger, Algeria, Libya, and Burkina Faso",
                    culturalGroup: "Tuareg people",
                    historicalPeriod: "Ancient Saharan nomadic traditions to present",
                    musicalFunction: "Traditional songs, camel caravan music, desert ceremonies",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            moroccan_andalusi: {
                description: 'Moroccan Andalusi scale from the classical Arab-Andalusian musical tradition',
                culturalContext: {
                    region: "Morocco, particularly Fez, Tetouan, and other cultural centers",
                    culturalGroup: "Moroccan Arab and Andalusi communities",
                    historicalPeriod: "Medieval Al-Andalus to present",
                    musicalFunction: "Classical Arab-Andalusian music, formal concerts, cultural preservation",
                },
                references: [
                    {
                        "type": "verified_source",
                        "title": "Maroccan Andalusian Music | PDF | Orchestras | Poetry - Scribd",
                        "url": "https://www.scribd.com/document/472421578/Maroccan-andalusian-music",
                        "description": "Rasd Andalusi and Rasd Gnawi are examples of how Moroccan Andalusian music absorbs diverse musical influences. Rasd Andalusi features a heptatonic sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            algerian_chaabi: {
                description: 'Algerian chaabi scale, fundamental to this popular urban folk music style',
                culturalContext: {
                    region: "Algeria, particularly Algiers and urban centers",
                    culturalGroup: "Urban Algerian communities",
                    historicalPeriod: "Early 20th century to present",
                    musicalFunction: "Popular folk music, social celebrations, urban entertainment",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            egyptian_maqam_influenced: {
                description: 'Egyptian scale influenced by Arabic maqam traditions, fundamental to modern Egyptian music',
                culturalContext: {
                    region: "Egypt, particularly Cairo and cultural centers",
                    culturalGroup: "Egyptian musicians and urban communities",
                    historicalPeriod: "19th century to present",
                    musicalFunction: "Popular music, film soundtracks, cultural entertainment",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            san_bushmen: {
                description: 'Traditional San (Bushmen) scale from Southern African hunter-gatherer communities',
                culturalContext: {
                    region: "Kalahari Desert regions of Botswana, Namibia, and South Africa",
                    culturalGroup: "San (Bushmen) peoples",
                    historicalPeriod: "Ancient hunter-gatherer traditions to present",
                    musicalFunction: "Traditional ceremonies, healing rituals, storytelling, cultural preservation",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            dogon_traditional: {
                description: 'Traditional Dogon scale from Mali, reflecting the complex cosmological beliefs of the Dogon people',
                culturalContext: {
                    region: "Mali, particularly the Bandiagara Escarpment",
                    culturalGroup: "Dogon people",
                    historicalPeriod: "Ancient traditions to present",
                    musicalFunction: "Religious ceremonies, cosmological rituals, traditional festivals",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            bambara_traditional: {
                description: 'Traditional Bambara scale from Mali, fundamental to Bambara cultural expression',
                culturalContext: {
                    region: "Mali, particularly central and southern regions",
                    culturalGroup: "Bambara people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, social gatherings, cultural celebrations",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            senufo_traditional: {
                description: 'Traditional Senufo scale from Ivory Coast, Burkina Faso, and Mali',
                culturalContext: {
                    region: "Ivory Coast, Burkina Faso, and southern Mali",
                    culturalGroup: "Senufo people",
                    historicalPeriod: "Traditional origins to present",
                    musicalFunction: "Traditional ceremonies, initiation rituals, social gatherings",
                },
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            harmonic_major: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Harmonic major scale - Wikipedia Master the Harmonic Major Scale And Intervals -",
                        "url": "https://en.wikipedia.org/wiki/Harmonic_major_scale",
                        "description": "Each mode of the harmonic major scale features different intervals of notes from the tonic according to the table below, which is arranged in order of",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Master the Harmonic Major Scale And Intervals - BetterMuSeek",
                        "url": "https://bettermuseek.com/guitar-techniques/harmonic-major-scale/",
                        "description": "Feb 6, 2025 · It is characterized by a sequence of augmented and minor second intervals , which give it an unusual and somewhat mysterious quality.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Harmonic Major Scale | A little known scale - FaChords Harmonic Major Scale Pian",
                        "url": "https://www.fachords.com/harmonic-major-scale/",
                        "description": "One of the easiest ways to learn a new scale is to compare it to the major scaleformula of 1 2 3 4 5 6 7. Thus a C major scale is C D E F G A B C. The",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            dorian_b5: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Dorian b5 Mode - Theory With Guitar Shapes",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-major-scale/the-dorian-b5-mode-guitar-diagrams-and-theory.html",
                        "description": "The chart below show you the difference between the Dorian b 5 mode and the Dorian mode, which is the second mode of the major scale and the most used",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Dorian b5 Scale Notes in 12 Keys on 1 Printable Chart",
                        "url": "https://www.musicianposter.com/scales/c1trq2/dorian-b5-notes-for-all-roots",
                        "description": "Handy chart with notes of the Dorian b5 scale (Harmonic Major mode 2) for every root note. 1 chart covering all 12 keys, in PDF format.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Dorian b5 Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/dorian-b5/",
                        "description": "The Dorian b5 scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive music calculato",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            phrygian_b4: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Phrygian b4 mode - Lesson With Guitar Diagrams",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-major-scale/the-phrygian-b4-mode.html",
                        "description": "With the following diagrams you'll learn how to play the Phrygian b4 mode all over the guitar neck using the 3NPS system. Here is a quick comparison w",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Phrygian b4 Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/phrygian-b4/",
                        "description": "The Phrygian b4 scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive music calcula",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Phrygian Scales - overview with pictures Phrygian b4 Scale Notes in 12 Key",
                        "url": "https://www.pianoscales.org/phrygian.html",
                        "description": "The same notes can be found in different Major and Phrygian scales: 1. C Phrygian – Ab Major 2. C# Phrygian – A Major 3. D Phrygian – Bb Major 4. D# P",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian_b3: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Lydian Diminished Scale - Lesson with Guitar diagrams",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-major-scale/the-lydian-b3-mode-theory-lesson-with-guitar-shapes.html",
                        "description": "Here below you see how to play the Lydian b3 scale all over the guitar neck using the 3 NPS system which is to play only 3 notes per string. You'll fi",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Lydian Diminished Scales for piano - overview with pictures",
                        "url": "https://pianoscales.org/lydian-diminished.html",
                        "description": "The Lydian Diminished Scale is often referred to as the Lydian b3 Scale due to the flatted third, which deviates from the Lydian Mode. This is a music",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Lydian b3 Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/lydian-b3/",
                        "description": "Lydian b3 scale for piano in all keys. Learn how to improvise and create your own music with the Lydian b3 scales . Master their harmonization, notes,",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            mixolydian_b2: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Mixolydian b9 scale - Guitar Lesson with Diagrams",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-major-scale/the-mixolydian-b2-mode-guitar-diagrams-and-theory.html",
                        "description": "Interval Pattern The Mixolydian b2 scale is made of : tonic (1) - minor second (b 2) - major third (3) - perfect fourth (4) - perfect fifth (5) - majo",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Mixolydian b2 Scale Notes in 12 Keys on 1 Printable Chart",
                        "url": "https://www.musicianposter.com/scales/c1ttu3/mixolydian-b2-notes-for-all-roots",
                        "description": "Handy chart with notes of the Mixolydian b2 scale (Harmonic Major mode 5) for every root note. 1 chart covering all 12 keys, in PDF format.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Mixolydian Scales - overview with pictures B Mixolydian Cheat Sheet: Scale",
                        "url": "https://pianoscales.org/mixolydian.html",
                        "description": "The same notes can be found in different Major and Mixolydian scales: 1. C Mixolydian – F Major 2. C# Mixolydian – F# Major 3. D Mixolydian – G Major ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            aeolian_b1: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Aeolian b1 Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/aeolian-b1/",
                        "description": "Aeolian b1 scale for piano in all keys. Learn how to improvise and create your own music with the Aeolian b1 scales . Master their harmonization, note",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Aeolian Scales - overview with pictures Images B Aeolian Scale - Online Pi",
                        "url": "https://www.pianoscales.org/aeolian.html",
                        "description": "The same notes can be found in different Major and Aeolian scales: 1. C Aeolian – Eb Major 2. C# Aeolian – E Major 3. D Aeolian – F Major 4. D# Aeolia",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            locrian_bb7: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Locrian bb7 mode For Guitar",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-major-scale/the-locrian-bb7-mode-charts-and-diagrams.html",
                        "description": "The interval pattern for the Locrian bb7 mode is tonic (1), minor second (b2), minor third (b3), perfect fourth (4), diminished fifth (b5), minor sixt",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Super Locrian Bb7 Guitar Scale Chart and Fingering - FaChords",
                        "url": "https://www.fachords.com/guitar-scale/super-locrian-bb7/",
                        "description": "On this page, you find several fretboard diagrams for the Super Locrian Bb7 scale, with box and 3 notes per string patterns. The Super Locrian bb7 Sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "A-Super Locrian bb7 Scale Degrees on the Guitar Fretboard",
                        "url": "https://www.musicianposter.com/guitar/scales/c21mr/a-super-locrian-bb7-degrees-fretboard",
                        "description": "Visualize and memorize the locations of degrees of the A-Super Locrian bb7 scale across the entire fretboard. Find different chord voicings, inversion",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            double_harmonic_major: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Double Harmonic Major Modes - Andy French's Musical Explorations",
                        "url": "https://www.andyfrench.co.uk/2025/04/double-harmonic-major-modes/",
                        "description": "Apr 21, 2025 · The Double Harmonic Major Scale (also known as the Byzantine Scale, Arabic Scale, or Gypsy Major) is a highly exotic and symmetrical sc",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Double Harmonic Major Scale Piano Reference With Notes ...",
                        "url": "https://muted.io/double-harmonic-major-scale/",
                        "description": "Here you'll find an interactive piano reference for the double harmonic major scale with notes on the piano keyboard, intervals and scale formula. Dou",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            ultraphrygian: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Ultraphrygian Scale on Piano - prosonic-studios.com",
                        "url": "https://www.prosonic-studios.com/learning/encyclopedia/scales/piano/ultraphrygian",
                        "description": "Beautiful full color keyboard diagrams showing how to play the ultraphrygian scale on piano, including intervals , intervallic relationships, and diss",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Double Harmonic Major modes - Ultraphrygian - Andy French's ...",
                        "url": "https://www.andyfrench.co.uk/2025/04/ultraphrygian/",
                        "description": "Apr 21, 2025 · The 3rd mode of the Double Harmonic Major scale is Ultraphrygian, also referred to as Phrygian ♭4 or sometimes Double Harmonic Phrygian",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            hungarian_minor: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Hungarian minor scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Hungarian_minor_scale",
                        "description": "Its step pattern is W, H, +, H, H, +, H, where W indicates a whole step, H indicates a half step, and + indicates an augmented second (three half step",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Hungarian Minor Scale For Guitar - Theory And Shapes",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/other-scales/the-hungarian-minor-scale-on-guitar-theory-intervals-charts-and-diagrams.html",
                        "description": "The Hungarian Minor Scale aka Gipsy Minor On Guitar - Theory , Intervals , Charts And Diagrams The Hungarian minor scale , also known as the Double Ha",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Hungarian Minor Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/hungarian-minor-scale/",
                        "description": "Here you'll find an interactive piano reference for the Hungarian minor scale with notes on the piano keyboard, intervals and scale formula. See also ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            oriental: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Mixolydian b5 b9 Scale aka Oriental Scale For Guitar",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/double-harmonic-scale/the-mixolydian-b2-b5-mode-shapes-and-charts.html",
                        "description": "Here are four one-octave shapes for practicing the Mixolydian b5 b9 scale on guitar. The following two shapes show how to play the Mixolydian b2 b5 ak",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Oriental Scales - overview with pictures",
                        "url": "https://www.pianoscales.org/oriental.html",
                        "description": "The Oriental Scale has a Chinese origin (not to be confused with the Chinese Scale, though), and is an octatonic scale (a scale consisting of eight no",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Oriental Scales - Overview With Pictures PDF - Scribd",
                        "url": "https://www.scribd.com/document/421184249/Oriental-Scales-overview-with-pictures-pdf",
                        "description": "The Oriental Scale is an octatonic scale originating from China that consists of eight notes. It is characterized by groups of semi-note intervals . T",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            locrian_bb3_bb7: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Locrian bb3 bb7 Mode - Lesson For Guitar",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/double-harmonic-scale/locrian-bb3-bb7-scale-charts-and-shapes-for-guitar-players.html",
                        "description": "This lesson provides charts and shapes for playing the Locrian bb3 bb7 scale on guitar.",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Locrian bb3 bb7 Scale in All 12 Keys - YouTube Locrian bb3 bb7 Scale - Music Sca",
                        "url": "https://www.youtube.com/watch?v=LcW5v9UiWvw",
                        "description": "Locrian bb3 bb7 Scale in All 12 Keys Mango Town Plays 1.05K subscribers Subscribe The Locrian bb3 bb7 scale , visualized on the guitar neck, in any ke",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Locrian bb3 bb7 Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/locrian-bb3-bb7/",
                        "description": "The Locrian bb3 bb7 scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive music cal",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            whole_tone: {
                description: 'Hexatonic scale built entirely from whole tone intervals - creates a dreamy, floating harmonic quality used extensively in impressionist music',
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Whole Tone Scale : A Quick Guide",
                        "url": "https://hellomusictheory.com/learn/whole-tone-scale/",
                        "description": "A whole tone scale (sometimes known as the symmetrical scale) is a hexatonic scale which means that it uses only six notes. It’s made up entirely of w",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Whole Tone Scale For Guitar",
                        "url": "https://www.jazzguitar.be/blog/whole-tone-scale/",
                        "description": "The whole tone scale is a cool-sounding dominant 7th scale that you can use to add tension to your dominant 7th chords.The whole tone scale is a symme",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Whole Tone Scales - overview with pictures",
                        "url": "https://pianoscales.org/whole-tone.html",
                        "description": "Theory . Extras. Sheet music .The Whole Tone Scale is, as the name implies, built from notes with intervals of a whole note. This is a so-called symme",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            augmented: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Augmented Scale Theory - Javier Arau",
                        "url": "http://www.javierarau.com/augmented-scale-theory",
                        "description": "Whether viewed as interval sets or scale fragments, augmented scale theory maintains a view that all pitch collections hold a hierarchical placement i",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Augmented Scales - overview with pictures",
                        "url": "https://www.pianoscales.org/augmented.html",
                        "description": "Each scale is built upon two augmented chords and the relationship for all scales are as follows: B Augmented Scale - Baug and Daug. Note that the Aug",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Musical Scale Info: D augmented ionian",
                        "url": "https://www.scales-chords.com/scaleinfo.php?skey=D&sname=augmented+ionian",
                        "description": "Detailed information for the scale D augmented ionian. Notes , Intervals and relations to other scales in the database.",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            tritone: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Tritones - A Lesson in Music Theory",
                        "url": "https://musictheoryinonelesson.com/tritones/",
                        "description": "Music Theory in One Lesson. Tritones . The Tritone is an incredibly interesting – and dissonant – sound.Each scale has a tritone , which has two half ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "What is a tritone and why was it nicknamed the devil’s interval? Images Tritone ",
                        "url": "https://www.classicfm.com/discover-music/music-theory/what-is-a-tritone/",
                        "description": "A tritone is an interval made up of three tones, or six semitones . In each diatonic scale (or the most basic scale of a key) there is only one triton",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Why 12 notes to the Octave?",
                        "url": "https://math.uwaterloo.ca/~mrubinst/tuning/12.html",
                        "description": "The tritone (such as C to F#) is also omitted from this list, an interval that did not affect the evolution of the western scale as it was not used in",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            prometheus: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Mystic chord - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Mystic_chord",
                        "description": "In music , the mystic chord or Prometheus chord is a six-note synthetic chord and its associated scale , or pitch collection; which loosely serves as ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Prometheus Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/prometheus-scale/",
                        "description": "Here you'll find an interactive piano reference for the Prometheus scale with notes on the piano keyboard, intervals and scale formula. The intervals ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Prometheus Scales - overview with pictures",
                        "url": "https://www.pianoscales.org/prometheus.html",
                        "description": "Scales source and guide for musicians. Prometheus can in music refer to both a scale and a chord, the latter is also known as the Mystic chord (C Prom",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            major_pentatonic: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Pentatonic scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Pentatonic_scale",
                        "description": "The first two phrases of the melody from Stephen Foster's \"Oh! Susanna\" are based on the major pentatonic scale . A pentatonic scale is a musical scal",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "The Major Pentatonic Scale – Bringing It Full Circle",
                        "url": "https://musicintervaltheory.academy/learn-how-to-write-music/major-pentatonic-scale/",
                        "description": "Music Interval Theory Academy Logo.Reflecting the Major Pentatonic Scale . Let's bring up the horizontal formula (HF), which describes the distances b",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Major Pentatonic Scale | Applied Guitar Theory",
                        "url": "https://appliedguitartheory.com/lessons/major-pentatonic-scale/",
                        "description": "The major pentatonic scale is one of the most widely used scales on the guitar. The versatility and playability of the scale makes it a popular choice",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            minor_pentatonic: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "A Minor Pentatonic Scale - Notes, Positions, Application",
                        "url": "https://appliedguitartheory.com/lessons/a-minor-pentatonic-scale/",
                        "description": "When you do this, you get 5 different positions of the A minor pentatonic scale, several of which repeat in different locations on the fretboard. We’l",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Learn Minor Pentatonic Scale - EverythingMusic.com",
                        "url": "https://everythingmusic.com/learn/music-theory/scales/minor-pentatonic",
                        "description": "Below you will find the Minor Pentatonic Scale notes, notation, patterns, degrees, intervals and more. You can also opt to see the Minor Pentatonic Sc",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Minor Pentatonic: Essential Information - JustinGuitar.com",
                        "url": "https://www.justinguitar.com/guitar-lessons/minor-pentatonic-essential-information-sc-301",
                        "description": "The scale formula for the minor pentatonic can be a useful thing to know if you want to work out the notes in any given minor pentatonic scale. The fo",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            egyptian_pentatonic: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Suspended Pentatonic Scale aka Egyptian Scale For Guitar",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/pentatonic-scales/egyptian-pentatonic-scale-suspended-guitar-charts.html",
                        "description": "Here are five shapes for practicing the Egyptian pentatonic scale (aka suspended) all over the guitar neck. This guitar lesson provides chart and shap",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "11 Exotic Guitar Scales For Guitar (video + tabs)",
                        "url": "https://www.jazzguitar.be/blog/exotic-guitar-scales/",
                        "description": "Exotic guitar scales are great to add some new flavors to your music . In this lesson, you will learn 11 scales from different parts of the world.Ther",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Top 10 Guitar Scales Tabs - Inspiration for... - Beginner Guitar HQ",
                        "url": "https://beginnerguitarhq.com/guitar-scales-tabs/",
                        "description": "Indian Pentatonic Scale (Raga Bhoop). Indian Classical music has a system called the Raga system which is a complete study on its own. Egyptian Pentat",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            blues_major_pentatonic: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Rob silver: the blues major pentatonic scale",
                        "url": "https://www.rob-silver.com/2022/02/the-blues-major-pentatonic-scale.html",
                        "description": "The fourth mode of MAJOR PENTATONIC or fifth mode of MINOR PENTATONIC. I have also seen this called THE SCOTTISH PENTATONIC SCALE . It contains the no",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Blues Major Pentatonic Fiddle tune Sheet music for... | Musescore.com",
                        "url": "https://musescore.com/vetus-inceptus/blues-major-pentatonic-fiddle-tune",
                        "description": "Score info. Here's a fiddle tune that sounds a bit Old Time, based on a Blues Major Pentatonic scale on D. The Blues Major Pentatonic scale can be tho",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            hirajoshi: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Hirajoshi Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/hirajoshi-scale/",
                        "description": "The Hirajōshi scale is a Japanese 5-note scale, a type of pentatonic scale, that has been adapted from Shamisen music . Here you'll find an interactiv",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "An Introduction to the Hirajoshi Scale | Ultimate Guitar",
                        "url": "https://www.ultimate-guitar.com/lessons/scales/an_introduction_to_the_hirajoshi_scale.html",
                        "description": "The Hirajoshi scale has a very eastern sort of sound to it. It is a slightly more exotic scale, and is not as common as say the minor pentatonic scale",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Exotic Pentatonic Scales: Hirajoshi And Pelog Scales...",
                        "url": "https://www.hearandplay.com/main/exotic-pentatonic-scales-hirajoshi-and-pelog-scales-advanced-players-only",
                        "description": "The A Hirajoshi scale can also be played in two other ways: A Hirajoshi (Slonimski’s version): A Hirajoshi (Burrow’s version): The first version is as",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            iwato: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Iwato Scale Piano Reference With Notes & Intervals - muted.io",
                        "url": "https://muted.io/iwato-scale/",
                        "description": "The Iwato scale is very similar to the Locrian mode, but omits the 3rd and 6th degrees to get a 5-note pentatonic scale. Here you'll find an interacti",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Iwato Piano Scales - Complete Guide & Theory",
                        "url": "https://pianoowl.com/scales/iwato",
                        "description": "The Iwato scale is a traditional Japanese pentatonic scale with a dark, mysterious character. It follows the interval pattern: half, whole + whole, ha",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Iwato Scales - overview with pictures",
                        "url": "https://www.pianoscales.org/iwato.html",
                        "description": "It includes five notes (which makes it a pentatonic scale type), characterized by two small and two big intervals . The complete semitone pattern is p",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            insen: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Insen scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Insen_scale",
                        "description": "Insen (or In Sen; kanji: 陰旋; hiragana: いんせん) is a tuning scale adapted from shamisen music by Yatsuhashi Kengyō for tuning of the koto. It only differ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Insen Scale For Guitar - Charts And Diagrams",
                        "url": "https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/other-scales/the-insen-scale-formula-charts-and-guitar-patterns.html",
                        "description": "The Insen Scale or In Sen, is a Japanese scale made of five notes (pentatonic) organized this way : 1 (tonic), b2 (minor second), 4 (fourth), 5 (fifth",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Insen scale - grokipedia.com",
                        "url": "https://grokipedia.com/page/Insen_scale",
                        "description": "While the Hirajoshi scale follows the pattern 1–2–♭3–5–♭6, producing intervals of whole, half, major third, half, and major third semitones, the Insen",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            yo: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Yo scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Yo_scale",
                        "description": "It is defined by ascending intervals [clarification needed] of two, three, two, two, and three semitones. An example yo scale, expressed in western pi",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Yo Scales (Japanese) - overview with pictures",
                        "url": "https://pianoscales.org/yo.html",
                        "description": "It contains five notes (it can be seen as the 4th mode of the Major Pentatonic Scale), and is often used in Japanese folk music. One way to learn this",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Yo scale - grokipedia.com",
                        "url": "https://grokipedia.com/page/Yo_scale",
                        "description": "The Yo scale is a pentatonic scale consisting of five notes, structured as degrees 1-2-4-5-6 (for example, C-D-F-G-A when rooted on C), and is one of ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            blues_hexatonic: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "The Blues Scales - Music Theory Academy",
                        "url": "https://www.musictheoryacademy.com/understanding-music/the-blues-scales/",
                        "description": "blues hexatonic scale . Play Blues Hexatonic Scale . Pattern = 1st – Flattened 3rd – 4th – Flattened 5th/5th – Flattened 7th. The 7 note scale (heptat",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Blues Hexatonic Scale - Music Scale - GuitarGuide.eu",
                        "url": "https://guitarguide.eu/scale/blues-hexatonic/",
                        "description": "The Blues Hexatonic scale , visualized on the guitar neck, in any key. With a choice of tuning as well as the number of strings! Interactive music cal",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Blues Hexatonic Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/blues-hexatonic/",
                        "description": "How to play the Blues Hexatonic Scale on the piano with proper fingering. How to improvise and compose your own music with the Blues Hexatonic scale .",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            spanish_gypsy: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Spanish gypsy scale - RecordingBlogs Images Phrygian Dominant Scale Piano Refere",
                        "url": "https://www.recordingblogs.com/wiki/spanish-gypsy-scale",
                        "description": "The fourth mode of the Spanish gypsy scale is the harmonic minor scale . The harmonic minor scale in the example above would be A, B, C, D, E, F, G#. ",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Phrygian Dominant Scale Piano Reference With Notes & Intervals",
                        "url": "https://muted.io/phrygian-dominant-scale/",
                        "description": "The Phrygian dominant scale, also known as the Spanish gypsy scale, is a 7-note scale that's the 5th mode of the harmonic minor. Here's a piano refere",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Spanish Gypsy Scales (Phrygian Dominant)",
                        "url": "https://www.pianoscales.org/spanish-gypsy.html",
                        "description": "The Spanish Gypsy Scale is often used in flamenco and Turkish music, and occasionally in rock and jazz. Other Gypsy scales are the Hungarian Gypsy Sca",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            bebop_dominant: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Bebop scale - Wikipedia",
                        "url": "https://en.wikipedia.org/wiki/Bebop_scale",
                        "description": "Bebop dominant scale The bebop dominant scale is derived from the Mixolydian mode and has a chromatic passing note added in between the flatted 7th (♭",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.90",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.9,
                    },
                    {
                        "type": "verified_source",
                        "title": "D Bebop Dominant - Music Theory",
                        "url": "https://pianoowl.com/scales/bebop-dominant/d-bebop-dominant",
                        "description": "The D bebop dominant scale follows the interval formula of 2-2-1-2-2-1-1-1 semitones, producing the intervallic structure: root (1), major second (2),",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Piano Dominant Bebop (Mixolydian Bebop) Scales - Piano scales",
                        "url": "https://pianoscales.org/bebop-dominant.html",
                        "description": "The intervals for Bebop Dominant are 1, 2, 3, 4, 5, 6, b7, 7 (with the passing note between the minor 7th and the root), which is the same as Major or",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            neapolitan_minor: {
                references: [
                    {
                        "type": "verified_source",
                        "title": "Scale 2475: \"Neapolitan Minor\" - Ian Ring",
                        "url": "https://ianring.com/musictheory/scales/2475",
                        "description": "Notes are arranged in a lattice where perfect 5th intervals are from left to right, major third are northeast, and major 6th intervals are northwest. ",
                        "source": "Web Validation",
                        "category": "verified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.70",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.7,
                    },
                    {
                        "type": "verified_source",
                        "title": "Neapolitan Minor Scale for Piano | Piano Scales",
                        "url": "https://pianoencyclopedia.com/scales/neapolitan-minor/",
                        "description": "Neapolitan Minor scale for piano in all keys. Learn how to improvise and create your own music with the Neapolitan Minor scales . Master their harmoni",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                    {
                        "type": "verified_source",
                        "title": "Neapolitan Minor Scale - freemusiclessons4u.com",
                        "url": "https://freemusiclessons4u.com/Guitar/Scales/Neopolitan_Minor/neopolitan_minor_scales_R.htm",
                        "description": "The Neapolitan Minor scale is similar to a Minor scale with the 2nd note lowered by a half tone. There are 3 types of scale fingering patterns shown b",
                        "source": "Web Validation",
                        "category": "unverified",
                        "verificationStatus": "VERIFIED via Web Search - Score: 0.50",
                        "verificationDate": "2025-12-12",
                        "contentScore": 0.5,
                    },
                ],
                validationStatus: "verified",
                validationDate: "2025-12-12",
            },
            lydian_sharp2_sharp6: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            ionian_augmented_sharp2: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            octatonic_dim: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            octatonic_dom: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            blues_minor_pentatonic: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
            whole_tone_hexatonic: {
                validationStatus: "needs-review",
                validationDate: "2025-12-12",
            },
        
        
        };

        // Utility: transpose a note by semitones (supports sharps/flats)
        // Example: transposeNote('C', 4) -> 'E'
        // Example: transposeNote('F#', 2) -> 'G#'
        // Keeps result as a single letter with # if needed (prefers sharps)
        this.transposeNote = (root, semitones) => {
            if (!root || typeof root !== 'string') return root;
            // normalize root (prefer canonical names in noteValues)
            const canonical = Object.prototype.hasOwnProperty.call(this.noteValues, root) ? root : root.replace('♯', '#').replace('♭', 'b');
            const base = this.noteValues[canonical];
            if (base === undefined) {
                // try stripping octave number if present (e.g., C4)
                const match = root.match(/^([A-G][#b]?)/);
                if (match) {
                    const r = match[1];
                    if (this.noteValues[r] !== undefined) return this.chromaticNotes[(this.noteValues[r] + semitones + 120) % 12];
                }
                return root; // unknown root, return as-is
            }
            const idx = (base + semitones + 120) % 12;
            return this.chromaticNotes[idx];
        };

        this.diatonicChordTypes = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
        this.barry8ChordTypes = ['6', 'dim7', 'm7', 'maj7', '7', 'm7', 'dim7', 'm7b5'];

        this.chordFormulas = {
            'maj': [0, 4, 7],
            'm': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            'maj7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10],
            '7': [0, 4, 7, 10],
            'm7b5': [0, 3, 6, 10],
            'dim7': [0, 3, 6, 9],
            'mMaj7': [0, 3, 7, 11],
            '7sus4': [0, 5, 7, 10],
            'maj7#5': [0, 4, 8, 11],
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            '9': [0, 4, 7, 10, 14],
            'maj9': [0, 4, 7, 11, 14],
            'm9': [0, 3, 7, 10, 14],
            '7b9': [0, 4, 7, 10, 13],
            '7#9': [0, 4, 7, 10, 15],
            '11': [0, 4, 7, 10, 14, 17],
            'm11': [0, 3, 7, 10, 14, 17],
            '7#11': [0, 4, 7, 10, 18],
            '13': [0, 4, 7, 10, 14, 21],
            'maj13': [0, 4, 7, 11, 14, 21],
            '7b13': [0, 4, 7, 10, 20],
            'alt': [0, 3, 6, 10, 13, 15],
            'm7#5': [0, 3, 8, 10],
            '7b5': [0, 4, 6, 10],
            '7#5': [0, 4, 8, 10],
            'maj7#11': [0, 4, 7, 11, 18]
        };

        this.initialize();
    }

    /**
     * Normalize common chord-type aliases to canonical chordFormulas keys.
     * Examples:
     *  '+' -> 'aug'
     *  '+maj7' / 'augmaj7' / 'maj7+' -> 'maj7#5'
     *  '+7' / 'aug7' / '7+' -> '7#5'
     */
    normalizeChordType(chordType) {
        if (!chordType) return chordType;
        let s = String(chordType).trim();
        if (!s) return s;
        // canonical lowercase for matching, but preserve returned casing of known keys
        const low = s.toLowerCase();

        // Normalize legacy/variant suspended dominant orderings like 'sus47' or 'sus27'
        if (/^sus\s*4\s*7$|^sus47$/i.test(low)) return '7sus4';
        if (/^7\s*sus\s*4$/i.test(low)) return '7sus4';
        // Engine does not support 7sus2 explicitly; normalize any 'sus27' to '7sus4' for now
        if (/^sus\s*2\s*7$|^sus27$/i.test(low)) return '7sus4';

        // Plain plus means augmented triad
        if (low === '+') return 'aug';

        // If contains explicit 'aug' or '+' modifier alongside 'maj7', prefer 'maj7#5'
        if (/aug/i.test(s) && /maj7/i.test(s)) return 'maj7#5';
        if (/\+/.test(s) && /maj7/i.test(s)) return 'maj7#5';

        // If contains augmented marker with dominant 7, map to '7#5'
        if (/aug/i.test(s) && /(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';
        if (/\+/.test(s) && /(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';

        // If chordType is like 'maj7#5' or '7#5' or other canonical forms, leave as-is
        // Also support patterns like 'maj7+5' -> 'maj7#5'
        if (/maj7.*#5|maj7.*\+5|#5/.test(s)) return s.replace('\u002B5', '#5');

        // Common shorthand: trailing or leading plus indicates augmented triad
        if (/^\+/.test(s) || /\+$/.test(s)) {
            // If it also includes 'maj7', map to maj7#5, if includes '7' map to 7#5, else aug
            if (/maj7/i.test(s)) return 'maj7#5';
            if (/(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';
            return 'aug';
        }

        return s;
    }

    initialize() {
        // Build reverse lookup for note names from semitones
        this.semitoneToNote = {};
        Object.entries(this.noteValues).forEach(([note, semi]) => {
            if (!this.semitoneToNote[semi]) {
                this.semitoneToNote[semi] = note;
            }
        });
    }

    /**
     * Get note name from semitone interval, respecting key signature
     */
    getNoteFromIntervalInKey(root, semitones, keySignature = null) {
        const rootValue = this.noteValues[root];
        if (rootValue === undefined) return null;

        const targetValue = (rootValue + semitones) % 12;
        
        // If no key signature specified, use the original logic
        if (!keySignature || !this.keySignatures[keySignature]) {
            return this.semitoneToNote[targetValue] || this.chromaticNotes[targetValue];
        }

        const keySig = this.keySignatures[keySignature];
        
        // Get all possible enharmonic equivalents for this semitone value
        const enharmonics = Object.entries(this.noteValues)
            .filter(([note, val]) => val === targetValue)
            .map(([note]) => note);

        // If only one enharmonic, return it
        if (enharmonics.length === 1) {
            return enharmonics[0];
        }

        // Choose based on key signature preferences
        if (keySig.type === 'sharp') {
            // Prefer sharps for sharp keys
            const sharpNote = enharmonics.find(note => note.includes('#'));
            if (sharpNote) return sharpNote;
        } else if (keySig.type === 'flat') {
            // Prefer flats for flat keys
            const flatNote = enharmonics.find(note => note.includes('b'));
            if (flatNote) return flatNote;
        }

        // If no preference or natural key, prefer the simpler enharmonic
        const naturalNote = enharmonics.find(note => !note.includes('#') && !note.includes('b'));
        if (naturalNote) return naturalNote;

        // Fallback to first enharmonic
        return enharmonics[0];
    }

    /**
     * Spell a semitone (0-11) honoring a preference for flats/sharps or key signature.
     * preferFlat: true => prefer flats, false => prefer sharps, null => use key signature
     */
    spellSemitoneWithPreference(semitone, preferFlat = null, keySignature = null) {
        const target = ((semitone % 12) + 12) % 12;
        // Gather enharmonic names for this semitone
        const enharmonics = Object.entries(this.noteValues).filter(([n, v]) => v === target).map(([n]) => n);
        if (!enharmonics || enharmonics.length === 0) return this.chromaticNotes[target] || null;

        // Normalize preferFlat using keySignature when preferFlat is null
        if (preferFlat === null && keySignature && this.keySignatures[keySignature]) {
            const ks = this.keySignatures[keySignature];
            if (ks.type === 'flat') preferFlat = true;
            else if (ks.type === 'sharp') preferFlat = false;
        }

        // If preference explicitly asks for flats
        if (preferFlat === true) {
            const flat = enharmonics.find(n => n.indexOf('b') >= 0);
            if (flat) return flat;
        }

        // If preference explicitly asks for sharps
        if (preferFlat === false) {
            const sharp = enharmonics.find(n => n.indexOf('#') >= 0);
            if (sharp) return sharp;
        }

        // Prefer natural (no accidental) if available
        const natural = enharmonics.find(n => !n.includes('#') && !n.includes('b'));
        if (natural) return natural;

        // Otherwise fallback to first enharmonic (deterministic)
        return enharmonics[0];
    }

    /**
     * Given a preferred root spelling (e.g., 'Db') and an array of note names, re-spell
     * each note to be enharmonically consistent with the preferred root's accidental
     * preference. Returns a new array of spelled note names.
     */
    spellNotesForRoot(preferredRoot, notes) {
        if (!preferredRoot || !Array.isArray(notes)) return notes || [];
        const preferFlat = String(preferredRoot).indexOf('b') >= 0;
        return notes.map(n => {
            try {
                const v = this.noteValues[n];
                if (v === undefined) return n;
                return this.spellSemitoneWithPreference(v, preferFlat, null);
            } catch (e) {
                return n;
            }
        });
    }

    /**
     * Get note name from semitone interval (no enharmonic logic)
     */
    getNoteFromInterval(root, semitones) {
        const rootValue = this.noteValues[root];
        if (rootValue === undefined) return null;
        const targetValue = (rootValue + semitones) % 12;
        return this.semitoneToNote[targetValue] || this.chromaticNotes[targetValue];
    }

    /**
     * Get all notes in a scale (legacy method)
     */
    getScaleNotes(key, scaleType) {
        // Normalize incoming scale identifier to canonical id (e.g., 'dorian b2' -> 'dorian_b2')
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        // Legacy/compat method: prefer key-signature-aware spelling for scale notes
        try {
            return this.getScaleNotesWithKeySignature(key, scaleId);
        } catch (e) {
            const intervals = this.scales[scaleId] || this.scales.major;
            return intervals.map(interval => this.getNoteFromInterval(key, interval));
        }
    }

    /**
     * Get all notes in a scale, respecting key signature enharmonics
     */
    getScaleNotesWithKeySignature(key, scaleType) {
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        const intervals = this.scales[scaleId] || this.scales.major;

        // For church-mode modal scales (dorian, phrygian, lydian, mixolydian,
        // aeolian, locrian) prefer the parent-major key signature when choosing
        // enharmonic spellings so that, for example, C locrian returns
        // Db/Eb/Ab/Db/Gb instead of C D E F# ...
        let keyForSignature = key;
        try {
            const modalSet = new Set(['dorian','phrygian','lydian','mixolydian','aeolian','locrian']);
            if (modalSet.has(String(scaleId))) {
                const parent = this.getParentMajorForMode(key, scaleId);
                if (parent) keyForSignature = parent;
            }
            
            // For melodic minor family scales, prefer flat key signatures
            // EXCEPT lydian_dominant which needs sharps for the #4
            const melodicFamilyFlats = new Set(['melodic','dorian_b2','lydian_augmented','mixolydian_b6','locrian_nat2','altered']);
            if (melodicFamilyFlats.has(String(scaleId))) {
                // Find a flat key that shares the same tonic pitch class
                const flatKeys = ['Db', 'Eb', 'Gb', 'Ab', 'Bb', 'F'];
                const keyVal = this.noteValues[key];
                if (keyVal !== undefined) {
                    const flatEquiv = flatKeys.find(fk => this.noteValues[fk] === keyVal);
                    if (flatEquiv) {
                        keyForSignature = flatEquiv;
                    } else {
                        // If no enharmonic flat key exists, use Db as default flat key signature
                        keyForSignature = 'Db';
                    }
                }
            }
            
            // For harmonic minor family and scales with sharp alterations, prefer sharp key signatures
            const harmonicAndSharpScales = new Set([
                'harmonic','locrian_nat6','ionian_augmented','dorian_sharp4','phrygian_dominant',
                'lydian_sharp2','altered_diminished','lydian_dominant',
                'harmonic_major','lydian_b3','ionian_augmented_sharp2','lydian_sharp2_sharp6',
                'double_harmonic_major','hungarian_minor'
            ]);
            if (harmonicAndSharpScales.has(String(scaleId))) {
                // Find a sharp key that shares the same tonic pitch class
                const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
                const keyVal = this.noteValues[key];
                if (keyVal !== undefined) {
                    const sharpEquiv = sharpKeys.find(sk => this.noteValues[sk] === keyVal);
                    if (sharpEquiv) {
                        keyForSignature = sharpEquiv;
                    } else {
                        // If no enharmonic sharp key exists, use G as default sharp key signature
                        keyForSignature = 'G';
                    }
                }
            }
        } catch (e) { /* ignore and fall back to tonic */ }

        return intervals.map(interval => this.getNoteFromIntervalInKey(key, interval, keyForSignature));
    }

    /**
     * Given a tonic and a church-mode-like scaleId (ionian/dorian/...),
     * return the parent major key whose scale contains the tonic at the
     * corresponding degree. This helps select appropriate key-signature
     * enharmonics for modal scales (e.g., C locrian -> parent = Db major).
     */
    getParentMajorForMode(tonic, modeId) {
        const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
        const nv = this.noteValues || {};
        const tonicVal = nv[tonic];
        if (tonicVal == null) return null;

        // Major scale degree semitone distances from the parent tonic
        const majorDegSemis = [0, 2, 4, 5, 7, 9, 11];
        const modeIndex = {
            ionian: 0, major: 0,
            dorian: 1,
            phrygian: 2,
            lydian: 3,
            mixolydian: 4,
            aeolian: 5,
            locrian: 6
        }[modeId];
        if (modeIndex == null) return null;

        // tonic = parent + majorDegSemis[modeIndex]
        const parentPc = (tonicVal - majorDegSemis[modeIndex] + 12) % 12;

        const candidates = majorKeys.filter(k => nv[k] != null && (nv[k] % 12) === parentPc && this.keySignatures[k]);
        if (candidates.length === 0) return null;
        // Prefer a flat-key candidate when available (e.g., prefer 'Db' over 'C#')
        const flatPref = candidates.find(k => this.keySignatures[k] && this.keySignatures[k].type === 'flat');
        if (flatPref) return flatPref;
        return candidates[0];
        return null;
    }

    /**
     * Normalize a scale identifier into the canonical id used by this.scales.
     * Examples:
     *  'Dorian b2' -> 'dorian_b2'
     *  'Lydian ♯2' -> 'lydian_#2' (unused in ids but safe)
     *  'Dorian ♭2 (Phrygian ♮6)' -> 'dorian_b2'
     */
    normalizeScaleId(scaleType) {
        if (scaleType == null) return scaleType;
        let s = String(scaleType).toLowerCase();
        s = s.replace(/[]/g, ''); // strip odd chars if any
        s = s.replace(/[♭]/g, 'b').replace(/[♯]/g, '#');
        // drop any parenthetical descriptions
        s = s.replace(/\([^)]*\)/g, '');
        // collapse whitespace/hyphens to underscores
        s = s.replace(/[\s\-]+/g, '_');
        // remove non a-z0-9_ except # and b which we keep
        s = s.replace(/[^a-z0-9_#b]/g, '');
        // common display-name normalizations
        s = s.replace(/^dorian_b_?2$/, 'dorian_b2');
        s = s.replace(/^lydian_dominant$/, 'lydian_dominant');
        s = s.replace(/^lydian_augmented$/, 'lydian_augmented');
        return s;
    }

    /**
     * Get all notes in a chord
     */
    getChordNotes(root, chordType) {
        const normalized = this.normalizeChordType(chordType);
        let formula = this.chordFormulas[normalized] || this.chordFormulas[chordType];
        if (!formula) {
            // Case-insensitive fallback: find canonical key by lowercasing
            try {
                const low = String(chordType || '').toLowerCase();
                const matchKey = Object.keys(this.chordFormulas).find(k => k.toLowerCase() === low);
                if (matchKey) formula = this.chordFormulas[matchKey];
            } catch (_) {}
        }
        
        // Handle synthetic chord types like "maj(add6, no5)"
        if (!formula && chordType && chordType.includes('(')) {
            try {
                const match = chordType.match(/^([^(]+)\(([^)]+)\)$/);
                if (match) {
                    const [, baseType, modifiers] = match;
                    let baseFormula = this.chordFormulas[baseType] || this.chordFormulas[this.normalizeChordType(baseType)];
                    
                    // Handle synthetic base types
                    if (!baseFormula && baseType === 'modal') {
                        baseFormula = [0]; // Start with just the root for modal chords
                    }
                    
                    if (baseFormula) {
                        // Start with base chord intervals
                        let intervals = [...baseFormula];
                        
                        // Parse modifiers
                        const mods = modifiers.split(',').map(m => m.trim());
                        
                        for (const mod of mods) {
                            if (mod === 'add6') {
                                // Add 6th (9 semitones)
                                if (!intervals.includes(9)) intervals.push(9);
                            } else if (mod === 'add2') {
                                // Add 2nd (2 semitones)
                                if (!intervals.includes(2)) intervals.push(2);
                            } else if (mod === 'add11') {
                                // Add 11th (use 5 semitones for voicing)
                                if (!intervals.includes(5)) intervals.push(5);
                            } else if (mod === '#11') {
                                // Add #11 (6 semitones)
                                if (!intervals.includes(6)) intervals.push(6);
                            } else if (mod === 'b9') {
                                // Add b9 (1 semitone)
                                if (!intervals.includes(1)) intervals.push(1);
                            } else if (mod === 'b13') {
                                // Add b13 (8 semitones)
                                if (!intervals.includes(8)) intervals.push(8);
                            } else if (mod === 'b5') {
                                // Add b5 (6 semitones) - only if no perfect 5th
                                if (!intervals.includes(7) && !intervals.includes(6)) intervals.push(6);
                            } else if (mod === '#5') {
                                // Add #5 (8 semitones) - only if no perfect 5th
                                if (!intervals.includes(7) && !intervals.includes(8)) intervals.push(8);
                            } else if (mod === 'no5') {
                                // Remove perfect 5th (7 semitones)
                                intervals = intervals.filter(i => i !== 7);
                            } else if (mod === 'no3') {
                                // Remove 3rd (4 semitones for major, 3 for minor)
                                intervals = intervals.filter(i => i !== 3 && i !== 4);
                            }
                        }
                        
                        // Sort intervals and use as formula
                        formula = intervals.sort((a, b) => a - b);
                    }
                }
            } catch (_) {}
        }
        
        if (!formula) return [];
        return formula.map(interval => this.getNoteFromInterval(root, interval));
    }

    /**
     * Classify chord type from a set of semitone intervals relative to the root
     * Prefers seventh-chord names when available, falls back to triads and sus
     */
    classifyChordTypeFromIntervals(intervals) {
        const set = new Set(intervals);
        const has = (n) => set.has(n);

        // Ensure root present
        if (!has(0)) return null;

        // Seventh chord classification (include augmented 7th variants before generic maj7/m7)
        if ((has(4) && has(8) && has(11))) return 'maj7#5'; // augmented major seventh
        if ((has(3) && has(8) && has(10))) return 'm7#5';   // augmented minor seventh
        if ((has(4) && has(7) && has(11))) return 'maj7';
        if ((has(3) && has(7) && has(10))) return 'm7';
        if ((has(4) && has(7) && has(10))) return '7';
        if ((has(3) && has(6) && has(10))) return 'm7b5';
        if ((has(3) && has(6) && has(9))) return 'dim7';
        if ((has(3) && has(7) && has(11))) return 'mMaj7';
        if ((has(5) && has(7) && has(10))) return '7sus4';
        // Shell voicings (no 5th)
        if (has(5) && has(10) && !has(3) && !has(4)) return '7sus4';
        if (has(2) && has(10) && !has(3) && !has(4)) return '7sus2';

        // Sixths (prefer over plain triads when 6th is present)
        if ((has(4) && has(7) && has(9))) return '6';
        if ((has(3) && has(7) && has(9))) return 'm6';

        // Triads
        if ((has(4) && has(7))) return 'maj';
        if ((has(3) && has(7))) return 'm';
        if ((has(3) && has(6))) return 'dim';
        if ((has(4) && has(8))) return 'aug';
        if ((has(5) && has(7))) return 'sus4';
        if ((has(2) && has(7))) return 'sus2';

        // As a last resort, try exact match with known formulas
        const normalized = Array.from(set).sort((a,b)=>a-b);
        for (const [type, formula] of Object.entries(this.chordFormulas)) {
            const f = Array.from(new Set(formula)).sort((a,b)=>a-b);
            if (f.length === normalized.length && f.every((v,i)=>v===normalized[i])) {
                return type;
            }
        }
        return null;
    }

    /**
     * Classify chord type from notes relative to the given root
     */
    classifyChordTypeFromNotes(root, notes) {
        if (!root || !notes || notes.length === 0) return null;
        const rootVal = this.noteValues[root];
        if (rootVal === undefined) return null;
        const intervals = [];
        const seen = new Set();
        for (const n of notes) {
            const v = this.noteValues[n];
            if (v === undefined) continue;
            const semi = (v - rootVal + 12) % 12;
            if (!seen.has(semi)) { intervals.push(semi); seen.add(semi); }
        }
        return this.classifyChordTypeFromIntervals(intervals);
    }

    /**
     * Generate a consistent synthetic chord type name for non-tertian collections
     * Example output: 'sus2(#11, add6, no5)' or 'modal(add2, #11, no3, no5)'
     */
    generateSyntheticChordType(root, notes) {
        const rootVal = this.noteValues[root];
        if (rootVal === undefined) return 'modal';
        const set = new Set();
        for (const n of notes) {
            const v = this.noteValues[n];
            if (v === undefined) continue;
            set.add((v - rootVal + 12) % 12);
        }
        const has = (i) => set.has(i);

        const hasMaj3 = has(4);
        const hasMin3 = has(3);
        const hasP5 = has(7);
        const hasb5 = has(6);
        const hasSharp5 = has(8);
        const hasMin7 = has(10);
        const hasMaj7 = has(11);

        // Base quality
        let base;
        if (hasMaj3 || hasMin3) {
            base = hasMaj3 ? 'maj' : 'm';
        } else {
            if (has(5) && !has(2)) base = 'sus4';
            else if (has(2)) base = 'sus2';
            else base = 'modal';
        }

        // Seventh suffix (if present)
        if (base.includes('sus')) {
            if (hasMin7) base = '7' + base;
            else if (hasMaj7) base = 'maj7' + base;
        } else {
            if (hasMaj7) base += (base === 'maj' ? '7' : 'maj7');
            else if (hasMin7) base += '7';
        }

        // Build modifiers
        const mods = [];
        // 2/9
        if (has(2)) {
            if (!base.includes('sus2')) mods.push('add2');
        }
        // 4/11 and #11
        if (has(5)) {
            if (!base.includes('sus4')) mods.push('add11');
        }
        if (has(6)) mods.push('#11');
        // 6/13
        if (has(9)) mods.push('add6');
        if (has(8)) mods.push('b13');
        // b9/#9
        if (has(1)) mods.push('b9');
        // Altered fifths as modifiers if perfect fifth missing
        if (!hasP5) {
            if (hasb5) mods.push('b5');
            if (hasSharp5) mods.push('#5');
        }
        // Omissions
        if (!hasMaj3 && !hasMin3 && !base.includes('sus') && !base.includes('modal')) mods.push('no3');
        if (!hasP5 && !hasb5 && !hasSharp5) mods.push('no5');

        return mods.length ? `${base}(${mods.join(', ')})` : base;
    }

    /**
     * Get chord complexity level
     */
    getChordComplexity(chordType) {
        if (chordType.includes('13') || chordType.includes('11') || chordType.includes('9')) {
            return 'extended';
        } else if (chordType.includes('7') || chordType.includes('6')) {
            return 'seventh';
        } else {
            return 'triad';
        }
    }

    /**
     * Build a chord by stacking diatonic thirds within any scale
     */
    buildScaleChord(key, scaleType, degree = 1, size = 3) {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        if (!scaleNotes.length) return { notes: [], degrees: [] };

        const n = scaleNotes.length;
        // For small scales (hexatonic/pentatonic), force triad size (3) unless explicitly larger
        // This prevents automatic 7th chord generation which often sounds wrong in these contexts
        let effSize = size;
        if (n < 7 && size > 3) {
            effSize = 3;
        }
        effSize = Math.max(1, Math.min(effSize, n));

        const start = ((degree - 1) % n + n) % n;
        const notes = [];
        const degrees = [];

        // Stacking logic:
        // For heptatonic (7 notes): skip 1 (thirds) -> index + 2
        // For hexatonic (6 notes): skip 1 (thirds) -> index + 2
        // For pentatonic (5 notes): skip 1 (thirds) -> index + 2
        // The "skip 1" logic is consistent for tertian harmony regardless of scale size
        const step = 2; 

        for (let k = 0; k < effSize; k++) {
            const idx = (start + k * step) % n; 
            notes.push(scaleNotes[idx]);
            const rel = ((idx - start + n) % n);
            degrees.push(rel === 0 ? 1 : (rel + 1));
        }
        
        // DEBUG (verbose): per-chord stacking (guarded)
        try {
            if (typeof window !== 'undefined' && window.__debugEngineVerbose) {
                console.log(`[DEBUG buildScaleChord] scale=${this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType)}, deg=${degree}: scaleNotes=[${scaleNotes.join(',')}], stackedNotes=[${notes.join(',')}]`);
            }
        } catch (_) {}

        return { notes, degrees };
    }

    /**
     * Find all chords containing given notes (container chords)
     */
    findAllContainerChords(notes, scaleNotes) {
        const results = [];

        const key = scaleNotes && scaleNotes.length ? scaleNotes[0] : null;
        const keyVal = key ? this.noteValues[key] : null;

        const semis = (a, b) => (this.noteValues[a] - this.noteValues[b] + 12) % 12;

        const hasMaj3 = (type) => {
            const f = this.chordFormulas[type];
            return f && f.includes(4);
        };

        const hasMin3 = (type) => {
            const f = this.chordFormulas[type];
            return f && f.includes(3);
        };

        const isDominantQuality = (type) => type.includes('7') && !type.includes('maj7');

        const self = this;
        function computeFunctions(root, chordType, keyName) {
            if (!keyName) return { functions: [], resolutions: [] };
            const rootToKey = (self.noteValues[root] - self.noteValues[keyName] + 12) % 12;
            const funcs = new Set();
            const res = new Set();

            const domQual = isDominantQuality(chordType) && hasMaj3(chordType);
            const majTriad = hasMaj3(chordType) && !chordType.includes('7');
            const minQual = hasMin3(chordType) && !hasMaj3(chordType);

            switch (rootToKey) {
                case 0: // I
                    if (chordType.includes('#5') || chordType.includes('aug')) funcs.add('Tonic (color)');
                    else funcs.add('Tonic');
                    res.add('—');
                    break;
                case 2: // II
                    if (minQual) funcs.add('Predominant');
                    if (domQual) { funcs.add('Secondary Dominant (to V)'); res.add('→ V'); }
                    else res.add('→ V');
                    break;
                case 4: // III
                    if (domQual || majTriad) { funcs.add('Secondary Dominant (to vi)'); res.add('→ vi'); }
                    else funcs.add('Tonic Prolongation');
                    break;
                case 5: // IV
                    funcs.add('Predominant'); res.add('→ V');
                    break;
                case 7: // V
                    funcs.add('Dominant'); res.add('→ I');
                    break;
                case 9: // VI
                    if (minQual) funcs.add('Tonic Prolongation'); else funcs.add('Predominant');
                    res.add('→ ii or → V');
                    break;
                case 11: // VII
                    if (chordType.includes('dim')) { funcs.add('Leading-tone'); res.add('→ I or → V'); }
                    else funcs.add('Dominant Color');
                    break;
                case 1: // bII
                    if (domQual || majTriad) { funcs.add('Tritone Sub (of V)'); res.add('→ V'); }
                    else funcs.add('Modal Interchange');
                    break;
                case 8: // bVI
                    funcs.add('Modal Interchange (bVI)'); res.add('→ V');
                    break;
                case 10: // bVII
                    funcs.add('Modal Interchange (bVII)'); res.add('→ I or → V');
                    break;
                case 3: // bIII
                    funcs.add('Modal Interchange (bIII)'); res.add('→ IV or → I');
                    break;
                default:
                    funcs.add('Chromatic/Pivot');
                    res.add('contextual');
            }

            if (domQual && !funcs.has('Secondary Dominant (to vi)') && !funcs.has('Tritone Sub (of V)') && !funcs.has('Dominant')) {
                funcs.add('Dominant-like');
            }

            return { functions: Array.from(funcs), resolutions: Array.from(res) };
        }

        this.chromaticNotes.forEach(root => {
            Object.entries(this.chordFormulas).forEach(([chordType, formula]) => {
                const chordNotes = this.getChordNotes(root, chordType);
                const anyNoteContained = notes.some(note => chordNotes.includes(note));
                if (!anyNoteContained) return;

                const scaleMatchCount = chordNotes.filter(cn => scaleNotes.includes(cn)).length;
                const scaleMatchPercent = Math.round((scaleMatchCount / chordNotes.length) * 100);

                const roles = notes.map(note => {
                    const noteValue = this.noteValues[note];
                    const rootValue = this.noteValues[root];
                    const interval = (noteValue - rootValue + 12) % 12;

                    let role = 'Extension';
                    let roleClass = 'extension';

                    if (interval === 0) { role = 'Root'; roleClass = 'root'; }
                    else if (interval === 3 || interval === 4) { role = interval === 3 ? 'Minor 3rd' : 'Major 3rd'; roleClass = 'third'; }
                    else if (interval === 6 || interval === 7) { role = interval === 6 ? 'Dim 5th' : 'Perfect 5th'; roleClass = 'fifth'; }
                    else if (interval === 10 || interval === 11) { role = interval === 10 ? 'Minor 7th' : 'Major 7th'; roleClass = 'seventh'; }
                    else if (interval === 2 || interval === 9) { role = interval === 2 ? 'Major 9th' : 'Major 2nd'; roleClass = 'ninth'; }
                    else if (interval === 5 || interval === 8) { role = interval === 5 ? 'Perfect 4th' : 'Aug 5th'; roleClass = 'eleventh'; }

                    return { note, interval, role, class: roleClass };
                });

                const functions = computeFunctions(root, chordType, key);
                const complexity = this.getChordComplexity(chordType);

                results.push({
                    fullName: root + chordType,
                    root,
                    chordType,
                    chordNotes,
                    roles,
                    scaleMatchPercent,
                    functions: functions.functions,
                    resolutions: functions.resolutions,
                    complexity,
                    likelihood: scaleMatchPercent === 100 ? 'Perfect' : scaleMatchPercent >= 75 ? 'Excellent' : scaleMatchPercent >= 50 ? 'Good' : 'Fair'
                });
            });
        });

        // Sort by scale match percentage, then by function importance
        return results.sort((a, b) => {
            const funcScore = (chord) => {
                const funcOrder = ['Tonic', 'Dominant', 'Predominant', 'Secondary Dominant', 'Leading-tone', 'Tritone Sub'];
                const aIdx = funcOrder.findIndex(f => chord.functions.includes(f));
                const bIdx = funcOrder.findIndex(f => chord.functions.includes(f));
                if (aIdx !== bIdx) return aIdx - bIdx;
                return b.scaleMatchPercent - a.scaleMatchPercent;
            };

            const cmpFunc = funcScore(a) - funcScore(b);
            if (cmpFunc !== 0) return cmpFunc;
            return a.chordNotes.length - b.chordNotes.length;
        });
    }

    /**
     * Get diatonic chord for a scale degree
     */
    getDiatonicChord(degree, key, scaleType = 'major') {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        if (!scaleNotes || scaleNotes.length === 0) return { root: key, chordType: 'maj', fullName: key + 'maj', diatonicNotes: [] };
        let root = scaleNotes[(degree - 1) % scaleNotes.length];

        // Preserve Barry Harris special-case mapping
        const isBarryScale = String(scaleType).startsWith('barry_');
        if (isBarryScale) {
            const chordTypes = this.barry8ChordTypes;
            const chordType = chordTypes[(degree - 1) % chordTypes.length];
            return { root, chordType, fullName: root + chordType, diatonicNotes: this.buildScaleChord(key, scaleType, degree, 4).notes };
        }

        // Normalize scale identifier
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        
        // Determine default chord size: 4 (sevenths) for heptatonic+, 3 (triads) for smaller scales
        const defaultSize = (scaleNotes.length < 7) ? 3 : 4;
        
        // Build diatonic stacked-third chord from the selected scale
        let stacked = this.buildScaleChord(key, scaleId, degree, defaultSize);

        // For melodic-minor family scales, prefer flat spellings for roots/notes
        // to avoid enharmonic mis-labeling (e.g., prefer 'Eb' over 'D#').
        // For harmonic-minor family and scales with sharp alterations, prefer sharp spellings
        // because they commonly use raised alterations (e.g., G# not Ab, F# not Gb).
        const melodicFamilyFlats = new Set(['melodic','dorian_b2','lydian_augmented','mixolydian_b6','locrian_nat2','altered']);
        const harmonicAndSharpScales = new Set([
            'harmonic','locrian_nat6','ionian_augmented','dorian_sharp4','phrygian_dominant',
            'lydian_sharp2','altered_diminished','lydian_dominant',
            'harmonic_major','lydian_b3','ionian_augmented_sharp2','lydian_sharp2_sharp6',
            'double_harmonic_major','hungarian_minor'
        ]);
        try {
            if (melodicFamilyFlats.has(String(scaleId))) {
                // If root currently spelled with a sharp, re-spell to flat-preferred enharmonic
                if (String(root).includes('#')) {
                    const rv = this.noteValues[root];
                    if (rv !== undefined) {
                        const preferred = this.spellSemitoneWithPreference(rv, true, null);
                        if (preferred) root = preferred;
                    }
                }
                // Re-spell stacked notes to match preferred root spelling
                stacked = { notes: this.spellNotesForRoot(root, stacked.notes), degrees: stacked.degrees };
            } else if (harmonicAndSharpScales.has(String(scaleId))) {
                // If root currently spelled with a flat, re-spell to sharp-preferred enharmonic
                if (String(root).includes('b')) {
                    const rv = this.noteValues[root];
                    if (rv !== undefined) {
                        const preferred = this.spellSemitoneWithPreference(rv, false, null);
                        if (preferred) root = preferred;
                    }
                }
                // Re-spell stacked notes to match preferred root spelling (sharp preference)
                stacked = { notes: this.spellNotesForRoot(root, stacked.notes), degrees: stacked.degrees };
            }
        } catch (e) { /* ignore */ }

        let chordType = this.classifyChordTypeFromNotes(root, stacked.notes);
        
        // DEBUG (verbose): per-chord classification (guarded)
        try {
            if (typeof window !== 'undefined' && window.__debugEngineVerbose) {
                const rootVal = this.noteValues[root];
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b) => a-b);
                console.log(`[DEBUG classify] scale=${this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType)}, deg=${degree}: root=${root}, notes=[${stacked.notes.join(',')}], intervals=[${intervals.join(',')}], type=${chordType}`);
            }
        } catch (_) {}

        // Special cases for lydian_augmented degree 1: augmented major 7 (maj7#5)
        if (String(scaleId).toLowerCase() === 'lydian_augmented' && degree === 1) {
            // Verify the chord has augmented major 7 intervals: [0, 4, 8, 11]
            const rootVal = this.noteValues[root];
            if (rootVal !== undefined) {
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b) => a-b);
                const augMaj7Formula = [0, 4, 8, 11];
                const isAugMaj7 = augMaj7Formula.every(i => intervals.includes(i));
                if (isAugMaj7) {
                    chordType = 'maj7#5';
                }
            }
        }

        // Harmonic minor family: force degree 3 to augmented major 7 if notes match
        if (harmonicAndSharpScales.has(String(scaleId)) && degree === 3) {
            // Check if the stacked notes match the augmented major 7 formula
            const augMaj7Formula = [0, 4, 8, 11];
            const rootVal = this.noteValues[root];
            const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12);
            const isAugMaj7 = augMaj7Formula.every(i => intervals.includes(i));
            if (isAugMaj7) {
                chordType = 'maj7#5';
            }
        }

        // Melodic minor explicit enforcement for canon chord qualities
        if (String(scaleId).toLowerCase() === 'melodic') {
            try {
                const rootVal = this.noteValues[root];
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b)=>a-b);
                if (degree === 1) {
                    // mMaj7: [0,3,7,11]
                    const isMMaj7 = [0,3,7,11].every(i => intervals.includes(i));
                    if (isMMaj7) chordType = 'mMaj7';
                } else if (degree === 3) {
                    // maj7#5: [0,4,8,11]
                    const isMaj7Sharp5 = [0,4,8,11].every(i => intervals.includes(i));
                    if (isMaj7Sharp5) chordType = 'maj7#5';
                } else if (degree === 4 || degree === 5) {
                    // Dominant 7th: [0,4,7,10]
                    const isDom = [0,4,7,10].every(i => intervals.includes(i));
                    if (isDom) chordType = '7';
                } else if (degree === 6 || degree === 7) {
                    // Half-diminished: [0,3,6,10]
                    const isHalfDim = [0,3,6,10].every(i => intervals.includes(i));
                    if (isHalfDim) chordType = 'm7b5';
                }
            } catch (_) {}
        }

        // If classification fails, try triad; if still fails, synthesize a consistent name
        if (!chordType) {
            const triad = this.buildScaleChord(key, scaleType, degree, 3);
            chordType = this.classifyChordTypeFromNotes(root, triad.notes);
        }
        if (!chordType) {
            chordType = this.generateSyntheticChordType(root, stacked.notes);
        }

        // Honor any explicit display-token override (° vs ø) coming from the NumberGenerator.
        // NOTE: Do not assume the displayTokens array aligns by index with scale degrees
        // (trailing spaces or extra tokens can shift lengths). Instead, scan tokens
        // and match Roman numerals to the requested degree. This avoids index-shift
        // bugs where a trailing space would change which degree receives a symbol.
        try {
            if (typeof window !== 'undefined' && window.modularApp && window.modularApp.numberGenerator && typeof window.modularApp.numberGenerator.getCurrentDisplayTokens === 'function') {
                const displayTokens = window.modularApp.numberGenerator.getCurrentDisplayTokens();
                if (Array.isArray(displayTokens) && displayTokens.length > 0) {
                    const romanToInt = (r) => {
                        if (!r) return null;
                        const s = String(r).toUpperCase();
                        const map = { 'I':1, 'II':2, 'III':3, 'IV':4, 'V':5, 'VI':6, 'VII':7 };
                        return map[s] || null;
                    };

                    for (let i = 0; i < displayTokens.length; i++) {
                        const t = displayTokens[i];
                        if (!t) continue;
                        const m = String(t).match(/^([#b♯♭]*)([IViv]+)(.*)$/);
                        if (!m) continue;
                        const roman = m[2];
                        const tokDegree = romanToInt(roman);
                        if (tokDegree === degree) {
                            const tok = String(t);
                            // Accept both symbol forms and canonical text forms for half-diminished/diminished
                            if (/(°|dim(?!.*maj))/i.test(tok)) {
                                chordType = 'dim7';
                            } else if (/(ø|m7b5|half-?dim)/i.test(tok)) {
                                chordType = 'm7b5';
                            }
                            break;
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }

        return { root, chordType, fullName: root + chordType, diatonicNotes: stacked.notes };
    }

    /**
     * Get all available scales grouped by category
     */
    getScaleCategories() {
        return {
            '🎵 Major Scale & Modes': [
                'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'
            ],
            '🎼 Melodic Minor & Modes': [
                'melodic', 'dorian_b2', 'lydian_augmented', 'lydian_dominant', 
                'mixolydian_b6', 'locrian_nat2', 'altered'
            ],
            '🎹 Harmonic Minor & Modes': [
                'harmonic', 'locrian_nat6', 'ionian_augmented', 'dorian_sharp4',
                'phrygian_dominant', 'lydian_sharp2', 'altered_diminished'
            ],
            '🎶 Harmonic Major & Modes': [
                'harmonic_major', 'dorian_b5', 'phrygian_b4', 'lydian_b3',
                'mixolydian_b2', 'aeolian_b1', 'locrian_bb7'
            ],
            '🌟 Double Harmonic & Modes': [
                'double_harmonic_major', 'lydian_sharp2_sharp6', 'ultraphrygian',
                'hungarian_minor', 'oriental', 'ionian_augmented_sharp2', 'locrian_bb3_bb7'
            ],
            '⚖️ Symmetric Scales': [
                'whole_tone', 'octatonic_dim', 'octatonic_dom', 'augmented', 'tritone', 'prometheus'
            ],
            '🎸 Pentatonic Scales': [
                'major_pentatonic', 'minor_pentatonic', 'egyptian_pentatonic',
                'blues_minor_pentatonic', 'blues_major_pentatonic',
                'hirajoshi', 'iwato', 'insen', 'yo'
            ],
            '🎺 Hexatonic Scales': [
                'blues_hexatonic', 'whole_tone_hexatonic', 'augmented_hexatonic', 'prometheus_hexatonic'
            ],
            '🕌 Middle Eastern Scales': [
                'hijaz', 'hijaz_kar', 'maqam_bayati', 'maqam_rast', 'maqam_ajam', 'maqam_nahawand', 'maqam_kurd', 'persian'
            ],
            '🪔 Indian Ragas': [
                'raga_bhairav', 'raga_todi', 'raga_marwa', 'raga_purvi', 'raga_kafi', 'raga_bhairavi'
            ],
            '💃 Spanish & Flamenco': [
                'spanish_phrygian', 'spanish_gypsy', 'flamenco'
            ],
            '🎷 Jazz & Bebop': [
                'bebop_major', 'bebop_dominant', 'bebop_minor', 'bebop_dorian'
            ],
            '🎹 Barry Harris Method': [
                'barry_major6dim', 'barry_dom7dim', 'barry_minor6dim'
            ],
            '✨ Exotic & Modern': [
                'enigmatic', 'neapolitan_major', 'neapolitan_minor',
                'romanian_minor', 'ukrainian_dorian', 'leading_whole_tone'
            ],
            '🌎 South American Scales': [
                // Argentine
                'chacarera', 'zamba', 'milonga', 'tango_minor', 'vidala',
                // Chilean
                'cueca', 'tonada',
                // Peruvian
                'marinera', 'huayno', 'yaraví',
                // Colombian
                'bambuco', 'cumbia', 'vallenato',
                // Venezuelan
                'joropo', 'merengue_venezolano',
                // Brazilian
                'samba', 'bossa_nova', 'choro', 'forró',
                // Bolivian
                'morenada', 'tinku',
                // Ecuadorian
                'pasillo', 'sanjuanito',
                // Paraguayan
                'guarania', 'polka_paraguaya',
                // Uruguayan
                'candombe'
            ],
            '🌍 African Scales': [
                // West African
                'pentatonic_african', 'heptatonic_akan', 'kora_scale', 'balafon_scale',
                'yoruba_traditional', 'ewe_traditional', 'hausa_pentatonic', 'fulani_pastoral',
                'mandinka_griot', 'wolof_sabar',
                // Central African
                'mbira_tuning', 'pygmy_polyphonic', 'bantu_traditional', 'congolese_rumba',
                // East African
                'ethiopian_pentatonic', 'ethiopian_tezeta', 'kenyan_benga', 'ugandan_traditional', 'tanzanian_taarab',
                // Southern African
                'xylophone_chopi', 'zulu_traditional', 'xhosa_traditional', 'sotho_traditional', 
                'south_african_jazz', 'marabi_scale',
                // North African
                'berber_traditional', 'tuareg_pentatonic', 'moroccan_andalusi', 'algerian_chaabi', 'egyptian_maqam_influenced',
                // Additional Regional
                'san_bushmen', 'dogon_traditional', 'bambara_traditional', 'senufo_traditional'
            ]
        };
    }

    /**
     * Get citation/derivation for a scale with enhanced academic format support
     */
    getScaleCitation(scaleType, format = 'text') {
        const citation = this.scaleCitations[scaleType];
        
        if (!citation) {
            return format === 'html' ? 
                '<span>Scale derivation not documented</span>' : 
                'Scale derivation not documented';
        }
        
        // Handle both old string format and new object format
        if (typeof citation === 'string') {
            return citation;
        }
        
        // Prioritize academic sources using CitationManager if available
        let prioritizedReferences = citation.references || [];
        if (typeof CitationManager !== 'undefined' && prioritizedReferences.length > 0) {
            try {
                const citationManager = new CitationManager();
                prioritizedReferences = citationManager.prioritizeAcademicSources(prioritizedReferences);
            } catch (error) {
                // Continue with original order if CitationManager fails
                console.warn('CitationManager not available for source prioritization');
            }
        }
        
        if (format === 'html') {
            return this.formatCitationHTML(citation, prioritizedReferences);
        } else if (format === 'academic') {
            return this.formatCitationAcademic(citation, prioritizedReferences);
        }
        
        // Default text format
        return this.formatCitationText(citation, prioritizedReferences);
    }

    /**
     * Format citation in HTML format with enhanced academic features
     */
    formatCitationHTML(citation, references) {
        let html = `<div class="scale-citation-content">`;
        
        // Description
        html += `<div class="citation-description">${citation.description}</div>`;
        
        // Cultural context if available
        if (citation.culturalContext) {
            html += `<div class="cultural-context">`;
            html += `<strong>Cultural Context:</strong> `;
            const context = citation.culturalContext;
            const contextParts = [];
            if (context.region) contextParts.push(`Region: ${context.region}`);
            if (context.culturalGroup) contextParts.push(`Cultural Group: ${context.culturalGroup}`);
            if (context.historicalPeriod) contextParts.push(`Period: ${context.historicalPeriod}`);
            if (context.musicalFunction) contextParts.push(`Function: ${context.musicalFunction}`);
            html += contextParts.join(' | ');
            html += `</div>`;
        }
        
        // Scholarly debate acknowledgment
        if (citation.scholarlyDebate && citation.scholarlyDebate.acknowledged) {
            html += `<div class="scholarly-debate">`;
            html += `<strong>Scholarly Note:</strong> ${citation.scholarlyDebate.description || 'Multiple scholarly interpretations exist for this scale.'}`;
            html += `</div>`;
        }
        
        // References with different citation types
        if (references && references.length > 0) {
            html += `<div class="citation-references">`;
            html += `<strong>References:</strong><br>`;
            
            references.forEach((ref, index) => {
                html += `<div class="reference-item">`;
                html += `${index + 1}. `;
                
                // Format based on citation type
                if (ref.type === 'journal_article') {
                    html += this.formatJournalArticleHTML(ref);
                } else if (ref.type === 'book') {
                    html += this.formatBookHTML(ref);
                } else if (ref.type === 'ethnomusicological_study') {
                    html += this.formatEthnomusicologicalStudyHTML(ref);
                } else {
                    html += this.formatGenericReferenceHTML(ref);
                }
                
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Alternative sources if available
        if (citation.alternativeSources && citation.alternativeSources.length > 0) {
            html += `<div class="alternative-sources">`;
            html += `<strong>Alternative Sources:</strong> `;
            html += citation.alternativeSources.map(alt => 
                `<a href="${alt.url}" target="_blank" rel="noopener noreferrer">${alt.title}</a>`
            ).join(' • ');
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }

    /**
     * Format citation in academic text format
     */
    formatCitationAcademic(citation, references) {
        let text = citation.description + '\n\n';
        
        // Cultural context
        if (citation.culturalContext) {
            text += 'Cultural Context:\n';
            const context = citation.culturalContext;
            if (context.region) text += `  Region: ${context.region}\n`;
            if (context.culturalGroup) text += `  Cultural Group: ${context.culturalGroup}\n`;
            if (context.historicalPeriod) text += `  Historical Period: ${context.historicalPeriod}\n`;
            if (context.musicalFunction) text += `  Musical Function: ${context.musicalFunction}\n`;
            text += '\n';
        }
        
        // Scholarly debate
        if (citation.scholarlyDebate && citation.scholarlyDebate.acknowledged) {
            text += `Scholarly Note: ${citation.scholarlyDebate.description || 'Multiple scholarly interpretations exist for this scale.'}\n\n`;
        }
        
        // References with proper academic formatting
        if (references && references.length > 0) {
            text += 'References:\n';
            references.forEach((ref, index) => {
                text += `${index + 1}. `;
                if (typeof CitationManager !== 'undefined') {
                    try {
                        const citationManager = new CitationManager();
                        text += citationManager.formatAcademicCitation(ref, 'academic') + '\n';
                    } catch (error) {
                        text += this.formatReferenceText(ref) + '\n';
                    }
                } else {
                    text += this.formatReferenceText(ref) + '\n';
                }
            });
            text += '\n';
        }
        
        // Alternative sources
        if (citation.alternativeSources && citation.alternativeSources.length > 0) {
            text += 'Alternative Sources:\n';
            citation.alternativeSources.forEach((alt, index) => {
                text += `${index + 1}. ${alt.title}\n`;
            });
        }
        
        return text.trim();
    }

    /**
     * Format citation in simple text format
     */
    formatCitationText(citation, references) {
        let text = citation.description;
        
        // Add scholarly debate note if present
        if (citation.scholarlyDebate && citation.scholarlyDebate.acknowledged) {
            text += `\n\nNote: ${citation.scholarlyDebate.description || 'Multiple scholarly interpretations exist.'}`;
        }
        
        if (references && references.length > 0) {
            text += '\n\nReferences: ' + references.map(ref => ref.title).join(', ');
        }
        
        return text;
    }

    /**
     * Format journal article reference in HTML
     */
    formatJournalArticleHTML(ref) {
        let html = '';
        if (ref.authors && ref.authors.length > 0) {
            html += ref.authors.join(', ') + '. ';
        }
        if (ref.year) html += `(${ref.year}). `;
        if (ref.title) html += `"${ref.title}." `;
        if (ref.journal) {
            html += `<em>${ref.journal}</em>`;
            if (ref.volume) html += ` ${ref.volume}`;
            if (ref.issue) html += `(${ref.issue})`;
            if (ref.pages) html += `: ${ref.pages}`;
            html += '. ';
        }
        if (ref.url) {
            html += `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">Link</a>`;
        }
        return html;
    }

    /**
     * Format book reference in HTML
     */
    formatBookHTML(ref) {
        let html = '';
        if (ref.authors && ref.authors.length > 0) {
            html += ref.authors.join(', ') + '. ';
        }
        if (ref.year) html += `(${ref.year}). `;
        if (ref.title) html += `<em>${ref.title}</em>. `;
        if (ref.publisher) html += `${ref.publisher}. `;
        if (ref.pages) html += `pp. ${ref.pages}. `;
        if (ref.url) {
            html += `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">Link</a>`;
        }
        return html;
    }

    /**
     * Format ethnomusicological study reference in HTML
     */
    formatEthnomusicologicalStudyHTML(ref) {
        // Similar to journal article but with ethnomusicological context
        return this.formatJournalArticleHTML(ref);
    }

    /**
     * Format generic reference in HTML
     */
    formatGenericReferenceHTML(ref) {
        let html = '';
        if (ref.title) html += `${ref.title}. `;
        if (ref.authors && ref.authors.length > 0) {
            html += `By ${ref.authors.join(', ')}. `;
        }
        if (ref.year) html += `${ref.year}. `;
        if (ref.url) {
            html += `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">Link</a>`;
        }
        return html;
    }

    /**
     * Format reference in plain text
     */
    formatReferenceText(ref) {
        let text = '';
        if (ref.authors && ref.authors.length > 0) {
            text += ref.authors.join(', ') + '. ';
        }
        if (ref.year) text += `(${ref.year}). `;
        if (ref.title) text += `"${ref.title}." `;
        if (ref.journal) {
            text += `${ref.journal}`;
            if (ref.volume) text += ` ${ref.volume}`;
            if (ref.issue) text += `(${ref.issue})`;
            if (ref.pages) text += `: ${ref.pages}`;
            text += '. ';
        } else if (ref.publisher) {
            text += `${ref.publisher}. `;
        }
        return text.trim();
    }

    /**
     * Check citation format consistency for a scale
     */
    checkCitationFormatConsistency(scaleType) {
        const citation = this.scaleCitations[scaleType];
        
        if (!citation || typeof citation === 'string') {
            return {
                consistent: false,
                issues: ['Citation not in new academic format'],
                hasPageNumbers: false,
                hasMultipleSources: false
            };
        }
        
        const issues = [];
        let hasPageNumbers = false;
        let hasMultipleSources = false;
        
        // Check if references exist and have proper format
        if (!citation.references || !Array.isArray(citation.references)) {
            issues.push('No references array found');
        } else {
            hasMultipleSources = citation.references.length > 1;
            
            citation.references.forEach((ref, index) => {
                if (!ref.title) issues.push(`Reference ${index + 1}: Missing title`);
                if (!ref.authors || !Array.isArray(ref.authors) || ref.authors.length === 0) {
                    issues.push(`Reference ${index + 1}: Missing or invalid authors`);
                }
                if (!ref.year) issues.push(`Reference ${index + 1}: Missing year`);
                if (!ref.type) issues.push(`Reference ${index + 1}: Missing type`);
                if (ref.pages) hasPageNumbers = true;
                if (!ref.url) issues.push(`Reference ${index + 1}: Missing URL`);
            });
        }
        
        // Check for required fields
        if (!citation.description) issues.push('Missing description');
        
        return {
            consistent: issues.length === 0,
            issues: issues,
            hasPageNumbers: hasPageNumbers,
            hasMultipleSources: hasMultipleSources,
            hasScholarlyDebate: citation.scholarlyDebate && citation.scholarlyDebate.acknowledged,
            hasAlternativeSources: citation.alternativeSources && citation.alternativeSources.length > 0
        };
    }

    /**
     * Get all available chord types
     */
    getChordTypes() {
        return Object.keys(this.chordFormulas);
    }

    /**
     * Get all available keys
     */
    getKeys() {
        return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    }

    // --- Enhanced Centralized Grading Event System ---

    /**
     * Set grading mode with enhanced event broadcasting
     */
    setGradingMode(mode, options = {}) {
        if (!['functional', 'emotional', 'color'].includes(mode)) {
            console.warn(`Invalid grading mode: ${mode}`);
            return false;
        }

        const oldMode = this.gradingMode;
        if (oldMode === mode) return true; // No change needed

        this.gradingMode = mode;
        
        // Create grading change event
        const event = {
            type: 'gradingModeChanged',
            data: {
                oldMode: oldMode,
                newMode: mode,
                timestamp: Date.now(),
                options: options
            },
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        // Broadcast to all subscribers with enhanced error handling
        this.broadcastGradingEvent(event);
        return true;
    }

    /**
     * Enhanced module subscription system
     */
    subscribe(callback, moduleId = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const subscription = {
            callback: callback,
            moduleId: moduleId,
            subscribed: Date.now(),
            active: true
        };

        this.listeners.add(subscription);

        // Initialize module state if provided
        if (moduleId) {
            this.initializeModuleState(moduleId);
        }

        // Return unsubscribe function
        return () => {
            subscription.active = false;
            this.listeners.delete(subscription);
            if (moduleId) {
                this.moduleStates.delete(moduleId);
            }
        };
    }

    /**
     * Initialize grading state for a module
     */
    initializeModuleState(moduleId) {
        if (!this.moduleStates.has(moduleId)) {
            this.moduleStates.set(moduleId, {
                moduleId: moduleId,
                currentMode: this.gradingMode,
                gradingInfluence: {
                    visualWeight: 1.0,
                    behavioralWeight: 1.0,
                    suggestionWeight: 1.0
                },
                lastUpdate: Date.now(),
                activeElements: new Map(),
                pendingUpdates: [],
                status: 'initialized'
            });
        }
    }

    /**
     * Broadcast grading event with retry mechanism
     */
    broadcastGradingEvent(event) {
        const startTime = Date.now();
        const failedSubscriptions = [];

        // Add to event queue for tracking
        this.gradingEventQueue.push(event);

        // Notify all active subscribers synchronously for immediate propagation
        for (const subscription of this.listeners) {
            if (!subscription.active) continue;

            try {
                // Execute callback synchronously
                const result = subscription.callback(event.type, event.data);
                
                // Update module state on successful callback
                if (subscription.moduleId) {
                    this.updateModuleState(subscription.moduleId, event);
                }

            } catch (error) {
                console.warn(`Grading event callback failed for module ${subscription.moduleId}:`, error);
                failedSubscriptions.push({
                    subscription: subscription,
                    error: error,
                    event: event
                });
            }
        }

        // Handle failed subscriptions with retry mechanism
        if (failedSubscriptions.length > 0) {
            this.handleFailedSubscriptions(failedSubscriptions);
        }

        // Log event completion
        const duration = Date.now() - startTime;
        console.log(`Grading event ${event.type} broadcasted to ${this.listeners.size} modules in ${duration}ms`);
    }

    /**
     * Handle failed subscriptions with retry mechanism
     */
    handleFailedSubscriptions(failedSubscriptions) {
        for (const failure of failedSubscriptions) {
            const { subscription, error, event } = failure;

            if (event.retryCount < this.maxRetries) {
                // Add to retry queue
                const retryEvent = {
                    ...event,
                    retryCount: event.retryCount + 1,
                    retryReason: error.message
                };

                this.eventRetryQueue.push({
                    subscription: subscription,
                    event: retryEvent,
                    scheduledTime: Date.now() + (this.retryDelay * Math.pow(2, event.retryCount))
                });

                console.log(`Scheduling retry ${event.retryCount} for module ${subscription.moduleId}`);
            } else {
                console.error(`Max retries exceeded for module ${subscription.moduleId}:`, error);
                // Mark module as failed
                if (subscription.moduleId) {
                    const moduleState = this.moduleStates.get(subscription.moduleId);
                    if (moduleState) {
                        moduleState.status = 'failed';
                        moduleState.lastError = error.message;
                    }
                }
            }
        }

        // Process retry queue
        this.processRetryQueue();
    }

    /**
     * Process retry queue with exponential backoff
     */
    processRetryQueue() {
        const now = Date.now();
        const readyRetries = this.eventRetryQueue.filter(retry => retry.scheduledTime <= now);

        for (const retry of readyRetries) {
            try {
                retry.subscription.callback(retry.event.type, retry.event.data);
                
                // Update module state on successful retry
                if (retry.subscription.moduleId) {
                    this.updateModuleState(retry.subscription.moduleId, retry.event);
                }

                console.log(`Retry successful for module ${retry.subscription.moduleId}`);
            } catch (error) {
                console.warn(`Retry failed for module ${retry.subscription.moduleId}:`, error);
                
                // Re-queue if retries remaining
                if (retry.event.retryCount < this.maxRetries) {
                    retry.event.retryCount++;
                    retry.scheduledTime = now + (this.retryDelay * Math.pow(2, retry.event.retryCount));
                } else {
                    // Mark as permanently failed
                    if (retry.subscription.moduleId) {
                        const moduleState = this.moduleStates.get(retry.subscription.moduleId);
                        if (moduleState) {
                            moduleState.status = 'failed';
                            moduleState.lastError = error.message;
                        }
                    }
                }
            }
        }

        // Remove processed retries
        this.eventRetryQueue = this.eventRetryQueue.filter(retry => retry.scheduledTime > now);

        // Schedule next retry processing if needed
        if (this.eventRetryQueue.length > 0) {
            const nextRetryTime = Math.min(...this.eventRetryQueue.map(r => r.scheduledTime));
            const delay = Math.max(0, nextRetryTime - now);
            setTimeout(() => this.processRetryQueue(), delay);
        }
    }

    /**
     * Update module state after successful event processing
     */
    updateModuleState(moduleId, event) {
        const moduleState = this.moduleStates.get(moduleId);
        if (!moduleState) return;

        moduleState.lastUpdate = Date.now();
        moduleState.status = 'synchronized';

        if (event.type === 'gradingModeChanged') {
            moduleState.currentMode = event.data.newMode;
        }

        // Clear any pending updates for this event type
        moduleState.pendingUpdates = moduleState.pendingUpdates.filter(
            update => update.type !== event.type
        );
    }

    /**
     * Get current grading state synchronization status
     */
    getGradingSyncStatus() {
        const status = {
            totalModules: this.moduleStates.size,
            synchronized: 0,
            failed: 0,
            pending: 0,
            currentMode: this.gradingMode,
            eventQueueSize: this.gradingEventQueue.length,
            retryQueueSize: this.eventRetryQueue.length
        };

        for (const [moduleId, state] of this.moduleStates) {
            switch (state.status) {
                case 'synchronized':
                    status.synchronized++;
                    break;
                case 'failed':
                    status.failed++;
                    break;
                default:
                    status.pending++;
            }
        }

        return status;
    }

    /**
     * Force synchronization of all modules
     */
    forceSynchronizeModules() {
        const event = {
            type: 'forceSynchronization',
            data: {
                currentMode: this.gradingMode,
                timestamp: Date.now(),
                reason: 'Manual synchronization requested'
            },
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        this.broadcastGradingEvent(event);
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `grading_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Legacy method for backward compatibility
     */
    notifyListeners(event, data) {
        // Convert to new event format
        const gradingEvent = {
            type: event,
            data: data,
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        this.broadcastGradingEvent(gradingEvent);
    }

    /**
     * Get module grading state
     */
    getModuleGradingState(moduleId) {
        return this.moduleStates.get(moduleId) || null;
    }

    /**
     * Set module grading influence weights
     */
    setModuleGradingInfluence(moduleId, influence) {
        const moduleState = this.moduleStates.get(moduleId);
        if (moduleState) {
            moduleState.gradingInfluence = {
                ...moduleState.gradingInfluence,
                ...influence
            };
            moduleState.lastUpdate = Date.now();
        }
    }

    getGradingTierInfo(tier, context = {}) {
        const type = this.gradingMode;
        let tierInfo;

        if (type === 'emotional') {
            const tiers = [
                { label: '🌑 Somber', color: '#60a5fa', short: '🌑', name: 'Somber', desc: 'Deep, sad, serious' },
                { label: '🌧️ Melancholy', color: '#93c5fd', short: '🌧️', name: 'Melancholy', desc: 'Pensive, longing' },
                { label: '😐 Neutral', color: '#d1d5db', short: '😐', name: 'Neutral', desc: 'Balanced, plain' },
                { label: '☀️ Bright', color: '#fbbf24', short: '☀️', name: 'Bright', desc: 'Happy, energetic' },
                { label: '✨ Radiant', color: '#f9a8d4', short: '✨', name: 'Radiant', desc: 'Ecstatic, magical' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        } else if (type === 'color') {
             const tiers = [
                { label: 'Deep Blue', color: '#93c5fd', short: 'Blue', name: 'Deep', desc: 'Calm, depth' },
                { label: 'Purple', color: '#c4b5fd', short: 'Purp', name: 'Rich', desc: 'Royal, complex' },
                { label: 'Green', color: '#6ee7b7', short: 'Grn', name: 'Natural', desc: 'Organic, grounded' },
                { label: 'Orange', color: '#fdba74', short: 'Org', name: 'Warm', desc: 'Energetic, friendly' },
                { label: 'Yellow', color: '#fde68a', short: 'Yel', name: 'Bright', desc: 'Optimistic, light' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        } else {
            // Default: Functional
            const tiers = [
                { label: '○ Experimental', color: '#9ca3af', short: '○', name: 'Experimental', desc: '(chromatic)' },
                { label: '◐ Fair', color: '#c4b5fd', short: '◐', name: 'Fair', desc: '(chromatic functional)' },
                { label: '★ Good', color: '#fbbf24', short: '★', name: 'Good', desc: '(in-scale)' },
                { label: '★★ Excellent', color: '#38bdf8', short: '★★', name: 'Excellent', desc: '(in-scale functional)' },
                { label: '★★★ Perfect', color: '#10b981', short: '★★★', name: 'Perfect', desc: '(diatonic scale chord)' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        }

        // Enhanced tier info with additional properties
        return {
            ...tierInfo,
            tier: tier,
            mode: type,
            // Enhanced properties for accessibility and educational context
            accessibilityInfo: this.getAccessibleGradingInfo(tier, { mode: type }),
            educationalContext: this.getEducationalContext(tier, type),
            contextualRelevance: context.relevance || 1.0,
            theoreticalBasis: this.getTheoreticalBasis(tier, type, context),
            suggestedActions: this.getSuggestedActions(tier, type, context)
        };
    }

    /**
     * Calculate grading tier for a musical element in context
     */
    calculateElementGrade(element, context = {}) {
        const { key = 'C', scaleType = 'major', elementType = 'note' } = context;
        
        if (elementType === 'note') {
            return this.calculateNoteGrade(element, key, scaleType, context);
        } else if (elementType === 'chord') {
            return this.calculateChordGrade(element, key, scaleType, context);
        } else if (elementType === 'scale') {
            return this.calculateScaleGrade(element, context);
        }
        
        return 2; // Default neutral grade
    }

    /**
     * Calculate grading tier for a note
     */
    calculateNoteGrade(note, key, scaleType, context = {}) {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        const noteValue = this.noteValues[note];
        const keyValue = this.noteValues[key];
        
        if (noteValue === undefined || keyValue === undefined) return 0;
        
        const interval = (noteValue - keyValue + 12) % 12;
        const isInScale = scaleNotes.includes(note);
        
        if (this.gradingMode === 'functional') {
            // Functional grading based on harmonic function
            if (interval === 0) return 4; // Tonic - Perfect
            if (interval === 7) return 4; // Dominant - Perfect
            if (interval === 5) return 3; // Subdominant - Excellent
            if (isInScale) return 2; // In scale - Good
            if ([1, 6, 8, 10].includes(interval)) return 1; // Chromatic functional - Fair
            return 0; // Experimental
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on interval character
            const emotionalMap = {
                0: 2, 1: 0, 2: 3, 3: 1, 4: 3, 5: 2, 
                6: 0, 7: 4, 8: 1, 9: 3, 10: 1, 11: 4
            };
            return emotionalMap[interval] || 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on brightness/warmth
            const colorMap = {
                0: 2, 1: 1, 2: 4, 3: 0, 4: 4, 5: 2,
                6: 0, 7: 3, 8: 1, 9: 4, 10: 1, 11: 3
            };
            return colorMap[interval] || 2;
        }
        
        return 2;
    }

    /**
     * Calculate grading tier for a chord
     */
    calculateChordGrade(chordName, key, scaleType, context = {}) {
        // Parse chord name to get root and type
        const match = chordName.match(/^([A-G][#b]?)(.*)$/);
        if (!match) return 0;
        
        const [, root, chordType] = match;
        const chordNotes = this.getChordNotes(root, chordType);
        const scaleNotes = this.getScaleNotes(key, scaleType);
        
        // Calculate how many chord notes are in scale
        const inScaleCount = chordNotes.filter(note => scaleNotes.includes(note)).length;
        const scaleMatchPercent = (inScaleCount / chordNotes.length) * 100;
        
        if (this.gradingMode === 'functional') {
            // Check if it's a diatonic chord
            for (let degree = 1; degree <= 7; degree++) {
                const diatonicChord = this.getDiatonicChord(degree, key, scaleType);
                if (diatonicChord.fullName === chordName) return 4; // Perfect - diatonic
            }
            
            if (scaleMatchPercent === 100) return 3; // Excellent - all notes in scale
            if (scaleMatchPercent >= 75) return 2; // Good - most notes in scale
            if (scaleMatchPercent >= 50) return 1; // Fair - some notes in scale
            return 0; // Experimental
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on chord quality and extensions
            if (chordType.includes('maj7') || chordType.includes('add9')) return 4;
            if (chordType.includes('maj') && !chordType.includes('7')) return 3;
            if (chordType.includes('m') && !chordType.includes('7')) return 1;
            if (chordType.includes('dim') || chordType.includes('b5')) return 0;
            return 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on harmonic richness
            const complexity = this.getChordComplexity(chordType);
            if (complexity === 'extended') return 4;
            if (complexity === 'seventh') return 3;
            if (chordType.includes('sus') || chordType.includes('add')) return 2;
            if (chordType.includes('dim')) return 0;
            return 1;
        }
        
        return 2;
    }

    /**
     * Calculate grading tier for a scale
     */
    calculateScaleGrade(scaleName, context = {}) {
        const { key = 'C', referenceScale = 'major' } = context;
        
        if (this.gradingMode === 'functional') {
            // Functional grading based on harmonic utility
            const functionalScales = ['major', 'minor', 'dorian', 'mixolydian'];
            if (functionalScales.includes(scaleName)) return 4;
            if (scaleName.includes('harmonic') || scaleName.includes('melodic')) return 3;
            if (Object.keys(this.scales).includes(scaleName)) return 2;
            return 1;
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on scale character
            const brightScales = ['major', 'lydian', 'mixolydian'];
            const darkScales = ['minor', 'phrygian', 'locrian'];
            if (brightScales.includes(scaleName)) return 4;
            if (darkScales.includes(scaleName)) return 0;
            return 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on harmonic richness
            const colorfulScales = ['altered', 'whole_tone', 'octatonic_dim'];
            const simpleScales = ['major_pentatonic', 'minor_pentatonic'];
            if (colorfulScales.includes(scaleName)) return 4;
            if (simpleScales.includes(scaleName)) return 1;
            return 2;
        }
        
        return 2;
    }

    /**
     * Get explanation for why an element received its grading
     */
    getGradingExplanation(element, tier, context = {}) {
        const { elementType = 'note', key = 'C', scaleType = 'major' } = context;
        const mode = this.gradingMode;
        
        let explanation = `In ${mode} grading mode, `;
        
        if (elementType === 'note') {
            const scaleNotes = this.getScaleNotes(key, scaleType);
            const isInScale = scaleNotes.includes(element);
            
            if (mode === 'functional') {
                if (tier === 4) explanation += `${element} is a primary harmonic function note (tonic or dominant).`;
                else if (tier === 3) explanation += `${element} serves an important harmonic function in ${key} ${scaleType}.`;
                else if (tier === 2) explanation += `${element} is part of the ${key} ${scaleType} scale.`;
                else if (tier === 1) explanation += `${element} provides chromatic color outside the scale.`;
                else explanation += `${element} is experimental and creates strong dissonance.`;
            } else if (mode === 'emotional') {
                const noteValue = this.noteValues[element];
                const keyValue = this.noteValues[key];
                const interval = (noteValue - keyValue + 12) % 12;
                
                if (tier === 4) explanation += `${element} creates a bright, uplifting sound.`;
                else if (tier === 3) explanation += `${element} adds warmth and positivity.`;
                else if (tier === 2) explanation += `${element} provides neutral emotional balance.`;
                else if (tier === 1) explanation += `${element} creates melancholy or tension.`;
                else explanation += `${element} evokes deep sadness or darkness.`;
            } else if (mode === 'color') {
                if (tier === 4) explanation += `${element} adds brilliant harmonic color.`;
                else if (tier === 3) explanation += `${element} provides warm harmonic richness.`;
                else if (tier === 2) explanation += `${element} offers natural, grounded color.`;
                else if (tier === 1) explanation += `${element} adds subtle harmonic complexity.`;
                else explanation += `${element} creates deep, mysterious color.`;
            }
        } else if (elementType === 'chord') {
            // Similar explanations for chords...
            explanation += `this chord receives a ${this.getGradingTierInfo(tier).name} rating based on its harmonic function and scale relationship.`;
        }
        
        return explanation;
    }

    /**
     * Suggest alternatives with higher grading tiers
     */
    suggestAlternatives(element, targetTier, context = {}) {
        const { elementType = 'note', key = 'C', scaleType = 'major' } = context;
        const alternatives = [];
        
        if (elementType === 'note') {
            const scaleNotes = this.getScaleNotes(key, scaleType);
            
            // Find notes that would achieve the target tier
            for (const note of this.chromaticNotes) {
                const grade = this.calculateNoteGrade(note, key, scaleType, context);
                if (grade >= targetTier && note !== element) {
                    alternatives.push({
                        element: note,
                        tier: grade,
                        explanation: this.getGradingExplanation(note, grade, { ...context, elementType: 'note' })
                    });
                }
            }
        } else if (elementType === 'chord') {
            // Find chord alternatives
            const scaleNotes = this.getScaleNotes(key, scaleType);
            for (let degree = 1; degree <= 7; degree++) {
                const diatonicChord = this.getDiatonicChord(degree, key, scaleType);
                const grade = this.calculateChordGrade(diatonicChord.fullName, key, scaleType, context);
                if (grade >= targetTier && diatonicChord.fullName !== element) {
                    alternatives.push({
                        element: diatonicChord.fullName,
                        tier: grade,
                        explanation: this.getGradingExplanation(diatonicChord.fullName, grade, { ...context, elementType: 'chord' })
                    });
                }
            }
        }
        
        // Sort by tier (highest first) and limit results
        return alternatives
            .sort((a, b) => b.tier - a.tier)
            .slice(0, 5);
    }

    /**
     * Compare how the same element is graded across different perspectives
     */
    compareGradingPerspectives(element, context = {}) {
        const currentMode = this.gradingMode;
        const perspectives = {};
        
        ['functional', 'emotional', 'color'].forEach(mode => {
            this.gradingMode = mode;
            const tier = this.calculateElementGrade(element, context);
            perspectives[mode] = {
                tier: tier,
                info: this.getGradingTierInfo(tier),
                explanation: this.getGradingExplanation(element, tier, context)
            };
        });
        
        // Restore original mode
        this.gradingMode = currentMode;
        
        return perspectives;
    }

    /**
     * Get educational context for a grading tier
     */
    getEducationalContext(tier, mode) {
        const contexts = {
            functional: [
                'Experimental notes create strong dissonance and require careful resolution.',
                'Fair notes provide chromatic color and can enhance harmonic progressions.',
                'Good notes are scale members that support the key center.',
                'Excellent notes serve important harmonic functions like predominant or secondary dominant.',
                'Perfect notes are primary harmonic pillars (tonic, dominant, subdominant).'
            ],
            emotional: [
                'Somber notes evoke deep sadness and introspection.',
                'Melancholy notes create wistful, pensive moods.',
                'Neutral notes provide emotional balance and stability.',
                'Bright notes generate happiness and energy.',
                'Radiant notes create ecstatic, magical feelings.'
            ],
            color: [
                'Deep notes provide mysterious, contemplative colors.',
                'Rich notes add complex, sophisticated harmonies.',
                'Natural notes offer grounded, organic sounds.',
                'Warm notes create friendly, inviting atmospheres.',
                'Bright notes add brilliant, luminous qualities.'
            ]
        };
        
        return contexts[mode]?.[tier] || 'This grading provides insight into the musical character of the element.';
    }

    /**
     * Explain the theoretical reasoning behind a grading
     */
    explainGradingRationale(element, context = {}) {
        const tier = this.calculateElementGrade(element, context);
        const explanation = this.getGradingExplanation(element, tier, context);
        const educational = this.getEducationalContext(tier, this.gradingMode);
        
        return {
            tier: tier,
            explanation: explanation,
            educational: educational,
            theoreticalBasis: this.getTheoreticalBasis(tier, this.gradingMode, context)
        };
    }

    /**
     * Get accessibility information for grading display
     */
    getAccessibleGradingInfo(tier, options = {}) {
        const { mode = this.gradingMode } = options;
        
        // Get basic tier info without circular dependency
        const basicTierInfo = this.getBasicGradingTierInfo(tier, mode);
        
        // Visual patterns for accessibility (beyond color)
        const patterns = ['dotted', 'dashed', 'solid', 'double', 'thick'];
        const shapes = ['circle', 'square', 'triangle', 'diamond', 'star'];
        
        return {
            pattern: patterns[tier] || 'solid',
            shape: shapes[tier] || 'circle',
            audioCue: this.getAudioGradingCues(tier),
            screenReaderText: `${basicTierInfo.name} grade: ${basicTierInfo.desc}`,
            highContrastColor: this.getHighContrastColor(tier),
            textLabel: basicTierInfo.short
        };
    }

    /**
     * Get basic grading tier info without enhanced properties (to avoid circular dependencies)
     */
    getBasicGradingTierInfo(tier, mode) {
        if (mode === 'emotional') {
            const tiers = [
                { label: '🌑 Somber', color: '#60a5fa', short: '🌑', name: 'Somber', desc: 'Deep, sad, serious' },
                { label: '🌧️ Melancholy', color: '#93c5fd', short: '🌧️', name: 'Melancholy', desc: 'Pensive, longing' },
                { label: '😐 Neutral', color: '#d1d5db', short: '😐', name: 'Neutral', desc: 'Balanced, plain' },
                { label: '☀️ Bright', color: '#fbbf24', short: '☀️', name: 'Bright', desc: 'Happy, energetic' },
                { label: '✨ Radiant', color: '#f9a8d4', short: '✨', name: 'Radiant', desc: 'Ecstatic, magical' }
            ];
            return tiers[tier] || tiers[2];
        } else if (mode === 'color') {
             const tiers = [
                { label: 'Deep Blue', color: '#93c5fd', short: 'Blue', name: 'Deep', desc: 'Calm, depth' },
                { label: 'Purple', color: '#c4b5fd', short: 'Purp', name: 'Rich', desc: 'Royal, complex' },
                { label: 'Green', color: '#6ee7b7', short: 'Grn', name: 'Natural', desc: 'Organic, grounded' },
                { label: 'Orange', color: '#fdba74', short: 'Org', name: 'Warm', desc: 'Energetic, friendly' },
                { label: 'Yellow', color: '#fde68a', short: 'Yel', name: 'Bright', desc: 'Optimistic, light' }
            ];
            return tiers[tier] || tiers[2];
        } else {
            // Default: Functional
            const tiers = [
                { label: '○ Experimental', color: '#9ca3af', short: '○', name: 'Experimental', desc: '(chromatic)' },
                { label: '◐ Fair', color: '#c4b5fd', short: '◐', name: 'Fair', desc: '(chromatic functional)' },
                { label: '★ Good', color: '#fbbf24', short: '★', name: 'Good', desc: '(in-scale)' },
                { label: '★★ Excellent', color: '#38bdf8', short: '★★', name: 'Excellent', desc: '(in-scale functional)' },
                { label: '★★★ Perfect', color: '#10b981', short: '★★★', name: 'Perfect', desc: '(diatonic scale chord)' }
            ];
            return tiers[tier] || tiers[2];
        }
    }

    /**
     * Get audio cues for grading tiers
     */
    getAudioGradingCues(tier) {
        const cues = [
            'Low bass tone',      // Tier 0
            'Muted bell',         // Tier 1  
            'Neutral chime',      // Tier 2
            'Bright bell',        // Tier 3
            'Triumphant fanfare'  // Tier 4
        ];
        
        return cues[tier] || 'Neutral chime';
    }

    /**
     * Get high contrast colors for accessibility
     */
    getHighContrastColor(tier) {
        // High contrast colors with guaranteed 4.5:1+ contrast ratios
        // These are carefully selected to ensure adjacent tiers have sufficient contrast
        const colors = [
            '#000000', // Black - Tier 0 (L=0)
            '#FFFF00', // Yellow - Tier 1 (L=0.927, contrast with black = 19.56:1)
            '#0000FF', // Blue - Tier 2 (L=0.072, contrast with yellow = 13.85:1)
            '#FFFFFF', // White - Tier 3 (L=1, contrast with blue = 8.59:1)
            '#800000'  // Dark Red - Tier 4 (L=0.107, contrast with white = 9.74:1)
        ];
        
        return colors[tier] || '#0000FF';
    }

    /**
     * Get theoretical basis for grading
     */
    getTheoreticalBasis(tier, mode, context = {}) {
        if (mode === 'functional') {
            const bases = [
                'Chromatic theory: Creates tension requiring resolution',
                'Voice leading: Provides smooth chromatic motion',
                'Diatonic theory: Supports tonal center',
                'Functional harmony: Serves clear harmonic role',
                'Tonal hierarchy: Primary structural function'
            ];
            return bases[tier] || 'General harmonic theory';
        } else if (mode === 'emotional') {
            const bases = [
                'Psychoacoustics: Minor intervals create sadness',
                'Cultural associations: Melancholy musical traditions',
                'Neutral intervals: Balanced emotional response',
                'Major intervals: Natural harmonic brightness',
                'Consonance theory: Perfect intervals create joy'
            ];
            return bases[tier] || 'Music psychology theory';
        } else if (mode === 'color') {
            const bases = [
                'Spectral theory: Lower frequencies appear darker',
                'Harmonic complexity: Moderate overtone content',
                'Natural harmonics: Organic frequency relationships',
                'Brightness theory: Higher partials create warmth',
                'Acoustic brilliance: Rich harmonic spectrum'
            ];
            return bases[tier] || 'Acoustic color theory';
        }
        
        return 'Music theory principles';
    }

    /**
     * Get suggested actions based on grading
     */
    getSuggestedActions(tier, mode, context = {}) {
        const actions = [];
        
        if (tier <= 1) {
            actions.push('Consider resolving to a higher-tier element');
            actions.push('Use as passing tone or chromatic approach');
            actions.push('Explore alternatives with better grading');
        } else if (tier === 2) {
            actions.push('Good foundation - consider embellishment');
            actions.push('Stable choice for harmonic support');
        } else if (tier >= 3) {
            actions.push('Excellent choice - emphasize in composition');
            actions.push('Use as structural harmonic element');
            actions.push('Build progressions around this element');
        }
        
        return actions;
    }

    /**
     * Add a regional scale with ethnomusicological context
     * @param {Object} scaleData - Scale definition with intervals and metadata
     * @param {Object} ethnomusicologicalContext - Cultural and historical context
     * @returns {Object} Validated scale data ready for integration
     */
    addRegionalScale(scaleData, ethnomusicologicalContext) {
        if (!this.regionalScaleManager) {
            throw new Error('RegionalScaleManager not available');
        }
        
        const validatedScale = this.regionalScaleManager.addRegionalScale(scaleData, ethnomusicologicalContext);
        
        // Add to scales object
        this.scales[scaleData.scaleId] = scaleData.intervals;
        
        // Add to scale citations
        this.scaleCitations[scaleData.scaleId] = this.regionalScaleManager.formatRegionalScaleDocumentation(validatedScale);
        
        return validatedScale;
    }

    /**
     * Validate cultural attribution for a scale
     * @param {string} scaleId - Scale identifier
     * @param {Array} sources - Academic sources for validation
     * @returns {boolean} True if attribution is complete and valid
     */
    validateCulturalAttribution(scaleId, sources) {
        if (!this.regionalScaleManager) {
            throw new Error('RegionalScaleManager not available');
        }
        
        return this.regionalScaleManager.validateCulturalAttribution(scaleId, sources);
    }

    /**
     * Get cultural context for a regional scale
     * @param {string} scaleId - Scale identifier
     * @returns {Object} Cultural context information
     */
    getRegionalScaleCulturalContext(scaleId) {
        if (!this.regionalScaleManager) {
            throw new Error('RegionalScaleManager not available');
        }
        
        const scaleData = this.scaleCitations[scaleId];
        if (!scaleData) {
            throw new Error(`Scale not found: ${scaleId}`);
        }
        
        return this.regionalScaleManager.getCulturalContext(scaleId, scaleData);
    }

    /**
     * Document 12-TET approximation for traditional scales
     * @param {Object} originalTuning - Traditional tuning system description
     * @param {Object} approximation - 12-TET approximation details
     * @returns {Object} Complete tuning system documentation
     */
    documentTuningApproximation(originalTuning, approximation) {
        if (!this.regionalScaleManager) {
            throw new Error('RegionalScaleManager not available');
        }
        
        return this.regionalScaleManager.documentTuningApproximation(originalTuning, approximation);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicTheoryEngine;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.MusicTheoryEngine = MusicTheoryEngine;
}
