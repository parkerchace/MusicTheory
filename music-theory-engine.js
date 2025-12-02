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

class MusicTheoryEngine {
    constructor() {
        this.chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        this.noteValues = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

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
            leading_whole_tone: [0, 2, 4, 6, 8, 10, 11]
        };

        // Scale citations and derivations with references
        this.scaleCitations = {
            // Major & Modes
            major: {
                description: 'Ionian mode - 1st mode of major scale',
                references: [
                    { title: 'Ionian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Ionian_mode' },
                    { title: 'Major Scale - Wikipedia', url: 'https://en.wikipedia.org/wiki/Major_scale' }
                ]
            },
            dorian: {
                description: '2nd mode of major scale',
                references: [
                    { title: 'Dorian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Dorian_mode' },
                    { title: 'Modes - Wikipedia', url: 'https://en.wikipedia.org/wiki/Mode_(music)#Modern_modes' }
                ]
            },
            phrygian: {
                description: '3rd mode of major scale',
                references: [
                    { title: 'Phrygian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Phrygian_mode' },
                    { title: 'Church Modes - Wikipedia', url: 'https://en.wikipedia.org/wiki/Mode_(music)#Modern_modes' }
                ]
            },
            lydian: {
                description: '4th mode of major scale',
                references: [
                    { title: 'Lydian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Lydian_mode' },
                    { title: 'Lydian Chromatic Concept', url: 'https://en.wikipedia.org/wiki/Lydian_Chromatic_Concept_of_Tonal_Organization' }
                ]
            },
            mixolydian: {
                description: '5th mode of major scale',
                references: [
                    { title: 'Mixolydian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Mixolydian_mode' },
                    { title: 'Mode (music) - Wikipedia', url: 'https://en.wikipedia.org/wiki/Mode_(music)#Modern_modes' }
                ]
            },
            aeolian: {
                description: 'Natural minor - 6th mode of major scale',
                references: [
                    { title: 'Aeolian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Aeolian_mode' },
                    { title: 'Minor Scale - Wikipedia', url: 'https://en.wikipedia.org/wiki/Minor_scale' }
                ]
            },
            locrian: {
                description: '7th mode of major scale',
                references: [
                    { title: 'Locrian Mode - Wikipedia', url: 'https://en.wikipedia.org/wiki/Locrian_mode' },
                    { title: 'Half-Diminished Scale - Wikipedia', url: 'https://en.wikipedia.org/wiki/Half-diminished_scale' }
                ]
            },

            // Melodic Minor Modes
            melodic: {
                description: 'Jazz melodic minor (ascending)',
                references: [
                    { title: 'Melodic Minor Scale', url: 'https://en.wikipedia.org/wiki/Minor_scale#Melodic_minor_scale' },
                    { title: 'Jazz Minor Scale', url: 'https://en.wikipedia.org/wiki/Jazz_scale#Modes_of_the_melodic_minor_scale' }
                ]
            },
            dorian_b2: {
                description: 'Phrygian ♮6 - 2nd mode of melodic minor',
                references: [
                    { title: 'Modes of Melodic Minor', url: 'https://en.wikipedia.org/wiki/Jazz_scale#Modes_of_the_melodic_minor_scale' }
                ]
            },
            lydian_augmented: {
                description: '3rd mode of melodic minor',
                references: [
                    { title: 'Lydian Augmented', url: 'https://en.wikipedia.org/wiki/Lydian_augmented_scale' }
                ]
            },
            lydian_dominant: {
                description: 'Acoustic scale - 4th mode of melodic minor',
                references: [
                    { title: 'Lydian Dominant Scale', url: 'https://en.wikipedia.org/wiki/Lydian_dominant_scale' },
                    { title: 'Acoustic Scale', url: 'https://en.wikipedia.org/wiki/Acoustic_scale' }
                ]
            },
            mixolydian_b6: {
                description: '5th mode of melodic minor',
                references: [
                    { title: 'Melodic Minor Modes', url: 'https://en.wikipedia.org/wiki/Jazz_scale#Modes_of_the_melodic_minor_scale' }
                ]
            },
            locrian_nat2: {
                description: 'Half-diminished scale - 6th mode of melodic minor',
                references: [
                    { title: 'Half-Diminished Scale', url: 'https://en.wikipedia.org/wiki/Half-diminished_scale' }
                ]
            },
            altered: {
                description: 'Super Locrian - 7th mode of melodic minor',
                references: [
                    { title: 'Altered Scale', url: 'https://en.wikipedia.org/wiki/Altered_scale' },
                    { title: 'Super Locrian Scale', url: 'https://en.wikipedia.org/wiki/Altered_scale' }
                ]
            },

            // Harmonic Minor Modes
            harmonic: {
                description: 'Classical harmonic minor',
                references: [
                    { title: 'Harmonic Minor Scale', url: 'https://en.wikipedia.org/wiki/Minor_scale#Harmonic_minor_scale' },
                    { title: 'Classical Harmony', url: 'https://en.wikipedia.org/wiki/Harmony' }
                ]
            },
            locrian_nat6: {
                description: '2nd mode of harmonic minor',
                references: [
                    { title: 'Harmonic Minor Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_minor_scale#Modes' }
                ]
            },
            ionian_augmented: {
                description: '3rd mode of harmonic minor',
                references: [
                    { title: 'Harmonic Minor Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_minor_scale#Modes' }
                ]
            },
            dorian_sharp4: {
                description: 'Romanian scale - 4th mode of harmonic minor',
                references: [
                    { title: 'Romanian Minor Scale', url: 'https://en.wikipedia.org/wiki/Romanian_minor_scale' }
                ]
            },
            phrygian_dominant: {
                description: 'Freygish - 5th mode of harmonic minor',
                references: [
                    { title: 'Phrygian Dominant Scale', url: 'https://en.wikipedia.org/wiki/Phrygian_dominant_scale' },
                    { title: 'Spanish Music Theory', url: 'https://en.wikipedia.org/wiki/Flamenco_mode' }
                ]
            },
            lydian_sharp2: {
                description: '6th mode of harmonic minor',
                references: [
                    { title: 'Harmonic Minor Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_minor_scale#Modes' }
                ]
            },
            altered_diminished: {
                description: '7th mode of harmonic minor',
                references: [
                    { title: 'Harmonic Minor Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_minor_scale#Modes' }
                ]
            },

            // Harmonic Major Modes
            harmonic_major: {
                description: 'Major scale with ♭6',
                references: [
                    { title: 'Harmonic Major Scale', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale' }
                ]
            },
            dorian_b5: {
                description: '2nd mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },
            phrygian_b4: {
                description: '3rd mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },
            lydian_b3: {
                description: '4th mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },
            mixolydian_b2: {
                description: '5th mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },
            aeolian_b1: {
                description: '6th mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },
            locrian_bb7: {
                description: '7th mode of harmonic major',
                references: [
                    { title: 'Harmonic Major Modes', url: 'https://en.wikipedia.org/wiki/Harmonic_major_scale#Modes' }
                ]
            },

            // Double Harmonic Modes
            double_harmonic_major: {
                description: 'Byzantine scale - major with ♭2 and ♭6',
                references: [
                    { title: 'Double Harmonic Scale', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale' },
                    { title: 'Byzantine Music Theory', url: 'https://en.wikipedia.org/wiki/Byzantine_music' }
                ]
            },
            lydian_sharp2_sharp6: {
                description: '2nd mode of double harmonic major',
                references: [
                    { title: 'Double Harmonic Modes', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale#Modes' }
                ]
            },
            ultraphrygian: {
                description: '3rd mode of double harmonic major',
                references: [
                    { title: 'Double Harmonic Modes', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale#Modes' }
                ]
            },
            hungarian_minor: {
                description: 'Gypsy minor - 4th mode of double harmonic major',
                references: [
                    { title: 'Hungarian Minor Scale', url: 'https://en.wikipedia.org/wiki/Hungarian_minor_scale' },
                    { title: 'Gypsy Scale', url: 'https://en.wikipedia.org/wiki/Hungarian_Gypsy_scale' }
                ]
            },
            oriental: {
                description: '5th mode of double harmonic major',
                references: [
                    { title: 'Double Harmonic Modes', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale#Modes' }
                ]
            },
            ionian_augmented_sharp2: {
                description: '6th mode of double harmonic major',
                references: [
                    { title: 'Double Harmonic Modes', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale#Modes' }
                ]
            },
            locrian_bb3_bb7: {
                description: '7th mode of double harmonic major',
                references: [
                    { title: 'Double Harmonic Modes', url: 'https://en.wikipedia.org/wiki/Double_harmonic_scale#Modes' }
                ]
            },

            // Symmetric
            whole_tone: {
                description: 'Debussy scale - all whole steps',
                references: [
                    { title: 'Whole Tone Scale', url: 'https://en.wikipedia.org/wiki/Whole_tone_scale' },
                    { title: 'Impressionist Music', url: 'https://en.wikipedia.org/wiki/Musical_impressionism' }
                ]
            },
            octatonic_dim: {
                description: 'Diminished scale (W-H pattern)',
                references: [
                    { title: 'Octatonic Scale', url: 'https://en.wikipedia.org/wiki/Octatonic_scale' },
                    { title: 'Diminished Harmony', url: 'https://en.wikipedia.org/wiki/Diminished_chord' }
                ]
            },
            octatonic_dom: {
                description: 'Dominant diminished (H-W pattern)',
                references: [
                    { title: 'Octatonic Scale', url: 'https://en.wikipedia.org/wiki/Octatonic_scale' },
                    { title: 'Dominant Diminished Scale', url: 'https://en.wikipedia.org/wiki/Octatonic_scale' }
                ]
            },
            augmented: {
                description: 'Hexatonic scale alternating m3-H',
                references: [
                    { title: 'Augmented Scale', url: 'https://en.wikipedia.org/wiki/Augmented_scale' }
                ]
            },
            tritone: {
                description: 'Petrushka chord as scale',
                references: [
                    { title: 'Petrushka Chord', url: 'https://en.wikipedia.org/wiki/Petrushka_chord' },
                    { title: 'Stravinsky - Britannica', url: 'https://www.britannica.com/biography/Igor-Stravinsky' }
                ]
            },
            prometheus: {
                description: 'Scriabin\'s mystic chord as scale',
                references: [
                    { title: 'Prometheus Scale', url: 'https://en.wikipedia.org/wiki/Mystic_chord' },
                    { title: 'Scriabin Theory', url: 'https://www.britannica.com/biography/Aleksandr-Scriabin' }
                ]
            },

            // Pentatonic
            major_pentatonic: {
                description: 'Anhemitonic pentatonic - no semitones',
                references: [
                    { title: 'Pentatonic Scale', url: 'https://en.wikipedia.org/wiki/Pentatonic_scale' },
                    { title: 'Pentatonic Music', url: 'https://en.wikipedia.org/wiki/Pentatonic_scale#Popular_music' }
                ]
            },
            minor_pentatonic: {
                description: 'Blues scale foundation',
                references: [
                    { title: 'Minor Pentatonic Scale', url: 'https://en.wikipedia.org/wiki/Pentatonic_scale#Minor_pentatonic_scale' },
                    { title: 'Blues Scale', url: 'https://en.wikipedia.org/wiki/Blues_scale' }
                ]
            },
            egyptian_pentatonic: {
                description: 'Suspended pentatonic',
                references: [
                    { title: 'Egyptian Pentatonic', url: 'https://en.wikipedia.org/wiki/Pentatonic_scale#Other_pentatonic_scales' }
                ]
            },
            blues_minor_pentatonic: {
                description: 'Minor pentatonic with blue note',
                references: [
                    { title: 'Blues Scale', url: 'https://en.wikipedia.org/wiki/Blues_scale' },
                    { title: 'Blue note', url: 'https://en.wikipedia.org/wiki/Blue_note' }
                ]
            },
            blues_major_pentatonic: {
                description: 'Major pentatonic with blue notes',
                references: [
                    { title: 'Blues scale - Wikipedia', url: 'https://en.wikipedia.org/wiki/Blues_scale' }
                ]
            },
            hirajoshi: {
                description: 'Japanese scale - Hirajōshi',
                references: [
                    { title: 'Hirajoshi Scale', url: 'https://en.wikipedia.org/wiki/Hirajoshi_scale' },
                    { title: 'Japanese Music Theory', url: 'https://en.wikipedia.org/wiki/Japanese_music' }
                ]
            },
            iwato: {
                description: 'Japanese scale - Iwato',
                references: [
                    { title: 'Iwato Scale', url: 'https://en.wikipedia.org/wiki/Iwato_scale' },
                    { title: 'Japanese Music Theory', url: 'https://www.britannica.com/art/Japanese-music' }
                ]
            },
            insen: {
                description: 'Japanese scale - In Sen',
                references: [
                    { title: 'In Sen Scale', url: 'https://en.wikipedia.org/wiki/In_scale' },
                    { title: 'Japanese musical scales', url: 'https://en.wikipedia.org/wiki/Japanese_musical_scales' }
                ]
            },
            yo: {
                description: 'Japanese scale - Yō',
                references: [
                    { title: 'Yo Scale', url: 'https://en.wikipedia.org/wiki/Yo_scale' },
                    { title: 'Japanese music - Britannica', url: 'https://www.britannica.com/art/Japanese-music' }
                ]
            },

            // Hexatonic
            blues_hexatonic: {
                description: 'Minor pentatonic + ♭5 blue note',
                references: [
                    { title: 'Blues Scale', url: 'https://en.wikipedia.org/wiki/Blues_scale' },
                    { title: 'Blue Note', url: 'https://en.wikipedia.org/wiki/Blue_note' }
                ]
            },
            whole_tone_hexatonic: {
                description: 'Whole tone scale (6 notes)',
                references: [
                    { title: 'Whole Tone Scale', url: 'https://en.wikipedia.org/wiki/Whole_tone_scale' }
                ]
            },
            augmented_hexatonic: {
                description: 'Augmented scale',
                references: [
                    { title: 'Augmented Scale', url: 'https://en.wikipedia.org/wiki/Augmented_scale' }
                ]
            },
            prometheus_hexatonic: {
                description: 'Prometheus scale',
                references: [
                    { title: 'Prometheus Scale', url: 'https://en.wikipedia.org/wiki/Mystic_chord' }
                ]
            },

            // Middle Eastern
            hijaz: {
                description: 'Maqam Hijaz - characteristic augmented 2nd (12-TET approximation)',
                references: [
                    { title: 'Maqam Hijaz', url: 'https://maqamworld.com/en/maqam/hijaz.php' },
                    { title: 'Hijaz Family', url: 'https://maqamworld.com/en/maqam/f_hijaz.php' }
                ]
            },
            hijaz_kar: {
                description: 'Maqam Hijaz Kar (12-TET approximation)',
                references: [
                    { title: 'Maqam Hijaz Kar', url: 'https://maqamworld.com/en/maqam/hijazkar.php' },
                    { title: 'Hijaz Family', url: 'https://maqamworld.com/en/maqam/f_hijaz.php' }
                ]
            },
            maqam_bayati: {
                description: 'Maqam Bayati (12-TET approximation)',
                references: [
                    { title: 'Maqam Bayati', url: 'https://maqamworld.com/en/maqam/bayati.php' },
                    { title: 'Bayati Family', url: 'https://maqamworld.com/en/maqam/f_bayati.php' }
                ]
            },
            maqam_rast: {
                description: 'Maqam Rast (12-TET approximation)',
                references: [
                    { title: 'Maqam Rast', url: 'https://maqamworld.com/en/maqam/rast.php' },
                    { title: 'Rast Family', url: 'https://maqamworld.com/en/maqam/f_rast.php' }
                ]
            },
            maqam_ajam: {
                description: 'Maqam Ajam (12-TET approximation; close to major/Ionian)',
                references: [
                    { title: 'Maqam Ajam', url: 'https://maqamworld.com/en/maqam/ajam.php' },
                    { title: 'Ajam Family', url: 'https://maqamworld.com/en/maqam/f_ajam.php' }
                ]
            },
            maqam_nahawand: {
                description: 'Maqam Nahawand (12-TET approximation; close to natural minor)',
                references: [
                    { title: 'Maqam Nahawand', url: 'https://maqamworld.com/en/maqam/nahawand.php' },
                    { title: 'Nahawand Family', url: 'https://maqamworld.com/en/maqam/f_nahawand.php' }
                ]
            },
            maqam_kurd: {
                description: 'Maqam Kurd (12-TET approximation; close to Phrygian)',
                references: [
                    { title: 'Maqam Kurd', url: 'https://maqamworld.com/en/maqam/kurd.php' },
                    { title: 'Kurd Family', url: 'https://maqamworld.com/en/maqam/f_kurd.php' }
                ]
            },
            persian: {
                description: 'Persian scale - similar to Locrian ♮3',
                references: [
                    { title: 'Persian Scale', url: 'https://en.wikipedia.org/wiki/Persian_scale' },
                    { title: 'Persian traditional music - Wikipedia', url: 'https://en.wikipedia.org/wiki/Persian_traditional_music' }
                ]
            },

            // Indian Ragas
            raga_bhairav: {
                description: 'Raga Bhairav (Bhairavi Thaat)',
                references: [
                    { title: 'Raga Bhairav', url: 'https://en.wikipedia.org/wiki/Bhairav_(raga)' },
                    { title: 'Indian Classical Music', url: 'https://www.britannica.com/art/raga' }
                ]
            },
            raga_todi: {
                description: 'Raga Todi - morning raga',
                references: [
                    { title: 'Raga Todi', url: 'https://en.wikipedia.org/wiki/Todi_(raga)' },
                    { title: 'Hindustani Ragas', url: 'https://www.britannica.com/art/Hindustani-music' }
                ]
            },
            raga_marwa: {
                description: 'Raga Marwa - evening raga',
                references: [
                    { title: 'Raga Marwa', url: 'https://en.wikipedia.org/wiki/Marwa_(raga)' },
                    { title: 'Raga Time Theory', url: 'https://www.britannica.com/art/raga' }
                ]
            },
            raga_purvi: {
                description: 'Raga Purvi - evening raga',
                references: [
                    { title: 'Purvi (thaat) - Wikipedia', url: 'https://en.wikipedia.org/wiki/Purvi_(thaat)' },
                    { title: 'Indian Music Theory', url: 'https://www.britannica.com/art/Indian-music' }
                ]
            },
            raga_kafi: {
                description: 'Raga Kafi (Kafi Thaat)',
                references: [
                    { title: 'Raga Kafi', url: 'https://en.wikipedia.org/wiki/Kafi_(raga)' },
                    { title: 'Thaat System', url: 'https://en.wikipedia.org/wiki/Thaat' }
                ]
            },
            raga_bhairavi: {
                description: 'Raga Bhairavi - morning raga',
                references: [
                    { title: 'Raga Bhairavi', url: 'https://en.wikipedia.org/wiki/Bhairavi_(raga)' },
                    { title: 'Hindustani Classical', url: 'https://www.britannica.com/art/Hindustani-music' }
                ]
            },

            // Spanish/Flamenco
            spanish_phrygian: {
                description: 'Spanish Phrygian - Phrygian dominant',
                references: [
                    { title: 'Spanish Phrygian Scale', url: 'https://en.wikipedia.org/wiki/Phrygian_dominant_scale' },
                    { title: 'Flamenco Music Theory', url: 'https://www.britannica.com/art/flamenco' }
                ]
            },
            spanish_gypsy: {
                description: 'Spanish Gypsy - Phrygian with major 3rd',
                references: [
                    { title: 'Spanish Gypsy Scale', url: 'https://en.wikipedia.org/wiki/Phrygian_dominant_scale' },
                    { title: 'Romani music - Wikipedia', url: 'https://en.wikipedia.org/wiki/Romani_music' }
                ]
            },
            flamenco: {
                description: 'Flamenco mode',
                references: [
                    { title: 'Flamenco Mode', url: 'https://en.wikipedia.org/wiki/Flamenco_mode' },
                    { title: 'Flamenco Theory', url: 'https://www.britannica.com/art/flamenco' }
                ]
            },

            // Jazz
            bebop_major: {
                description: 'Major scale + chromatic passing tone',
                references: [
                    { title: 'Bebop Scale', url: 'https://en.wikipedia.org/wiki/Bebop_scale' },
                    { title: 'Bebop Music', url: 'https://en.wikipedia.org/wiki/Bebop' }
                ]
            },
            bebop_dominant: {
                description: 'Mixolydian + major 7th passing tone',
                references: [
                    { title: 'Bebop Dominant Scale', url: 'https://en.wikipedia.org/wiki/Bebop_scale#Bebop_dominant_scale' },
                    { title: 'Chromatic Passing Tones', url: 'https://en.wikipedia.org/wiki/Chromaticism' }
                ]
            },
            bebop_minor: {
                description: 'Dorian + major 3rd passing tone',
                references: [
                    { title: 'Bebop Minor Scale', url: 'https://en.wikipedia.org/wiki/Bebop_scale' },
                    { title: 'Jazz Harmony', url: 'https://en.wikipedia.org/wiki/Jazz_harmony' }
                ]
            },
            bebop_dorian: {
                description: 'Dorian + major 3rd passing tone',
                references: [
                    { title: 'Bebop Dorian Scale', url: 'https://en.wikipedia.org/wiki/Bebop_scale' },
                    { title: 'Modal Jazz', url: 'https://en.wikipedia.org/wiki/Modal_jazz' }
                ]
            },

            // Barry Harris
            barry_major6dim: {
                description: 'Barry Harris: Major 6th + diminished passing tones',
                references: [
                    { title: 'Evolutionary Voicings – Part 2 (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/evolutionary-voicings-part-2/' },
                    { title: 'Evolutionary Voicings – Part 1 (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/evolutionary-voicings-part-1/' }
                ]
            },
            barry_dom7dim: {
                description: 'Barry Harris: Dominant 7th + diminished passing tones',
                references: [
                    { title: 'Diminished Dimensions (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/diminished-dimensions/' },
                    { title: 'Evolutionary Voicings – Part 2 (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/evolutionary-voicings-part-2/' }
                ]
            },
            barry_minor6dim: {
                description: 'Barry Harris: Minor 6th + diminished passing tones',
                references: [
                    { title: 'Evolutionary Voicings – Part 2 (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/evolutionary-voicings-part-2/' },
                    { title: 'Evolutionary Voicings – Part 1 (Howard Rees Jazz Workshops)', url: 'https://jazzworkshops.com/evolutionary-voicings-part-1/' }
                ]
            },

            // Exotic/Modern
            enigmatic: {
                description: 'Verdi\'s Enigmatic scale',
                references: [
                    { title: 'Enigmatic Scale', url: 'https://en.wikipedia.org/wiki/Enigmatic_scale' },
                    { title: 'Giuseppe Verdi - Britannica', url: 'https://www.britannica.com/biography/Giuseppe-Verdi' }
                ]
            },
            neapolitan_major: {
                description: 'Neapolitan major - major with ♭2',
                references: [
                    { title: 'Neapolitan Scale', url: 'https://en.wikipedia.org/wiki/Neapolitan_scale' },
                    { title: 'Neapolitan chord', url: 'https://en.wikipedia.org/wiki/Neapolitan_chord' }
                ]
            },
            neapolitan_minor: {
                description: 'Neapolitan minor - minor with ♭2',
                references: [
                    { title: 'Neapolitan Minor Scale', url: 'https://en.wikipedia.org/wiki/Neapolitan_scale#Neapolitan_minor_scale' },
                    { title: 'Neapolitan chord', url: 'https://en.wikipedia.org/wiki/Neapolitan_chord' }
                ]
            },
            romanian_minor: {
                description: 'Romanian minor - Dorian ♯4',
                references: [
                    { title: 'Romanian Minor Scale', url: 'https://en.wikipedia.org/wiki/Romanian_minor_scale' },
                    { title: 'Music of Romania - Wikipedia', url: 'https://en.wikipedia.org/wiki/Music_of_Romania' }
                ]
            },
            ukrainian_dorian: {
                description: 'Ukrainian Dorian - Dorian ♯4',
                references: [
                    { title: 'Ukrainian Dorian Scale', url: 'https://en.wikipedia.org/wiki/Ukrainian_Dorian_scale' },
                    { title: 'Music of Ukraine - Wikipedia', url: 'https://en.wikipedia.org/wiki/Music_of_Ukraine' }
                ]
            },
            leading_whole_tone: {
                description: 'Whole tone + leading tone',
                references: [
                    { title: 'Whole Tone Scale - Wikipedia', url: 'https://en.wikipedia.org/wiki/Whole_tone_scale' },
                    { title: 'Leading-tone - Wikipedia', url: 'https://en.wikipedia.org/wiki/Leading-tone' }
                ]
            }
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
        if (hasMaj7) base += (base === 'maj' ? '7' : 'maj7');
        else if (hasMin7) base += '7';

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
        if (!hasMaj3 && !hasMin3) mods.push('no3');
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
        const effSize = Math.max(1, Math.min(size, n));
        const start = ((degree - 1) % n + n) % n;
        const notes = [];
        const degrees = [];

        for (let k = 0; k < effSize; k++) {
            const idx = (start + k * 2) % n; // stacked diatonic 3rds within the scale
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
        // Build diatonic stacked-third chord from the selected scale
        let stacked = this.buildScaleChord(key, scaleId, degree, 4);

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
            ]
        };
    }

    /**
     * Get citation/derivation for a scale
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
        
        if (format === 'html') {
            let html = `<div class="scale-citation-content">`;
            html += `<div class="citation-description">${citation.description}</div>`;
            
            if (citation.references && citation.references.length > 0) {
                html += `<div class="citation-references">`;
                html += `<strong>References:</strong> `;
                html += citation.references.map(ref => 
                    `<a href="${ref.url}" target="_blank" rel="noopener noreferrer">${ref.title}</a>`
                ).join(' • ');
                html += `</div>`;
            }
            html += `</div>`;
            return html;
        }
        
        // Text format
        let text = citation.description;
        if (citation.references && citation.references.length > 0) {
            text += '\nReferences: ' + citation.references.map(ref => ref.title).join(', ');
        }
        return text;
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
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicTheoryEngine;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.MusicTheoryEngine = MusicTheoryEngine;
}
