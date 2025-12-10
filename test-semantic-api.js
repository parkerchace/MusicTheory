/**
 * Test Real-Time Semantic API Integration
 * 
 * This tests the actual API calls to verify:
 * 1. Dictionary API returns definitions
 * 2. ConceptNet returns semantic relationships
 * 3. Datamuse returns word associations
 * 4. Attribute derivation works correctly
 */

// Mock fetch for Node.js (browser has native fetch)
global.fetch = async (url) => {
    const https = require('https');
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode === 200,
                    json: async () => JSON.parse(data)
                });
            });
        }).on('error', reject);
    });
};

// Simple SemanticAPIEngine for testing
class SemanticAPIEngine {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    async analyzeWord(word) {
        const normalized = word.toLowerCase().trim();
        
        if (this.cache.has(normalized)) {
            console.log(`[Cache hit] ${word}`);
            return this.cache.get(normalized);
        }

        console.log(`[API call] ${word}`);

        try {
            const [dictionaryData, conceptNetData, datamuseData] = await Promise.all([
                this._fetchDictionary(normalized),
                this._fetchConceptNet(normalized),
                this._fetchDatamuse(normalized)
            ]);

            const result = this._deriveAttributes({
                word: normalized,
                dictionary: dictionaryData,
                conceptNet: conceptNetData,
                datamuse: datamuseData
            });

            this.cache.set(normalized, result);
            return result;
        } catch (error) {
            console.error(`API error for "${word}":`, error.message);
            return this._emptyResult(normalized);
        }
    }

    async _fetchDictionary(word) {
        try {
            const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                definitions: data[0]?.meanings?.flatMap(m => 
                    m.definitions.map(d => d.definition)
                ) || [],
                phonetic: data[0]?.phonetic || '',
                partOfSpeech: data[0]?.meanings?.map(m => m.partOfSpeech) || []
            };
        } catch (error) {
            console.warn('Dictionary API failed:', error.message);
            return null;
        }
    }

    async _fetchConceptNet(word) {
        try {
            const url = `https://api.conceptnet.io/c/en/${word}?limit=20`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                relations: data.edges?.map(e => ({
                    relation: e.rel?.label,
                    target: e.end?.label,
                    weight: e.weight
                })) || []
            };
        } catch (error) {
            console.warn('ConceptNet API failed:', error.message);
            return null;
        }
    }

    async _fetchDatamuse(word) {
        try {
            const url = `https://api.datamuse.com/words?ml=${word}&max=20`;
            const response = await fetch(url);
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            return {
                similar: data.map(w => ({
                    word: w.word,
                    score: w.score
                }))
            };
        } catch (error) {
            console.warn('Datamuse API failed:', error.message);
            return null;
        }
    }

    _deriveAttributes(data) {
        let valence = 0;
        let arousal = 0;
        let dominance = 0;
        let intensity = 0.5;
        let abstractness = 0.5;
        let movement = 0.5;
        const contextual = [];
        const definitions = [];

        // Dictionary definitions
        if (data.dictionary && data.dictionary.definitions.length > 0) {
            definitions.push(...data.dictionary.definitions);
            
            // Derive emotional attributes from definitions
            const definitionText = definitions.join(' ').toLowerCase();
            
            // Positive words
            if (/(calm|peace|tranquil|serene|happy|joy|love|pleasant|good|beautiful)/i.test(definitionText)) {
                valence += 0.6;
            }
            // Negative words  
            if (/(anxiet|fear|sad|angry|pain|bad|ugly|disorder|chaos|violence)/i.test(definitionText)) {
                valence -= 0.6;
            }
            
            // High arousal
            if (/(excit|intense|energetic|chaotic|urgent|rapid|violent|extreme)/i.test(definitionText)) {
                arousal += 0.6;
                intensity += 0.3;
            }
            // Low arousal
            if (/(calm|peace|slow|gentle|still|quiet|tranquil|serene)/i.test(definitionText)) {
                arousal -= 0.6;
                intensity -= 0.2;
            }
            
            // Abstract
            if (/(concept|idea|quality|state|condition|feeling|emotion)/i.test(definitionText)) {
                abstractness += 0.4;
            }
            // Concrete
            if (/(object|thing|person|place|animal|plant)/i.test(definitionText)) {
                abstractness -= 0.4;
            }
        }

        // ConceptNet relationships
        if (data.conceptNet && data.conceptNet.relations.length > 0) {
            for (const rel of data.conceptNet.relations) {
                const target = rel.target?.toLowerCase() || '';
                
                // Extract emotional associations
                if (/(happy|joy|love|pleasure|good)/i.test(target)) {
                    valence += 0.2;
                }
                if (/(sad|fear|anger|pain|bad)/i.test(target)) {
                    valence -= 0.2;
                }
                if (/(excit|energy|active|fast)/i.test(target)) {
                    arousal += 0.2;
                }
                if (/(calm|slow|still|peace)/i.test(target)) {
                    arousal -= 0.2;
                }
                
                // Context tags
                if (rel.relation && !contextual.includes(rel.relation)) {
                    contextual.push(rel.relation);
                }
            }
        }

        // Clamp values
        valence = Math.max(-1, Math.min(1, valence));
        arousal = Math.max(-1, Math.min(1, arousal));
        dominance = Math.max(-1, Math.min(1, dominance));
        intensity = Math.max(0, Math.min(1, intensity));
        abstractness = Math.max(0, Math.min(1, abstractness));
        movement = Math.max(0, Math.min(1, intensity * 0.5 + Math.abs(arousal) * 0.5));

        return {
            word: data.word,
            emotional: { valence, arousal, dominance },
            intensity,
            abstractness,
            movement,
            contextual: contextual.slice(0, 5),
            definitions: definitions.slice(0, 3),
            source: 'api'
        };
    }

    _emptyResult(word) {
        return {
            word,
            emotional: { valence: 0, arousal: 0, dominance: 0 },
            intensity: 0.5,
            abstractness: 0.5,
            movement: 0.5,
            contextual: [],
            definitions: [],
            source: 'none'
        };
    }
}

