/**
 * Shared scale taxonomy utilities for build scripts and browser loaders.
 * Updated for 4-level pedagogical hierarchy (Family > Category > Subcategory > Sub-subcategory).
 */
(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.ScaleTaxonomy = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';

    const CORE_CHURCH_MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

    const FAMILY_ORDER = [
        'Western Diatonic (Church Modes)',
        'Hybrid Major-Minor Systems',
        'Western Modal Extensions',
        'Jazz & Bebop Foundations',
        'Jazz: Altered & Fusion Tension',
        'Blues Roots & Blue-Notes',
        'Pentatonic Universe (Global)',
        'Indian Classical: Hindustani (Thaat)',
        'Indian Classical: Carnatic (Melakarta)',
        'Middle Eastern: Arabic Maqamat',
        'Middle Eastern: Turkish & Greek Makam',
        'Middle Eastern: Persian Dastgah',
        'Spanish, Flamenco & Andalusian',
        'East Asian: Japanese Traditions',
        'East Asian: Chinese Traditions',
        'African Heritage & Qenet',
        'South & Central American Traditions',
        'Balkan, Slavic & Nordic Folk',
        'Southeast Asian (Gamelan/Pelog)',
        'Theoretical: Symmetric & Messiaen',
        'Theoretical: Mathematical & Set Theory',
        'Foundations: 3-Note Trichords',
        'Foundations: 4-Note Tetrachords',
        'Systematic Variations (-ic Family)',
        'Experimental & Neo-Theoretical'
    ];

    /**
     * Calculates "Distance from Major" (Complexity Score).
     * Compares intervals to standard Major [0,2,4,5,7,9,11].
     */
    function getDistanceFromMajor(intervals) {
        if (!Array.isArray(intervals) || intervals.length === 0) return 999;
        const major = [0, 2, 4, 5, 7, 9, 11];
        let score = 0;
        intervals.slice(0, 7).forEach((note, i) => {
            if (major[i] !== undefined) score += Math.abs(note - major[i]);
            else score += 2;
        });
        score += Math.abs(intervals.length - 7) * 5;
        return score;
    }

    /**
     * Calculates "Distance from Minor" (Sadness Baseline).
     * Compares intervals to standard Natural Minor [0,2,3,5,7,8,10].
     */
    function getDistanceFromMinor(intervals) {
        if (!Array.isArray(intervals) || intervals.length === 0) return 999;
        const minor = [0, 2, 3, 5, 7, 8, 10];
        let score = 0;
        intervals.slice(0, 7).forEach((note, i) => {
            if (minor[i] !== undefined) score += Math.abs(note - minor[i]);
            else score += 2;
        });
        score += Math.abs(intervals.length - 7) * 5;
        return score;
    }

    /**
     * Maps raw intervals to their "Harmonic Physics" property.
     * This defines the 'Force' applied to the major/minor baseline.
     */
    const PHYSICS_MAP = {
        1: { attr: 'Compression', desc: 'Inward pressure, threat, severe intimacy' }, // b2
        3: { attr: 'Melancholy', desc: 'The baseline weight of sad/minor physics' }, // b3
        4: { attr: 'Stability', desc: 'The baseline lift of happy/major physics' }, // M3
        6: { attr: 'Expansion', desc: 'Ethereal lift, otherworldly, longing' }, // #4
        8: { attr: 'Shadow', desc: 'Romantic sorrow, darkening the major frame' }, // b6
        10: { attr: 'Release', desc: 'Openness, bluesy freedom, informal' }, // b7
        11: { attr: 'Pull', desc: 'Intense leading-tone drive toward home' } // M7
    };

    /**
     * Signature Matchers for Cross-Listing
     */
    const Signature = {
        hasBlueNote: (iv) => iv.includes(6) || iv.includes(1), // b5 or b2/b3 markers
        isSpanish: (iv) => iv.includes(1) && iv.includes(4),  // b2 + M3 (Spanish Phrygian)
        isLydian: (iv) => iv.includes(6) && iv.includes(11), // #4 + M7
        isMixolydian: (iv) => iv.includes(4) && iv.includes(10), // M3 + b7
        isDorian: (iv) => iv.includes(3) && iv.includes(9),    // m3 + M6
        isPhrygian: (iv) => iv.includes(1) && iv.includes(3),  // b2 + m3
        isPentatonic: (n) => n === 5,
        isHexatonic: (n) => n === 6
    };

    /**
     * Maps a scale to its taxonomic paths based on lineage and tradition.
     * The 100x 'Global Heritage' Engine.
     */
    function deriveTaxonomiesForScale(scale) {
        if (!scale) return [];
        const results = [];
        const id = (scale.id || "").toLowerCase();
        const name = (scale.name || "").toLowerCase();
        const tags = scale.tags || [];
        
        let intervals = scale.intervals || [];
        if (typeof intervals === 'string') {
            try { intervals = JSON.parse(intervals.replace(/'/g, '"')); } catch(e) { intervals = []; }
        }
        if (!Array.isArray(intervals)) intervals = [];
        const noteCount = scale.noteCount || intervals.length || 0;

        function addPath(fam, cat, sub, ss, isPrimary = false) {
            results.push({
                family: fam,
                category: cat || "General",
                subcategory: sub || "",
                subSubcategory: ss || "",
                isPrimary: isPrimary,
                tags: tags
            });
        }

        // --- 1. CROSS-LISTING ENGINE (Multi-System Mapping) ---

        // A. BLUES ECOSYSTEM (The "Everything Blues" Hub)
        const hasBluesRoots = id.includes('blues') || name.includes('blues') || Signature.hasBlueNote(intervals);
        if (hasBluesRoots) {
            let cat = "Standard Blues";
            if (id.includes('bebop')) cat = "Bebop-Blues Hybrids";
            else if (id.includes('major')) cat = "Major Blues / Soul Roots";
            else if (noteCount < 6) cat = "Delta-Blues Roots (Pentatonic)";
            addPath('Blues Roots & Blue-Notes', cat, id.includes('delta') ? "Delta Traditions" : "Modern Blues", "", id.includes('blues'));
        }

        // B. JAZZ & BEBOP ECOSYSTEM
        const hasJazzRoots = id.includes('bebop') || name.includes('jazz') || id.includes('barry_harris') || id.includes('altered') || id.includes('dominant');
        const isMixo = Signature.isMixolydian(intervals);
        const isLyd = Signature.isLydian(intervals);
        const isDor = Signature.isDorian(intervals);

        if (hasJazzRoots || isMixo || isLyd || isDor) {
            const isBebop = id.includes('bebop') || id.includes('barry_harris');
            // Add Modal Roots for Jazz
            if (isMixo || isLyd || isDor) {
                addPath('Jazz & Bebop Foundations', "Modal Jazz Roots", isMixo ? "Mixolydian Lineage" : (isLyd ? "Lydian Lineage" : "Dorian Lineage"));
            }
            // Standard Jazz categorization
            if (hasJazzRoots || isBebop) {
                const fam = isBebop ? 'Jazz & Bebop Foundations' : 'Jazz: Altered & Fusion Tension';
                addPath(fam, isBebop ? "8-Note Structural Systems" : "Upper Structure Dissonance", "", "", !hasBluesRoots);
            }
        }

        // C. AFRICAN HERITAGE (Qenet & Diasporic)
        if (id.match(/tezeta|ambassel|bati|anchihoye|ethiopian|africa|kora|mande|gnaoua|tep_tezeta|pygmy/)) {
            let cat = "Sub-Saharan Foundations";
            if (id.match(/tezeta|ambassel|bati|anchihoye/)) cat = "Ethiopian Qenet (Ethio-Jazz)";
            else if (id.match(/kora|mande/)) cat = "West African Mande Traditions";
            else if (id.match(/gnaoua|north_africa/)) cat = "North African Gnaoua Hub";
            addPath('African Heritage & Qenet', cat, noteCount + "-Note Systems", "", true);
        }

        // D. SOUTH & CENTRAL AMERICAN HERITAGE
        if (id.match(/andine|andean|quena|charango|samba|brazil|batucada|tango|milonga|canto|venezuela|colombia/)) {
            let cat = "Andean Highland traditions";
            if (id.match(/samba|brazil|batucada/)) cat = "Afro-Brazilian Hub (Samba/Bossa)";
            else if (id.match(/tango|milonga/)) cat = "Rioplatense: Tango & Milonga";
            addPath('South & Central American Traditions', cat, "", "", true);
        }

        // E. INDIAN CLASSICAL (Hindustani/Carnatic)
        if (id.match(/mela_|mela |thaat|rag|kafi|todi|bilawal|kalyan|marva|asavari|bhairav|poorvi/)) {
            const isCarnatic = id.includes('mela_') || id.includes('melakarta');
            const fam = isCarnatic ? 'Indian Classical: Carnatic (Melakarta)' : 'Indian Classical: Hindustani (Thaat)';
            addPath(fam, isCarnatic ? "72 Janaka Parent Scales" : "10 Primary Parent Thaats", "", "", true);
        }

        // F. MIDDLE EASTERN & MEDITERRANEAN
        if (id.match(/maqam|rast|hijaz|nikriz|nawa|bayati|nahawand|saba|segah|ushaq|makam|dastgah|rebetiko|greek/)) {
            let fam = 'Middle Eastern: Arabic Maqamat';
            if (id.includes('makam') || id.match(/rebetiko|greek/)) fam = 'Middle Eastern: Turkish & Greek Makam';
            else if (id.includes('dastgah')) fam = 'Middle Eastern: Persian Dastgah';
            addPath(fam, "Traditional Modal Units (Jins)", "", "", true);
        }

        // G. SPANISH, FLAMENCO & ANDALUSIAN
        if (id.match(/spanish|flamenco|andalusian|phrygian_dominant/) || Signature.isSpanish(intervals)) {
            addPath('Spanish, Flamenco & Andalusian', "Andalusian Cadence Systems", "", "", id.match(/spanish|flamenco/));
        }

        // H. EAST ASIAN (Japanese/Chinese/Ryukyu)
        if (id.match(/ryukyu|han_|kokin|hirajoshi|iwato|in_scale|ritsu|ritsusen|zheng|wusheng|kung|shang|chih|japanese|chinese|okinawa|yayue/)) {
            const isJapanese = id.match(/ryukyu|han_|kokin|hirajoshi|iwato|ritsu|japanese|okinawa/);
            const fam = isJapanese ? 'East Asian: Japanese Traditions' : 'East Asian: Chinese Traditions';
            const cat = id.includes('ryukyu') ? "Okinawan (Ryukyu/Ainu) Lineage" : (isJapanese ? "Min'yo & Court Traditions" : "Wusheng/Yayue Systems");
            addPath(fam, cat, "", "", true);

            if (id.includes('ryukyu')) {
                addPath('Pentatonic Universe (Global)', "Cultural Pentatonics", "Okinawan Hub");
            }
        }

        // I. EUROPEAN FOLK HERITAGE
        if (id.match(/balkan|slavic|bulgarian|romanian|nordic|scandinavian|celtic|irish|scottish|hungarian|russian/)) {
            const cat = id.match(/celtic|irish|scottish/) ? "Celtic & Nordic Lineages" : "Balkan, Slavic & Russian Folk";
            addPath('Balkan, Slavic & Nordic Folk', cat, "", "", true);
            
            if (Signature.isDorian(intervals) && id.match(/celtic|irish|scottish/)) {
                addPath('Western Diatonic (Church Modes)', "Modal Contexts", "Celtic Usage");
            }
        }

        // J. WESTERN DIATONIC & CORE
        if (CORE_CHURCH_MODES.includes(id) || id === 'major' || id === 'minor' || name.match(/lydian|dorian|phrygian|aeolian|mixolydian|locrian/)) {
            const isFundamental = CORE_CHURCH_MODES.includes(id) || id === 'major';
            const fam = isFundamental ? 'Western Diatonic (Church Modes)' : 'Hybrid Major-Minor Systems';
            addPath(fam, isFundamental ? "Core 7-Note Modes" : "Harmonic/Melodic Lineages", "", "", isFundamental);
            
            if (id.match(/lydian_#2|mixolydian_b6|dorian_#4|phrygian_M3/)) {
                addPath('Western Modal Extensions', "Altered Church Modes");
            }
        }

        // K. GLOBAL PENTATONICS
        if (noteCount === 5 || id.includes('pentatonic')) {
            if (results.length === 0 || id.match(/pentatonic/)) {
                addPath('Pentatonic Universe (Global)', "Structural Hub", id.includes('major') ? "Major-Type" : "Minor-Type", "", true);
            }
        }

        // L. THEORETICAL & SYMMETRIC
        if (id.match(/symmetric|messiaen|whole_tone|chromatic|total_serialism|forte|set_theory/)) {
            const isMessiaen = id.includes('messiaen');
            const fam = isMessiaen ? 'Theoretical: Symmetric & Messiaen' : 'Theoretical: Mathematical & Set Theory';
            addPath(fam, isMessiaen ? "Limited Transposition Systems" : "Atonal Set Theory", "", "", true);
        }

        // M. FOUNDATIONS
        if (noteCount === 3) addPath('Foundations: 3-Note Trichords', "Fundamental Building Blocks", "", "", true);
        else if (noteCount === 4) addPath('Foundations: 4-Note Tetrachords', "Modal Units", "", "", true);

        // N. SYSTEMATIC VARIATIONS
        if (id.match(/ic$/)) addPath('Systematic Variations (-ic Family)', "Historical Latinate Sets", "", "", true);

        // --- 2. FINAL FALLBACK ---
        if (results.length === 0) {
            addPath('Experimental & Neo-Theoretical', "Structural Outliers", noteCount + "-Note Systems", "", true);
        }

        // Complexity Sorting
        const distanceScore = getDistanceFromMajor(intervals);
        const isCore = scale.essential || id === 'major' || CORE_CHURCH_MODES.includes(id);
        const displayOrder = (isCore ? 0 : 5000) + distanceScore;

        return results.map(r => ({ ...r, isCore, displayOrder }));
    }

    function buildScaleCatalog(scales) {
        console.log("ScaleTaxonomy: Building catalog for", Array.isArray(scales) ? scales.length : "0", "scales");
        const intervals = {};
        const displayNames = {};
        const categories = {};
        const essentialScales = [];
        const baseScales = [];
        const taxonomyByScale = {};
        const byFamily = {};
        const synonyms = {}; // New: intervalKey -> [scaleIds]

        const scalesList = Array.isArray(scales) ? scales : [];

        scalesList.forEach(scale => {
            try {
                if (!scale || !scale.id) return;
                
                let ivals = scale.intervals || [];
                if (typeof ivals === 'string') {
                    try { ivals = JSON.parse(ivals.replace(/'/g, '"')); } catch(e) { ivals = []; }
                }
                const cleanIvals = Array.isArray(ivals) ? ivals : [];
                intervals[scale.id] = cleanIvals;
                
                // Track Synonyms
                const ivKey = cleanIvals.join(',');
                if (ivKey) {
                    if (!synonyms[ivKey]) synonyms[ivKey] = [];
                    synonyms[ivKey].push(scale.id);
                }

                displayNames[scale.id] = scale.name || scale.id;
                if (scale.essential) essentialScales.push(scale.id);
                if (scale.baseScale) baseScales.push(scale.id);

                const taxes = deriveTaxonomiesForScale(scale);
                taxonomyByScale[scale.id] = taxes || [];

                taxes.forEach(t => {
                    // Backward compatibility flat map
                    if (!categories[t.family]) categories[t.family] = [];
                    if (!categories[t.family].includes(scale.id)) categories[t.family].push(scale.id);

                    if (!byFamily[t.family]) byFamily[t.family] = { categories: {} };
                    const fam = byFamily[t.family];
                    if (!fam.categories[t.category]) fam.categories[t.category] = { subcategories: {} };
                    const cat = fam.categories[t.category];
                    if (!cat.subcategories[t.subcategory]) cat.subcategories[t.subcategory] = { subSubcategories: {} };
                    const sub = cat.subcategories[t.subcategory];
                    if (!sub.subSubcategories[t.subSubcategory]) sub.subSubcategories[t.subSubcategory] = [];
                    if (!sub.subSubcategories[t.subSubcategory].includes(scale.id)) {
                        sub.subSubcategories[t.subSubcategory].push(scale.id);
                    }
                });
            } catch (err) {
                console.error("ScaleTaxonomy: Error processing scale", scale?.id, err);
            }
        });

        // Pedagogical Sorting: Primary first, then by Complexity
        Object.keys(byFamily).forEach(f => {
            const fam = byFamily[f];
            Object.keys(fam.categories).forEach(c => {
                const cat = fam.categories[c];
                Object.keys(cat.subcategories).forEach(s => {
                    const sub = cat.subcategories[s];
                    Object.keys(sub.subSubcategories).forEach(ss => {
                        let list = sub.subSubcategories[ss];
                        list.sort((a,b) => {
                            const taxesA = taxonomyByScale[a] || [];
                            const taxesB = taxonomyByScale[b] || [];
                            const taxA = taxesA.find(t => t.family === f) || { displayOrder: 999 };
                            const taxB = taxesB.find(t => t.family === f) || { displayOrder: 999 };
                            
                            // 1. Primary vs Secondary
                            if (taxA.isPrimary !== taxB.isPrimary) {
                                return taxA.isPrimary ? -1 : 1;
                            }
                            
                            // 2. Display Order (Complexity)
                            return (taxA.displayOrder || 999) - (taxB.displayOrder || 999);
                        });
                    });
                });
            });
        });

        return {
            intervals,
            meta: {
                displayNames,
                categories,
                essentialScales,
                baseScales,
                taxonomy: {
                    byScale: taxonomyByScale,
                    byFamily,
                    familyOrder: FAMILY_ORDER,
                    synonyms // New: Map of intervalKeys to scaleIds
                }
            }
        };
    }

    return {
        buildScaleCatalog,
        deriveTaxonomiesForScale,
        getDistanceScore: getDistanceFromMajor,
        getDistanceFromMinor: getDistanceFromMinor,
        PHYSICS_MAP: PHYSICS_MAP
    };
});

if (typeof window !== 'undefined') {
    window.ScaleTaxonomy = window.ScaleTaxonomy || {};
}
