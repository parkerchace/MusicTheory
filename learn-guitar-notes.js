// learn-guitar-notes.js
// Rebuilt compact LearnGuitarNotes module with accidental UI and Lexical Engine panel

class LearnGuitarNotes {
    constructor() {
        this.container = null;
        this._fretboard = null; // optional external visualizer
        this.steps = ['C','D','E','F','G','A','B'];
        this.stepIndex = 0;
        this.showOctave = true;
        this.speechEnabled = false;
        // accidental / key UI state
        this.key = 'C';
        this.accidentalMode = 'sharps'; // 'sharps' | 'flats' | 'both'
        this.showEnharmonic = false;

        this.ui = {};
        this.pages = ['Intro','Notes','Octaves','Intervals','Practice','Quiz'];
        this.currentPage = 0;

        // session data for lexical engine
        this._lexSession = [];
    }

    mount(selector) {
        this.container = document.querySelector(selector) || document.getElementById('learn-guitar-notes-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'learn-guitar-notes-container';
            document.body.appendChild(this.container);
        }
        this.container.style.padding = '12px';
        this.container.style.color = 'var(--text-main, #111)';

        // header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.innerHTML = `<div style="font-weight:800;font-size:1.1rem">LEARN GUITAR NOTES</div>`;
        this.container.appendChild(header);

        // main layout: visualizer on top, instruction & lexical panels below
        const main = document.createElement('div');
        main.style.display = 'grid';
        main.style.gridTemplateColumns = '1fr 360px';
        main.style.gap = '12px';

        const left = document.createElement('div');
        left.style.minWidth = '0';
        const right = document.createElement('div');
        right.style.minWidth = '0';

        main.appendChild(left);
        main.appendChild(right);
        this.container.appendChild(main);

        // visualizer host (use existing GuitarFretboardVisualizer when available)
        const vizHost = document.createElement('div');
        vizHost.id = 'learn-guitar-viz-host';
        left.appendChild(vizHost);

        // if a dedicated GuitarFretboardVisualizer class exists, use it
        const GuitarClass = (typeof window !== 'undefined' && window.GuitarFretboardVisualizer) || (typeof GuitarFretboardVisualizer !== 'undefined' && GuitarFretboardVisualizer);
        if (GuitarClass) {
            try {
                this._fretboard = new GuitarClass({ frets: 16, showNoteLabels: true, fitToContainer: true });
                // mount into our vizHost container
                this._fretboard.mount(vizHost);
                // listen for clicks from the visualizer
                if (typeof this._fretboard.on === 'function') {
                    this._fretboard.on('noteClicked', (d) => this._onNoteClicked(d));
                }
            } catch (e) {
                // fallback to simple grid if instantiation fails
                console.warn('Failed to initialize GuitarFretboardVisualizer, using fallback:', e);
                this._renderFallbackVisualizer(vizHost);
            }
        } else {
            this._renderFallbackVisualizer(vizHost);
        }

        // instruction panel (below board inside left column)
        const instr = document.createElement('div');
        instr.style.marginTop = '8px';
        left.appendChild(instr);
        this._buildInstructionPanel(instr);

        // initial label render for whichever visualizer is active
        this._renderLabels();
    }

