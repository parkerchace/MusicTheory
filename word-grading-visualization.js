/**
 * @module WordGradingVisualization
 * @description Visual grading impact display for word analysis
 * @feature Shows how grading mode affects word-to-music translation
 * @feature Interactive grading comparison visualization
 * @feature Real-time grading influence indicators
 */

class WordGradingVisualization {
    constructor(musicTheoryEngine, wordEngine) {
        this.musicTheory = musicTheoryEngine;
        this.wordEngine = wordEngine;
        this.currentResult = null;
        this.isVisualizationActive = false;
        
        // Subscribe to grading mode changes
        if (this.musicTheory.subscribe) {
            this.musicTheory.subscribe((event, data) => {
                if (event === 'gradingModeChanged') {
                    this.onGradingModeChanged(data.newMode);
                }
            });
        }
        
        this.initializeVisualization();
    }

    /**
     * Initialize the grading visualization system
     */
    initializeVisualization() {
        this.createGradingVisualizationPanel();
        this.enhanceAnalysisPanel();
        this.addGradingControls();
    }

    /**
     * Create the main grading visualization panel
     */
    createGradingVisualizationPanel() {
        // Create grading visualization toggle button
        const wordAnalysisPanel = document.getElementById('word-analysis-panel');
        if (wordAnalysisPanel) {
            const header = wordAnalysisPanel.querySelector('.panel-header');
            if (header) {
                const gradingToggle = document.createElement('button');
                gradingToggle.id = 'grading-viz-toggle';
                gradingToggle.className = 'btn-icon';
                gradingToggle.title = 'Toggle Grading Visualization';
                gradingToggle.style.cssText = 'font-size: 0.7rem; padding: 2px 8px; margin-right: 8px;';
                gradingToggle.innerHTML = '🎨 Grading';
                gradingToggle.onclick = () => this.toggleGradingVisualization();
                
                // Insert before the close button
                const closeBtn = header.querySelector('button[onclick*="classList.remove"]');
                if (closeBtn) {
                    header.insertBefore(gradingToggle, closeBtn);
                }
            }
        }
    }

    /**
     * Enhance the existing analysis panel with grading visualization
     */
    enhanceAnalysisPanel() {
        // Store original updateAnalysisPanel function
        if (typeof window.updateAnalysisPanel === 'function') {
            this.originalUpdateAnalysisPanel = window.updateAnalysisPanel;
            
            // Override with enhanced version
            window.updateAnalysisPanel = (result) => {
                this.currentResult = result;
                this.originalUpdateAnalysisPanel(result);
                this.addGradingVisualization(result);
            };
        }
    }

    /**
     * Add grading controls to the word input area
     */
    addGradingControls() {
        const wordInputContainer = document.querySelector('.word-input-container');
        if (wordInputContainer) {
            const gradingIndicator = document.createElement('div');
            gradingIndicator.id = 'word-grading-indicator';
            gradingIndicator.className = 'grading-indicator';
            gradingIndicator.innerHTML = this.createGradingIndicatorHTML();
            
            wordInputContainer.appendChild(gradingIndicator);
        }
    }

    /**
     * Create grading indicator HTML
     */
    createGradingIndicatorHTML() {
        const mode = this.musicTheory.gradingMode || 'functional';
        const modeColors = {
            functional: '#3b82f6',
            emotional: '#f59e0b', 
            color: '#10b981'
        };
        
        return `
            <div class="grading-mode-indicator" style="
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-light);
                border-radius: 4px;
                font-size: 0.7rem;
            ">
                <div style="
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: ${modeColors[mode]};
                "></div>
                <span style="color: var(--text-secondary);">
                    ${mode.charAt(0).toUpperCase() + mode.slice(1)} Grading
                </span>
            </div>
        `;
    }

    /**
     * Toggle grading visualization on/off
     */
    toggleGradingVisualization() {
        this.isVisualizationActive = !this.isVisualizationActive;
        
        const toggleBtn = document.getElementById('grading-viz-toggle');
        if (toggleBtn) {
            toggleBtn.style.background = this.isVisualizationActive ? 'var(--accent-primary)' : '';
            toggleBtn.style.color = this.isVisualizationActive ? 'white' : '';
        }
        
        if (this.currentResult) {
            this.addGradingVisualization(this.currentResult);
        }
    }

