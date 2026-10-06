/**
 * @module ScaleRelationshipExplorer
 * @description Explorer for finding scales containing a chord and analyzing relationships
 * @exports class ScaleRelationshipExplorer
 */

class ScaleRelationshipExplorer {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ScaleRelationshipExplorer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            inputChord: '',
            parsedChord: null,
            containingScales: [],
            relationships: {
                parallel: [],
                fifthAbove: [],
                fifthBelow: [],
                relative: []
            },
            selectedRelationshipFilter: 'all',
            builderRoot: null,
            // Results are paged, not truncated. The catalog is ~1,500 scale
            // types across 12 roots, so an ordinary chord is inside thousands
            // of them; a hard cap of 50 with an "...and N more" line put the
            // other several thousand permanently out of reach.
            page: 0,
            pageSize: 50,
            rootFilter: 'all',
            nameQuery: '',
            parseError: null
        };

        this.containerElement = null;
    }

    mount(selector) {
        this.containerElement = document.querySelector(selector);
        if (!this.containerElement) {
            console.error(`ScaleRelationshipExplorer: Container ${selector} not found`);
            return;
        }
        this.subscribeToScaleChanges();
        this.render();
    }

    /**
     * The builder reads the library's active scale, but only ever did so at
     * mount — so it sat on whatever was loaded then (C major) no matter what
     * the picker said afterwards, and its degree buttons described a scale you
     * were no longer in. The library already emits 'scaleChanged'; listen.
     *
     * Temporary contexts (pushKeyAndScale / withTempKeyAndScale) emit the same
     * event while the stack is non-empty, so those are ignored — otherwise the
     * panel would flicker through scales the user never selected.
     */
    subscribeToScaleChanges() {
        if (this._scaleSub) return;
        const library = (typeof window !== 'undefined' && window.modularApp)
            ? window.modularApp.scaleLibrary : null;
        if (!library || typeof library.on !== 'function') return;

        this._scaleSub = () => {
            if (Array.isArray(library.scaleStack) && library.scaleStack.length) return;
            if (!this.containerElement) return;
            // A degree chosen in the old scale means nothing in the new one.
            this.state.builderRoot = null;
            this.render();
        };
        library.on('scaleChanged', this._scaleSub);
    }

    destroy() {
        const library = (typeof window !== 'undefined' && window.modularApp)
            ? window.modularApp.scaleLibrary : null;
        if (library && this._scaleSub && typeof library.off === 'function') {
            library.off('scaleChanged', this._scaleSub);
        }
        this._scaleSub = null;
    }

    render() {
        if (!this.containerElement) return;

        this.containerElement.innerHTML = `
            <div class="scale-relationship-explorer" style="padding: 10px; color: var(--text-main);">
                <div class="input-section" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 0.8rem;">ENTER CHORD</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="sre-chord-input" 
                            value="${this.state.inputChord}" 
                            placeholder="e.g. Cm7, G7, F#maj9"
                            autocapitalize="off" autocorrect="off" spellcheck="false"
                            style="flex: 1; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); padding: 8px; font-family: var(--font-tech);">
                        <button id="sre-analyze-btn" style="background: var(--accent-primary); color: #000; border: none; padding: 0 15px; font-weight: bold; cursor: pointer;">ANALYZE</button>
                    </div>
                    ${this.renderTonicSelector()}
                    ${this.renderChordSyntaxGuide()}
                    ${this.renderChordBuilder()}
                </div>

                <div id="sre-results">
                    ${this.renderResults()}
                </div>
            </div>
        `;

        // Attach event listeners
        const input = this.containerElement.querySelector('#sre-chord-input');
        const btn = this.containerElement.querySelector('#sre-analyze-btn');

        if (input) {
            input.addEventListener('change', (e) => this.handleInput(e.target.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleInput(e.target.value);
            });
        }
        if (btn) {
            btn.addEventListener('click', () => {
                if (input) this.handleInput(input.value);
            });
        }
        
        // Bind filter and preview events after DOM is ready
        this.bindFilterEvents();
        this.bindApplyScaleEvents();
        this.bindPreviewEvents();
        this.bindChordBuilderEvents();
        this.bindResultControlEvents();
        this.restoreFocus();
    }

    /**
     * render() replaces the panel's whole innerHTML, so anything typed into a
     * field that triggers a re-render loses focus and caret mid-word. Callers
     * name the field they want back.
     */
    rememberFocus(selector, caret) {
        this._restoreFocusTarget = { selector, caret };
    }

    restoreFocus() {
        const target = this._restoreFocusTarget;
        this._restoreFocusTarget = null;
        if (!target || !this.containerElement) return;
        const el = this.containerElement.querySelector(target.selector);
        if (!el) return;
        el.focus();
        if (typeof el.setSelectionRange === 'function') {
            const pos = (target.caret == null) ? el.value.length : target.caret;
            try { el.setSelectionRange(pos, pos); } catch (_) {}
        }
    }

    bindChordBuilderEvents() {
        if (!this.containerElement) return;

        // Reuse the library's own scale-picker modal rather than building a
        // second scale browser that could drift out of sync with it.
        const pickerBtn = this.containerElement.querySelector('#sre-scale-picker-btn');
        if (pickerBtn) {
            pickerBtn.addEventListener('click', () => {
                const modal = document.getElementById('scale-picker-modal');
                if (!modal) return;
                modal.style.display = 'flex';
                setTimeout(() => {
                    const search = document.getElementById('scale-search-input');
                    if (search) search.focus();
                }, 100);
            });
        }

        this.containerElement.querySelectorAll('.sre-degree-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const root = btn.getAttribute('data-root');
                // Clicking the selected degree again collapses the quality palette.
                this.state.builderRoot = (this.state.builderRoot === root) ? null : root;
                this.render();
            });
        });

        this.containerElement.querySelectorAll('.sre-quality-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const root = btn.getAttribute('data-root');
                const quality = btn.getAttribute('data-quality');
                this.handleInput(`${root}${quality}`);
            });
        });
    }

    /**
     * Case matters in chord symbols ('m7' vs 'maj7'), and the input is no longer
     * visually uppercased, so spell out the convention rather than leaving users
     * to guess whether "M7" means major or minor.
     */
    renderChordSyntaxGuide() {
        const rows = [
            ['maj / (blank)', 'major triad', 'C, Cmaj'],
            ['m', 'minor triad', 'Cm'],
            ['maj7', 'major 7th', 'Cmaj7'],
            ['m7', 'minor 7th', 'Cm7'],
            ['7', 'dominant 7th', 'C7'],
            ['dim / dim7', 'diminished', 'Cdim7'],
            ['aug', 'augmented', 'Caug'],
            ['sus2 / sus4', 'suspended', 'Csus4'],
            ['m7b5', 'half-diminished', 'Cm7b5'],
            ['9 / 11 / 13', 'extensions', 'C9, Cmaj13'],
            ['b9 / #9 / #11 / b13', 'alterations', 'C7b9']
        ];

        return `
            <details class="sre-syntax-guide" style="margin-top: 8px;">
                <summary style="cursor: pointer; font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.5px;">Chord spelling guide</summary>
                <div style="margin-top: 6px; padding: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-light); border-radius: 4px;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">
                        Case-sensitive: lowercase <code style="color: var(--accent-primary);">m</code> is minor,
                        <code style="color: var(--accent-primary);">maj</code> is major.
                        <code style="color: var(--accent-primary);">Cm7</code> is C minor 7 &mdash; for C major 7 type <code style="color: var(--accent-primary);">Cmaj7</code>.
                    </div>
                    <div style="display: grid; grid-template-columns: auto auto 1fr; gap: 3px 10px; font-size: 0.75rem;">
                        ${rows.map(([suffix, meaning, example]) => `
                            <code style="color: var(--accent-primary);">${suffix}</code>
                            <span style="color: var(--text-muted);">${meaning}</span>
                            <code style="color: var(--text-muted);">${example}</code>
                        `).join('')}
                    </div>
                </div>
            </details>
        `;
    }

    /**
     * Returns the currently loaded key/scale plus a pitch-class bitmask of its
     * notes, or null when no scale library is available.
     */
    getActiveScaleContext() {
        const library = (typeof window !== 'undefined' && window.modularApp)
            ? window.modularApp.scaleLibrary
            : null;
        if (!library || typeof library.getCurrentScaleNotes !== 'function') return null;

        const key = library.getCurrentKey ? library.getCurrentKey() : null;
        const scaleName = library.getCurrentScale ? library.getCurrentScale() : null;
        const notes = (library.getCurrentScaleNotes() || []).map(n => String(n).replace(/[0-9]/g, ''));
        if (!key || !scaleName || notes.length === 0) return null;

        const getVal = (n) => this.musicTheory.noteValues ? this.musicTheory.noteValues[n] : -1;
        const mask = notes.reduce((m, n) => {
            const v = getVal(n);
            return v >= 0 ? m | (1 << (v % 12)) : m;
        }, 0);

        return { key, scaleName, notes, mask };
    }

    /** True when every note of `root + quality` is present in the active scale. */
    chordFitsScale(root, quality, scaleMask) {
        try {
            const notes = this.musicTheory.getChordNotes(root, quality);
            if (!notes || notes.length === 0) return false;
            const getVal = (n) => this.musicTheory.noteValues ? this.musicTheory.noteValues[n] : -1;
            return notes.every(n => {
                const v = getVal(n);
                return v >= 0 && (scaleMask & (1 << (v % 12))) !== 0;
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Pick a scale degree, then build on it. Chord qualities are grouped by how
     * they relate to the loaded scale: the stacked-thirds diatonic chord first,
     * then other qualities whose notes still come entirely from the scale
     * (sus4 in major, for example), then the rest as deliberate departures.
     */
    renderChordBuilder() {
        const ctx = this.getActiveScaleContext();
        if (!ctx) return '';

        const selectedRoot = this.state.builderRoot;
        const displayScale = String(ctx.scaleName).replace(/_/g, ' ');

        // One button per degree the scale actually has — eight for octatonic,
        // five for a pentatonic — each labelled with its numeral so a specific
        // degree can be picked directly instead of only the suggested ones.
        const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        const degreeButtons = ctx.notes.map((note, i) => {
            const isSelected = note === selectedRoot;
            const numeral = NUMERALS[i] || String(i + 1);
            let quality = '';
            try {
                const d = this.musicTheory.getDiatonicChord(i + 1, ctx.key, ctx.scaleName);
                if (d && d.chordType) quality = d.chordType;
            } catch (e) { /* label degrades to the note name alone */ }
            return `
                <button class="sre-degree-btn" data-root="${note}" data-degree="${i + 1}"
                    title="Degree ${numeral}${quality ? ' — ' + note + quality : ''}"
                    style="background: ${isSelected ? 'var(--accent-primary)' : 'transparent'}; color: ${isSelected ? '#000' : 'var(--text-main)'}; border: 1px solid var(--border-light); font-size: 0.75rem; padding: 4px 8px; cursor: pointer; border-radius: 3px; font-family: var(--font-tech); font-weight: bold; text-transform: none; display: inline-flex; align-items: baseline; gap: 4px;">
                    <span style="opacity: 0.6; font-size: 0.65rem;">${numeral}</span>${note}${quality ? `<span style="opacity: 0.5; font-size: 0.62rem;">${quality}</span>` : ''}
                </button>
            `;
        }).join('');

        let qualitySection = `
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
                Pick a degree above to build a chord on it.
            </div>
        `;

        if (selectedRoot) {
            const degreeIndex = ctx.notes.indexOf(selectedRoot);
            let diatonicQuality = null;
            try {
                const diatonic = this.musicTheory.getDiatonicChord(degreeIndex + 1, ctx.key, ctx.scaleName);
                if (diatonic && diatonic.chordType) diatonicQuality = diatonic.chordType;
            } catch (e) { /* fall through to the generic palette */ }

            const palette = ['maj', 'm', 'dim', 'aug', 'sus2', 'sus4', 'maj7', 'm7', '7',
                             'm7b5', 'dim7', '6', 'm6', '7sus4', '9', 'maj9', 'm9', '11', '13'];
            const qualities = diatonicQuality && !palette.includes(diatonicQuality)
                ? [diatonicQuality, ...palette]
                : palette;

            const inScale = [];
            const outside = [];
            qualities.forEach(q => {
                if (q === diatonicQuality) return;
                (this.chordFitsScale(selectedRoot, q, ctx.mask) ? inScale : outside).push(q);
            });

            const button = (q, variant) => {
                const styles = {
                    diatonic: 'background: var(--accent-primary); color: #000; border: 1px solid var(--accent-primary);',
                    inScale: 'background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--border-light);',
                    outside: 'background: transparent; color: var(--text-muted); border: 1px dashed var(--border-light);'
                }[variant];
                // text-transform must stay none: 'Cm' vs 'Cmaj' is the whole point.
                return `<button class="sre-quality-btn" data-root="${selectedRoot}" data-quality="${q}"
                    style="${styles} font-size: 0.75rem; padding: 3px 8px; cursor: pointer; border-radius: 3px; font-family: var(--font-tech); text-transform: none;">${selectedRoot}${q}</button>`;
            };

            const group = (label, hint, html) => html
                ? `<div style="margin-top: 8px;">
                       <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${label} <span style="text-transform: none; letter-spacing: 0; opacity: 0.7;">${hint}</span></div>
                       <div style="display: flex; flex-wrap: wrap; gap: 4px;">${html}</div>
                   </div>`
                : '';

            qualitySection = `
                ${group('Diatonic', '&mdash; built from the scale itself', diatonicQuality ? button(diatonicQuality, 'diatonic') : '')}
                ${group('Also in scale', '&mdash; every note stays in the scale', inScale.map(q => button(q, 'inScale')).join(''))}
                ${group('Outside the scale', '&mdash; borrows notes from elsewhere', outside.map(q => button(q, 'outside')).join(''))}
            `;
        }

        // Same picker control the rest of the app uses, so the active scale is
        // both visible and changeable from here rather than being an opaque
        // label that silently disagreed with the picker.
        return `
            <div class="sre-chord-builder" style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Build from</span>
                    <button id="sre-scale-picker-btn" class="scale-picker-button" type="button"
                        title="Change the scale this builder works in">
                        <span class="current-scale-name">${ctx.key} ${displayScale}</span>
                        <span class="picker-icon">▼</span>
                    </button>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">${degreeButtons}</div>
                ${qualitySection}
            </div>
        `;
    }

    /** Pitch class of any spelling the engine can read, or null. */
    pitchClassOf(note) {
        if (!note) return null;
        if (typeof this.musicTheory.pitchClassOf === 'function') {
            return this.musicTheory.pitchClassOf(note);
        }
        const v = this.musicTheory.noteValues ? this.musicTheory.noteValues[note] : undefined;
        return v === undefined ? null : v;
    }

    /**
     * Relationship-filtered results, before the tonic and name filters.
     * Shared so the tonic buttons' counts and the list they page through are
     * the same set — a button reading "50" that yields 43 rows is a bug.
     */
    getRelationshipFiltered() {
        const labelMap = {
            tonic: 'Tonic',
            dominant: 'Dominant',
            subdominant: 'Subdominant',
            mediant: 'Mediant'
        };
        const key = this.state.selectedRelationshipFilter;
        if (key === 'all') return this.state.containingScales;
        return this.state.containingScales.filter(sc => sc.relationshipLabel === labelMap[key]);
    }

    /**
     * WHICH TONIC THE SCALE IS BUILT ON — not the chord's root.
     *
     * "Where can I play a C#7 if the scale is rooted on C" is the question the
     * panel exists to answer, and it had no control at all: the results came
     * back ordered by an opinion about relevance and you scrolled looking for
     * the tonic you actually wanted, through a list that stopped at 50 anyway.
     *
     * It sits directly under the chord field because that is where the hand
     * already is, and it is deliberately the ONLY row of note buttons up here:
     * a second row that re-rooted the chord instead read as this one and sent
     * people the wrong way.
     *
     * All twelve tonics, always, in a fixed place, each carrying how many
     * scales rooted there contain the chord. A tonic with none is greyed
     * rather than dropped — "nothing rooted on D holds this chord" is an
     * answer, and a row that reshuffles itself per chord cannot be aimed at.
     */
    renderTonicSelector() {
        const scales = this.getRelationshipFiltered();
        const counts = new Map();
        scales.forEach(sc => counts.set(sc.root, (counts.get(sc.root) || 0) + 1));
        const analyzed = !!this.state.parsedChord;
        const chord = analyzed ? `${this.state.parsedChord.root}${this.state.parsedChord.type}` : '';

        const button = (value, label, count) => {
            const selected = this.state.rootFilter === value;
            const empty = analyzed && count === 0;
            const style = selected
                ? 'background: var(--accent-primary); color: #000; border: 1px solid var(--accent-primary); font-weight: bold;'
                : empty
                    ? 'background: transparent; color: var(--text-muted); border: 1px dashed var(--border-light); opacity: 0.45;'
                    : 'background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--border-light);';
            const title = !analyzed
                ? `Show only scales rooted on ${label}`
                : value === 'all'
                    ? `Every tonic — ${count} scale${count === 1 ? '' : 's'} in all`
                    : empty
                        ? `No scale rooted on ${label} contains ${chord}`
                        : `${count} scale${count === 1 ? '' : 's'} rooted on ${label} contain ${chord}`;
            // The count is the point of the button, so it is only hidden before
            // there is a chord to count against.
            const badge = analyzed
                ? `<span style="opacity: 0.55; font-size: 0.65rem; margin-left: 3px;">${count}</span>`
                : '';
            return `<button type="button" class="sre-tonic-btn" data-tonic="${value}" title="${title}"
                style="${style} font-size: 0.75rem; padding: 3px 7px; cursor: pointer; border-radius: 3px; font-family: var(--font-tech); text-transform: none;">${label}${badge}</button>`;
        };

        return `
            <div class="sre-tonic-selector" style="margin-top: 10px;">
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    Scale tonic
                    <span style="text-transform: none; letter-spacing: 0; opacity: 0.7;">&mdash; find ${chord ? `<code style="color: var(--accent-primary);">${chord}</code>` : 'the chord'} in scales rooted on&hellip;</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${button('all', 'Any', scales.length)}
                    ${this.getScaleRoots().map(r => button(r, r, counts.get(r) || 0)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * WHAT COUNTS AS A CHORD SYMBOL.
     *
     * The field only ever understood the ~32 exact keys in chordFormulas. Type
     * Cadd9, F6/9, Bbm13, A7alt, C#m(maj7), G7/B — all ordinary symbols — and
     * it parsed to nothing and the panel said "Enter a chord" as if you had
     * typed nothing at all, with no hint that the root was fine and the
     * suffix was not.
     *
     * A symbol is a root, a core quality, an extension, and a pile of
     * alterations. Read it that way. The engine's table is still consulted
     * first, so every symbol that worked before produces exactly what it did
     * before; this only decides what happens where it used to give up.
     *
     * Returns { root, type, bass, notes } or { error } naming the part that
     * could not be read.
     */
    parseChordSymbol(symbol) {
        const raw = String(symbol == null ? '' : symbol).trim();
        if (!raw) return { error: null };

        // Accidental and jazz glyphs people actually type or paste.
        let text = raw
            .replace(/\u{1D12A}/gu, '##').replace(/\u{1D12B}/gu, 'bb')
            .replace(/[♯]/g, '#').replace(/[♭]/g, 'b').replace(/[♮]/g, '')
            .replace(/[Δ∆](?=\s*\d)/g, 'maj')   // Δ7 / Δ9 -> maj7 / maj9
            .replace(/[Δ∆]/g, 'maj7')           // bare Δ is maj7
            .replace(/[øØ]/g, 'm7b5')
            .replace(/[°˚◦]/g, 'dim')
            .replace(/[–—−]/g, '-')
            .replace(/\s+/g, '');

        const rootMatch = text.match(/^([A-Ga-g])([#b]{0,2})(.*)$/i);
        if (!rootMatch) {
            return { error: `"${raw}" does not start with a note name (A-G).` };
        }
        const root = rootMatch[1].toUpperCase() + rootMatch[2].replace(/B/g, 'b');
        if (this.pitchClassOf(root) === null) {
            return { error: `"${root}" is not a note this engine can read.` };
        }

        let suffix = rootMatch[3];

        // A slash bass, but not the slash in 6/9 or 7/11.
        let bass = null;
        const slash = suffix.lastIndexOf('/');
        if (slash !== -1) {
            const after = suffix.slice(slash + 1);
            const bm = after.match(/^([A-Ga-g])([#b]{0,2})$/i);
            if (bm) {
                bass = bm[1].toUpperCase() + bm[2].replace(/B/g, 'b');
                suffix = suffix.slice(0, slash);
            }
        }

        // The engine's table first, but only on an EXACT formula key, so every
        // symbol that already worked is untouched. Its looser paths are kept
        // for last: the synthetic "base(modifiers)" one answers m(maj7) with a
        // plain minor triad, quietly dropping the maj7 — a wrong chord is
        // worse than no chord, so the rule parser gets the first crack at
        // anything the table does not name outright.
        const formulas = this.musicTheory.chordFormulas || {};
        let exactKey = null;
        if (formulas[suffix]) {
            exactKey = suffix;
        } else if (typeof this.musicTheory.normalizeChordType === 'function') {
            const normalized = this.musicTheory.normalizeChordType(suffix);
            if (formulas[normalized]) exactKey = normalized;
        }

        let notes = [];
        if (exactKey) {
            try { notes = this.musicTheory.getChordNotes(root, exactKey) || []; } catch (_) { notes = []; }
        }

        let builtError = null;
        if (!notes.length) {
            const built = this.qualityToIntervals(suffix);
            if (built.error) {
                builtError = built.error;
            } else {
                notes = built.intervals
                    .map(iv => this.musicTheory.getNoteFromInterval(root, iv))
                    .filter(Boolean);
            }
        }

        if (!notes.length) {
            try { notes = this.musicTheory.getChordNotes(root, suffix) || []; } catch (_) { notes = []; }
        }

        if (!notes.length && builtError) {
            return { error: `${root}: ${builtError}` };
        }

        if (!notes.length) {
            return { error: `Could not work out the notes of "${raw}".` };
        }

        // The bass is part of the sonority, so a scale that lacks it does not
        // contain the chord.
        if (bass) {
            const bassPc = this.pitchClassOf(bass);
            const known = new Set(notes.map(n => this.pitchClassOf(n)));
            if (bassPc !== null && !known.has(bassPc)) notes = [bass, ...notes];
        }

        return { root, type: suffix, bass, notes };
    }

    /**
     * Turn a chord suffix into semitone intervals from the root.
     *
     * Reads the core quality off the front, then consumes modifiers in any
     * order until nothing is left; whatever it cannot consume is reported
     * rather than silently dropped, so "Cmaj7zz" says what it choked on.
     */
    qualityToIntervals(suffix) {
        let s = String(suffix || '').replace(/[()\[\]\s,]/g, '');
        if (!s) return { intervals: [0, 4, 7] };

        let third = 4;
        let fifth = 7;
        let seventh = null;
        let sixth = false;
        let dim = false;
        let omit3 = false;
        let omit5 = false;
        const extras = new Set();
        let ninth = null;   // set by an extension or by b9/#9

        // --- core quality -------------------------------------------------
        if (/^alt/.test(s)) {
            // Altered dominant: 3rd and b7 with every fifth and ninth altered.
            s = s.slice(3);
            third = 4; omit5 = true; seventh = 10;
            [13, 15, 6, 8].forEach(i => extras.add(i));
        } else if (/^5(?![0-9])/.test(s)) {
            s = s.slice(1);
            omit3 = true;
        } else if (/^(minor|min|m)(?!aj)/.test(s)) {
            s = s.replace(/^(minor|min|m)/, '');
            third = 3;
        } else if (/^-/.test(s)) {
            // Leading hyphen is the jazz minor shorthand. A hyphen further in
            // ('7-5') is a flattened degree and is handled as a modifier.
            s = s.slice(1);
            third = 3;
        } else if (/^dim/.test(s)) {
            s = s.slice(3);
            third = 3; fifth = 6; dim = true;
        } else if (/^aug/.test(s)) {
            s = s.slice(3);
            fifth = 8;
        } else if (/^\+(?![0-9])/.test(s)) {
            s = s.slice(1);
            fifth = 8;
        }

        // A major-seventh marker can follow a minor core: m(maj7).
        let majSeventh = false;
        const majMatch = s.match(/^(maj|Maj|MAJ|Ma(?![a-z]))/);
        if (majMatch) {
            s = s.slice(majMatch[0].length);
            majSeventh = true;
        }

        // --- extension ----------------------------------------------------
        const ext = s.match(/^(13|11|9|7|6)/);
        if (ext) {
            s = s.slice(ext[0].length);
            const n = ext[0];
            if (n === '6') {
                sixth = true;
            } else {
                seventh = majSeventh ? 11 : (dim ? 9 : 10);
                if (n === '9') ninth = 14;
                if (n === '11') { ninth = 14; extras.add(17); }
                if (n === '13') {
                    ninth = 14;
                    extras.add(21);
                    // The 11th is left out of dominant and major 13ths (it
                    // clashes with the 3rd) but belongs in a minor 13th.
                    if (third === 3) extras.add(17);
                }
            }
        } else if (majSeventh && /^$/.test(s)) {
            // "Cmaj" on its own is the plain triad, not a major seventh.
        } else if (majSeventh) {
            // "maj" followed by modifiers only, e.g. Cmaj#11
        }

        // --- modifiers, in any order -------------------------------------
        const MODS = [
            [/^sus2/, () => { third = 2; }],
            [/^sus4/, () => { third = 5; }],
            [/^sus(?![0-9])/, () => { third = 5; }],
            [/^add(9|2)/, () => { extras.add(14); }],
            [/^add(11|4)/, () => { extras.add(17); }],
            [/^add(13|6)/, () => { extras.add(21); }],
            [/^add#11/, () => { extras.add(18); }],
            [/^add#9/, () => { extras.add(15); }],
            [/^addb9/, () => { extras.add(13); }],
            [/^(b5|-5)/, () => { fifth = 6; }],
            [/^(#5|\+5)/, () => { fifth = 8; }],
            [/^b9/, () => { ninth = (ninth === 14 || ninth === null) ? 13 : ninth; extras.add(13); }],
            [/^#9/, () => { ninth = (ninth === 14 || ninth === null) ? 15 : ninth; extras.add(15); }],
            [/^#11/, () => { extras.add(18); }],
            [/^b13/, () => { extras.add(20); }],
            [/^#13/, () => { extras.add(22); }],
            [/^b11/, () => { extras.add(16); }],
            [/^b6/, () => { extras.add(8); }],
            [/^alt/, () => {
                // Altered dominant: no plain fifth, both ninths, both fifths.
                omit5 = true;
                if (seventh === null) seventh = 10;
                [13, 15, 6, 8].forEach(i => extras.add(i));
            }],
            [/^(no3|omit3)/, () => { omit3 = true; }],
            [/^(no5|omit5)/, () => { omit5 = true; }],
            [/^\/9/, () => { extras.add(14); }],      // the 6/9 chord
            [/^\/11/, () => { extras.add(17); }],
            [/^\/13/, () => { extras.add(21); }],
            [/^maj7/, () => { seventh = 11; }],
            [/^7/, () => { if (seventh === null) seventh = dim ? 9 : 10; }],
            [/^6/, () => { sixth = true; }],
            [/^9/, () => { if (seventh === null) seventh = 10; if (ninth === null) ninth = 14; }],
            [/^11/, () => { if (seventh === null) seventh = 10; extras.add(17); }],
            [/^13/, () => { if (seventh === null) seventh = 10; extras.add(21); }]
        ];

        let guard = 0;
        while (s && guard++ < 24) {
            const hit = MODS.find(([re]) => re.test(s));
            if (!hit) break;
            const m = s.match(hit[0]);
            hit[1]();
            s = s.slice(m[0].length);
        }

        if (s) {
            return { error: `could not read "${s}" in the chord quality. See the spelling guide below.` };
        }

        const out = new Set([0]);
        if (!omit3) out.add(third);
        if (!omit5) out.add(fifth);
        if (sixth) out.add(9);
        if (seventh !== null) out.add(seventh);
        if (ninth !== null) out.add(ninth);
        extras.forEach(i => out.add(i));

        return { intervals: Array.from(out).sort((a, b) => a - b) };
    }

    handleInput(value) {
        this.state.inputChord = value;
        this.analyzeChord(value);
        this.render();
        // Restore focus
        const input = this.containerElement.querySelector('#sre-chord-input');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    analyzeChord(chordStr) {
        // A new chord means a new result set, so paging and the name search
        // start over. The chosen tonic does NOT: "what fits over a C root"
        // is a question you ask of one chord after another, and clearing it
        // each time would make you re-pick C on every single lookup.
        this.state.page = 0;
        this.state.nameQuery = '';
        this.state.parseError = null;

        if (!chordStr) {
            this.state.parsedChord = null;
            this.state.containingScales = [];
            return;
        }

        let result;
        try {
            result = this.parseChordSymbol(chordStr);
        } catch (e) {
            console.error('Error parsing chord:', e);
            result = { error: 'Something went wrong reading that chord.' };
        }

        if (result && result.notes && result.notes.length > 0) {
            this.state.parsedChord = {
                root: result.root,
                type: result.type,
                bass: result.bass || null,
                notes: result.notes
            };
            this.findContainingScales(result.notes);
        } else {
            this.state.parsedChord = null;
            this.state.containingScales = [];
            this.state.parseError = (result && result.error) || null;
        }
    }

    normalizeNote(note) {
        return note.charAt(0).toUpperCase() + (note.slice(1) || '');
    }

    getSafeExternalUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        if (!trimmed || trimmed === '#') return null;

        try {
            const parsed = new URL(trimmed, window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch (_) {
            // Ignore invalid URLs
        }

        return null;
    }

    findContainingScales(chordNotes) {
        const allScales = this.getAllScales(); 
        const containing = [];

        // Use engine's note values if available, otherwise fallback
        const getVal = (n) => this.musicTheory.noteValues ? this.musicTheory.noteValues[n] : -1;
        const chordSemis = chordNotes.map(n => getVal(n));
        
        // Get root value for sorting (handle enharmonics)
        const chordRootVal = this.state.parsedChord ? getVal(this.state.parsedChord.root) : -1;
        const parsedChordRoot = this.state.parsedChord ? this.state.parsedChord.root : null;
        const parsedChordType = this.state.parsedChord ? this.state.parsedChord.type : null;

        // Pitch-class bitmask of the chord, so scale membership is a single AND
        // instead of building/searching a note-name array for every scale.
        const chordMask = chordSemis.reduce((mask, semi) => (
            semi >= 0 ? mask | (1 << (semi % 12)) : mask
        ), 0);

        // The scale currently loaded in the app, surfaced first in the results.
        const activeLibrary = (typeof window !== 'undefined' && window.modularApp)
            ? window.modularApp.scaleLibrary
            : null;
        const activeRoot = activeLibrary && activeLibrary.getCurrentKey ? activeLibrary.getCurrentKey() : null;
        const activeScaleName = activeLibrary && activeLibrary.getCurrentScale ? activeLibrary.getCurrentScale() : null;

        allScales.forEach(scale => {
            // Citations are optional metadata — the results list renders a
            // "No source link" state — so they must not gate which scales match.
            const citation = this.musicTheory.scaleCitations ? this.musicTheory.scaleCitations[scale.name] : null;

            const intervals = this.musicTheory.scales ? this.musicTheory.scales[scale.name] : null;
            const rootVal = getVal(scale.root);

            let allIn;
            if (Array.isArray(intervals) && rootVal >= 0) {
                const scaleMask = intervals.reduce((mask, iv) => mask | (1 << ((rootVal + iv) % 12)), 0);
                allIn = (chordMask & scaleMask) === chordMask;
            } else {
                const scaleNotes = this.musicTheory.getScaleNotes(scale.root, scale.name);
                const scaleSemis = scaleNotes.map(n => getVal(n));
                allIn = chordSemis.every(cSemi => scaleSemis.includes(cSemi));
            }

            if (allIn) {
                // Compared by pitch, not spelling: the library may hold this
                // very scale as Db while the list calls it C#.
                const isCurrentScale = !!activeRoot &&
                    getVal(scale.root) === getVal(activeRoot) &&
                    scale.name === activeScaleName;
                // Determine match quality: exact (diatonic) vs. just "contains notes"
                // Exact matches will be prioritized in sorting
                let isDiatonicMatch = false;
                if (this.musicTheory && typeof this.musicTheory.getDiatonicChord === 'function' && 
                    parsedChordRoot && getVal(scale.root) === getVal(parsedChordRoot) && parsedChordType) {
                    try {
                        // Check if the input chord type matches the diatonic chord for degree I
                        const diatonicI = this.musicTheory.getDiatonicChord(1, scale.root, scale.name);
                        if (diatonicI && diatonicI.chordType) {
                            // Exact match or close match (e.g., 'maj' matches 'maj7', 'maj9', etc.)
                            const diaCT = String(diatonicI.chordType).toLowerCase();
                            const inpCT = String(parsedChordType).toLowerCase();
                            // Normalize: strip numeric suffixes for comparison
                            const diaBase = diaCT.replace(/[0-9]/g, '').replace(/maj/, 'major').replace(/min/, 'm');
                            const inpBase = inpCT.replace(/[0-9]/g, '').replace(/maj/, 'major').replace(/min/, 'm');
                            isDiatonicMatch = diaBase === inpBase;
                        }
                    } catch (e) {
                        // If engine lookup fails, fall back to just "contains all notes" logic
                    }
                }
                // Calculate complexity score
                let complexity = 10;
                const name = scale.name.toLowerCase();
                if (name === 'major' || name === 'minor') complexity = 1;
                else if (['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'].includes(name)) complexity = 2;
                else if (name.includes('pentatonic') || name.includes('blues')) complexity = 3;
                else if (name.includes('harmonic') || name.includes('melodic')) complexity = 4;
                else if (name.includes('bebop') || name.includes('diminished') || name.includes('whole')) complexity = 5;
                
                // Calculate relationship tier based on interval from chord root to scale root
                const scaleRootVal = getVal(scale.root);
                const interval = (scaleRootVal - chordRootVal + 12) % 12;
                
                let relationshipTier = 5; // Default (Other)
                let relationshipLabel = 'Related';

                if (interval === 0) {
                    relationshipTier = 1; // Tonic (Same root)
                    relationshipLabel = 'Tonic';
                } else if (interval === 7) {
                    relationshipTier = 2; // Dominant (Perfect 5th above)
                    relationshipLabel = 'Dominant';
                } else if (interval === 5) {
                    relationshipTier = 3; // Subdominant (Perfect 4th above)
                    relationshipLabel = 'Subdominant';
                } else if ([3, 4, 8, 9].includes(interval)) {
                    relationshipTier = 4; // Mediant/Relative (3rds/6ths)
                    relationshipLabel = 'Mediant';
                }

                containing.push({
                    ...scale,
                    complexity,
                    citation,
                    relationshipTier,
                    relationshipLabel,
                    isDiatonicMatch,  // Track whether this is an exact diatonic match
                    isCurrentScale
                });
            }
        });

        // Sort: exact diatonic matches first, then by Relationship Tier, then Complexity, then Root
        containing.sort((a, b) => {
            // The scale the user currently has loaded is the most relevant answer
            if (a.isCurrentScale !== b.isCurrentScale) {
                return a.isCurrentScale ? -1 : 1;
            }
            // Prioritize exact diatonic matches (same root + matching chord type)
            if (a.isDiatonicMatch !== b.isDiatonicMatch) {
                return a.isDiatonicMatch ? -1 : 1;  // Diatonic matches come first
            }
            if (a.relationshipTier !== b.relationshipTier) return a.relationshipTier - b.relationshipTier;
            if (a.complexity !== b.complexity) return a.complexity - b.complexity;
            return a.root.localeCompare(b.root);
        });

        this.state.containingScales = containing;
    }

    /**
     * The roots here used to be the twelve sharp spellings, four of which
     * (C#, D#, G#, A#) are not keys the library will accept: setKeyAndScale
     * throws "Invalid key" for them, so Apply on a third of every result
     * failed into a console message and the panel just sat there. Ask the
     * engine which keys are real and use those spellings — they still cover
     * all twelve pitch classes, and now every row listed can be applied.
     */
    getScaleRoots() {
        const fallback = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        let keys = fallback;
        try {
            if (typeof this.musicTheory.getKeys === 'function') {
                const k = this.musicTheory.getKeys();
                if (Array.isArray(k) && k.length) keys = k;
            }
        } catch (_) { /* fall back to the circle-of-fifths spellings */ }

        // One root per pitch class, ordered chromatically so the root filter
        // reads C, Db, D... rather than in circle-of-fifths order.
        const byPc = new Map();
        keys.forEach(k => {
            const pc = this.pitchClassOf(k);
            if (pc !== null && !byPc.has(pc)) byPc.set(pc, k);
        });
        fallback.forEach(k => {
            const pc = this.pitchClassOf(k);
            if (pc !== null && !byPc.has(pc)) byPc.set(pc, k);
        });
        return Array.from(byPc.keys()).sort((a, b) => a - b).map(pc => byPc.get(pc));
    }

    getAllScales() {
        const roots = this.getScaleRoots();
        // Get scale types from engine if possible
        const types = Object.keys(this.musicTheory.scales || {});
        
        const scales = [];
        roots.forEach(root => {
            types.forEach(type => {
                scales.push({ root, name: type });
            });
        });
        return scales;
    }

    getRomanNumeral(chordRoot, scaleRoot, scaleName) {
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(scaleRoot, scaleName);
            // By pitch: a Db chord sitting in a scale spelled with C# is still
            // that degree, and returning '?' for it made whole roots look broken.
            const rootPc = this.pitchClassOf(chordRoot);
            let index = scaleNotes.indexOf(chordRoot);
            if (index === -1 && rootPc !== null) {
                index = scaleNotes.findIndex(n => this.pitchClassOf(n) === rootPc);
            }
            if (index === -1) return '?';
            
            // Runs to XII: octatonic has eight degrees, and stopping at VII
            // left degree 8 — the Adim7 in B octatonic, exactly the chord you
            // reach for — labelled "undefined" and unselectable.
            const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
            const num = numerals[index] || String(index + 1);
            
            // Determine if major or minor chord (simple heuristic from parsed chord)
            const isMinor = this.state.parsedChord && (this.state.parsedChord.type.includes('m') && !this.state.parsedChord.type.includes('maj'));
            const isDim = this.state.parsedChord && (this.state.parsedChord.type.includes('dim') || this.state.parsedChord.type.includes('b5'));
            
            if (isDim) return num.toLowerCase() + '°';
            if (isMinor) return num.toLowerCase();
            return num;
        } catch (e) {
            return '?';
        }
    }

    renderResults() {
        if (!this.state.parsedChord) {
            // Saying "enter a chord" to someone who just entered one tells them
            // nothing about which part of it was not understood.
            if (this.state.parseError) {
                return `<div style="padding: 8px; border: 1px solid var(--border-light); border-left: 3px solid var(--accent-secondary); border-radius: 4px; color: var(--text-main); font-size: 0.85rem;">
                    <strong style="color: var(--accent-secondary);">Not understood:</strong> ${this.state.parseError}
                </div>`;
            }
            return '<div style="color: var(--text-muted); font-style: italic;">Enter a chord to see containing scales.</div>';
        }

        let html = `
            <div style="margin-bottom: 10px; font-size: 0.9rem;">
                <span style="color: var(--accent-secondary);">Parsed:</span> 
                <strong>${this.state.parsedChord.root}${this.state.parsedChord.type}${this.state.parsedChord.bass ? '/' + this.state.parsedChord.bass : ''}</strong> 
                <span style="color: var(--text-muted);">[${this.state.parsedChord.notes.join(', ')}]</span>
            </div>
        `;

        if (this.state.parseError) {
            html += `<div style="margin-bottom: 8px; padding: 6px 8px; border: 1px solid var(--border-light); border-left: 3px solid var(--accent-secondary); border-radius: 4px; color: var(--text-main); font-size: 0.8rem;">${this.state.parseError}</div>`;
        }

        if (this.state.containingScales.length === 0) {
            html += '<div style="color: var(--text-muted);">No matching scales found in the library.</div>';
            return html;
        }

        if (this.state.rootFilter !== 'all') {
            html += `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">
                Tonic <strong style="color: var(--accent-primary);">${this.state.rootFilter}</strong> only.
                <button type="button" class="sre-tonic-btn" data-tonic="all" style="background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.7rem; padding: 1px 6px; cursor: pointer; border-radius: 3px; margin-left: 4px;">Clear</button>
            </div>`;
        }

        // Quick filters for relationship perspective
        const filters = [
            { key: 'all', label: 'All' },
            { key: 'tonic', label: 'Tonic (0)' },
            { key: 'dominant', label: '5↑ Dominant' },
            { key: 'subdominant', label: '4↑ Subdominant' },
            { key: 'mediant', label: '3/6 Mediant' }
        ];
        html += `<div class="sre-filter-bar" style="display:flex; gap:6px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
            <span style="font-size:0.75rem; color: var(--text-muted);">Quick Filters:</span>
            ${filters.map(f => `
                <button class="sre-filter" data-filter="${f.key}" style="background: ${this.state.selectedRelationshipFilter===f.key ? 'var(--accent-primary)' : 'transparent'}; color: ${this.state.selectedRelationshipFilter===f.key ? '#000' : 'var(--text-muted)'}; border: 1px solid var(--border-light); font-size: 0.75rem; padding: 3px 8px; cursor: pointer; border-radius: 999px;">${f.label}</button>
            `).join('')}
        </div>`;

        // The tonic buttons live up beside the chord field, so the list only
        // has to apply what they and the name box have already chosen.
        let filtered = this.getRelationshipFiltered();
        if (this.state.rootFilter !== 'all') {
            filtered = filtered.filter(sc => sc.root === this.state.rootFilter);
        }

        const query = this.state.nameQuery.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(sc => sc.name.toLowerCase().replace(/_/g, ' ').includes(query));
        }

        html += `<div class="sre-result-controls" style="margin-bottom: 8px;">
            <input type="text" id="sre-scale-search" value="${this.state.nameQuery.replace(/"/g, '&quot;')}"
                placeholder="Filter by scale name..." autocapitalize="off" autocorrect="off" spellcheck="false"
                style="width: 100%; box-sizing: border-box; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); font-size: 0.75rem; padding: 3px 6px; border-radius: 3px; font-family: var(--font-tech);">
        </div>`;

        const total = filtered.length;
        const pageSize = this.state.pageSize;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        // A filter can shrink the list under the page you were on.
        const page = Math.min(Math.max(0, this.state.page), totalPages - 1);
        this.state.page = page;
        const first = page * pageSize;
        const displayScales = filtered.slice(first, first + pageSize);

        if (total === 0) {
            const where = this.state.rootFilter !== 'all' ? ` rooted on ${this.state.rootFilter}` : '';
            html += `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">
                No scale${where}${query ? ` matching "${query}"` : ''} contains ${this.state.parsedChord.root}${this.state.parsedChord.type}.
                ${this.state.rootFilter !== 'all' ? `<button type="button" class="sre-tonic-btn" data-tonic="all" style="background: transparent; border: 1px solid var(--border-light); color: var(--accent-primary); font-size: 0.7rem; padding: 2px 7px; cursor: pointer; border-radius: 3px; margin-left: 4px;">Show any tonic</button>` : ''}
            </div>`;
            return html;
        }

        html += `<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">
            ${first + 1}&ndash;${first + displayScales.length} of ${total}${this.state.rootFilter !== 'all' ? ` scale${total === 1 ? '' : 's'} rooted on ${this.state.rootFilter}` : ' matching scales'}${total !== this.state.containingScales.length ? ` (${this.state.containingScales.length} before filters)` : ''}
        </div>`;

        html += this.renderPager(page, totalPages, total);

        html += `<div id="sre-results-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">`;

        displayScales.forEach((scale, index) => {
            const roman = this.getRomanNumeral(this.state.parsedChord.root, scale.root, scale.name);
            const citation = scale.citation || {};
            const description = citation.description || '';
            const urlRaw = citation.url || (citation.references && citation.references[0] ? citation.references[0].url : '');
            const url = this.getSafeExternalUrl(urlRaw);
            const uniqueId = `sre-scale-p${page}-${index}`;
            
            // Relationship badge
            const relationshipBadge = scale.relationshipLabel && scale.relationshipLabel !== 'Related'
                ? `<span style="font-size:0.7rem; color:var(--text-muted); margin-left:8px; border:1px solid var(--border-light); padding:1px 5px; border-radius:3px; text-transform:uppercase; letter-spacing:0.5px;">${scale.relationshipLabel}</span>`
                : '';

            const currentBadge = scale.isCurrentScale
                ? `<span style="font-size:0.7rem; color:#000; background:var(--accent-primary); margin-left:8px; padding:1px 5px; border-radius:3px; text-transform:uppercase; letter-spacing:0.5px; font-weight:bold;">Current</span>`
                : '';

            const headerOpen = url
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; cursor: pointer; text-decoration:none;">`
                : `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">`;
            const headerClose = url ? `</a>` : `</div>`;

            const learnMore = url
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; flex: 1; text-decoration:none;">Click to learn more ↗</a>`
                : `<div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; flex: 1;">No source link</div>`;

            html += `
                <div class="scale-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-left: 3px solid var(--accent-primary); border-radius: 4px; transition: background 0.2s;">
                    ${headerOpen}
                        <div style="display:flex; align-items:center;">
                            <div style="font-weight: bold; color: var(--text-highlight); font-size: 1rem;">${scale.root} ${scale.name}</div>
                            ${currentBadge}
                            ${relationshipBadge}
                        </div>
                        <div style="background: var(--bg-panel); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; color: var(--accent-secondary);">
                            ${roman}
                        </div>
                    ${headerClose}
                    ${description ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.3;">${description}</div>` : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 6px;">
                        ${learnMore}
                        <button class="btn-apply-scale" data-root="${scale.root}" data-name="${scale.name}" 
                                style="background: var(--accent-primary); color: #000; border: none; font-size: 0.7rem; padding: 3px 8px; cursor: pointer; border-radius: 3px; font-weight: bold; text-transform: uppercase;">
                            Apply
                        </button>
                        <button class="btn-preview" data-id="${uniqueId}" data-root="${scale.root}" data-name="${scale.name}" 
                                style="background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.7rem; padding: 2px 6px; cursor: pointer; border-radius: 3px;">
                            Preview
                        </button>
                    </div>
                    <div id="${uniqueId}" class="scale-preview-container" style="margin-top: 8px; display: none; padding: 12px; background: linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,0.98) 100%); border: 1px solid rgba(0,243,255,0.2); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: visible;"></div>
                </div>
            `;
        });
        
        html += `</div>`;

        // Repeated below the list: after scrolling a page of results, the
        // controls at the top are off screen.
        html += this.renderPager(page, totalPages, total, true);

        return html;
    }

    /**
     * Pages, with somewhere to go.
     *
     * The list used to stop dead at 50 and print "...and 1043 more", which
     * names what it is withholding without handing any of it over. These are
     * real pages: first/prev/next/last, a page number you can type into, and
     * a page size, so every match in the catalog is reachable in a fixed
     * number of clicks rather than none at all.
     */
    renderPager(page, totalPages, total, isFooter) {
        const SIZES = [25, 50, 100, 200];
        const atStart = page <= 0;
        const atEnd = page >= totalPages - 1;

        const step = (target, label, disabled, title) => {
            const style = disabled
                ? 'background: transparent; color: var(--text-muted); border: 1px solid var(--border-light); opacity: 0.35; cursor: default;'
                : 'background: rgba(255,255,255,0.06); color: var(--text-main); border: 1px solid var(--border-light); cursor: pointer;';
            return `<button type="button" class="sre-page-btn" data-page="${target}" ${disabled ? 'disabled' : ''} title="${title}"
                style="${style} font-size: 0.75rem; padding: 3px 8px; border-radius: 3px; font-family: var(--font-tech);">${label}</button>`;
        };

        // The page field is the only way to cross a long list in one move, so
        // it is a real input rather than a run of numbered buttons that would
        // not fit 22 pages of results anyway.
        const jump = totalPages > 1
            ? `<span style="font-size: 0.75rem; color: var(--text-muted);">Page
                   <input type="number" class="sre-page-input" value="${page + 1}" min="1" max="${totalPages}"
                       style="width: 4.5em; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); font-size: 0.75rem; padding: 2px 4px; border-radius: 3px; font-family: var(--font-tech);">
                   of ${totalPages}</span>`
            : `<span style="font-size: 0.75rem; color: var(--text-muted);">Page 1 of 1</span>`;

        const size = isFooter ? '' : `<label style="font-size: 0.75rem; color: var(--text-muted); margin-left: auto;">Per page
                <select id="sre-page-size" style="background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); font-size: 0.75rem; padding: 2px 4px; border-radius: 3px; font-family: var(--font-tech);">
                    ${SIZES.map(n => `<option value="${n}"${n === this.state.pageSize ? ' selected' : ''}>${n}</option>`).join('')}
                </select>
            </label>`;

        return `<div class="sre-pager" style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap; margin: ${isFooter ? '8px 0 0' : '0 0 8px'};">
            ${step(0, '&laquo; First', atStart, 'First page')}
            ${step(page - 1, '&lsaquo; Prev', atStart, 'Previous page')}
            ${jump}
            ${step(page + 1, 'Next &rsaquo;', atEnd, 'Next page')}
            ${step(totalPages - 1, 'Last &raquo;', atEnd, 'Last page')}
            ${size}
        </div>`;
    }

    bindResultControlEvents() {
        if (!this.containerElement) return;

        this.containerElement.querySelectorAll('.sre-tonic-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.rootFilter = btn.getAttribute('data-tonic') || 'all';
                this.state.page = 0;
                this.render();
            });
        });

        const search = this.containerElement.querySelector('#sre-scale-search');
        if (search) {
            // Re-rendering on each keystroke wipes the field, so ask for the
            // caret back before doing it.
            search.addEventListener('input', () => {
                const caret = search.selectionStart;
                this.state.nameQuery = search.value;
                this.state.page = 0;
                this.rememberFocus('#sre-scale-search', caret);
                this.render();
            });
        }

        this.containerElement.querySelectorAll('.sre-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const target = parseInt(btn.getAttribute('data-page'), 10);
                if (Number.isNaN(target)) return;
                this.goToPage(target);
            });
        });

        this.containerElement.querySelectorAll('.sre-page-input').forEach(input => {
            const jump = () => {
                const n = parseInt(input.value, 10);
                if (Number.isNaN(n)) return;
                this.goToPage(n - 1);
            };
            input.addEventListener('change', jump);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); jump(); }
            });
        });

        const pageSize = this.containerElement.querySelector('#sre-page-size');
        if (pageSize) {
            pageSize.addEventListener('change', () => {
                const size = parseInt(pageSize.value, 10) || 50;
                // Keep the first row you were looking at on screen rather than
                // throwing you back to the top of the list.
                const anchor = this.state.page * this.state.pageSize;
                this.state.pageSize = size;
                this.state.page = Math.floor(anchor / size);
                this.render();
            });
        }
    }

    goToPage(target) {
        this.state.page = Math.max(0, target);
        this.render();
        // A new page starts at its own first row; leaving the scroll where it
        // was makes page 4 look like it opens in the middle.
        const list = this.containerElement && this.containerElement.querySelector('#sre-results-list');
        if (list) list.scrollTop = 0;
    }

    bindFilterEvents() {
        if (!this.containerElement) return;
        const filterButtons = this.containerElement.querySelectorAll('.sre-filter');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const key = btn.getAttribute('data-filter');
                this.state.selectedRelationshipFilter = key || 'all';
                this.state.page = 0;
                // Re-render to apply filter
                this.render();
            });
        });
    }

    bindApplyScaleEvents() {
        if (!this.containerElement) return;
        const applyButtons = this.containerElement.querySelectorAll('.btn-apply-scale');
        applyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const root = btn.getAttribute('data-root');
                const name = btn.getAttribute('data-name');
                this.applyScale(root, name);
            });
        });
    }

    applyScale(root, scaleName) {
        // Apply to ScaleLibrary if available
        if (typeof window !== 'undefined' && window.modularApp && window.modularApp.scaleLibrary) {
            try {
                window.modularApp.scaleLibrary.setKeyAndScale(root, scaleName);
                this.state.parseError = null;
                console.log('[ScaleRelationshipExplorer] Applied scale:', { root, scaleName });
            } catch (e) {
                // setKeyAndScale throws on a key it does not accept, and this
                // catch used to swallow it: the button looked dead. Say so.
                console.error('[ScaleRelationshipExplorer] Failed to apply scale:', e);
                this.state.parseError = `Could not load ${root} ${String(scaleName).replace(/_/g, ' ')}: ${e && e.message ? e.message : 'the library refused it'}.`;
                this.render();
            }
        }
    }

    bindPreviewEvents() {
        if (!this.containerElement) {
            console.error('[ScaleExplorer] No container element found');
            return;
        }
        
        const buttons = this.containerElement.querySelectorAll('.btn-preview');
        console.log('[ScaleExplorer] Found', buttons.length, 'preview buttons');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const root = btn.getAttribute('data-root');
                const name = btn.getAttribute('data-name');
                console.log('[ScaleExplorer] Preview clicked:', { id, root, name });
                
                const container = this.containerElement.querySelector(`#${id}`);
                console.log('[ScaleExplorer] Container found:', container);
                
                if (container) {
                    if (container.style.display === 'none') {
                        container.style.display = 'block';
                        btn.textContent = 'Hide Preview';
                        console.log('[ScaleExplorer] Container made visible');
                        
                        // Initialize piano if empty
                        if (container.innerHTML === '') {
                            console.log('[ScaleExplorer] Initializing piano...');
                            
                            if (window.PianoVisualizer) {
                                console.log('[ScaleExplorer] PianoVisualizer class found');
                                
                                // Create styled wrapper for piano
                                const pianoWrapper = document.createElement('div');
                                pianoWrapper.style.background = 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)';
                                pianoWrapper.style.padding = '15px';
                                pianoWrapper.style.borderRadius = '8px';
                                pianoWrapper.style.border = '2px solid rgba(0,243,255,0.2)';
                                pianoWrapper.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,243,255,0.1)';
                                
                                // Calculate starting MIDI note based on scale root
                                const rootMidi = this.musicTheory.noteValues[root];
                                const startMidi = rootMidi !== undefined ? 60 + ((rootMidi - 0 + 12) % 12) : 60;
                                
                                // Get audio engine from global modular app if available
                                const audioEngine = (typeof window !== 'undefined' && window.modularApp && window.modularApp.audioEngine)
                                    ? window.modularApp.audioEngine
                                    : (typeof window !== 'undefined' && window.app && window.app.audioEngine)
                                        ? window.app.audioEngine
                                        : null;
                                console.log('[ScaleExplorer] Audio engine (modularApp preferred):', !!audioEngine);
                                
                                const piano = new window.PianoVisualizer({
                                    container: pianoWrapper,
                                    octaves: 1,
                                    startMidi: startMidi, // Start from scale root
                                    whiteKeyWidth: 35,
                                    whiteKeyHeight: 100,
                                    blackKeyHeight: 65,
                                    showFingering: false,
                                    showRomanNumerals: false,
                                    showGradingTooltips: false,
                                    enableGradingIntegration: false,
                                    fitToContainer: true
                                });
                                
                                // Store piano instance ID for debugging
                                const pianoId = 'piano_' + Date.now();
                                piano._debugId = pianoId;
                                console.log('[ScaleExplorer] Piano instance created with ID:', pianoId, piano);
                                console.log('[ScaleExplorer] Piano element:', piano.pianoElement);
                                console.log('[ScaleExplorer] Piano.on is a function?', typeof piano.on === 'function');
                                
                                // Connect audio playback to piano clicks IMMEDIATELY after creation
                                if (audioEngine) {
                                    console.log('[ScaleExplorer] Setting up audio listener... audioEngine available');
                                    if (typeof piano.on === 'function') {
                                        console.log('[ScaleExplorer] Calling piano.on for piano ID:', pianoId);
                                        piano.on('noteClicked', (data) => {
                                            console.log('[ScaleExplorer] ✓✓✓ Note clicked callback fired for piano', pianoId, '! Playing MIDI:', data.midi);
                                            if (audioEngine && typeof audioEngine.playNote === 'function') {
                                                audioEngine.playNote(data.midi);
                                            } else {
                                                console.error('[ScaleExplorer] audioEngine.playNote not available');
                                            }
                                        });
                                        console.log('[ScaleExplorer] Listener registered for piano', pianoId, '! Checking:', piano.listeners.get('noteClicked'));
                                    } else {
                                        console.error('[ScaleExplorer] piano.on is not a function!');
                                    }

                                    // Hard fallback: event delegation on DOM keys to ensure audio
                                    const keyClickHandler = (evt) => {
                                        const keyEl = evt.target.closest('.piano-white-key, .piano-black-key');
                                        if (!keyEl) return;
                                        const midiStr = keyEl.getAttribute('data-midi');
                                        const midiNum = midiStr ? parseInt(midiStr, 10) : NaN;
                                        if (!Number.isNaN(midiNum) && typeof audioEngine.playNote === 'function') {
                                            console.log('[ScaleExplorer] Fallback key click -> play MIDI:', midiNum);
                                            audioEngine.playNote(midiNum);
                                        }
                                    };
                                    pianoWrapper.addEventListener('click', keyClickHandler);
                                    // Keep a reference to avoid duplicate bindings
                                    pianoWrapper._sreKeyClickHandler = keyClickHandler;
                                } else {
                                    console.warn('[ScaleExplorer] No audioEngine available');
                                }
                                
                                // Get scale notes and diatonic chords from engine
                                const scaleNotes = this.musicTheory.getScaleNotes(root, name);
                                console.log('[ScaleExplorer] Scale notes:', scaleNotes);
                                
                                // Get diatonic chords
                                const diatonicChords = this.getDiatonicChords(root, name, scaleNotes);
                                
                                // Create chords display
                                const chordsSection = document.createElement('div');
                                chordsSection.style.marginTop = '12px';
                                chordsSection.style.padding = '10px';
                                chordsSection.style.background = 'rgba(0,243,255,0.05)';
                                chordsSection.style.border = '1px solid rgba(0,243,255,0.15)';
                                chordsSection.style.borderRadius = '6px';
                                
                                const chordsTitle = document.createElement('div');
                                chordsTitle.textContent = 'Diatonic Chords';
                                chordsTitle.style.fontSize = '0.75rem';
                                chordsTitle.style.fontWeight = '700';
                                chordsTitle.style.color = 'var(--accent-primary)';
                                chordsTitle.style.marginBottom = '8px';
                                chordsTitle.style.textTransform = 'uppercase';
                                chordsTitle.style.letterSpacing = '1px';
                                
                                const chordsGrid = document.createElement('div');
                                chordsGrid.style.display = 'grid';
                                chordsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))';
                                chordsGrid.style.gap = '6px';
                                
                                diatonicChords.forEach((chord, idx) => {
                                    const chordBadge = document.createElement('div');
                                    chordBadge.textContent = chord;
                                    chordBadge.style.padding = '4px 8px';
                                    chordBadge.style.background = 'rgba(0,243,255,0.1)';
                                    chordBadge.style.border = '1px solid rgba(0,243,255,0.3)';
                                    chordBadge.style.borderRadius = '4px';
                                    chordBadge.style.fontSize = '0.85rem';
                                    chordBadge.style.fontWeight = '600';
                                    chordBadge.style.color = 'var(--text-highlight)';
                                    chordBadge.style.textAlign = 'center';
                                    chordBadge.style.cursor = 'pointer';
                                    chordBadge.style.transition = 'all 0.2s';
                                    
                                    chordBadge.addEventListener('mouseenter', () => {
                                        chordBadge.style.background = 'rgba(0,243,255,0.2)';
                                        chordBadge.style.borderColor = 'var(--accent-primary)';
                                        chordBadge.style.transform = 'translateY(-2px)';
                                    });
                                    
                                    chordBadge.addEventListener('mouseleave', () => {
                                        chordBadge.style.background = 'rgba(0,243,255,0.1)';
                                        chordBadge.style.borderColor = 'rgba(0,243,255,0.3)';
                                        chordBadge.style.transform = 'translateY(0)';
                                    });
                                    
                                    chordBadge.addEventListener('click', () => {
                                        // Copy to input and analyze
                                        const input = this.containerElement.querySelector('#sre-chord-input');
                                        if (input) {
                                            input.value = chord;
                                            this.handleInput(chord);
                                        }
                                    });
                                    
                                    chordsGrid.appendChild(chordBadge);
                                });
                                
                                chordsSection.appendChild(chordsTitle);
                                chordsSection.appendChild(chordsGrid);
                                
                                // Append to container
                                container.appendChild(pianoWrapper);
                                container.appendChild(chordsSection);
                                
                                // Force a re-render after DOM attachment to ensure proper sizing
                                setTimeout(() => {
                                    console.log('[ScaleExplorer] Rendering scale...');
                                    piano.renderScale({
                                        key: root,
                                        scale: name,
                                        notes: scaleNotes
                                    });
                                    console.log('[ScaleExplorer] Container children:', container.children.length);
                                    console.log('[ScaleExplorer] Container HTML length:', container.innerHTML.length);
                                    console.log('[ScaleExplorer] Piano element dimensions:', {
                                        width: piano.pianoElement.offsetWidth,
                                        height: piano.pianoElement.offsetHeight,
                                        display: window.getComputedStyle(piano.pianoElement).display,
                                        visibility: window.getComputedStyle(piano.pianoElement).visibility
                                    });
                                    console.log('[ScaleExplorer] Container dimensions:', {
                                        width: container.offsetWidth,
                                        height: container.offsetHeight,
                                        display: window.getComputedStyle(container).display
                                    });
                                }, 10);
                            } else {
                                console.error('[ScaleExplorer] PianoVisualizer class not found on window!');
                                container.innerHTML = '<div style="color:red; font-size:0.8rem;">Visualizer not available</div>';
                            }
                        } else {
                            console.log('[ScaleExplorer] Container already has content');
                        }
                    } else {
                        container.style.display = 'none';
                        btn.textContent = 'Show Preview';
                    }
                }
            });
        });
    }

    getDiatonicChords(root, scaleName, scaleNotes) {
        // Prefer the shared MusicTheoryEngine diatonic chord logic so
        // bebop / Barry / exotic scales match the rest of the system.

        const chords = [];

        // If the core engine exposes getDiatonicChord, trust it.
        if (this.musicTheory && typeof this.musicTheory.getDiatonicChord === 'function') {
            // Always show up to seven functional degrees (I–VII) even for
            // octatonic / bebop scales; the engine decides the chord quality.
            for (let degree = 1; degree <= 7; degree++) {
                try {
                    const diat = this.musicTheory.getDiatonicChord(degree, root, scaleName);
                    if (!diat || !diat.root) continue;

                    // Use the engine's synthesized/specific chordType when available.
                    const chordType = diat.chordType || '';
                    const label = chordType ? `${diat.root}${chordType}` : diat.root;
                    chords.push(label);
                } catch (e) {
                    // If something goes wrong for a specific degree, skip it
                    // rather than breaking the whole relationships tool.
                    try { console.warn('[ScaleRelationshipExplorer] getDiatonicChord failed for', { root, scaleName, degree, error: e && e.message }); } catch(_) {}
                }
            }
            return chords;
        }

        // Fallback: simple stacked-third inference using raw scale notes
        if (!scaleNotes || scaleNotes.length < 7 || !this.musicTheory || !this.musicTheory.noteValues) {
            return [];
        }

        for (let i = 0; i < Math.min(scaleNotes.length, 7); i++) {
            const rootNote = scaleNotes[i];
            const thirdNote = scaleNotes[(i + 2) % scaleNotes.length];
            const fifthNote = scaleNotes[(i + 4) % scaleNotes.length];
            const seventhNote = scaleNotes[(i + 6) % scaleNotes.length];

            const rootValue = this.musicTheory.noteValues[rootNote];
            const thirdValue = this.musicTheory.noteValues[thirdNote];
            const fifthValue = this.musicTheory.noteValues[fifthNote];
            const seventhValue = this.musicTheory.noteValues[seventhNote];

            if (rootValue === undefined || thirdValue === undefined || fifthValue === undefined) continue;

            const thirdInterval = (thirdValue - rootValue + 12) % 12;
            const fifthInterval = (fifthValue - rootValue + 12) % 12;
            const seventhInterval = seventhValue !== undefined ? (seventhValue - rootValue + 12) % 12 : null;

            let quality = '';

            if (thirdInterval === 4 && fifthInterval === 7) {
                quality = 'maj7';
            } else if (thirdInterval === 3 && fifthInterval === 7) {
                quality = 'm7';
            } else if (thirdInterval === 3 && fifthInterval === 6) {
                quality = 'm7b5';
            } else if (thirdInterval === 4 && fifthInterval === 8) {
                quality = '+';
            }

            if (seventhInterval !== null) {
                if (thirdInterval === 4 && fifthInterval === 7) {
                    if (seventhInterval === 11) quality = 'maj7';
                    else if (seventhInterval === 10) quality = '7';
                } else if (thirdInterval === 3 && fifthInterval === 7) {
                    if (seventhInterval === 10) quality = 'm7';
                    else if (seventhInterval === 11) quality = 'mM7';
                } else if (thirdInterval === 3 && fifthInterval === 6) {
                    if (seventhInterval === 10) quality = 'm7b5';
                    else if (seventhInterval === 9) quality = 'dim7';
                }
            }

            chords.push(`${rootNote}${quality}`);
        }

        return chords;
    }

    renderScaleRelationships(scale) {
        // Deprecated in favor of new card layout, but kept for compatibility if needed
        return ''; 
    }

    transposeRoot(root, semitones) {
        if (!this.musicTheory.noteValues) return root;
        const val = this.musicTheory.noteValues[root];
        if (val === undefined) return root;
        const newVal = ((val + semitones) % 12 + 12) % 12;
        // Name it from the spellings the engine is willing to write, keeping
        // the accidental side the root was already on where that is possible.
        const candidates = this.musicTheory.getSpellingCandidates(newVal);
        if (!candidates || !candidates.length) return root;
        const wantFlat = String(root).includes('b');
        return candidates.find(n => wantFlat ? n.includes('b') : n.includes('#'))
            || candidates.find(n => !n.includes('#') && !n.includes('b'))
            || candidates[0];
    }
}
