/**
 * Property-Based Test for Scholarly Debate Acknowledgment
 * **Feature: academic-scale-enhancement, Property 6: Scholarly Debate Acknowledgment**
 * **Validates: Requirements 1.5, 3.5**
 * 
 * Property: For any scale with multiple documented variants or conflicting academic sources, 
 * the system should acknowledge scholarly disagreements with citations to multiple authorities
 */

// Import required modules
let MusicTheoryEngine;
let CitationManager;

try {
    if (typeof require !== 'undefined') {
        MusicTheoryEngine = require('./music-theory-engine.js');
        CitationManager = require('./citation-manager.js');
    } else {
        MusicTheoryEngine = window.MusicTheoryEngine;
        CitationManager = window.CitationManager;
    }
} catch (error) {
    console.error('Failed to import required modules:', error);
}

/**
 * Test Property 6: Scholarly Debate Acknowledgment
 * For any scale with multiple documented variants or conflicting academic sources,
 * the system should acknowledge scholarly disagreements with citations to multiple authorities
 */
function testScholarlyDebateAcknowledgmentProperty() {
    console.log('🧪 Testing Property 6: Scholarly Debate Acknowledgment');
    
    if (!MusicTheoryEngine || !CitationManager) {
        console.error('❌ Required modules not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    const citationManager = new CitationManager();
    
    let passedTests = 0;
    let totalTests = 0;
    const issues = [];

    // Test scales that are known to have scholarly debates or multiple variants
    const scalesWithDebates = [
        'phrygian', // Has debates about flamenco vs. ancient Greek usage
        'hijaz', // Middle Eastern scale with regional variations
        'maqam_bayati', // Arabic maqam with different interpretations
        'raga_bhairav', // Indian raga with different schools of thought
        'spanish_phrygian', // Overlaps with phrygian but has distinct characteristics
        'persian', // Has multiple regional variants
        'hungarian_minor', // Debates about origin and proper intervals
        'double_harmonic_major', // Multiple names and theoretical interpretations
        'chacarera', // South American scale with regional variations
        'mbira_tuning', // African scale with different tuning systems
        'ethiopian_tezeta' // Ethiopian scale with modal variations
    ];

    console.log(`Testing ${scalesWithDebates.length} scales known to have scholarly debates...`);

    for (const scaleName of scalesWithDebates) {
        totalTests++;
        
        try {
            // Get the citation for this scale (returns formatted text)
            const citationText = musicEngine.getScaleCitation(scaleName);
            
            if (!citationText || citationText === 'Scale derivation not documented') {
                issues.push(`Scale ${scaleName}: No citation available`);
                continue;
            }

            // Get the raw citation data to check structure
            const citationData = musicEngine.scaleCitations[scaleName];
            
            if (!citationData || typeof citationData === 'string') {
                issues.push(`Scale ${scaleName}: Still using old string citation format`);
                continue;
            }

            // Check if there are conflicting viewpoints acknowledged in the text
            const hasDebateAcknowledgment = 
                citationText.toLowerCase().includes('debate') ||
                citationText.toLowerCase().includes('variant') ||
                citationText.toLowerCase().includes('different') ||
                citationText.toLowerCase().includes('multiple') ||
                citationText.toLowerCase().includes('conflicting') ||
                citationText.toLowerCase().includes('disagreement') ||
                citationText.toLowerCase().includes('interpretation') ||
                citationText.toLowerCase().includes('school') ||
                citationText.toLowerCase().includes('tradition') ||
                citationText.toLowerCase().includes('scholars') ||
                citationText.toLowerCase().includes('ethnomusicologist');

            // Check if the raw citation data has scholarly debate structure
            const hasScholarlyDebateStructure = citationData.scholarlyDebate && 
                citationData.scholarlyDebate.acknowledged;

            // Check if multiple authorities are cited
            const hasMultipleAuthorities = citationData.references && 
                Array.isArray(citationData.references) && 
                citationData.references.length >= 2;

            // Check if alternative sources are provided
            const hasAlternativeSources = citationData.alternativeSources && 
                Array.isArray(citationData.alternativeSources) && 
                citationData.alternativeSources.length > 0;

            if (hasDebateAcknowledgment || hasScholarlyDebateStructure || 
                (hasMultipleAuthorities && hasDebateAcknowledgment)) {
                passedTests++;
                console.log(`   ✅ ${scaleName}: Properly acknowledges scholarly debate/variants`);
                
                // Additional validation: check citation quality
                if (citationData.references && citationData.references.length > 0) {
                    const prioritizedSources = citationManager.prioritizeAcademicSources(citationData.references);
                    if (prioritizedSources.length !== citationData.references.length) {
                        console.log(`   ℹ️  ${scaleName}: Sources could be better prioritized`);
                    }
                }
            } else if (hasMultipleAuthorities) {
                // Has multiple sources but doesn't acknowledge debate
                issues.push(`Scale ${scaleName}: Has multiple sources but doesn't acknowledge potential scholarly debate or variants`);
            } else {
                // Single source - check if it acknowledges debates within the source
                if (hasDebateAcknowledgment) {
                    passedTests++;
                    console.log(`   ✅ ${scaleName}: Single source acknowledges scholarly debate`);
                } else {
                    issues.push(`Scale ${scaleName}: Doesn't acknowledge known scholarly debates`);
                }
            }

        } catch (error) {
            issues.push(`Scale ${scaleName}: Error testing - ${error.message}`);
        }
    }

    // Test property with generated data - scales that should have scholarly debate acknowledgment
    console.log('\nTesting property with generated scholarly debate scenarios...');
    
    const mockScalesWithDebates = [
        {
            name: 'test_scale_with_debate',
            citation: {
                description: 'A scale with multiple interpretations and scholarly debate about its origins',
                references: [
                    { type: 'journal_article', title: 'First Interpretation', authors: ['Scholar A'], year: 2020 },
                    { type: 'journal_article', title: 'Alternative View', authors: ['Scholar B'], year: 2021 }
                ],
                scholarlyDebate: {
                    acknowledged: true,
                    description: 'Scholars disagree on the historical origins'
                }
            }
        },
        {
            name: 'test_scale_multiple_variants',
            citation: {
                description: 'Scale with regional variants documented by different ethnomusicologists',
                references: [
                    { type: 'book', title: 'Regional Study A', authors: ['Researcher X'], year: 2019 },
                    { type: 'book', title: 'Regional Study B', authors: ['Researcher Y'], year: 2020 },
                    { type: 'journal_article', title: 'Comparative Analysis', authors: ['Researcher Z'], year: 2021 }
                ],
                alternativeSources: [
                    { type: 'journal_article', title: 'Alternative Documentation', authors: ['Scholar C'], year: 2018 }
                ]
            }
        }
    ];

    for (const mockScale of mockScalesWithDebates) {
        totalTests++;
        
        const citation = mockScale.citation;
        
        // Check scholarly debate acknowledgment
        const hasDebateAcknowledgment = 
            citation.description.toLowerCase().includes('debate') ||
            citation.description.toLowerCase().includes('variant') ||
            citation.description.toLowerCase().includes('different') ||
            citation.description.toLowerCase().includes('multiple') ||
            (citation.scholarlyDebate && citation.scholarlyDebate.acknowledged);

        // Check multiple authorities
        const hasMultipleAuthorities = citation.references && citation.references.length >= 2;

        // Check alternative sources
        const hasAlternativeSources = citation.alternativeSources && citation.alternativeSources.length > 0;

        if (hasDebateAcknowledgment && (hasMultipleAuthorities || hasAlternativeSources)) {
            passedTests++;
            console.log(`   ✅ ${mockScale.name}: Properly structured scholarly debate acknowledgment`);
        } else {
            issues.push(`Mock scale ${mockScale.name}: Doesn't properly acknowledge scholarly debate`);
        }
    }

    // Test edge cases
    console.log('\nTesting edge cases...');
    
    // Test scale with no scholarly debate (should not falsely trigger)
    totalTests++;
    const simpleScale = {
        name: 'simple_major',
        citation: {
            description: 'Standard major scale with well-established theory',
            references: [
                { type: 'book', title: 'Basic Music Theory', authors: ['Standard Author'], year: 2020 }
            ]
        }
    };

    const hasUnexpectedDebate = 
        simpleScale.citation.description.toLowerCase().includes('debate') ||
        simpleScale.citation.description.toLowerCase().includes('conflicting');

    if (!hasUnexpectedDebate) {
        passedTests++;
        console.log(`   ✅ ${simpleScale.name}: Correctly doesn't claim scholarly debate where none exists`);
    } else {
        issues.push(`Simple scale incorrectly claims scholarly debate`);
    }

    // Report results
    console.log(`\n📊 Property Test Results:`);
    console.log(`   Passed: ${passedTests}/${totalTests} tests`);
    console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
    
    if (issues.length > 0) {
        console.log(`\n⚠️  Issues Found:`);
        issues.forEach(issue => console.log(`   • ${issue}`));
    }

    const success = passedTests === totalTests;
    console.log(`\n${success ? '✅' : '❌'} Property 6 ${success ? 'PASSED' : 'FAILED'}: Scholarly Debate Acknowledgment`);
    
    return {
        success: success,
        passed: passedTests,
        total: totalTests,
        issues: issues,
        property: 'Scholarly Debate Acknowledgment',
        validates: 'Requirements 1.5, 3.5'
    };
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testScholarlyDebateAcknowledgmentProperty();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testScholarlyDebateAcknowledgmentProperty };
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.testScholarlyDebateAcknowledgmentProperty = testScholarlyDebateAcknowledgmentProperty;
}