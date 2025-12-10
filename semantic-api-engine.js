/**
 * @module SemanticAPIEngine
 * @description Real-time semantic analysis using external APIs
 * 
 * NO HARDCODED WORD LISTS - Pulls definitions dynamically:
 * - Free Dictionary API (definitions, synonyms, etymology)
 * - ConceptNet API (semantic relationships, emotional associations)
 * - Datamuse API (word associations, related concepts)
 * 
 * Caches results locally to minimize API calls
 */

class SemanticAPIEngine {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        
        // API endpoints (all free, no auth required)
        this.apis = {
            dictionary: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
            conceptnet: 'https://api.conceptnet.io/c/en/',
            datamuse: 'https://api.datamuse.com/words'
        };
        
        this.debug = true;
    }

    _log(...args) {
        if (this.debug) console.log('[SemanticAPI]', ...args);
    }

    /**
     * Analyze word using real-time API calls
     */
    async analyzeWord(word) {
        word = word.toLowerCase().trim();
        
        // Check cache first
        if (this.cache.has(word)) {
            this._log(`Cache hit: ${word}`);
            return this.cache.get(word);
        }

        // Check if request is already pending
        if (this.pendingRequests.has(word)) {
            this._log(`Waiting for pending request: ${word}`);
            return await this.pendingRequests.get(word);
        }

        // Create new request
        const promise = this._fetchWordData(word);
        this.pendingRequests.set(word, promise);
        
        try {
            const result = await promise;
            this.cache.set(word, result);
            return result;
        } finally {
            this.pendingRequests.delete(word);
        }
    }

    /**
     * Fetch word data from multiple APIs in parallel
     */
    async _fetchWordData(word) {
        this._log(`Fetching data for: ${word}`);

        const [dictionary, conceptnet, datamuse] = await Promise.allSettled([
            this._fetchDictionary(word),
            this._fetchConceptNet(word),
            this._fetchDatamuse(word)
        ]);

        // Combine results
        const combined = {
            word,
            definitions: dictionary.status === 'fulfilled' ? dictionary.value.definitions : [],
            partOfSpeech: dictionary.status === 'fulfilled' ? dictionary.value.partOfSpeech : 'unknown',
            etymology: dictionary.status === 'fulfilled' ? dictionary.value.etymology : null,
            semanticRelations: conceptnet.status === 'fulfilled' ? conceptnet.value : [],
            associations: datamuse.status === 'fulfilled' ? datamuse.value : [],
            
            // Derived attributes
            attributes: this._deriveAttributes(
                dictionary.status === 'fulfilled' ? dictionary.value : null,
                conceptnet.status === 'fulfilled' ? conceptnet.value : [],
                datamuse.status === 'fulfilled' ? datamuse.value : []
            )
        };

        return combined;
    }

    /**
     * Fetch from Free Dictionary API
     */
    async _fetchDictionary(word) {
        try {
            const response = await fetch(`${this.apis.dictionary}${word}`);
            if (!response.ok) {
                this._log(`Dictionary API failed for ${word}: ${response.status}`);
                return null;
            }

            const data = await response.json();
            if (!data || data.length === 0) return null;

            const entry = data[0];
            const meanings = entry.meanings || [];
            
            return {
                definitions: meanings.flatMap(m => 
                    (m.definitions || []).map(d => d.definition)
                ).slice(0, 3), // Top 3 definitions
                partOfSpeech: meanings[0]?.partOfSpeech || 'unknown',
                etymology: entry.origin || null,
                phonetic: entry.phonetic || null
            };
        } catch (error) {
            this._log(`Dictionary fetch error for ${word}:`, error.message);
            return null;
        }
    }

    /**
     * Fetch from ConceptNet API (semantic relationships)
     */
    async _fetchConceptNet(word) {
        try {
            const response = await fetch(`${this.apis.conceptnet}${word}?limit=20`);
            if (!response.ok) {
                this._log(`ConceptNet API failed for ${word}: ${response.status}`);
                return [];
            }

            const data = await response.json();
            if (!data || !data.edges) return [];

            // Extract semantic relationships
            const relations = data.edges.map(edge => ({
                relation: edge.rel?.label || 'unknown',
                target: edge.end?.label || edge.start?.label || 'unknown',
                weight: edge.weight || 1.0
            }));

            return relations;
        } catch (error) {
            this._log(`ConceptNet fetch error for ${word}:`, error.message);
            return [];
        }
    }

    /**
     * Fetch from Datamuse API (word associations)
     */
    async _fetchDatamuse(word) {
        try {
            // Get words that trigger this word (related concepts)
            const response = await fetch(`${this.apis.datamuse}?rel_trg=${word}&max=20`);
            if (!response.ok) {
                this._log(`Datamuse API failed for ${word}: ${response.status}`);
                return [];
            }

            const data = await response.json();
            if (!data || data.length === 0) return [];

            return data.map(item => ({
                word: item.word,
                score: item.score || 0,
                tags: item.tags || []
            }));
        } catch (error) {
            this._log(`Datamuse fetch error for ${word}:`, error.message);
            return [];
        }
    }

    /**
     * Derive musical attributes from semantic data
     */
    _deriveAttributes(dictionary, semanticRelations, associations) {
        const attributes = {
            valence: 0,      // -1 (negative) to +1 (positive)
            arousal: 0,      // -1 (calm) to +1 (excited)
            dominance: 0,    // -1 (submissive) to +1 (dominant)
            intensity: 0.5,
            abstractness: 0.5,
            movement: 0.5,
            context: []
        };

        // Analyze definitions for emotional content
        if (dictionary && dictionary.definitions) {
            for (const def of dictionary.definitions) {
                const lower = def.toLowerCase();
                
                // Valence indicators
                if (/joy|happy|pleasure|delight|love|wonderful|beautiful/i.test(lower)) {
                    attributes.valence += 0.3;
                    attributes.context.push('positive');
                }
                if (/sad|pain|suffer|grief|terrible|awful|fear|anger|hate/i.test(lower)) {
                    attributes.valence -= 0.3;
                    attributes.context.push('negative');
                }
                
                // Arousal indicators
                if (/excit|energe|fast|quick|sudden|intense|violent|rage|fury/i.test(lower)) {
                    attributes.arousal += 0.3;
                    attributes.intensity += 0.2;
                }
                if (/calm|peace|quiet|still|slow|gentle|soft|tranquil/i.test(lower)) {
                    attributes.arousal -= 0.3;
                }
                
                // Dominance indicators
                if (/power|strong|force|control|command|dominat|lead/i.test(lower)) {
                    attributes.dominance += 0.3;
                }
                if (/weak|submit|surrender|yield|obey|passive/i.test(lower)) {
                    attributes.dominance -= 0.3;
                }

                // Movement indicators
                if (/move|motion|flow|change|shift|progress|advance/i.test(lower)) {
                    attributes.movement += 0.2;
                }
                if (/static|fixed|stable|permanent|unchanging|constant/i.test(lower)) {
                    attributes.movement -= 0.2;
                }

                // Abstractness
                if (/concept|idea|notion|theory|abstract|mental|intellectual/i.test(lower)) {
                    attributes.abstractness += 0.3;
                }
                if (/physical|concrete|tangible|material|object|thing/i.test(lower)) {
                    attributes.abstractness -= 0.3;
                }
            }
        }

        // Analyze ConceptNet relationships
        for (const rel of semanticRelations) {
            const target = rel.target.toLowerCase();
            const weight = rel.weight;
            
            // Emotional relationships
            if (rel.relation === 'CausesDesire' || rel.relation === 'HasProperty') {
                if (/positive|good|pleasant|happy/i.test(target)) {
                    attributes.valence += 0.2 * weight;
                }
                if (/negative|bad|unpleasant|sad/i.test(target)) {
                    attributes.valence -= 0.2 * weight;
                }
            }

            // Action relationships suggest movement
            if (rel.relation === 'CapableOf' || rel.relation === 'UsedFor') {
                attributes.movement += 0.1 * weight;
            }

            // Add context tags
            if (rel.relation === 'IsA' || rel.relation === 'PartOf') {
                attributes.context.push(target);
            }
        }

        // Clamp values
        attributes.valence = Math.max(-1, Math.min(1, attributes.valence));
        attributes.arousal = Math.max(-1, Math.min(1, attributes.arousal));
        attributes.dominance = Math.max(-1, Math.min(1, attributes.dominance));
        attributes.intensity = Math.max(0, Math.min(1, attributes.intensity));
        attributes.abstractness = Math.max(0, Math.min(1, attributes.abstractness));
        attributes.movement = Math.max(0, Math.min(1, attributes.movement));
        attributes.context = [...new Set(attributes.context)].slice(0, 5);

        return attributes;
    }

    /**
     * Get cached or analyze multiple words
     */
    async analyzeWords(words) {
        if (typeof words === 'string') {
            words = words.split(/\s+/).filter(w => w.length > 0);
        }

        const analyses = await Promise.all(
            words.map(word => this.analyzeWord(word))
        );

        return {
            words,
            individual: analyses,
            blended: this._blendAttributes(analyses)
        };
    }

    /**
     * Blend attributes from multiple word analyses
     */
    _blendAttributes(analyses) {
        const count = analyses.length;
        const blended = {
            valence: 0,
            arousal: 0,
            dominance: 0,
            intensity: 0,
            abstractness: 0,
            movement: 0,
            context: []
        };

        for (const analysis of analyses) {
            const attrs = analysis.attributes;
            blended.valence += attrs.valence;
            blended.arousal += attrs.arousal;
            blended.dominance += attrs.dominance;
            blended.intensity += attrs.intensity;
            blended.abstractness += attrs.abstractness;
            blended.movement += attrs.movement;
            blended.context.push(...attrs.context);
        }

        // Average
        blended.valence /= count;
        blended.arousal /= count;
        blended.dominance /= count;
        blended.intensity /= count;
        blended.abstractness /= count;
        blended.movement /= count;
        blended.context = [...new Set(blended.context)].slice(0, 10);

        return blended;
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.cache.clear();
        this._log('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            words: Array.from(this.cache.keys())
        };
    }
}

// Export for browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SemanticAPIEngine;
}
if (typeof window !== 'undefined') {
    window.SemanticAPIEngine = SemanticAPIEngine;
}
