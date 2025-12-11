# Enhanced Grading System Design Document

## Overview

The Enhanced Grading System transforms the current limited grading view into a central, influential component that affects visualization, analysis, and user interaction across all modules. This design establishes grading as a core architectural principle that provides consistent visual feedback, influences algorithmic decisions, and enhances educational value throughout the music theory application.

The system extends the existing three grading perspectives (Functional, Emotional, Color) to become active participants in module behavior rather than passive visual indicators. Each module will subscribe to grading changes and adapt its functionality accordingly, creating a cohesive user experience where the chosen theoretical perspective influences every aspect of musical exploration.

## Architecture

### Core Components

1. **Enhanced Grading Engine**: Extended MusicTheoryEngine with advanced grading capabilities
2. **Grading Event System**: Centralized event broadcasting for grading changes
3. **Module Integration Layer**: Standardized interface for modules to consume grading information
4. **Visual Consistency Manager**: Ensures uniform grading representation across modules
5. **Educational Context Provider**: Supplies explanatory content for grading decisions

### Data Flow

```
User Changes Grading Mode
    ↓
Enhanced Grading Engine
    ↓
Grading Event System (broadcasts change)
    ↓
All Subscribed Modules
    ↓
Module Integration Layer (processes grading data)
    ↓
Visual Consistency Manager (applies uniform styling)
    ↓
Updated Module Display
```

### Integration Points

- **Piano Visualizer**: Key coloring, highlighting patterns, interaction feedback
- **Scale Intelligence**: Scale scoring, suggestion ordering, educational tooltips
- **Word Tool**: Emotional mapping, scale selection weighting, analysis explanations
- **Container Chord Tool**: Result sorting, grading indicators, suggestion filtering
- **Progression Builder**: Chord weighting, suggestion algorithms, visual feedback
- **Unified Chord Explorer**: Substitution grading, radial menu ordering, color coding

## Components and Interfaces

### Enhanced Grading Engine

```javascript
class EnhancedGradingEngine extends MusicTheoryEngine {
    // Core grading functionality
    setGradingMode(mode, options = {})
    getGradingTierInfo(tier, context = {})
    calculateElementGrade(element, context)
    
    // Advanced grading features
    getGradingExplanation(element, tier, context)
    suggestAlternatives(element, targetTier, context)
    compareGradingPerspectives(element, context)
    
    // Educational features
    getEducationalContext(tier, mode)
    explainGradingRationale(element, context)
    
    // Accessibility features
    getAccessibleGradingInfo(tier, options)
    getAudioGradingCues(tier)
}
```

### Module Integration Interface

```javascript
class GradingAwareModule {
    constructor(gradingEngine) {
        this.gradingEngine = gradingEngine;
        this.subscribeToGradingChanges();
    }
    
    // Required methods for grading integration
    onGradingModeChanged(newMode, oldMode)
    applyGradingToElement(element, tier, context)
    updateVisualGrading()
    
    // Optional methods for enhanced integration
    getGradingInfluencedSuggestions(context)
    explainGradingImpact(element)
    provideGradingAlternatives(element)
}
```

### Visual Consistency Manager

```javascript
class VisualConsistencyManager {
    // Standardized visual application
    applyGradingColors(element, tier, mode)
    generateAccessiblePatterns(tier, mode)
    createGradingTooltip(element, tier, context)
    
    // Cross-module consistency
    ensureColorConsistency(modules)
    validateAccessibilityCompliance(gradingDisplay)
    generateUnifiedLegend(mode, context)
}
```

## Data Models

### Enhanced Grading Information

```javascript
{
    tier: number,           // 0-4 grading tier
    mode: string,           // 'functional' | 'emotional' | 'color'
    label: string,          // Display label
    color: string,          // Primary color
    shortLabel: string,     // Abbreviated label
    name: string,           // Tier name
    description: string,    // Tier description
    
    // Enhanced properties
    explanation: string,    // Why this grade was assigned
    alternatives: Array,    // Suggested alternatives
    educationalContext: string, // Educational explanation
    accessibilityInfo: {
        pattern: string,    // Visual pattern for accessibility
        audioCue: string,   // Audio description
        screenReaderText: string // Screen reader announcement
    },
    
    // Context-specific information
    contextualRelevance: number, // 0-1 relevance in current context
    theoreticalBasis: string,    // Theoretical justification
    suggestedActions: Array      // Recommended user actions
}
```