    /**
     * Add grading visualization to the analysis panel
     */
    addGradingVisualization(result) {
        if (!this.isVisualizationActive || !result) return;
        
        const analysisContent = document.getElementById('word-analysis-content');
        if (!analysisContent) return;
        
        // Create grading visualization section
        const gradingVizHTML = this.createGradingVisualizationHTML(result);
        
        // Find insertion point (after existing content)
        const existingViz = analysisContent.querySelector('.grading-visualization');
        if (existingViz) {
            existingViz.remove();
        }
        
        // Add new visualization
        const vizElement = document.createElement('div');
        vizElement.className = 'grading-visualization';
        vizElement.innerHTML = gradingVizHTML;
        analysisContent.appendChild(vizElement);
    }

    /**
     * Create the main grading visualization HTML
     */
    createGradingVisualizationHTML(result) {
        const currentMode = this.musicTheory.gradingMode || 'functional';
        
        let html = `
            <div class="analysis-section grading-viz-section" style="
                margin-top: 16px;
                padding: 16px;
                background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
                border: 2px solid var(--accent-primary);
                border-radius: 8px;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #3b82f6, #f59e0b, #10b981);
                    opacity: 0.6;
                "></div>
                
                <h3 style="
                    margin: 0 0 16px 0;
                    color: var(--accent-primary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 1rem;
                ">
                    🎨 Grading Impact Visualization
                    <span style="
                        font-size: 0.7rem;
                        background: var(--accent-primary);
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                    ">${currentMode.toUpperCase()}</span>
                </h3>
        `;

        // Add grading mode comparison
        html += this.createModeComparisonHTML(result);
        
        // Add scale selection influence
        html += this.createScaleInfluenceHTML(result);
        
        // Add character analysis impact
        html += this.createCharacterImpactHTML(result);
        
        // Add progression weighting visualization
        html += this.createProgressionWeightingHTML(result);
        
        html += `</div>`;
        
        return html;
    }

