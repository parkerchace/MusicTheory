/**
 * @module GradingLegendHelpSystem
 * @description Comprehensive grading legend and help system for enhanced grading
 * @feature Dynamic grading legend that updates with mode changes
 * @feature Contextual help for grading explanations
 * @feature Grading comparison views between different modes
 * @feature Educational tooltips for all grading displays
 */

class GradingLegendHelpSystem {
    constructor(musicTheoryEngine) {
        this.musicTheory = musicTheoryEngine;
        this.currentMode = this.musicTheory.gradingMode || 'functional';
        this.isHelpPanelOpen = false;
        this.comparisonElement = null;
        this.tooltipElement = null;
        
        // Subscribe to grading mode changes
        if (this.musicTheory.subscribe) {
            this.musicTheory.subscribe((event, data) => {
                if (event === 'gradingModeChanged') {
                    this.currentMode = data.newMode;
                    this.updateAllLegends();
                    this.updateHelpContent();
                }
            });
        }
        
        this.initializeSystem();
    }

    /**
     * Initialize the complete grading legend and help system
     */
    initializeSystem() {
        this.createHelpPanel();
        this.createComparisonModal();
        this.createTooltipSystem();
        this.enhanceExistingLegends();
        this.addHelpButtons();
    }

    /**
     * Create the main help panel for grading explanations
     */
    createHelpPanel() {
        // Create help panel container
        const helpPanel = document.createElement('div');
        helpPanel.id = 'grading-help-panel';
        helpPanel.className = 'grading-help-panel';
        helpPanel.innerHTML = `
            <div class="help-panel-header">
                <h3>Grading System Help</h3>
                <button class="help-close-btn" onclick="gradingHelpSystem.toggleHelpPanel()">×</button>
            </div>
            <div class="help-panel-content">
                <div class="help-tabs">
                    <button class="help-tab active" data-tab="overview">Overview</button>
                    <button class="help-tab" data-tab="modes">Modes</button>
                    <button class="help-tab" data-tab="comparison">Compare</button>
                    <button class="help-tab" data-tab="accessibility">Accessibility</button>
                </div>
                <div class="help-content">
                    <div id="help-overview" class="help-section active">
                        ${this.getOverviewContent()}
                    </div>
                    <div id="help-modes" class="help-section">
                        ${this.getModesContent()}
                    </div>
                    <div id="help-comparison" class="help-section">
                        ${this.getComparisonContent()}
                    </div>
                    <div id="help-accessibility" class="help-section">
                        ${this.getAccessibilityContent()}
                    </div>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(helpPanel);

        // Add tab switching functionality
        helpPanel.querySelectorAll('.help-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchHelpTab(tabName);
            });
        });
    }

    /**
     * Create comparison modal for different grading modes
     */
    createComparisonModal() {
        const modal = document.createElement('div');
        modal.id = 'grading-comparison-modal';
        modal.className = 'grading-comparison-modal';
        modal.innerHTML = `
            <div class="comparison-modal-content">
                <div class="comparison-header">
                    <h3>Grading Mode Comparison</h3>
                    <button class="comparison-close-btn" onclick="gradingHelpSystem.closeComparison()">×</button>
                </div>
                <div class="comparison-input">
                    <label>Element to compare:</label>
                    <select id="comparison-element-type">
                        <option value="note">Note</option>
                        <option value="chord">Chord</option>
                        <option value="scale">Scale</option>
                    </select>
                    <input type="text" id="comparison-element-value" placeholder="Enter element (e.g., C, Cmaj7, major)">
                    <button onclick="gradingHelpSystem.performComparison()">Compare</button>
                </div>
                <div id="comparison-results" class="comparison-results">
                    <!-- Results will be populated here -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeComparison();
            }
        });
    }

    /**
     * Create tooltip system for educational explanations
     */
    createTooltipSystem() {
        // Create tooltip element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'grading-tooltip';
        this.tooltipElement.className = 'grading-tooltip';
        document.body.appendChild(this.tooltipElement);

        // Add global event listeners for tooltip triggers
        document.addEventListener('mouseover', (e) => {
            if (e.target.hasAttribute('data-grading-tooltip')) {
                this.showTooltip(e.target, e.target.getAttribute('data-grading-tooltip'));
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.hasAttribute('data-grading-tooltip')) {
                this.hideTooltip();
            }
        });
    }

    /**
     * Enhance existing legends with help functionality
     */
    enhanceExistingLegends() {
        // Enhance header legend
        const headerLegend = document.getElementById('grading-key-legend');
        if (headerLegend) {
            this.enhanceLegendElement(headerLegend, 'header');
        }

        // Enhance sidebar legend
        const sidebarLegend = document.getElementById('grading-key-sidebar');
        if (sidebarLegend) {
            this.enhanceLegendElement(sidebarLegend, 'sidebar');
        }
    }

    /**
     * Add help buttons to various UI elements
     */
    addHelpButtons() {
        // Add help button to grading mode selector
        const gradingSelector = document.getElementById('grading-mode');
        if (gradingSelector && gradingSelector.parentNode) {
            const helpBtn = document.createElement('button');
            helpBtn.className = 'grading-help-btn';
            helpBtn.innerHTML = '?';
            helpBtn.title = 'Grading System Help';
            helpBtn.onclick = () => this.toggleHelpPanel();
            gradingSelector.parentNode.appendChild(helpBtn);
        }

        // Add comparison button to header legend
        const headerLegend = document.getElementById('grading-key-legend');
        if (headerLegend) {
            const compareBtn = document.createElement('button');
            compareBtn.className = 'grading-compare-btn';
            compareBtn.innerHTML = '⚖️';
            compareBtn.title = 'Compare Grading Modes';
            compareBtn.onclick = () => this.showComparison();
            headerLegend.appendChild(compareBtn);
        }
    }

    /**
     * Update all legends when grading mode changes
     */
    updateAllLegends() {
        this.updateHeaderLegend();
        this.updateSidebarLegend();
        this.updateHelpContent();
    }

    /**
     * Update the header legend with current mode
     */
    updateHeaderLegend() {
        const legend = document.getElementById('grading-key-legend');
        if (!legend || !this.musicTheory) return;

        const tiers = [4, 3, 2, 1, 0];
        const items = tiers.map(t => {
            const info = this.musicTheory.getGradingTierInfo(t);
            return `<div class="legend-tier-item" data-grading-tooltip="${this.getTierTooltipContent(t, info)}">
                <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <div style="width:12px; height:12px; background:${info.color}; border-radius:2px;"></div>
                        <span style="color:${info.color}; font-weight:600;">${info.short}</span>
                    </div>
                    <span style="font-size:0.65rem; color:${info.color}; opacity:0.8; white-space:nowrap;">${info.name}</span>
                </div>
            </div>`;
        });

        // Add mode indicator and help button
        const modeIndicator = `<div class="legend-mode-indicator">
            <span style="font-size:0.6rem; color:var(--text-secondary); text-transform:uppercase;">${this.currentMode}</span>
        </div>`;

        legend.innerHTML = items.join('') + modeIndicator;
    }

    /**
     * Update the sidebar legend with enhanced content
     */
    updateSidebarLegend() {
        const sidebar = document.getElementById('grading-key-sidebar');
        if (!sidebar || !this.musicTheory) return;

        const mode = this.musicTheory.gradingMode || 'functional';
        const tiers = [4, 3, 2, 1, 0];
        const items = tiers.map(t => {
            const info = this.musicTheory.getGradingTierInfo(t);
            const educational = this.musicTheory.getEducationalContext(t, mode);
            
            return `<div class="sidebar-tier-item" data-grading-tooltip="${this.getTierTooltipContent(t, info)}">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <div style="width:16px; height:16px; background:${info.color}; border-radius:3px; flex-shrink:0;"></div>
                    <span style="color:${info.color}; font-weight:bold; font-size:0.9rem;">${info.short} ${info.name}</span>
                </div>
                <div style="font-size:0.75rem; opacity:0.7; margin-left:22px; margin-bottom:4px;">${info.desc}</div>
                <div style="font-size:0.7rem; opacity:0.6; margin-left:22px; font-style:italic;">${educational}</div>
            </div>`;
        });

        const modeDescription = this.getModeDescription(mode);
        
        sidebar.innerHTML = `
            <div style="padding:12px;">
                <div style="margin-bottom:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; font-size:0.75rem; color:var(--text-secondary);">
                    Grading: ${mode}
                </div>
                <div style="margin-bottom:16px; font-size:0.7rem; opacity:0.8; line-height:1.3;">
                    ${modeDescription}
                </div>
                ${items.join('')}
                <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border-light);">
                    <button class="sidebar-help-btn" onclick="gradingHelpSystem.toggleHelpPanel()">
                        📚 Learn More
                    </button>
                    <button class="sidebar-compare-btn" onclick="gradingHelpSystem.showComparison()">
                        ⚖️ Compare Modes
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get tooltip content for a grading tier
     */
    getTierTooltipContent(tier, info) {
        const educational = this.musicTheory.getEducationalContext(tier, this.currentMode);
        const theoretical = this.musicTheory.getTheoreticalBasis(tier, this.currentMode, {});
        
        return `<strong>${info.name} (Tier ${tier})</strong><br>
                ${info.desc}<br><br>
                <em>Educational Context:</em><br>
                ${educational}<br><br>
                <em>Theoretical Basis:</em><br>
                ${theoretical}`;
    }

    /**
     * Show tooltip with educational content
     */
    showTooltip(element, content) {
        if (!this.tooltipElement) return;

        this.tooltipElement.innerHTML = content;
        this.tooltipElement.style.display = 'block';

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;

        // Adjust if tooltip goes off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }

        this.tooltipElement.style.left = left + 'px';
        this.tooltipElement.style.top = top + 'px';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
    }

    /**
     * Toggle help panel visibility
     */
    toggleHelpPanel() {
        const panel = document.getElementById('grading-help-panel');
        if (!panel) return;

        this.isHelpPanelOpen = !this.isHelpPanelOpen;
        panel.style.display = this.isHelpPanelOpen ? 'block' : 'none';
        
        if (this.isHelpPanelOpen) {
            this.updateHelpContent();
        }
    }

    /**
     * Switch help panel tab
     */
    switchHelpTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content sections
        document.querySelectorAll('.help-section').forEach(section => {
            section.classList.toggle('active', section.id === `help-${tabName}`);
        });
    }

    /**
     * Show comparison modal
     */
    showComparison() {
        const modal = document.getElementById('grading-comparison-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Close comparison modal
     */
    closeComparison() {
        const modal = document.getElementById('grading-comparison-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Perform grading comparison across modes
     */
    performComparison() {
        const elementType = document.getElementById('comparison-element-type').value;
        const elementValue = document.getElementById('comparison-element-value').value.trim();
        const resultsDiv = document.getElementById('comparison-results');

        if (!elementValue) {
            resultsDiv.innerHTML = '<p style="color: #ef4444;">Please enter an element to compare.</p>';
            return;
        }

        try {
            const context = {
                elementType: elementType,
                key: 'C',
                scaleType: 'major'
            };

            const perspectives = this.musicTheory.compareGradingPerspectives(elementValue, context);
            
            let html = `<h4>Comparison Results for "${elementValue}"</h4>`;
            html += '<div class="comparison-grid">';

            Object.entries(perspectives).forEach(([mode, data]) => {
                const isCurrentMode = mode === this.currentMode;
                html += `
                    <div class="comparison-mode ${isCurrentMode ? 'current-mode' : ''}">
                        <h5>${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode ${isCurrentMode ? '(Current)' : ''}</h5>
                        <div class="comparison-tier">
                            <span class="tier-indicator" style="background: ${data.info.color};">${data.info.short}</span>
                            <span class="tier-name">${data.info.name} (Tier ${data.tier})</span>
                        </div>
                        <div class="comparison-explanation">
                            ${data.explanation}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            resultsDiv.innerHTML = html;

        } catch (error) {
            resultsDiv.innerHTML = `<p style="color: #ef4444;">Error performing comparison: ${error.message}</p>`;
        }
    }

    /**
     * Update help content based on current mode
     */
    updateHelpContent() {
        const overviewSection = document.getElementById('help-overview');
        const modesSection = document.getElementById('help-modes');
        
        if (overviewSection) {
            overviewSection.innerHTML = this.getOverviewContent();
        }
        if (modesSection) {
            modesSection.innerHTML = this.getModesContent();
        }
    }

    /**
     * Get overview content for help panel
     */
    getOverviewContent() {
        return `
            <h4>What is the Grading System?</h4>
            <p>The grading system provides visual and analytical perspectives on musical elements, helping you understand their role and character within different theoretical frameworks.</p>
            
            <h4>Current Mode: ${this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1)}</h4>
            <p>${this.getModeDescription(this.currentMode)}</p>
            
            <h4>How Grading Works</h4>
            <ul>
                <li><strong>Tier 4 (Perfect/Radiant/Bright):</strong> Primary structural elements</li>
                <li><strong>Tier 3 (Excellent/Bright/Warm):</strong> Important supporting elements</li>
                <li><strong>Tier 2 (Good/Neutral/Natural):</strong> Stable, foundational elements</li>
                <li><strong>Tier 1 (Fair/Melancholy/Rich):</strong> Color tones and extensions</li>
                <li><strong>Tier 0 (Experimental/Somber/Deep):</strong> Tension and experimental elements</li>
            </ul>
            
            <h4>Visual Indicators</h4>
            <p>Each tier has distinct colors, symbols, and patterns to ensure accessibility. Hover over any graded element to see detailed explanations.</p>
        `;
    }

    /**
     * Get modes content for help panel
     */
    getModesContent() {
        return `
            <h4>Grading Modes</h4>
            
            <div class="mode-section">
                <h5>🎯 Functional Mode</h5>
                <p>Evaluates elements based on their harmonic function and role in tonal music. Perfect grades go to tonic and dominant functions, while experimental grades indicate strong dissonance requiring resolution.</p>
            </div>
            
            <div class="mode-section">
                <h5>😊 Emotional Mode</h5>
                <p>Grades elements by their emotional character and psychological impact. Radiant grades create joy and brightness, while somber grades evoke sadness and introspection.</p>
            </div>
            
            <div class="mode-section">
                <h5>🎨 Color Mode</h5>
                <p>Focuses on harmonic richness and timbral qualities. Bright grades indicate luminous, complex harmonies, while deep grades provide mysterious, contemplative colors.</p>
            </div>
            
            <h4>Switching Modes</h4>
            <p>Use the grading mode selector in the header to switch between perspectives. All modules will update their displays to reflect the new grading mode, and you can compare how the same element is graded differently across modes.</p>
        `;
    }

    /**
     * Get comparison content for help panel
     */
    getComparisonContent() {
        return `
            <h4>Comparing Grading Modes</h4>
            <p>The same musical element can receive different grades depending on the perspective. Use the comparison tool to see how elements are evaluated across all three modes.</p>
            
            <h4>Example Comparisons</h4>
            <div class="example-comparison">
                <h5>Note: F# in C Major</h5>
                <ul>
                    <li><strong>Functional:</strong> Fair (chromatic leading tone)</li>
                    <li><strong>Emotional:</strong> Bright (creates tension and resolution)</li>
                    <li><strong>Color:</strong> Warm (adds harmonic complexity)</li>
                </ul>
            </div>
            
            <div class="example-comparison">
                <h5>Chord: Cmaj7</h5>
                <ul>
                    <li><strong>Functional:</strong> Perfect (tonic with extension)</li>
                    <li><strong>Emotional:</strong> Radiant (dreamy, uplifting quality)</li>
                    <li><strong>Color:</strong> Bright (rich harmonic content)</li>
                </ul>
            </div>
            
            <p>Click "Compare Modes" to analyze any element across all three perspectives.</p>
        `;
    }

    /**
     * Get accessibility content for help panel
     */
    getAccessibilityContent() {
        return `
            <h4>Accessibility Features</h4>
            
            <h5>Visual Accessibility</h5>
            <ul>
                <li><strong>High Contrast Colors:</strong> All tiers use colors with 4.5:1+ contrast ratios</li>
                <li><strong>Multiple Visual Cues:</strong> Colors, symbols, and text labels work together</li>
                <li><strong>Pattern Differentiation:</strong> Each tier has distinct visual patterns beyond color</li>
            </ul>
            
            <h5>Screen Reader Support</h5>
            <ul>
                <li><strong>Descriptive Labels:</strong> All grading elements include screen reader text</li>
                <li><strong>Structured Navigation:</strong> Proper heading hierarchy and landmarks</li>
                <li><strong>Status Announcements:</strong> Mode changes are announced to assistive technology</li>
            </ul>
            
            <h5>Keyboard Navigation</h5>
            <ul>
                <li><strong>Tab Navigation:</strong> All interactive elements are keyboard accessible</li>
                <li><strong>Shortcut Keys:</strong> Quick access to grading functions</li>
                <li><strong>Focus Indicators:</strong> Clear visual focus for keyboard users</li>
            </ul>
            
            <h5>Audio Cues</h5>
            <p>When available, grading tiers influence audio characteristics to provide non-visual feedback about element quality and character.</p>
        `;
    }

    /**
     * Get description for a grading mode
     */
    getModeDescription(mode) {
        const descriptions = {
            functional: 'Evaluates elements based on their harmonic function and role in tonal music theory. Emphasizes structural relationships and voice leading principles.',
            emotional: 'Grades elements by their emotional character and psychological impact. Focuses on the feelings and moods that different intervals and harmonies evoke.',
            color: 'Assesses harmonic richness and timbral qualities. Emphasizes the acoustic brightness, warmth, and complexity of musical elements.'
        };
        
        return descriptions[mode] || 'Provides analytical perspective on musical elements.';
    }

    /**
     * Enhance a legend element with interactive features
     */
    enhanceLegendElement(element, type) {
        // Add CSS class for styling
        element.classList.add('enhanced-grading-legend');
        element.setAttribute('data-legend-type', type);
        
        // Add accessibility attributes
        element.setAttribute('role', 'region');
        element.setAttribute('aria-label', `Grading legend for ${this.currentMode} mode`);
    }
}

// CSS styles for the grading legend and help system
const gradingHelpStyles = `
<style>
.grading-help-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: none;
    overflow: hidden;
}

.help-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
}

.help-panel-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.2rem;
}

.help-close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
}

.help-close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.help-tabs {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
}

.help-tab {
    flex: 1;
    padding: 12px 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
}

.help-tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.help-tab.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-bottom: 2px solid var(--accent-primary);
}

.help-panel-content {
    max-height: 60vh;
    overflow-y: auto;
}

.help-section {
    display: none;
    padding: 20px;
    line-height: 1.6;
}

.help-section.active {
    display: block;
}

.help-section h4 {
    color: var(--text-primary);
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.1rem;
}

.help-section h5 {
    color: var(--text-primary);
    margin-top: 16px;
    margin-bottom: 8px;
    font-size: 1rem;
}

.help-section p {
    color: var(--text-secondary);
    margin-bottom: 12px;
}

.help-section ul {
    color: var(--text-secondary);
    margin-bottom: 16px;
    padding-left: 20px;
}

.help-section li {
    margin-bottom: 6px;
}

.mode-section {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 6px;
    border-left: 4px solid var(--accent-primary);
}

.example-comparison {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 4px;
}

.grading-comparison-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1001;
}

.comparison-modal-content {
    background: var(--bg-primary);
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    max-height: 80vh;
    overflow-y: auto;
}

.comparison-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
    border-radius: 8px 8px 0 0;
}

.comparison-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.comparison-close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
}

.comparison-close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.comparison-input {
    padding: 20px;
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    background: var(--bg-secondary);
}

.comparison-input label {
    color: var(--text-primary);
    font-weight: 500;
}

.comparison-input select,
.comparison-input input {
    padding: 8px 12px;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
}

.comparison-input button {
    padding: 8px 16px;
    background: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.comparison-input button:hover {
    background: var(--accent-secondary);
}

.comparison-results {
    padding: 20px;
}

.comparison-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.comparison-mode {
    padding: 16px;
    border: 1px solid var(--border-light);
    border-radius: 6px;
    background: var(--bg-secondary);
}

.comparison-mode.current-mode {
    border-color: var(--accent-primary);
    background: var(--bg-accent);
}

.comparison-mode h5 {
    margin: 0 0 12px 0;
    color: var(--text-primary);
    font-size: 1rem;
}

.comparison-tier {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.tier-indicator {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
}

.tier-name {
    color: var(--text-primary);
    font-weight: 500;
}

.comparison-explanation {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
}

.grading-tooltip {
    position: absolute;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    padding: 12px;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1002;
    display: none;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--text-secondary);
}

.grading-tooltip strong {
    color: var(--text-primary);
}

.grading-help-btn,
.grading-compare-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
    cursor: pointer;
    margin-left: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.grading-help-btn:hover,
.grading-compare-btn:hover {
    background: var(--accent-secondary);
}

.sidebar-help-btn,
.sidebar-compare-btn {
    width: 100%;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.sidebar-help-btn:hover,
.sidebar-compare-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent-primary);
}

.legend-mode-indicator {
    margin-left: 12px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    border: 1px solid var(--border-light);
}

.enhanced-grading-legend {
    position: relative;
}

.legend-tier-item,
.sidebar-tier-item {
    cursor: help;
    transition: all 0.2s ease;
}

.legend-tier-item:hover,
.sidebar-tier-item:hover {
    transform: scale(1.05);
    background: var(--bg-hover);
    border-radius: 4px;
    padding: 4px;
}

@media (max-width: 768px) {
    .grading-help-panel {
        width: 95%;
        max-height: 90vh;
    }
    
    .comparison-input {
        flex-direction: column;
        align-items: stretch;
    }
    
    .comparison-grid {
        grid-template-columns: 1fr;
    }
    
    .help-tabs {
        flex-wrap: wrap;
    }
    
    .help-tab {
        min-width: 80px;
    }
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', gradingHelpStyles);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GradingLegendHelpSystem;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.GradingLegendHelpSystem = GradingLegendHelpSystem;
}