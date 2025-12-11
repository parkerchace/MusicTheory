#!/usr/bin/env node

/**
 * Command-line tool for validating regional scale documentation
 * Usage: node validate-scale-documentation.js [scale-file.json]
 */

const fs = require('fs');
const path = require('path');
const AcademicSourceValidator = require('./academic-source-validator.js');

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node validate-scale-documentation.js [scale-file.json]');
        console.log('');
        console.log('Example scale file format:');
        console.log(JSON.stringify({
            scaleId: "example_scale",
            intervals: [0, 2, 4, 5, 7, 9, 11],
            description: "Example scale description",
            culturalContext: {
                region: "Example Region",
                culturalGroup: "Example Group",
                historicalPeriod: "Example Period",
                musicalFunction: "Example Function"
            },
            tuningSystem: {
                original: "Example original tuning",
                approximationMethod: "12-TET approximation",
                orchestralInstruments: "Compatible with standard orchestra",
                limitations: "Example limitations",
                pedagogicalNotes: "Example pedagogical notes"
            },
            references: [
                {
                    type: "journal_article",
                    title: "Example Article",
                    authors: ["Example Author"],
                    journal: "Example Journal",
                    year: 2020,
                    volume: "1",
                    pages: "1-10",
                    url: "https://example.com"
                }
            ]
        }, null, 2));
        process.exit(1);
    }

    const scaleFile = args[0];
    
    if (!fs.existsSync(scaleFile)) {
        console.error(`Error: File '${scaleFile}' not found`);
        process.exit(1);
    }

    try {
        console.log(`Validating scale documentation: ${scaleFile}`);
        console.log('='.repeat(50));
        
        // Read and parse scale file
        const scaleData = JSON.parse(fs.readFileSync(scaleFile, 'utf8'));
        
        // Create validator and run validation
        const validator = new AcademicSourceValidator();
        const report = await validator.validateScalePackage(scaleData, {
            checkAccessibility: true,
            validateCulturalSensitivity: true,
            generateReport: true
        });
        
        // Generate and display report
        const summaryReport = validator.generateSummaryReport(report);
        console.log(summaryReport);
        
        // Save detailed report if requested
        if (args.includes('--save-report')) {
            const reportFile = scaleFile.replace('.json', '_validation_report.md');
            fs.writeFileSync(reportFile, summaryReport);
            console.log(`\nDetailed report saved to: ${reportFile}`);
        }
        
        // Exit with appropriate code
        process.exit(report.valid ? 0 : 1);
        
    } catch (error) {
        console.error(`Error validating scale documentation: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}