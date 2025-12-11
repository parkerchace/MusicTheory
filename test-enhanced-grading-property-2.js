/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 2: Grading Mode Propagation**
 * **Validates: Requirements 1.1**
 * 
 * Property 2: Grading Mode Propagation
 * For any grading mode change, all subscribed modules should receive the change 
 * notification and update their displays within the specified time limit
 */

// Import the music theory engine
const MusicTheoryEngine = require('./music-theory-engine.js');

/**
 * Property-based test using simple random generation
 * Tests that grading mode changes propagate to all subscribed modules
 */
function testGradingModePropagation() {
    console.log('🧪 Testing Property 2: Grading Mode Propagation');
    
    const results = [];
    const numTests = 100; // Run 100 iterations as specified in design
    
    for (let i = 0; i < numTests; i++) {
        try {
            const result = runSinglePropagationTest(i);
            results.push(result);
            
            if (!result.passed) {
                console.error(`❌ Test ${i + 1} failed:`, result.error);
                return {
                    passed: false,
                    failedTest: i + 1,
                    error: result.error,
                    counterexample: result.counterexample
                };
            }
        } catch (error) {
            console.error(`❌ Test ${i + 1} threw exception:`, error);
            return {
                passed: false,
                failedTest: i + 1,
                error: error.message,
                counterexample: { testIndex: i }
            };
        }
    }
    
    const passedTests = results.filter(r => r.passed).length;
    console.log(`✅ All ${passedTests}/${numTests} propagation tests passed`);
    
    return {
        passed: true,
        totalTests: numTests,
        passedTests: passedTests
    };
}

/**
 * Run a single propagation test with random parameters
 */
function runSinglePropagationTest(testIndex) {
    // Generate random test parameters
    const modes = ['functional', 'emotional', 'color'];
    const numModules = Math.floor(Math.random() * 5) + 2; // 2-6 modules
    const initialMode = modes[Math.floor(Math.random() * modes.length)];
    let targetMode = modes[Math.floor(Math.random() * modes.length)];
    
    // Ensure we actually change modes for meaningful test
    while (targetMode === initialMode) {
        targetMode = modes[Math.floor(Math.random() * modes.length)];
    }
    
    // Create engine instance
    const engine = new MusicTheoryEngine();
    engine.setGradingMode(initialMode);
    
    // Track module notifications
    const moduleNotifications = new Map();
    const moduleIds = [];
    
    // Subscribe multiple modules
    for (let i = 0; i < numModules; i++) {
        const moduleId = `test_module_${testIndex}_${i}`;
        moduleIds.push(moduleId);
        
        moduleNotifications.set(moduleId, {
            received: false,
            oldMode: null,
            newMode: null,
            timestamp: null,
            error: null
        });
        
        // Subscribe module with callback that tracks notifications
        engine.subscribe((eventType, eventData) => {
            try {
                if (eventType === 'gradingModeChanged') {
                    const notification = moduleNotifications.get(moduleId);
                    notification.received = true;
                    notification.oldMode = eventData.oldMode;
                    notification.newMode = eventData.newMode;
                    notification.timestamp = Date.now();
                }
            } catch (error) {
                const notification = moduleNotifications.get(moduleId);
                notification.error = error.message;
            }
        }, moduleId);
    }
    
    // Record time before mode change
    const changeStartTime = Date.now();
    
    // Change grading mode
    const modeChangeResult = engine.setGradingMode(targetMode);
    
    // Since the implementation is synchronous, we can check immediately
    try {
        // Verify mode change was successful
        if (!modeChangeResult) {
            return {
                passed: false,
                error: 'Mode change returned false',
                counterexample: { initialMode, targetMode, numModules }
            };
        }
        
        // Verify engine mode was updated
        if (engine.gradingMode !== targetMode) {
            return {
                passed: false,
                error: `Engine mode not updated. Expected: ${targetMode}, Got: ${engine.gradingMode}`,
                counterexample: { initialMode, targetMode, numModules }
            };
        }
        
        // Check that all modules received the notification
        let allReceived = true;
        let firstFailure = null;
        
        for (const [moduleId, notification] of moduleNotifications) {
            if (!notification.received) {
                allReceived = false;
                firstFailure = `Module ${moduleId} did not receive notification`;
                break;
            }
            
            if (notification.error) {
                allReceived = false;
                firstFailure = `Module ${moduleId} had error: ${notification.error}`;
                break;
            }
            
            if (notification.oldMode !== initialMode) {
                allReceived = false;
                firstFailure = `Module ${moduleId} received wrong oldMode. Expected: ${initialMode}, Got: ${notification.oldMode}`;
                break;
            }
            
            if (notification.newMode !== targetMode) {
                allReceived = false;
                firstFailure = `Module ${moduleId} received wrong newMode. Expected: ${targetMode}, Got: ${notification.newMode}`;
                break;
            }
            
            // Check timing (should be within reasonable time limit)
            const propagationTime = notification.timestamp - changeStartTime;
            if (propagationTime > 1000) { // 1 second max
                allReceived = false;
                firstFailure = `Module ${moduleId} notification took too long: ${propagationTime}ms`;
                break;
            }
        }
        
        if (!allReceived) {
            return {
                passed: false,
                error: firstFailure,
                counterexample: {
                    initialMode,
                    targetMode,
                    numModules,
                    moduleNotifications: Array.from(moduleNotifications.entries())
                }
            };
        }
        
        // Verify synchronization status
        const syncStatus = engine.getGradingSyncStatus();
        if (syncStatus.synchronized !== numModules) {
            return {
                passed: false,
                error: `Sync status mismatch. Expected ${numModules} synchronized, got ${syncStatus.synchronized}`,
                counterexample: { syncStatus, numModules }
            };
        }
        
        return {
            passed: true,
            moduleCount: numModules,
            propagationTime: Math.max(...Array.from(moduleNotifications.values()).map(n => n.timestamp)) - changeStartTime
        };
        
    } catch (error) {
        return {
            passed: false,
            error: error.message,
            counterexample: { initialMode, targetMode, numModules }
        };
    }
}

