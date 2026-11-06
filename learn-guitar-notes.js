// learn-guitar-notes.js
// Learn Notes, on the guitar: the six strings, frets as half steps, one spot
// with two names, the same note in many places, and a find-the-note practice.
// The guitar counterpart of learn-piano-notes.js.

class LearnGuitarNotes {
    constructor() {
        this.container = null;
        this._fb = null;               // GuitarFretboardVisualizer
        this.names = 'both';           // 'sharps' | 'flats' | 'both': how black-key notes are named
        this.scaleRoot = '';           // '' = no scale lit; else a major scale's root
        this.speechEnabled = false;
        this._posMarks = new Map();    // 's:f' -> 'pick' | 'step' | 'right' | 'wrong'
        this._pcMark = null;           // pitch class lit everywhere ('all'), or null
        this._timers = [];
        this._p = null;                // practice state
    }

    static get TUNING() { return window.GuitarTuning.midi(); }   // string index 0 = the lowest
    static get SHARP() { return ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']; }
    static get FLAT() { return ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']; }
    static get ORDINALS() { return ['6th', '5th', '4th', '3rd', '2nd', '1st']; }

    mount(selector) {
        this.container = document.querySelector(selector) || document.getElementById('learn-guitar-notes-container');
        if (!this.container) return;
        this._injectStyle();
        this.render();
        this._wireMidi();
    }

    /* ---------- page ---------------------------------------------------- */
    render() {
        this.container.innerHTML = `
            <div class="lgn">
                <div class="lgn-grid">
                    <div class="lgn-left">
                        <div class="lgn-panel">
                            <div class="lgn-controls">
                                <span id="lgn-tuning"></span>
                                <label>Names <select id="lgn-names">
                                    <option value="both" selected>Both</option>
                                    <option value="sharps">Sharps (♯)</option>
                                    <option value="flats">Flats (♭)</option>
                                </select></label>
                                <label>Light up <select id="lgn-scale">
                                    <option value="">no scale</option>
                                    ${['C', 'G', 'D', 'A', 'E', 'F', 'B♭', 'E♭'].map(r => `<option value="${r}">${r} major</option>`).join('')}
                                </select></label>
                                <label class="lgn-check"><input type="checkbox" id="lgn-speak"> Say it</label>
                            </div>
                            <div id="lgn-board"></div>
                            <div class="lgn-legend">
                                <span><i class="lgn-dot lgn-dot-nat"></i>no ♯ or ♭ (a piano's white keys)</span>
                                <span><i class="lgn-dot lgn-dot-acc"></i>♯ / ♭ (black keys)</span>
                                <span><i class="lgn-dot" style="background:var(--accent-primary)"></i>you</span>
                                <span><i class="lgn-dot" style="background:var(--accent-secondary)"></i>every place</span>
                            </div>
                            <div id="lgn-readout" class="lgn-readout"></div>
                        </div>

                        <div class="lgn-panel lgn-practice">
                            <div class="lgn-practice-head">
                                <strong>Practice: find the note</strong>
                                <select id="lgn-level" title="Which notes to ask for">
                                    <option value="nat">Natural notes (A–G)</option>
                                    <option value="all">All 12, with ♯ and ♭</option>
                                </select>
                                <button id="lgn-practice" class="lgn-btn lgn-btn-primary">▶ Start</button>
                                <span id="lgn-score" class="lgn-score"></span>
                            </div>
                            <div id="lgn-prompt" class="lgn-prompt">Names go dark (open strings stay as your landmarks). Find the note asked for, anywhere on the neck.</div>
                        </div>
                    </div>

                    <div class="lgn-right">
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#lgn-tuning').appendChild(window.GuitarTuning.control({ label: 'Tuning' }));
        this._mountBoard();
        this._wire();
        this._renderCards();
        this._say(this._welcome());
        window.addEventListener('guitar-tuning:change', () => this._retuned());
    }

    /** Everything on this page that names a string or counts a fret, for the tuning on now. */
    _renderCards() {
        const names = this._openNames();
        const NOTE_OPTS = LearnGuitarNotes.SHARP.map((n, pc) => `<option value="${pc}">${this._name(pc)}</option>`).join('');
        const low = names[0], next = this._nameByWay(this._openPc(0) + 1, 'up');
        const shortcut = this._shortcut();
        const first = shortcut.pairs[0];
        const right = this.container.querySelector('.lgn-right');
        right.innerHTML = `
            <div class="lgn-card">
                <h4>1 · Six strings, low to high</h4>
                <p>From the thickest string to the thinnest: <b>${names.join(' ')}</b>. ${this._stringsNote()}</p>
                <button class="lgn-btn lgn-btn-primary" data-demo="open">▶ Play the open strings</button>
            </div>

            <div class="lgn-card">
                <h4>2 · Every fret is one half step</h4>
                <p>One fret toward the body is a <b>half step up</b>; one fret back toward the head is a <b>half step down</b>. Two frets is a whole step.</p>
                <div class="lgn-row">
                    <button class="lgn-btn" data-demo="up">▶ Up: ${low} → ${next}</button>
                    <button class="lgn-btn" data-demo="down">▶ Down: ${next} → ${low}</button>
                    <button class="lgn-btn" data-demo="octave">▶ 12th fret: ${low} again</button>
                </div>
                <p>At the <b>12th fret</b> (the two dots) the string’s own note comes back, an <b>octave</b> higher: the same letter, twelve half steps up.</p>
            </div>

            <div class="lgn-card">
                <h4>3 · One fret, two names</h4>
                <p>A ♯ (sharp) raises a note a half step, a ♭ (flat) lowers it. So the fret between F and G has two names, picked by the way you got there: a fret <b>up from F</b> is <b>F♯</b>; a fret <b>down from G</b> is <b>G♭</b>. Same fret, same sound.</p>
                <div class="lgn-row">
                    <button class="lgn-btn" data-demo="sharp">▶ F → F♯</button>
                    <button class="lgn-btn" data-demo="flat">▶ G → G♭</button>
                    <button class="lgn-btn" data-demo="bc">▶ B → C, one fret</button>
                </div>
                <p><b>E–F</b> and <b>B–C</b> sit just one fret apart: there is no note between them (on a piano, no black key).</p>
            </div>

            <div class="lgn-card">
                <h4>4 · The same note, in many places</h4>
                <p>Every note lives on several strings. Pick one to see them all: <select id="lgn-every"><option value="">choose…</option>${NOTE_OPTS}</select></p>
                ${shortcut.html ? `<p>A shortcut that follows from it: ${shortcut.html}</p>` : ''}
                ${first ? `<button class="lgn-btn" data-demo="fifth">▶ ${this._nth(first.fret)} fret of ${this._str(first.s)} = open ${names[first.s + 1]}</button>` : ''}
            </div>
        `;
        right.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => this._demo(b.dataset.demo)));
        const every = right.querySelector('#lgn-every');
        if (this._pcMark !== null) every.value = String(this._pcMark);
        every.addEventListener('change', (e) => {
            if (e.target.value === '') { this._pcMark = null; this._paint(); return; }
            const pc = +e.target.value;
            this._pcMark = pc;
            this._posMarks.clear();
            this._paint();
            const spots = this._cellsFor(pc);
            this._say(`<b>${this._name(pc)}</b> is in <b>${spots.length} places</b> between the open strings and the 12th fret. Click any of them: they all sound the same note, some an octave higher.`);
            this._reveal();
        });
    }

    _welcome() {
        return `Click any fret: you’ll hear it and see its name. The top line is the thin ${this._str(5)} string, like guitar tab.`;
    }

    /** A new tuning: demos built on the old strings stop, a question being asked stays (it asks for a note, not a place). */
    _retuned() {
        this._clearTimers();
        this._posMarks.clear();
        const t = window.GuitarTuning.current();
        this._renderCards();
        this._paint();
        this._say(`Tuned to <b>${t.id === 'custom' ? t.display.join(' ') : t.label}</b>. ${this._welcome()}`);
        // an answered question was waiting on a timer that just stopped
        if (this._p && this._p.active && this._p.busy) this._practiceNext();
    }

    _mountBoard() {
        const host = this.container.querySelector('#lgn-board');
        const GuitarClass = window.GuitarFretboardVisualizer;
        if (!GuitarClass) {
            host.textContent = 'The fretboard could not load.';
            return;
        }
        // No audioEngine: this page plays the notes itself (guitar tone), so a
        // click is heard once whatever the board does with it.
        this._fb = new GuitarClass({ frets: 12, showNoteLabels: true, fitToContainer: true, tuningControl: false, legend: false });
        // The board repaints itself (hover, rebuilds on resize) through
        // applyState; on this page every repaint is ours, so the names follow
        // the Names menu and the marks survive a rebuild.
        this._fb.applyState = () => this._paint();
        this._fb.mount(host);
        // one listener on the host: the board's own cells are rebuilt on resize
        host.addEventListener('click', (e) => {
            const cell = e.target.closest && e.target.closest('.fret-cell');
            if (!cell) return;
            const s = parseInt(cell.dataset.stringIndex, 10), f = parseInt(cell.dataset.fret, 10);
            if (isNaN(s) || isNaN(f)) return;
            this._onPick(s, f);
        });
        this._paint();
    }

    _wire() {
        const q = (sel) => this.container.querySelector(sel);
        const lgn = this.container.querySelector('.lgn');
        const moreScales = document.createElement('button');
        moreScales.type = 'button';
        moreScales.id = 'lgn-more-scales';
        moreScales.className = 'lc-btn';
        moreScales.textContent = 'Want to learn more about scales?';
        lgn.insertBefore(window.LearnCommon.header({
            title: 'Notes on your instrument',
            icon: '🎸',
            subtitle: 'On the guitar: note names on the neck, frets as half steps, sharps and flats.',
            homeId: 'lgn-home',
            themeId: 'lgn-theme',
            extra: [moreScales]
        }), lgn.firstChild);
        q('#lgn-home').addEventListener('click', () => this._stopAll());
        window.LearnCommon.completeBar(lgn, {
            id: 'b-notes',
            learned: 'You know the six strings, frets as half steps, and why one fret can have two names.'
        }).querySelector('button').addEventListener('click', () => this._stopAll());
        q('#lgn-more-scales').addEventListener('click', () => {
            this._stopAll();
            try {
                if (window.moduleSelector && typeof window.moduleSelector.selectInstrument === 'function') window.moduleSelector.selectInstrument('guitar');
                if (window.moduleSelector && typeof window.moduleSelector.launchLearnScales === 'function') window.moduleSelector.launchLearnScales();
            } catch (e) { console.warn('Failed to open Learn Scales:', e); }
        });
        q('#lgn-names').addEventListener('change', (e) => {
            this.names = e.target.value;
            // the "every place" menu names its notes the same way
            q('#lgn-every').querySelectorAll('option[value]').forEach(o => { if (o.value !== '') o.textContent = this._name(+o.value); });
            this._paint();
        });
        q('#lgn-scale').addEventListener('change', (e) => {
            this.scaleRoot = e.target.value;
            this._pcMark = null;
            this._paint();
            this._say(this.scaleRoot
                ? `The notes of <b>${this.scaleRoot} major</b> are lit: ${this._majorScale(this.scaleRoot).join(' ')}. The dots in the other colour are ${this.scaleRoot}, its home note.`
                : 'Scale off: every fret shows its name again.');
        });
        q('#lgn-speak').addEventListener('change', (e) => {
            this.speechEnabled = !!e.target.checked;
            if (!this.speechEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
        });
        q('#lgn-practice').addEventListener('click', () => {
            if (this._p && this._p.active) this._practiceStop(); else this._practiceStart();
        });
        q('#lgn-level').addEventListener('change', () => { if (this._p && this._p.active) this._practiceNext(); });
    }

    /* ---------- names ----------------------------------------------------- */
    _name(pc) {
        pc = ((pc % 12) + 12) % 12;
        const sh = LearnGuitarNotes.SHARP[pc], fl = LearnGuitarNotes.FLAT[pc];
        if (sh === fl) return sh;
        if (this.names === 'flats') return fl;
        if (this.names === 'both') return `${sh}/${fl}`;
        return sh;
    }

    /** A black-key note named the way you reached it: F♯ going up, G♭ going down. */
    _nameByWay(pc, way) {
        pc = ((pc % 12) + 12) % 12;
        return way === 'up' ? LearnGuitarNotes.SHARP[pc] : LearnGuitarNotes.FLAT[pc];
    }

    _isNatural(pc) { return LearnGuitarNotes.SHARP[((pc % 12) + 12) % 12].length === 1; }

    /** Major scale spelled by letter (B♭ major has E♭, not D♯). */
    _majorScale(root) {
        const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], NAT = [0, 2, 4, 5, 7, 9, 11], STEPS = [0, 2, 4, 5, 7, 9, 11];
        const rootPc = this._pcOfName(root);
        const li = LET.indexOf(root[0]);
        return STEPS.map((st, i) => {
            const letter = LET[(li + i) % 7];
            let d = (((rootPc + st) - NAT[LET.indexOf(letter)]) % 12 + 12) % 12;
            if (d > 6) d -= 12;
            return letter + (d > 0 ? '♯'.repeat(d) : '♭'.repeat(-d));
        });
    }

    _pcOfName(n) {
        const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[n[0]];
        let acc = 0;
        for (const ch of n.slice(1)) acc += (ch === '♯' || ch === '#') ? 1 : (ch === '♭' || ch === 'b') ? -1 : 0;
        return ((base + acc) % 12 + 12) % 12;
    }

    /* ---------- the tuning ------------------------------------------------ */
    _openNames() { return window.GuitarTuning.current().display; }

    _openPc(s) { return LearnGuitarNotes.TUNING[s] % 12; }

    /** The fret of this pitch class on a string, 0 (open) to 11. */
    _fretOf(s, pc) { return ((pc - this._openPc(s)) % 12 + 12) % 12; }

    _nth(n) {
        const tens = n % 100;
        return n + (tens > 10 && tens < 14 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
    }

    /** A string by name: "A", or "low E" and "high E" when a name is used twice. */
    _str(s) {
        const names = this._openNames();
        const same = names.map((n, i) => (n === names[s] ? i : -1)).filter(i => i >= 0);
        if (same.length < 2) return names[s];
        if (s === same[0]) return `low ${names[s]}`;
        if (s === same[same.length - 1]) return `high ${names[s]}`;
        return names[s];
    }

    _stringLabel(s) { return `${LearnGuitarNotes.ORDINALS[s]} string (${this._str(s)})`; }

    /** What to say about the strings just listed: the rhyme for standard, else how this tuning differs. */
    _stringsNote() {
        const t = LearnGuitarNotes.TUNING, std = window.GuitarTuning.STANDARD_MIDI;
        const names = this._openNames();
        const span = t[5] - t[0];
        const outside = (names[0] === names[5] && span % 12 === 0 && span > 0)
            ? ` Both outside strings are ${names[0]}, ${['', 'one octave', 'two octaves', 'three octaves'][span / 12] || `${span / 12} octaves`} apart.` : '';
        const moved = t.map((m, i) => m - std[i]);
        if (moved.every(d => d === 0)) {
            return `(“<i>E</i>ddie <i>A</i>te <i>D</i>ynamite, <i>G</i>ood <i>B</i>ye <i>E</i>ddie.”)${outside}`;
        }
        const halves = (d) => `${Math.abs(d)} half step${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'lower' : 'higher'}`;
        if (moved.every(d => d === moved[0])) return `Every string is ${halves(moved[0])} than standard.${outside}`;
        // strings moved by the same amount are said together: "the 6th, 2nd and 1st strings are 2 half steps lower"
        const groups = new Map();
        moved.forEach((d, i) => { if (d) groups.set(d, (groups.get(d) || []).concat(LearnGuitarNotes.ORDINALS[i])); });
        const say = Array.from(groups, ([d, ords]) => {
            const list = ords.length > 1 ? `${ords.slice(0, -1).join(', ')} and ${ords[ords.length - 1]} strings are` : `${ords[0]} string is`;
            return `the ${list} ${halves(d)}`;
        }).join('; ');
        return `From standard, ${say}.${outside}`;
    }

    /**
     * The fret of each string that sounds the next string open, worked out from
     * the tuning: 5, 5, 5, 4, 5 in standard. A next string that is no higher, or
     * more than 12 frets up, has no such fret on this neck.
     * @returns {{pairs: {s:number, fret:number}[], html: string}}
     */
    _shortcut() {
        const t = LearnGuitarNotes.TUNING, pairs = [];
        for (let s = 0; s < 5; s++) {
            const fret = t[s + 1] - t[s];
            if (fret >= 1 && fret <= 12) pairs.push({ s, fret });
        }
        if (!pairs.length) return { pairs, html: '' };
        const count = {};
        pairs.forEach(p => { count[p.fret] = (count[p.fret] || 0) + 1; });
        const usual = +Object.keys(count).sort((a, b) => count[b] - count[a])[0];
        const others = pairs.filter(p => p.fret !== usual);
        const next = 'sounds the same as the next string open';
        let html;
        if (pairs.length === 5 && !others.length) {
            html = `the <b>${this._nth(usual)} fret</b> of every string ${next}.`;
        } else if (pairs.length === 5 && others.length <= 2) {
            const except = others.map(p => `on the ${this._str(p.s)} string, where it is the <b>${this._nth(p.fret)} fret</b>`).join(', and ');
            html = `the <b>${this._nth(usual)} fret</b> of a string ${next}, except ${except}.`;
        } else {
            html = `each string reaches the next one open at its own fret: ${pairs.map(p => `${this._str(p.s)} at the <b>${this._nth(p.fret)}</b>`).join(', ')}.`;
        }
        return { pairs, html };
    }

    /* ---------- the neck -------------------------------------------------- */
    _cell(s, f) {
        return this._fb && this._fb.gridEl ? this._fb.gridEl.querySelector(`.fret-cell[data-string-index="${s}"][data-fret="${f}"]`) : null;
    }

    _cellsFor(pc) {
        if (!this._fb || !this._fb.gridEl) return [];
        return Array.from(this._fb.gridEl.querySelectorAll('.fret-cell')).filter(c => parseInt(c.dataset.midi, 10) % 12 === pc);
    }

    _midiAt(s, f) { return LearnGuitarNotes.TUNING[s] + f; }

    _paint() {
        const fb = this._fb;
        if (!fb || !fb.gridEl) return;
        let scale = null;
        if (this.scaleRoot) {
            scale = new Map();
            this._majorScale(this.scaleRoot).forEach(n => scale.set(this._pcOfName(n), n));
        }
        const rootPc = this.scaleRoot ? this._pcOfName(this.scaleRoot) : null;
        const held = new Set(Array.from((fb._held || new Map()).values()).map(p => p.string + ':' + p.fret));
        const practising = !!(this._p && this._p.active);
        const PAINT = {
            pick: ['var(--accent-primary)', '0 0 16px var(--accent-primary)'],
            step: ['var(--accent-primary)', '0 0 16px var(--accent-primary)'],
            right: ['var(--lc-good)', '0 0 16px var(--lc-good)'],
            wrong: ['var(--lc-bad)', '0 0 16px var(--lc-bad)'],
            all: ['var(--accent-secondary)', '0 0 14px var(--accent-secondary)'],
            held: ['var(--accent-primary)', '0 0 18px var(--accent-primary)']
        };

        fb.gridEl.querySelectorAll('.fret-cell').forEach(cell => {
            const midi = parseInt(cell.dataset.midi, 10);
            const pc = midi % 12;
            const f = parseInt(cell.dataset.fret, 10);
            const key = cell.dataset.stringIndex + ':' + f;
            const label = cell.querySelector('.fret-label');
            const natural = this._isNatural(pc);

            // an open string is called what the tuning calls it (E♭, not D♯), unless "both" was asked for
            const own = (f === 0 && this.names !== 'both') ? this._openNames()[parseInt(cell.dataset.stringIndex, 10)] : null;
            let text = (scale && scale.has(pc)) ? scale.get(pc) : (own || this._name(pc));
            let bg = natural ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.45)';
            let border = natural ? '1px solid rgba(255,255,255,0.45)' : '1px solid rgba(255,255,255,0.18)';
            let color = natural ? '#fff' : 'rgba(255,255,255,0.75)';
            let glow = 'none', weight = '700', opacity = '1';

            if (scale) {
                if (scale.has(pc)) {
                    bg = pc === rootPc ? 'var(--accent-primary)' : 'color-mix(in srgb, var(--accent-secondary) 85%, transparent)';
                    color = pc === rootPc ? '#000' : '#fff';
                    border = '1px solid rgba(255,255,255,0.5)';
                } else {
                    opacity = '0.35';
                }
            }
            // practice: only the open strings keep their names, as landmarks
            let hidden = practising && f > 0;

            const kind = held.has(key) ? 'held' : (this._posMarks.get(key) || (this._pcMark === pc ? 'all' : null));
            if (kind) {
                [bg, glow] = PAINT[kind];
                color = '#000'; weight = '900'; opacity = '1';
                border = '1px solid rgba(255,255,255,0.9)';
                hidden = false;
            }

            cell.style.opacity = opacity;
            cell.style.background = bg;
            cell.style.boxShadow = glow;
            cell.style.border = border;
            if (label) {
                if (hidden) {
                    label.textContent = '';
                } else if (text.indexOf('/') > 0) {
                    const [a, b] = text.split('/');
                    label.innerHTML = `<span style="display:block;line-height:1">${a}</span><span style="display:block;line-height:1;opacity:.8">${b}</span>`;
                    label.style.fontSize = '9px';
                } else {
                    label.textContent = text;
                    label.style.fontSize = '';
                }
                label.style.color = color;
                label.style.fontWeight = weight;
                label.style.textAlign = 'center';
                label.style.textShadow = color === '#000' ? 'none' : '0 1px 2px rgba(0,0,0,0.9)';
            }
        });
    }

    /** The board in view: a demo played to a neck scrolled off-screen is no demo. */
    _reveal() {
        const el = this.container.querySelector('#lgn-board');
        if (!el) return;
        const r = el.getBoundingClientRect(), h = window.innerHeight || 0;
        if (r.height && (r.top < 0 || r.bottom > h)) el.scrollIntoView({ behavior: 'smooth', block: r.height < h ? 'center' : 'start' });
    }

    /* ---------- sound ----------------------------------------------------- */
    _play(midi, dur = 0.9) {
        const app = window.modularApp;
        try {
            if (app && app.guitarEngine && typeof app.guitarEngine.playNote === 'function') { app.guitarEngine.playNote(midi, { duration: dur }); return; }
            if (app && app.audioEngine && typeof app.audioEngine.playNote === 'function') app.audioEngine.playNote(midi, dur);
        } catch (_) {}
    }

    _speak(text) {
        if (!this.speechEnabled || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/♯/g, ' sharp').replace(/♭/g, ' flat').replace('/', ' or ')));
        } catch (_) {}
    }

    _say(html) {
        const el = this.container.querySelector('#lgn-readout');
        if (el) el.innerHTML = html;
    }

    _clearTimers() { this._timers.forEach(t => clearTimeout(t)); this._timers = []; }

    _stopAll() {
        this._clearTimers();
        if (this._p) this._practiceStop();
        this._posMarks.clear();
        this._pcMark = null;
        this._paint();
    }

    /** Play positions one after another, each lit as it sounds. */
    _sequence(steps, gap = 520, caption) {
        this._clearTimers();
        this._pcMark = null;
        this._posMarks.clear();
        this._reveal();
        if (caption) this._say(caption);
        steps.forEach(([s, f], i) => {
            this._timers.push(setTimeout(() => {
                this._posMarks.clear();
                this._posMarks.set(s + ':' + f, 'step');
                this._play(this._midiAt(s, f));
                this._paint();
            }, i * gap));
        });
        this._timers.push(setTimeout(() => { this._posMarks.clear(); this._paint(); }, steps.length * gap + 500));
    }

    _demo(which) {
        const names = this._openNames(), low = names[0], lowName = this._str(0);
        const next = this._nameByWay(this._openPc(0) + 1, 'up');
        // Where these notes fall depends on the tuning: count from each string's open note.
        const f = this._fretOf(0, 5);
        const g = this._fretOf(0, 7) || 12;     // open G: its fret below it is 11, from the 12th
        const b = this._fretOf(1, 11);
        const first = this._shortcut().pairs[0];
        const D = {
            open: [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], 420, `Open strings, thickest to thinnest: <b>${names.join(' ')}</b>.`],
            up: [[[0, 0], [0, 1]], 600, `<b>${low} → ${next}</b>: open ${lowName}, then the 1st fret. One fret up = one half step up.`],
            down: [[[0, 1], [0, 0]], 600, `<b>${next} → ${low}</b>: one fret back = one half step down.`],
            octave: [[[0, 0], [0, 12]], 700, `Open ${low}, then the <b>12th fret</b>: ${low} again, an octave higher (12 half steps).`],
            sharp: [[[0, f], [0, f + 1]], 600, 'F, then one fret <b>up</b>: <b>F♯</b>.'],
            flat: [[[0, g], [0, g - 1]], 600, 'G, then one fret <b>down</b>: <b>G♭</b>. The same fret as F♯.'],
            bc: [[[1, b], [1, b + 1]], 600, `<b>B → C</b> on the ${this._str(1)} string: ${b === 0 ? 'open and fret 1' : `frets ${b} and ${b + 1}`}, right next to each other. No note between.`]
        };
        if (first) {
            D.fifth = [[[first.s, first.fret], [first.s + 1, 0]], 700,
                `The <b>${this._nth(first.fret)} fret</b> of ${this._str(first.s)} is ${names[first.s + 1]}, the same note as the open ${this._str(first.s + 1)} string next to it.`];
        }
        const d = D[which];
        if (!d) return;
        if (this._p && this._p.active) this._practiceStop();
        this._sequence(d[0], d[1], d[2]);
    }

    /* ---------- clicking the neck ----------------------------------------- */
    _onPick(s, f) {
        const midi = this._midiAt(s, f);
        this._play(midi);
        if (this._p && this._p.active) { this._practiceAnswer(s, f, midi); return; }
        this._clearTimers();
        this._pcMark = null;
        this._posMarks.clear();
        this._posMarks.set(s + ':' + f, 'pick');
        this._paint();
        const pc = midi % 12;
        const name = this._name(pc);
        const other = this._isNatural(pc) ? '' : ` (also called ${this.names === 'flats' ? LearnGuitarNotes.SHARP[pc] : LearnGuitarNotes.FLAT[pc]})`;
        const where = `${this._stringLabel(s)}, ${f === 0 ? 'open' : 'fret ' + f}`;
        this._say(`<b>${name}</b>${this.names === 'both' ? '' : other} · ${where} · one fret up: <b>${this._nameByWay(pc + 1, 'up')}</b> · one fret down: <b>${this._nameByWay(pc - 1, 'down')}</b>`);
        this._speak(name);
    }

    /* ---------- practice -------------------------------------------------- */
    _practiceStart() {
        this._clearTimers();
        this._pcMark = null;
        this._posMarks.clear();
        this._p = { active: true, right: 0, total: 0, streak: 0, last: null, target: null, tries: 0, busy: false };
        const btn = this.container.querySelector('#lgn-practice');
        if (btn) btn.textContent = '■ Stop';
        this._practiceNext();
    }

    _practiceStop() {
        if (!this._p) return;
        this._p.active = false;
        this._clearTimers();
        this._posMarks.clear();
        this._pcMark = null;
        const btn = this.container.querySelector('#lgn-practice');
        if (btn) btn.textContent = '▶ Start';
        const prompt = this.container.querySelector('#lgn-prompt');
        if (prompt && this._p.total) prompt.innerHTML = `Done: <b>${this._p.right} of ${this._p.total}</b> found first time. Press Start to go again.`;
        this._paint();
    }

    _practiceNext() {
        const p = this._p;
        if (!p || !p.active) return;
        const level = (this.container.querySelector('#lgn-level') || {}).value || 'nat';
        const pool = [];
        for (let pc = 0; pc < 12; pc++) if (level === 'all' || this._isNatural(pc)) pool.push(pc);
        let pc;
        do { pc = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && pc === p.last);
        const way = this._isNatural(pc) ? null : (Math.random() < 0.5 ? 'up' : 'down');
        p.target = { pc, way, name: way ? this._nameByWay(pc, way) : LearnGuitarNotes.SHARP[pc] };
        p.last = pc;
        p.tries = 0;
        p.busy = false;
        this._posMarks.clear();
        this._pcMark = null;
        this._paint();
        this._prompt(`Find <b class="lgn-big">${p.target.name}</b> anywhere on the neck.`);
        this._score();
    }

    _practiceAnswer(s, f, midi) {
        const p = this._p;
        if (!p || p.busy || !p.target) return;
        const t = p.target;
        const got = midi % 12;
        const why = t.way === 'up' ? ` (a fret up from ${LearnGuitarNotes.SHARP[(t.pc + 11) % 12]})`
            : t.way === 'down' ? ` (a fret down from ${LearnGuitarNotes.FLAT[(t.pc + 1) % 12]})` : '';
        if (got === t.pc) {
            if (p.tries === 0) { p.right++; p.streak++; } else p.streak = 0;
            p.total++;
            p.busy = true;
            this._posMarks.clear();
            this._posMarks.set(s + ':' + f, 'right');
            this._pcMark = t.pc;
            this._paint();
            this._prompt(`✓ Yes: <b>${t.name}</b>${why}. The lit dots are the same note in its other places.`);
            this._score();
            this._timers.push(setTimeout(() => this._practiceNext(), 1800));
            return;
        }
        p.tries++;
        this._posMarks.set(s + ':' + f, 'wrong');
        this._paint();
        const said = this._nameByWay(got, t.way || 'up');
        if (p.tries >= 2) {
            p.total++;
            p.streak = 0;
            p.busy = true;
            this._pcMark = t.pc;
            this._paint();
            this._prompt(`That’s ${said}. Here is every <b>${t.name}</b>${why}, lit up. Next one coming…`);
            this._score();
            this._timers.push(setTimeout(() => this._practiceNext(), 2600));
            return;
        }
        const hint = t.way ? `Hint: ${t.name} is${why.replace(/[()]/g, '')}.`
            : 'Hint: start from the nearest open string you know and count up, one fret per half step (E–F and B–C are one fret apart).';
        this._prompt(`That’s ${said}. ${hint}`);
    }

    _prompt(html) {
        const el = this.container.querySelector('#lgn-prompt');
        if (el) el.innerHTML = html;
    }

    _score() {
        const el = this.container.querySelector('#lgn-score');
        const p = this._p;
        if (el && p) el.textContent = p.total ? `${p.right} / ${p.total}${p.streak > 1 ? ` · ${p.streak} in a row` : ''}` : '';
    }

    /* ---------- a MIDI or typing keyboard --------------------------------- */
    _visible() {
        const page = document.getElementById('learn-guitar-page');
        return !!page && page.style.display !== 'none' && page.getClientRects().length > 0;
    }

    _wireMidi() {
        const mm = window.modularApp && window.modularApp.midiManager;
        if (!mm || typeof mm.on !== 'function' || this._midiWired) return;
        this._midiWired = true;
        mm.on('noteOn', ({ midi }) => {
            if (!this._visible() || !this._fb || typeof midi !== 'number') return;
            this._fb.midiNoteOn(midi);   // lights it where a hand would play it (repaints through _paint)
            const at = this._fb._held && this._fb._held.get(midi);
            if (at && this._p && this._p.active) this._practiceAnswer(at.string, at.fret, midi);
        });
        mm.on('noteOff', ({ midi }) => {
            if (this._fb && typeof midi === 'number') this._fb.midiNoteOff(midi);
        });
    }

    /* ---------- style ----------------------------------------------------- */
    _injectStyle() {
        if (document.getElementById('lgn-style')) return;
        const st = document.createElement('style');
        st.id = 'lgn-style';
        st.textContent = `
            .lgn { display:flex; flex-direction:column; gap:12px; padding:12px 16px; max-width:1400px; margin:0 auto; color:var(--text-main); }
            .lgn-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border-light); color:var(--text-main); padding:6px 12px; border-radius:4px; cursor:pointer; font-family:var(--font-tech); font-size:0.85rem; text-transform:none; transition:background .15s ease, color .15s ease; }
            .lgn-btn:hover { background:var(--accent-primary); color:#000; }
            .lgn-btn-primary { background:var(--accent-primary); border-color:var(--accent-primary); color:#000; font-weight:700; }
            .lgn-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:12px; }
            .lgn-left { display:flex; flex-direction:column; gap:12px; min-width:0; }
            .lgn-right { display:flex; flex-direction:column; gap:10px; min-width:0; }
            @media (min-width:1200px) {
                .lgn-grid { grid-template-columns:minmax(0,860px) minmax(300px,1fr); }
                .lgn-left { position:sticky; top:8px; align-self:start; }
            }
            .lgn-panel { background:var(--bg-panel); border:1px solid var(--border-light); border-radius:8px; padding:12px; min-width:0; }
            .lgn-controls { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin-bottom:10px; font-size:0.85rem; color:var(--text-muted); }
            .lgn-controls select, .lgn-practice select, .lgn-card select { background:var(--bg-app); color:var(--text-main); border:1px solid var(--border-light); border-radius:4px; padding:4px 6px; margin-left:4px; font-size:0.85rem; }
            .lgn-check { display:inline-flex; align-items:center; gap:4px; cursor:pointer; }
            #lgn-board { min-width:0; }
            .lgn-legend { display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:8px; font-size:0.75rem; color:var(--text-muted); }
            .lgn-legend span { display:inline-flex; align-items:center; gap:5px; }
            .lgn-dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
            .lgn-dot-nat { background:rgba(255,255,255,0.35); border:1px solid rgba(255,255,255,0.6); }
            .lgn-dot-acc { background:#111; border:1px solid rgba(255,255,255,0.35); }
            .lgn-readout { margin-top:8px; padding:8px 10px; border-radius:6px; background:color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left:3px solid var(--accent-primary); font-size:0.9rem; min-height:1.5em; line-height:1.5; }
            .lgn-practice-head { display:flex; flex-wrap:wrap; gap:8px 12px; align-items:center; }
            .lgn-score { margin-left:auto; font-family:var(--font-tech); color:var(--accent-secondary); }
            .lgn-prompt { margin-top:8px; color:var(--text-muted); line-height:1.5; }
            .lgn-prompt b { color:var(--text-main); }
            .lgn-big { font-size:1.3rem; color:var(--accent-primary) !important; }
            .lgn-card { background:var(--bg-panel); border:1px solid var(--border-light); border-left:3px solid var(--accent-primary); border-radius:8px; padding:10px 12px; color:var(--text-muted); line-height:1.6; font-size:0.9rem; }
            .lgn-card h4 { margin:0 0 6px 0; color:var(--text-main); font-size:0.95rem; }
            .lgn-card p { margin:6px 0; }
            .lgn-card b { color:var(--text-main); }
            .lgn-row { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0; }
            @media (max-width:600px) {
                .lgn { padding:8px 4px; }
            }
        `;
        document.head.appendChild(st);
    }
}

// expose globally
if (typeof window !== 'undefined') window.LearnGuitarNotes = LearnGuitarNotes;
