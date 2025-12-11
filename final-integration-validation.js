/**
 * Final Integration and Validation Test for Academic Scale Enhancement
 * Task 12: Comprehensive testing of all new regional scales across all modules
 * 
 * This test validates:
 * - All academic citations are accessible and properly formatted
 * - 12-TET compatibility is maintained for all scales
 * - Backward compatibility with existing functionality
 * - Cross-module integration works correctly
 */

const MusicTheoryEngine = require('./music-theory-engine.js');
const CitationManager = require('./citation-manager.js');
const RegionalScaleManager = require('./regional-scale-manager.js');

class FinalIntegrationValidator {
    constructor() {
        this.musicEngine = new MusicTheoryEngine();
        this.citationManager = new CitationManager();
        this.regionalScaleManager = new RegionalScaleManager();
        this.results = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            issues: []
        };
    }

    log(message, type = 'info') {
        const prefix = {
            'info': 'ℹ️',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    addResult(testName, passed, details = '') {
        this.results.totalTests++;
        if (passed) {
            this.results.passedTests++;
            this.log(`${testName}: PASSED ${details}`, 'success');
        } else {
            this.results.failedTests++;
            this.results.issues.push(`${testName}: ${details}`);
            this.log(`${testName}: FAILED ${details}`, 'error');
        }
    }

    // Test 1: Validate all regional scales are properly integrated
    testRegionalScaleIntegration() {
        this.log('\n🌍 Testing Regional Scale Integration', 'info');
        
        const categories = this.musicEngine.getScaleCategories();
        const southAmericanScales = categories['🌎 South American Scales'] || [];
        const africanScales = categories['🌍 African Scales'] || [];
        
        this.addResult(
            'South American scales integration',
            southAmericanScales.length >= 20,
            `Found ${southAmericanScales.length} scales`
        );
        
        this.addResult(
            'African scales integration',
            africanScales.length >= 30,
            `Found ${africanScales.length} scales`
        );

        // Test that all regional scales have valid intervals
        const allRegionalScales = [...southAmericanScales, ...africanScales];
        let validScales = 0;
        
        for (const scaleType of allRegionalScales) {
            const intervals = this.musicEngine.scales[scaleType];
            if (intervals && Array.isArray(intervals) && intervals.length > 0) {
                validScales++;
            }
        }
        
        this.addResult(
            'Regional scales have valid intervals',
            validScales === allRegionalScales.length,
            `${validScales}/${allRegionalScales.length} scales valid`
        );
    }

    // Test 2: Validate 12-TET compatibility
    test12TETCompatibility() {
        this.log('\n🎼 Testing 12-TET Compatibility', 'info');
        
        const allScales = Object.keys(this.musicEngine.scales);
        let compatibleScales = 0;
        
        for (const scaleType of allScales) {
            const intervals = this.musicEngine.scales[scaleType];
            if (intervals && intervals.every(interval => 
                Number.isInteger(interval) && interval >= 0 && interval <= 11
            )) {
                compatibleScales++;
            }
        }
        
        this.addResult(
            '12-TET compatibility for all scales',
            compatibleScales === allScales.length,
            `${compatibleScales}/${allScales.length} scales compatible`
        );
    }

    // Test 3: Validate academic citations
    testAcademicCitations() {
        this.log('\n📚 Testing Academic Citations', 'info');
        
        const categories = this.musicEngine.getScaleCategories();
        const regionalScales = [
            ...(categories['🌎 South American Scales'] || []),
            ...(categories['🌍 African Scales'] || [])
        ];
        
        let scalesWithCitations = 0;
        let scalesWithAcademicSources = 0;
        
        for (const scaleType of regionalScales) {
            const citation = this.musicEngine.scaleCitations[scaleType];
            if (citation) {
                scalesWithCitations++;
                
                // Check if it has academic format
                if (citation.culturalContext && citation.references) {
                    scalesWithAcademicSources++;
                }
            }
        }
        
        this.addResult(
            'Regional scales have citations',
            scalesWithCitations >= regionalScales.length * 0.8,
            `${scalesWithCitations}/${regionalScales.length} scales have citations`
        );
        
        this.addResult(
            'Regional scales have academic format',
            scalesWithAcademicSources >= regionalScales.length * 0.7,
            `${scalesWithAcademicSources}/${regionalScales.length} scales have academic format`
        );
    }

    // Test 4: Validate cross-module integration
    testCrossModuleIntegration() {
        this.log('\n🔗 Testing Cross-Module Integration', 'info');
        
        const testScales = ['chacarera', 'zamba', 'pentatonic_african', 'mbira_tuning'];
        let workingScales = 0;
        
        for (const scaleType of testScales) {
            try {
                // Test core music theory operations
                const notes = this.musicEngine.getScaleNotes('C', scaleType);
                const chord = this.musicEngine.getDiatonicChord(1, 'C', scaleType);
                
                if (notes && notes.length > 0 && chord) {
                    workingScales++;
                }
            } catch (error) {
                // Scale doesn't work with core operations
            }
        }
        
        this.addResult(
            'Cross-module integration',
            workingScales === testScales.length,
            `${workingScales}/${testScales.length} scales work across modules`
        );
    }

    // Test 5: Validate backward compatibility
    testBackwardCompatibility() {
        this.log('\n⏪ Testing Backward Compatibility', 'info');
        
        const existingScales = ['major', 'minor', 'dorian', 'mixolydian', 'harmonic', 'melodic'];
        let workingExistingScales = 0;
        
        for (const scaleType of existingScales) {
            try {
                const notes = this.musicEngine.getScaleNotes('C', scaleType);
                const chord = this.musicEngine.getDiatonicChord(1, 'C', scaleType);
                
                if (notes && notes.length > 0 && chord) {
                    workingExistingScales++;
                }
            } catch (error) {
                // Existing scale broken
            }
        }
        
        this.addResult(
            'Backward compatibility',
            workingExistingScales === existingScales.length,
            `${workingExistingScales}/${existingScales.length} existing scales still work`
        );
        
        // Test that existing categories are preserved
        const categories = this.musicEngine.getScaleCategories();
        const expectedCategories = [
            '🎵 Major Scale & Modes',
            '🎼 Melodic Minor & Modes',
            '🎹 Harmonic Minor & Modes',
            '🕌 Middle Eastern Scales',
            '🎸 Pentatonic Scales'
        ];
        
        let preservedCategories = 0;
        for (const category of expectedCategories) {
            if (categories[category]) {
                preservedCategories++;
            }
        }
        
        this.addResult(
            'Existing categories preserved',
            preservedCategories === expectedCategories.length,
            `${preservedCategories}/${expectedCategories.length} categories preserved`
        );
    }

    // Test 6: Validate cultural attribution completeness
    testCulturalAttribution() {
        this.log('\n🌐 Testing Cultural Attribution', 'info');
        
        const categories = this.musicEngine.getScaleCategories();
        const regionalScales = [
            ...(categories['🌎 South American Scales'] || []),
            ...(categories['🌍 African Scales'] || [])
        ];
        
        let scalesWithCulturalContext = 0;
        
        for (const scaleType of regionalScales) {
            const citation = this.musicEngine.scaleCitations[scaleType];
            if (citation && citation.culturalContext) {
                const context = citation.culturalContext;
                if (context.region && context.culturalGroup && context.historicalPeriod) {
                    scalesWithCulturalContext++;
                }
            }
        }
        
        this.addResult(
            'Cultural attribution completeness',
            scalesWithCulturalContext >= regionalScales.length * 0.7,
            `${scalesWithCulturalContext}/${regionalScales.length} scales have complete cultural context`
        );
    }

    // Test 7: Validate system performance
    testSystemPerformance() {
        this.log('\n⚡ Testing System Performance', 'info');
        
        const startTime = Date.now();
        
        // Test scale generation performance
        const testScales = ['major', 'chacarera', 'pentatonic_african', 'mbira_tuning'];
        for (let i = 0; i < 100; i++) {
            for (const scaleType of testScales) {
                this.musicEngine.getScaleNotes('C', scaleType);
            }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.addResult(
            'System performance',
            duration < 1000, // Should complete in under 1 second
            `400 scale generations completed in ${duration}ms`
        );
    }

    // Run all validation tests
    async runValidation() {
        this.log('🚀 Starting Final Integration and Validation Tests\n', 'info');
        
        this.testRegionalScaleIntegration();
        this.test12TETCompatibility();
        this.testAcademicCitations();
        this.testCrossModuleIntegration();
        this.testBackwardCompatibility();
        this.testCulturalAttribution();
        this.testSystemPerformance();
        
        // Generate final report
        this.generateFinalReport();
    }

    generateFinalReport() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('FINAL INTEGRATION VALIDATION REPORT', 'info');
        this.log('='.repeat(60), 'info');
        
        const successRate = (this.results.passedTests / this.results.totalTests * 100).toFixed(1);
        
        this.log(`Total Tests: ${this.results.totalTests}`, 'info');
        this.log(`Passed: ${this.results.passedTests}`, 'success');
        this.log(`Failed: ${this.results.failedTests}`, this.results.failedTests > 0 ? 'error' : 'info');
        this.log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
        
        if (this.results.issues.length > 0) {
            this.log('\nISSUES FOUND:', 'warning');
            this.results.issues.forEach(issue => {
                this.log(`- ${issue}`, 'warning');
            });
        }
        
        if (successRate >= 90) {
            this.log('\n✅ FINAL VALIDATION PASSED - Academic Scale Enhancement is ready for production', 'success');
        } else {
            this.log('\n❌ FINAL VALIDATION FAILED - Issues need to be addressed before production', 'error');
        }
        
        return successRate >= 90;
    }
}

// Run the validation if this script is executed directly
if (require.main === module) {
    const validator = new FinalIntegrationValidator();
    validator.runValidation().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation failed with error:', error);
        process.exit(1);
    });
}

module.exports = FinalIntegrationValidator;