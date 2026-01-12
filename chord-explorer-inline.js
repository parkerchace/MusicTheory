/**
 * ChordExplorer - Fallback inline chord explorer for diatonic chord browsing
 * Used when UnifiedChordExplorer is not available
 */
class ChordExplorer {
    constructor(musicTheory, scaleLibrary, numberGenerator) {
        this.musicTheory = musicTheory;
        this.scaleLibrary = scaleLibrary;
        this.numberGenerator = numberGenerator;
        this.container = null;
        this.key = this.scaleLibrary.getCurrentKey();
        this.scale = this.scaleLibrary.getCurrentScale();
        this.highlightSet = new Set();
        this.symbolStyle = 'glyphs'; // 'glyphs' | 'jazz' | 'classical'
        this.listeners = new Map(); // Event system

        // Listen to scale changes
        if (this.scaleLibrary && this.scaleLibrary.on) {
            this.scaleLibrary.on('scaleChanged', (data) => {
                this.key = data.key;
                this.scale = data.scale;
                this.render();
            });
        }

        // Listen to number changes
        if (this.numberGenerator && this.numberGenerator.on) {
            this.numberGenerator.on('numbersChanged', (data) => {
                this.setHighlights(data.numbers, data.type);
                this.render();
            });
        }
    }

    formatChordName(root, chordType) {
        const style = this.symbolStyle;
        const type = chordType || '';
        const isHalfDim = /^m7b5$/i.test(type) || /^m\(b5\)$/i.test(type) || /ø/i.test(type);
        const isDim7 = /^(dim7|o7)$/i.test(type);
        const isDim = /^(dim|o)$/i.test(type);

        if (style === 'glyphs') {
            if (isHalfDim) return root + 'ø' + (/(7)/.test(type) ? '7' : '');
            if (isDim7) return root + '°7';
            if (isDim) return root + '°';
            return root + type;
        }
        if (style === 'jazz') {
            if (isHalfDim) return root + 'm7b5';
            if (isDim7) return root + 'dim7';
            if (isDim) return root + 'dim';
            return root + type;
        }
        // Classical text (spelled-out)
        if (isHalfDim) return root + ' half-diminished' + (/(7)/.test(type) ? '7' : '');
        if (isDim7) return root + ' diminished7';
        if (isDim) return root + ' diminished';
        return root + type;
    }

    getDegreeCount() {
        return String(this.scale || '').startsWith('barry_') ? 8 : 7;
    }

    setHighlights(numbers = [], type = 'diatonic') {
        const N = this.getDegreeCount();
        const norm = (n) => ((Number(n) - 1) % N + N) % N + 1;
        this.highlightSet = new Set((numbers || []).map(norm));
    }

    getUsageSuggestions(chord, degree, key, scale) {
        const suggestions = [];
        const rnMap = ['I','II','III','IV','V','VI','VII','VIII'];
        const isMinorQual = /(^m(?!aj))|dim|°|ø|m7b5/i.test(chord.chordType || '');
        let rn = rnMap[(degree - 1) % rnMap.length];
        if (isMinorQual) rn = rn.toLowerCase();
        
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(key, scale);
            const chordNotes = (chord.diatonicNotes && chord.diatonicNotes.length) 
                ? chord.diatonicNotes 
                : (this.musicTheory.getChordNotes(chord.root, chord.chordType) || []);
            const analysis = this.musicTheory.findAllContainerChords(chordNotes, scaleNotes) || [];
            let self = analysis.find(a => a.fullName === chord.root + chord.chordType) 
                || analysis.find(a => a.root === chord.root && a.chordType === chord.chordType) 
                || null;
            if (self && self.functions && self.functions.length) {
                const funcs = self.functions.join(', ');
                const res = self.resolutions && self.resolutions.length ? ` ${self.resolutions.join(', ')}` : '';
                suggestions.push(`In ${key} ${scale}, this is ${rn} (${funcs}).${res ? ' Typical move:' + res : ''}`);
            } else {
                suggestions.push(`In ${key} ${scale}, this is ${rn}.`);
            }
        } catch(e) {
            suggestions.push(`In ${key} ${scale}, this is ${rn}.`);
        }
        