### Module Grading State

```javascript
{
    moduleId: string,
    currentMode: string,
    gradingInfluence: {
        visualWeight: number,     // How much grading affects visuals (0-1)
        behavioralWeight: number, // How much grading affects behavior (0-1)
        suggestionWeight: number  // How much grading affects suggestions (0-1)
    },
    lastUpdate: timestamp,
    activeElements: Map,          // element -> grading info
    pendingUpdates: Array
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cross-Module Visual Consistency
*For any* musical element displayed in multiple modules simultaneously, all modules should use identical grading colors and visual indicators for the same grading tier
**Validates: Requirements 1.2, 1.3**

### Property 2: Grading Mode Propagation
*For any* grading mode change, all subscribed modules should receive the change notification and update their displays within the specified time limit
**Validates: Requirements 1.1**

### Property 3: Grading-Influenced Suggestions
*For any* module that provides suggestions, higher-tier elements according to the current grading mode should appear more frequently or be prioritized in the results
**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: Educational Context Completeness
*For any* grading tier display, the system should provide educational descriptions and explanatory content appropriate to the current grading mode
**Validates: Requirements 3.1, 3.3**

### Property 5: Accessibility Information Inclusion
*For any* grading display, the system should provide text labels, visual patterns, and screen reader compatible information in addition to color coding
**Validates: Requirements 5.1, 5.2, 5.4**

### Property 6: Interactive Grading Feedback
*For any* user interaction with graded elements, the system should provide grading-aware feedback and highlight related elements according to their grading tier relationships
**Validates: Requirements 4.1, 4.3**

### Property 7: Grading Explanation Availability
*For any* graded element, the system should be able to provide an explanation of why that specific grade was assigned in the current grading mode
**Validates: Requirements 2.5, 3.5**

### Property 8: Alternative Suggestion Generation
*For any* element with a low grading tier (0-1), the system should be able to suggest alternatives with higher grading tiers in the same context
**Validates: Requirements 3.4**

### Property 9: Metadata Preservation
*For any* export or sharing operation, grading information should be preserved in the output metadata where the format supports it
**Validates: Requirements 4.5**

### Property 10: High Contrast Accessibility
*For any* grading display in high contrast mode, all grading tiers should remain visually distinguishable through non-color means
**Validates: Requirements 5.5**

## Error Handling

### Grading Calculation Errors
- **Invalid Context**: When grading context is incomplete, use default functional grading with warning
- **Missing Scale Information**: Fall back to chromatic grading with educational explanation
- **Conflicting Grading Modes**: Prioritize user-selected mode, log conflicts for analysis

### Module Integration Errors
- **Subscription Failures**: Implement retry mechanism with exponential backoff
- **Update Propagation Failures**: Queue updates and retry, maintain consistency logs
- **Visual Rendering Errors**: Fall back to basic color scheme, maintain functionality

### Accessibility Errors
- **Screen Reader Failures**: Provide alternative text descriptions, log accessibility issues
- **High Contrast Failures**: Ensure pattern-based fallbacks are available
- **Audio Cue Failures**: Provide visual alternatives, maintain silent operation mode

## Testing Strategy

### Unit Testing Approach
Unit tests will verify specific grading calculations, individual module integrations, and accessibility feature implementations. Key areas include:

- Grading tier calculations for various musical contexts
- Color consistency across different grading modes
- Educational content generation for each grading perspective
- Accessibility feature functionality (screen reader text, high contrast patterns)
- Error handling for edge cases and invalid inputs

### Property-Based Testing Approach
Property-based tests will verify universal behaviors across all valid inputs using **fast-check** library. Each test will run a minimum of 100 iterations to ensure comprehensive coverage. Tests will be tagged with comments referencing the specific correctness property from the design document using the format: **Feature: enhanced-grading-system, Property {number}: {property_text}**

Property tests will generate:
- Random musical elements (notes, chords, scales) to verify consistent grading
- Various grading mode combinations to test cross-module consistency
- Different accessibility scenarios to ensure compliance
- Multiple user interaction patterns to verify grading-aware feedback
- Various export formats to test metadata preservation

The dual testing approach ensures both concrete functionality (unit tests) and general correctness across all possible inputs (property tests), providing comprehensive validation of the enhanced grading system.