    /**
     * Create mode comparison visualization
     */
    createModeComparisonHTML(result) {
        const words = result.words || [];
        if (words.length === 0) return '';
        
        const modes = ['functional', 'emotional', 'color'];
        const currentMode = this.musicTheory.gradingMode;
        
        let html = `
            <div class="grading-comparison" style="margin-bottom: 20px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    ⚖️ Mode Comparison
                    <button onclick="wordGradingViz.showDetailedComparison('${words.join(' ')}')" style="
                        font-size: 0.7rem;
                        padding: 2px 6px;
                        background: var(--bg-primary);
                        border: 1px solid var(--border-light);
                        border-radius: 3px;
                        color: var(--text-secondary);
                        cursor: pointer;
                    ">Details</button>
                </h4>
                
                <div class="mode-comparison-grid" style="
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                ">
        `;
        
        modes.forEach(mode => {
            const isActive = mode === currentMode;
            const modeColors = {
                functional: '#3b82f6',
                emotional: '#f59e0b',
                color: '#10b981'
            };
            
            html += `
                <div class="mode-card" style="
                    padding: 8px;
                    background: ${isActive ? 'var(--bg-accent)' : 'var(--bg-primary)'};
                    border: 2px solid ${isActive ? modeColors[mode] : 'var(--border-light)'};
                    border-radius: 6px;
                    text-align: center;
                    position: relative;
                    ${isActive ? 'box-shadow: 0 0 12px ' + modeColors[mode] + '40;' : ''}
                ">
                    ${isActive ? '<div style="position: absolute; top: -8px; right: -8px; background: ' + modeColors[mode] + '; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem;">✓</div>' : ''}
                    
                    <div style="
                        width: 12px;
                        height: 12px;
                        background: ${modeColors[mode]};
                        border-radius: 50%;
                        margin: 0 auto 4px;
                    "></div>
                    
                    <div style="
                        font-size: 0.7rem;
                        font-weight: ${isActive ? 'bold' : 'normal'};
                        color: ${isActive ? 'var(--text-primary)' : 'var(--text-secondary)'};
                        text-transform: capitalize;
                    ">${mode}</div>
                    
                    <div style="
                        font-size: 0.6rem;
                        color: var(--text-secondary);
                        margin-top: 2px;
                    ">${this.getModeDescription(mode)}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    font-style: italic;
                    text-align: center;
                    padding: 8px;
                    background: var(--bg-primary);
                    border-radius: 4px;
                    border-left: 3px solid var(--accent-primary);
                ">
                    💡 Different modes analyze the same words through different theoretical lenses
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Create scale selection influence visualization
     */
    createScaleInfluenceHTML(result) {
        if (!result.scaleChoice) return '';
        
        const scaleInfo = result.scaleChoice;
        const currentMode = this.musicTheory.gradingMode;
        
        let html = `
            <div class="scale-influence" style="margin-bottom: 20px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎼 Scale Selection Impact
                </h4>
                
                <div class="scale-influence-flow" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 6px;
                    border: 1px solid var(--border-light);
                ">
        `;
        
        // Show the influence flow
        const steps = [
            { label: 'Words', value: result.words?.join(', ') || 'N/A', color: '#6b7280' },
            { label: currentMode.charAt(0).toUpperCase() + currentMode.slice(1) + ' Analysis', value: this.getCharacterSummary(result.character), color: this.getModeColor(currentMode) },
            { label: 'Scale Result', value: `${scaleInfo.root || 'C'} ${scaleInfo.mode || 'major'}`, color: '#10b981' }
        ];
        
        steps.forEach((step, index) => {
            html += `
                <div class="influence-step" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    min-width: 80px;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: ${step.color};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                        font-size: 0.8rem;
                    ">${index + 1}</div>
                    
                    <div style="
                        font-size: 0.7rem;
                        font-weight: bold;
                        color: var(--text-primary);
                        text-align: center;
                    ">${step.label}</div>
                    
                    <div style="
                        font-size: 0.6rem;
                        color: var(--text-secondary);
                        text-align: center;
                        max-width: 100px;
                        word-wrap: break-word;
                    ">${step.value}</div>
                </div>
            `;
            
            if (index < steps.length - 1) {
                html += `
                    <div style="
                        font-size: 1.2rem;
                        color: var(--text-secondary);
                    ">→</div>
                `;
            }
        });
        
        html += `
                </div>
                
                <div style="
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    border-left: 3px solid ${this.getModeColor(currentMode)};
                ">
                    <strong>${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Influence:</strong> 
                    ${this.getScaleInfluenceExplanation(currentMode, result)}
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Create character analysis impact visualization
     */
    createCharacterImpactHTML(result) {
        if (!result.character) return '';
        
        const character = result.character;
        const currentMode = this.musicTheory.gradingMode;
        
        let html = `
            <div class="character-impact" style="margin-bottom: 20px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎭 Character Analysis Impact
                </h4>
                
                <div class="character-radar" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 6px;
                    border: 1px solid var(--border-light);
                ">
        `;
        
        // Show character attributes with grading influence
        const attributes = [
            { key: 'brightness', label: 'Brightness', icon: '☀️' },
            { key: 'energy', label: 'Energy', icon: '⚡' },
            { key: 'complexity', label: 'Complexity', icon: '🧩' },
            { key: 'tension', label: 'Tension', icon: '🎯' },
            { key: 'warmth', label: 'Warmth', icon: '🔥' },
            { key: 'stability', label: 'Stability', icon: '⚖️' }
        ];
        
        attributes.forEach(attr => {
            const value = character[attr.key] || 0.5;
            const gradingAdjusted = this.getGradingAdjustedValue(attr.key, value, currentMode);
            const change = gradingAdjusted - value;
            
            html += `
                <div class="character-attribute" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                ">
                    <div style="font-size: 1.2rem;">${attr.icon}</div>
                    <div style="
                        font-size: 0.7rem;
                        font-weight: bold;
                        color: var(--text-primary);
                        text-align: center;
                    ">${attr.label}</div>
                    
                    <div class="value-bar" style="
                        width: 60px;
                        height: 8px;
                        background: var(--bg-primary);
                        border-radius: 4px;
                        position: relative;
                        border: 1px solid var(--border-light);
                    ">
                        <div style="
                            width: ${Math.max(0, Math.min(100, gradingAdjusted * 100))}%;
                            height: 100%;
                            background: ${this.getModeColor(currentMode)};
                            border-radius: 3px;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    
                    <div style="
                        font-size: 0.6rem;
                        color: ${change > 0 ? '#10b981' : change < 0 ? '#ef4444' : 'var(--text-secondary)'};
                        font-weight: bold;
                    ">
                        ${change > 0 ? '+' : ''}${Math.round(change * 100)}%
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    border-left: 3px solid ${this.getModeColor(currentMode)};
                ">
                    <strong>Grading Adjustments:</strong> 
                    ${this.getCharacterAdjustmentExplanation(currentMode, character)}
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Create progression weighting visualization
     */
    createProgressionWeightingHTML(result) {
        if (!result.progression || !result.progression.chords) return '';
        
        const progression = result.progression.chords;
        const currentMode = this.musicTheory.gradingMode;
        
        let html = `
            <div class="progression-weighting" style="margin-bottom: 20px;">
                <h4 style="
                    margin: 0 0 12px 0;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    🎵 Progression Grading Weights
                </h4>
                
                <div class="progression-viz" style="
                    display: flex;
                    gap: 8px;
                    padding: 12px;
                    background: var(--bg-primary);
                    border-radius: 6px;
                    border: 1px solid var(--border-light);
                    flex-wrap: wrap;
                    justify-content: center;
                ">
        `;
        
        progression.forEach((chord, index) => {
            const tier = this.musicTheory.calculateElementGrade(chord, {
                elementType: 'chord',
                key: result.scaleChoice?.root || 'C',
                scaleType: result.scaleChoice?.mode || 'major'
            });
            
            const tierInfo = this.musicTheory.getGradingTierInfo(tier);
            
            html += `
                <div class="chord-weight" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border: 2px solid ${tierInfo.color};
                    border-radius: 6px;
                    min-width: 60px;
                    position: relative;
                ">
                    <div style="
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: ${tierInfo.color};
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        font-weight: bold;
                    ">${tier}</div>
                    
                    <div style="
                        font-size: 0.8rem;
                        font-weight: bold;
                        color: var(--text-primary);
                    ">${chord}</div>
                    
                    <div style="
                        font-size: 0.6rem;
                        color: ${tierInfo.color};
                        font-weight: bold;
                        text-align: center;
                    ">${tierInfo.short}</div>
                    
                    <div style="
                        font-size: 0.6rem;
                        color: var(--text-secondary);
                        text-align: center;
                    ">${tierInfo.name}</div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    border-left: 3px solid ${this.getModeColor(currentMode)};
                ">
                    <strong>Grading Impact:</strong> 
                    Higher-tier chords (${currentMode} perspective) are weighted more heavily in the progression.
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Handle grading mode changes
     */
    onGradingModeChanged(newMode) {
        // Update grading indicator
        const indicator = document.getElementById('word-grading-indicator');
        if (indicator) {
            indicator.innerHTML = this.createGradingIndicatorHTML();
        }
        
        // Refresh visualization if active
        if (this.isVisualizationActive && this.currentResult) {
            this.addGradingVisualization(this.currentResult);
        }
    }

    /**
     * Show detailed comparison modal
     */
    showDetailedComparison(words) {
        // Create and show detailed comparison modal
        const modal = document.createElement('div');
        modal.className = 'grading-comparison-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: var(--bg-primary);
                border: 1px solid var(--border-light);
                border-radius: 8px;
                padding: 20px;
                max-width: 80%;
                max-height: 80%;
                overflow-y: auto;
            ">
                <h3 style="margin: 0 0 16px 0; color: var(--text-primary);">
                    Detailed Grading Comparison: "${words}"
                </h3>
                <div id="detailed-comparison-content">
                    Loading comparison...
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-top: 16px;
                    padding: 8px 16px;
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Generate detailed comparison
        this.generateDetailedComparison(words, modal.querySelector('#detailed-comparison-content'));
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * Generate detailed comparison content
     */
    async generateDetailedComparison(words, container) {
        const modes = ['functional', 'emotional', 'color'];
        const originalMode = this.musicTheory.gradingMode;
        const results = {};
        
        // Generate results for each mode
        for (const mode of modes) {
            this.musicTheory.setGradingMode(mode);
            try {
                results[mode] = await this.wordEngine.translateWords(words);
            } catch (error) {
                results[mode] = { error: error.message };
            }
        }
        
        // Restore original mode
        this.musicTheory.setGradingMode(originalMode);
        
        // Generate comparison HTML
        let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">';
        
        modes.forEach(mode => {
            const result = results[mode];
            const isActive = mode === originalMode;
            
            html += `
                <div style="
                    padding: 16px;
                    background: ${isActive ? 'var(--bg-accent)' : 'var(--bg-secondary)'};
                    border: 2px solid ${isActive ? this.getModeColor(mode) : 'var(--border-light)'};
                    border-radius: 8px;
                ">
                    <h4 style="
                        margin: 0 0 12px 0;
                        color: ${this.getModeColor(mode)};
                        text-transform: capitalize;
                    ">${mode} Mode ${isActive ? '(Current)' : ''}</h4>
                    
                    ${result.error ? 
                        `<div style="color: #ef4444;">Error: ${result.error}</div>` :
                        `
                        <div style="margin-bottom: 8px;">
                            <strong>Scale:</strong> ${result.scaleChoice?.root || 'N/A'} ${result.scaleChoice?.mode || 'N/A'}
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Character:</strong> ${this.getCharacterSummary(result.character)}
                        </div>
                        <div>
                            <strong>Progression:</strong> ${result.progression?.chords?.join(' - ') || 'N/A'}
                        </div>
                        `
                    }
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // Helper methods
    getModeColor(mode) {
        const colors = {
            functional: '#3b82f6',
            emotional: '#f59e0b',
            color: '#10b981'
        };
        return colors[mode] || '#6b7280';
    }

    getModeDescription(mode) {
        const descriptions = {
            functional: 'Harmonic Function',
            emotional: 'Emotional Character',
            color: 'Timbral Quality'
        };
        return descriptions[mode] || 'Analysis';
    }

    getCharacterSummary(character) {
        if (!character) return 'N/A';
        
        const traits = [];
        if (character.brightness > 0.6) traits.push('bright');
        if (character.energy > 0.6) traits.push('energetic');
        if (character.complexity > 0.6) traits.push('complex');
        if (character.warmth > 0.6) traits.push('warm');
        
        return traits.length > 0 ? traits.join(', ') : 'neutral';
    }

    getGradingAdjustedValue(attribute, baseValue, mode) {
        // Simulate grading mode influence on character attributes
        const adjustments = {
            functional: {
                stability: 0.1,
                complexity: -0.05
            },
            emotional: {
                brightness: 0.1,
                warmth: 0.1,
                energy: 0.05
            },
            color: {
                complexity: 0.15,
                brightness: 0.05
            }
        };
        
        const modeAdjustments = adjustments[mode] || {};
        const adjustment = modeAdjustments[attribute] || 0;
        
        return Math.max(0, Math.min(1, baseValue + adjustment));
    }

    getScaleInfluenceExplanation(mode, result) {
        const explanations = {
            functional: 'Prioritizes scales with strong tonal centers and clear harmonic functions',
            emotional: 'Selects scales based on their emotional character and psychological impact',
            color: 'Chooses scales for their timbral richness and harmonic complexity'
        };
        
        return explanations[mode] || 'Influences scale selection based on theoretical perspective';
    }

    getCharacterAdjustmentExplanation(mode, character) {
        const explanations = {
            functional: 'Emphasizes stability and harmonic clarity over complexity',
            emotional: 'Enhances brightness, warmth, and emotional expressiveness',
            color: 'Increases complexity and harmonic richness for timbral variety'
        };
        
        return explanations[mode] || 'Adjusts character analysis based on grading perspective';
    }
}

// CSS styles for the word grading visualization
const wordGradingVisualizationStyles = `
<style>
.grading-indicator {
    margin-left: 8px;
}

.grading-visualization {
    animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.grading-viz-section {
    border-left: 4px solid var(--accent-primary) !important;
}

.mode-card {
    transition: all 0.2s ease;
    cursor: pointer;
}

.mode-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.influence-step {
    transition: all 0.2s ease;
}

.influence-step:hover {
    transform: scale(1.05);
}

.character-attribute {
    transition: all 0.2s ease;
}

.character-attribute:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chord-weight {
    transition: all 0.2s ease;
}

.chord-weight:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.value-bar {
    overflow: hidden;
}

.grading-comparison-modal {
    backdrop-filter: blur(4px);
}

@media (max-width: 768px) {
    .mode-comparison-grid {
        grid-template-columns: 1fr !important;
    }
    
    .scale-influence-flow {
        flex-direction: column !important;
    }
    
    .character-radar {
        grid-template-columns: repeat(2, 1fr) !important;
    }
    
    .progression-viz {
        justify-content: flex-start !important;
    }
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', wordGradingVisualizationStyles);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordGradingVisualization;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.WordGradingVisualization = WordGradingVisualization;
}