        const type = chord.chordType || '';
        const root = chord.root;
        
        if (/m7b5/i.test(type)) {
            const tonicMinor = this.musicTheory.getNoteFromInterval(root, 10);
            const vRoot = this.musicTheory.getNoteFromInterval(tonicMinor, 7);
            const iiName = this.formatChordName(root, 'm7b5');
            const vName = this.formatChordName(vRoot, '7b9');
            const iName = this.formatChordName(tonicMinor, 'm');
            suggestions.push(`Minor ii–V–i: ${iiName} → ${vName} → ${iName}`);
            suggestions.push(`Scales over ${iiName}: Locrian or Locrian ♮2 on ${root}`);
        } else if (/^7($|[^a-zA-Z])/i.test(type)) {
            const I = this.musicTheory.getNoteFromInterval(root, 5);
            const vName = this.formatChordName(root, '7');
            const Imaj = this.formatChordName(I, 'maj');
            const sub = this.musicTheory.getNoteFromInterval(root, 6);
            const subName = this.formatChordName(sub, '7');
            suggestions.push(`Dominant: ${vName} → ${Imaj}`);
            suggestions.push(`Scales on ${root}: Mixolydian, Altered, Half–Whole diminished`);
            suggestions.push(`Tritone sub: ${subName} → ${Imaj}`);
        } else if (/maj7/i.test(type)) {
            const iiRoot = this.musicTheory.getNoteFromInterval(root, 2);
            const vRoot = this.musicTheory.getNoteFromInterval(root, 7);
            const iiName = this.formatChordName(iiRoot, 'm7');
            const vName = this.formatChordName(vRoot, '7');
            const IName = this.formatChordName(root, 'maj7');
            suggestions.push(`Major ii–V–I: ${iiName} → ${vName} → ${IName}`);
            suggestions.push(`Scales on ${root}: Ionian, Lydian`);
        } else if (/^m7($|[^a-zA-Z])/i.test(type)) {
            const I = this.musicTheory.getNoteFromInterval(root, 10);
            const vRoot = this.musicTheory.getNoteFromInterval(I, 7);
            const iiName = this.formatChordName(root, 'm7');
            const vName = this.formatChordName(vRoot, '7');
            const Imaj = this.formatChordName(I, 'maj7');
            suggestions.push(`As ii in major: ${iiName} → ${vName} → ${Imaj}`);
            suggestions.push(`Scale on ${root}: Dorian`);
        } else if (/dim7/i.test(type)) {
            const I = this.musicTheory.getNoteFromInterval(root, 1);
            const vii = this.formatChordName(root, 'dim7');
            const Imaj = this.formatChordName(I, 'maj');
            suggestions.push(`Leading-tone: ${vii} → ${Imaj}`);
            suggestions.push(`Scale on ${root}: Diminished (whole–half)`);
        } else if (/mMaj7/i.test(type)) {
            const iName = this.formatChordName(root, 'mMaj7');
            suggestions.push(`Minor tonic color: ${iName}`);
            suggestions.push(`Scale on ${root}: Melodic minor`);
        }
        