// Test function
async function testSemanticAPI() {
    console.log('='.repeat(60));
    console.log('SEMANTIC API ENGINE TEST');
    console.log('='.repeat(60));
    console.log();

    const api = new SemanticAPIEngine();

    const testWords = [
        'serenity',
        'chaos', 
        'twilight',
        'euphoria',
        'melancholy'
    ];

    for (const word of testWords) {
        console.log(`\n📝 Testing: "${word}"`);
        console.log('-'.repeat(60));

        try {
            const result = await api.analyzeWord(word);

            console.log(`\n✅ Result:`);
            console.log(`   Valence: ${result.emotional.valence.toFixed(2)} ${result.emotional.valence > 0 ? '(positive)' : result.emotional.valence < 0 ? '(negative)' : '(neutral)'}`);
            console.log(`   Arousal: ${result.emotional.arousal.toFixed(2)} ${result.emotional.arousal > 0 ? '(energetic)' : result.emotional.arousal < 0 ? '(calm)' : '(neutral)'}`);
            console.log(`   Intensity: ${(result.intensity * 100).toFixed(0)}%`);
            console.log(`   Movement: ${(result.movement * 100).toFixed(0)}%`);
            console.log(`   Abstractness: ${(result.abstractness * 100).toFixed(0)}%`);
            
            if (result.definitions.length > 0) {
                console.log(`\n📚 Definitions:`);
                result.definitions.forEach((def, i) => {
                    console.log(`   ${i + 1}. ${def}`);
                });
            }
            
            if (result.contextual.length > 0) {
                console.log(`\n🔗 Context: ${result.contextual.join(', ')}`);
            }

        } catch (error) {
            console.log(`\n❌ Error: ${error.message}`);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

// Run test
testSemanticAPI().catch(console.error);
