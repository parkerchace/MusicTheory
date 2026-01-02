/**
 * @module ProgressionBuilder
 * @description Generative chord progression builder with 2D control system (complexity × adventure)
 * @exports class ProgressionBuilder
 * @feature West-East axis: Chord Complexity (triads to 13th chords)
 * @feature North-South axis: Harmonic Adventure (diatonic to chromatic)
 * @feature Secondary dominants and tritone substitutions
 * @feature Modal interchange and chromatic mediants
 * @feature Voice leading optimization
 * @feature Interactive progression editing
 */

class ProgressionBuilder {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ProgressionBuilder requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            currentProgression: [],
            progressionMeta: [],
            currentKey: 'C',
            currentScale: 'major',
            complexity: 50,    // 0-100 (West-East: triad to 13th)
            gradeTier: 4,      // 0-4 (South-North: Experimental to Perfect)
            inputNumbers: [],
            generatedChords: [],
            generateMode: 'progression', // 'progression' | 'degree'
            generateIndex: 0,            // 0-based index when in degree mode
            exploreLogic: 'off',         // 'off' | 'functional' | 'voice_leading' | 'jazz' | 'smart'
            harmonizationMode: 'root', // 'melody' | 'harmony' | 'root' (default: root = Numbers as Root)
            melodyNotes: [],             // store melody notes when mode is 'melody'
            // Rule Flexibility (0 = strict, 100 = anarchic). Affects candidate selection randomness.
            ruleFlex: 20,
            // Toggle advanced sources of chords (disable to keep simpler palette)
            enableSecondaryDominants: true,
            enableBorrowedChords: true,
            enableTritoneSubs: true,
            enableChromaticMediants: true,
            // Occasionally allow selecting a lower-ranked candidate (if true)
            allowBentChoices: true
        };

        this.listeners = new Map();
        this.containerElement = null;
        this.numberGenerator = null;
        this.scaleLibrary = null;
        this.isDragging = false;

        // Subscribe to shared grading mode changes
        if (this.musicTheory.subscribe) {
            this.musicTheory.subscribe((event, data) => {
                if (event === 'gradingModeChanged') {
                    this.state.gradingType = data;
                    this.render();
                }
            });
            // Initialize state from engine
            this.state.gradingType = this.musicTheory.gradingMode;
        }
    }

    /**
     * Connect to other modules
     */
    connectModules(numberGenerator, scaleLibrary) {
        this.numberGenerator = numberGenerator;
        this.scaleLibrary = scaleLibrary;

        // Listen to number generator changes
        if (numberGenerator && numberGenerator.on) {
            numberGenerator.on('numbersChanged', (data) => {
                this.state.inputNumbers = data.numbers || [];
                this.generateProgression();
            });
        }

        // Listen to scale/key changes
        if (scaleLibrary && scaleLibrary.on) {
            scaleLibrary.on('scaleChanged', (data) => {
                this.state.currentKey = data.key;
                this.state.currentScale = data.scale;
                this.generateProgression();
            });
        }
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
                    console.error('Error in progression builder event listener:', error);
                }
            });
        }
    }

    /**
     * Generate progression based on current state
     */
    generateProgression() {
        const numbers = this.state.inputNumbers || [];
        if (numbers.length === 0) {
            this.state.currentProgression = [];
            this.state.progressionMeta = [];
            this.render();
            return;
        }

        // If lengths don't match, (re)build full progression to initialize
        const needFullBuild = this.state.currentProgression.length !== numbers.length;

        if (this.state.generateMode === 'degree' && !needFullBuild) {
            // Generate only targeted degree and reapply explore logic locally around it
            const inputIdx = Math.min(Math.max(0, this.state.generateIndex), numbers.length - 1);
            const degree = numbers[inputIdx];
            const chord = this.generateChordForDegree(degree, inputIdx);
            if (!chord) return;

            let progression = [...this.state.currentProgression];
            let meta = [...this.state.progressionMeta];

            // Map input index to expanded progression index (skip inserted items with degree=null)
            const expandedIdx = (() => {
                let count = 0;
                for (let i = 0; i < meta.length; i++) {
                    if (meta[i] && meta[i].degree != null) {
                        if (count === inputIdx) return i;
                        count++;
                    }
                }
                // Fallback: if not found, append
                return Math.min(inputIdx, progression.length - 1);
            })();

            // Replace at expandedIdx
            progression[expandedIdx] = chord.fullName;
            meta[expandedIdx] = {
                degree,
                complexity: this.state.complexity,
                gradeTier: this.state.gradeTier,
                chordType: chord.chordType,
                chordRoot: chord.root,
                chosenGrade: typeof chord.__grade === 'number' ? chord.__grade : undefined,
                isSubstitution: !!chord.__isSubstitution,
                functions: Array.isArray(chord.functions) ? chord.functions : undefined,
                scaleMatchPercent: typeof chord.scaleMatchPercent === 'number' ? chord.scaleMatchPercent : undefined
            };

            // Reapply explore logic locally: remove insertions around the changed degree and recompute
            const tags = new Set(['secondary_dominant', 'chromatic_mediant']);
            const prevDegIdx = (() => { for (let i = expandedIdx - 1; i >= 0; i--) if (meta[i] && meta[i].degree != null) return i; return null; })();
            const nextDegIdx = (() => { for (let i = expandedIdx + 1; i < meta.length; i++) if (meta[i] && meta[i].degree != null) return i; return null; })();

            const removeRange = (from, to) => {
                if (from == null || to == null) return;
                // Remove inserted entries strictly between from and to if tagged
                for (let i = to - 1; i > from; i--) {
                    const m = meta[i];
                    if (m && m.degree == null && Array.isArray(m.functions) && m.functions.some(f => tags.has(f))) {
                        meta.splice(i, 1);
                        progression.splice(i, 1);
                        if (expandedIdx > i) expandedIdx--; // maintain pointer
                        if (nextDegIdx != null && nextDegIdx > i) nextDegIdx--;
                    }
                }
            };
            removeRange(prevDegIdx, expandedIdx);
            removeRange(expandedIdx, nextDegIdx);

            // Insert according to exploreLogic for gaps (expandedIdx->next and prev->expandedIdx)
            const mode = this.state.exploreLogic || 'off';
            const mkMeta = (root, chordType, tag) => ({ degree: null, complexity: this.state.complexity, gradeTier: this.state.gradeTier, chordType, chordRoot: root, chosenGrade: undefined, isSubstitution: true, functions: [tag], scaleMatchPercent: undefined });
            const noteFromInterval = (root, semitones) => { try { return this.musicTheory.getNoteFromInterval(root, semitones); } catch(e){ return null; } };
            const getInterval = (fromRoot, toRoot) => { const fromVal = this.musicTheory.noteValues[fromRoot]; const toVal = this.musicTheory.noteValues[toRoot]; if (fromVal == null || toVal == null) return null; return (toVal - fromVal + 12) % 12; };
            const isDominant = (chordType) => { if (!chordType) return false; const t = chordType.toLowerCase(); return t.includes('7') && !t.includes('maj7') && !t.includes('m7') && !t.includes('dim'); };
            const isTonic = (root) => { const keyVal = this.musicTheory.noteValues[this.state.currentKey]; const rootVal = this.musicTheory.noteValues[root]; if (keyVal == null || rootVal == null) return false; const dist = (rootVal - keyVal + 12) % 12; return dist === 0 || dist === 9; };

            const maybeInsertGap = (leftIdx, rightIdx) => {
                if (leftIdx == null || rightIdx == null) return;
                if (mode === 'off') return;
                const from = meta[leftIdx]; const to = meta[rightIdx];
                if (!from || !to || !from.chordRoot || !to.chordRoot) return;
                const interval = getInterval(from.chordRoot, to.chordRoot);
                const toIsDom = isDominant(to.chordType); const toIsTonic = isTonic(to.chordRoot); const fromIsDom = isDominant(from.chordType);
                let insert = null;
                if (mode === 'functional') { if (toIsTonic && !fromIsDom) { const vRoot = noteFromInterval(to.chordRoot, 7); if (vRoot) insert = { root: vRoot, type: '7', tag: 'secondary_dominant' }; } else if (toIsDom && !fromIsDom && interval !== 2) { const iiRoot = noteFromInterval(to.chordRoot, 2); if (iiRoot) insert = { root: iiRoot, type: 'm7', tag: 'predominant' }; } }
                else if (mode === 'voice_leading') { if (interval != null && interval > 4 && interval < 10) { const midInterval = Math.floor(interval / 2); const passingRoot = noteFromInterval(from.chordRoot, midInterval); if (passingRoot) insert = { root: passingRoot, type: 'm7', tag: 'passing_chord' }; } else if (interval === 6) { const dimRoot = noteFromInterval(to.chordRoot, 1); if (dimRoot) insert = { root: dimRoot, type: 'dim7', tag: 'approach_chord' }; } }
                else if (mode === 'jazz') { if (toIsTonic && !fromIsDom) { const vRoot = noteFromInterval(to.chordRoot, 7); if (vRoot) insert = { root: vRoot, type: '7', tag: 'secondary_dominant' }; } else if (toIsDom && !fromIsDom && interval !== 2) { const iiRoot = noteFromInterval(to.chordRoot, 2); if (iiRoot) insert = { root: iiRoot, type: 'm7', tag: 'predominant' }; } else if (Math.random() < 0.3) { const subRoot = noteFromInterval(to.chordRoot, 6); if (subRoot) insert = { root: subRoot, type: '7', tag: 'tritone_sub' }; } }
                else if (mode === 'smart') { const priorities = { ii_v_setup: 0.8, ii_prep: 0.7, dim_approach: 0.6, passing: 0.5 }; if (toIsTonic && !fromIsDom && Math.random() < 0.8) { const vRoot = noteFromInterval(to.chordRoot, 7); if (vRoot) insert = { root: vRoot, type: '7', tag: 'secondary_dominant' }; } else if (toIsDom && !fromIsDom && interval !== 2 && Math.random() < 0.7) { const iiRoot = noteFromInterval(to.chordRoot, 2); if (iiRoot) insert = { root: iiRoot, type: 'm7', tag: 'predominant' }; } else if (interval === 6 && Math.random() < 0.6) { const dimRoot = noteFromInterval(to.chordRoot, 1); if (dimRoot) insert = { root: dimRoot, type: 'dim7', tag: 'approach_chord' }; } else if (interval != null && interval > 4 && interval < 10 && Math.random() < 0.5) { const midInterval = Math.floor(interval / 2); const passingRoot = noteFromInterval(from.chordRoot, midInterval); if (passingRoot) insert = { root: passingRoot, type: 'm7', tag: 'passing_chord' }; } }
                if (insert) { const insName = `${insert.root}${insert.type}`; progression.splice(rightIdx, 0, insName); meta.splice(rightIdx, 0, mkMeta(insert.root, insert.type, insert.tag)); if (expandedIdx >= rightIdx) expandedIdx++; }
            };
            // Prefer inserting between changed and its next
            if (nextDegIdx != null) maybeInsertGap(expandedIdx, nextDegIdx);
            // Optionally also between previous and changed (less frequent to avoid overgrowth)
            if (prevDegIdx != null && Math.random() < 0.4) maybeInsertGap(prevDegIdx, expandedIdx);

            this.state.currentProgression = progression;
            this.state.progressionMeta = meta;

            this.emit('progressionChanged', {
                progression,
                meta,
                complexity: this.state.complexity,
                gradeTier: this.state.gradeTier,
                mode: 'degree',
                index: inputIdx
            });

            this.render();
            return;
        }

        // Full build (progression mode or initialization)
        let progression = [];
        let meta = [];
        numbers.forEach((degree, index) => {
            const chord = this.generateChordForDegree(degree, index);
            if (chord) {
                progression.push(chord.fullName);
                // Get the actual diatonic chord to retrieve scale-based notes
                const diatonicChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                meta.push({
                    degree,
                    complexity: this.state.complexity,
                    gradeTier: this.state.gradeTier,
                    chordType: chord.chordType,
                    chordRoot: chord.root,
                    fullName: chord.fullName,
                    diatonicNotes: diatonicChord && diatonicChord.diatonicNotes ? diatonicChord.diatonicNotes : undefined,
                    chosenGrade: typeof chord.__grade === 'number' ? chord.__grade : undefined,
                    isSubstitution: !!chord.__isSubstitution,
                    functions: Array.isArray(chord.functions) ? chord.functions : undefined,
                    scaleMatchPercent: typeof chord.scaleMatchPercent === 'number' ? chord.scaleMatchPercent : undefined
                });
            }
        });

        // Apply optional Explore Logic to insert transitions (secondary dominants / chromatic mediants)
        const after = this.applyExploreLogic(progression, meta);
        progression = after.progression;
        meta = after.meta;

        this.state.currentProgression = progression;
        this.state.progressionMeta = meta;

        this.emit('progressionChanged', {
            progression,
            meta,
            complexity: this.state.complexity,
            gradeTier: this.state.gradeTier,
            mode: 'progression'
        });

        this.render();
    }

    /**
     * Apply Explore Logic modes to optionally insert chords between steps
     * Now uses intelligent analysis to suggest functional improvements
     */
    applyExploreLogic(progression, meta) {
        const mode = this.state.exploreLogic || 'off';
        if (mode === 'off' || progression.length === 0) return { progression, meta };

        const outProg = [];
        const outMeta = [];
        const maxGrowth = Math.min(6, Math.ceil(progression.length * 0.6)); // cap added chords
        let added = 0;

        const addEntry = (name, m) => { outProg.push(name); outMeta.push(m); };
        const mkMeta = (root, chordType, tag) => ({
            degree: null,
            complexity: this.state.complexity,
            gradeTier: this.state.gradeTier,
            chordType,
            chordRoot: root,
            chosenGrade: undefined,
            isSubstitution: true,
            functions: [tag],
            scaleMatchPercent: undefined
        });

        // Helper: get interval between two roots in semitones
        const getInterval = (fromRoot, toRoot) => {
            const fromVal = this.musicTheory.noteValues[fromRoot];
            const toVal = this.musicTheory.noteValues[toRoot];
            if (fromVal == null || toVal == null) return null;
            return (toVal - fromVal + 12) % 12;
        };

        // Helper: get note from interval
        const noteFromInterval = (root, semitones) => {
            try { return this.musicTheory.getNoteFromInterval(root, semitones); } catch(e){ return null; }
        };

        // Helper: is this chord a dominant type (contains 7 but not maj7/m7)
        const isDominant = (chordType) => {
            if (!chordType) return false;
            const t = chordType.toLowerCase();
            return t.includes('7') && !t.includes('maj7') && !t.includes('m7') && !t.includes('dim');
        };

        // Helper: is this a tonic-function chord
        const isTonic = (root) => {
            const keyVal = this.musicTheory.noteValues[this.state.currentKey];
            const rootVal = this.musicTheory.noteValues[root];
            if (keyVal == null || rootVal == null) return false;
            const dist = (rootVal - keyVal + 12) % 12;
            return dist === 0 || dist === 9; // I or vi
        };

        // Analyze progression for improvement opportunities
        const analyze = (fromIdx, toIdx) => {
            if (fromIdx == null || toIdx == null) return null;
            const from = meta[fromIdx];
            const to = meta[toIdx];
            if (!from || !to || !from.chordRoot || !to.chordRoot) return null;

            const interval = getInterval(from.chordRoot, to.chordRoot);
            const toIsDom = isDominant(to.chordType);
            const toIsTonic = isTonic(to.chordRoot);
            const fromIsDom = isDominant(from.chordType);

            // Opportunity 1: Large leap (>4 semitones) - add passing chord
            if (interval != null && interval > 4 && interval < 10) {
                const midInterval = Math.floor(interval / 2);
                const passingRoot = noteFromInterval(from.chordRoot, midInterval);
                if (passingRoot) return { type: 'passing', root: passingRoot, chordType: 'm7', tag: 'passing_chord' };
            }

            // Opportunity 2: Dominant resolution - add ii-V setup if target is tonic
            if (toIsTonic && !fromIsDom) {
                const vRoot = noteFromInterval(to.chordRoot, 7); // V of target
                if (vRoot) return { type: 'ii_v_setup', root: vRoot, chordType: '7', tag: 'secondary_dominant' };
            }

            // Opportunity 3: Dominant without preparation - add ii before V
            if (toIsDom && !fromIsDom && interval !== 2) {
                const iiRoot = noteFromInterval(to.chordRoot, 2); // ii of V
                if (iiRoot) return { type: 'ii_prep', root: iiRoot, chordType: 'm7', tag: 'predominant' };
            }

            // Opportunity 4: Tritone resolution - add diminished approach
            if (interval === 6) { // tritone leap
                const dimRoot = noteFromInterval(to.chordRoot, 1); // half-step below target
                if (dimRoot) return { type: 'dim_approach', root: dimRoot, chordType: 'dim7', tag: 'approach_chord' };
            }

            return null;
        };

        for (let i = 0; i < progression.length; i++) {
            const name = progression[i];
            const m = meta[i];
            addEntry(name, m);
            if (i === progression.length - 1) continue;
            if (added >= maxGrowth) continue;

            // Analyze and decide insertion based on mode
            let insert = null;
            const opp = analyze(i, i + 1);

            if (mode === 'functional' && opp) {
                // Functional: prefer ii-V setups and dominant preparations
                if (opp.type === 'ii_v_setup' || opp.type === 'ii_prep') {
                    insert = { root: opp.root, type: opp.chordType, tag: opp.tag };
                }
            } else if (mode === 'voice_leading' && opp) {
                // Voice leading: prefer passing chords and smooth approaches
                if (opp.type === 'passing' || opp.type === 'dim_approach') {
                    insert = { root: opp.root, type: opp.chordType, tag: opp.tag };
                }
            } else if (mode === 'jazz' && opp) {
                // Jazz: prefer ii-V and tritone subs
                if (opp.type === 'ii_v_setup' || opp.type === 'ii_prep') {
                    insert = { root: opp.root, type: opp.chordType, tag: opp.tag };
                } else if (Math.random() < 0.3) {
                    // Occasional tritone sub
                    const target = meta[i+1]?.chordRoot;
                    const subRoot = target ? noteFromInterval(target, 6) : null;
                    if (subRoot) insert = { root: subRoot, type: '7', tag: 'tritone_sub' };
                }
            } else if (mode === 'smart' && opp) {
                // Smart: apply any improvement with priority weighting
                const priorities = { ii_v_setup: 0.8, ii_prep: 0.7, dim_approach: 0.6, passing: 0.5 };
                const priority = priorities[opp.type] || 0.4;
                if (Math.random() < priority) {
                    insert = { root: opp.root, type: opp.chordType, tag: opp.tag };
                }
            }

            if (insert) {
                const insName = `${insert.root}${insert.type}`;
                addEntry(insName, mkMeta(insert.root, insert.type, insert.tag));
                added++;
            }
        }

        // Add turnaround at end if in jazz/smart mode and ends on tonic
        if ((mode === 'jazz' || mode === 'smart') && outMeta.length > 0 && added < maxGrowth) {
            const last = outMeta[outMeta.length - 1];
            if (last && isTonic(last.chordRoot)) {
                const viiRoot = noteFromInterval(this.state.currentKey, 11); // vii° of key
                if (viiRoot && Math.random() < 0.4) {
                    addEntry(`${viiRoot}dim7`, mkMeta(viiRoot, 'dim7', 'turnaround'));
                    added++;
                }
            }
        }

        return { progression: outProg, meta: outMeta };
    }

    /**
     * Generate chord for a specific degree using complexity and grade tier
     * Enhanced with grading-weighted suggestions
     */
    generateChordForDegree(degree, position) {
    const mode = this.state.harmonizationMode || 'root';
    const keyName = this.state.currentKey;
    const scaleName = this.state.currentScale;
    let scaleNotes = [];
    try {
        scaleNotes = this.musicTheory.getScaleNotes(keyName, scaleName) || [];
    } catch(_) {
        scaleNotes = [];
    }
    const isSmallScale = scaleNotes.length > 0 && scaleNotes.length < 7;
    // Local helpers for advanced candidate construction & scoring (harmony mode)
    const buildHarmonyCandidates = (targetNote, degree) => {
        const key = this.state.currentKey;
        const scale = this.state.currentScale;
        const scaleNotes = this.musicTheory.getScaleNotes(key, scale) || [];
        let baseChord = null;
        try { baseChord = this.musicTheory.getDiatonicChord(degree, key, scale); } catch(_){}
        // Container chords that include the target note
        let raw = this.musicTheory.findAllContainerChords([targetNote], scaleNotes) || [];
        // Optionally augment with borrowed, secondary dominants, chromatic mediants
        const augmented = [];
        if (this.state.enableBorrowedChords) {
            try {
                const parallelScale = scale === 'major' ? 'natural_minor' : 'major';
                const borrowed = this.musicTheory.getDiatonicChord(degree, key, parallelScale);
                if (borrowed) augmented.push({ root: borrowed.root, chordType: borrowed.chordType, fullName: borrowed.root + borrowed.chordType, functions: ['borrowed'] });
            } catch(_){}
        }
        if (this.state.enableSecondaryDominants && degree !== 1) {
            try {
                const base = baseChord || this.musicTheory.getDiatonicChord(degree, key, scale);
                if (base) {
                    const fifth = this.musicTheory.getNoteFromInterval(base.root, 7);
                    if (fifth) augmented.push({ root: fifth, chordType: '7', fullName: fifth + '7', functions: ['secondary_dominant'] });
                }
            } catch(_){}
        }
        if (this.state.enableChromaticMediants) {
            try {
                const mediant = this.getChromaticMediant(targetNote);
                if (mediant) augmented.push({ root: mediant, chordType: Math.random()<0.5?'maj7':'m7', fullName: mediant + (Math.random()<0.5?'maj7':'m7'), functions: ['chromatic_mediant'] });
            } catch(_){}
        }
        if (this.state.enableTritoneSubs) {
            // Potential tritone substitution of a hypothetical dominant built on targetNote
            try {
                const subRoot = this.musicTheory.getNoteFromInterval(targetNote, 6);
                if (subRoot) augmented.push({ root: subRoot, chordType: '7', fullName: subRoot + '7', functions: ['tritone_sub'] });
            } catch(_){}
        }
        // Merge & de-dup by fullName
        const all = [...raw.map(c=>({ ...c })), ...augmented];
        const seen = new Set();
        return all.filter(c => {
            const id = c.fullName || (c.root + c.chordType);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    };

    const scoreCandidate = (cand, baseChord, targetNote, prevMeta) => {
        // Role score: emphasize if target note is 3rd, 7th, extension or suspension
        let roleScore = 0;
        try {
            const notes = this.musicTheory.getChordNotes(cand.root, cand.chordType) || [];
            const inChord = notes.some(n => n === targetNote || ((this.musicTheory.noteValues?.[n]||0)%12) === (this.musicTheory.noteValues?.[targetNote]%12));
            if (inChord) {
                // Rough classification by interval from root
                const rootVal = this.musicTheory.noteValues?.[cand.root];
                const targetVal = this.musicTheory.noteValues?.[targetNote];
                if (rootVal!=null && targetVal!=null) {
                    const diff = (targetVal - rootVal + 12) % 12;
                    if (diff === 4 || diff === 3) roleScore += 3; // 3rd (major/minor)
                    else if (diff === 10 || diff === 11) roleScore += 3; // 7th
                    else if ([2,5,9].includes(diff)) roleScore += 2; // 9th/11th (+ avoid #11 handling simplistically) or 5th emphasis
                    else roleScore += 1; // present but neutral (root, etc.)
                }
            }
        } catch(_){}
        // Diatonic score via existing grade system
        let gradeScore = 0;
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
            gradeScore = this.getChordGradeScore(cand, baseChord, scaleNotes);
        } catch(_){}
        // Function weight
        const funcScore = Array.isArray(cand.functions) && cand.functions.length ? 1.5 : 0;
        // Simple voice-leading: penalize large root leaps from previous meta chord
        let vlPenalty = 0;
        try {
            const prevRoot = prevMeta?.chordRoot;
            if (prevRoot && this.musicTheory.noteValues?.[prevRoot]!=null && this.musicTheory.noteValues?.[cand.root]!=null) {
                const a = this.musicTheory.noteValues[prevRoot]%12;
                const b = this.musicTheory.noteValues[cand.root]%12;
                const dist = Math.min((b - a + 12)%12,(a - b + 12)%12);
                vlPenalty = dist > 5 ? 1.5 : dist > 3 ? 0.5 : 0; // discourage big jumps slightly
            }
        } catch(_){}
        // Aggregate
        const raw = roleScore*2 + gradeScore*1.2 + funcScore - vlPenalty;
        return raw;
    };
        // Helper: escalate a basic chordType to its 7th form unless already extended.
        const escalateToSeventh = (root, chordType, degree) => {
            if (!chordType) return chordType;
            
            // Check if scale supports 7ths (heptatonic or larger)
            // If hexatonic (6 notes) or pentatonic (5 notes), stick to triads unless manually forced
            try {
                const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                if (scaleNotes.length < 7) {
                    // Debug logging for small scales
                    if (window.__debugProgressionBuilder) {
                        console.log(`[escalateToSeventh] Small scale (${scaleNotes.length} notes): keeping ${root}${chordType} as-is`);
                    }
                    // For hexatonic/pentatonic, do NOT escalate to 7th automatically
                    return chordType;
                }
            } catch(_) {}

            // If already has 7/9/11/13/6 keep as is.
            if (/(maj7|m7b5|m7|dim7|7|9|11|13|6)/i.test(chordType)) return chordType;
            const t = chordType.toLowerCase();
            if (t === 'm' || /^m$/.test(t)) return 'm7';
            if (t === 'dim' || t === '°') return 'm7b5'; // diatonic diminished becomes half-dim unless manual override says full dim
            if (t === 'aug' || /\+/.test(t)) return 'maj7'; // treat augmented as maj7 color (only for 7+ note scales)
            // For suspended triads, map to a supported dominant suspension.
            // Engine supports '7sus4'; normalize both sus2/sus4 to 7sus4 to avoid unsupported labels like 'sus27'/'sus47'.
            if (t === 'sus4') return '7sus4';
            if (t === 'sus2') return '7sus4';
            // Default major triad → maj7, dominant degree (5) detected later by substitution logic anyway
            return degree === 5 ? '7' : 'maj7';
        };
        // Manual token override from NumberGenerator displayTokens (committed) or previewManualTokens (live typing)
        const getManualTokenForPosition = () => {
            const ng = this.numberGenerator && this.numberGenerator.state;
            let tokens = null;
            // Prefer case-preserving raw tokens from number generator if available
            if (ng && Array.isArray(ng.displayRawTokens) && ng.displayRawTokens.length === this.state.inputNumbers.length) {
                tokens = ng.displayRawTokens;
            } else if (ng && Array.isArray(ng.displayTokens) && ng.displayTokens.length === this.state.inputNumbers.length) {
                tokens = ng.displayTokens;
            } else if (ng && Array.isArray(ng.previewManualTokens)) {
                tokens = ng.previewManualTokens;
            }
            if (!tokens) return null;
            return tokens[position] || null;
        };
        const manualTok = getManualTokenForPosition();
        const manualTokStr = manualTok ? String(manualTok) : '';
        const manualLow = manualTok ? String(manualTok).toLowerCase() : '';
        const manualHalfDim = manualTok ? /ø|m7b5|half[-]?dim(inished)?/.test(manualTok) : false;
        const manualFullDim = manualTok ? ((/°/.test(manualTok) || /(^|[^a-z])dim($|[^a-z0-9])/i.test(manualLow)) && !/half[-]?dim/.test(manualLow)) : false;
        
        if (mode === 'harmony') {
            // ADVANCED HARMONY MODE: build expanded candidate pool and score
            try {
                const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
                if (!scaleNotes.length) return null;
                const targetNote = scaleNotes[(degree - 1) % scaleNotes.length];
                const baseChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                const prevMeta = this.state.progressionMeta[position - 1];
                let candidates = buildHarmonyCandidates(targetNote, degree);
                if (!candidates.length) {
                    // fallback to original simple picker
                    const picked = this.pickChordContainingDegree(degree, position);
                    if (!picked) return null;
                    let ctSimple = picked.chordType;
                    if (manualFullDim) ctSimple = 'dim7';
                    else if (manualHalfDim) ctSimple = 'm7b5';
                    else ctSimple = escalateToSeventh(picked.root, ctSimple, degree);
                    return { ...picked, chordType: ctSimple, fullName: picked.root + ctSimple };
                }
                // Score each candidate
                const scored = candidates.map(c => {
                    const score = scoreCandidate(c, baseChord, targetNote, prevMeta);
                    return { ...c, __score: score };
                }).sort((a,b)=> b.__score - a.__score);
                let choice = scored[0];
                // Rule Flex: probability of picking an alternate (lower-scored) candidate
                const flex = Math.max(0, Math.min(100, this.state.ruleFlex || 0));
                if (this.state.allowBentChoices && scored.length > 2) {
                    const bendChance = flex / 100; // 0.0 - 1.0
                    if (Math.random() < bendChance) {
                        // Pick from top N based on flex (higher flex => wider pool)
                        const poolSize = 1 + Math.min(scored.length-1, Math.round((flex/100)* (scored.length/2)) + 1);
                        const altIndex = Math.floor(Math.random()*poolSize);
                        choice = scored[altIndex];
                    }
                }
                let ctAdv = choice.chordType;
                if (manualFullDim) ctAdv = 'dim7';
                else if (manualHalfDim) ctAdv = 'm7b5';
                else ctAdv = escalateToSeventh(choice.root, ctAdv, degree);
                return { root: choice.root, chordType: ctAdv, fullName: choice.root + ctAdv, __score: choice.__score, functions: choice.functions };
            } catch (e) {
                console.warn('Advanced harmony candidate selection failed, fallback:', e);
                const picked = this.pickChordContainingDegree(degree, position);
                if (!picked) return null;
                let ct = picked.chordType;
                if (manualFullDim) ct = 'dim7';
                else if (manualHalfDim) ct = 'm7b5';
                else ct = escalateToSeventh(picked.root, ct, degree);
                return { ...picked, chordType: ct, fullName: picked.root + ct };
            }
        } else if (mode === 'root') {
            // ROOT MODE: treat each number as the root degree for the chord
            try {
                if (!scaleNotes.length) return null;
                const root = scaleNotes[(degree - 1) % scaleNotes.length];
                const baseChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);

                // For hexatonic / pentatonic scales, default to the diatonic triad unless manual tokens demand extensions
                if (isSmallScale && (!manualTokStr || !/[79]|11|13/.test(manualTokStr))) {
                    return {
                        root: baseChord.root,
                        chordType: baseChord.chordType,
                        fullName: baseChord.fullName,
                        chordNotes: baseChord.diatonicNotes || [],
                        diatonicNotes: baseChord.diatonicNotes || [],
                        __grade: 4,
                        __isSubstitution: false,
                        functions: ['Diatonic'],
                        scaleMatchPercent: 100
                    };
                }

                // Find candidate chords that have this root (findAllContainerChords will include chords that contain the root)
                let candidates = this.musicTheory.findAllContainerChords([root], scaleNotes) || [];
                candidates = candidates.filter(c => c.root === root);

                // Inject the diatonic base chord if it's not in the standard candidate list (e.g. synthetic chords)
                // This ensures the "native" scale chord is always an option
                const baseTypeLower = (baseChord.chordType || '').toLowerCase();
                if (!candidates.some(c => (c.chordType || '').toLowerCase() === baseTypeLower)) {
                    candidates.push({
                        root: baseChord.root,
                        chordType: baseChord.chordType,
                        fullName: baseChord.fullName,
                        chordNotes: baseChord.diatonicNotes || [],
                        scaleMatchPercent: 100,
                        functions: ['Diatonic'],
                        complexity: 'triad' // Treat as base complexity
                    });
                }

                // Hard filters to keep root-mode aligned with diatonic defaults unless explicitly requested
                const manualWantsSus = /sus\s*[24]|7\s*sus|sus\s*7/i.test(manualTokStr);
                const manualWantsAug = /(\+|aug|#5)/i.test(manualTokStr);
                const baseIsSharp5 = /#5/.test(baseChord.chordType || '');
                const baseIsSus = /sus/i.test(baseChord.chordType || '');

                // 0) For small scales (hexatonic/pentatonic), strictly filter out 7ths/extensions unless manually requested
                if (isSmallScale) {
                    candidates = candidates.filter(c => {
                        // Allow if manually requested
                        if (manualTokStr && (manualTokStr.includes('7') || manualTokStr.includes('9') || manualTokStr.includes('11') || manualTokStr.includes('13'))) return true;
                        
                        const type = (c.chordType || '').toLowerCase();
                        
                        // Allow if it matches the base chord type exactly (e.g. maj(add6, no5))
                        if (type === (baseChord.chordType || '').toLowerCase()) return true;

                        // Filter out anything with 7, 9, 11, 13, 6 (unless it's just part of the name like 'sus4' but not '7sus4')
                        if (type.includes('7') || type.includes('9') || type.includes('11') || type.includes('13') || type.includes('6')) {
                            return false;
                        }
                        return true;
                    });
                }

                // 1) Drop suspensions unless manually requested OR it matches the base chord
                candidates = candidates.filter(c => {
                    if (/sus/i.test(c.chordType)) return manualWantsSus || baseIsSus;
                    return true;
                });

                // 2) Drop augmented-5th variants unless base chord or manual asks for them
                candidates = candidates.filter(c => {
                    if (/#5|aug/i.test(c.chordType)) return baseIsSharp5 || manualWantsAug;
                    return true;
                });

                // 3) Prefer exact diatonic seventh match immediately when available
                const exact = candidates.find(c => (c.chordType || '').toLowerCase() === (baseChord.chordType || '').toLowerCase());
                if (exact) {
                    let ct = exact.chordType;
                    if (manualFullDim) ct = 'dim7';
                    else if (manualHalfDim) ct = 'm7b5';
                    return { root: exact.root, chordType: ct, fullName: exact.root + ct, __grade: 4, __isSubstitution: false, functions: exact.functions, scaleMatchPercent: exact.scaleMatchPercent };
                }
                if (!candidates || candidates.length === 0) {
                    // Synthesize a chord based on baseChord and complexity if no candidates
                    const synthType = this.applyChordComplexity(baseChord.chordType, root, degree);
                    const adv = this.applyHarmonicAdventure(root, synthType, degree, position) || { root, chordType: synthType };
                    return { root: adv.root, chordType: adv.chordType, fullName: adv.root + adv.chordType };
                }

                // Score candidates by grade relative to baseChord
                candidates = candidates.map(c => ({ ...c, __grade: this.getChordGradeScore(c, baseChord, scaleNotes) }));
                const targetGrade = this.state.gradeTier;
                
                // Enhanced grading-weighted selection: favor higher-tier elements
                let filtered = candidates.filter(c => c.__grade === targetGrade);
                if (filtered.length === 0) {
                    // Apply grading-weighted fallback: prefer higher grades over lower ones
                    const gradePriority = [targetGrade + 1, targetGrade - 1, targetGrade + 2, targetGrade - 2];
                    for (let fallbackGrade of gradePriority) {
                        if (fallbackGrade >= 0 && fallbackGrade <= 4) {
                            const fallback = candidates.filter(c => c.__grade === fallbackGrade);
                            if (fallback.length > 0) { 
                                filtered = fallback; 
                                break; 
                            }
                        }
                    }
                }

                if (filtered.length === 0) {
                    // fallback: synthesize
                    const synthType = this.applyChordComplexity(baseChord.chordType, root, degree);
                    const adv = this.applyHarmonicAdventure(root, synthType, degree, position) || { root, chordType: synthType };
                    return { root: adv.root, chordType: adv.chordType, fullName: adv.root + adv.chordType };
                }

                // Filter by complexity bucket
                const targetCx = this.getTargetComplexity();
                let byCx = filtered.filter(c => c.complexity === targetCx);
                if (byCx.length === 0 && targetCx === 'extended') byCx = filtered.filter(c => c.complexity === 'seventh');
                if (byCx.length === 0 && targetCx === 'seventh') byCx = filtered.filter(c => c.complexity === 'triad');
                if (byCx.length === 0) byCx = filtered;

                // Enhanced grading-weighted random pick: combine scaleMatchPercent with grading tier
                const pool = byCx.length ? byCx : filtered;
                let choice;
                if (pool.length <= 3) choice = pool[Math.floor(Math.random() * pool.length)];
                else {
                    // Weight by both scale match and grading tier (higher tiers get exponential boost)
                    const weights = pool.map(c => {
                        const scaleWeight = Math.max(1, Math.floor(c.scaleMatchPercent || 50));
                        const gradeWeight = Math.pow(2, c.__grade || 0); // Exponential weighting for higher grades
                        return scaleWeight * gradeWeight;
                    });
                    const sum = weights.reduce((a,b)=>a+b,0);
                    let r = Math.random() * sum;
                    for (let i=0;i<pool.length;i++) { r -= weights[i]; if (r <= 0) { choice = pool[i]; break; } }
                    if (!choice) choice = pool[Math.floor(Math.random() * pool.length)];
                }

                if (!choice) return null;
                let ct = choice.chordType;
                
                // Debug: log what we're starting with
                if (window.__debugProgressionBuilder) {
                    console.log(`[generateChordForDegree] degree=${degree}, choice.chordType=${choice.chordType}, scaleNotes.length=${scaleNotes.length}`);
                }
                
                // Manual overrides
                if (manualFullDim) {
                    ct = 'dim7';
                } else if (manualHalfDim) {
                    ct = 'm7b5';
                } else if (!isSmallScale || /7|9|11|13/.test(manualTokStr)) {
                    ct = escalateToSeventh(choice.root, ct, degree);
                } else {
                    ct = choice.chordType;
                }
                
                // Debug: log after escalation
                if (window.__debugProgressionBuilder) {
                    console.log(`[generateChordForDegree] after escalateToSeventh: ct=${ct}`);
                }
                
                // Only apply automatic escalations for heptatonic+ scales
                // Small scales (hexatonic/pentatonic) should preserve their native triadic structures
                if (!isSmallScale) {
                    // Align triad escalation with diatonic target (e.g., IV → 7 in Dorian b2)
                    if (/^maj$/i.test(choice.chordType)) {
                        if (/^7$/.test(baseChord.chordType || '')) ct = '7';
                        else if (/maj7#5/.test(baseChord.chordType || '')) ct = 'maj7#5';
                        else if (!/(maj7|7)/i.test(ct)) ct = 'maj7';
                    }
                    if (/^dim$/i.test(choice.chordType) && !/(dim7|m7b5)/i.test(ct)) ct = 'm7b5';
                    if (/^aug$|\+$/.test(choice.chordType) && !/(maj7#5)/i.test(ct)) ct = 'maj7#5';
                }
                
                // Debug: log final result
                if (window.__debugProgressionBuilder) {
                    console.log(`[generateChordForDegree] final ct=${ct}`);
                }
                
                const isPerfect = choice.root === baseChord.root && ct === baseChord.chordType && choice.__grade === 4;
                return {
                    root: choice.root,
                    chordType: ct,
                    fullName: choice.root + ct,
                    __grade: choice.__grade,
                    __isSubstitution: !isPerfect,
                    functions: choice.functions,
                    scaleMatchPercent: choice.scaleMatchPercent
                };
            } catch (e) {
                console.error('Error generating root-based chord:', e);
                return null;
            }
        } else {
            // MELODY MODE: degree represents scale degree for diatonic chord
            const baseChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
            if (!baseChord) return null;
            if (isSmallScale && (!manualTokStr || !/[79]|11|13/.test(manualTokStr))) {
                return {
                    ...baseChord,
                    chordNotes: baseChord.diatonicNotes || [],
                    diatonicNotes: baseChord.diatonicNotes || [],
                    __grade: 4,
                    __isSubstitution: false,
                    functions: ['Diatonic'],
                    scaleMatchPercent: 100
                };
            }
            // Use grade tier-based selection
            const chosen = this.pickChordByGradeAndComplexity(degree, baseChord) || baseChord;
            let ct = chosen.chordType;
            if (manualFullDim) {
                ct = 'dim7';
            } else if (manualHalfDim) {
                ct = 'm7b5';
            } else if (!isSmallScale || /7|9|11|13/.test(manualTokStr || '')) {
                ct = escalateToSeventh(chosen.root, ct, degree);
            }
            return { ...chosen, chordType: ct, fullName: chosen.root + ct };
        }
    }

    /**
     * Pick a chord that contains the given degree as a chord tone
     */
    pickChordContainingDegree(degree, position) {
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
            if (!scaleNotes.length) return null;
            
            // Get the note for this degree
            const note = scaleNotes[(degree - 1) % scaleNotes.length];
            
            // Find all chords that contain this note
            const candidates = this.musicTheory.findAllContainerChords([note], scaleNotes) || [];
            
            // Filter and score by grade tier and complexity
            const targetGrade = this.state.gradeTier;
            const targetCx = this.getTargetComplexity();
            
            let filtered = candidates.map(c => {
                const baseChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                const grade = this.getChordGradeScore(c, baseChord, scaleNotes);
                return { ...c, __grade: grade };
            });
            
            // Filter by exact grade tier
            filtered = filtered.filter(c => c.__grade === targetGrade);
            
            // If no exact matches, try adjacent grades
            if (filtered.length === 0) {
                for (let offset of [1, -1, 2, -2]) {
                    const fallbackGrade = targetGrade + offset;
                    if (fallbackGrade >= 0 && fallbackGrade <= 4) {
                        const fallback = candidates.map(c => {
                            const baseChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
                            const grade = this.getChordGradeScore(c, baseChord, scaleNotes);
                            return { ...c, __grade: grade };
                        }).filter(c => c.__grade === fallbackGrade);
                        if (fallback.length > 0) {
                            filtered = fallback;
                            break;
                        }
                    }
                }
            }
            
            if (filtered.length === 0) return null;
            
            // Filter by complexity
            let byCx = filtered.filter(c => c.complexity === targetCx);
            if (byCx.length === 0 && targetCx === 'extended') byCx = filtered.filter(c => c.complexity === 'seventh');
            if (byCx.length === 0 && targetCx === 'seventh') byCx = filtered.filter(c => c.complexity === 'triad');
            if (byCx.length === 0) byCx = filtered;
            
            // Pick randomly from pool
            const pool = byCx.length ? byCx : filtered;
            const choice = pool[Math.floor(Math.random() * pool.length)];
            
            if (!choice) return null;
            
            return {
                root: choice.root,
                chordType: choice.chordType,
                fullName: choice.fullName,
                __grade: choice.__grade,
                __isSubstitution: true,
                __containedNote: note,
                functions: choice.functions,
                scaleMatchPercent: choice.scaleMatchPercent
            };
        } catch (e) {
            console.error('Error picking container chord:', e);
            return null;
        }
    }

    /**
     * Get grade tier info for display and filtering
     */
    getGradeTierInfo(tier) {
        return this.musicTheory.getGradingTierInfo(tier);
    }

    /**
     * Compute grade score for a candidate chord relative to a degree.
     * 4: ★★★ Perfect (diatonic scale chord for that degree)
     * 3: ★★ Excellent (in-scale functional)
     * 2: ★  Good (in-scale)
     * 1: ◐  Fair (chromatic functional)
     * 0: ○  Experimental (chromatic)
     */
    getChordGradeScore(candidate, baseChord, scaleNotes) {
        const isDiatonic = candidate.scaleMatchPercent === 100;
        const hasFunction = Array.isArray(candidate.functions) && candidate.functions.length > 0;
        const isPerfect = isDiatonic && candidate.root === baseChord.root && candidate.chordType === baseChord.chordType;
        if (isPerfect) return 4;              // ★★★
        if (isDiatonic && hasFunction) return 3;  // ★★
        if (isDiatonic) return 2;             // ★
        if (!isDiatonic && hasFunction) return 1; // ◐
        return 0;                             // ○
    }

    /**
     * Desired complexity bucket from complexity control (triad | seventh | extended)
     */
    getTargetComplexity() {
        const c = this.state.complexity;
        if (c < 30) return 'triad';
        if (c < 70) return 'seventh';
        return 'extended';
    }

    /**
     * Pick a chord for the degree using ContainerChord-style grading + complexity.
     */
    pickChordByGradeAndComplexity(degree, baseChord) {
        try {
            const key = this.state.currentKey;
            const scale = this.state.currentScale;
            const scaleNotes = this.musicTheory.getScaleNotes(key, scale) || [];
            // Use the exact input note for this degree (aligns with Container Chord Finder semantics)
            const degreeNote = scaleNotes.length ? scaleNotes[(degree - 1) % scaleNotes.length] : baseChord.root;
            const notes = [degreeNote];

            // Search container chords that include any of the stacked chord notes
            let candidates = this.musicTheory.findAllContainerChords(notes, scaleNotes) || [];

            // Compute grade score and filter by EXACT grade tier to allow substitution within same tier
            const targetGrade = this.state.gradeTier;
            console.log(`🎵 Degree ${degree}: targetGrade=${targetGrade}, complexity=${this.state.complexity}`);
            candidates = candidates.map(c => ({ ...c, __grade: this.getChordGradeScore(c, baseChord, scaleNotes) }));
            console.log(`   Total candidates before grade filter: ${candidates.length}`);
            candidates = candidates.filter(c => c.__grade === targetGrade);
            console.log(`   After exact grade filter (=${targetGrade}): ${candidates.length}`);

            if (candidates.length === 0) {
                // If no exact match, try adjacent grades (one above or below)
                const allCandidates = this.musicTheory.findAllContainerChords(notes, scaleNotes).map(c => ({ ...c, __grade: this.getChordGradeScore(c, baseChord, scaleNotes) }));
                for (let offset of [1, -1, 2, -2]) {
                    const fallbackGrade = targetGrade + offset;
                    if (fallbackGrade >= 0 && fallbackGrade <= 4) {
                        const fallback = allCandidates.filter(c => c.__grade === fallbackGrade);
                        if (fallback.length > 0) {
                            candidates = fallback;
                            console.log(`   Fallback to grade ${fallbackGrade}: ${candidates.length}`);
                            break;
                        }
                    }
                }
            }

            if (candidates.length === 0) return baseChord; // ultimate fallback

            // Filter by complexity bucket, with graceful fallback.
            const targetCx = this.getTargetComplexity();
            let byCx;
            
            if (targetCx === 'triad') {
                // TRIAD MODE: Strictly filter to triads or degrade seventh/extended to triads
                const isTriadType = (t) => !/(maj13|13|11|9|maj9|maj11|m13|m11|m9|maj7|m7b5|m7|dim7|7|alt|b9|#9|b13)/i.test(t);
                const simplifyToTriad = (root, type) => {
                    // Preserve synthetic names like maj(add6, no5)
                    if (type.includes('(')) return type;
                    
                    if (/m7b5|ø/i.test(type)) return 'm';
                    if (/maj7|maj9|maj11|maj13/i.test(type)) return 'maj';
                    if (/m13|m11|m9|m7/i.test(type)) return 'm';
                    if (/13|11|9|7|alt|b9|#9|b13/i.test(type)) return 'maj';
                    if (/dim7/i.test(type)) return 'dim';
                    // Fix: Ensure 'o' matches only as full token or start, not inside 'no5'
                    if (/dim|°|^o$/i.test(type)) return 'dim';
                    if (/aug|\+/i.test(type)) return 'aug';
                    if (/^m$/i.test(type)) return 'm';
                    if (/^maj$/i.test(type) || type === '') return 'maj';
                    if (/^dim$/i.test(type)) return 'dim';
                    if (/^aug$/i.test(type)) return 'aug';
                    if (/sus2|sus4/i.test(type)) return type.toLowerCase();
                    return 'maj';
                };
                const triads = candidates.filter(c => isTriadType(c.chordType));
                if (triads.length) {
                    byCx = triads.map(c => ({ ...c, complexity: 'triad', chordType: simplifyToTriad(c.root, c.chordType), fullName: c.root + simplifyToTriad(c.root, c.chordType) }));
                } else {
                    byCx = candidates.map(c => ({ ...c, complexity: 'triad', chordType: simplifyToTriad(c.root, c.chordType), fullName: c.root + simplifyToTriad(c.root, c.chordType) }));
                }
            } else if (targetCx === 'seventh') {
                // SEVENTH MODE: Prefer seventh chords, fallback to triads if none available
                byCx = candidates.filter(c => c.complexity === 'seventh');
                if (byCx.length === 0) byCx = candidates.filter(c => c.complexity === 'triad');
                if (byCx.length === 0) byCx = candidates;
            } else {
                // EXTENDED MODE: Prefer extended chords (9/11/13)
                byCx = candidates.filter(c => c.complexity === 'extended');
                console.log(`   Extended chords in pool: ${byCx.length}`);
                
                // If no extended chords found, synthesize one from the base diatonic chord
                if (byCx.length === 0) {
                    console.log(`   No extended chords found, synthesizing from baseChord: ${baseChord.root}${baseChord.chordType}`);
                    const extendedType = this.extendChordType(baseChord.chordType);
                    const synthetic = {
                        root: baseChord.root,
                        chordType: extendedType,
                        fullName: baseChord.root + extendedType,
                        chordNotes: this.musicTheory.getChordNotes(baseChord.root, extendedType),
                        scaleMatchPercent: 100,
                        complexity: 'extended',
                        functions: baseChord.functions || [],
                        resolutions: baseChord.resolutions || [],
                        __grade: this.getChordGradeScore(baseChord, baseChord, scaleNotes)
                    };
                    byCx = [synthetic];
                    console.log(`   Synthesized: ${synthetic.fullName}`);
                } else {
                    // Fallback chain if still empty
                    if (byCx.length === 0) byCx = candidates.filter(c => c.complexity === 'seventh');
                    if (byCx.length === 0) byCx = candidates.filter(c => c.complexity === 'triad');
                    if (byCx.length === 0) byCx = candidates;
                }
            }

            // Randomly pick from filtered pool to be expansive and avoid a single best-only choice
            // Weight slightly towards higher scale match when available
            const pool = byCx.length ? byCx : candidates;
            if (!pool.length) return baseChord;
            let choice;
            if (pool.length <= 3) {
                choice = pool[Math.floor(Math.random() * pool.length)];
            } else {
                // Weighted pick by scaleMatchPercent (fallback to uniform if missing)
                const weights = pool.map(c => Math.max(1, Math.floor(c.scaleMatchPercent || 50)));
                const sum = weights.reduce((a,b)=>a+b,0);
                let r = Math.random() * sum;
                for (let i=0;i<pool.length;i++) { r -= weights[i]; if (r <= 0) { choice = pool[i]; break; } }
                if (!choice) choice = pool[Math.floor(Math.random() * pool.length)];
            }

            const isPerfect = choice.root === baseChord.root && choice.chordType === baseChord.chordType && choice.__grade === 4;
            return {
                root: choice.root,
                chordType: choice.chordType,
                fullName: choice.fullName,
                __grade: choice.__grade,
                __isSubstitution: !isPerfect,
                functions: choice.functions,
                scaleMatchPercent: choice.scaleMatchPercent
            };
        } catch (e) {
            return baseChord;
        }
    }

    /**
     * Apply harmonic adventure (North-South axis)
     */
    applyHarmonicAdventure(root, chordType, degree, position) {
        const adventure = this.state.adventure;
        const rand = Math.random() * 100;

        // South (0-30): Conservative - keep diatonic
        if (adventure < 30) {
            return { root, chordType };
        }

        // Center (30-70): Moderate substitutions
        if (adventure < 70) {
            // Secondary dominants (30% chance)
            if (rand < 30 && degree !== 1) {
                const targetRoot = this.musicTheory.getNoteFromInterval(root, 7);
                return { root: targetRoot, chordType: '7' };
            }
            // Tritone substitution (20% chance for dominant chords)
            if (rand >= 30 && rand < 50 && chordType === '7') {
                const subRoot = this.musicTheory.getNoteFromInterval(root, 6);
                return { root: subRoot, chordType: '7' };
            }
        }

        // North (70-100): Adventurous - modal interchange, chromatic mediants
        if (adventure >= 70) {
            // Modal interchange (40% chance)
            if (rand < 40) {
                const borrowedChord = this.getBorrowedChord(degree);
                if (borrowedChord) return borrowedChord;
            }
            // Chromatic mediant (30% chance)
            if (rand >= 40 && rand < 70) {
                const mediantRoot = this.getChromaticMediant(root);
                const mediantType = Math.random() < 0.5 ? 'maj7' : 'm7';
                return { root: mediantRoot, chordType: mediantType };
            }
            // Altered dominant (remaining chance for V chords)
            if (degree === 5 || chordType.includes('7')) {
                const alterations = ['7alt', '7b9', '7#9', '7b13'];
                const altType = alterations[Math.floor(Math.random() * alterations.length)];
                return { root, chordType: altType };
            }
        }

        return { root, chordType };
    }

    /**
     * Apply chord complexity (West-East axis)
     */
    applyChordComplexity(baseType, root, degree) {
        // If baseType is a synthetic chord (contains parens), preserve it unless explicitly simplifying
        if (baseType && baseType.includes('(')) return baseType;

        const complexity = this.state.complexity;

        // West (0-30): Triads only
        if (complexity < 30) {
            if (baseType.includes('m7')) return 'm';
            if (baseType.includes('maj7')) return 'maj';
            if (baseType.includes('7')) return degree === 7 ? 'dim' : 'maj';
            return baseType.replace(/7|maj7|m7/g, '');
        }

        // Center (30-70): 7th chords
        if (complexity < 70) {
            if (!baseType.includes('7')) {
                if (baseType.includes('m')) return 'm7';
                if (degree === 5 || degree === 7) return '7';
                return 'maj7';
            }
            return baseType;
        }

        // East (70-100): Extended chords (9th, 11th, 13th)
        const extensions = [];
        
        // Add 9th (common)
        if (complexity >= 70) {
            const quality = baseType.includes('m') ? 'm' : (baseType.includes('7') && !baseType.includes('maj7') ? '' : 'maj');
            if (quality === 'm') extensions.push('m9');
            else if (quality === '') extensions.push('9');
            else extensions.push('maj9');
        }

        // Add 11th (less common)
        if (complexity >= 85) {
            const quality = baseType.includes('m') ? 'm' : 'maj';
            if (quality === 'm') extensions.push('m11');
            else extensions.push('11');
        }

        // Add 13th (full complexity)
        if (complexity >= 95) {
            const quality = baseType.includes('m') ? 'm' : (baseType.includes('7') && !baseType.includes('maj7') ? '' : 'maj');
            if (quality === 'm') extensions.push('m13');
            else if (quality === '') extensions.push('13');
            else extensions.push('maj13');
        }

        // Return the most extended chord based on complexity
        if (extensions.length > 0) {
            return extensions[extensions.length - 1];
        }

        return baseType;
    }

    /**
     * Extend a chord type to add 9th/11th/13th extensions
     */
    extendChordType(baseType) {
        // Determine quality
        const isMinor = /^m(?!aj)/.test(baseType) || baseType.includes('m7');
        const isMaj7 = baseType.includes('maj7');
        const isDom = baseType.includes('7') && !isMaj7 && !isMinor;
        const isHalfDim = baseType.includes('m7b5') || baseType.includes('ø');
        const isDim7 = baseType.includes('dim7');
        
        // Extended mappings based on complexity slider
        const complexity = this.state.complexity;
        
        if (complexity >= 95) {
            // 13th chords
            if (isMinor) return 'm13';
            if (isMaj7) return 'maj13';
            if (isDom) return '13';
        } else if (complexity >= 85) {
            // 11th chords
            if (isMinor) return 'm11';
            if (isMaj7) return 'maj9'; // maj11 is less common
            if (isDom) return '11';
        } else if (complexity >= 70) {
            // 9th chords
            if (isMinor) return 'm9';
            if (isMaj7) return 'maj9';
            if (isDom) return '9';
        }
        
        // Special cases that don't extend well
        if (isHalfDim) return baseType; // keep m7b5
        if (isDim7) return baseType; // keep dim7
        
        // Fallback to 9th if in extended range
        if (isMinor) return 'm9';
        if (isMaj7) return 'maj9';
        return '9';
    }

    /**
     * Get borrowed chord from parallel minor/major
     */
    getBorrowedChord(degree) {
        const isMajor = this.state.currentScale === 'major';
        const parallelScale = isMajor ? 'natural_minor' : 'major';
        
        try {
            const borrowed = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, parallelScale);
            if (borrowed) return { root: borrowed.root, chordType: borrowed.chordType };
        } catch (e) {}
        
        return null;
    }

    /**
     * Get chromatic mediant
     */
    getChromaticMediant(root) {
        const options = [3, 4, 8, 9]; // m3, M3, m6, M6
        const interval = options[Math.floor(Math.random() * options.length)];
        return this.musicTheory.getNoteFromInterval(root, interval);
    }

    /**
     * Render progression display with grading indicators
     */
    renderProgressionDisplay() {
        if (!this.state.currentProgression || this.state.currentProgression.length === 0) {
            return '<div class="pb-empty">Generate numbers in Input Orbit to create progression</div>';
        }

        return `
            <div class="pb-progression-display">
                ${this.state.currentProgression.map((chord, index) => {
                    const meta = this.state.progressionMeta[index] || {};
                    const tierInfo = this.getGradeTierInfo(meta.chosenGrade || 2);
                    const isSubstitution = meta.isSubstitution || false;
                    
                    // Get grading explanation for this chord
                    let explanation = '';
                    try {
                        const context = { 
                            elementType: 'chord', 
                            key: this.state.currentKey, 
                            scaleType: this.state.currentScale 
                        };
                        explanation = this.musicTheory.getGradingExplanation(chord, meta.chosenGrade || 2, context);
                    } catch (e) {
                        explanation = `Grade ${meta.chosenGrade || 2} chord in ${this.state.gradingType || 'functional'} perspective`;
                    }
                    
                    return `
                        <div class="pb-chord-item" data-index="${index}">
                            <div class="pb-chord-main" style="border-left: 3px solid ${tierInfo.color};">
                                <div class="pb-chord-name">${chord}</div>
                                <div class="pb-chord-grade" style="color: ${tierInfo.color};">
                                    ${tierInfo.short} ${isSubstitution ? '(Sub)' : ''}
                                </div>
                            </div>
                            <div class="pb-chord-explanation" title="${explanation}">
                                ${explanation.length > 50 ? explanation.substring(0, 50) + '...' : explanation}
                            </div>
                            ${meta.degree ? `<div class="pb-chord-degree">Degree ${meta.degree}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="pb-progression-controls">
                <button class="btn btn-secondary pb-suggest-alternatives" title="Suggest alternatives for low-tier chords">
                    ✨ Suggest Alternatives
                </button>
                <button class="btn btn-secondary pb-show-analysis" title="Show grading analysis">
                    📊 Show Analysis
                </button>
            </div>
        `;
    }

    /**
     * Mount to DOM container
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
     * Render full UI with 2D control pad
     */
    render() {
        if (!this.container) return;

        const complexityLabel = this.state.complexity < 30 ? 'Triads' : 
                               this.state.complexity < 70 ? '7ths' : 
                               this.state.complexity < 95 ? '9ths/11ths' : '13ths';
        
        const gradeTierInfo = this.getGradeTierInfo(this.state.gradeTier);

        // Check if pad is collapsed (default to false if not set)
        const isPadCollapsed = this.state.isPadCollapsed || false;
        const isHelpVisible = this.state.isHelpVisible || false;

        this.container.innerHTML = `
            <div class="progression-builder-ui">
                <div class="pb-top">
                    <div class="pb-left">
                        <div class="pb-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div class="pb-title" style="font-family:var(--font-display); font-size:1.1em; color:var(--text-main);">Progression Builder</div>
                            <div class="pb-actions" style="display:flex; gap:8px;">
                                <button id="pg-toggle-help" class="btn ${isHelpVisible ? 'btn-primary' : ''}" style="padding:2px 8px; font-size:0.9em;" title="Show Instructions">?</button>
                                <button id="pg-toggle-pad" class="btn" style="padding:2px 8px; font-size:0.9em;">${isPadCollapsed ? 'Show Pad' : 'Hide Pad'}</button>
                            </div>
                        </div>

                        ${isHelpVisible ? `
                        <div class="pb-help-panel" style="background:rgba(0,0,0,0.2); padding:10px; border-left:3px solid var(--accent-primary); margin-bottom:10px; font-size:0.9em;">
                            <div style="font-weight:bold; margin-bottom:5px;">How to use:</div>
                            <ul style="margin:0; padding-left:20px; list-style-type:square;">
                                <li><strong>Input Orbit:</strong> Generate numbers first to create a progression structure.</li>
                                <li><strong>2D Pad:</strong> Drag cursor to change chord complexity (X-axis) and grade difficulty (Y-axis).</li>
                                <li><strong>Explore Logic:</strong> Choose algorithms like "Jazz" or "Voice Leading" to enhance chords.</li>
                                <li><strong>Regenerate:</strong> Click to create new variations based on current settings.</li>
                            </ul>
                        </div>
                        ` : ''}

                        <div class="pb-input">
                            <div class="pb-input-numbers">
                                ${this.state.inputNumbers.length > 0 ? 
                                    (() => {
                                        // Use displayTokens from NumberGenerator if available, otherwise convert numbers to Roman
                                        const ng = this.numberGenerator && this.numberGenerator.state;
                                        let tokens = null;
                                        if (ng && Array.isArray(ng.displayTokens) && ng.displayTokens.length) {
                                            tokens = ng.displayTokens;
                                        } else if (ng && typeof this.numberGenerator.getCurrentDisplayTokens === 'function') {
                                            tokens = this.numberGenerator.getCurrentDisplayTokens();
                                        }
                                        // If we have tokens, use them (no cap); otherwise fallback to numbers
                                        if (tokens && tokens.length) {
                                            return tokens.map(t => `<span class="pb-chip">${t}</span>`).join('');
                                        } else {
                                            return this.state.inputNumbers.map(n => `<span class="pb-chip">${n}</span>`).join('');
                                        }
                                    })() : 
                                    '<span class="pb-hint">Generate numbers in Input Orbit</span>'
                                }
                            </div>
                            ${this.state.inputNumbers.length > 0 ? 
                                `<div class="pb-keyscale">${this.state.currentKey} ${this.state.currentScale}</div>` : 
                                ''
                            }
                        </div>

                        <div class="pb-controls">
                            <div class="pg-target">
                                <button id="pg-mode-prog" class="btn ${this.state.generateMode==='progression' ? 'btn-primary' : ''}" style="padding:6px 10px; font-family: var(--font-tech);">Whole Progression</button>
                                <div class="pg-degree-list">
                                    ${this.state.inputNumbers.map((n, i) => `
                                        <button class="btn pg-degree-btn ${this.state.generateMode==='degree' && this.state.generateIndex===i ? 'btn-primary' : ''}"
                                                data-index="${i}" style="padding:6px 10px; font-family: var(--font-tech);">
                                            Input ${i+1}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="pb-explore">
                                <label for="pg-explore-logic" class="pb-label">Explore Logic:</label>
                                <select id="pg-explore-logic" class="form-input pb-select">
                                    <option value="off" ${this.state.exploreLogic==='off' ? 'selected' : ''}>Off</option>
                                    <option value="functional" ${this.state.exploreLogic==='functional' ? 'selected' : ''}>Functional (ii-V setups)</option>
                                    <option value="voice_leading" ${this.state.exploreLogic==='voice_leading' ? 'selected' : ''}>Voice Leading (passing chords)</option>
                                    <option value="jazz" ${this.state.exploreLogic==='jazz' ? 'selected' : ''}>Jazz (ii-V + tritone subs)</option>
                                    <option value="smart" ${this.state.exploreLogic==='smart' ? 'selected' : ''}>Smart (all improvements)</option>
                                </select>
                                <button class="btn btn-primary pb-regenerate" id="pg-regenerate" title="Regenerate with current settings">↻ Regenerate</button>
                            </div>
                        </div>
                    </div>

                    <div class="pb-pad" style="${isPadCollapsed ? 'display:none;' : ''}">
                        <div class="pb-pad-wrap">
                            <div class="pb-axis-label pb-axis-top">NORTH <span class="pb-axis-badge" style="color:${this.getGradeTierInfo(4).color}">${this.getGradeTierInfo(4).short}</span></div>
                            <div class="pb-axis-label pb-axis-bottom">SOUTH <span class="pb-axis-badge" style="color:${this.getGradeTierInfo(0).color}">${this.getGradeTierInfo(0).short}</span></div>
                            <div class="pb-axis-label pb-axis-left">WEST<br/><span class="pb-axis-sub">Triads</span></div>
                            <div class="pb-axis-label pb-axis-right">EAST<br/><span class="pb-axis-sub">13ths</span></div>
                            <div id="pg-2d-pad" class="pb-pad-surface">
                                ${[4,3,2,1,0].map((t, i) => {
                                    const info = this.getGradeTierInfo(t);
                                    return `<div class="pb-tier-band" style="top:${i*20}%; height:20%; background:${info.color}15;"></div>`;
                                }).join('')}
                                <div class="pb-grid-lines"></div>
                                <div id="pg-2d-cursor" class="pb-cursor" style="border-color:${gradeTierInfo.color}; box-shadow:0 0 12px ${gradeTierInfo.color}; border-radius: 0;"></div>
                            </div>
                        </div>
                        <div class="pb-status">
                            <div class="pb-card">
                                <div class="pb-card-label">Complexity</div>
                                <div class="pb-card-value">${complexityLabel}</div>
                                <div class="pb-card-sub">${this.state.complexity}</div>
                            </div>
                            <div class="pb-card pb-card-tier" style="border-color:${gradeTierInfo.color}; border-radius: 0;">
                                <div class="pb-card-label">Grade Tier</div>
                                <div class="pb-card-value" style="color:${gradeTierInfo.color}; font-family: var(--font-tech);">${gradeTierInfo.label}</div>
                                <div class="pb-card-sub">Tier ${this.state.gradeTier}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pb-generated">
                    ${this.renderProgressionDisplay()}
                </div>
                <!-- Advanced harmony controls removed (pb-advanced-controls). Underlying logic & defaults retained. -->
                <div id="pb-sub-panel" class="pb-sub-panel" style="display: none; margin-top: 12px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: 0;">
                    <div class="pb-sub-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; font-size: 0.875rem;">Substitution Options</span>
                        <button id="pb-sub-close" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; line-height: 1;">&times;</button>
                    </div>
                    <div id="pb-sub-content"></div>
                </div>
            </div>
        `;

        this.setupPadInteraction();
        this.updateCursorPosition();
        this.bindGenerationControls();

        // Dynamic module width based on progression length
        try {
            const moduleEl = this.container.closest('.planet-module[data-module="progression"]');
            if (moduleEl) {
                moduleEl.classList.remove('wide','xl');
                const len = this.state.currentProgression.length;
                if (len >= 6) moduleEl.classList.add('wide');
                if (len >= 10) moduleEl.classList.add('xl');
            }
        } catch(e) { /* non-fatal */ }
    }

    /**
     * Setup 2D pad interaction
     */
    setupPadInteraction() {
        const pad = this.container.querySelector('#pg-2d-pad');
        const regenerateBtn = this.container.querySelector('#pg-regenerate');

        if (!pad) return;

        // Clean up any prior document-level handlers to avoid duplicates after re-render
        if (this._docMouseMove) document.removeEventListener('mousemove', this._docMouseMove);
        if (this._docMouseUp) document.removeEventListener('mouseup', this._docMouseUp);

        // Compute x,y from mouse relative to the current pad's content box (exclude borders)
        this._updateFromMouse = (e) => {
            const padEl = this.container?.querySelector('#pg-2d-pad');
            if (!padEl) return;
            const rect = padEl.getBoundingClientRect();
            const cs = window.getComputedStyle(padEl);
            const bl = parseFloat(cs.borderLeftWidth) || 0;
            const bt = parseFloat(cs.borderTopWidth) || 0;
            const cw = padEl.clientWidth || 1; // content width (no border)
            const ch = padEl.clientHeight || 1;

            const localX = (e.clientX - rect.left - bl);
            const localY = (e.clientY - rect.top - bt);
            const x = Math.max(0, Math.min(1, localX / cw));
            const y = Math.max(0, Math.min(1, localY / ch));

            // Horizontal: Complexity (continuous 0-100)
            this.state.complexity = Math.round(x * 100);
            
            // Vertical: Grade tier (0-4, snapped to 20% bands)
            // Bottom 20% = tier 0, next 20% = tier 1, etc. up to top 20% = tier 4
            const tierFromBottom = Math.floor((1 - y) * 5); // Invert Y, map to 0-4
            this.state.gradeTier = Math.max(0, Math.min(4, tierFromBottom));
            
            console.log('🎛️ Controls updated:', { complexity: this.state.complexity, gradeTier: this.state.gradeTier });

            // Update cursor immediately without full re-render
            this.updateCursorPosition();
        };

        // Bind events
        pad.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this._updateFromMouse(e);
        });

        this._docMouseMove = (e) => {
            if (this.isDragging) this._updateFromMouse(e);
        };
        this._docMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                console.log('🎯 Generating on mouseup with:', { complexity: this.state.complexity, gradeTier: this.state.gradeTier });
                // Generate once on release to avoid re-render churn while dragging
                this.generateProgression();
            }
        };
        document.addEventListener('mousemove', this._docMouseMove);
        document.addEventListener('mouseup', this._docMouseUp);

        pad.addEventListener('click', (e) => {
            this._updateFromMouse(e);
            console.log('🖱️ Generating on click with:', { complexity: this.state.complexity, gradeTier: this.state.gradeTier });
            this.generateProgression();
        });

        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                this.generateProgression();
            });
        }

        // New handlers for UI toggles
        const toggleHelpBtn = this.container.querySelector('#pg-toggle-help');
        if (toggleHelpBtn) {
            toggleHelpBtn.addEventListener('click', () => {
                this.state.isHelpVisible = !this.state.isHelpVisible;
                this.render();
            });
        }

        const togglePadBtn = this.container.querySelector('#pg-toggle-pad');
        if (togglePadBtn) {
            togglePadBtn.addEventListener('click', () => {
                this.state.isPadCollapsed = !this.state.isPadCollapsed;
                this.render();
            });
        }
    }

    /**
     * Update cursor position on 2D pad
     */
    updateCursorPosition() {
        const cursor = this.container?.querySelector('#pg-2d-cursor');
        const padEl = this.container?.querySelector('#pg-2d-pad');
        if (!cursor || !padEl) return;

        const w = padEl.clientWidth || 160;
        const h = padEl.clientHeight || 180;
        
        // Horizontal: smooth complexity
        const x = Math.max(0, Math.min(w, (this.state.complexity / 100) * w));
        
        // Vertical: snap to center of grade tier band
        // Each tier is 20% of height, position cursor in the middle of the tier's band
        const tierY = (4 - this.state.gradeTier) / 5; // Convert tier to position (inverted: 4 at top, 0 at bottom)
        const y = Math.max(0, Math.min(h, tierY * h + (h / 10))); // Add half band height to center

        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        
        // Update cursor color border to match tier
        const tierInfo = this.getGradeTierInfo(this.state.gradeTier);
        cursor.style.borderColor = tierInfo.color;
        cursor.style.boxShadow = `0 0 12px ${tierInfo.color}`;
    }

    /**
     * Bind generation controls (mode and degree selection)
     */
    bindGenerationControls() {
        const modeBtn = this.container.querySelector('#pg-mode-prog');
        const degreeBtns = this.container.querySelectorAll('.pg-degree-btn');
        const exploreSel = this.container.querySelector('#pg-explore-logic');
        
    // Advanced harmony UI removed; keep internal state defaults.
    // Grading selector moved to control deck, handled by modular-music-theory.html

        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                if (this.state.generateMode !== 'progression') {
                    this.state.generateMode = 'progression';
                    this.generateProgression();
                } else {
                    // Regenerate full to get a fresh take
                    this.generateProgression();
                }
            });
        }

        degreeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10) || 0;
                this.state.generateMode = 'degree';
                this.state.generateIndex = idx;
                this.generateProgression();
            });
        });

        if (exploreSel) {
            exploreSel.addEventListener('change', (e) => {
                const val = e.target.value;
                this.state.exploreLogic = val;
                // Regenerate to apply new logic (full progression for clarity)
                this.state.generateMode = 'progression';
                this.generateProgression();
            });
        }

        // (Advanced harmony UI event bindings removed)

        // Substitution button clicks
        this.container.querySelectorAll('.pb-sub-btn, .pb-chord').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(el.getAttribute('data-index'), 10);
                if (!isNaN(idx)) {
                    this.showSubstitutionPanel(idx);
                }
            });
        });

        // Close substitution panel
        const closeBtn = this.container.querySelector('#pb-sub-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const panel = this.container.querySelector('#pb-sub-panel');
                if (panel) panel.style.display = 'none';
            });
        }

        // Suggest alternatives button
        const suggestBtn = this.container.querySelector('.pb-suggest-alternatives');
        if (suggestBtn) {
            suggestBtn.addEventListener('click', () => {
                this.suggestProgressionAlternatives();
            });
        }

        // Show analysis button
        const analysisBtn = this.container.querySelector('.pb-show-analysis');
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => {
                this.showProgressionAnalysis();
            });
        }
    }

    /**
     * Show substitution options for a chord at the given index
     */
    showSubstitutionPanel(index) {
        const panel = this.container.querySelector('#pb-sub-panel');
        const content = this.container.querySelector('#pb-sub-content');
        if (!panel || !content) return;

        const chord = this.state.currentProgression[index];
        const meta = this.state.progressionMeta[index] || {};
        const degree = this.state.inputNumbers[index];

        // Get substitution options
        const subs = this.getSubstitutionOptions(chord, degree, meta);

        content.innerHTML = `
            <div style="margin-bottom: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                Current: <strong>${chord}</strong> ${meta.degree ? `(degree ${meta.degree})` : ''}
            </div>
            <div style="display: grid; gap: 6px;">
                ${subs.map(sub => `
                    <button class="pb-sub-option" data-index="${index}" data-chord="${sub.fullName}" data-root="${sub.root}" data-type="${sub.chordType}"
                            style="padding: 8px; border: 1px solid var(--border-color); border-left: 3px solid ${sub.color || '#6b7280'}; border-radius: 4px; background: var(--background-color); cursor: pointer; text-align: left; transition: all 0.2s;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; font-size: 0.875rem;">${sub.fullName}</span>
                            <span style="font-size: 0.7rem; color: ${sub.color || '#6b7280'};">${sub.label}</span>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${sub.reason}</div>
                    </button>
                `).join('')}
            </div>
        `;

        // Wire up substitution clicks
        content.querySelectorAll('.pb-sub-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const root = btn.getAttribute('data-root');
                const type = btn.getAttribute('data-type');
                this.substituteChord(idx, root, type);
                panel.style.display = 'none';
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'var(--surface-color)';
                btn.style.borderColor = 'var(--primary-color)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'var(--background-color)';
                btn.style.borderColor = 'var(--border-color)';
            });
        });

        panel.style.display = 'block';
    }

    /**
     * Get substitution options for a chord
     */
    getSubstitutionOptions(chordName, degree, meta) {
        const subs = [];
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale) || [];
            
            // Parse current chord
            const match = chordName.match(/^([A-G][#b]?)(.*)$/);
            if (!match) return subs;
            const root = match[1];
            const type = match[2] || 'maj';

            // If in harmony mode, show other container chords for the same note
            if (this.state.harmonizationMode === 'harmony' && degree) {
                const note = scaleNotes[(degree - 1) % scaleNotes.length];
                const containers = this.musicTheory.findAllContainerChords([note], scaleNotes) || [];
                
                containers.slice(0, 5).forEach(c => {
                    if (c.fullName !== chordName) {
                        const grade = this.getChordGradeScore(c, { root, chordType: type }, scaleNotes);
                        const tierInfo = this.getGradeTierInfo(grade);
                        subs.push({
                            fullName: c.fullName,
                            root: c.root,
                            chordType: c.chordType,
                            label: tierInfo.short,
                            color: tierInfo.color,
                            reason: `Contains ${note} · ${c.functions ? c.functions.join(', ') : 'Container'}`
                        });
                    }
                });
            }

            // Secondary dominant
            const targetRoot = this.musicTheory.getNoteFromInterval(root, 5);
            if (targetRoot) {
                const tierInfo = this.getGradeTierInfo(3); // Excellent
                subs.push({
                    fullName: root + '7',
                    root,
                    chordType: '7',
                    label: 'V7',
                    color: tierInfo.color,
                    reason: `Secondary dominant → ${targetRoot}`
                });
            }

            // Tritone substitution
            const subRoot = this.musicTheory.getNoteFromInterval(root, 6);
            if (subRoot) {
                const tierInfo = this.getGradeTierInfo(2); // Good
                subs.push({
                    fullName: subRoot + '7',
                    root: subRoot,
                    chordType: '7',
                    label: 'SubV',
                    color: tierInfo.color,
                    reason: `Tritone sub of ${root}7`
                });
            }

            // Modal interchange (parallel minor/major)
            const isMajor = this.state.currentScale === 'major';
            if (isMajor && type.includes('maj')) {
                const tierInfo = this.getGradeTierInfo(3); // Excellent
                subs.push({
                    fullName: root + 'm7',
                    root,
                    chordType: 'm7',
                    label: 'MI',
                    color: tierInfo.color,
                    reason: 'Modal interchange from parallel minor'
                });
            } else if (!isMajor && type.includes('m')) {
                const tierInfo = this.getGradeTierInfo(3); // Excellent
                subs.push({
                    fullName: root + 'maj7',
                    root,
                    chordType: 'maj7',
                    label: 'MI',
                    color: tierInfo.color,
                    reason: 'Modal interchange from parallel major'
                });
            }

            // Related ii-V
            const iiRoot = this.musicTheory.getNoteFromInterval(root, 2);
            if (iiRoot && type.includes('7') && !type.includes('maj7')) {
                const tierInfo = this.getGradeTierInfo(4); // Perfect
                subs.push({
                    fullName: iiRoot + 'm7',
                    root: iiRoot,
                    chordType: 'm7',
                    label: 'ii',
                    color: tierInfo.color,
                    reason: `Setup: ${iiRoot}m7 → ${root}7`
                });
            }

        } catch (e) {
            console.error('Error generating substitutions:', e);
        }

        return subs;
    }

    /**
     * Suggest alternatives for low-tier chords in the progression
     */
    suggestProgressionAlternatives() {
        const lowTierChords = [];
        
        // Find chords with low grading tiers (0-1)
        this.state.currentProgression.forEach((chord, index) => {
            const meta = this.state.progressionMeta[index] || {};
            const tier = meta.chosenGrade || 2;
            
            if (tier <= 1) {
                const context = { 
                    elementType: 'chord', 
                    key: this.state.currentKey, 
                    scaleType: this.state.currentScale 
                };
                
                try {
                    const alternatives = this.musicTheory.suggestAlternatives(chord, 3, context);
                    if (alternatives && alternatives.length > 0) {
                        lowTierChords.push({
                            index: index,
                            chord: chord,
                            tier: tier,
                            alternatives: alternatives.slice(0, 3) // Limit to top 3
                        });
                    }
                } catch (e) {
                    console.warn('Failed to get alternatives for', chord, e);
                }
            }
        });
        
        if (lowTierChords.length === 0) {
            alert('No low-tier chords found that need alternatives. All chords are already well-graded!');
            return;
        }
        
        // Show alternatives in a modal or panel
        this.showAlternativesPanel(lowTierChords);
    }

    /**
     * Show progression grading analysis
     */
    showProgressionAnalysis() {
        const analysis = {
            totalChords: this.state.currentProgression.length,
            gradingBreakdown: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
            averageGrade: 0,
            recommendations: []
        };
        
        let gradeSum = 0;
        
        this.state.progressionMeta.forEach((meta, index) => {
            const tier = meta.chosenGrade || 2;
            analysis.gradingBreakdown[tier]++;
            gradeSum += tier;
        });
        
        analysis.averageGrade = gradeSum / analysis.totalChords;
        
        // Generate recommendations
        if (analysis.averageGrade < 2.5) {
            analysis.recommendations.push('Consider using higher-tier chords for better harmonic quality');
        }
        if (analysis.gradingBreakdown[0] + analysis.gradingBreakdown[1] > analysis.totalChords * 0.3) {
            analysis.recommendations.push('Many low-tier chords detected - use "Suggest Alternatives" for improvements');
        }
        if (analysis.gradingBreakdown[4] === analysis.totalChords) {
            analysis.recommendations.push('Excellent! All chords are perfectly graded');
        }
        
        this.showAnalysisPanel(analysis);
    }

    /**
     * Show alternatives panel for low-tier chords
     */
    showAlternativesPanel(lowTierChords) {
        const panel = this.container.querySelector('#pb-sub-panel');
        const content = this.container.querySelector('#pb-sub-content');
        if (!panel || !content) return;

        content.innerHTML = `
            <div style="margin-bottom: 12px;">
                <strong>Alternative Suggestions</strong>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    Found ${lowTierChords.length} low-tier chord(s) that could be improved:
                </div>
            </div>
            ${lowTierChords.map(item => `
                <div style="margin-bottom: 16px; padding: 12px; border: 1px solid var(--border-color); border-radius: 4px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">
                        Position ${item.index + 1}: ${item.chord} 
                        <span style="color: ${this.getGradeTierInfo(item.tier).color};">
                            (${this.getGradeTierInfo(item.tier).short})
                        </span>
                    </div>
                    <div style="display: grid; gap: 6px;">
                        ${item.alternatives.map(alt => `
                            <button class="pb-alt-option" 
                                    data-index="${item.index}" 
                                    data-chord="${alt.element}"
                                    style="padding: 6px 8px; border: 1px solid var(--border-color); 
                                           border-left: 3px solid ${this.getGradeTierInfo(alt.tier).color}; 
                                           border-radius: 4px; background: var(--background-color); 
                                           cursor: pointer; text-align: left;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600;">${alt.element}</span>
                                    <span style="color: ${this.getGradeTierInfo(alt.tier).color}; font-size: 0.8rem;">
                                        ${this.getGradeTierInfo(alt.tier).short}
                                    </span>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                                    ${alt.explanation.length > 60 ? alt.explanation.substring(0, 60) + '...' : alt.explanation}
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        // Wire up alternative selection
        content.querySelectorAll('.pb-alt-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                const chordName = btn.getAttribute('data-chord');
                
                // Parse chord to get root and type
                const match = chordName.match(/^([A-G][#b]?)(.*)$/);
                if (match) {
                    const root = match[1];
                    const type = match[2] || 'maj';
                    this.substituteChord(index, root, type);
                    panel.style.display = 'none';
                }
            });
        });

        panel.style.display = 'block';
    }

    /**
     * Show analysis panel with grading breakdown
     */
    showAnalysisPanel(analysis) {
        const panel = this.container.querySelector('#pb-sub-panel');
        const content = this.container.querySelector('#pb-sub-content');
        if (!panel || !content) return;

        const tierLabels = ['Experimental', 'Fair', 'Good', 'Excellent', 'Perfect'];
        
        content.innerHTML = `
            <div style="margin-bottom: 12px;">
                <strong>Progression Grading Analysis</strong>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    Current grading mode: ${this.state.gradingType || 'functional'}
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Overall Statistics</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem;">
                    <div>Total Chords: ${analysis.totalChords}</div>
                    <div>Average Grade: ${analysis.averageGrade.toFixed(1)}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; margin-bottom: 8px;">Grade Distribution</div>
                ${Object.entries(analysis.gradingBreakdown).map(([tier, count]) => {
                    const tierInfo = this.getGradeTierInfo(parseInt(tier));
                    const percentage = ((count / analysis.totalChords) * 100).toFixed(0);
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="color: ${tierInfo.color};">
                                ${tierInfo.short} (${tierLabels[tier]})
                            </span>
                            <span>${count} chords (${percentage}%)</span>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${analysis.recommendations.length > 0 ? `
                <div>
                    <div style="font-weight: 600; margin-bottom: 8px;">Recommendations</div>
                    ${analysis.recommendations.map(rec => `
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">
                            • ${rec}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        panel.style.display = 'block';
    }

    /**
     * Substitute a chord at the given index
     */
    substituteChord(index, root, chordType) {
        if (index < 0 || index >= this.state.currentProgression.length) return;

        const fullName = root + chordType;
        this.state.currentProgression[index] = fullName;
        
        // Update meta
        if (this.state.progressionMeta[index]) {
            this.state.progressionMeta[index].chordRoot = root;
            this.state.progressionMeta[index].chordType = chordType;
            this.state.progressionMeta[index].isSubstitution = true;
        }

        this.emit('progressionChanged', {
            progression: this.state.currentProgression,
            meta: this.state.progressionMeta,
            complexity: this.state.complexity,
            gradeTier: this.state.gradeTier,
            mode: 'substitution',
            index
        });

        this.render();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressionBuilder;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.ProgressionBuilder = ProgressionBuilder;
}
