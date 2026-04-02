/**
 * @module ModuleSelector
 * @description Landing page and module selection for onboarding users
 * Organizes modules by skill level and provides semantic intent matching
 */

class ModuleSelector {
    constructor() {
        this.selectedModules = new Set();
        this.currentSkillLevel = 'beginner';
        // Preferred instrument for lessons (default to piano)
        this.preferredInstrument = localStorage.getItem('music-theory-instrument') || 'piano';
        
        // Module definitions organized by skill level
        this.modules = {
            beginner: [
                {
                    id: 'learn-scales',
                    name: 'Learn Scales',
                    description: 'Master scales through structured lessons: whole/half steps, scale degrees, ear training, modes, and building chords from scales.',
                    icon: '🎵',
                    category: 'Learning',
                    keywords: ['scales', 'modes', 'learn', 'lessons', 'theory', 'intervals', 'degrees', 'practice'],
                    workspaceModules: ['scale-circle-container', 'piano-container'],
                    supportedInstruments: ['piano','guitar','all'],
                    isLearnModule: true
                },
                {
                    id: 'piano-visualizer',
                    name: 'Piano Visualizer',
                    description: 'Interactive piano keyboard with scale visualization and MIDI support.',
                    icon: '🎹',
                    category: 'Tools',
                    keywords: ['piano', 'keyboard', 'notes', 'midi', 'visual'],
                    workspaceModules: ['piano-container'],
                    supportedInstruments: ['piano']
                },
                {
                    id: 'chord-explorer',
                    name: 'Chord Explorer',
                    description: 'Discover all chord types, voicings, and how they relate to scales.',
                    icon: '🎼',
                    category: 'Learning',
                    keywords: ['chords', 'voicing', 'harmony', 'learn'],
                    workspaceModules: ['chord-explorer-container'],
                    supportedInstruments: ['all']
                }
            ],
            intermediate: [
                {
                    id: 'progression-builder',
                    name: 'Progression Builder',
                    description: 'Create and analyze chord progressions with voice leading and modal interchange.',
                    icon: '⛓️',
                    category: 'Composition',
                    keywords: ['progression', 'chords', 'composition', 'voice leading', 'harmony'],
                    workspaceModules: ['progression-builder-container'],
                    supportedInstruments: ['all']
                },
                {
                    id: 'sheet-music',
                    name: 'Sheet Music Generator',
                    description: 'Generate and print sheet music with custom notation.',
                    icon: '📄',
                    category: 'Output',
                    keywords: ['notation', 'sheet music', 'print', 'score'],
                    workspaceModules: ['sheet-music-container'],
                    supportedInstruments: ['all']
                },
                {
                    id: 'container-chord',
                    name: 'Container Chord Analysis',
                    description: 'Find all chords that contain specific notes — discover hidden harmonic possibilities.',
                    icon: '🎯',
                    category: 'Analysis',
                    keywords: ['chords', 'notes', 'analysis', 'harmony', 'reharmonize'],
                    workspaceModules: ['container-chord-container'],
                    supportedInstruments: ['all']
                },
                {
                    id: 'scale-relationships',
                    name: 'Scale Relationships',
                    description: 'Explore scales containing your chord and find modal interchange options.',
                    icon: '🌍',
                    category: 'Analysis',
                    keywords: ['scales', 'chords', 'modal', 'analysis', 'relationships'],
                    workspaceModules: ['scale-relationship-container'],
                    supportedInstruments: ['all']
                }
            ],
            advanced: [
                {
                    id: 'number-generator',
                    name: 'Music Composition Engine',
                    description: 'Advanced generative music theory with semantic word-to-chord mapping and AI-driven voice leading.',
                    icon: '🤖',
                    category: 'Generation',
                    keywords: ['generative', 'ai', 'composition', 'semantic', 'advanced'],
                    workspaceModules: ['number-generator-container'],
                    supportedInstruments: ['all']
                },
                {
                    id: 'solar-visualizer',
                    name: 'Solar System Visualizer',
                    description: 'Advanced harmonic visualization showing relationships between all scales and modes.',
                    icon: '☀️',
                    category: 'Visualization',
                    keywords: ['visualization', 'advanced', 'harmonic', 'relationships'],
                    workspaceModules: ['solar-dock-viewport'],
                    supportedInstruments: ['all']
                },
                {
                    id: 'guitar-fretboard',
                    name: 'Guitar Fretboard',
                    description: 'Interactive guitar fretboard with scale and chord positions for multiple tunings.',
                    icon: '🎸',
                    category: 'Instruments',
                    keywords: ['guitar', 'fretboard', 'tuning', 'positions'],
                    workspaceModules: ['guitar-fretboard-container'],
                    supportedInstruments: ['guitar']
                }
            ]
        };

        // Intent matching keywords
        this.intentMap = {
            'learn scales': ['scale-library', 'piano-visualizer'],
            'learn chords': ['chord-explorer', 'container-chord'],
            'learn harmony': ['chord-explorer', 'progression-builder'],
            'improvise': ['scale-library', 'piano-visualizer', 'chord-explorer'],
            'write music': ['progression-builder', 'sheet-music'],
            'compose': ['progression-builder', 'sheet-music', 'number-generator'],
            'reharmonize': ['container-chord', 'scale-relationships'],
            'analyze chords': ['container-chord', 'scale-relationships'],
            'analyze scales': ['scale-library', 'scale-relationships'],
            'play piano': ['piano-visualizer'],
            'guitar': ['guitar-fretboard'],
            'advanced': ['number-generator', 'solar-visualizer'],
            'visualization': ['solar-visualizer'],
            'generative': ['number-generator']
        };

        this.init();
    }