        return suggestions;
    }

    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        if (!container) return;
        this.container = container;
        
        if (this.numberGenerator) {
            this.setHighlights(
                this.numberGenerator.getCurrentNumbers(),
                this.numberGenerator.getNumberType()
            );
        }
        this.render();
    }

    render() {
        if (!this.container) return;
        const N = this.getDegreeCount();
        const key = this.key;
        const scale = this.scale;

        const cards = [];
        for (let degree = 1; degree <= N; degree++) {
            const chord = this.musicTheory.getDiatonicChord(degree, key, scale);
            let notes = [];
            try {
                notes = (chord.diatonicNotes && chord.diatonicNotes.length)
                    ? chord.diatonicNotes
                    : (this.musicTheory.getChordNotes(chord.root, chord.chordType) || []);
            } catch (e) {
                notes = [];
            }
            const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII'];
            const isMinorQuality = /(^m(?!aj))|dim|°|ø|m7b5/i.test(chord.chordType || '');
            let rn = romanNumerals[(degree - 1) % romanNumerals.length];
            if (isMinorQuality) rn = rn.toLowerCase();
            const selected = this.highlightSet.has(degree) ? 'selected' : '';
            const displayName = this.formatChordName(chord.root, chord.chordType);
            cards.push(`
                <div class="chord-card ${selected}" data-degree="${degree}">
                    <div class="chord-name">${displayName}</div>
                    <div class="chord-notes">${notes.join(' ')}</div>
                    <div class="chord-meta"><span>${rn}</span></div>
                </div>
            `);
        }

        this.container.innerHTML = `
            <div class="chord-explorer-ui">
                <div class="symbol-toggle" aria-label="Chord symbol style">
                    <button type="button" class="${this.symbolStyle === 'glyphs' ? 'active' : ''}" data-style="glyphs">Glyphs</button>
                    <button type="button" class="${this.symbolStyle === 'jazz' ? 'active' : ''}" data-style="jazz">Jazz</button>
                    <button type="button" class="${this.symbolStyle === 'classical' ? 'active' : ''}" data-style="classical">Classical</button>
                </div>
                <div class="chord-grid">
                    ${cards.join('')}
                </div>
                <div class="chord-usage-panel" id="chord-usage-panel"></div>
            </div>
        `;

        // Wire up toggle buttons
        const toggle = this.container.querySelector('.symbol-toggle');
        if (toggle) {
            toggle.querySelectorAll('button[data-style]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const style = btn.getAttribute('data-style');
                    if (style && (style === 'glyphs' || style === 'jazz' || style === 'classical')) {
                        this.symbolStyle = style;
                        this.render();
                    }
                });
            });
        }

        const cardsEls = this.container.querySelectorAll('.chord-card');
        cardsEls.forEach(card => {
            card.addEventListener('click', () => {
                const degree = Number(card.getAttribute('data-degree')) || 1;
                const chord = this.musicTheory.getDiatonicChord(degree, this.key, this.scale);
                const usage = this.getUsageSuggestions(chord, degree, this.key, this.scale);
                const panel = this.container.querySelector('#chord-usage-panel');
                if (panel) {
                    const displayName = this.formatChordName(chord.root, chord.chordType);
                    panel.innerHTML = `
                        <div class="chord-usage-title">Usage ideas for ${displayName} (${this.key} ${this.scale})</div>
                        <ul class="chord-usage-list">
                            ${usage.map(u => `<li>${u}</li>`).join('')}
                        </ul>
                    `;
                }
                this.container.querySelectorAll('.chord-card').forEach(el => el.classList.remove('selected'));
                card.classList.add('selected');
                
                const chordWithNotes = {
                    ...chord,
                    chordNotes: this.musicTheory.getChordNotes(chord.root, chord.chordType) || []
                };
                
                try {
                    if (!window.__interactionLog) window.__interactionLog = [];
                    window.__interactionLog.push({
                        type: 'chordExplorerChordSelected',
                        details: { degree, chord: { root: chordWithNotes.root, chordType: chordWithNotes.chordType, chordNotes: chordWithNotes.chordNotes } },
                        timestamp: new Date().toISOString()
                    });
                } catch (_) {}

                this.emit('chordSelected', { chord: chordWithNotes, degree });
            });
        });
    }

    // Event system methods
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
                    console.error('Error in ChordExplorer event listener:', error);
                }
            });
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordExplorer;
}
