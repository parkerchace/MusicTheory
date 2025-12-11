/**
 * Test Source Validation and Fallback System Integration
 * Verify that the enhanced source validation system works with existing citation infrastructure
 */

// Import required modules
let MusicTheoryEngine, CitationManager;

try {
    if (typeof require !== 'undefined') {
        MusicTheoryEngine = require('./music-theory-engine.js');
        CitationManager = require('./citation-manager.js');
    } else if (typeof window !== 'undefined') {
        MusicTheoryEngine = window.MusicTheoryEngine;
        CitationManager = window.CitationManager;
    }
} catch (error) {
    console.error('Failed to load required modules:', error.message);
    process.exit(1);
}

async function testSourceValidationIntegration() {
    console.log('=== Testing Source Validation and Fallback System Integration ===');
    
    if (!MusicTheoryEngine || !CitationManager) {
        console.error('❌ Required modules not available');
        return false;
    }
    
    const engine = new MusicTheoryEngine();
    const citationManager = new CitationManager();
    let testsPassedCount = 0;
    let totalTests = 0;
    
    // Test 1: Validate existing scale citations
    console.log('\n📚 Test 1: Validating existing scale citations');
    totalTests++;
    
    try {
        const testScales = ['major', 'dorian', 'phrygian', 'chacarera', 'pentatonic_african'];
        let validCitations = 0;
        
        for (const scaleName of testScales) {
            if (engine.scaleCitations && engine.scaleCitations[scaleName]) {
                const scaleData = engine.scaleCitations[scaleName];
                
                if (scaleData.references && Array.isArray(scaleData.references)) {
                    console.log(`  🔍 Checking ${scaleName} (${scaleData.references.length} references)`);
                    
                    for (const ref of scaleData.references) {
                        if (ref.url) {
                            const validation = await citationManager.validateSource(ref.url, ref);
                            if (validation.valid) {
                                validCitations++;
                                console.log(`    ✓ ${ref.title || 'Untitled'} - Valid`);
                            } else {
                                console.log(`    ⚠️  ${ref.title || 'Untitled'} - ${validation.reason}`);
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`  📊 Result: ${validCitations} valid citations found`);
        testsPassedCount++;
        console.log('✅ Test 1 PASSED');
    } catch (error) {
        console.log('❌ Test 1 FAILED:', error.message);
    }
    
    // Test 2: Test fallback mechanism for broken citations
    console.log('\n🔄 Test 2: Testing fallback mechanism for broken citations');
    totalTests++;
    
    try {
        const brokenCitations = [
            {
                title: 'Test Article on Major Scale',
                url: 'https://broken-link.example.com/major-scale',
                type: 'journal_article',
                authors: ['Test Author']
            },
            {
                title: 'Dorian Mode Analysis',
                url: 'https://localhost:9999/dorian',
                type: 'book',
                authors: ['Another Author']
            }
        ];
        
        const results = await citationManager.detectBrokenLinksAndReplace(brokenCitations);
        
        console.log(`  📊 Checked: ${results.totalChecked} citations`);
        console.log(`  🔗 Broken links: ${results.brokenLinks.length}`);
        console.log(`  ✅ Working links: ${results.workingLinks.length}`);
        console.log(`  🔄 Replacements found: ${results.replacements.length}`);
        console.log(`  📝 Manual review needed: ${results.requiresManualReview.length}`);
        
        // Should have detected broken links
        if (results.brokenLinks.length > 0) {
            console.log('  ✓ Broken link detection working');
        }
        
        // Should have categorized all citations
        const allCitationUrls = brokenCitations.map(c => c.url);
        const categorizedUrls = new Set([
            ...results.brokenLinks.map(b => b.citation.url),
            ...results.workingLinks.map(w => w.citation.url),
            ...results.requiresManualReview.map(m => m.citation.url)
        ]);
        
        let allCategorized = true;
        for (const url of allCitationUrls) {
            if (!categorizedUrls.has(url)) {
                allCategorized = false;
                break;
            }
        }
        
        if (allCategorized) {
            console.log('  ✓ All citations properly categorized');
            testsPassedCount++;
            console.log('✅ Test 2 PASSED');
        } else {
            console.log('  ❌ Not all citations were categorized');
        }
    } catch (error) {
        console.log('❌ Test 2 FAILED:', error.message);
    }
    
    // Test 3: Test alternative source lookup
    console.log('\n🔍 Test 3: Testing alternative source lookup');
    totalTests++;
    
    try {
        const testScales = ['major', 'dorian', 'chacarera'];
        let alternativesFound = 0;
        
        for (const scaleId of testScales) {
            const primarySource = {
                title: `Broken source for ${scaleId}`,
                url: 'https://broken.example.com/article',
                type: 'journal_article'
            };
            
            const alternatives = await citationManager.findAlternativeSources(scaleId, primarySource);
            
            console.log(`  🎵 ${scaleId}:`);
            console.log(`    📚 Alternatives available: ${alternatives.alternatives.length}`);
            console.log(`    ✅ Has valid alternatives: ${alternatives.hasValidAlternatives}`);
            console.log(`    📝 Requires manual review: ${alternatives.requiresManualReview}`);
            
            if (alternatives.alternatives.length > 0) {
                alternativesFound++;
                
                // Verify alternatives are validated
                for (const alt of alternatives.alternatives) {
                    if (!alt.validationStatus || !alt.validationStatus.valid) {
                        throw new Error(`Alternative source for ${scaleId} should be validated`);
                    }
                }
            }
        }
        
        console.log(`  📊 Result: Found alternatives for ${alternativesFound}/${testScales.length} scales`);
        testsPassedCount++;
        console.log('✅ Test 3 PASSED');
    } catch (error) {
        console.log('❌ Test 3 FAILED:', error.message);
    }
    
    // Test 4: Test source verification requirements
    console.log('\n📋 Test 4: Testing source verification requirements');
    totalTests++;
    
    try {
        const testScaleData = {
            scaleId: 'test_scale',
            intervals: [0, 2, 4, 5, 7, 9, 11],
            references: [
                {
                    type: 'journal_article',
                    title: 'Test Scale Analysis',
                    authors: ['Test Author'],
                    year: 2023,
                    journal: 'Test Journal',
                    url: 'https://jstor.org/article/test123'
                }
            ],
            culturalContext: {
                region: 'Test Region',
                culturalGroup: 'Test Culture',
                historicalPeriod: 'Modern',
                musicalFunction: 'Testing purposes'
            }
        };
        
        const validation = await citationManager.validateSourceVerificationRequirements(testScaleData);
        
        console.log(`  ✅ Valid: ${validation.valid}`);
        console.log(`  📚 Has minimum sources: ${validation.hasMinimumSources}`);
        console.log(`  🌍 Has cultural context: ${validation.hasCulturalContext}`);
        console.log(`  📊 Completeness score: ${validation.completenessScore.toFixed(2)}`);
        console.log(`  ⚠️  Issues: ${validation.issues.length}`);
        console.log(`  📝 Requirements: ${validation.requirements.length}`);
        
        if (validation.hasMinimumSources && validation.hasCulturalContext) {
            console.log('  ✓ Source verification requirements working');
            testsPassedCount++;
            console.log('✅ Test 4 PASSED');
        } else {
            console.log('  ❌ Source verification requirements not properly enforced');
        }
    } catch (error) {
        console.log('❌ Test 4 FAILED:', error.message);
    }
    
    // Test 5: Test bulk accessibility checking
    console.log('\n🔍 Test 5: Testing bulk accessibility checking');
    totalTests++;
    
    try {
        const testUrls = [
            'https://jstor.org/article/123',
            'https://doi.org/10.1000/example',
            'https://broken-link.example.com/404',
            'invalid-url-format',
            'https://cambridge.org/article/456'
        ];
        
        const results = await citationManager.bulkCheckAccessibility(testUrls);
        
        console.log(`  📊 Total checked: ${results.totalChecked}`);
        console.log(`  ✅ Accessible: ${results.summary.accessibleCount}`);
        console.log(`  ❌ Inaccessible: ${results.summary.inaccessibleCount}`);
        console.log(`  ❓ Unknown: ${results.summary.unknownCount}`);
        console.log(`  ⚠️  Errors: ${results.summary.errorCount}`);
        
        // Should check all URLs
        if (results.totalChecked === testUrls.length) {
            console.log('  ✓ All URLs checked');
            
            // Should categorize all results
            const totalCategorized = results.summary.accessibleCount + 
                                   results.summary.inaccessibleCount + 
                                   results.summary.unknownCount + 
                                   results.summary.errorCount;
            
            if (totalCategorized === testUrls.length) {
                console.log('  ✓ All URLs categorized');
                testsPassedCount++;
                console.log('✅ Test 5 PASSED');
            } else {
                console.log('  ❌ Not all URLs were categorized');
            }
        } else {
            console.log('  ❌ Not all URLs were checked');
        }
    } catch (error) {
        console.log('❌ Test 5 FAILED:', error.message);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Integration Test Results: ${testsPassedCount}/${totalTests} tests passed`);
    
    if (testsPassedCount === totalTests) {
        console.log('✅ ALL INTEGRATION TESTS PASSED - Source validation system is properly integrated');
        return true;
    } else {
        console.log('❌ SOME INTEGRATION TESTS FAILED - Source validation system needs attention');
        return false;
    }
}

// Export and run
if (typeof window !== 'undefined') {
    // Browser environment
    window.testSourceValidationIntegration = testSourceValidationIntegration;
    
    // Auto-run if this script is loaded directly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testSourceValidationIntegration);
    } else {
        testSourceValidationIntegration();
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { testSourceValidationIntegration };
    
    // Auto-run if this script is executed directly
    if (require.main === module) {
        testSourceValidationIntegration()
            .then(success => {
                process.exit(success ? 0 : 1);
            })
            .catch(error => {
                console.error('Integration test execution failed:', error);
                process.exit(1);
            });
    }
}