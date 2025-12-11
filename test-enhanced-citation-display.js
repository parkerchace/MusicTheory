/**
 * Test Enhanced Citation Display System
 * Tests the new academic citation format support and consistency checking
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
 * Test enhanced citation display system functionality
 */
function testEnhancedCitationDisplay() {
    console.log('🧪 Testing Enhanced Citation Display System');
    
    if (!MusicTheoryEngine || !CitationManager) {
        console.error('❌ Required modules not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    const citationManager = new CitationManager();
    
    let passedTests = 0;
    let totalTests = 0;
    const issues = [];

    // Test different citation formats
    const testScales = ['hungarian_minor', 'phrygian', 'hijaz', 'major', 'dorian'];
    
    console.log('Testing citation format support...');
    
    for (const scaleName of testScales) {
        totalTests += 3; // Test text, html, and academic formats
        
        try {
            // Test text format
            const textCitation = musicEngine.getScaleCitation(scaleName, 'text');
            if (textCitation && textCitation !== 'Scale derivation not documented') {
                passedTests++;
                console.log(`   ✅ ${scaleName}: Text format working`);
            } else {
                issues.push(`${scaleName}: Text format failed`);
            }
            
            // Test HTML format
            const htmlCitation = musicEngine.getScaleCitation(scaleName, 'html');
            if (htmlCitation && htmlCitation.includes('<div class="scale-citation-content">')) {
                passedTests++;
                console.log(`   ✅ ${scaleName}: HTML format working`);
            } else {
                issues.push(`${scaleName}: HTML format failed`);
            }
            
            // Test academic format
            const academicCitation = musicEngine.getScaleCitation(scaleName, 'academic');
            if (academicCitation && academicCitation.length > 0) {
                passedTests++;
                console.log(`   ✅ ${scaleName}: Academic format working`);
            } else {
                issues.push(`${scaleName}: Academic format failed`);
            }
            
        } catch (error) {
            issues.push(`${scaleName}: Error testing formats - ${error.message}`);
        }
    }

    // Test citation format consistency checking
    console.log('\nTesting citation format consistency checking...');
    
    for (const scaleName of testScales) {
        totalTests++;
        
        try {
            const consistencyCheck = musicEngine.checkCitationFormatConsistency(scaleName);
            
            if (consistencyCheck && typeof consistencyCheck === 'object') {
                passedTests++;
                console.log(`   ✅ ${scaleName}: Consistency check working`);
                
                // Log details for enhanced scales
                if (consistencyCheck.hasScholarlyDebate) {
                    console.log(`      📚 Has scholarly debate acknowledgment`);
                }
                if (consistencyCheck.hasPageNumbers) {
                    console.log(`      📄 Has page number references`);
                }
                if (consistencyCheck.hasMultipleSources) {
                    console.log(`      📖 Has multiple sources`);
                }
            } else {
                issues.push(`${scaleName}: Consistency check failed`);
            }
            
        } catch (error) {
            issues.push(`${scaleName}: Error in consistency check - ${error.message}`);
        }
    }

    // Test different citation types (journal articles, books, ethnomusicological studies)
    console.log('\nTesting different citation types...');
    
    const scalesWithDifferentTypes = ['hungarian_minor', 'phrygian', 'hijaz'];
    
    for (const scaleName of scalesWithDifferentTypes) {
        totalTests++;
        
        try {
            const citationData = musicEngine.scaleCitations[scaleName];
            
            if (citationData && citationData.references) {
                const hasJournalArticle = citationData.references.some(ref => ref.type === 'journal_article');
                const hasBook = citationData.references.some(ref => ref.type === 'book');
                
                if (hasJournalArticle || hasBook) {
                    passedTests++;
                    console.log(`   ✅ ${scaleName}: Has proper citation types`);
                } else {
                    issues.push(`${scaleName}: Missing proper citation types`);
                }
            } else {
                issues.push(`${scaleName}: No citation data found`);
            }
            
        } catch (error) {
            issues.push(`${scaleName}: Error checking citation types - ${error.message}`);
        }
    }

    // Test page number and section references
    console.log('\nTesting page number and section references...');
    
    for (const scaleName of scalesWithDifferentTypes) {
        totalTests++;
        
        try {
            const citationData = musicEngine.scaleCitations[scaleName];
            
            if (citationData && citationData.references) {
                const hasPageNumbers = citationData.references.some(ref => ref.pages);
                
                if (hasPageNumbers) {
                    passedTests++;
                    console.log(`   ✅ ${scaleName}: Has page number references`);
                } else {
                    issues.push(`${scaleName}: Missing page number references`);
                }
            } else {
                issues.push(`${scaleName}: No citation data found`);
            }
            
        } catch (error) {
            issues.push(`${scaleName}: Error checking page numbers - ${error.message}`);
        }
    }

    // Test HTML formatting for different citation types
    console.log('\nTesting HTML formatting for different citation types...');
    
    totalTests++;
    try {
        const htmlCitation = musicEngine.getScaleCitation('hungarian_minor', 'html');
        
        if (htmlCitation.includes('journal_article') || 
            htmlCitation.includes('book') || 
            htmlCitation.includes('Cultural Context') ||
            htmlCitation.includes('Scholarly Note')) {
            passedTests++;
            console.log(`   ✅ HTML formatting includes enhanced features`);
        } else {
            issues.push('HTML formatting missing enhanced features');
        }
        
    } catch (error) {
        issues.push(`Error testing HTML formatting - ${error.message}`);
    }

    // Report results
    console.log(`\n📊 Enhanced Citation Display Test Results:`);
    console.log(`   Passed: ${passedTests}/${totalTests} tests`);
    console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
    
    if (issues.length > 0) {
        console.log(`\n⚠️  Issues Found:`);
        issues.forEach(issue => console.log(`   • ${issue}`));
    }

    const success = passedTests >= totalTests * 0.8; // 80% success threshold
    console.log(`\n${success ? '✅' : '❌'} Enhanced Citation Display System ${success ? 'PASSED' : 'FAILED'}`);
    
    return {
        success: success,
        passed: passedTests,
        total: totalTests,
        issues: issues
    };
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testEnhancedCitationDisplay();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testEnhancedCitationDisplay };
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.testEnhancedCitationDisplay = testEnhancedCitationDisplay;
}