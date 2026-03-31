/**
 * @module ScalesLoader (Embedded Version)
 * @description Loads 1,486 scales from embedded data (no fetch required - CORS-safe)
 * @exports window.SCALES (intervals, meta, categories)
 */

(function() {
    'use strict';
    
    console.log('ScalesLoader: Loading 1,486 scales from embedded data...');
    
    // Embedded scales data - generated from scraped-scales-data.json
    // This avoids CORS issues when running from file:// protocol
    const EMBEDDED_SCALES_DATA = window.EMBEDDED_SCALES_DATA || null;
    
    if (!EMBEDDED_SCALES_DATA) {
        console.error('ScalesLoader: EMBEDDED_SCALES_DATA not found! Make sure scales-data-embedded.js is loaded first.');
        useFallbackScales();
        return;
    }
    
    try {
        const data = EMBEDDED_SCALES_DATA;
        console.log(`ScalesLoader: Loaded ${data.scales.length} scales`);

        const buildFromEmbedded = (attemptsLeft) => {
            const taxonomyUtils = window.ScaleTaxonomy;
            if (taxonomyUtils && typeof taxonomyUtils.buildScaleCatalog === 'function') {
                try {
                    const cats = data.categories || null;
                    window.SCALES = taxonomyUtils.buildScaleCatalog(data.scales, cats);

                    console.log('ScalesLoader: ✓ Scales loaded and available as window.SCALES');
                    console.log(`  - ${Object.keys(window.SCALES.intervals).length} scales`);
                    console.log(`  - ${Object.keys(window.SCALES.meta.categories).length} families`);
                    console.log(`  - ${window.SCALES.meta.essentialScales.length} essential scales`);

                    // Dispatch event to notify app that scales are ready
                    window.dispatchEvent(new CustomEvent('scalesLoaded', {
                        detail: {
                            scaleCount: data.scales.length,
                            categories: Object.keys(window.SCALES.meta.categories),
                            essentialCount: window.SCALES.meta.essentialScales.length
                        }
                    }));
                    return;
                } catch (e) {
                    console.error('ScalesLoader: Error building catalog from embedded data:', e);
                    useFallbackScales();
                    return;
                }
            }

            if (attemptsLeft > 0) {
                setTimeout(() => buildFromEmbedded(attemptsLeft - 1), 100);
            } else {
                console.error('ScalesLoader: ScaleTaxonomy helper not available after retries');
                useFallbackScales();
            }
        };

        buildFromEmbedded(20);
    } catch (error) {
        console.error('ScalesLoader: Failed to process embedded scales:', error);
        useFallbackScales();
    }
    
    function useFallbackScales() {
        // Fallback to minimal scales so app doesn't break
        window.SCALES = {
            intervals: {
                major: [0, 2, 4, 5, 7, 9, 11],
                minor: [0, 2, 3, 5, 7, 8, 10]
            },
            meta: {
                displayNames: {
                    major: 'Major',
                    minor: 'Minor'
                },
                categories: {
                    'Basic': ['major', 'minor']
                },
                essentialScales: ['major', 'minor'],
                baseScales: ['major', 'minor'],
                taxonomy: {
                    topLevel: ['Common & Core', 'All Families'],
                    familyOrder: ['Basic'],
                    byFamily: {
                        'Basic': {
                            subcategories: {
                                'Main Scales': ['major', 'minor']
                            }
                        }
                    },
                    byScale: {
                        major: { family: 'Basic', subcategory: 'Main Scales', isCore: true, variationOf: null, displayOrder: 0, isCommonCore: true },
                        minor: { family: 'Basic', subcategory: 'Main Scales', isCore: true, variationOf: null, displayOrder: 1, isCommonCore: true }
                    },
                    commonCore: ['major', 'minor'],
                    unclassified: []
                }
            },
            raw: []
        };
        
        console.warn('ScalesLoader: Using fallback scales (Major and Minor only)');
    }
})();
