/**
 * CHORD ANALYZER MODULE
 *
 * Advanced chord analysis including container chords, functional harmony,
 * and filtering capabilities. Integrates with Music Theory Engine.
 *
 * Features:
 * - Container chord analysis (chords containing specific notes)
 * - Functional harmony grouping (Tonic, Dominant, Predominant, etc.)
 * - Scale matching with percentage scoring
 * - Complexity filtering (triads, sevenths, extended)
 * - Interactive chord cards with detailed information
 * - Visual grading system (Perfect ★★★, Excellent ★★, Good ★)
 */

class ChordAnalyzer {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ChordAnalyzer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            currentNotes: [],
            currentKey: 'C',
            currentScale: 'major',
            currentFilter: 'all',
            selectedChord: null
        };

        this.listeners = new Map();
        this.containerElement = null;

        this.initialize();
    }

    initialize() {
        this.createContainerElement();
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in chord analyzer event listener:', error);
                }
            });
        }
    }

    /**
     * Create container DOM element
     */
    createContainerElement() {
        if (this.containerElement) return;

        this.containerElement = document.createElement('div');
        this.containerElement.className = 'chord-analyzer-container';

        // Create filter bar
        this.filterBar = document.createElement('div');
        this.filterBar.className = 'chord-filter-bar';

        this.containerElement.appendChild(this.filterBar);

        // Create results container
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'chord-results-container';

        this.containerElement.appendChild(this.resultsContainer);

        this.setupFilters();
    }

    /**
     * Setup filter controls
     */
    setupFilters() {
        const filters = [
            { id: 'all', label: 'All Chords', active: true },
            { id: 'scale', label: 'In Scale Only' },
            { id: 'triads', label: 'Triads' },
            { id: 'sevenths', label: '7ths' },
            { id: 'extended', label: 'Extended' }
        ];

        filters.forEach(filter => {
            const button = document.createElement('button');
            button.className = `filter-button ${filter.active ? 'active' : ''}`;
            button.dataset.filter = filter.id;
            button.textContent = filter.label;

            button.addEventListener('click', () => {
                this.setFilter(filter.id);
            });

            this.filterBar.appendChild(button);
        });
    }

    /**
     * Set active filter
     */
    setFilter(filterId) {
        this.state.currentFilter = filterId;

        // Update button states
        this.filterBar.querySelectorAll('.filter-button').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === filterId);
        });

        // Re-analyze with new filter
        this.analyzeChords();
    }

    /**
     * Analyze chords containing given notes
     */
    analyzeChords(notes = null, key = null, scale = null) {
        // Update state
        this.state.currentNotes = notes || this.state.currentNotes;
        this.state.currentKey = key || this.state.currentKey;
        this.state.currentScale = scale || this.state.currentScale;

        if (this.state.currentNotes.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Get scale notes for analysis
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);

        // Find all container chords
        const allChords = this.musicTheory.findAllContainerChords(this.state.currentNotes, scaleNotes);

        // Apply filters
        const filteredChords = this.applyFilters(allChords);

        // Render results
        this.renderChordResults(filteredChords, scaleNotes);
    }

    /**
     * Apply current filters to chord list
     */
    applyFilters(chords) {
        switch (this.state.currentFilter) {
            case 'scale':
                return chords.filter(chord => chord.scaleMatchPercent === 100);
            case 'triads':
                return chords.filter(chord => chord.complexity === 'triad');
            case 'sevenths':
                return chords.filter(chord => chord.complexity === 'seventh');
            case 'extended':
                return chords.filter(chord => chord.complexity === 'extended');
            default:
                return chords;
        }
    }

    /**
     * Render chord analysis results
     */
    renderChordResults(chords, scaleNotes) {
        this.resultsContainer.innerHTML = '';

        if (chords.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Group chords by scale match percentage, then by function
        const groupedChords = this.groupChordsByMatchAndFunction(chords);

        // Sort groups by match percentage (highest first)
        const sortedMatchGroups = Object.keys(groupedChords)
            .map(match => parseInt(match))
            .sort((a, b) => b - a);

        sortedMatchGroups.forEach(matchPercent => {
            this.renderMatchGroup(matchPercent, groupedChords[matchPercent], scaleNotes);
        });
    }

    /**
     * Group chords by match percentage and harmonic function
     */
    groupChordsByMatchAndFunction(chords) {
        const groups = {};

        chords.forEach(chord => {
            const matchKey = chord.scaleMatchPercent.toString();

            if (!groups[matchKey]) {
                groups[matchKey] = {};
            }

            const funcKey = chord.functions && chord.functions.length > 0
                ? chord.functions[0]
                : 'Other';

            if (!groups[matchKey][funcKey]) {
                groups[matchKey][funcKey] = [];
            }

            groups[matchKey][funcKey].push(chord);
        });

        return groups;
    }

    /**
     * Render a match percentage group
     */
    renderMatchGroup(matchPercent, functionGroups, scaleNotes) {
        const matchGroup = document.createElement('div');
        matchGroup.className = 'match-group';

        // Match header
        const header = document.createElement('div');
        header.className = 'match-group-header';

        const grade = this.getGradeInfo(matchPercent);
        header.innerHTML = `
            <span class="match-grade ${grade.class}">${grade.label} (${matchPercent}%)</span>
            <span class="match-count">${this.getTotalChordsInGroup(functionGroups)} chords</span>
        `;

        matchGroup.appendChild(header);

        // Function subsections
        const content = document.createElement('div');
        content.className = 'match-group-content';

        // Sort functions by importance
        const sortedFunctions = this.sortFunctions(Object.keys(functionGroups));

        sortedFunctions.forEach(funcName => {
            this.renderFunctionSubsection(funcName, functionGroups[funcName], content);
        });

        matchGroup.appendChild(content);
        this.resultsContainer.appendChild(matchGroup);
    }

    /**
     * Render function subsection (Tonic, Dominant, etc.)
     */
    renderFunctionSubsection(functionName, chords, container) {
        const section = document.createElement('div');
        section.className = 'function-subsection';

        // Function header
        const header = document.createElement('div');
        header.className = 'function-header';
        header.innerHTML = `<span class="function-name">${functionName}</span> <span class="function-count">${chords.length}</span>`;
        section.appendChild(header);

        // Chord grid
        const grid = document.createElement('div');
        grid.className = 'chord-grid';

        chords.forEach(chord => {
            this.renderChordCard(chord, grid);
        });

        section.appendChild(grid);
        container.appendChild(section);
    }

    /**
     * Render individual chord card
     */
    renderChordCard(chord, container) {
        const card = document.createElement('div');
        card.className = `chord-card ${this.state.selectedChord === chord.fullName ? 'selected' : ''}`;
        card.dataset.chord = chord.fullName;

        const grade = this.getGradeInfo(chord.scaleMatchPercent);

        card.innerHTML = `
            <div class="chord-name">${chord.fullName}</div>
            <div class="chord-notes">${chord.chordNotes.join(' • ')}</div>
            <div class="chord-meta">
                <span class="chord-complexity">${chord.complexity}</span>
                <span class="chord-grade ${grade.class}">${grade.short}</span>
            </div>
        `;

        const noteRoles = this.getNoteRoles(chord.chordNotes, chord.root);
        const chordFunction = this.classifyChordFunction(chord, this.state.currentKey, this.state.currentScale);
        
        card.innerHTML += `
            <div class="chord-function">Function: ${chordFunction}</div>
            <div class="note-roles">Note roles: ${Object.entries(noteRoles).map(([note, role]) => `${note}(${role})`).join(', ')}</div>
        `;

        // Click handler
        card.addEventListener('click', () => {
            this.selectChord(chord);
        });

        container.appendChild(card);
    }

    /**
     * Handle chord selection
     */
    selectChord(chord) {
        this.state.selectedChord = chord.fullName;

        // Update visual selection
        this.containerElement.querySelectorAll('.chord-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.chord === chord.fullName);
        });

        this.emit('chordSelected', {
            chord: chord,
            notes: chord.chordNotes,
            functions: chord.functions,
            roles: chord.roles
        });
    }

    /**
     * Get grade information for match percentage
     */
    getGradeInfo(matchPercent) {
        if (matchPercent === 100) {
            return { class: 'grade-perfect', label: '★★★ Perfect', short: '★★★' };
        } else if (matchPercent >= 75) {
            return { class: 'grade-excellent', label: '★★ Excellent', short: '★★' };
        } else if (matchPercent >= 50) {
            return { class: 'grade-good', label: '★ Good', short: '★' };
        } else {
            return { class: 'grade-fair', label: 'Fair', short: '' };
        }
    }

    /**
     * Get total chords in a function group
     */
    getTotalChordsInGroup(functionGroups) {
        return Object.values(functionGroups).reduce((total, chords) => total + chords.length, 0);
    }

    /**
     * Sort harmonic functions by importance
     */
    sortFunctions(functions) {
        const order = [
            'Tonic', 'Dominant', 'Predominant',
            'Secondary Dominant', 'Leading-tone', 'Tritone Sub',
            'Modal Interchange', 'Chromatic/Pivot', 'Other'
        ];

        return order.filter(func => functions.includes(func))
            .concat(functions.filter(func => !order.includes(func)));
    }

    /**
     * Get note roles in chord
     */
    getNoteRoles(chordNotes, rootNote) {
        const semitones = chordNotes.map(note => this.musicTheory.noteValues[note]);
        const rootValue = this.musicTheory.noteValues[rootNote];
        
        const roles = {};
        semitones.forEach(semi => {
            const interval = (semi - rootValue + 12) % 12;
            switch (interval) {
                case 0: roles[this.musicTheory.semitoneToNote[semi]] = 'root'; break;
                case 3: roles[this.musicTheory.semitoneToNote[semi]] = 'minor third'; break;
                case 4: roles[this.musicTheory.semitoneToNote[semi]] = 'major third'; break;
                case 7: roles[this.musicTheory.semitoneToNote[semi]] = 'fifth'; break;
                case 8: roles[this.musicTheory.semitoneToNote[semi]] = 'minor sixth'; break;
                case 9: roles[this.musicTheory.semitoneToNote[semi]] = 'major sixth'; break;
                case 10: roles[this.musicTheory.semitoneToNote[semi]] = 'minor seventh'; break;
                case 11: roles[this.musicTheory.semitoneToNote[semi]] = 'major seventh'; break;
                case 1: case 2: roles[this.musicTheory.semitoneToNote[semi]] = 'extension'; break;
                case 5: case 6: roles[this.musicTheory.semitoneToNote[semi]] = 'extension'; break;
            }
        });
        return roles;
    }

    /**
     * Classify chord function
     */
    classifyChordFunction(chord, key, scale) {
        const scaleNotes = this.musicTheory.getScaleNotes(key, scale);
        const scaleDegrees = this.musicTheory.getScaleDegrees();
        
        // Find which scale degree matches the chord root
        const rootIndex = scaleNotes.indexOf(chord.root);
        if (rootIndex === -1) return 'chromatic';
        
        const degree = scaleDegrees[rootIndex];
        
        // Classify based on scale degree
        switch(degree) {
            case 'I': return 'tonic';
            case 'ii': case 'IV': return 'predominant';
            case 'V': case 'vii': return 'dominant';
            case 'iii': case 'vi': return 'tonic';
            default: return 'other';
        }
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        this.resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <div class="empty-title">No chords found</div>
                <div class="empty-description">Select some notes to see containing chords</div>
            </div>
        `;
    }

    /**
     * Set notes for analysis
     */
    setNotes(notes, key = null, scale = null) {
        this.analyzeChords(notes, key, scale);
    }

    /**
     * Get current analysis state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get container DOM element
     */
    getElement() {
        return this.containerElement;
    }

    /**
     * Mount to container
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) return;
        
        this.container = container;
        this.render();
    }

    /**
     * Render UI
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="chord-analyzer-ui">
                <h3>Chord Analyzer</h3>
                <div class="chord-input">
                    <input type="text" id="chord-notes-input" placeholder="Enter notes (C E G)">
                    <button class="btn" id="analyze-btn">Analyze</button>
                </div>
                <div class="results-container"></div>
            </div>
        `;
        
        document.getElementById('analyze-btn').addEventListener('click', () => {
            const notes = document.getElementById('chord-notes-input').value
                .split(' ')
                .filter(n => n.trim());
            if (notes.length > 0) {
                this.analyzeChords(notes, this.state.currentKey, this.state.currentScale);
            }
        });
    }

    /**
     * Unmount from container
     */
    unmount() {
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordAnalyzer;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.ChordAnalyzer = ChordAnalyzer;
}