    init() {
        this.renderModuleGrid();
        this.wrapOrphanModuleContainers();
        this.setupEventListeners();
        this.showLandingPage();
        this.applyInstrumentButtonState();
    }


    applyInstrumentButtonState() {
        // Highlight the currently selected instrument button
        document.querySelectorAll('.instrument-btn').forEach(btn => {
            const inst = btn.getAttribute('data-instrument');
            if (inst === this.preferredInstrument) {
                btn.style.background = 'var(--accent-primary)';
                btn.style.color = '#000';
                btn.style.border = 'none';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text-main)';
                btn.style.border = '2px solid var(--accent-primary)';
            }
        });
        // Also sync the dropdown if present
        const instrumentSelect = document.getElementById('instrument-select');
        if (instrumentSelect) instrumentSelect.value = this.preferredInstrument;
    }

    wrapOrphanModuleContainers() {
        try {
            // First, unwrap any existing studio-module wrappers that contain mini or hidden containers
            Array.from(document.querySelectorAll('.studio-module')).forEach(wrapper => {
                try {
                    const inner = wrapper.querySelector('.module-content > div');
                    if (!inner) return;
                    const id = inner.id || '';
                    const style = window.getComputedStyle(inner);
                    if (id.startsWith('mini-') || style.display === 'none') {
                        const parent = wrapper.parentElement;
                        if (!parent) return;
                        parent.replaceChild(inner, wrapper);
                    }
                } catch (e) {
                    // ignore per-wrapper errors
                }
            });

            const containers = Array.from(document.querySelectorAll('[id$="-container"], #solar-dock-viewport'));
            containers.forEach(el => {
                // Skip mini helpers and hidden containers — they should not get their own module header
                if ((el.id && el.id.startsWith && el.id.startsWith('mini-')) || window.getComputedStyle(el).display === 'none') {
                    return;
                }

                if (!el.closest('.studio-module')) {
                    const parent = el.parentElement || document.querySelector('.workspace .workspace-column.center-stage') || document.querySelector('.workspace');
                    if (!parent) return;
                    const wrapper = document.createElement('div');
                    wrapper.className = 'studio-module';
                    const header = document.createElement('div');
                    header.className = 'module-header';
                    header.innerHTML = `<span>${el.id.replace(/-/g,' ').toUpperCase()}</span>`;
                    const content = document.createElement('div');
                    content.className = 'module-content';

                    // Replace the raw container with the full module wrapper
                    parent.replaceChild(wrapper, el);
                    content.appendChild(el);
                    wrapper.appendChild(header);
                    wrapper.appendChild(content);
                }
            });
        } catch (e) {
            console.warn('[ModuleSelector] wrapOrphanModuleContainers error', e);
        }
    }

    selectInstrument(instrument) {
        this.preferredInstrument = instrument;
        localStorage.setItem('music-theory-instrument', instrument);
        this.applyInstrumentButtonState();
    }

    setupEventListeners() {
        // Instrument selector buttons
        document.querySelectorAll('.instrument-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inst = e.currentTarget.getAttribute('data-instrument');
                this.selectInstrument(inst);
            });
        });

        // Instrument select (dropdown) if present on page
        const instrumentSelect = document.getElementById('instrument-select');
        if (instrumentSelect) {
            instrumentSelect.value = this.preferredInstrument;
            instrumentSelect.addEventListener('change', (e) => {
                this.selectInstrument(e.target.value);
                this.renderModuleGrid();
            });
        }

        // Skill level buttons
        document.querySelectorAll('.skill-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.target.getAttribute('data-level');
                this.selectSkillLevel(level);
                this.renderModuleGrid();
            });
        });

        // Intent search
        const intentSearch = document.getElementById('intent-search');
        if (intentSearch) {
            intentSearch.addEventListener('input', (e) => {
                this.handleIntentSearch(e.target.value);
            });
        }

        // Launch workspace button
        const launchBtn = document.getElementById('launch-workspace-btn');
        if (launchBtn) {
            launchBtn.addEventListener('click', () => {
                this.launchWorkspace(false);  // Launch full studio
            });
        }

        // Launch Learn Piano (separate from full studio)
        const learnPianoBtn = document.getElementById('launch-learn-piano-btn');
        if (learnPianoBtn) {
            learnPianoBtn.addEventListener('click', () => {
                this.launchLearnPiano();
            });
        }

        // Launch Learn Notes (instrument-aware: opens a dedicated learn page)
        const learnNotesBtn = document.getElementById('launch-learn-notes-btn');
        if (learnNotesBtn) {
            learnNotesBtn.addEventListener('click', () => {
                // Determine preferred instrument (falls back to instrument select if available)
                const instSelect = document.getElementById('instrument-select');
                const inst = this.preferredInstrument || (instSelect ? instSelect.value : 'piano');
                if (typeof window.showLearnNotesModule === 'function') {
                    window.showLearnNotesModule(inst);
                } else {
                    // Fallback: show piano or guitar learn page directly
                    if (inst === 'guitar' && document.getElementById('learn-guitar-page')) {
                        document.getElementById('learn-guitar-page').style.display = 'block';
                        document.getElementById('landing-page') && (document.getElementById('landing-page').style.display = 'none');
                    } else if (document.getElementById('learn-piano-page')) {
                        document.getElementById('learn-piano-page').style.display = 'block';
                        document.getElementById('landing-page') && (document.getElementById('landing-page').style.display = 'none');
                    }
                }
            });
        }

        // Launch Learn Scales (separate from full studio)
        const learnScalesBtn = document.getElementById('launch-learn-scales-btn');
        if (learnScalesBtn) {
            learnScalesBtn.addEventListener('click', () => {
                this.launchLearnScales();
            });
        }

        // Launch Learn Chords (separate from full studio)
        const learnChordsBtn = document.getElementById('launch-learn-chords-btn');
        if (learnChordsBtn) {
            learnChordsBtn.addEventListener('click', () => {
                this.launchLearnChords();
            });
        }

        // Launch selected modules button
        const launchSelectedBtn = document.getElementById('launch-selected-btn');
        if (launchSelectedBtn) {
            launchSelectedBtn.addEventListener('click', () => {
                this.launchWorkspace(true);  // Launch with selected modules only
            });
        }
    }

    renderModuleGrid() {
        const grid = document.getElementById('module-grid');
        if (!grid) return;

        // Gather modules across levels filtered by selected instrument
        const allModules = [
            ...this.modules.beginner,
            ...this.modules.intermediate,
            ...this.modules.advanced
        ];

        const filtered = allModules.filter(mod => {
            const instr = mod.supportedInstruments || ['all'];
            return instr.includes(this.preferredInstrument) || instr.includes('all');
        }).filter(mod => (this.currentSkillLevel === 'all' || this.getSkillLevel(mod.id) === this.currentSkillLevel));

        // Deduplicate by workspace container to avoid duplicate modules (prefer first match)
        const seenContainers = new Set();
        const uniqueModules = [];
        for (const mod of filtered) {
            const containers = mod.workspaceModules || [];
            // if any container is already represented, skip this module to avoid duplication
            const hasOverlap = containers.some(c => seenContainers.has(c));
            if (!hasOverlap) {
                uniqueModules.push(mod);
                containers.forEach(c => seenContainers.add(c));
            }
        }

        grid.innerHTML = uniqueModules.map(mod => `
            <div class="module-card" data-module-id="${mod.id}" data-skill-level="${this.getSkillLevel(mod.id)}" style="display: flex;">
                <div style="font-size: 2rem;">${mod.icon}</div>
                <div class="module-card-title">${mod.name}</div>
                <div class="module-card-description">${mod.description}</div>
                <div class="module-card-tags">
                    <span class="module-card-tag">${mod.category}</span>
                    <span class="module-card-tag" style="background: transparent; border-color: var(--accent-secondary); color: var(--accent-secondary);">${this.getSkillLevel(mod.id)}</span>
                </div>
                <button class="btn-select-module ${mod.isLearnModule ? 'is-learn-module' : ''}" data-module-id="${mod.id}" style="margin-top: auto; padding: 10px 16px; background: var(--accent-primary); color: #000; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 0.85rem;">
                    ${mod.isLearnModule ? 'Start Learning' : 'Select'}
                </button>
            </div>
        `).join('');

        // Add select button listeners
        document.querySelectorAll('.btn-select-module').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const moduleId = e.target.getAttribute('data-module-id');

                // Special handling for learn modules - launch them directly
                if (e.target.classList.contains('is-learn-module')) {
                    if (moduleId === 'learn-scales') {
                        this.launchLearnScales();
                    } else if (moduleId === 'piano-visualizer') {
                        this.launchLearnPiano();
                    } else if (moduleId === 'chord-explorer') {
                        this.launchLearnChords();
                    }
                } else {
                    this.toggleModuleSelection(moduleId);
                }
            });
        });
    }

    selectSkillLevel(level) {
        this.currentSkillLevel = level;

        // Update button styles
        document.querySelectorAll('.skill-level-btn').forEach(btn => {
            const btnLevel = btn.getAttribute('data-level');
            if (btnLevel === level) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update grid visibility
        document.querySelectorAll('[data-skill-level]').forEach(card => {
            const cardLevel = card.getAttribute('data-skill-level');
            if (level === 'all' || cardLevel === level) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    handleIntentSearch(query) {
        const resultsDiv = document.getElementById('intent-results');
        if (!resultsDiv) return;

        if (!query.trim()) {
            resultsDiv.innerHTML = '';
            return;
        }

        const queryLower = query.toLowerCase();
        const matches = [];

        // Find matching intents
        for (const [intent, moduleIds] of Object.entries(this.intentMap)) {
            if (intent.includes(queryLower) || queryLower.includes(intent.split(' ')[0])) {
                matches.push(...moduleIds);
            }
        }

        if (matches.length > 0) {
            const uniqueMatches = [...new Set(matches)];
            const matchedModules = this.getModulesByIds(uniqueMatches);
            const names = matchedModules.map(m => m.name).join(', ');
            resultsDiv.innerHTML = `✓ Recommended: ${names}`;
            resultsDiv.style.color = 'var(--accent-secondary)';
        } else {
            resultsDiv.innerHTML = '✗ No matching modules found';
            resultsDiv.style.color = 'var(--text-muted)';
        }
    }

    toggleModuleSelection(moduleId) {
        const card = document.querySelector(`[data-module-id="${moduleId}"]`);
        if (!card) return;

        if (this.selectedModules.has(moduleId)) {
            this.selectedModules.delete(moduleId);
            card.classList.remove('selected');
        } else {
            this.selectedModules.add(moduleId);
            card.classList.add('selected');
        }

        // Update button visibility
        this.updateLaunchButtons();
    }

    updateLaunchButtons() {
        const launchSelectedBtn = document.getElementById('launch-selected-btn');
        if (!launchSelectedBtn) return;

        if (this.selectedModules.size > 0) {
            launchSelectedBtn.style.display = 'inline-block';
        } else {
            launchSelectedBtn.style.display = 'none';
        }
    }

    getSkillLevel(moduleId) {
        if (this.modules.beginner.some(m => m.id === moduleId)) return 'beginner';
        if (this.modules.intermediate.some(m => m.id === moduleId)) return 'intermediate';
        if (this.modules.advanced.some(m => m.id === moduleId)) return 'advanced';
        return 'unknown';
    }

    getModulesByIds(ids) {
        const allModules = [
            ...this.modules.beginner,
            ...this.modules.intermediate,
            ...this.modules.advanced
        ];
        return allModules.filter(m => ids.includes(m.id));
    }

    showLandingPage() {
        const landing = document.getElementById('landing-page');
        const learn = document.getElementById('learn-piano-page');
        const workspace = document.querySelector('.workspace');
        const controlDeck = document.querySelector('.control-deck');
        const bottomDeck = document.querySelector('.bottom-deck');

        if (landing) landing.style.display = 'block';
        if (learn) learn.style.display = 'none';
        if (workspace) workspace.style.display = 'none';
        if (controlDeck) controlDeck.style.display = 'none';
        if (bottomDeck) bottomDeck.style.display = 'none';
    }

    launchLearnPiano() {
        const landing = document.getElementById('landing-page');
        const learn = document.getElementById('learn-piano-page');
        const workspace = document.querySelector('.workspace');
        const controlDeck = document.querySelector('.control-deck');
        const bottomDeck = document.querySelector('.bottom-deck');

        if (landing) landing.style.display = 'none';
        if (learn) learn.style.display = 'block';
        if (workspace) workspace.style.display = 'none';
        if (controlDeck) controlDeck.style.display = 'none';
        if (bottomDeck) bottomDeck.style.display = 'none';

        // Lazy-mount the learn module
        try {
            if (!window.learnPianoNotesInstance) {
                const LearnClass = window.LearnPianoNotes;
                if (LearnClass && window.modularApp && window.modularApp.musicTheory) {
                    window.learnPianoNotesInstance = new LearnClass(window.modularApp.musicTheory);
                }
            }
            if (window.learnPianoNotesInstance && typeof window.learnPianoNotesInstance.mount === 'function') {
                window.learnPianoNotesInstance.mount('#learn-piano-notes-container');
            }
        } catch (e) {
            console.error('[ModuleSelector] Failed to mount LearnPianoNotes:', e);
        }
    }

    launchLearnChords() {
        const landing = document.getElementById('landing-page');
        const learn = document.getElementById('learn-chords-page');
        const workspace = document.querySelector('.workspace');
        const controlDeck = document.querySelector('.control-deck');
        const bottomDeck = document.querySelector('.bottom-deck');

        if (landing) landing.style.display = 'none';
        if (learn) learn.style.display = 'block';
        if (workspace) workspace.style.display = 'none';
        if (controlDeck) controlDeck.style.display = 'none';
        if (bottomDeck) bottomDeck.style.display = 'none';

        // Lazy-mount the learn chords module
        try {
            if (!window.learnChordsInstance) {
                const LearnClass = window.LearnChords;
                if (LearnClass && window.modularApp && window.modularApp.musicTheory) {
                    window.learnChordsInstance = new LearnClass(window.modularApp.musicTheory);
                } else if (LearnClass) {
                    window.learnChordsInstance = new LearnClass();
                }
            }
            if (window.learnChordsInstance && typeof window.learnChordsInstance.mount === 'function') {
                window.learnChordsInstance.mount('#learn-chords-container');
                if (window.modularApp && window.modularApp.midiManager && typeof window.learnChordsInstance.connectMidi === 'function') {
                    window.learnChordsInstance.connectMidi(window.modularApp.midiManager);
                }
            }
        } catch (e) {
            console.error('[ModuleSelector] Failed to mount LearnChords:', e);
        }
    }

    launchLearnScales() {
        const landing = document.getElementById('landing-page');
        const learn = document.getElementById('learn-scales-page');
        const workspace = document.querySelector('.workspace');
        const controlDeck = document.querySelector('.control-deck');
        const bottomDeck = document.querySelector('.bottom-deck');

        if (landing) landing.style.display = 'none';
        if (learn) learn.style.display = 'block';
        if (workspace) workspace.style.display = 'none';
        if (controlDeck) controlDeck.style.display = 'none';
        if (bottomDeck) bottomDeck.style.display = 'none';

        // Lazy-mount the learn scales module
        try {
            if (!window.learnScalesInstance) {
                const LearnClass = window.LearnScales;
                if (LearnClass && window.modularApp && window.modularApp.musicTheory) {
                    window.learnScalesInstance = new LearnClass(window.modularApp.musicTheory);
                } else if (LearnClass) {
                    window.learnScalesInstance = new LearnClass();
                }
            }
            if (window.learnScalesInstance && typeof window.learnScalesInstance.mount === 'function') {
                window.learnScalesInstance.mount('#learn-scales-container');
                if (window.modularApp && window.modularApp.midiManager && typeof window.learnScalesInstance.connectMidi === 'function') {
                    window.learnScalesInstance.connectMidi(window.modularApp.midiManager);
                }
            }
        } catch (e) {
            console.error('[ModuleSelector] Failed to mount LearnScales:', e);
        }
    }

    launchWorkspace(useSelectedOnly = false) {
        const landing = document.getElementById('landing-page');
        const learn = document.getElementById('learn-piano-page');
        const workspace = document.querySelector('.workspace');
        const controlDeck = document.querySelector('.control-deck');
        const bottomDeck = document.querySelector('.bottom-deck');

        if (landing) landing.style.display = 'none';

        if (learn) learn.style.display = 'none';
        if (workspace) workspace.style.display = 'flex';
        if (controlDeck) controlDeck.style.display = 'flex';
        if (bottomDeck) bottomDeck.style.display = 'flex';

        // If specific modules were selected and useSelectedOnly flag is true, hide non-selected modules
        if (useSelectedOnly && this.selectedModules.size > 0) {
            this.filterWorkspaceModules(Array.from(this.selectedModules));
        }

        // First-time visitor prompt for tutorial (moved from tutorial-system.js)
        // Tutorial prompt logic now handled in tutorial-system.js after launch-workspace-btn click
    }

    filterWorkspaceModules(selectedModuleIds) {
        // Get workspace containers to show/hide based on selection
        const allModules = [
            ...this.modules.beginner,
            ...this.modules.intermediate,
            ...this.modules.advanced
        ];

        // Build a map of module IDs to their workspace container IDs
        const moduleContainers = {};
        allModules.forEach(mod => {
            moduleContainers[mod.id] = mod.workspaceModules || [];
        });

        // Collect all workspace container IDs that should be visible
        const visibleContainers = new Set();
        selectedModuleIds.forEach(moduleId => {
            const containers = moduleContainers[moduleId] || [];
            containers.forEach(c => visibleContainers.add(c));
        });

        // Hide/show studio modules based on selection
        const studioModules = document.querySelectorAll('.studio-module');
        studioModules.forEach(mod => {
            const contentDiv = mod.querySelector('.module-content > div');
            if (contentDiv) {
                const containerId = contentDiv.id;
                if (visibleContainers.has(containerId)) {
                    mod.style.display = 'block';
                } else {
                    mod.style.display = 'none';
                }
            }
        });

        console.log('[ModuleSelector] Filtered workspace. Visible modules:', Array.from(visibleContainers));
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.moduleSelector = new ModuleSelector();
    });
} else {
    window.moduleSelector = new ModuleSelector();
}
