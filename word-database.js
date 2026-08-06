/**
 * word-database.js
 * WordDatabase — converts NRC lexicon bitmasks to VAD scores.
 * Fills the WordDatabase slot expected by context-engine.js.
 */

class WordDatabase {
    constructor() {
        this._data = (typeof window !== 'undefined' && window.NRC_DATA) ? window.NRC_DATA : {};
        this._senses = (typeof window !== 'undefined' && window.WORD_SENSES_DATA) ? window.WORD_SENSES_DATA : {};

        // Suffixes to strip when stemming (ordered longest-first)
        this._suffixes = ['ness','tion','ing','ment','ful','less','ous','ive','ed','ly','er','es','s'];

        // Scale suggestions per dominant emotion
        this._emotionScales = {
            joy:          'major',
            trust:        'major_pentatonic',
            anticipation: 'mixolydian',
            surprise:     'lydian',
            fear:         'harmonic_minor',
            sadness:      'aeolian',
            anger:        'phrygian_dominant',
            disgust:      'phrygian'
        };
    }

    /**
     * Returns { valence, arousal, dominance, category, scale } for a word.
     * Returns null if the word is unknown (context-engine falls back to its own heuristic).
     */
    getEmotionalValence(word) {
        if (!word) return null;
        const mask = this._lookup(String(word).toLowerCase().trim());
        if (mask === null) return null;
        const vad = this._maskToVAD(mask);
        const dominant = this._dominantEmotion(mask);
        return {
            valence:   vad.valence,
            arousal:   vad.arousal,
            dominance: vad.dominance,
            category:  dominant,
            scale:     this._emotionScales[dominant] || null
        };
    }

    /**
     * Returns the best-matching WordNet SENSE for a word — not a word-level
     * average. A word with several senses (light-as-brightness vs.
     * light-as-weight) carries genuinely different valence and a different
     * gloss per sense; picking one word-level number for "light" regardless
     * of which meaning is intended is exactly the "words treated randomly"
     * complaint this exists to fix.
     *
     * posHint ('a'|'n'|'v'|'r', from compromise.js's tagging) narrows to
     * senses of that part of speech when given. Among the remaining
     * candidates, WordNet's own sense-1-is-most-frequent ordering decides —
     * there's no attempt at full word-sense disambiguation beyond that.
     *
     * Returns { valence, gloss, pos, senseNumber, ambiguous } or null if the
     * word isn't in the sense lexicon at all.
     */
    getSense(word, posHint) {
        if (!word) return null;
        const token = String(word).toLowerCase().trim();
        const entries = this._senses[token];
        if (!Array.isArray(entries) || !entries.length) return null;

        const byPos = posHint ? entries.filter(e => e.p === posHint) : entries;
        const pool = byPos.length ? byPos : entries;
        // Already ordered by sense number (ascending) at build time; take the
        // first — WordNet's own most-frequent-sense-first convention.
        const chosen = pool[0];
        // "joy" (noun/verb/noun-again, valence 0.25/0.5/0.375) has three
        // entries but they all mean the same thing with mild variation —
        // not the ambiguity this exists to catch. "light" (brightness vs.
        // weight vs. illumination) genuinely is: different CONCEPTS, which
        // more often than not means different parts of speech — the same
        // signal compromise.js's tagging is already narrowing by — even
        // when, as with "light", their sentiment polarity happens to land
        // close together (mildly positive/neutral either way).
        const distinctPos = new Set(entries.map(e => e.p)).size;
        const valenceSpan = entries.length > 1
            ? Math.max(...entries.map(e => e.v)) - Math.min(...entries.map(e => e.v))
            : 0;
        const divergesInValence = valenceSpan >= 0.375;
        return {
            valence: chosen.v,
            gloss: chosen.g,
            pos: chosen.p,
            senseNumber: chosen.n,
            // Broad signal — worth telling the user which sense was picked.
            ambiguous: distinctPos > 1 || divergesInValence,
            // Narrow signal — worth trusting over NRC's hand-labelled number,
            // which SentiWordNet's automatic scoring otherwise shouldn't
            // override for a word whose meanings don't actually disagree.
            divergesInValence
        };
    }

    /**
     * Returns a category object { name, scales } for semantic category hints.
     */
    getSemanticCategory(word) {
        if (!word) return null;
        const mask = this._lookup(String(word).toLowerCase().trim());
        if (mask === null) return null;
        const dominant = this._dominantEmotion(mask);
        return {
            name:   dominant,
            scales: this._emotionScales[dominant] ? [this._emotionScales[dominant]] : []
        };
    }

    // ---- private ----

    _lookup(token) {
        if (this._data[token] !== undefined) return this._data[token];

        // Try stripping common suffixes to find a root form
        for (const suffix of this._suffixes) {
            if (token.length > suffix.length + 3 && token.endsWith(suffix)) {
                const stem = token.slice(0, token.length - suffix.length);
                if (this._data[stem] !== undefined) return this._data[stem];
            }
        }
        return null;
    }

    _maskToVAD(mask) {
        const anger        = !!(mask &   1);
        const anticipation = !!(mask &   2);
        const disgust      = !!(mask &   4);
        const fear         = !!(mask &   8);
        const joy          = !!(mask &  16);
        const sadness      = !!(mask &  32);
        const surprise     = !!(mask &  64);
        const trust        = !!(mask & 128);
        const neg          = !!(mask & 256);
        const pos          = !!(mask & 512);

        // Valence: positive emotions pull up, negative pull down
        let v = (joy          ?  0.75 : 0)
              + (trust        ?  0.50 : 0)
              + (anticipation ?  0.20 : 0)
              + (pos          ?  0.30 : 0)
              - (sadness      ?  0.65 : 0)
              - (anger        ?  0.55 : 0)
              - (disgust      ?  0.70 : 0)
              - (fear         ?  0.50 : 0)
              - (neg          ?  0.30 : 0);

        // Arousal: activation emotions push up, deactivation pull down
        let a = (anger        ?  0.65 : 0)
              + (fear         ?  0.55 : 0)
              + (surprise     ?  0.50 : 0)
              + (anticipation ?  0.35 : 0)
              + (joy          ?  0.20 : 0)
              + (disgust      ?  0.25 : 0)
              - (sadness      ?  0.40 : 0)
              - (trust        ?  0.20 : 0);

        // Dominance: feeling in control vs. powerless
        let d = (trust        ?  0.55 : 0)
              + (joy          ?  0.30 : 0)
              + (anger        ?  0.40 : 0)
              + (anticipation ?  0.20 : 0)
              - (fear         ?  0.65 : 0)
              - (sadness      ?  0.35 : 0)
              - (disgust      ?  0.20 : 0);

        const clamp = x => Math.max(-1, Math.min(1, x));
        return { valence: clamp(v), arousal: clamp(a), dominance: clamp(d) };
    }

    _dominantEmotion(mask) {
        const scores = {
            joy:          (mask &  16) ? 3 : 0,
            trust:        (mask & 128) ? 2 : 0,
            anticipation: (mask &   2) ? 2 : 0,
            surprise:     (mask &  64) ? 2 : 0,
            fear:         (mask &   8) ? 3 : 0,
            sadness:      (mask &  32) ? 3 : 0,
            anger:        (mask &   1) ? 3 : 0,
            disgust:      (mask &   4) ? 2 : 0
        };
        // Positive flag boosts joy/trust; negative flag boosts sadness/anger
        if (mask & 512) { scores.joy += 1; scores.trust += 1; }
        if (mask & 256) { scores.sadness += 1; scores.anger += 1; scores.fear += 1; }

        return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    }
}
