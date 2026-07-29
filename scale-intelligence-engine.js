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
            'calm': ['major', 'major_pentatonic', 'lydian', 'dorian'],
            'playful': ['mixolydian', 'major', 'lydian'],
            'sad': ['aeolian', 'dorian', 'harmonic_minor', 'phrygian'],
            'dark': ['phrygian', 'locrian', 'harmonic_minor', 'phrygian_dominant', 'aeolian'],
            'mysterious': ['dorian', 'phrygian', 'lydian_augmented', 'diminished'],
            'angry': ['phrygian_dominant', 'locrian', 'double_harmonic', 'harmonic_minor'],
            'intense': ['phrygian_dominant', 'locrian', 'diminished'],
            'dreamy': ['lydian', 'lydian_augmented', 'harmonic_major'],
            'chaotic': ['diminished', 'octatonic', 'locrian']
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
     * Character profile of ANY scale, derived from its interval content.
     * This is what lets all ~1,400 scales compete, instead of the handful
     * named in emotionalMap.
     */
    profileScale(intervals) {
        if (!Array.isArray(intervals) || intervals.length < 4) return null;
        const has = (i) => intervals.includes(i);
        const n = intervals.length;

        // Third and seventh decide the basic colour.
        const majorThird = has(4), minorThird = has(3);
        const majorSeventh = has(11), minorSeventh = has(10);
        const flatSecond = has(1), flatSixth = has(8);
        const sharpFourth = has(6), perfectFifth = has(7);
        const majorSixth = has(9), majorSecond = has(2);

        let brightness = 0.5
            + (majorThird ? 0.20 : 0) + (majorSeventh ? 0.14 : 0)
            + (majorSixth ? 0.08 : 0) + (majorSecond ? 0.05 : 0)
            + (sharpFourth && majorThird ? 0.07 : 0)
            - (minorThird ? 0.18 : 0) - (flatSecond ? 0.16 : 0)
            - (flatSixth ? 0.10 : 0) - (minorSeventh && !majorThird ? 0.05 : 0);

        // Tension: semitone clusters, tritones, augmented seconds.
        let semitonePairs = 0, augSeconds = 0;
        const sorted = intervals.slice().sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
            const step = sorted[i] - sorted[i - 1];
            if (step === 1) semitonePairs++;
            if (step === 3) augSeconds++;
        }
        let tension = Math.min(1,
            (semitonePairs * 0.13) + (augSeconds * 0.16)
            + (sharpFourth ? 0.12 : 0) + (flatSecond ? 0.14 : 0)
            + (!perfectFifth ? 0.15 : 0));

        // Mystery/exoticism: unusual sizes and uneven step patterns.
        const stepSet = new Set();
        for (let i = 1; i < sorted.length; i++) stepSet.add(sorted[i] - sorted[i - 1]);
        const exotic = Math.min(1,
            (n !== 7 ? 0.28 : 0) + (stepSet.size >= 4 ? 0.3 : stepSet.size === 3 ? 0.14 : 0)
            + (augSeconds ? 0.2 : 0));

        // Density drives perceived energy: more notes = more motion available.
        const density = Math.min(1, Math.max(0, (n - 4) / 6));

        return {
            brightness: Math.max(0, Math.min(1, brightness)),
            darkness: Math.max(0, Math.min(1, 1 - brightness)),
            tension, exotic, density, noteCount: n
        };
    }

    /**
     * True when a 7-note scale can be spelled with one note per letter name.
     * Uses the theory engine's own spelling so it matches what gets drawn.
     */
    _letterDistinct(intervals) {
        const mt = this.musicTheory
            || (typeof window !== 'undefined' && window.modularApp && window.modularApp.musicTheory)
            || null;
        // Interval-only check: assign successive letters and require each
        // accidental to stay within a single sharp/flat of the natural degree.
        const majorRef = [0, 2, 4, 5, 7, 9, 11];
        const sorted = intervals.slice().sort((a, b) => a - b);
        if (sorted.length !== 7) return true;
        for (let i = 0; i < 7; i++) {
            const dev = sorted[i] - majorRef[i];
            if (dev < -2 || dev > 2) return false;   // double accidental or worse
        }
        return true;
    }

    /**
     * Ask the theory engine how the scale actually SPELLS at a reference root
     * and require one note per letter name. This is the check that keeps the
     * staff readable — the interval test above cannot see that a scale will be
     * written "A A#" rather than "A Bb".
     */
    _spellsCleanly(id, noteCount) {
        const mt = this.musicTheory
            || (typeof window !== 'undefined' && window.modularApp && window.modularApp.musicTheory)
            || null;
        if (!mt || typeof mt.getScaleNotes !== 'function') return true;
        try {
            const notes = mt.getScaleNotes('C', id);
            if (!Array.isArray(notes) || notes.length !== noteCount) return true;
            const letters = new Set(notes.map(n => String(n).charAt(0).toUpperCase()));
            // A heptatonic scale must use seven different letters; anything
            // that reuses one is what produces the stacked accidentals.
            return letters.size === noteCount;
        } catch (_) { return true; }
    }

    /** Every scale in the loaded catalog, profiled and cached. */
    _catalog() {
        if (this._catalogCache) return this._catalogCache;
        const src = (typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals)
            ? window.SCALES.intervals
            : this.scaleDatabase;
        const out = [];
        for (const [id, intervals] of Object.entries(src || {})) {
            if (!Array.isArray(intervals)) continue;

            // TERTIAN VIABILITY. Harmony here is built by stacking scale
            // degrees in thirds. On a gapped scale (pentatonic/hexatonic, or
            // anything with a 4-semitone hole) that stacking produces chords
            // like "Cmodal(#11, add6, b5)" — spellings loaded with accidentals
            // that read as noise rather than intention. Only scales that can
            // actually support tertian harmony are eligible.
            // Heptatonic only: standard notation is built around seven letter
            // names, and eight-note scales inevitably double a letter.
            const n = intervals.length;
            if (n !== 7) continue;

            const sorted = intervals.slice().sort((a, b) => a - b);
            let maxStep = 0, semitoneSteps = 0, ok = true;
            for (let i = 1; i < sorted.length; i++) {
                const step = sorted[i] - sorted[i - 1];
                if (step <= 0) { ok = false; break; }
                if (step > maxStep) maxStep = step;
                if (step === 1) semitoneSteps++;
            }
            const wrapStep = 12 - sorted[sorted.length - 1] + sorted[0];
            if (wrapStep > maxStep) maxStep = wrapStep;
            if (!ok) continue;

            // No hole wider than an augmented second.
            if (maxStep > 3) continue;

            // NOTATION LEGIBILITY. A heptatonic scale is readable only when it
            // uses each letter name once (A B C D E F G). Scales that repeat a
            // letter — "A A#", "D D#" — force clusters of sharps, flats and
            // naturals onto the staff that read as noise instead of intention.
            if (!this._letterDistinct(intervals)) continue;
            if (!this._spellsCleanly(id, n)) continue;

            const prof = this.profileScale(intervals);
            if (prof) out.push({ id, intervals, prof });
        }
        this._catalogCache = out;
        return out;
    }

    /**
     * Search the whole catalog for scales matching a character target.
     * Returns candidates ranked best-first.
     */
    searchScales(target = {}, limit = 24) {
        const want = {
            brightness: Number.isFinite(target.brightness) ? target.brightness : 0.5,
            tension: Number.isFinite(target.tension) ? target.tension : 0.4,
            exotic: Number.isFinite(target.exotic) ? target.exotic : 0.3,
            density: Number.isFinite(target.density) ? target.density : 0.5
        };
        const scored = this._catalog().map((entry) => {
            const p = entry.prof;
            const cost =
                Math.abs(p.brightness - want.brightness) * 2.4 +
                Math.abs(p.tension - want.tension) * 1.7 +
                Math.abs(p.exotic - want.exotic) * 1.1 +
                Math.abs(p.density - want.density) * 0.6;
            return { ...entry, score: cost };
        });
        scored.sort((a, b) => a.score - b.score);
        return scored.slice(0, limit);
    }

    /**
     * Select the best scale based on emotional attributes
     * @param {Object} attributes - {darkness, energy, mystery, brightness, tension, words}
     * @returns {Object} {name, score, primaryReason}
     */
    selectScale(attributes = {}) {
        const a = attributes || {};

        // Accept both attribute shapes: contour-style {darkness, brightness, energy, tension, mystery}
        // and lexical VAD {avgValence, avgArousal, avgDominance} (as passed from metadata.lexical).
        const hasVAD = Number.isFinite(a.avgValence) || Number.isFinite(a.avgArousal);
        const valence = Number.isFinite(a.avgValence) ? a.avgValence : 0;
        const arousal = Number.isFinite(a.avgArousal) ? a.avgArousal : 0;
        const brightness = Number.isFinite(a.brightness) ? a.brightness : (hasVAD ? (valence + 1) / 2 : 0.5);
        const darkness = Number.isFinite(a.darkness) ? a.darkness : 1 - brightness;
        const energy = Number.isFinite(a.energy) ? a.energy : (hasVAD ? (arousal + 1) / 2 : 0.5);
        const tension = Number.isFinite(a.tension) ? a.tension
            : (hasVAD ? Math.min(1, Math.abs(arousal) * 0.7 + Math.max(0, -valence) * 0.5) : 0.5);
        const mystery = Number.isFinite(a.mystery) ? a.mystery : 0;
        const words = Array.isArray(a.words) ? a.words : [];

        // A caller that already detected the emotional tone (e.g. ContextEngine's
        // keyword+lexicon analysis) can force it so scale and progression agree.
        if (a.forceTone && this.emotionalMap[a.forceTone]) {
            return this._pickFromTone(a.forceTone, { brightness, energy, tension, words, seed: a.seed });
        }

        // Determine target "Emotional Profile" — thresholds are deliberately reachable
        // so real-world inputs spread across tones instead of collapsing to one default.
        let targetTone = 'calm';
        if (darkness > 0.62 && energy > 0.6 && tension > 0.5) targetTone = 'angry';
        else if (darkness > 0.62) targetTone = 'dark';
        else if (energy > 0.72 && tension > 0.55) targetTone = 'intense';
        else if (mystery > 0.55 || (tension > 0.62 && Math.abs(brightness - 0.5) < 0.15)) targetTone = 'mysterious';
        else if (darkness > 0.52 && energy < 0.45) targetTone = 'sad';
        else if (brightness > 0.62 && energy > 0.55) targetTone = 'joyful';
        else if (brightness > 0.62) targetTone = 'hopeful';
        else if (brightness > 0.53 && energy > 0.55) targetTone = 'playful';
        else if (brightness > 0.53 && energy < 0.35) targetTone = 'peaceful';

        return this._pickFromTone(targetTone, { brightness, energy, tension, words, seed: a.seed });
    }

    _pickFromTone(targetTone, { brightness = 0.5, energy = 0.5, tension = 0.5, words = [], seed } = {}) {
        const sig = words.join('|') + '|' + Math.round(brightness * 8) + '|' + Math.round(energy * 8) + '|' + Math.round(tension * 8);
        let hash = 0;
        for (let i = 0; i < sig.length; i++) hash = ((hash << 5) - hash + sig.charCodeAt(i)) | 0;
        if (Number.isFinite(seed)) hash = (hash ^ Math.floor(seed)) | 0;

        // Search the WHOLE catalog by character rather than reading a name out
        // of a 15-entry table. That table is why every generation came back as
        // a church mode while ~1,400 scales sat unused.
        let scaleName = null;
        try {
            const exoticWant = targetTone === 'mysterious' || targetTone === 'chaotic' ? 0.7
                : targetTone === 'dreamy' || targetTone === 'intense' ? 0.55
                : targetTone === 'angry' ? 0.5
                : 0.32;
            const candidates = this.searchScales({
                brightness,
                tension,
                exotic: exoticWant,
                density: 0.35 + energy * 0.45
            }, 28);
            if (candidates.length) {
                // Spread across the ranked field so different inputs land on
                // genuinely different scales instead of all taking rank 1.
                scaleName = candidates[Math.abs(hash) % candidates.length].id;
            }
        } catch (_) { scaleName = null; }

        // Curated fallback only if the catalog is unavailable.
        if (!scaleName) {
            const fallbacks = this.emotionalMap[targetTone] || ['major'];
            scaleName = fallbacks[Math.abs(hash) % fallbacks.length];
        }

        return {
            name: scaleName,
            emotion: targetTone,
            score: 0.95,
            primaryReason: `Mapped ${targetTone} profile from attributes (energy:${energy.toFixed(2)}, tension:${tension.toFixed(2)}, brightness:${brightness.toFixed(2)})`
        };
    }
}

// Global exposure
if (typeof window !== 'undefined') {
    window.ScaleIntelligenceEngine = ScaleIntelligenceEngine;
}
