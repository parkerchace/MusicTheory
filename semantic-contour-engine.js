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

        // 🧠 SMARTER SCALE SUGGESTION
        if (this.scaleIntelligence && profile.wordTokens.length > 0) {
            // Aggregate attributes from syllables
            const totalSyllables = profile.wordTokens.reduce((sum, w) => sum + w.syllables.length, 0);
            const avgPitch = profile.wordTokens.reduce((sum, w) => 
                sum + w.syllables.reduce((sSum, s) => sSum + s.pitchValue, 0), 0) / totalSyllables;
            
            const attrs = {
                energy: Math.min(1.0, totalSyllables / 12),
                tension: this._clamp(1.0 - avgPitch, 0, 1),
                complexity: this._clamp(profile.wordTokens.length / 8, 0, 1)
            };
            
            const intelligence = this.scaleIntelligence.selectScale(attrs);
            if (intelligence) {
                profile.recommendedScale = intelligence.name;
                profile.preferredIntervals = [intelligence.name];
                profile.contourArchetype = intelligence.emotion;
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
