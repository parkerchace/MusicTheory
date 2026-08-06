/**
 * semantic-contour-engine.js
 * 
 * SYLLABIC CONTOUR ENGINE.
 * Breaks words into syllables and assigns musical "gestures" to each.
 */

class SemanticContourEngine {
    constructor() {
        this.vowelWeights = {
            'i': 0.9, 'e': 0.7, 'a': 0.5, 'o': 0.3, 'u': 0.2, 'y': 0.8
        };
        this.scaleIntelligence = typeof ScaleIntelligenceEngine !== 'undefined' ? new ScaleIntelligenceEngine() : null;
        // The main generator already carries a real per-word lexicon (NRC
        // emotion associations, category-based fallbacks, negation/intensifier
        // handling via compromise.js) through ContextEngine. Reused here rather
        // than reimplemented — see parseInput below for why this engine used
        // to ignore what the words MEANT entirely.
        this.contextEngine = typeof ContextEngine !== 'undefined' ? new ContextEngine() : null;
    }

    parseInput(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const profile = {
            overallEnergy: 0.5,
            globalTension: 0.5,
            contourArchetype: 'balanced',
            densityArchetype: 'steady',
            preferredIntervals: ['major'],
            wordTokens: []
        };

        profile.wordTokens = words.map(word => {
            const syllables = this.decomposeWord(word);
            return {
                originalWord: word,
                syllables: syllables
            };
        });

        // --- Derive basic continuous attributes from syllables ---
        const totalSyllables = profile.wordTokens.reduce((sum, w) => sum + (w.syllables ? w.syllables.length : 0), 0);
        const pitchSum = profile.wordTokens.reduce((sum, w) =>
            sum + (w.syllables || []).reduce((sSum, s) => sSum + (Number(s.pitchValue) || 0), 0), 0);
        const avgPitch = totalSyllables > 0 ? (pitchSum / totalSyllables) : 0.5;

        // Heuristics:
        // - energy: more syllables/words → more motion
        // - brightness: vowel-brightness proxy (avgPitch)
        // - tension/darkness: inverse of brightness
        // These read only how a word SOUNDS, so "joy" and "toy" — same vowel,
        // opposite meaning — used to score identically, and word MEANING never
        // reached scale selection at all: OfflineThesaurus (word -> archetype)
        // was defined but loaded by nothing, referenced by nothing.
        let energy01 = this._clamp(0.15 + (totalSyllables / 14) * 0.65 + (words.length / 10) * 0.2, 0.05, 0.98);
        let brightness01 = this._clamp(avgPitch, 0.05, 0.98);
        let darkness01 = this._clamp(1.0 - brightness01, 0.02, 0.98);
        let tension01 = this._clamp(0.25 + darkness01 * 0.65 + Math.max(0, Math.min(0.25, (words.length - 3) * 0.04)), 0.05, 0.98);
        const mystery01 = this._clamp((words.length / 10) * 0.6 + (totalSyllables / 18) * 0.4, 0, 1);

        // --- Blend in what the words actually MEAN ---
        //
        // ContextEngine's lexical pass already scores each word against a
        // ~700-word emotion lexicon (falling back to a heuristic for words
        // outside it) and returns valence/arousal per word. Meaning leads
        // where the lexicon has something to say; sound fills in the rest —
        // short inputs and words the lexicon has never seen still need to
        // produce SOMETHING. The blend weight rises with how much of the
        // input the lexicon actually recognised, so one recognised word in a
        // five-word phrase doesn't dominate, and a fully-recognised phrase is
        // driven almost entirely by what it means.
        let lexical = null;
        if (this.contextEngine) {
            try {
                const ctx = this.contextEngine.parseInput(text);
                lexical = ctx && ctx.metadata && ctx.metadata.lexical;
            } catch (e) { lexical = null; }
        }
        const perWord = (lexical && Array.isArray(lexical.perWordValues)) ? lexical.perWordValues : [];
        const recognised = perWord.filter(v => v.valence || v.arousal || v.dominance).length;
        const coverage = perWord.length ? recognised / perWord.length : 0;

        if (lexical && coverage > 0) {
            const w = 0.35 + coverage * 0.55; // 0.35 (one word out of many) .. 0.90 (fully recognised)
            const lexBrightness = this._clamp((lexical.avgValence + 1) / 2, 0, 1);
            const lexEnergy = this._clamp((lexical.avgArousal + 1) / 2, 0, 1);
            const lexTension = this._clamp(Math.abs(lexical.avgArousal) * 0.6 + Math.max(0, -lexical.avgValence) * 0.6, 0, 1);

            brightness01 = this._clamp(brightness01 * (1 - w) + lexBrightness * w, 0.05, 0.98);
            darkness01 = this._clamp(1.0 - brightness01, 0.02, 0.98);
            energy01 = this._clamp(energy01 * (1 - w) + lexEnergy * w, 0.05, 0.98);
            tension01 = this._clamp(tension01 * (1 - w) + lexTension * w, 0.05, 0.98);
        }

        profile.overallEnergy = energy01;
        profile.globalTension = tension01;
        profile.densityArchetype = energy01 > 0.75 ? 'busy' : (energy01 < 0.32 ? 'sparse' : 'steady');
        profile.lexicalCoverage = coverage;

        // 🧠 SMARTER SCALE + MOOD SUGGESTION
        if (this.scaleIntelligence && profile.wordTokens.length > 0) {
            const attrs = {
                energy: energy01,
                tension: tension01,
                brightness: brightness01,
                darkness: darkness01,
                mystery: mystery01,
                words
            };

            const intelligence = this.scaleIntelligence.selectScale(attrs);
            if (intelligence) {
                profile.recommendedScale = intelligence.name;
                profile.preferredIntervals = [intelligence.name];
                profile.contourArchetype = intelligence.emotion || profile.contourArchetype;
            }
        }

        return profile;
    }

