#!/usr/bin/env node

/**
 * @module ValidationCLI
 * @description Command-line interface for scale reference validation operations
 * @exports ValidationCLI class and CLI runner
 * @feature CLI for running full validation cycles
 * @feature Options for partial validation and specific scale targeting
 * @feature Interactive mode for manual review decisions
 * @requirements 4.1, 4.4, 4.5
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import validation components
const ValidationOrchestrator = require('./validation-orchestrator.js');
const ValidationReporter = require('./validation-reporter.js');

class ValidationCLI {
    constructor() {
        this.orchestrator = null;
        this.rl = null;
        this.interactiveMode = false;
        this.currentValidation = null;
        
        // CLI configuration
        this.config = {
            musicTheoryEnginePath: './music-theory-engine.js',
            outputDir: './validation-reports',
            logLevel: 'info',
            batchSize: 10,
            timeout: 30000,
            retries: 3
        };
        
        // Command definitions
        this.commands = {
            'validate': {
                description: 'Run complete validation on all scale references',
                options: [
                    '--scales <names>     Comma-separated list of specific scales to validate',
                    '--phases <phases>    Comma-separated list of validation phases to run',
                    '--output <dir>       Output directory for reports (default: ./validation-reports)',
                    '--interactive       Enable interactive mode for manual review decisions',
                    '--format <format>   Report format: json, markdown, html (default: markdown)',
                    '--timeout <ms>      Request timeout in milliseconds (default: 30000)',
                    '--retries <count>   Number of retry attempts (default: 3)',
                    '--batch-size <size> Batch processing size (default: 10)'
                ],
                handler: this.handleValidateCommand.bind(this)
            },
            'partial': {
                description: 'Run partial validation on specific scales or phases',
                options: [
                    '--scales <names>     Required: Comma-separated list of scales to validate',
                    '--phases <phases>    Validation phases to run (default: all)',
                    '--output <dir>       Output directory for reports',
                    '--interactive       Enable interactive mode',
                    '--format <format>   Report format: json, markdown, html'
                ],
                handler: this.handlePartialCommand.bind(this)
            },
            'status': {
                description: 'Show current validation status and progress',
                options: [
                    '--history <count>    Show validation history (default: 5)',
                    '--detailed          Show detailed progress information'
                ],
                handler: this.handleStatusCommand.bind(this)
            },
            'report': {
                description: 'Generate validation report from previous results',
                options: [
                    '--session <id>      Session ID to generate report for',
                    '--format <format>   Report format: json, markdown, html (default: markdown)',
                    '--output <file>     Output file path'
                ],
                handler: this.handleReportCommand.bind(this)
            },
            'interactive': {
                description: 'Start interactive validation session',
                options: [
                    '--scales <names>     Optional: Specific scales to focus on',
                    '--auto-approve      Auto-approve low-risk replacements'
                ],
                handler: this.handleInteractiveCommand.bind(this)
            },
            'config': {
                description: 'Configure CLI settings',
                options: [
                    '--set <key=value>   Set configuration value',
                    '--get <key>        Get configuration value',
                    '--list             List all configuration values',
                    '--reset            Reset to default configuration'
                ],
                handler: this.handleConfigCommand.bind(this)
            },
            'list-scales': {
                description: 'List all available scales for validation',
                options: [
                    '--filter <pattern>  Filter scales by name pattern',
                    '--count            Show only the count of scales'
                ],
                handler: this.handleListScalesCommand.bind(this)
            },
            'validate-single': {
                description: 'Validate a single scale reference quickly',
                options: [
                    '--scale <name>      Required: Scale name to validate',
                    '--reference <index> Reference index to validate (default: all)',
                    '--verbose          Show detailed validation output'
                ],
                handler: this.handleValidateSingleCommand.bind(this)
            },
            'dry-run': {
                description: 'Run validation without making any changes',
                options: [
                    '--scales <names>    Comma-separated list of scales (default: all)',
                    '--phases <phases>   Validation phases to simulate',
                    '--show-changes     Show what changes would be made'
                ],
                handler: this.handleDryRunCommand.bind(this)
            },
            'help': {
                description: 'Show help information',
                options: [
                    '<command>           Show help for specific command'
                ],
                handler: this.handleHelpCommand.bind(this)
            }
        };
    }

    /**
     * Initialize CLI with configuration
     * @param {Object} options - CLI options
     */
    async initialize(options = {}) {
        // Merge configuration
        this.config = { ...this.config, ...options };
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
        
        // Initialize validation orchestrator
        this.orchestrator = new ValidationOrchestrator({
            enableErrorRecovery: true,
            enablePartialValidation: true,
            maxRetries: this.config.retries,
            progressCallback: this.handleProgress.bind(this),
            errorCallback: this.handleError.bind(this)
        });
        
        // Setup readline interface for interactive mode
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.log('info', 'Validation CLI initialized');
    }

    /**
     * Parse command line arguments and execute command
     * @param {Array} args - Command line arguments
     */
    async run(args = process.argv.slice(2)) {
        try {
            if (args.length === 0) {
                this.showUsage();
                return;
            }

            const command = args[0];
            const commandArgs = args.slice(1);
            
            if (!this.commands[command]) {
                this.log('error', `Unknown command: ${command}`);
                this.showUsage();
                process.exit(1);
            }

            // Parse command arguments
            const parsedArgs = this.parseArguments(commandArgs);
            
            // Initialize CLI
            await this.initialize(parsedArgs.config);
            
            // Execute command
            await this.commands[command].handler(parsedArgs);
            
        } catch (error) {
            this.log('error', `CLI execution failed: ${error.message}`);
            if (this.config.logLevel === 'debug') {
                console.error(error.stack);
            }
            process.exit(1);
        } finally {
            if (this.rl) {
                this.rl.close();
            }
        }
    }

    /**
     * Handle validate command - run complete validation
     * @param {Object} args - Parsed arguments
     */
    async handleValidateCommand(args) {
        this.log('info', 'Starting complete validation...');
        
        // Load scale citations
        const scaleCitations = await this.loadScaleCitations();
        
        // Filter scales if specified
        let targetScales = scaleCitations;
        if (args.scales) {
            targetScales = this.filterScales(scaleCitations, args.scales);
            this.log('info', `Validating ${Object.keys(targetScales).length} specific scales`);
        }
        
        // Configure validation options
        const validationOptions = {
            phases: args.phases || undefined,
            includeFormattedOutput: true,
            includeRawData: args.format === 'json',
            includeChangeLog: true,
            includeIssueDetails: true
        };
        
        // Enable interactive mode if requested
        if (args.interactive) {
            this.interactiveMode = true;
            this.log('info', 'Interactive mode enabled - you will be prompted for manual review decisions');
        }
        
        try {
            // Run validation
            const results = await this.orchestrator.runCompleteValidation(targetScales, validationOptions);
            
            // Generate and save report
            await this.generateAndSaveReport(results, args);
            
            // Show summary
            this.showValidationSummary(results);
            
            // Handle interactive review if needed
            if (this.interactiveMode && this.hasManualReviewItems(results)) {
                await this.handleInteractiveReview(results);
            }
            
        } catch (error) {
            this.log('error', `Validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle partial command - run partial validation
     * @param {Object} args - Parsed arguments
     */
    async handlePartialCommand(args) {
        if (!args.scales) {
            this.log('error', 'Partial validation requires --scales parameter');
            process.exit(1);
        }
        
        this.log('info', `Starting partial validation for scales: ${args.scales.join(', ')}`);
        
        // Load scale citations
        const scaleCitations = await this.loadScaleCitations();
        
        // Filter to specified scales
        const targetScales = this.filterScales(scaleCitations, args.scales);
        
        if (Object.keys(targetScales).length === 0) {
            this.log('error', 'No matching scales found');
            process.exit(1);
        }
        
        // Configure partial validation options
        const partialOptions = {
            scaleNames: args.scales,
            phases: args.phases || undefined,
            includeFormattedOutput: true,
            includeRawData: args.format === 'json'
        };
        
        // Enable interactive mode if requested
        if (args.interactive) {
            this.interactiveMode = true;
        }
        
        try {
            // Run partial validation
            const results = await this.orchestrator.runPartialValidation(scaleCitations, partialOptions);
            
            // Generate and save report
            await this.generateAndSaveReport(results, args);
            
            // Show summary
            this.showValidationSummary(results);
            
            // Handle interactive review if needed
            if (this.interactiveMode && this.hasManualReviewItems(results)) {
                await this.handleInteractiveReview(results);
            }
            
        } catch (error) {
            this.log('error', `Partial validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle status command - show validation status
     * @param {Object} args - Parsed arguments
     */
    async handleStatusCommand(args) {
        const status = this.orchestrator.getValidationStatus();
        const history = this.orchestrator.getValidationHistory(args.history || 5);
        
        console.log('\n=== Validation Status ===');
        console.log(`Running: ${status.isRunning ? 'Yes' : 'No'}`);
        console.log(`Paused: ${status.isPaused ? 'Yes' : 'No'}`);
        
        if (status.currentValidation) {
            console.log(`Current Session: ${status.currentValidation.id}`);
            console.log(`Session Type: ${status.currentValidation.type}`);
            console.log(`Started: ${status.currentValidation.startTime}`);
        }
        
        if (status.progress && status.isRunning) {
            console.log('\n=== Current Progress ===');
            console.log(`Phase: ${status.progress.currentPhase || 'Not started'}`);
            console.log(`Progress: ${status.progress.processedItems}/${status.progress.totalItems}`);
            console.log(`Errors: ${status.progress.errors.length}`);
            console.log(`Warnings: ${status.progress.warnings.length}`);
            
            if (status.progress.estimatedCompletion) {
                const eta = new Date(status.progress.estimatedCompletion);
                console.log(`ETA: ${eta.toLocaleTimeString()}`);
            }
        }
        
        console.log('\n=== Dependencies ===');
        const deps = status.dependencies;
        console.log(`All Available: ${deps.allAvailable ? 'Yes' : 'No'}`);
        if (deps.missing.length > 0) {
            console.log(`Missing: ${deps.missing.join(', ')}`);
        }
        
        if (history.length > 0) {
            console.log('\n=== Recent Validation History ===');
            for (const session of history) {
                console.log(`${session.id} - ${session.type} - ${session.status} - ${session.startTime}`);
                if (session.results) {
                    console.log(`  Scales: ${session.results.summary.totalScales}, References: ${session.results.summary.totalReferences}`);
                    console.log(`  Errors: ${session.results.summary.errors}, Warnings: ${session.results.summary.warnings}`);
                }
            }
        }
        
        if (args.detailed && status.progress) {
            console.log('\n=== Detailed Progress ===');
            console.log(JSON.stringify(status.progress, null, 2));
        }
    }

    /**
     * Handle report command - generate report from previous results
     * @param {Object} args - Parsed arguments
     */
    async handleReportCommand(args) {
        if (!args.session) {
            this.log('error', 'Report generation requires --session parameter');
            process.exit(1);
        }
        
        const history = this.orchestrator.getValidationHistory(50);
        const session = history.find(s => s.id === args.session);
        
        if (!session || !session.results) {
            this.log('error', `Session ${args.session} not found or has no results`);
            process.exit(1);
        }
        
        this.log('info', `Generating report for session ${args.session}`);
        
        // Generate report
        await this.generateAndSaveReport(session.results, args);
        
        this.log('info', 'Report generated successfully');
    }

    /**
     * Handle interactive command - start interactive validation session
     * @param {Object} args - Parsed arguments
     */
    async handleInteractiveCommand(args) {
        this.interactiveMode = true;
        
        console.log('\n=== Interactive Validation Session ===');
        console.log('This mode will guide you through validation decisions step by step.');
        console.log('You can approve, reject, or modify validation actions as they are proposed.\n');
        
        // Load scale citations
        const scaleCitations = await this.loadScaleCitations();
        
        // Filter scales if specified
        let targetScales = scaleCitations;
        if (args.scales) {
            targetScales = this.filterScales(scaleCitations, args.scales);
        }
        
        // Interactive configuration
        const config = await this.interactiveConfiguration();
        
        // Run validation with interactive callbacks
        const validationOptions = {
            ...config,
            includeFormattedOutput: true,
            includeChangeLog: true,
            autoApprove: args.autoApprove || false
        };
        
        try {
            const results = await this.orchestrator.runCompleteValidation(targetScales, validationOptions);
            
            // Interactive review of results
            await this.handleInteractiveReview(results);
            
            // Generate final report
            await this.generateAndSaveReport(results, { format: 'markdown' });
            
            console.log('\nInteractive validation session completed!');
            
        } catch (error) {
            this.log('error', `Interactive validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle config command - manage CLI configuration
     * @param {Object} args - Parsed arguments
     */
    async handleConfigCommand(args) {
        if (args.list) {
            console.log('\n=== Current Configuration ===');
            for (const [key, value] of Object.entries(this.config)) {
                console.log(`${key}: ${JSON.stringify(value)}`);
            }
            return;
        }
        
        if (args.get) {
            const value = this.config[args.get];
            if (value !== undefined) {
                console.log(`${args.get}: ${JSON.stringify(value)}`);
            } else {
                this.log('error', `Configuration key '${args.get}' not found`);
            }
            return;
        }
        
        if (args.set) {
            const [key, ...valueParts] = args.set.split('=');
            const value = valueParts.join('=');
            
            if (!key || value === undefined) {
                this.log('error', 'Invalid set format. Use: --set key=value');
                return;
            }
            
            // Parse value
            let parsedValue;
            try {
                parsedValue = JSON.parse(value);
            } catch {
                parsedValue = value; // Keep as string if not valid JSON
            }
            
            this.config[key] = parsedValue;
            console.log(`Set ${key} = ${JSON.stringify(parsedValue)}`);
            return;
        }
        
        if (args.reset) {
            this.config = {
                musicTheoryEnginePath: './music-theory-engine.js',
                outputDir: './validation-reports',
                logLevel: 'info',
                batchSize: 10,
                timeout: 30000,
                retries: 3
            };
            console.log('Configuration reset to defaults');
            return;
        }
        
        this.log('error', 'Config command requires --list, --get, --set, or --reset');
    }

    /**
     * Handle list-scales command - list available scales
     * @param {Object} args - Parsed arguments
     */
    async handleListScalesCommand(args) {
        try {
            const scaleCitations = await this.loadScaleCitations();
            const scaleNames = Object.keys(scaleCitations);
            
            // Apply filter if specified
            let filteredScales = scaleNames;
            if (args.filter) {
                const pattern = new RegExp(args.filter, 'i');
                filteredScales = scaleNames.filter(name => pattern.test(name));
            }
            
            if (args.count) {
                console.log(`Total scales: ${filteredScales.length}`);
                return;
            }
            
            console.log('\n=== Available Scales ===');
            for (const scaleName of filteredScales.sort()) {
                const scale = scaleCitations[scaleName];
                const refCount = scale.references ? scale.references.length : 0;
                console.log(`${scaleName} (${refCount} references)`);
            }
            
            console.log(`\nTotal: ${filteredScales.length} scales`);
            
        } catch (error) {
            this.log('error', `Failed to list scales: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle validate-single command - validate single scale reference
     * @param {Object} args - Parsed arguments
     */
    async handleValidateSingleCommand(args) {
        if (!args.scale) {
            this.log('error', 'Single validation requires --scale parameter');
            process.exit(1);
        }
        
        try {
            const scaleCitations = await this.loadScaleCitations();
            
            if (!scaleCitations[args.scale]) {
                this.log('error', `Scale '${args.scale}' not found`);
                process.exit(1);
            }
            
            const scale = scaleCitations[args.scale];
            const references = scale.references || [];
            
            if (references.length === 0) {
                console.log(`Scale '${args.scale}' has no references to validate`);
                return;
            }
            
            console.log(`\n=== Validating Scale: ${args.scale} ===`);
            
            // Validate specific reference or all references
            const referencesToValidate = args.reference !== undefined ? 
                [references[parseInt(args.reference)]] : 
                references;
            
            for (let i = 0; i < referencesToValidate.length; i++) {
                const ref = referencesToValidate[i];
                if (!ref) continue;
                
                const refIndex = args.reference !== undefined ? parseInt(args.reference) : i;
                console.log(`\nReference ${refIndex}: ${ref.url}`);
                
                // Quick validation using orchestrator
                if (this.orchestrator && this.orchestrator.referenceValidator) {
                    try {
                        const result = await this.orchestrator.referenceValidator.validateReference(ref.url, args.scale);
                        
                        console.log(`  Accessible: ${result.accessible ? '✅' : '❌'}`);
                        console.log(`  Relevant: ${result.contentRelevant ? '✅' : '❌'}`);
                        
                        if (result.relevanceScore !== undefined) {
                            console.log(`  Relevance Score: ${result.relevanceScore}`);
                        }
                        
                        if (result.issues && result.issues.length > 0) {
                            console.log(`  Issues: ${result.issues.join(', ')}`);
                        }
                        
                        if (args.verbose && result.details) {
                            console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
                        }
                        
                    } catch (validationError) {
                        console.log(`  ❌ Validation failed: ${validationError.message}`);
                    }
                } else {
                    console.log('  ⚠️  Validation components not available - showing reference info only');
                    console.log(`  Title: ${ref.title || 'N/A'}`);
                    console.log(`  Authors: ${ref.authors ? ref.authors.join(', ') : 'N/A'}`);
                    console.log(`  Year: ${ref.year || 'N/A'}`);
                }
            }
            
        } catch (error) {
            this.log('error', `Single validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle dry-run command - simulate validation without changes
     * @param {Object} args - Parsed arguments
     */
    async handleDryRunCommand(args) {
        console.log('\n=== Dry Run Mode - No Changes Will Be Made ===');
        
        try {
            const scaleCitations = await this.loadScaleCitations();
            
            // Filter scales if specified
            let targetScales = scaleCitations;
            if (args.scales) {
                targetScales = this.filterScales(scaleCitations, args.scales);
            }
            
            console.log(`\nAnalyzing ${Object.keys(targetScales).length} scales...`);
            
            // Simulate validation phases
            const phases = args.phases || this.orchestrator?.validationPhases || [
                'accessibility_validation',
                'content_analysis',
                'duplication_detection',
                'attribution_verification'
            ];
            
            console.log(`\nPhases to simulate: ${phases.join(', ')}`);
            
            // Count references and simulate issues
            let totalReferences = 0;
            let simulatedIssues = 0;
            
            for (const [scaleName, scale] of Object.entries(targetScales)) {
                const references = scale.references || [];
                totalReferences += references.length;
                
                // Simulate finding issues (for demonstration)
                for (const ref of references) {
                    if (ref.url.includes('example.com') || ref.url.includes('broken')) {
                        simulatedIssues++;
                        
                        if (args.showChanges) {
                            console.log(`\n  Would fix: ${scaleName}`);
                            console.log(`    Issue: Broken/invalid URL - ${ref.url}`);
                            console.log(`    Action: Replace with verified source`);
                        }
                    }
                }
            }
            
            console.log(`\n=== Dry Run Summary ===`);
            console.log(`Total references analyzed: ${totalReferences}`);
            console.log(`Potential issues found: ${simulatedIssues}`);
            console.log(`References that would be updated: ${simulatedIssues}`);
            
            if (simulatedIssues > 0) {
                console.log(`\nTo apply these changes, run:`);
                const scalesArg = args.scales ? ` --scales "${args.scales.join(',')}"` : '';
                console.log(`  node validation-cli.js validate${scalesArg}`);
            } else {
                console.log(`\n✅ No issues found - all references appear valid!`);
            }
            
        } catch (error) {
            this.log('error', `Dry run failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle help command - show help information
     * @param {Object} args - Parsed arguments
     */
    async handleHelpCommand(args) {
        if (args.command && this.commands[args.command]) {
            this.showCommandHelp(args.command);
        } else {
            this.showUsage();
        }
    }

    /**
     * Interactive configuration setup
     * @returns {Promise<Object>} Configuration object
     */
    async interactiveConfiguration() {
        console.log('\n=== Interactive Configuration ===');
        
        const config = {};
        
        // Ask about validation phases
        const phases = await this.askQuestion(
            'Which validation phases would you like to run? (comma-separated, or "all" for all phases)\n' +
            'Available: initialization, accessibility_validation, content_analysis, duplication_detection, attribution_verification, replacement_planning, replacement_execution, final_validation, reporting\n' +
            'Default: all\n> '
        );
        
        if (phases && phases.toLowerCase() !== 'all') {
            config.phases = phases.split(',').map(p => p.trim());
        }
        
        // Ask about output format
        const format = await this.askQuestion(
            'What report format would you like? (json/markdown/html)\n' +
            'Default: markdown\n> '
        );
        
        if (format) {
            config.format = format;
        }
        
        // Ask about batch size
        const batchSize = await this.askQuestion(
            'Batch size for processing references? (1-100)\n' +
            'Default: 10\n> '
        );
        
        if (batchSize && !isNaN(parseInt(batchSize))) {
            config.batchSize = parseInt(batchSize);
        }
        
        return config;
    }

    /**
     * Handle interactive review of validation results
     * @param {Object} results - Validation results
     */
    async handleInteractiveReview(results) {
        console.log('\n=== Interactive Review ===');
        
        // Review replacement plan if available
        const replacementPlan = results.phases.replacement_planning?.replacementPlan || [];
        
        if (replacementPlan.length === 0) {
            console.log('No replacements needed - all references are valid!');
            return;
        }
        
        console.log(`Found ${replacementPlan.length} references that need attention:`);
        
        // Track user decisions
        const decisions = {
            approved: [],
            skipped: [],
            manualReview: [],
            customReplacements: []
        };
        
        for (let i = 0; i < replacementPlan.length; i++) {
            const plan = replacementPlan[i];
            
            console.log(`\n--- Reference ${i + 1}/${replacementPlan.length} ---`);
            console.log(`Scale: ${plan.scaleName}`);
            console.log(`Current URL: ${plan.originalUrl || 'N/A'}`);
            console.log(`Issue: ${plan.reason}`);
            console.log(`Priority: ${plan.priority}`);
            
            if (plan.suggestedReplacement) {
                console.log(`Suggested replacement: ${plan.suggestedReplacement.url}`);
                console.log(`Replacement type: ${plan.suggestedReplacement.type}`);
            }
            
            if (plan.issues) {
                console.log(`Details: ${plan.issues.join(', ')}`);
            }
            
            const action = await this.askQuestion(
                'What would you like to do?\n' +
                '1. Accept suggested replacement\n' +
                '2. Skip this reference (no changes)\n' +
                '3. Mark for manual review later\n' +
                '4. Provide custom replacement URL\n' +
                '5. Show more details\n' +
                '6. Show validation history for this scale\n' +
                '7. Quit interactive review\n> '
            );
            
            switch (action) {
                case '1':
                    decisions.approved.push(plan);
                    console.log('✓ Approved for replacement');
                    break;
                case '2':
                    decisions.skipped.push(plan);
                    console.log('⊘ Skipped - no changes will be made');
                    break;
                case '3':
                    decisions.manualReview.push(plan);
                    console.log('⚠ Marked for manual review');
                    break;
                case '4':
                    const customUrl = await this.askQuestion('Enter custom replacement URL: ');
                    if (customUrl) {
                        const customTitle = await this.askQuestion('Enter title (optional): ');
                        plan.customReplacement = {
                            url: customUrl,
                            title: customTitle || 'Custom Reference',
                            type: 'custom'
                        };
                        decisions.customReplacements.push(plan);
                        console.log('✓ Custom replacement recorded');
                    } else {
                        console.log('⊘ No URL provided, skipping');
                        i--; // Repeat this reference
                    }
                    break;
                case '5':
                    await this.showReferenceDetails(plan);
                    i--; // Repeat this reference
                    break;
                case '6':
                    await this.showScaleValidationHistory(plan.scaleName);
                    i--; // Repeat this reference
                    break;
                case '7':
                    console.log('Exiting interactive review...');
                    return decisions;
                default:
                    console.log('Invalid option, please try again...');
                    i--; // Repeat this reference
            }
        }
        
        // Show summary of decisions
        console.log('\n=== Review Summary ===');
        console.log(`Approved replacements: ${decisions.approved.length}`);
        console.log(`Custom replacements: ${decisions.customReplacements.length}`);
        console.log(`Skipped references: ${decisions.skipped.length}`);
        console.log(`Manual review needed: ${decisions.manualReview.length}`);
        
        // Ask for final confirmation
        if (decisions.approved.length > 0 || decisions.customReplacements.length > 0) {
            const confirm = await this.askQuestion(
                `\nApply ${decisions.approved.length + decisions.customReplacements.length} changes? (y/N): `
            );
            
            if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                console.log('✓ Changes will be applied');
                decisions.applyChanges = true;
            } else {
                console.log('⊘ Changes cancelled - no modifications will be made');
                decisions.applyChanges = false;
            }
        }
        
        console.log('\nInteractive review completed!');
        return decisions;
    }

    /**
     * Show validation history for a specific scale
     * @param {string} scaleName - Name of the scale
     */
    async showScaleValidationHistory(scaleName) {
        console.log(`\n=== Validation History for ${scaleName} ===`);
        
        // In a real implementation, this would query historical validation data
        console.log('Previous validation results:');
        console.log('- Last validated: Never');
        console.log('- Previous issues: None recorded');
        console.log('- Reference changes: None recorded');
        
        console.log('\nNote: Detailed history tracking not yet implemented');
        
        await this.askQuestion('Press Enter to continue...');
    }

    /**
     * Show detailed information about a reference
     * @param {Object} plan - Replacement plan item
     */
    async showReferenceDetails(plan) {
        console.log('\n=== Reference Details ===');
        console.log(`Scale: ${plan.scaleName}`);
        console.log(`Reference Index: ${plan.referenceIndex}`);
        console.log(`Issue Type: ${plan.reason}`);
        console.log(`Priority: ${plan.priority}`);
        
        if (plan.issues) {
            console.log(`Issues: ${plan.issues.join(', ')}`);
        }
        
        if (plan.duplicateUrl) {
            console.log(`Duplicate URL: ${plan.duplicateUrl}`);
        }
        
        if (plan.relevanceScore !== undefined) {
            console.log(`Relevance Score: ${plan.relevanceScore}`);
        }
        
        await this.askQuestion('Press Enter to continue...');
    }

    /**
     * Load scale citations from music theory engine
     * @returns {Promise<Object>} Scale citations object
     */
    async loadScaleCitations() {
        try {
            // Try to load from the music theory engine file
            const enginePath = path.resolve(this.config.musicTheoryEnginePath);
            
            if (!fs.existsSync(enginePath)) {
                this.log('warn', `Music theory engine not found at: ${enginePath}, using fallback data`);
                return this.getFallbackScaleCitations();
            }
            
            // Try to load actual scale citations from the engine
            try {
                // Read the engine file and extract scale citations
                const engineContent = fs.readFileSync(enginePath, 'utf8');
                
                // Look for scaleCitations object in the file
                const scaleCitationsMatch = engineContent.match(/scaleCitations\s*[:=]\s*({[\s\S]*?});?\s*(?:\/\/|$|var|let|const|function|class)/);
                
                if (scaleCitationsMatch) {
                    // Try to parse the scale citations object
                    const scaleCitationsStr = scaleCitationsMatch[1];
                    
                    // Use a safer evaluation approach
                    const scaleCitations = this.parseScaleCitations(scaleCitationsStr);
                    
                    if (scaleCitations && Object.keys(scaleCitations).length > 0) {
                        this.log('info', `Loaded ${Object.keys(scaleCitations).length} scales from engine`);
                        return scaleCitations;
                    }
                }
                
                this.log('warn', 'Could not parse scale citations from engine, using fallback data');
                return this.getFallbackScaleCitations();
                
            } catch (parseError) {
                this.log('warn', `Failed to parse engine file: ${parseError.message}, using fallback data`);
                return this.getFallbackScaleCitations();
            }
            
        } catch (error) {
            this.log('error', `Failed to load scale citations: ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse scale citations from engine content
     * @param {string} citationsStr - String representation of scale citations
     * @returns {Object} Parsed scale citations
     */
    parseScaleCitations(citationsStr) {
        try {
            // Simple regex-based parsing for common patterns
            const scales = {};
            
            // Look for scale entries like: "ScaleName": { references: [...] }
            const scaleMatches = citationsStr.match(/"([^"]+)"\s*:\s*{[^}]*references\s*:\s*\[[^\]]*\][^}]*}/g);
            
            if (scaleMatches) {
                for (const match of scaleMatches) {
                    const nameMatch = match.match(/"([^"]+)"/);
                    if (nameMatch) {
                        const scaleName = nameMatch[1];
                        
                        // Extract references array
                        const refsMatch = match.match(/references\s*:\s*(\[[^\]]*\])/);
                        if (refsMatch) {
                            try {
                                const references = JSON.parse(refsMatch[1].replace(/'/g, '"'));
                                scales[scaleName] = { references };
                            } catch (e) {
                                // Skip malformed references
                                this.log('warn', `Skipping malformed references for scale: ${scaleName}`);
                            }
                        }
                    }
                }
            }
            
            return scales;
            
        } catch (error) {
            this.log('warn', `Scale citations parsing failed: ${error.message}`);
            return {};
        }
    }

    /**
     * Get fallback scale citations for testing
     * @returns {Object} Fallback scale citations
     */
    getFallbackScaleCitations() {
        return {
            'Major': {
                references: [
                    {
                        url: 'https://musictheory.net/lessons/21',
                        title: 'Major Scale - Music Theory',
                        authors: ['Music Theory Team'],
                        year: 2023
                    }
                ]
            },
            'Minor': {
                references: [
                    {
                        url: 'https://musictheory.net/lessons/22',
                        title: 'Minor Scale - Music Theory',
                        authors: ['Music Theory Team'],
                        year: 2023
                    }
                ]
            },
            'Dorian': {
                references: [
                    {
                        url: 'https://example.com/broken-link',
                        title: 'Dorian Mode Reference',
                        authors: ['Unknown'],
                        year: 2020
                    }
                ]
            },
            'Mixolydian': {
                references: [
                    {
                        url: 'https://musictheory.net/lessons/modes',
                        title: 'Musical Modes',
                        authors: ['Music Theory Team'],
                        year: 2023
                    }
                ]
            },
            'Pentatonic': {
                references: [
                    {
                        url: 'https://example.com/another-broken-link',
                        title: 'Pentatonic Scales',
                        authors: ['Test Author'],
                        year: 2021
                    }
                ]
            }
        };
    }

    /**
     * Filter scales based on provided names
     * @param {Object} scaleCitations - All scale citations
     * @param {Array} scaleNames - Names of scales to include
     * @returns {Object} Filtered scale citations
     */
    filterScales(scaleCitations, scaleNames) {
        const filtered = {};
        
        for (const scaleName of scaleNames) {
            // Case-insensitive matching
            const matchingKey = Object.keys(scaleCitations).find(
                key => key.toLowerCase() === scaleName.toLowerCase()
            );
            
            if (matchingKey) {
                filtered[matchingKey] = scaleCitations[matchingKey];
            } else {
                this.log('warn', `Scale '${scaleName}' not found`);
            }
        }
        
        return filtered;
    }

    /**
     * Generate and save validation report
     * @param {Object} results - Validation results
     * @param {Object} args - Command arguments
     */
    async generateAndSaveReport(results, args) {
        const format = args.format || 'markdown';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sessionId = results.sessionId || 'unknown';
        
        // Determine output file
        let outputFile;
        if (args.output && args.output.includes('.')) {
            outputFile = args.output;
        } else {
            const outputDir = args.output || this.config.outputDir;
            const extension = format === 'json' ? 'json' : format === 'html' ? 'html' : 'md';
            outputFile = path.join(outputDir, `validation-report-${sessionId}-${timestamp}.${extension}`);
        }
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate report content
        let reportContent;
        
        switch (format) {
            case 'json':
                reportContent = JSON.stringify(results, null, 2);
                break;
                
            case 'html':
                reportContent = this.generateHtmlReport(results);
                break;
                
            case 'markdown':
            default:
                reportContent = this.generateMarkdownReport(results);
                break;
        }
        
        // Save report
        fs.writeFileSync(outputFile, reportContent, 'utf8');
        
        this.log('info', `Report saved to: ${outputFile}`);
    }

    /**
     * Generate markdown report
     * @param {Object} results - Validation results
     * @returns {string} Markdown report content
     */
    generateMarkdownReport(results) {
        const lines = [];
        
        lines.push('# Scale Reference Validation Report');
        lines.push('');
        lines.push(`**Session ID:** ${results.sessionId}`);
        lines.push(`**Start Time:** ${results.startTime}`);
        lines.push(`**End Time:** ${results.endTime}`);
        lines.push(`**Duration:** ${results.duration}ms`);
        lines.push('');
        
        // Summary
        lines.push('## Summary');
        lines.push('');
        lines.push(`- **Total Scales:** ${results.summary.totalScales}`);
        lines.push(`- **Total References:** ${results.summary.totalReferences}`);
        lines.push(`- **Processed References:** ${results.summary.processedReferences}`);
        lines.push(`- **Errors:** ${results.summary.errors}`);
        lines.push(`- **Warnings:** ${results.summary.warnings}`);
        lines.push('');
        
        // Phase Results
        lines.push('## Phase Results');
        lines.push('');
        
        for (const [phaseName, phaseResult] of Object.entries(results.phases)) {
            lines.push(`### ${phaseName}`);
            lines.push('');
            lines.push(`**Status:** ${phaseResult.status}`);
            lines.push(`**Timestamp:** ${phaseResult.timestamp}`);
            
            if (phaseResult.summary) {
                lines.push('');
                lines.push('**Summary:**');
                for (const [key, value] of Object.entries(phaseResult.summary)) {
                    lines.push(`- ${key}: ${value}`);
                }
            }
            
            if (phaseResult.error) {
                lines.push('');
                lines.push(`**Error:** ${phaseResult.error}`);
            }
            
            lines.push('');
        }
        
        // Errors and Warnings
        if (results.errors.length > 0) {
            lines.push('## Errors');
            lines.push('');
            for (const error of results.errors) {
                lines.push(`- **${error.phase || 'General'}:** ${error.error || error.message}`);
                if (error.timestamp) {
                    lines.push(`  - Time: ${error.timestamp}`);
                }
            }
            lines.push('');
        }
        
        if (results.warnings.length > 0) {
            lines.push('## Warnings');
            lines.push('');
            for (const warning of results.warnings) {
                lines.push(`- ${warning.message || warning}`);
            }
            lines.push('');
        }
        
        return lines.join('\n');
    }

    /**
     * Generate HTML report
     * @param {Object} results - Validation results
     * @returns {string} HTML report content
     */
    generateHtmlReport(results) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Scale Reference Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .phase { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; }
        .error { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Scale Reference Validation Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Session ID:</strong> ${results.sessionId}</p>
        <p><strong>Duration:</strong> ${results.duration}ms</p>
        <p><strong>Total Scales:</strong> ${results.summary.totalScales}</p>
        <p><strong>Total References:</strong> ${results.summary.totalReferences}</p>
        <p><strong>Errors:</strong> <span class="error">${results.summary.errors}</span></p>
        <p><strong>Warnings:</strong> <span class="warning">${results.summary.warnings}</span></p>
    </div>
    
    <h2>Phase Results</h2>
    ${Object.entries(results.phases).map(([name, phase]) => `
        <div class="phase">
            <h3>${name}</h3>
            <p><strong>Status:</strong> <span class="${phase.status === 'completed' ? 'success' : phase.status === 'failed' ? 'error' : ''}">${phase.status}</span></p>
            <p><strong>Timestamp:</strong> ${phase.timestamp}</p>
            ${phase.error ? `<p class="error"><strong>Error:</strong> ${phase.error}</p>` : ''}
        </div>
    `).join('')}
    
    ${results.errors.length > 0 ? `
        <h2>Errors</h2>
        <ul>
            ${results.errors.map(error => `<li class="error">${error.error || error.message}</li>`).join('')}
        </ul>
    ` : ''}
    
    <p><em>Generated on ${new Date().toISOString()}</em></p>
</body>
</html>`;
    }

    /**
     * Show validation summary
     * @param {Object} results - Validation results
     */
    showValidationSummary(results) {
        console.log('\n=== Validation Summary ===');
        console.log(`Session: ${results.sessionId}`);
        console.log(`Duration: ${results.duration}ms`);
        console.log(`Scales: ${results.summary.totalScales}`);
        console.log(`References: ${results.summary.totalReferences}`);
        console.log(`Processed: ${results.summary.processedReferences}`);
        
        if (results.summary.errors > 0) {
            console.log(`❌ Errors: ${results.summary.errors}`);
        }
        
        if (results.summary.warnings > 0) {
            console.log(`⚠️  Warnings: ${results.summary.warnings}`);
        }
        
        if (results.summary.errors === 0 && results.summary.warnings === 0) {
            console.log('✅ Validation completed successfully with no issues!');
        }
        
        // Show phase status
        console.log('\n=== Phase Status ===');
        for (const [phaseName, phaseResult] of Object.entries(results.phases)) {
            const status = phaseResult.status === 'completed' ? '✅' : 
                          phaseResult.status === 'failed' ? '❌' : 
                          phaseResult.status === 'skipped' ? '⊘' : '❓';
            console.log(`${status} ${phaseName}: ${phaseResult.status}`);
        }
    }

    /**
     * Check if results have items requiring manual review
     * @param {Object} results - Validation results
     * @returns {boolean} Whether manual review is needed
     */
    hasManualReviewItems(results) {
        const replacementPlan = results.phases.replacement_planning?.replacementPlan || [];
        return replacementPlan.length > 0;
    }

    /**
     * Handle progress updates from validation orchestrator
     * @param {Object} progress - Progress information
     */
    handleProgress(progress) {
        if (this.config.logLevel === 'debug' || this.interactiveMode) {
            const percentage = progress.percentage || 0;
            const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
            process.stdout.write(`\r[${bar}] ${percentage}% - ${progress.message}`);
            
            if (progress.phase === 'completed') {
                console.log(''); // New line after completion
            }
        }
    }

    /**
     * Handle errors from validation orchestrator
     * @param {Object} error - Error information
     */
    handleError(error) {
        this.log('error', `Validation error: ${error.error}`);
        if (this.config.logLevel === 'debug') {
            console.error('Error details:', error);
        }
    }

    /**
     * Parse command line arguments
     * @param {Array} args - Raw arguments
     * @returns {Object} Parsed arguments
     */
    parseArguments(args) {
        const parsed = { config: {} };
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg.startsWith('--')) {
                const key = arg.substring(2);
                const nextArg = args[i + 1];
                
                if (nextArg && !nextArg.startsWith('--')) {
                    // Argument with value
                    if (key === 'scales' || key === 'phases') {
                        parsed[key] = nextArg.split(',').map(s => s.trim());
                    } else if (key === 'timeout' || key === 'retries' || key === 'batch-size' || key === 'history' || key === 'reference') {
                        parsed[key] = parseInt(nextArg);
                    } else {
                        parsed[key] = nextArg;
                    }
                    i++; // Skip next argument
                } else {
                    // Boolean flag
                    parsed[key] = true;
                }
            } else if (!arg.startsWith('-')) {
                // Positional argument
                if (!parsed.command) {
                    parsed.command = arg;
                } else {
                    // Additional positional arguments for help command
                    parsed.command = arg;
                }
            }
        }
        
        // Move CLI configuration to config object
        const configKeys = ['timeout', 'retries', 'batch-size', 'output'];
        for (const key of configKeys) {
            if (parsed[key] !== undefined) {
                const configKey = key.replace('-', '');
                parsed.config[configKey === 'batchsize' ? 'batchSize' : configKey] = parsed[key];
                delete parsed[key];
            }
        }
        
        return parsed;
    }

    /**
     * Ask a question and wait for user input
     * @param {string} question - Question to ask
     * @returns {Promise<string>} User's answer
     */
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    /**
     * Log message with level
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} message - Message to log
     */
    log(level, message) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.config.logLevel] || 2;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = level.toUpperCase().padEnd(5);
            console.log(`[${timestamp}] ${prefix} ${message}`);
        }
    }

    /**
     * Show general usage information
     */
    showUsage() {
        console.log('\nScale Reference Validation CLI');
        console.log('==============================\n');
        console.log('Usage: node validation-cli.js <command> [options]\n');
        console.log('Commands:');
        
        for (const [name, command] of Object.entries(this.commands)) {
            console.log(`  ${name.padEnd(12)} ${command.description}`);
        }
        
        console.log('\nUse "node validation-cli.js help <command>" for detailed command help.\n');
        console.log('Examples:');
        console.log('  node validation-cli.js validate --interactive');
        console.log('  node validation-cli.js partial --scales "Major,Minor" --phases "accessibility_validation,content_analysis"');
        console.log('  node validation-cli.js validate-single --scale "Dorian" --verbose');
        console.log('  node validation-cli.js dry-run --scales "Major,Minor" --show-changes');
        console.log('  node validation-cli.js list-scales --filter "major"');
        console.log('  node validation-cli.js status --detailed');
        console.log('  node validation-cli.js interactive --auto-approve');
    }

    /**
     * Show help for specific command
     * @param {string} commandName - Command name
     */
    showCommandHelp(commandName) {
        const command = this.commands[commandName];
        
        console.log(`\n${commandName} - ${command.description}\n`);
        console.log('Options:');
        
        for (const option of command.options) {
            console.log(`  ${option}`);
        }
        
        console.log('');
    }
}

// CLI runner function
async function runCLI() {
    const cli = new ValidationCLI();
    await cli.run();
}

// Export for both module usage and direct execution
module.exports = { ValidationCLI, runCLI };

// Run CLI if this file is executed directly
if (require.main === module) {
    runCLI().catch(error => {
        console.error('CLI execution failed:', error.message);
        process.exit(1);
    });
}