/**
 * @module ChordAttributeEngine
 * @description Generative chord attribute system - defines musical qualities for all chord types
 * 
 * SCALABLE APPROACH:
 * - Algorithmically generates attributes for ANY chord symbol
 * - Parses chord notation (Cmaj7, F#m11b5, Bb7alt, etc.)
 * - Assigns emotional, sonic, and functional attributes
 * - Provides similarity scoring between chords
 * - No manual cataloging needed - works with infinite chord vocabulary
 * 
 * @feature Chord notation parser (supports jazz, classical, pop notation)
 * @feature Attribute generation (tension, brightness, density, stability)
 * @feature Emotional quality mapping
 * @feature Functional harmony classification
 * @feature Chord-to-chord similarity scoring
 */

class ChordAttributeEngine {
    constructor() {
        // Base quality attributes
        this.baseQualities = {
            'major': { brightness: 0.8, tension: 0.2, stability: 0.9, warmth: 0.8 },
            'minor': { brightness: 0.3, tension: 0.4, stability: 0.8, warmth: 0.5 },
            'diminished': { brightness: 0.2, tension: 0.9, stability: 0.2, warmth: 0.2 },
            'augmented': { brightness: 0.9, tension: 0.8, stability: 0.3, warmth: 0.6 },
            'suspended': { brightness: 0.6, tension: 0.5, stability: 0.5, warmth: 0.7 },
            'dominant': { brightness: 0.6, tension: 0.6, stability: 0.5, warmth: 0.7 }
        };

        // Extension modifiers
        this.extensions = {
            '6': { tension: +0.1, brightness: +0.1, color: 'sweet' },
            '7': { tension: +0.2, brightness: 0, color: 'bluesy' },
            'maj7': { tension: +0.1, brightness: +0.2, color: 'dreamy' },
            '9': { tension: +0.15, brightness: +0.15, color: 'lush' },
            '11': { tension: +0.2, brightness: +0.1, color: 'modal' },
            '13': { tension: +0.25, brightness: +0.15, color: 'sophisticated' },
            'add9': { tension: +0.1, brightness: +0.2, color: 'airy' },
            'add11': { tension: +0.15, brightness: 0, color: 'suspended' }
        };

        // Alterations
        this.alterations = {
            'b5': { tension: +0.3, brightness: -0.2, color: 'tense', function: 'leading' },
            '#5': { tension: +0.3, brightness: +0.2, color: 'anxious', function: 'unstable' },
            'b9': { tension: +0.4, brightness: -0.3, color: 'dark', function: 'chromatic' },
            '#9': { tension: +0.35, brightness: +0.1, color: 'hendrix', function: 'blues' },
            'b13': { tension: +0.3, brightness: -0.2, color: 'altered', function: 'chromatic' },
            '#11': { tension: +0.2, brightness: +0.3, color: 'lydian', function: 'bright' },
            'alt': { tension: +0.6, brightness: -0.1, color: 'outside', function: 'chromatic' }
        };

        // Suspension types
        this.suspensions = {
            'sus2': { tension: +0.2, brightness: +0.2, color: 'open', replaces: '3rd' },
            'sus4': { tension: +0.3, brightness: 0, color: 'anticipation', replaces: '3rd' }
        };

        // Emotional associations
        this.emotions = {
            'joy': ['maj7', 'maj9', '6', 'maj13', 'add9'],
            'sadness': ['m7', 'm9', 'm11', 'dim7', 'm7b5'],
            'tension': ['7alt', '7b9', '7#9', 'dim7', 'aug'],
            'peace': ['maj7', 'sus4', 'add9', 'm11', '6'],
            'longing': ['sus4', 'm11', 'maj7', 'add11'],
            'anger': ['7#9', 'dim7', '7alt', 'mb5'],
            'mystery': ['m7b5', 'dim7', 'alt', 'phrygian'],
            'hope': ['maj7', 'sus2', 'add9', 'maj9'],
            'nostalgia': ['m7', 'maj7', '6', 'm9'],
            'anxiety': ['7b9', 'dim7', 'aug', '7#5']
        };

        // Functional categories
        this.functions = {
            'tonic': { stability: 1.0, resolution: 'home', progressionWeight: 0.3 },
            'subdominant': { stability: 0.7, resolution: 'prepares', progressionWeight: 0.5 },
            'dominant': { stability: 0.4, resolution: 'demands', progressionWeight: 0.8 },
            'chromatic': { stability: 0.3, resolution: 'color', progressionWeight: 0.6 },
            'passing': { stability: 0.5, resolution: 'movement', progressionWeight: 0.4 }
        };
    }

