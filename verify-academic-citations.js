/**
 * Verification script for academic citations in scaleCitations
 * Validates URLs and checks for academic source compliance
 */

const MusicTheoryEngine = require('./music-theory-engine.js');
const CitationManager = require('./citation-manager.js');

async function verifyAcademicCitations() {
    console.log('Verifying Academic Citations in Scale Library...\n');
    
    const engine = new MusicTheoryEngine();
    const citationManager = new CitationManager();
    
    const scaleCitations = engine.scaleCitations;
    const scaleIds = Object.keys(scaleCitations);
    
    let totalCitations = 0;
    let validCitations = 0;
    let wikipediaCitations = 0;
    let academicCitations = 0;
    let issuesFound = [];
    
    for (const scaleId of scaleIds) {
        const scaleData = scaleCitations[scaleId];
        
        if (!scaleData.references || !Array.isArray(scaleData.references)) {
            issuesFound.push(`${scaleId}: No references array found`);
            continue;
        }
        
        console.log(`Checking ${scaleId}...`);
        
        for (const reference of scaleData.references) {
            totalCitations++;
            
            if (!reference.url) {
                issuesFound.push(`${scaleId}: Reference missing URL - ${reference.title || 'Unknown title'}`);
                continue;
            }
            
            // Check if it's a Wikipedia source (should be eliminated)
            if (citationManager.isWikipediaSource(reference.url)) {
                wikipediaCitations++;
                issuesFound.push(`${scaleId}: Wikipedia source found - ${reference.url}`);
                continue;
            }
            
            // Validate academic source
            try {
                const validation = await citationManager.validateSource(reference.url, reference);
                
                if (validation.valid) {
                    validCitations++;
                    if (validation.type === 'academic_source' || validation.type === 'probable_academic') {
                        academicCitations++;
                    }
                } else {
                    issuesFound.push(`${scaleId}: Invalid source - ${reference.url} (${validation.reason})`);
                }
                
                // Check citation completeness
                const completeness = citationManager.validateCitationCompleteness(reference);
                if (!completeness.isComplete) {
                    issuesFound.push(`${scaleId}: Incomplete citation - missing: ${completeness.missingFields.join(', ')}`);
                }
                
            } catch (error) {
                issuesFound.push(`${scaleId}: Validation error for ${reference.url} - ${error.message}`);
            }
        }
    }
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('ACADEMIC CITATION VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total scales checked: ${scaleIds.length}`);
    console.log(`Total citations: ${totalCitations}`);
    console.log(`Valid citations: ${validCitations}`);
    console.log(`Academic sources: ${academicCitations}`);
    console.log(`Wikipedia sources (should be 0): ${wikipediaCitations}`);
    console.log(`Issues found: ${issuesFound.length}`);
    
    if (issuesFound.length > 0) {
        console.log('\nISSUES FOUND:');
        console.log('-'.repeat(40));
        issuesFound.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue}`);
        });
    }
    
    // Check for enhanced citation format compliance
    console.log('\nENHANCED CITATION FORMAT CHECK:');
    console.log('-'.repeat(40));
    
    let enhancedFormatCount = 0;
    let culturalContextCount = 0;
    let tuningSystemCount = 0;
    
    for (const scaleId of scaleIds) {
        const scaleData = scaleCitations[scaleId];
        
        // Check for enhanced format with cultural context
        if (scaleData.culturalContext) {
            culturalContextCount++;
            const context = scaleData.culturalContext;
            const requiredFields = ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction'];
            const hasAllFields = requiredFields.every(field => context[field]);
            
            if (hasAllFields) {
                enhancedFormatCount++;
            } else {
                const missing = requiredFields.filter(field => !context[field]);
                issuesFound.push(`${scaleId}: Incomplete cultural context - missing: ${missing.join(', ')}`);
            }
        }
        
        // Check for tuning system documentation (for non-Western scales)
        if (scaleData.tuningSystem) {
            tuningSystemCount++;
        }
        
        // Check reference format
        if (scaleData.references) {
            for (const ref of scaleData.references) {
                if (ref.type && ref.authors && ref.year) {
                    // Good academic format
                } else {
                    issuesFound.push(`${scaleId}: Reference lacks academic format - ${ref.title || 'Unknown'}`);
                }
            }
        }
    }
    
    console.log(`Scales with cultural context: ${culturalContextCount}/${scaleIds.length}`);
    console.log(`Scales with complete enhanced format: ${enhancedFormatCount}/${scaleIds.length}`);
    console.log(`Scales with tuning system documentation: ${tuningSystemCount}/${scaleIds.length}`);
    
    // Success criteria
    const success = wikipediaCitations === 0 && 
                   (academicCitations / totalCitations) >= 0.8 && 
                   issuesFound.length === 0;
    
    console.log('\n' + '='.repeat(60));
    if (success) {
        console.log('✓ VERIFICATION PASSED - Academic citation standards met');
    } else {
        console.log('✗ VERIFICATION FAILED - Issues need to be addressed');
        console.log(`Academic source ratio: ${(academicCitations / totalCitations * 100).toFixed(1)}% (target: 80%+)`);
    }
    
    return {
        success,
        totalCitations,
        validCitations,
        academicCitations,
        wikipediaCitations,
        issuesFound,
        enhancedFormatCount,
        culturalContextCount
    };
}

// Run verification if this file is executed directly
if (require.main === module) {
    verifyAcademicCitations()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyAcademicCitations };