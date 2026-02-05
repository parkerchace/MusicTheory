/**
 * @module ModernScaleExplorer
 * @description Revolutionary scale learning interface that prioritizes musical understanding over technical complexity
 * @exports class ModernScaleExplorer
 * @pedagogy Sound-first learning, emotional context, progressive disclosure
 * @features Intelligent scale recommendations, genre awareness, audio-first experience
 */

class ModernScaleExplorer {
    constructor(musicTheoryEngine, audioEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ModernScaleExplorer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.audioEngine = audioEngine;
        
        this.state = {
            // Learning journey state
            currentMode: 'discover', // discover | understand | apply | master
            experienceLevel: 'beginner', // beginner | intermediate | advanced | expert
            
            // Current selection
            currentKey: 'C',
            currentScale: 'major',
            
            // Discovery filters
            mood: null, // happy | sad | mysterious | dreamy | tense | exotic
            genre: null, // classical | jazz | rock | world | electronic
            complexity: 'simple', // simple | medium | complex | exotic
            
            // UI state
            isPlaying: false,
            autoPlay: true,
            showTechnicalInfo: false,
            favoriteScales: new Set(),
            
            // Learning progress
            exploredScales: new Set(),
            masteredScales: new Set()
        };

        this.container = null;
        this.pianoVisualizer = null;
        this.listeners = new Map();

        // Scale metadata with pedagogical context
        this.scaleContext = this.buildScaleContext();
        
        // Load user preferences
        this.loadUserState();
    }

    buildScaleContext() {
        return {
            // BEGINNER SCALES - Start here
            major: {
                level: 'beginner',
                mood: ['happy', 'bright', 'confident'],
                genre: ['classical', 'folk', 'pop', 'country'],
                emotion: 'Joyful & Triumphant',
                description: 'The foundation of Western music. Sounds bright, happy, and stable.',
                examples: ['Twinkle Twinkle Little Star', 'Happy Birthday', 'Do-Re-Mi'],
                tips: 'Perfect for beginners - this is the "default" sound most people recognize',
                color: '#22c55e', // Green - natural, foundational
                complexity: 1,
                pedagogicalOrder: 1
            },
            
            minor: {
                level: 'beginner', 
                mood: ['sad', 'emotional', 'serious'],
                genre: ['classical', 'rock', 'folk', 'blues'],
                emotion: 'Melancholic & Deep',
                description: 'The "sad" scale. Creates emotional depth and introspection.',
                examples: ['Scarborough Fair', 'Greensleeves', 'Mad World'],
                tips: 'Learn this second - it\\'s the emotional counterpart to major',
                color: '#6366f1', // Indigo - deep, emotional
                complexity: 1,
                pedagogicalOrder: 2
            },

            // INTERMEDIATE SCALES
            dorian: {
                level: 'intermediate',
                mood: ['soulful', 'jazzy', 'sophisticated'],
                genre: ['jazz', 'folk', 'progressive'],
                emotion: 'Soulful & Sophisticated',
                description: 'Minor with a bright twist. Jazzy and contemplative.',
                examples: ['So What - Miles Davis', 'Eleanor Rigby - Beatles'],
                tips: 'Like natural minor but with a raised 6th - adds sophistication',
                color: '#8b5cf6', // Purple - sophisticated
                complexity: 2,
                pedagogicalOrder: 3
            },

            mixolydian: {
                level: 'intermediate',
                mood: ['bluesy', 'rock', 'dominant'],
                genre: ['rock', 'blues', 'country', 'jazz'],
                emotion: 'Bluesy & Driving',
                description: 'Major with a bluesy edge. The sound of rock and blues.',
                examples: ['Sweet Child O Mine', 'Norwegian Wood'],
                tips: 'Major scale with a flat 7th - creates that "almost resolved" feeling',
                color: '#f59e0b', // Amber - driving, energetic
                complexity: 2,
                pedagogicalOrder: 4
            },

            // ADVANCED SCALES
            phrygian: {
                level: 'advanced',
                mood: ['dark', 'exotic', 'spanish'],
                genre: ['flamenco', 'metal', 'world'],
                emotion: 'Exotic & Mysterious',
                description: 'Dark and Spanish-flavored. Creates tension and exoticism.',
                examples: ['Flamenco music', 'White Rabbit - Jefferson Airplane'],
                tips: 'Minor scale with a flat 2nd - very distinctive Spanish sound',
                color: '#dc2626', // Red - intense, passionate
                complexity: 3,
                pedagogicalOrder: 8
            },

            lydian: {
                level: 'advanced',
                mood: ['dreamy', 'floating', 'ethereal'],
                genre: ['film', 'ambient', 'prog'],
                emotion: 'Dreamy & Ethereal',
                description: 'Major with a dreamy, floating quality. Sounds like flying.',
                examples: ['The Simpsons Theme', 'Dreams - Fleetwood Mac'],
                tips: 'Major with a sharp 4th - creates that floating, otherworldly feeling',
                color: '#06b6d4', // Cyan - ethereal, floating  
                complexity: 3,
                pedagogicalOrder: 6
            },

            // Add more scales with full context...
            harmonic_minor: {
                level: 'advanced',
                mood: ['dramatic', 'classical', 'exotic'],
                genre: ['classical', 'metal', 'world'],
                emotion: 'Dramatic & Classical',
                description: 'Classical minor scale with exotic flair.',
                examples: ['Bach inventions', 'Chopin nocturnes'],
                tips: 'Natural minor with raised 7th - creates strong leading tone',
                color: '#7c3aed', // Violet - classical, sophisticated
                complexity: 3,
                pedagogicalOrder: 9
            },

            // PENTATONIC SCALES
            major_pentatonic: {
                level: 'beginner',
                mood: ['open', 'folk', 'pastoral'],
                genre: ['folk', 'country', 'rock', 'world'],
                emotion: 'Open & Pastoral',
                description: 'Simplified major scale. Sounds open and folky.',
                examples: ['Amazing Grace', 'Auld Lang Syne'],
                tips: 'Only 5 notes - impossible to play a wrong note!',
                color: '#65a30d', // Lime - natural, open
                complexity: 1,
                pedagogicalOrder: 5
            },

            minor_pentatonic: {
                level: 'beginner',
                mood: ['bluesy', 'rock', 'soulful'],
                genre: ['blues', 'rock', 'country'],
                emotion: 'Bluesy & Soulful', 
                description: 'The foundation of rock and blues solos.',
                examples: ['Black', 'Stairway to Heaven solo'],
                tips: 'Essential for rock/blues - learn this for guitar solos',
                color: '#0891b2', // Sky blue - bluesy, flowing
                complexity: 1,
                pedagogicalOrder: 7
            }

            // TODO: Add remaining scales with full pedagogical context
        };
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) {
            throw new Error(`Container ${selector} not found`);
        }

        this.render();
        this.setupPianoVisualizer();
        this.bindEvents();
        
        // Auto-play current scale if enabled
        if (this.state.autoPlay) {
            setTimeout(() => this.playCurrentScale(), 500);
        }
    }

    render() {
        if (!this.container) return;

        // Get current scale context
        const currentContext = this.scaleContext[this.state.currentScale];
        const availableScales = this.getAvailableScales();

        this.container.innerHTML = `
            <div class="modern-scale-explorer">
                ${this.renderModeSelector()}
                ${this.renderCurrentScale(currentContext)}
                ${this.renderScaleGrid(availableScales)}
                ${this.renderPianoContainer()}
                ${this.renderControlPanel()}
            </div>
            
            <style>
                .modern-scale-explorer {
                    --color-bg-primary: #0f172a;
                    --color-bg-secondary: #1e293b;
                    --color-bg-tertiary: #334155;
                    --color-text-primary: #f1f5f9;
                    --color-text-secondary: #cbd5e1;
                    --color-text-muted: #64748b;
                    --color-border: #475569;
                    --color-accent: #3b82f6;
                    --color-success: #10b981;
                    --color-warning: #f59e0b;
                    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
                    
                    background: var(--color-bg-primary);
                    color: var(--color-text-primary);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    padding: 2rem;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                /* Modern card design system */
                .mse-card {
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    box-shadow: var(--shadow-md);
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .mse-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }

                .mse-card-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--color-border);
                }

                .mse-card-body {
                    padding: 1.5rem;
                }

                /* Typography system */
                .mse-title-1 {
                    font-size: 2.25rem;
                    font-weight: 700;
                    line-height: 1.2;
                    color: var(--color-text-primary);
                    margin: 0;
                }

                .mse-title-2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    line-height: 1.3;
                    color: var(--color-text-primary);
                    margin: 0;
                }

                .mse-body {
                    font-size: 1rem;
                    line-height: 1.6;
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                .mse-caption {
                    font-size: 0.875rem;
                    line-height: 1.4;
                    color: var(--color-text-muted);
                    margin: 0;
                }

                /* Button system */
                .mse-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    font-weight: 500;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    text-decoration: none;
                    font-family: inherit;
                    min-height: 44px; /* Touch-friendly */
                }

                .mse-btn-primary {
                    background: var(--color-accent);
                    color: white;
                }

                .mse-btn-primary:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-md);
                }

                .mse-btn-secondary {
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-primary);
                    border: 1px solid var(--color-border);
                }

                .mse-btn-secondary:hover {
                    background: #475569;
                }

                /* Grid system */
                .mse-grid {
                    display: grid;
                    gap: 1rem;
                }

                .mse-grid-2 {
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                }

                .mse-grid-3 {
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                }

                .mse-grid-4 {
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                }

                /* Specific component styles */
                .mode-selector {
                    display: flex;
                    gap: 0.5rem;
                    padding: 0.5rem;
                    background: var(--color-bg-tertiary);
                    border-radius: 12px;
                    border: 1px solid var(--color-border);
                    max-width: 600px;
                    margin: 0 auto;
                }

                .mode-tab {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    text-align: center;
                    font-weight: 500;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    border: none;
                    background: transparent;
                    color: var(--color-text-secondary);
                }

                .mode-tab.active {
                    background: var(--color-accent);
                    color: white;
                    box-shadow: var(--shadow-sm);
                }

                .current-scale-display {
                    text-align: center;
                    padding: 3rem 2rem;
                }

                .scale-emotion {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--color-accent);
                    margin-bottom: 0.5rem;
                }

                .scale-description {
                    font-size: 1.125rem;
                    margin-bottom: 1.5rem;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                .scale-examples {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    justify-content: center;
                    margin-top: 1rem;
                }

                .scale-example {
                    padding: 0.25rem 0.75rem;
                    background: var(--color-bg-tertiary);
                    border-radius: 20px;
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                }

                .scale-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                    padding: 1rem;
                }

                .scale-card {
                    background: var(--color-bg-secondary);
                    border: 2px solid transparent;
                    border-radius: 12px;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                }

                .scale-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-xl);
                    border-color: var(--color-accent);
                }

                .scale-card.active {
                    border-color: var(--color-accent);
                    background: var(--color-bg-tertiary);
                }

                .scale-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                }

                .scale-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                }

                .scale-level {
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .scale-level.beginner { background: var(--color-success); color: white; }
                .scale-level.intermediate { background: var(--color-warning); color: black; }
                .scale-level.advanced { background: #ef4444; color: white; }
                .scale-level.expert { background: #8b5cf6; color: white; }

                .scale-mood-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                    margin-bottom: 0.75rem;
                }

                .mood-tag {
                    padding: 0.125rem 0.5rem;
                    background: rgba(59, 130, 246, 0.1);
                    color: var(--color-accent);
                    border-radius: 12px;
                    font-size: 0.75rem;
                }

                .play-button {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--color-accent);
                    border: none;
                    color: white;
                    font-size: 1rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                    opacity: 0.7;
                }

                .play-button:hover {
                    opacity: 1;
                    transform: scale(1.1);
                    box-shadow: var(--shadow-md);
                }

                .piano-container {
                    background: var(--color-bg-secondary);
                    border-radius: 16px;
                    padding: 2rem;
                    display: flex;
                    justify-content: center;
                    min-height: 200px;
                }

                .control-panel {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--color-bg-secondary);
                    border-radius: 12px;
                }

                .control-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .control-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--color-text-secondary);
                }

                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }

                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--color-border);
                    transition: 0.2s;
                    border-radius: 24px;
                }

                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.2s;
                    border-radius: 50%;
                }

                input:checked + .toggle-slider {
                    background-color: var(--color-accent);
                }

                input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .modern-scale-explorer {
                        padding: 1rem;
                        gap: 1rem;
                    }

                    .mode-selector {
                        flex-direction: column;
                    }

                    .scale-grid {
                        grid-template-columns: 1fr;
                        padding: 0;
                    }

                    .control-panel {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .current-scale-display {
                        padding: 2rem 1rem;
                    }
                }

                /* Animation system */
                .fade-in {
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .pulse {
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            </style>
        `;

        // Add fade-in animation to new content
        this.container.querySelector('.modern-scale-explorer').classList.add('fade-in');
    }

    renderModeSelector() {
        const modes = [
            { id: 'discover', label: '🎵 Discover', description: 'Find scales by sound & mood' },
            { id: 'understand', label: '🧠 Understand', description: 'Learn how scales work' },
            { id: 'apply', label: '🎸 Apply', description: 'Use scales musically' },
            { id: 'master', label: '🏆 Master', description: 'Advanced relationships' }
        ];

        return `
            <div class="mode-selector">
                ${modes.map(mode => `
                    <button class="mode-tab ${this.state.currentMode === mode.id ? 'active' : ''}" 
                            data-mode="${mode.id}"
                            title="${mode.description}">
                        ${mode.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderCurrentScale(context) {
        if (!context) return '';

        // Create color indicator based on scale emotion
        const colorStyle = `style="color: ${context.color}; text-shadow: 0 0 10px ${context.color}40;"`;

        return `
            <div class="mse-card current-scale-display">
                <h1 class="mse-title-1" ${colorStyle}>
                    ${this.formatScaleName(this.state.currentScale)} in ${this.state.currentKey}
                </h1>
                
                <div class="scale-emotion" style="color: ${context.color};">
                    ${context.emotion}
                </div>
                
                <p class="scale-description mse-body">
                    ${context.description}
                </p>

                <div class="mse-grid-2" style="gap: 2rem; margin-top: 2rem;">
                    <div>
                        <h3 class="mse-title-2" style="margin-bottom: 0.75rem;">Musical Examples</h3>
                        <div class="scale-examples">
                            ${context.examples.map(example => `
                                <span class="scale-example">${example}</span>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="mse-title-2" style="margin-bottom: 0.75rem;">Learning Tip</h3>
                        <p class="mse-body" style="font-style: italic;">
                            💡 ${context.tips}
                        </p>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <button class="mse-btn mse-btn-primary play-scale-btn">
                        ${this.state.isPlaying ? '⏹️ Stop' : '▶️ Play Scale'}
                    </button>
                    <button class="mse-btn mse-btn-secondary" style="margin-left: 1rem;">
                        🎹 Practice
                    </button>
                </div>
            </div>
        `;
    }

    renderScaleGrid(scales) {
        return `
            <div class="mse-card">
                <div class="mse-card-header">
                    <h2 class="mse-title-2">Explore Scales</h2>
                    <div class="control-group">
                        <label class="control-label">Level:</label>
                        <select class="experience-level-select">
                            <option value="beginner" ${this.state.experienceLevel === 'beginner' ? 'selected' : ''}>Beginner</option>
                            <option value="intermediate" ${this.state.experienceLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                            <option value="advanced" ${this.state.experienceLevel === 'advanced' ? 'selected' : ''}>Advanced</option>
                            <option value="expert" ${this.state.experienceLevel === 'expert' ? 'selected' : ''}>Expert</option>
                        </select>
                    </div>
                </div>
                
                <div class="scale-grid">
                    ${scales.map(scale => this.renderScaleCard(scale)).join('')}
                </div>
            </div>
        `;
    }

    renderScaleCard(scale) {
        const context = this.scaleContext[scale];
        if (!context) return '';

        const isActive = scale === this.state.currentScale;
        const isExplored = this.state.exploredScales.has(scale);
        const isFavorite = this.state.favoriteScales.has(scale);

        return `
            <div class="scale-card ${isActive ? 'active' : ''}" 
                 data-scale="${scale}"
                 style="border-left: 4px solid ${context.color};">
                
                <button class="play-button" data-scale="${scale}" title="Play this scale">
                    ▶️
                </button>

                <div class="scale-card-header">
                    <h3 class="scale-name">${this.formatScaleName(scale)}</h3>
                    <span class="scale-level ${context.level}">${context.level}</span>
                </div>

                <div class="scale-mood-tags">
                    ${context.mood.slice(0, 3).map(mood => `
                        <span class="mood-tag">${mood}</span>
                    `).join('')}
                </div>

                <p class="mse-caption" style="margin-bottom: 1rem;">
                    ${context.description.split('.')[0]}.
                </p>

                <div class="scale-card-footer">
                    <div class="scale-genres">
                        <strong>Genres:</strong> ${context.genre.slice(0, 2).join(', ')}
                    </div>
                    
                    <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        ${isExplored ? '<span title="Explored">✓</span>' : ''}
                        ${isFavorite ? '<span title="Favorite">❤️</span>' : ''}
                        <span class="complexity-indicator" title="Complexity: ${context.complexity}/5">
                            ${'●'.repeat(context.complexity)}${'○'.repeat(5 - context.complexity)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    renderPianoContainer() {
        return `
            <div class="piano-container">
                <div id="modern-scale-piano" style="width: 100%;"></div>
            </div>
        `;
    }

    renderControlPanel() {
        return `
            <div class="control-panel">
                <div class="control-group">
                    <label class="control-label">Key:</label>
                    <select class="key-select mse-btn-secondary" style="padding: 0.5rem;">
                        ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(key => `
                            <option value="${key}" ${key === this.state.currentKey ? 'selected' : ''}>${key}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">Auto-play scales</label>
                    <label class="toggle-switch">
                        <input type="checkbox" ${this.state.autoPlay ? 'checked' : ''} class="auto-play-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="control-group">
                    <label class="control-label">Show technical info</label>
                    <label class="toggle-switch">
                        <input type="checkbox" ${this.state.showTechnicalInfo ? 'checked' : ''} class="technical-info-toggle">
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="control-group">
                    <button class="mse-btn mse-btn-secondary reset-progress-btn">
                        🔄 Reset Progress
                    </button>
                </div>
            </div>
        `;
    }

    // Helper methods
    getAvailableScales() {
        const levels = {
            beginner: ['major', 'minor', 'major_pentatonic', 'minor_pentatonic'],
            intermediate: ['major', 'minor', 'dorian', 'mixolydian', 'major_pentatonic', 'minor_pentatonic'],
            advanced: ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'major_pentatonic', 'minor_pentatonic', 'harmonic_minor'],
            expert: Object.keys(this.scaleContext)
        };

        return levels[this.state.experienceLevel] || levels.beginner;
    }

    formatScaleName(scaleId) {
        const names = {
            major: 'Major',
            minor: 'Natural Minor',
            dorian: 'Dorian',
            phrygian: 'Phrygian', 
            lydian: 'Lydian',
            mixolydian: 'Mixolydian',
            major_pentatonic: 'Major Pentatonic',
            minor_pentatonic: 'Minor Pentatonic',
            harmonic_minor: 'Harmonic Minor',
        };
        
        return names[scaleId] || scaleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    setupPianoVisualizer() {
        const pianoContainer = this.container.querySelector('#modern-scale-piano');
        if (!pianoContainer) return;

        // Create simplified piano visualizer for this context
        if (window.PianoVisualizer) {
            this.pianoVisualizer = new PianoVisualizer({
                container: pianoContainer,
                startMidi: 60, // C4
                endMidi: 83,   // B5 (2 octaves) 
                whiteKeyWidth: 45,
                whiteKeyHeight: 160,
                blackKeyHeight: 100,
                showFingering: false,
                showRomanNumerals: false,
                fitToContainer: true,
                showNoteLabels: true
            });

            this.updatePianoHighlights();
        }
    }

    updatePianoHighlights() {
        if (!this.pianoVisualizer) return;

        const scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.state.currentKey, this.state.currentScale);
        const context = this.scaleContext[this.state.currentScale];
        
        // Clear previous highlights
        this.pianoVisualizer.clearHighlights();
        
        // Apply scale-colored highlights
        scaleNotes.forEach((note, index) => {
            this.pianoVisualizer.highlightNote(note, {
                color: context?.color || '#3b82f6',
                label: (index + 1).toString(), // Scale degree
                intensity: 0.8
            });
        });
    }

    bindEvents() {
        if (!this.container) return;

        // Mode selector
        this.container.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.state.currentMode = tab.dataset.mode;
                this.render();
            });
        });

        // Scale cards
        this.container.querySelectorAll('.scale-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('play-button')) {
                    this.selectScale(card.dataset.scale);
                }
            });
        });

        // Play buttons
        this.container.querySelectorAll('.play-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const scale = btn.dataset.scale || this.state.currentScale;
                this.playScale(scale);
            });
        });

        // Main play scale button
        const playScaleBtn = this.container.querySelector('.play-scale-btn');
        if (playScaleBtn) {
            playScaleBtn.addEventListener('click', () => {
                this.playCurrentScale();
            });
        }

        // Controls
        const keySelect = this.container.querySelector('.key-select');
        if (keySelect) {
            keySelect.addEventListener('change', (e) => {
                this.state.currentKey = e.target.value;
                this.updatePianoHighlights();
                if (this.state.autoPlay) {
                    this.playCurrentScale();
                }
                this.render();
            });
        }

        const experienceLevelSelect = this.container.querySelector('.experience-level-select');
        if (experienceLevelSelect) {
            experienceLevelSelect.addEventListener('change', (e) => {
                this.state.experienceLevel = e.target.value;
                this.render();
            });
        }

        const autoPlayToggle = this.container.querySelector('.auto-play-toggle');
        if (autoPlayToggle) {
            autoPlayToggle.addEventListener('change', (e) => {
                this.state.autoPlay = e.target.checked;
                this.saveUserState();
            });
        }

        const technicalInfoToggle = this.container.querySelector('.technical-info-toggle');
        if (technicalInfoToggle) {
            technicalInfoToggle.addEventListener('change', (e) => {
                this.state.showTechnicalInfo = e.target.checked;
                this.render();
            });
        }

        const resetBtn = this.container.querySelector('.reset-progress-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all learning progress?')) {
                    this.resetProgress();
                }
            });
        }
    }

    selectScale(scaleId) {
        if (!this.scaleContext[scaleId]) return;

        this.state.currentScale = scaleId;
        this.state.exploredScales.add(scaleId);
        
        this.updatePianoHighlights();
        this.render();
        
        if (this.state.autoPlay) {
            setTimeout(() => this.playCurrentScale(), 200);
        }

        this.emit('scaleChanged', {
            scale: scaleId,
            key: this.state.currentKey,
            context: this.scaleContext[scaleId]
        });

        this.saveUserState();
    }

    playCurrentScale() {
        this.playScale(this.state.currentScale);
    }

    playScale(scaleId) {
        if (!this.audioEngine || this.state.isPlaying) return;

        const scaleIntervals = this.musicTheory.scales[scaleId];
        if (!scaleIntervals) return;

        this.state.isPlaying = true;
        
        // Get root MIDI note
        const rootMidi = this.noteToMidi(this.state.currentKey + '4');
        
        // Play scale notes with timing
        scaleIntervals.forEach((interval, i) => {
            setTimeout(() => {
                const midi = rootMidi + interval;
                if (this.audioEngine.playNote) {
                    this.audioEngine.playNote(midi, 0.6);
                }
                
                // Visual feedback on piano
                this.highlightPlayingNote(midi);
            }, i * 400);
        });

        // Play octave
        setTimeout(() => {
            const octaveMidi = rootMidi + 12;
            if (this.audioEngine.playNote) {
                this.audioEngine.playNote(octaveMidi, 1.0);
            }
            this.highlightPlayingNote(octaveMidi);
        }, scaleIntervals.length * 400);

        // Reset playing state
        setTimeout(() => {
            this.state.isPlaying = false;
            this.render();
        }, (scaleIntervals.length + 2) * 400);

        this.render(); // Update play button state
    }

    highlightPlayingNote(midi) {
        // Visual feedback for currently playing note
        if (this.pianoVisualizer && this.pianoVisualizer.pianoElement) {
            const key = this.pianoVisualizer.pianoElement.querySelector(`[data-midi="${midi}"]`);
            if (key) {
                key.style.transform = 'translateY(2px)';
                key.style.boxShadow = '0 0 20px #fbbf24';
                
                setTimeout(() => {
                    key.style.transform = '';
                    this.updatePianoHighlights(); // Restore original highlighting
                }, 300);
            }
        }
    }

    noteToMidi(noteName) {
        const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
        if (!match) return 60;
        
        const noteMap = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11};
        const note = match[1].toUpperCase();
        const octave = parseInt(match[2], 10);
        
        return (octave + 1) * 12 + (noteMap[note] || 0);
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    // Persistence
    saveUserState() {
        const state = {
            currentKey: this.state.currentKey,
            currentScale: this.state.currentScale,
            experienceLevel: this.state.experienceLevel,
            autoPlay: this.state.autoPlay,
            favoriteScales: Array.from(this.state.favoriteScales),
            exploredScales: Array.from(this.state.exploredScales),
            masteredScales: Array.from(this.state.masteredScales)
        };

        try {
            localStorage.setItem('modern-scale-explorer-state', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save user state:', e);
        }
    }

    loadUserState() {
        try {
            const saved = localStorage.getItem('modern-scale-explorer-state');
            if (saved) {
                const state = JSON.parse(saved);
                Object.assign(this.state, {
                    ...state,
                    favoriteScales: new Set(state.favoriteScales || []),
                    exploredScales: new Set(state.exploredScales || []),
                    masteredScales: new Set(state.masteredScales || [])
                });
            }
        } catch (e) {
            console.warn('Failed to load user state:', e);
        }
    }

    resetProgress() {
        this.state.exploredScales.clear();
        this.state.masteredScales.clear();
        this.state.favoriteScales.clear();
        this.saveUserState();
        this.render();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernScaleExplorer;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ModernScaleExplorer = ModernScaleExplorer;
}