    /**
     * Main entry: Analyze any chord symbol and return comprehensive attributes
     */
    analyzeChord(chordSymbol) {
        const parsed = this.parseChordSymbol(chordSymbol);
        const attributes = this.generateAttributes(parsed);
        const emotions = this.getEmotionalQualities(parsed, attributes);
        const voicing = this.getVoicingCharacteristics(parsed);
        
        return {
            symbol: chordSymbol,
            parsed,
            attributes,
            emotions,
            voicing,
            
            // High-level descriptors
            descriptor: this._generateDescriptor(attributes, emotions),
            textureClass: this._classifyTexture(voicing),
            colorPalette: this._getColorPalette(attributes, parsed)
        };
    }

    /**
     * Parse chord symbol into components
     * Examples: "Cmaj7", "F#m11b5", "Bb7alt", "Gsus4"
     */
    parseChordSymbol(symbol) {
        const result = {
            root: '',
            quality: 'major',
            extensions: [],
            alterations: [],
            suspensions: [],
            bass: null
        };

        if (!symbol || symbol.length === 0) {
            return result;
        }

        // Extract root (handles sharps/flats)
        const rootMatch = symbol.match(/^[A-G][#b]?/);
        if (rootMatch) {
            result.root = rootMatch[0];
            symbol = symbol.substring(result.root.length);
        }

        // Extract slash bass (e.g., /E)
        const bassMatch = symbol.match(/\/([A-G][#b]?)/);
        if (bassMatch) {
            result.bass = bassMatch[1];
            symbol = symbol.replace(bassMatch[0], '');
        }

        // Detect quality
        if (symbol.match(/^(m|min|minor|-)/i)) {
            result.quality = 'minor';
            symbol = symbol.replace(/^(m|min|minor|-)/i, '');
        } else if (symbol.match(/^dim/i)) {
            result.quality = 'diminished';
            symbol = symbol.replace(/^dim/i, '');
        } else if (symbol.match(/^aug/i)) {
            result.quality = 'augmented';
            symbol = symbol.replace(/^aug/i, '');
        } else if (symbol.match(/^(maj|M|Δ)/)) {
            result.quality = 'major';
            symbol = symbol.replace(/^(maj|M|Δ)/, '');
        }

        // Detect suspensions
        if (symbol.match(/sus4/i)) {
            result.suspensions.push('sus4');
            symbol = symbol.replace(/sus4/i, '');
        } else if (symbol.match(/sus2/i)) {
            result.suspensions.push('sus2');
            symbol = symbol.replace(/sus2/i, '');
        }

        // Detect alterations (must come before extensions)
        const alterationPatterns = [
            { pattern: /alt/i, name: 'alt' },
            { pattern: /[b♭]13/, name: 'b13' },
            { pattern: /[#♯]11/, name: '#11' },
            { pattern: /[b♭]9/, name: 'b9' },
            { pattern: /[#♯]9/, name: '#9' },
            { pattern: /[b♭]5/, name: 'b5' },
            { pattern: /[#♯]5/, name: '#5' }
        ];

        for (const alt of alterationPatterns) {
            if (symbol.match(alt.pattern)) {
                result.alterations.push(alt.name);
                symbol = symbol.replace(alt.pattern, '');
            }
        }

        // Detect extensions
        const extensionPatterns = [
            { pattern: /13/, name: '13' },
            { pattern: /11/, name: '11' },
            { pattern: /9/, name: '9' },
            { pattern: /7/, name: '7' },
            { pattern: /6/, name: '6' },
            { pattern: /add9/i, name: 'add9' },
            { pattern: /add11/i, name: 'add11' }
        ];

        for (const ext of extensionPatterns) {
            if (symbol.match(ext.pattern)) {
                result.extensions.push(ext.name);
                // Don't remove - might be part of alteration
            }
        }

        // Special handling for maj7
        if (symbol.match(/(maj|M|Δ)7/)) {
            result.extensions.push('maj7');
        }

        return result;
    }

    /**
     * Generate attributes from parsed chord
     */
    generateAttributes(parsed) {
        // Start with base quality
        const base = { ...this.baseQualities[parsed.quality] } || this.baseQualities['major'];
        
        let tension = base.tension;
        let brightness = base.brightness;
        let stability = base.stability;
        let warmth = base.warmth;
        let density = 0.3; // Base density (triad)
        const colors = [];

        // Apply extensions
        for (const ext of parsed.extensions) {
            const extData = this.extensions[ext];
            if (extData) {
                tension += extData.tension;
                brightness += extData.brightness;
                colors.push(extData.color);
                
                // Extensions add density
                if (ext === '9' || ext === 'add9') density += 0.2;
                if (ext === '11' || ext === 'add11') density += 0.25;
                if (ext === '13') density += 0.3;
            }
        }

        // Apply alterations (stronger effect)
        for (const alt of parsed.alterations) {
            const altData = this.alterations[alt];
            if (altData) {
                tension += altData.tension;
                brightness += altData.brightness;
                stability -= 0.2; // Alterations reduce stability
                colors.push(altData.color);
            }
        }

        // Apply suspensions
        for (const sus of parsed.suspensions) {
            const susData = this.suspensions[sus];
            if (susData) {
                tension += susData.tension;
                brightness += susData.brightness;
                stability -= 0.1; // Suspensions are unstable
                colors.push(susData.color);
            }
        }

        // Slash chords reduce stability
        if (parsed.bass && parsed.bass !== parsed.root) {
            stability -= 0.2;
            tension += 0.1;
            colors.push('inversion');
        }

        // Clamp values to 0-1
        tension = Math.max(0, Math.min(1, tension));
        brightness = Math.max(0, Math.min(1, brightness));
        stability = Math.max(0, Math.min(1, stability));
        warmth = Math.max(0, Math.min(1, warmth));
        density = Math.max(0, Math.min(1, density));

        return {
            tension,
            brightness,
            stability,
            warmth,
            density,
            colors: [...new Set(colors)], // Remove duplicates
            
            // Derived metrics
            dissonance: tension > 0.6 ? 'high' : tension > 0.4 ? 'medium' : 'low',
            complexity: density > 0.7 ? 'complex' : density > 0.4 ? 'moderate' : 'simple',
            mood: brightness > 0.6 ? 'bright' : brightness < 0.4 ? 'dark' : 'neutral'
        };
    }

    /**
     * Get emotional qualities for chord
     */
    getEmotionalQualities(parsed, attributes) {
        const emotions = [];
        
        // Build chord type string for matching
        const chordType = this._buildChordTypeString(parsed);

        // Check each emotion category
        for (const [emotion, chordTypes] of Object.entries(this.emotions)) {
            for (const type of chordTypes) {
                if (chordType.includes(type)) {
                    emotions.push({ 
                        emotion, 
                        confidence: 0.8,
                        reason: `matches ${type} pattern`
                    });
                    break;
                }
            }
        }

        // Attribute-based emotional inference
        if (attributes.tension > 0.7) {
            emotions.push({ emotion: 'tension', confidence: 0.7, reason: 'high tension value' });
        }
        if (attributes.brightness > 0.7 && attributes.stability > 0.7) {
            emotions.push({ emotion: 'joy', confidence: 0.6, reason: 'bright and stable' });
        }
        if (attributes.brightness < 0.3 && attributes.tension > 0.5) {
            emotions.push({ emotion: 'sadness', confidence: 0.7, reason: 'dark and tense' });
        }

        return emotions;
    }

    /**
     * Get voicing characteristics
     */
    getVoicingCharacteristics(parsed) {
        let noteCount = 3; // Base triad
        
        // Count notes
        if (parsed.extensions.includes('7') || parsed.extensions.includes('maj7')) noteCount = 4;
        if (parsed.extensions.includes('9') || parsed.extensions.includes('add9')) noteCount += 1;
        if (parsed.extensions.includes('11') || parsed.extensions.includes('add11')) noteCount += 1;
        if (parsed.extensions.includes('13')) noteCount += 1;

        // Determine spread
        let spread = 'close';
        if (noteCount >= 6) spread = 'wide';
        else if (noteCount >= 5) spread = 'medium';

        // Determine register suggestion
        let register = 'mid';
        if (parsed.quality === 'diminished' || parsed.alterations.length > 2) {
            register = 'mid-high'; // Dissonance sounds better higher
        } else if (parsed.suspensions.length > 0) {
            register = 'low-mid'; // Suspensions sound good lower
        }

        return {
            noteCount,
            spread,
            register,
            voicingType: noteCount <= 3 ? 'triad' : noteCount === 4 ? '7th' : noteCount === 5 ? '9th' : '11th+'
        };
    }

    /**
     * Calculate similarity between two chords (0-1 scale)
     */
    calculateSimilarity(chord1Symbol, chord2Symbol) {
        const c1 = this.analyzeChord(chord1Symbol);
        const c2 = this.analyzeChord(chord2Symbol);

        const attr1 = c1.attributes;
        const attr2 = c2.attributes;

        // Calculate Euclidean distance in attribute space
        const tensionDiff = Math.abs(attr1.tension - attr2.tension);
        const brightnessDiff = Math.abs(attr1.brightness - attr2.brightness);
        const stabilityDiff = Math.abs(attr1.stability - attr2.stability);
        const densityDiff = Math.abs(attr1.density - attr2.density);

        const distance = Math.sqrt(
            tensionDiff ** 2 +
            brightnessDiff ** 2 +
            stabilityDiff ** 2 +
            densityDiff ** 2
        );

        // Convert distance to similarity (0-1, where 1 is identical)
        const maxDistance = Math.sqrt(4); // Max possible distance
        const similarity = 1 - (distance / maxDistance);

        return {
            similarity,
            sharedQualities: this._findSharedQualities(c1, c2),
            differences: this._findDifferences(c1, c2)
        };
    }

    /**
     * Find chords with similar attributes
     */
    findSimilarChords(targetSymbol, candidateSymbols) {
        const results = [];
        
        for (const candidate of candidateSymbols) {
            const similarity = this.calculateSimilarity(targetSymbol, candidate);
            results.push({
                chord: candidate,
                similarity: similarity.similarity,
                sharedQualities: similarity.sharedQualities
            });
        }

        return results.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Generate chord suggestions based on desired attributes
     */
    suggestChords(desiredAttributes) {
        const { tension, brightness, density, stability } = desiredAttributes;
        const suggestions = [];

        // Determine base quality
        let baseQuality = 'major';
        if (brightness < 0.4) baseQuality = 'minor';
        if (tension > 0.8) baseQuality = 'diminished';

        suggestions.push({ 
            symbol: baseQuality === 'minor' ? 'm' : '', 
            reason: 'base quality match',
            confidence: 0.9 
        });

        // Add extensions based on density
        if (density > 0.7) {
            suggestions.push({ symbol: baseQuality === 'minor' ? 'm11' : 'maj9', reason: 'high density', confidence: 0.8 });
            suggestions.push({ symbol: baseQuality === 'minor' ? 'm9' : '13', reason: 'complex voicing', confidence: 0.7 });
        } else if (density > 0.5) {
            suggestions.push({ symbol: baseQuality === 'minor' ? 'm7' : 'maj7', reason: 'medium density', confidence: 0.8 });
            suggestions.push({ symbol: baseQuality === 'minor' ? 'm9' : '9', reason: 'moderate extension', confidence: 0.6 });
        }

        // Add alterations based on tension
        if (tension > 0.7) {
            suggestions.push({ symbol: '7alt', reason: 'high tension', confidence: 0.9 });
            suggestions.push({ symbol: '7b9', reason: 'chromatic tension', confidence: 0.8 });
            suggestions.push({ symbol: 'dim7', reason: 'maximum tension', confidence: 0.7 });
        }

        // Suspensions for mid-range stability
        if (stability > 0.4 && stability < 0.7) {
            suggestions.push({ symbol: 'sus4', reason: 'moderate stability', confidence: 0.6 });
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Helper: Build chord type string for matching
     */
    _buildChordTypeString(parsed) {
        let str = parsed.quality;
        str += parsed.extensions.join('');
        str += parsed.alterations.join('');
        str += parsed.suspensions.join('');
        return str;
    }

    /**
     * Helper: Generate human-readable descriptor
     */
    _generateDescriptor(attributes, emotions) {
        const parts = [];
        
        // Mood
        parts.push(attributes.mood);
        
        // Complexity
        parts.push(attributes.complexity);
        
        // Primary emotion
        if (emotions.length > 0) {
            parts.push(emotions[0].emotion);
        }

        // Color
        if (attributes.colors.length > 0) {
            parts.push(attributes.colors[0]);
        }

        return parts.join(', ');
    }

    /**
     * Helper: Classify texture
     */
    _classifyTexture(voicing) {
        if (voicing.noteCount <= 3) return 'sparse';
        if (voicing.noteCount <= 5) return 'moderate';
        return 'dense';
    }

    /**
     * Helper: Get color palette
     */
    _getColorPalette(attributes, parsed) {
        const palette = [];
        
        if (attributes.brightness > 0.7) palette.push('yellow', 'white', 'gold');
        else if (attributes.brightness < 0.3) palette.push('indigo', 'navy', 'black');
        else palette.push('gray', 'silver', 'blue');

        if (attributes.tension > 0.7) palette.push('red', 'crimson');
        if (attributes.warmth > 0.7) palette.push('orange', 'amber');

        return [...new Set(palette)];
    }

    /**
     * Helper: Find shared qualities
     */
    _findSharedQualities(c1, c2) {
        const shared = [];
        
        if (c1.parsed.quality === c2.parsed.quality) shared.push('same quality');
        if (Math.abs(c1.attributes.brightness - c2.attributes.brightness) < 0.2) shared.push('similar brightness');
        if (Math.abs(c1.attributes.tension - c2.attributes.tension) < 0.2) shared.push('similar tension');
        
        return shared;
    }

    /**
     * Helper: Find differences
     */
    _findDifferences(c1, c2) {
        const diffs = [];
        
        if (c1.parsed.quality !== c2.parsed.quality) diffs.push('different quality');
        if (Math.abs(c1.attributes.density - c2.attributes.density) > 0.3) diffs.push('density mismatch');
        
        return diffs;
    }
}

// Export for browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordAttributeEngine;
}