    // --- Fallback visualizer (simple grid if external visualizer is not present) ---
    _renderFallbackVisualizer(parent) {
        parent.innerHTML = '';
        const fretboard = document.createElement('div');
        fretboard.style.display = 'grid';
        fretboard.style.gridTemplateColumns = 'repeat(13, 44px)';
        fretboard.style.gridTemplateRows = 'repeat(6, 36px)';
        fretboard.style.gap = '4px';
        fretboard.style.marginBottom = '12px';
        parent.appendChild(fretboard);

        const strings = ['E','B','G','D','A','E'];
        const NOTE_TO_SEMITONE = { C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11 };

        this._fallbackCells = [];
        for (let s = 0; s < 6; s++) {
            for (let f = 0; f <= 12; f++) {
                const cell = document.createElement('div');
                cell.className = 'fret-cell';
                cell.style.background = f === 0 ? '#222' : '#2d2d2d';
                cell.style.border = '1px solid #444';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.color = '#fff';
                cell.style.fontSize = '0.9rem';
                cell.style.height = '36px';
                cell.style.width = '44px';
                cell.dataset.string = String(6 - s);
                cell.dataset.fret = String(f);
                if (f === 0) {
                    cell.textContent = strings[s];
                    cell.style.fontWeight = '700';
                } else {
                    const openIdx = NOTE_TO_SEMITONE[strings[s]];
                    const semitone = (openIdx + f) % 12;
                    cell.dataset.semitone = String(semitone);
                    cell.dataset.midi = String((this._fallbackOpenStringMidis && this._fallbackOpenStringMidis[s] ? this._fallbackOpenStringMidis[s] : 40) + f);
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', () => {
                        const midi = parseInt(cell.dataset.midi,10);
                        const display = this._labelForSemitone(semitone);
                        // highlight by midi so matching doesn't rely on display text
                        this._highlightMidiNote(midi);
                        this._onNoteClicked({ note: display, midi });
                    });
                }
                fretboard.appendChild(cell);
                this._fallbackCells.push(cell);
            }
        }
    }

    // --- Instruction panel with controls (below fretboard) ---
    _buildInstructionPanel(parent) {
        parent.innerHTML = '';
        // brief description
        const desc = document.createElement('div');
        desc.style.marginBottom = '8px';
        desc.innerHTML = `<div style="font-weight:700">Starting in C major</div><div style="color:var(--text-muted,#9ca3af);font-size:0.95rem">Click a fret to hear the pitch and see its name + octave. Use the controls to show accidentals or enharmonic labels.</div>`;
        parent.appendChild(desc);

        // controls row
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.marginBottom = '10px';

        // (removed note-select and Play Octaves button as unused)

        // speech toggle
        const speechToggle = document.createElement('input'); speechToggle.type = 'checkbox'; speechToggle.id = 'speech-toggle';
        const speechLabel = document.createElement('label'); speechLabel.htmlFor = 'speech-toggle'; speechLabel.textContent = 'Speak';
        speechToggle.addEventListener('change', (e) => { this.speechEnabled = !!e.target.checked; if (!this.speechEnabled && window && window.speechSynthesis) window.speechSynthesis.cancel(); });
        row.appendChild(speechToggle); row.appendChild(speechLabel);

        parent.appendChild(row);

        // accidental & key controls row
        const keyRow = document.createElement('div');
        keyRow.style.display = 'flex'; keyRow.style.gap = '8px'; keyRow.style.alignItems = 'center'; keyRow.style.marginBottom = '10px';

        const keySelect = document.createElement('select'); ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'].forEach(k => { const o=document.createElement('option'); o.value=k; o.text=k; keySelect.appendChild(o); });
        keySelect.value = this.key; keySelect.addEventListener('change', (e)=>{ this.key = e.target.value; /* future: use scale */ });
        keyRow.appendChild(document.createTextNode('Key:')); keyRow.appendChild(keySelect);

        const accSelect = document.createElement('select'); [['sharps','Sharps'],['flats','Flats'],['both','Both']].forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.text=t; accSelect.appendChild(o); }); accSelect.value = this.accidentalMode;
        accSelect.addEventListener('change', (e)=>{ this.accidentalMode = e.target.value; this._renderLabels(); });
        keyRow.appendChild(document.createTextNode('Accidentals:')); keyRow.appendChild(accSelect);

        // (removed separate "Show enharmonic" checkbox — use "Both" in Accidental selector)

        parent.appendChild(keyRow);

        // stepbox / practice area
        const stepBox = document.createElement('div'); stepBox.id = 'learn-step-box'; stepBox.style.minHeight='100px'; stepBox.style.padding='8px'; stepBox.style.background='linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02))';
        parent.appendChild(stepBox); this.ui.stepBox = stepBox;

        // practice controls
        const practiceRow = document.createElement('div'); practiceRow.style.display='flex'; practiceRow.style.gap='8px'; practiceRow.style.marginTop='8px';
        const startBtn = document.createElement('button'); startBtn.textContent='Start Practice'; startBtn.addEventListener('click', ()=>this._startPractice());
        practiceRow.appendChild(startBtn);
        parent.appendChild(practiceRow);
    }

    

    // --- helper to map semitone -> names and display label based on accidentalMode ---
    _semitoneNameArrays() {
        const sharps = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const flats  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
        return { sharps, flats };
    }

    // canonical name used for data/model matching (use sharps as canonical)
    _canonicalNameForSemitone(semitone) {
        const s = ((semitone % 12) + 12) % 12;
        const { sharps } = this._semitoneNameArrays();
        return sharps[s];
    }

    // display label for UI according to accidentalMode; 'both' shows both names
    _labelForSemitone(semitone) {
        const s = ((semitone % 12) + 12) % 12;
        const { sharps, flats } = this._semitoneNameArrays();
        if (this.accidentalMode === 'flats') return flats[s];
        if (this.accidentalMode === 'both') {
            const a = sharps[s], b = flats[s];
            return a === b ? a : `${a} / ${b}`;
        }
        return sharps[s];
    }

    _renderFallbackLabels() {
        if (!this._fallbackCells) return;
        for (const c of this._fallbackCells) {
            if (!c.dataset.semitone) continue;
            const sem = parseInt(c.dataset.semitone,10);
            const display = this._labelForSemitone(sem);
            const canonical = this._canonicalNameForSemitone(sem);
            if (c.dataset.fret === '0') {
                // keep open-string marker text
            } else {
                c.textContent = display;
            }
            c.dataset.note = canonical;
        }
    }

    // Render labels for whichever visualizer is active
    _renderLabels() {
        // If using external visualizer
        if (this._fretboard && this._fretboard.gridEl) {
            try {
                const cells = Array.from(this._fretboard.gridEl.querySelectorAll('.fret-cell'));
                for (const cell of cells) {
                    const midi = parseInt(cell.dataset.midi, 10);
                    if (isNaN(midi)) continue;
                    const sem = midi % 12;
                    const display = this._labelForSemitone(sem);
                    const canonical = this._canonicalNameForSemitone(sem);
                    const labelEl = cell.querySelector('.fret-label');
                    if (labelEl) labelEl.textContent = display;
                    // keep dataset.note canonical so visualizer matching works
                    cell.dataset.note = canonical;
                }
                // re-apply visualizer state styles
                if (typeof this._fretboard.applyState === 'function') this._fretboard.applyState();
            } catch (e) {
                console.warn('Failed to render labels on visualizer', e);
            }
            return;
        }
        // otherwise keep fallback behavior
        this._renderFallbackLabels();
    }

    // --- interactions / basic audio helpers ---
    _onNoteClicked(ev) {
        const midi = ev && ev.midi ? ev.midi : null;
        const noteName = ev && ev.note ? ev.note : null;
        const octave = midi ? Math.floor(midi/12)-1 : null;
        const label = (noteName && octave !== null) ? `${noteName} ${octave} (MIDI ${midi})` : (noteName || 'Unknown');
        if (this.ui.stepBox) this.ui.stepBox.textContent = `You clicked: ${label}`;
        if (midi) this._playMidiAndFlash(midi); else if (noteName) this._playNoteForName(noteName);
        if (this.speechEnabled && noteName) {
            try { const speak = this.showOctave && octave!==null ? `${noteName} ${octave}` : noteName; if (window && window.speechSynthesis) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(speak)); } } catch(e){}
        }
    }

    _playNoteForName(name) {
        // best-effort midi and play via modularApp if available
        const midi = this._noteNameToMidi(name);
        if (midi) this._playMidiAndFlash(midi);
    }

    _playMidiAndFlash(midi) {
        try {
            const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.audioEngine || window.modularApp.guitarEngine) : null;
            if (audio && typeof audio.playNote === 'function') audio.playNote(midi);
        } catch (e) {}
        this._highlightMidiNote(midi);
    }

    _highlightFallbackNote(note) {
        for (const c of this._fallbackCells || []) {
            if (!c.dataset.note) continue;
            if (c.dataset.note === note) c.style.background = '#60a5fa'; else c.style.background = c.dataset.fret === '0' ? '#222' : '#2d2d2d';
        }
    }

    _highlightMidiNote(midi) {
        for (const c of this._fallbackCells || []) {
            const cm = c.dataset.midi ? parseInt(c.dataset.midi,10) : NaN;
            if (!isNaN(cm) && cm === midi) c.style.background = '#60a5fa'; else c.style.background = c.dataset.fret === '0' ? '#222' : '#2d2d2d';
        }
    }

    _noteNameToMidi(note) {
        // simple mapping around middle C
        const map = { 'C':60,'C#':61,'Db':61,'D':62,'D#':63,'Eb':63,'E':64,'F':65,'F#':66,'Gb':66,'G':67,'G#':68,'Ab':68,'A':69,'A#':70,'Bb':70,'B':71 };
        // accept enharmonic strings like "A# / Bb"
        if (note.includes('/')) note = note.split('/')[0].trim();
        if (note.includes(' ')) note = note.split(' ')[0];
        return map[note] || 60;
    }

    // practice stub
    _startPractice() {
        if (this.ui.stepBox) this.ui.stepBox.textContent = 'Practice started — click the correct fret when prompted.';
        // simple practice: highlight a random semitone
        const sem = Math.floor(Math.random()*12);
        // find a matching cell and flash
        for (const c of this._fallbackCells || []) {
            if (parseInt(c.dataset.semitone,10) === sem) { c.style.background = '#f59e0b'; setTimeout(()=>this._renderFallbackLabels(),800); }
        }
    }
}

// expose globally
if (typeof window !== 'undefined') window.LearnGuitarNotes = LearnGuitarNotes;
