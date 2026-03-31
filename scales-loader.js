/**
 * @module ScalesLoader
 * @description Loads 1,486 scales from scraped-scales-data.json and makes them available to the app
 * @exports window.SCALES (intervals, meta, categories)
 */

(function() {
    'use strict';
    
    console.log('ScalesLoader: Loading 1,486 scales...');
    
    // Load scales catalog, categories, and optional taxonomy (separate files)
    Promise.all([
        fetch('./scales_catalog.json').then(r => { if(!r.ok) throw new Error('scales_catalog.json load error'); return r.json(); }),
        fetch('./scale_categories.json').then(r => { if(!r.ok) throw new Error('scale_categories.json load error'); return r.json(); }),
        // taxonomy file is optional for testing; if missing we'll ignore it
        fetch('./scale_taxonomy.json').then(r => { if(!r.ok) return null; return r.json(); }).catch(() => null)
    ])
        .then(response => {
            const catalog = response[0];
            const categories = response[1];
            const taxonomyRaw = response[2];
            console.log(`ScalesLoader: Loaded ${catalog.scales.length} scales`);
            const taxonomyUtils = window.ScaleTaxonomy;
            if (!taxonomyUtils || typeof taxonomyUtils.buildScaleCatalog !== 'function') {
                throw new Error('ScalesLoader: ScaleTaxonomy helper not loaded');
            }
            // Provide both raw catalog (no categories) and categories map to taxonomy builder
            window.SCALES = taxonomyUtils.buildScaleCatalog(catalog.scales, categories);
            
            // If a hierarchical taxonomy file was provided, create a minimal
            // taxonomy structure compatible with the app for testing purposes.
            if (taxonomyRaw && taxonomyRaw.families) {
                try {
                    const byFamily = {};
                    const byScale = {};
                    const familyOrder = [];

                    Object.entries(taxonomyRaw.families).forEach(([familyName, familyObj]) => {
                        familyOrder.push(familyName);
                        const familyBucket = { subcategories: {} };
                        const categoriesObj = familyObj.categories || {};
                        Object.entries(categoriesObj).forEach(([catName, catObj]) => {
                            const subcats = catObj.subcategories || {};
                            Object.entries(subcats).forEach(([subName, subObj]) => {
                                const scaleIds = Array.isArray(subObj.scales) ? subObj.scales.slice() : [];
                                if (!familyBucket.subcategories[subName]) familyBucket.subcategories[subName] = [];
                                familyBucket.subcategories[subName] = familyBucket.subcategories[subName].concat(scaleIds);
                                scaleIds.forEach(id => {
                                    byScale[id] = byScale[id] || { family: familyName, subcategory: subName };
                                });
                            });
                        });
                        byFamily[familyName] = familyBucket;
                    });

                    // Merge into existing meta.taxonomy for testing display
                    window.SCALES.meta.taxonomy = window.SCALES.meta.taxonomy || {};
                    window.SCALES.meta.taxonomy.byFamily = Object.assign({}, window.SCALES.meta.taxonomy.byFamily || {}, byFamily);
                    window.SCALES.meta.taxonomy.familyOrder = Array.from(new Set((window.SCALES.meta.taxonomy.familyOrder || []).concat(familyOrder)));
                    window.SCALES.meta.taxonomy.byScale = Object.assign({}, window.SCALES.meta.taxonomy.byScale || {}, byScale);
                } catch (e) {
                    console.warn('ScalesLoader: Failed to apply scale_taxonomy.json overlay', e);
                }
            }

            console.log('ScalesLoader: ✓ Scales loaded and available as window.SCALES');
            console.log(`  - ${Object.keys(window.SCALES.intervals).length} scales`);
            const familyCount = window.SCALES.meta && window.SCALES.meta.categories ? Object.keys(window.SCALES.meta.categories).length : 0;
            console.log(`  - ${familyCount} families`);
            console.log(`  - ${window.SCALES.meta.essentialScales.length} essential scales`);
            
            // Dispatch event to notify app that scales are ready
            window.dispatchEvent(new CustomEvent('scalesLoaded', {
                detail: {
                    scaleCount: catalog.scales.length,
                    categories: window.SCALES.meta ? Object.keys(window.SCALES.meta.categories) : [],
                    essentialCount: window.SCALES.meta.essentialScales.length
                }
            }));
        })
        .catch(error => {
            console.error('ScalesLoader: Failed to load scales:', error);
            
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
        });
})();
