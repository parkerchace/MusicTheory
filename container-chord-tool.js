/**
 * CONTAINER CHORD TOOL MODULE
 *
 * Specialized tool for finding chords that contain specific notes
 * with advanced filtering and visualization
 *
 * Features:
 * - Input for multiple notes
 * - Scale/key context
 * - Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)
 * - Detailed chord information display
 * - Piano visualization integration
 */

class ContainerChordTool {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ContainerChordTool requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            inputNotes: [],
            selectedNote: '',
            currentKey: 'C',
            currentScale: 'major',
            results: [],
            selectedChord: null,
            filter: 'all',
            preferredNotes: [],
            openRoles: new Set(),
            multiGroupMode: 'fit', // 'fit' | 'root' | 'family'
            openGroups: new Set()
        };

        this.listeners = new Map();
        this.containerElement = null;
    }

    /**
     * Normalize a user-entered note token into canonical spelling.
     * Accepts: 'Bb', 'bb', 'BB', 'A#', 'A♯', 'Ab', 'A♭', etc.
     */
    normalizeNoteToken(tok) {
        if (!tok) return '';
        let s = String(tok).trim();
        s = s.replace(/[♯]/g, '#').replace(/[♭]/g, 'b');
        // Handle cases like 'BB' (treat second 'B' as flat)
        const m = s.match(/^([A-Ga-g])([#bB])?$/);
        if (!m) return '';
        const letter = m[1].toUpperCase();
        let acc = m[2] || '';
        if (acc === 'B') acc = 'b';
        return letter + acc;
    }

    /**
     * Get semitone integer for a note using engine mapping
     */
    noteToSemi(note) {
        return this.musicTheory && this.musicTheory.noteValues ? this.musicTheory.noteValues[note] : undefined;
    }

    /**
     * Get all enharmonic equivalents for a given note name using engine mapping
     */
    getEnharmonics(note) {
        const v = this.noteToSemi(note);
        if (v === undefined) return [note];
        const out = [];
        try {
            Object.entries(this.musicTheory.noteValues).forEach(([n, val]) => { if (val === v) out.push(n); });
        } catch(_){ return [note]; }
        return Array.from(new Set(out));
    }

    /**
     * Set input notes
     */
    setInputNotes(notes) {
        const arr = Array.isArray(notes) ? notes : [];
        // Normalize notes and remove empties
        const clean = arr.map(n => this.normalizeNoteToken(n))
                        .filter(Boolean);
        // Keep order but remove exact duplicates
        const seen = new Set();
        const unique = clean.filter(n => (seen.has(n) ? false : (seen.add(n), true)));
        this.state.inputNotes = unique;
        // When explicitly setting multiple notes, clear single-note focus
        if (unique.length !== 1) this.state.selectedNote = '';
        this.analyze();
    }

    /**
     * Set key and scale context
     */
    setKeyAndScale(key, scale) {
        this.state.currentKey = key;
        this.state.currentScale = scale;
        this.analyze();
    }

    /**
     * Set a single selected note directly (from number generator or UI)
     */
    setSelectedNote(note) {
        this.state.selectedNote = note || '';
        this.state.inputNotes = this.state.selectedNote ? [this.state.selectedNote] : [];
        // Default state: all collapsed
        this.state.openRoles = new Set();
        this.analyze();
    }

    /**
     * Set preferred notes (e.g., generated notes) to bias sorting
     */
    setPreferredNotes(notes = []) {
        // Normalize to objects { note, degree }
        const arr = Array.isArray(notes) ? notes : [];
        this.state.preferredNotes = arr.map(n => {
            if (typeof n === 'string') return { note: n, degree: null };
            if (n && typeof n === 'object') {
                const note = n.note || n.n || n.value || '';
                const degree = n.degree != null ? n.degree : (n.d != null ? n.d : null);
                return { note, degree };
            }
            return { note: String(n || ''), degree: null };
        });
        // resort only
        this.render();
    }

    /**
     * Set filter
     */
    setFilter(filter) {
        this.state.filter = filter;
        this.render();
    }

    /**
     * Analyze container chords
     */
    analyze() {
        const input = this.state.selectedNote ? [this.normalizeNoteToken(this.state.selectedNote)] : (this.state.inputNotes || []).map(n=>this.normalizeNoteToken(n));
        if (!input || input.length === 0) {
            this.state.results = [];
            this.render();
            return;
        }

        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);
        // Expand search set to include enharmonic equivalents so the engine can match by name
        const expanded = Array.from(new Set(input.flatMap(n => this.getEnharmonics(n))));
        let results = this.musicTheory.findAllContainerChords(expanded, scaleNotes) || [];
        // Ensure multi-note queries only keep chords that contain ALL requested notes
        if (input.length > 1) {
            // Compare by semitone value to respect enharmonic equivalence
            results = results.filter(ch => {
                if (!Array.isArray(ch.chordNotes)) return false;
                const chordSemis = new Set(ch.chordNotes.map(n => this.noteToSemi(n)));
                return input.every(n => {
                    const enh = this.getEnharmonics(n);
                    return enh.some(e => chordSemis.has(this.noteToSemi(e)));
                });
            });
        }
        this.state.results = results;
        
        // Sort by complexity and scale match
        this.state.results.sort((a, b) => this.rankChord(b) - this.rankChord(a));

        this.emit('analysisUpdated', { results: this.state.results });
        this.render();
    }

    /**
     * Change multi-note grouping mode
     */
    setMultiGroupMode(mode) {
        const valid = new Set(['fit','root','family']);
        if (!valid.has(mode)) return;
        this.state.multiGroupMode = mode;
        // reset openGroups to avoid stale ids
        this.state.openGroups = new Set();
        this.render();
    }

    /**
     * Determine if an interval above a root is in the current key/scale
     */
    intervalInScale(root, semitones) {
        try {
            const note = this.musicTheory.getNoteFromInterval(root, semitones);
            const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
            return scaleNotes.includes(note);
        } catch(_) { return false; }
    }

    /**
     * Generate intelligent chord variations (extensions/alterations/variants)
     * Returns array of { fullName, root, chordType, chordNotes, scaleMatchPercent, label, reason }
     */
    generateChordVariations(baseChord) {
        const out = [];
        if (!baseChord || !baseChord.root) return out;
        const root = baseChord.root;
        const type = baseChord.chordType || '';
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];

        const pushIfValid = (t, label, reason) => {
            try {
                const notes = this.musicTheory.getChordNotes(root, t) || [];
                if (!notes.length) return;
                const match = Math.round((notes.filter(n => scaleNotes.includes(n)).length / notes.length) * 100);
                out.push({
                    fullName: root + t,
                    root,
                    chordType: t,
                    chordNotes: notes,
                    scaleMatchPercent: match,
                    label,
                    reason
                });
            } catch(_) {}
        };

        const inScale = (semi) => this.intervalInScale(root, semi);
        const has29 = inScale(2);
        const has11 = inScale(5);
        const hasSharp11 = inScale(6);
        const has13 = inScale(9);

        const isMajTriad = /^maj$/.test(type) || (type === '' && true);
        const isMaj7 = /maj7/.test(type);
        const isMinorTriad = /^m$/.test(type);
        const isMinor7 = /^m7($|[^a-zA-Z])/.test(type);
        const isDom7 = /^7($|[^a-zA-Z])/.test(type);
        const isSus = /sus/.test(type);
        const isDim = /^dim$/.test(type);
        const isDim7 = /^dim7$/.test(type);
        const isHalfDim = /m7b5|ø/.test(type);
        const isAug = /^aug$/.test(type) || /#5/.test(type);

        // Major family
        if (isMajTriad) {
            pushIfValid('6', '6', 'Warm color tone');
            if (has29) pushIfValid('maj9', 'maj9', 'Add 9 (in-scale)');
            if (!has29) pushIfValid('maj7', 'maj7', 'Tonic color');
            if (has13) pushIfValid('maj13', 'maj13', 'Lush major 13');
            if (hasSharp11) pushIfValid('maj7#11', 'maj7#11', 'Lydian color (#11)');
        }
        if (isMaj7) {
            if (has29) pushIfValid('maj9', '→ 9', 'Add 9 (in-scale)');
            if (has13) pushIfValid('maj13', '→ 13', 'Add 13 (in-scale)');
            if (hasSharp11) pushIfValid('maj7#11', '#11', 'Lydian color');
        }

        // Minor family
        if (isMinorTriad) {
            pushIfValid('m6', 'm6', 'Minor 6 color');
            pushIfValid('m7', 'm7', 'Jazz minor 7');
            if (has29) pushIfValid('m9', 'm9', 'Add 9 (in-scale)');
            if (has11) pushIfValid('m11', 'm11', 'Quartal flavor');
            if (has13) pushIfValid('m13', 'm13', 'Extended minor');
            pushIfValid('mMaj7', 'mMaj7', 'Melodic minor tonic');
        }
        if (isMinor7) {
            if (has29) pushIfValid('m9', '→ 9', 'Add 9 (in-scale)');
            if (has11) pushIfValid('m11', '→ 11', 'Add 11 (in-scale)');
            if (has13) pushIfValid('m13', '→ 13', 'Add 13 (in-scale)');
            pushIfValid('m6', 'm6', 'Alternate color');
            pushIfValid('mMaj7', 'mMaj7', 'Melodic minor color');
        }

        // Dominant family
        if (isDom7) {
            if (has29) pushIfValid('9', '→ 9', 'In-scale 9');
            if (has13) pushIfValid('13', '→ 13', 'In-scale 13');
            if (hasSharp11) pushIfValid('7#11', '#11', 'Lydian dominant color');
            pushIfValid('7b9', '♭9', 'Altered tension');
            pushIfValid('7#9', '#9', 'Altered tension');
            pushIfValid('7b13', '♭13', 'Altered color');
            pushIfValid('7#5', '#5', 'Altered fifth');
            pushIfValid('7b5', '♭5', 'Altered fifth');
            pushIfValid('7sus4', 'sus4', 'Suspended dominant');
            pushIfValid('alt', 'alt', 'Super-Locrian tensions');
        }

        // Sus family
        if (isSus) {
            if (!/7sus4/.test(type)) pushIfValid('7sus4', '7sus4', 'Dominant suspension');
            if (isMajTriad) pushIfValid('sus2', 'sus2', 'Suspended color');
            if (isMajTriad) pushIfValid('sus4', 'sus4', 'Suspended color');
        }

        // Diminished / Half-diminished
        if (isHalfDim) {
            pushIfValid('dim7', 'dim7', 'Leading-tone color');
        }
        if (isDim) {
            pushIfValid('dim7', '→ dim7', 'Complete diminished');
        }

        // Augmented colors
        if (isAug) {
            pushIfValid('maj7#5', 'maj7#5', 'Augmented major color');
            pushIfValid('7#5', '7#5', 'Augmented dominant');
        }

        // De-dupe and remove base type
        const seen = new Set();
        const filtered = out.filter(v => {
            if (v.chordType === type) return false;
            const key = v.chordType + '|' + v.chordNotes.join('-');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by scale fit then by a small heuristic priority (extensions before heavy alterations)
        const weight = (t) => {
            if (/13/.test(t)) return 5;
            if (/11/.test(t)) return 4;
            if (/9/.test(t)) return 3;
            if (/6/.test(t)) return 2;
            if (/sus/.test(t)) return 1;
            if (/alt|#5|b5|b13|#11/.test(t)) return 0;
            return 0;
        };
        filtered.sort((a,b)=> (b.scaleMatchPercent - a.scaleMatchPercent) || (weight(b.chordType) - weight(a.chordType)));

        // Cap to keep UI compact
        return filtered.slice(0, 8);
    }

    /**
     * Grouping helpers for multi-note mode
     */
    getIntervalRole(interval) {
        switch (interval) {
            case 0: return 'root';
            case 3: return 'm3';
            case 4: return 'M3';
            case 7: return '5';
            case 10: return 'b7';
            case 11: return 'maj7';
            case 2: return '9';
            case 5: return '11';
            case 6: return '#11/b5';
            case 8: return '#5/b13';
            case 9: return '13';
            case 1: return 'b9';
            default: return 'ext';
        }
    }

    classifyFamily(chordType='') {
        const t = String(chordType);
        if (/alt/.test(t)) return 'Altered';
        if (/sus/.test(t)) return 'Suspended';
        if (/dim7/.test(t) || /dim/.test(t) || /m7b5|ø/.test(t)) return 'Diminished';
        if (/aug|#5/.test(t)) return 'Augmented';
        if (/^7($|[^a-zA-Z])/.test(t)) return 'Dominant';
        if (/^m/.test(t)) return 'Minor';
        if (/maj/.test(t) || t === '' || /^maj/.test(t)) return 'Major';
        return 'Other';
    }

    groupByFit(results) {
        const key = this.state.currentKey;
        const scale = this.state.currentScale;
        const input = this.state.inputNotes || [];
        const groups = new Map();
        const bucketLabel = (extra) => extra <= 1 ? 'Tight fit (≤1 extra tone)' : extra <= 3 ? 'Balanced (2–3 extras)' : 'Rich (>3 extras)';

        results.forEach(ch => {
            // Count how many inputs are core vs extension in this chord
            let core = 0, ext = 0;
            input.forEach(n => {
                const iv = (this.musicTheory.noteValues[n] - this.musicTheory.noteValues[ch.root] + 12) % 12;
                const role = this.getIntervalRole(iv);
                if (['root','m3','M3','5','b7','maj7'].includes(role)) core++; else ext++;
            });
            const uniqueInputCount = input.length; // already unique
            const extra = Math.max(0, (ch.chordNotes?.length || 0) - uniqueInputCount);
            const label = bucketLabel(extra);
            if (!groups.has(label)) groups.set(label, []);
            groups.get(label).push({ chord: ch, metrics: { core, ext, extra } });
        });

        // Sort groups by desirability: Tight, Balanced, Rich
        const order = ['Tight fit (≤1 extra tone)','Balanced (2–3 extras)','Rich (>3 extras)'];
        const sorted = order.filter(l => groups.has(l)).map(l => [l, groups.get(l)]);
        // Sort within group: more core matches, higher scale fit, then rankChord
        sorted.forEach(([label, arr]) => {
            arr.sort((a,b)=> (b.metrics.core - a.metrics.core) || (b.chord.scaleMatchPercent - a.chord.scaleMatchPercent) || (this.rankChord(b.chord) - this.rankChord(a.chord)));
        });
        return sorted; // array of [label, entries]
    }

    groupByRoot(results) {
        const groups = new Map();
        results.forEach(ch => {
            const label = ch.root;
            if (!groups.has(label)) groups.set(label, []);
            groups.get(label).push({ chord: ch, metrics: {} });
        });
        const sorted = Array.from(groups.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
        sorted.forEach(([label, arr]) => arr.sort((x,y)=> this.rankChord(y.chord) - this.rankChord(x.chord)));
        return sorted;
    }

    groupByFamily(results) {
        const groups = new Map();
        results.forEach(ch => {
            const fam = this.classifyFamily(ch.chordType);
            if (!groups.has(fam)) groups.set(fam, []);
            groups.get(fam).push({ chord: ch, metrics: {} });
        });
        const order = ['Major','Minor','Dominant','Suspended','Altered','Augmented','Diminished','Other'];
        const sorted = order.filter(f => groups.has(f)).map(f => [f, groups.get(f)]);
        sorted.forEach(([label, arr]) => arr.sort((x,y)=> this.rankChord(y.chord) - this.rankChord(x.chord)));
        return sorted;
    }

    /**
     * Select a chord
     */
    selectChord(chord) {
        this.state.selectedChord = chord;
        this.emit('chordSelected', { chord });
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
     * Role name for the selected note relative to a chord root
     */
    getSelectedNoteRole(chord) {
        const note = this.state.selectedNote;
        if (!note) return 'other';
        const rootVal = this.musicTheory.noteValues[chord.root];
        const noteVal = this.musicTheory.noteValues[note];
        if (rootVal === undefined || noteVal === undefined) return 'other';
        const iv = (noteVal - rootVal + 12) % 12;
        switch (iv) {
            case 0: return 'root';
            case 1: return 'b9';
            case 2: return '2/9';
            case 3: return 'minor third';
            case 4: return 'major third';
            case 5: return '4/11';
            case 6: return 'b5/#11';
            case 7: return '5';
            case 8: return '#5/b13';
            case 9: return '6/13';
            case 10: return 'b7';
            case 11: return 'maj7';
            default: return 'other';
        }
    }

    /**
     * Rank chord for sorting (higher is better)
     */
    rankChord(chord) {
        const diatonic = chord.scaleMatchPercent === 100 ? 1 : 0;
        const complexity = chord.complexity === 'seventh' ? 2 : chord.complexity === 'triad' ? 1 : 0; // prefer sevenths, then triads, then extended
        const preferredList = (this.state.preferredNotes || []).map(p => p && p.note ? p.note : p);
        const preferredMatch = preferredList.reduce((acc, n) => acc + (chord.chordNotes.includes(n) ? 1 : 0), 0);
        // light preference for certain types when selected note is root
        let typeBoost = 0;
        const role = this.getSelectedNoteRole(chord);
        if (role === 'root') {
            // Strongly prefer the diatonic chord for this root in current key/scale
            try {
                const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                const idx = scaleNotes.indexOf(this.state.selectedNote);
                if (idx >= 0) {
                    const degree = idx + 1;
                    const diat = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                    if (diat && diat.root === chord.root && diat.chordType === chord.chordType) {
                        typeBoost += 1000; // ensure top of the Root group
                    }
                }
            } catch (e) {}
            // Additional mild preferences when not diatonic match
            if (/^6$/.test(chord.chordType)) typeBoost += 2;
            if (/maj7/i.test(chord.chordType)) typeBoost += 1; // small
        }
        return diatonic * 100 + complexity * 10 + preferredMatch + typeBoost;
    }

    /**
     * Get color-coded grade for how well a chord fits the current context
     */
    getChordGrade(chord) {
        const role = this.getSelectedNoteRole(chord);
        const isDiatonic = chord.scaleMatchPercent === 100;
        const isFunctional = chord.functions && chord.functions.length > 0;
        
        // Check if this is THE diatonic chord for this root
        let isDiatonicRootChord = false;
        if (role === 'root' && isDiatonic) {
            try {
                const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                const idx = scaleNotes.indexOf(this.state.selectedNote);
                if (idx >= 0) {
                    const degree = idx + 1;
                    const diat = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                    if (diat && diat.root === chord.root && diat.chordType === chord.chordType) {
                        isDiatonicRootChord = true;
                    }
                }
            } catch (e) {}
        }

        if (isDiatonicRootChord) {
            return { class: 'grade-perfect', label: '★★★ Perfect', color: '#10b981', short: '★★★' };
        } else if (isDiatonic && isFunctional) {
            return { class: 'grade-excellent', label: '★★ Excellent', color: '#0ea5e9', short: '★★' };
        } else if (isDiatonic) {
            return { class: 'grade-good', label: '★ Good', color: '#f59e0b', short: '★' };
        } else if (isFunctional) {
            return { class: 'grade-fair', label: 'Fair', color: '#8b5cf6', short: '◐' };
        } else {
            return { class: 'grade-weak', label: 'Experimental', color: '#6b7280', short: '○' };
        }
    }

    /**
     * Get movement/resolution suggestions for a chord
     */
    getChordMovements(chord) {
        const movements = [];
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
        
        // Add function-based resolutions from the chord analysis
        if (chord.resolutions && chord.resolutions.length > 0) {
            chord.resolutions.forEach(res => {
                if (res !== '—' && res !== 'contextual') {
                    movements.push(`In ${this.state.currentKey}: ${res}`);
                }
            });
        }

        // Add generic movement patterns based on chord quality
        const type = chord.chordType || '';
        if (/^maj7/.test(type)) {
            movements.push('→ related ii-V, → subdominant area');
        } else if (/^7(?!maj)/.test(type)) {
            movements.push('→ resolves down 5th (or up 4th)');
        } else if (/^m7/.test(type)) {
            movements.push('→ dominant 7th (ii-V motion)');
        } else if (/dim7/.test(type)) {
            movements.push('→ resolves up half-step');
        } else if (/ø|m7b5/.test(type)) {
            movements.push('→ dominant 7th (half-dim function)');
        }

        // Add chromatic/modal movement if not diatonic
        if (chord.scaleMatchPercent < 100) {
            const rootSemi = this.musicTheory.noteValues[chord.root];
            const keySemi = this.musicTheory.noteValues[this.state.currentKey];
            const interval = (rootSemi - keySemi + 12) % 12;
            
            if (interval === 1) movements.push('→ bII (tritone sub) moves to I or V');
            if (interval === 8) movements.push('→ bVI (modal interchange) to V or I');
            if (interval === 10) movements.push('→ bVII (modal) to I');
            if (interval === 3) movements.push('→ bIII (modal) to IV or I');
        }

        return movements.length > 0 ? movements : ['Flexible - use contextually'];
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
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    /**
     * Mount to DOM container
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) return;
        
        this.containerElement = container;
        this.render();
    }

    /**
     * Render UI
     */
    render() {
        if (!this.containerElement) return;
        
        // Filter results
        let filteredResults = this.state.results;
        if (this.state.filter === 'scale') {
            filteredResults = filteredResults.filter(chord => chord.scaleMatchPercent === 100);
        }
        const isMulti = !this.state.selectedNote && Array.isArray(this.state.inputNotes) && this.state.inputNotes.length > 1;

        // Group by selected note role (single-note mode only)
        const groups = new Map();
        if (!isMulti) {
            filteredResults.forEach(chord => {
                const role = this.getSelectedNoteRole(chord);
                if (!groups.has(role)) groups.set(role, []);
                groups.get(role).push(chord);
            });
        }

        // Dynamic role ordering based on harmonic progression likelihood
        const getProgressionScore = (role) => {
            // Get selected note's degree in current scale
            const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
            const selectedDegree = scaleNotes.indexOf(this.state.selectedNote) + 1;
            
            // Compute the root for this role
            const roleToDownSemis = (r) => {
                const map = {'root':0,'2/9':2,'minor third':3,'major third':4,'4/11':5,'b5/#11':6,'5':7,'#5/b13':8,'6/13':9,'b7':10,'maj7':11,'b9':1};
                return map[r] ?? null;
            };
            const down = roleToDownSemis(role);
            if (down == null) return 0;
            
            let rootNote = '';
            try {
                rootNote = this.musicTheory.getNoteFromInterval(this.state.selectedNote, -down);
            } catch(e) { return 0; }
            
            const rootDegree = scaleNotes.indexOf(rootNote) + 1;
            if (!rootDegree) return 0; // Not in scale
            
            // Score based on common progressions from selected note's diatonic position
            // Higher score = more likely next chord
            let score = 0;
            
            // If selected note is root of a diatonic chord, prioritize common resolutions
            if (role === 'root') score += 100; // Always show root options prominently
            
            // Common progression patterns (selected degree → target degree)
            const progressionMap = {
                1: {1:50, 4:30, 5:40, 6:20}, // I → I, IV, V, vi
                2: {5:50, 1:20},              // ii → V, I
                3: {6:40, 4:30, 2:20},        // iii → vi, IV, ii
                4: {1:40, 5:50, 2:30},        // IV → I, V, ii
                5: {1:60, 6:30},              // V → I (strong), vi (deceptive)
                6: {2:40, 4:30, 5:20},        // vi → ii, IV, V
                7: {1:60, 3:20}               // vii° → I (strong)
            };
            
            if (selectedDegree && progressionMap[selectedDegree]) {
                score += progressionMap[selectedDegree][rootDegree] || 0;
            }
            
            // Boost for fifth relationship (dominant to tonic)
            if (selectedDegree === 5 && rootDegree === 1) score += 50;
            // Boost for ii-V relationship
            if (selectedDegree === 2 && rootDegree === 5) score += 40;
            // Boost for subdominant to tonic
            if (selectedDegree === 4 && rootDegree === 1) score += 30;
            
            return score;
        };
        
        // Sort groups by progression likelihood
    const sortedRoles = Array.from(groups.keys()).sort((a,b)=> getProgressionScore(b) - getProgressionScore(a));

        // Sort chords within groups
        sortedRoles.forEach(role => {
            groups.get(role).sort((a,b)=> this.rankChord(b) - this.rankChord(a));
        });

        // Build generated notes bubble UI (preserve sequence order, include duplicates)
        const bubbles = (this.state.preferredNotes || []).map(p => {
            const note = p && p.note ? p.note : String(p);
            const deg = p && (p.degree || p.degree === 0) ? p.degree : '';
            const label = `${deg ? deg + ' ' : ''}${note}`;
            const isActive = this.state.selectedNote ? (this.state.selectedNote === note) : this.state.inputNotes.includes(note);
            const activeClass = isActive ? 'style="outline:2px solid rgba(59,130,246,0.9); outline-offset:2px;"' : '';
            return `<button class="gen-note-bubble" data-note="${note}" ${activeClass} title="Click to toggle ${note} for multi-note search; Alt-click to make it the only note">☁️ ${label}</button>`;
        }).join(' ');

        // Friendly labels for role headers
        // Map role -> semitone distance DOWN from selected note to reach the chord root
        const roleToDownSemis = (role) => {
            switch (role) {
                case 'root': return 0;
                case '2/9': return 2;     // selected = root + 2
                case 'minor third': return 3;
                case 'major third': return 4;
                case '4/11': return 5;
                case 'b5/#11': return 6;
                case '5': return 7;
                case '#5/b13': return 8;
                case '6/13': return 9;
                case 'b7': return 10;
                case 'maj7': return 11;
                case 'b9': return 1;
                default: return null;
            }
        };

        const enharmonicAlt = (note) => {
            const map = {
                'C#':'Db','Db':'C#', 'D#':'Eb','Eb':'D#', 'F#':'Gb','Gb':'F#',
                'G#':'Ab','Ab':'G#', 'A#':'Bb','Bb':'A#'
            };
            return map[note] || note;
        };

        const computeRoleRoot = (role) => {
            const selected = this.state.selectedNote;
            const down = roleToDownSemis(role);
            if (!selected || down == null) return '';
            try {
                // Move DOWN by semitones to get the root
                const rootCandidate = this.musicTheory.getNoteFromInterval(selected, -down);
                const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                if (scaleNotes.includes(rootCandidate)) return rootCandidate;
                const alt = enharmonicAlt(rootCandidate);
                return alt;
            } catch (e) {
                return '';
            }
        };

        const displayRole = (role) => {
            const label = (() => {
                switch (role) {
                    case 'root': return 'ROOT';
                    case 'major third': return 'MAJOR THIRD';
                    case 'minor third': return 'MINOR THIRD';
                    case '5': return 'FIFTH';
                    case '2/9': return 'SUS2 / 9TH';
                    case '4/11': return 'SUS4 / 11TH';
                    case '6/13': return '6TH / 13TH';
                    case 'maj7': return 'MAJOR 7TH';
                    case 'b7': return '7TH (♭7)';
                    case 'b5/#11': return '♭5 / #11';
                    case '#5/b13': return '#5 / ♭13';
                    case 'b9': return '♭9';
                    default: return role.toUpperCase();
                }
            })();
            const rootForRole = computeRoleRoot(role);
            return rootForRole ? `${label} (${rootForRole})` : label;
        };

        // Small helpers to render repeated UI fragments safely
        const renderVariants = (chord, grade) => {
            const vars = this.generateChordVariations(chord);
            if (!vars || !vars.length) return '';
            return `
                <div class="chord-variants" style="margin-top:6px;">
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:4px;">Variations:</div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:6px;">
                        ${vars.map(v => `
                            <button class="chord-var-option" data-root="${v.root}" data-type="${v.chordType}" title="${v.reason} · ${v.chordNotes.join(' ')}" 
                                style="padding:6px 8px; text-align:left; border:1px solid var(--border-color); border-left:3px solid ${grade.color}; background: var(--background-color); border-radius:4px; cursor:pointer; font-size:0.75rem;">
                                <div style="display:flex; justify-content:space-between; gap:6px; align-items:center;">
                                    <span style="font-weight:600;">${v.fullName}</span>
                                    <span style="font-size:0.65rem; color:${grade.color};">${v.scaleMatchPercent === 100 ? '★★★' : v.scaleMatchPercent >= 75 ? '★★' : v.scaleMatchPercent >= 50 ? '★' : '◐'}</span>
                                </div>
                                <div style="font-size:0.65rem; color:var(--text-secondary);">${v.reason}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>`;
        };

        const renderChordCard = (chord) => {
            const grade = this.getChordGrade(chord);
            const movements = this.getChordMovements(chord);
            return `
                <div class="chord-result ${this.state.selectedChord && this.state.selectedChord.fullName===chord.fullName ? 'selected' : ''}" data-chord="${chord.fullName}" style="padding:8px; border:1px solid var(--border-color); border-left:4px solid ${grade.color}; border-radius:4px; margin:6px 0; background: var(--background-color);">
                    <div class="chord-header" style="display:flex; justify-content: space-between; align-items:center; margin-bottom:4px;">
                        <span class="chord-name" style="font-weight:600; font-size:0.875rem;">${chord.fullName}</span>
                        <span class="chord-grade ${grade.class}" style="color:${grade.color}; font-size:0.75rem;" title="${grade.label}">${grade.short}</span>
                    </div>
                    <div class="chord-notes" style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">Notes: ${chord.chordNotes.join(', ')}</div>
                    <div class="chord-movements" style="font-size:0.7rem; color:var(--text-secondary); font-style:italic; padding:4px 0; border-top:1px solid var(--border-color);">
                        ${movements.map(m => `<div style="margin:2px 0;">• ${m}</div>`).join('')}
                    </div>
                    ${renderVariants(chord, grade)}
                </div>`;
        };

        const renderSingle = () => {
            if (sortedRoles.length === 0 && this.state.selectedNote) {
                return `<div style="padding:20px; text-align:center; color:var(--text-secondary);">No chords found containing ${this.state.selectedNote}. Try clicking a different note bubble or typing a note in the current scale.</div>`;
            }
            return sortedRoles.map(role => `
                <div class="role-group" data-role="${role}">
                    <div class="role-header" style="cursor:pointer; padding:6px; border-bottom: 1px solid var(--border-color); display:flex; justify-content: space-between; align-items:center;">
                        <span>${displayRole(role)} <small style="color:var(--text-secondary)">(${groups.get(role).length})</small></span>
                        <button class="btn toggle-group" data-role="${role}">${this.state.openRoles.has(role) ? 'Collapse' : 'Expand'}</button>
                    </div>
                    <div class="role-content ${this.state.openRoles.has(role) ? '' : 'hidden'}" data-role="${role}">
                        ${groups.get(role).map(chord => renderChordCard(chord)).join('')}
                    </div>
                </div>
            `).join('');
        };

        const buildGrouped = () => {
            if (this.state.multiGroupMode === 'root') return this.groupByRoot(filteredResults);
            if (this.state.multiGroupMode === 'family') return this.groupByFamily(filteredResults);
            return this.groupByFit(filteredResults);
        };

        const renderMulti = () => {
            const grouped = buildGrouped();
            return `
                <div class="multi-groups">
                    ${grouped.map(([label, entries]) => {
                        const open = this.state.openGroups.has(label);
                        return `
                            <div class="mg-section" data-group-label="${label}">
                                <div class="mg-header" style="cursor:pointer; padding:6px; border-bottom: 1px solid var(--border-color); display:flex; justify-content: space-between; align-items:center;">
                                    <span><strong>${label}</strong> <small style="color:var(--text-secondary)">(${entries.length})</small></span>
                                    <button class="btn mg-toggle" data-label="${label}">${open ? 'Collapse' : 'Expand'}</button>
                                </div>
                                <div class="mg-content ${open ? '' : 'hidden'}" data-label="${label}">
                                    ${entries.map(({chord}) => renderChordCard(chord)).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };

        this.containerElement.innerHTML = `
            <div class="container-chord-tool">
                <h3>Container Chord Finder</h3>
                <div class="generated-notes" style="display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 8px 0;">
                    ${bubbles || '<span style="color:var(--text-secondary); font-size:0.85rem;">No generated notes yet</span>'}
                </div>
                <div class="input-area">
                    <input type="text" id="note-input" placeholder="Enter notes: C E G or F, A, C" 
                           value="${(this.state.selectedNote || (this.state.inputNotes || []).join(' '))}" style="min-width:220px;">
                    <button class="btn" id="find-chords-btn" title="Analyze chords containing all entered notes">Find Chords</button>
                    <button class="btn" id="clear-notes-btn" title="Clear selection">Clear</button>
                </div>
                <div class="filter-bar">
                    <button class="filter-btn ${this.state.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                    <button class="filter-btn ${this.state.filter === 'scale' ? 'active' : ''}" data-filter="scale">In Scale</button>
                </div>
                <div style="margin:8px 0; padding:8px; background:var(--surface-color); border-radius:4px; font-size:0.7rem; color:var(--text-secondary);">
                    <strong>Grade key:</strong> 
                    <span style="color:#10b981;">★★★ Perfect</span> (diatonic scale chord) · 
                    <span style="color:#0ea5e9;">★★ Excellent</span> (in-scale functional) · 
                    <span style="color:#f59e0b;">★ Good</span> (in-scale) · 
                    <span style="color:#8b5cf6;">◐ Fair</span> (chromatic functional) · 
                    <span style="color:#6b7280;">○ Experimental</span> (chromatic)
                </div>
                <div class="results-area">
                    ${this.state.selectedNote ? `<div style="margin-bottom:8px; font-size:0.875rem; color:var(--text-secondary);">Showing chords containing <strong>${this.state.selectedNote}</strong> in ${this.state.currentKey} ${this.state.currentScale}</div>` : ''}
                    ${isMulti ? `<div style=\"margin-bottom:8px; font-size:0.875rem; color:var(--text-secondary);\">Showing chords containing <strong>${this.state.inputNotes.join(', ')}</strong> in ${this.state.currentKey} ${this.state.currentScale}</div>` : ''}
                    ${isMulti ? `
                        <div class="multi-group-controls" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin:6px 0 8px 0;">
                            <span style="font-size:0.75rem; color:var(--text-secondary);">Group by:</span>
                            <button class="btn mg-btn ${this.state.multiGroupMode==='fit' ? 'btn-primary' : ''}" data-mode="fit">Fit</button>
                            <button class="btn mg-btn ${this.state.multiGroupMode==='root' ? 'btn-primary' : ''}" data-mode="root">Root</button>
                            <button class="btn mg-btn ${this.state.multiGroupMode==='family' ? 'btn-primary' : ''}" data-mode="family">Family</button>
                        </div>
                    ` : ''}
                    ${isMulti ? renderMulti() : renderSingle()}
                </div>
            </div>
        `;

        // Event listeners
        const findBtn = this.containerElement.querySelector('#find-chords-btn');
        if (findBtn) {
            findBtn.addEventListener('click', () => {
                const raw0 = String(this.containerElement.querySelector('#note-input').value || '').trim();
                const norm = raw0.replace(/[\s,;]+/g, ' ').split(' ')
                    .map(tok => this.normalizeNoteToken(tok))
                    .filter(Boolean);
                if (norm.length <= 1) {
                    this.setSelectedNote(norm[0] || '');
                } else {
                    this.setInputNotes(norm);
                }
                setTimeout(() => {
                    const ra = this.containerElement.querySelector('.results-area');
                    if (ra && ra.scrollIntoView) ra.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 0);
            });
        }

        const clearBtn = this.containerElement.querySelector('#clear-notes-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.selectedNote = '';
                this.state.inputNotes = [];
                this.analyze();
            });
        }

        // Clickable generated bubbles
        this.containerElement.querySelectorAll('.generated-notes .gen-note-bubble').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const note = btn.getAttribute('data-note');
                if (!note) return;
                if (ev.altKey) {
                    // Alt-click: make it the only selected note (single-note mode)
                    this.setSelectedNote(note);
                } else {
                    // Toggle in multi-note selection
                    const set = new Set(this.state.inputNotes);
                    if (set.has(note)) set.delete(note); else set.add(note);
                    const arr = Array.from(set);
                    if (arr.length === 1) {
                        this.setSelectedNote(arr[0]);
                    } else {
                        this.setInputNotes(arr);
                    }
                }
                setTimeout(() => {
                    const ra = this.containerElement.querySelector('.results-area');
                    if (ra && ra.scrollIntoView) ra.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 0);
            });
        });

        this.containerElement.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        this.containerElement.querySelectorAll('.toggle-group').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.getAttribute('data-role');
                const content = this.containerElement.querySelector(`.role-content[data-role="${role}"]`);
                if (content) {
                    const willOpen = content.classList.contains('hidden');
                    content.classList.toggle('hidden');
                    if (willOpen) this.state.openRoles.add(role); else this.state.openRoles.delete(role);
                    btn.textContent = willOpen ? 'Collapse' : 'Expand';
                }
            });
        });

        // Multi-grouping controls (multi-note mode)
        this.containerElement.querySelectorAll('.mg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.setMultiGroupMode(mode);
            });
        });

        this.containerElement.querySelectorAll('.mg-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.getAttribute('data-label');
                const content = this.containerElement.querySelector(`.mg-content[data-label="${label}"]`);
                if (content) {
                    const willOpen = content.classList.contains('hidden');
                    content.classList.toggle('hidden');
                    if (willOpen) this.state.openGroups.add(label); else this.state.openGroups.delete(label);
                    btn.textContent = willOpen ? 'Collapse' : 'Expand';
                }
            });
        });

        this.containerElement.querySelectorAll('.chord-result').forEach(el => {
            el.addEventListener('click', () => {
                const chord = this.state.results.find(c => c.fullName === el.dataset.chord);
                if (chord) {
                    this.selectChord(chord);
                    this.render();
                }
            });
        });

        // Variation buttons
        this.containerElement.querySelectorAll('.chord-var-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const root = btn.getAttribute('data-root');
                const type = btn.getAttribute('data-type');
                try {
                    const chordNotes = this.musicTheory.getChordNotes(root, type) || [];
                    const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                    const scaleMatchPercent = Math.round((chordNotes.filter(n => scaleNotes.includes(n)).length / chordNotes.length) * 100);
                    const chord = { fullName: root + type, root, chordType: type, chordNotes, scaleMatchPercent };
                    this.selectChord(chord);
                    // Visual feedback
                    btn.style.borderColor = 'var(--primary-color)';
                    setTimeout(()=> { btn.style.borderColor = 'var(--border-color)'; }, 250);
                } catch(_) {}
            });
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContainerChordTool;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.ContainerChordTool = ContainerChordTool;
}