/**
 * Test edge cases for grading mode propagation
 */
function testPropagationEdgeCases() {
    console.log('🧪 Testing Grading Mode Propagation Edge Cases');
    
    const engine = new MusicTheoryEngine();
    
    // Test 1: No subscribers
    console.log('Testing with no subscribers...');
    const result1 = engine.setGradingMode('emotional');
    if (!result1 || engine.gradingMode !== 'emotional') {
        throw new Error('Mode change failed with no subscribers');
    }
    
    // Test 2: Same mode change (should be no-op)
    console.log('Testing same mode change...');
    const result2 = engine.setGradingMode('emotional');
    if (!result2) {
        throw new Error('Same mode change should return true');
    }
    
    // Test 3: Invalid mode
    console.log('Testing invalid mode...');
    const result3 = engine.setGradingMode('invalid');
    if (result3 || engine.gradingMode !== 'emotional') {
        throw new Error('Invalid mode change should be rejected');
    }
    
    // Test 4: Module unsubscription
    console.log('Testing module unsubscription...');
    let notificationCount = 0;
    const unsubscribe = engine.subscribe(() => {
        notificationCount++;
    }, 'test_module');
    
    engine.setGradingMode('functional');
    if (notificationCount !== 1) {
        throw new Error('Should receive notification before unsubscribe');
    }
    
    unsubscribe();
    engine.setGradingMode('color');
    if (notificationCount !== 1) {
        throw new Error('Should not receive notification after unsubscribe');
    }
    
    console.log('✅ All edge cases passed');
}

/**
 * Run all property tests
 */
function runAllTests() {
    try {
        console.log('🚀 Starting Enhanced Grading System Property Tests - Property 2');
        console.log('**Feature: enhanced-grading-system, Property 2: Grading Mode Propagation**');
        console.log('**Validates: Requirements 1.1**\n');
        
        // Test edge cases first
        testPropagationEdgeCases();
        
        // Run main property test
        const result = testGradingModePropagation();
        
        if (result.passed) {
            console.log('\n🎉 All Property 2 tests passed!');
            console.log(`✅ Grading mode propagation works correctly across ${result.totalTests} test cases`);
            return true;
        } else {
            console.log('\n❌ Property 2 tests failed!');
            console.log('Counterexample:', JSON.stringify(result.counterexample, null, 2));
            return false;
        }
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const success = runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = {
    testGradingModePropagation,
    testPropagationEdgeCases,
    runAllTests
};