    decomposeWord(word) {
        const w = word.toLowerCase().trim();
        if (!w) return [];

        // 1. Calculate Expected Syllable Count (Phonetic Heuristic)
        // Groups common diphthongs but keeps hiatuses separate
        // Diphthongs grouped: ai, au, ay, ee, ei, eu, ew, ey, ie, oi, oo, ou, ow, oy
        // Hiatuses kept separate: ao, ia, io, iu, ua, uo
        const vowelClusters = w.match(/[aeiouy]{1,2}/g) || [];
        let expectedCount = 0;
        
        for (const cluster of vowelClusters) {
            // Split hiatuses that the regex grouped
            if (cluster === 'ao' || cluster === 'ia' || cluster === 'io' || cluster === 'iu' || cluster === 'ua' || cluster === 'uo') {
                expectedCount += 2;
            } else {
                expectedCount += 1;
            }
        }

        // Handle silent 'e' at end of word
        if (w.length > 2 && w.endsWith('e')) {
            const beforeE = w[w.length - 2];
            // If it's not '-le' (like 'apple') and not the only vowel, it's likely silent
            if (beforeE !== 'l' && expectedCount > 1) {
                // Check if the syllable before 'e' is a vowel (e.g. 'see', 'blue' - already handled by cluster logic mostly)
                // But for 'obsessive', 'e' is preceded by 'v', so it's silent.
                if (!/[aeiouy]/.test(beforeE)) {
                    expectedCount--;
                }
            }
        }

        // 2. Split word into chunks matching the expected count
        // We use a regex that captures [consonants]*[vowels]+[consonants]* 
        // But we need to be careful with the hiatuses identified above.
        
        // Simple greedy split based on vowel positions
        const vowelIndices = [];
        const vowelRegex = /[aeiouy]/g;
        let match;
        while ((match = vowelRegex.exec(w)) !== null) {
            vowelIndices.push(match.index);
        }

        if (vowelIndices.length === 0) return [this._buildSyllable(w, 0, 1)];

        // If we have more vowels than expected syllables (due to diphthongs),
        // we merge some vowel indices.
        // If we have fewer (rare), we split.
        
        // For simplicity, we'll use a rule-based splitter that tries to reach expectedCount
        const chunks = [];
        let lastSplit = 0;
        
        // This regex tries to find syllable boundaries (V-CV or VC-CV)
        // Simplified: find vowels and split roughly halfway between them
        for (let i = 0; i < vowelIndices.length; i++) {
            // Check if this vowel and the next form a diphthong we should skip
            if (i < vowelIndices.length - 1) {
                // If it's a 2-char string with no consonants between, check if it's a diphthong
                if (vowelIndices[i+1] - vowelIndices[i] === 1) {
                    const pair = w[vowelIndices[i]] + w[vowelIndices[i+1]];
                    const isHiatus = ['ao', 'ia', 'io', 'iu', 'ua', 'uo'].includes(pair);
                    if (!isHiatus) {
                        // It's a diphthong, skip the next vowel index for splitting
                        continue;
                    }
                }
            }
            
            // Determine split point
            let splitPoint;
            if (i === vowelIndices.length - 1 || chunks.length === expectedCount - 1) {
                splitPoint = w.length;
            } else {
                // Split between this vowel and the next
                const nextVowel = vowelIndices[i + 1];
                const distance = nextVowel - vowelIndices[i];
                if (distance <= 1) {
                    splitPoint = nextVowel; // Split between hiatus vowels
                } else {
                    // Split after the first consonant following the vowel (VC-V or V-CV)
                    splitPoint = vowelIndices[i] + 2; 
                    if (splitPoint >= nextVowel) splitPoint = nextVowel;
                }
            }
            
            const chunk = w.substring(lastSplit, splitPoint);
            if (chunk) chunks.push(chunk);
            lastSplit = splitPoint;
            if (chunks.length === expectedCount) {
                // Add remainder to last chunk if any
                if (lastSplit < w.length) {
                    chunks[chunks.length - 1] += w.substring(lastSplit);
                }
                break;
            }
        }

        const finalChunks = chunks.length > 0 ? chunks : [w];
        return finalChunks.map((s, idx) => this._buildSyllable(s, idx, finalChunks.length));
    }

    _buildSyllable(s, index, total) {
        const vowel = s.match(/[aeiouy]/) ? s.match(/[aeiouy]/)[0] : 'a';
        const basePitch = this.vowelWeights[vowel] || 0.5;
        
        let role = 'hold'; 
        if (total > 1) {
            if (index === 0) role = 'rise';
            else if (index === total - 1) role = 'fall';
            else role = 'peak';
        }

        const isComplex = s.length > 3 || /[aeiou]{2}/.test(s);
        const gestures = ['hold', 'slide-up', 'slide-down', 'dip', 'turn'];
        const gesture = gestures[(s.length + index) % gestures.length];

        return {
            text: s,
            pitchValue: basePitch,
            role: role,
            gesture: gesture,
            isMelismatic: isComplex,
            emphasis: isComplex ? 1.5 : 1.0,
            scaleOverride: null
        };
    }
    _clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }
}
