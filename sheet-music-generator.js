/**
 * SHEET MUSIC GENERATOR MODULE
 *
 * Renders a simple 4‑bar staff (or grand staff) showing the currently
 * selected key/scale from ScaleCircle/ScaleLibrary and the currently
 * selected chord from the Chord Explorer / Piano / Container tools.
 *
 * Design goals
 * - Live‑updates when key/scale changes
 * - Live‑updates when the highlighted chord degree changes
 * - By default: shows ONE bar at a time (just the selected chord)
 * - Optional: "one chord per bar" mode for a small progression
 * - Option to choose single staff (treble) or grand staff (treble + bass)
 * - Extremely lightweight: SVG, no external deps
 *
 * Staff mapping (treble clef, reference lines from bottom to top):
 *   Lines: E4, G4, B4, D5, F5
 *   Spaces: F4, A4, C5, E5
 * Extra info from user:
 *   "there are 4 bars, F A C E bottom up"  → bar‑line positions
 *   "the lines are E G B D F from the bottom up" → staff lines
 */

class SheetMusicGenerator {
	constructor(musicTheory) {
		this.musicTheory = musicTheory;

		this.state = {
			key: 'C',
			scale: 'major',
			scaleNotes: [],
			/**
			 * Current chord object (as produced by MusicTheoryEngine.getDiatonicChord)
			 * shape: { root, chordType, chordNotes, diatonicNotes? }
			 */
			currentChord: null,
			/**
			 * Display mode: 'single' = 1 bar showing only current chord,
			 * 'per-bar' = up to 4 bars, each bar = one chord in sequence.
			 */
			barMode: 'single', // 'single' | 'per-bar'
			/**
			 * Staff type: 'treble' (single treble), 'bass' (single bass), 'grand' (treble + bass)
			 */
			staffType: 'treble', // 'treble' | 'bass' | 'grand'
			/**
			 * Octave offset for chord voicing (-2 to +2)
			 */
			octaveOffset: 0,
			inversion: 0, // 0=root, 1=1st, 2=2nd, 3=3rd
			splitAcrossGrand: false,
			/**
			 * When true, draw traditional key signature symbols; when false, hide the
			 * key signature and instead show per-note accidentals next to noteheads.
			 */
			showKeySignature: true,
			/**
			 * When true, modal key signatures use parallel major/minor as base (e.g., C Locrian shows
			 * C minor signature + extra flats). When false, use relative major (more complex).
			 */
			simplifyModalSignatures: true,
			/**
			 * Optional progression (array of chord objects) for per‑bar mode
			 */
			barChords: [],
			/**
			 * Whether a chord is currently selected / focused
			 */
			hasSelection: false,
			/**
			 * If the current chord came from selecting a scale degree in the Chord Explorer,
			 * remember that degree so we can recompute the chord when the scale changes.
			 */
			selectedDegree: null,
			currentChordLinkedToDegree: false
		};

		// Whether the SheetMusicGenerator should follow generated progressions
		// Enable following generated progressions by default so the Sheet Music
		// immediately reflects Progression Builder output on app startup.
		this.state.followGenerated = true;

		this.container = null;
		this.controlsContainer = null;
		this.svgContainer = null;
	}

	// --------------------------- Public API ---------------------------

	mount(container) {
		if (typeof container === 'string') {
			container = document.querySelector(container);
		}
		if (!container) return;
		this.container = container;
		this._renderShell();
		this.render();
	}

	setKeyAndScale(key, scale, notes) {
		this.state.key = key || this.state.key;
		this.state.scale = scale || this.state.scale;
		if (Array.isArray(notes)) this.state.scaleNotes = notes.slice();
		// If current chord is linked to a degree, recompute it for the new key/scale
		try {
			if (this.state.currentChordLinkedToDegree && Number.isInteger(this.state.selectedDegree) && this.musicTheory && typeof this.musicTheory.getDiatonicChord === 'function') {
				const deg = this.state.selectedDegree;
				const newChord = this.musicTheory.getDiatonicChord(deg, this.state.key, this.state.scale);
				if (newChord) {
					const chordNotes = (this.musicTheory.getChordNotes && this.musicTheory.getChordNotes(newChord.root, newChord.chordType)) || [];
					this.state.currentChord = { ...newChord, chordNotes };
					this.state.hasSelection = true;
				}
			}
		} catch (e) { /* no-op */ }
		this.render();
	}

	/**
	 * Update the currently displayed chord (from Chord Explorer, Piano, etc.)
	 */
	setCurrentChord(chord, options = {}) {
		this.state.currentChord = chord || null;
		this.state.hasSelection = !!chord;
		// Detect and remember scale degree link when possible
		let degreeLinked = false;
		let detectedDegree = null;
		try {
			if (Number.isInteger(options.degree)) {
				detectedDegree = options.degree;
				degreeLinked = true;
			} else if (chord && chord.root && Array.isArray(this.state.scaleNotes) && this.state.scaleNotes.length) {
				// Find degree by matching chord root to current scale notes (enharmonic-aware)
				const nv = (this.musicTheory && this.musicTheory.noteValues) || {};
				const rootVal = nv[chord.root];
				if (rootVal != null) {
					const idx = this.state.scaleNotes.findIndex(n => nv[n] != null && (nv[n] % 12) === (rootVal % 12));
					if (idx >= 0) {
						detectedDegree = idx + 1;
						degreeLinked = true;
					}
				}
			}
		} catch (e) { /* ignore */ }
		this.state.selectedDegree = degreeLinked ? detectedDegree : null;
		this.state.currentChordLinkedToDegree = !!degreeLinked;
		if (options.appendToBars && chord) {
			// maintain up to 4 chords for per‑bar view
			this.state.barChords.push(chord);
			if (this.state.barChords.length > 4) {
				this.state.barChords.shift();
			}
		}
		this.render();
	}

	setBarMode(mode) {
		if (mode !== 'single' && mode !== 'per-bar') return;
		this.state.barMode = mode;
		this.render();
	}

	setStaffType(type) {
		if (type !== 'treble' && type !== 'bass' && type !== 'grand') return;
		this.state.staffType = type;
		this.render();
	}

	/**
	 * Replace the bar chords shown in per-bar mode.
	 * chords: array of chord objects { root, chordType, chordNotes, fullName }
	 * This method will set the internal state and trigger a re-render.
	 */
	setBarChords(chords) {
		if (!Array.isArray(chords)) chords = [];
		this.state.barChords = chords.slice();
		// If caller hasn't already set per-bar mode, prefer to keep current mode.
		// Render to reflect the new bar chords immediately.
		this.render();
	}

	// ------------------------- Internal render ------------------------

	_renderShell() {
		this.container.innerHTML = '';

		const wrapper = document.createElement('div');
		wrapper.className = 'sheet-music-module';
		wrapper.style.display = 'flex';
		wrapper.style.flexDirection = 'column';
		wrapper.style.gap = '8px';

		// Controls row
		const controls = document.createElement('div');
		controls.className = 'sheet-music-controls';
		controls.style.display = 'flex';
		controls.style.flexWrap = 'wrap';
		controls.style.gap = '8px';
		controls.style.alignItems = 'center';

		const title = document.createElement('div');
		title.textContent = 'Sheet Music';
		title.style.fontSize = '0.9rem';
		title.style.fontWeight = '600';
		controls.appendChild(title);

		// Staff type select
		const staffLabel = document.createElement('label');
		staffLabel.textContent = 'Staff:';
		staffLabel.style.fontSize = '0.8rem';
		const staffSelect = document.createElement('select');
		staffSelect.innerHTML = `
			<option value="treble">Treble</option>
			<option value="bass">Bass</option>
			<option value="grand">Grand (treble + bass)</option>
		`;
		staffSelect.value = this.state.staffType;
		staffSelect.style.fontSize = '0.8rem';
		staffSelect.addEventListener('change', () => {
			this.setStaffType(staffSelect.value);
		});
		staffLabel.appendChild(staffSelect);
		controls.appendChild(staffLabel);

		// Bar mode select
		const modeLabel = document.createElement('label');
		modeLabel.textContent = 'Bars:';
		modeLabel.style.fontSize = '0.8rem';
		const modeSelect = document.createElement('select');
		modeSelect.innerHTML = `
			<option value="single">Current chord only</option>
			<option value="per-bar">One chord per bar (last 4)</option>
		`;
		modeSelect.value = this.state.barMode;
		modeSelect.style.fontSize = '0.8rem';
		modeSelect.addEventListener('change', () => {
			this.setBarMode(modeSelect.value);
		});
		modeLabel.appendChild(modeSelect);
		controls.appendChild(modeLabel);

		// Follow generated progression toggle
		const followWrap = document.createElement('label');
		followWrap.style.fontSize = '0.8rem';
		followWrap.style.display = 'flex';
		followWrap.style.alignItems = 'center';
		followWrap.style.gap = '6px';
		followWrap.style.marginLeft = '8px';
		const followCb = document.createElement('input');
		followCb.type = 'checkbox';
		followCb.id = 'follow-generated-checkbox';
		followCb.checked = !!this.state.followGenerated;
		followCb.addEventListener('change', () => {
			this.state.followGenerated = !!followCb.checked;
		});
		const followLabelText = document.createElement('span');
		followLabelText.textContent = 'Follow generated progression';
		followWrap.appendChild(followCb);
		followWrap.appendChild(followLabelText);
		controls.appendChild(followWrap);

		// Inversion select
		const invLabel = document.createElement('label');
		invLabel.textContent = 'Inversion:';
		invLabel.style.fontSize = '0.8rem';
		const invSelect = document.createElement('select');
		invSelect.innerHTML = `
			<option value="0">Root</option>
			<option value="1">1st</option>
			<option value="2">2nd</option>
			<option value="3">3rd</option>
		`;
		invSelect.value = String(this.state.inversion);
		invSelect.style.fontSize = '0.8rem';
		invSelect.addEventListener('change', () => {
			this.state.inversion = Math.max(0, Math.min(3, parseInt(invSelect.value)));
			this.render();
		});
		invLabel.appendChild(invSelect);
		controls.appendChild(invLabel);

		// Octave control buttons
		const octaveLabel = document.createElement('span');
		octaveLabel.textContent = 'Octave:';
		octaveLabel.style.fontSize = '0.8rem';
		octaveLabel.style.marginLeft = '8px';
		controls.appendChild(octaveLabel);

		const octaveDown = document.createElement('button');
		octaveDown.textContent = '▼';
		octaveDown.style.fontSize = '0.7rem';
		octaveDown.style.padding = '2px 6px';
		octaveDown.style.cursor = 'pointer';
		octaveDown.addEventListener('click', () => {
			if (this.state.octaveOffset > -2) {
				this.state.octaveOffset--;
				this.render();
			}
		});
		controls.appendChild(octaveDown);

		const octaveDisplay = document.createElement('span');
		octaveDisplay.id = 'sheet-music-octave-display';
		octaveDisplay.style.fontSize = '0.75rem';
		octaveDisplay.style.padding = '0 6px';
		octaveDisplay.textContent = '0';
		controls.appendChild(octaveDisplay);

		const octaveUp = document.createElement('button');
		octaveUp.textContent = '▲';
		octaveUp.style.fontSize = '0.7rem';
		octaveUp.style.padding = '2px 6px';
		octaveUp.style.cursor = 'pointer';
		octaveUp.addEventListener('click', () => {
			if (this.state.octaveOffset < 2) {
				this.state.octaveOffset++;
				this.render();
			}
		});
		controls.appendChild(octaveUp);

		// Split voicing across staves (only meaningful for grand)
		const splitWrap = document.createElement('label');
		splitWrap.id = 'split-across-staves-control';
		splitWrap.style.fontSize = '0.8rem';
		splitWrap.style.display = 'flex';
		splitWrap.style.alignItems = 'center';
		splitWrap.style.gap = '4px';
		splitWrap.style.marginLeft = '8px';
		const splitCb = document.createElement('input');
		splitCb.id = 'split-across-staves-checkbox';
		splitCb.type = 'checkbox';
		splitCb.checked = this.state.splitAcrossGrand;
		splitCb.disabled = this.state.staffType !== 'grand';
		splitCb.addEventListener('change', () => {
			this.state.splitAcrossGrand = !!splitCb.checked;
			this.render();
		});
		const splitLabelText = document.createElement('span');
		splitLabelText.textContent = 'Split across staves';
		splitWrap.appendChild(splitCb);
		splitWrap.appendChild(splitLabelText);
		// Only show split control when on grand staff
		splitWrap.style.display = this.state.staffType === 'grand' ? 'flex' : 'none';
		controls.appendChild(splitWrap);

		// Toggle: show/hide key signature (when hidden, draw per-note accidentals)
		const ksWrap = document.createElement('label');
		ksWrap.style.fontSize = '0.8rem';
		ksWrap.style.display = 'flex';
		ksWrap.style.alignItems = 'center';
		ksWrap.style.gap = '4px';
		ksWrap.style.marginLeft = '8px';
		const ksCb = document.createElement('input');
		ksCb.id = 'show-key-signature-checkbox';
		ksCb.type = 'checkbox';
		ksCb.checked = !!this.state.showKeySignature;
		ksCb.addEventListener('change', () => {
			this.state.showKeySignature = !!ksCb.checked;
			this.render();
		});
		const ksLabelText = document.createElement('span');
		ksLabelText.textContent = 'Show key signature';
		ksWrap.appendChild(ksCb);
		ksWrap.appendChild(ksLabelText);
		controls.appendChild(ksWrap);

		// Toggle: simplify modal signatures (parallel major/minor instead of relative major)
		const simplifyWrap = document.createElement('label');
		simplifyWrap.style.fontSize = '0.8rem';
		simplifyWrap.style.display = 'flex';
		simplifyWrap.style.alignItems = 'center';
		simplifyWrap.style.gap = '4px';
		simplifyWrap.style.marginLeft = '8px';
		const simplifyCb = document.createElement('input');
		simplifyCb.id = 'simplify-modal-signatures-checkbox';
		simplifyCb.type = 'checkbox';
		simplifyCb.checked = !!this.state.simplifyModalSignatures;
		simplifyCb.addEventListener('change', () => {
			this.state.simplifyModalSignatures = !!simplifyCb.checked;
			this.render();
		});
		const simplifyLabelText = document.createElement('span');
		simplifyLabelText.textContent = 'Simplify modal signatures';
		simplifyWrap.appendChild(simplifyCb);
		simplifyWrap.appendChild(simplifyLabelText);
		controls.appendChild(simplifyWrap);

		// Key display pill
		const keyPill = document.createElement('span');
		keyPill.id = 'sheet-music-key-pill';
		keyPill.style.marginLeft = 'auto';
		keyPill.style.padding = '2px 8px';
		keyPill.style.borderRadius = '999px';
		keyPill.style.fontSize = '0.75rem';
		keyPill.style.border = '1px solid rgba(148,163,184,0.6)';
		keyPill.style.background = 'rgba(15,23,42,0.8)';
		keyPill.style.color = '#e5e7eb';
		keyPill.textContent = `${this.state.key} ${this.state.scale}`;
		controls.appendChild(keyPill);

		wrapper.appendChild(controls);

        // SVG host
        const svgHost = document.createElement('div');
        svgHost.className = 'sheet-music-svg-host';
        svgHost.style.background = '#faf9f6';
        svgHost.style.border = '2px solid #8b7355';
        svgHost.style.borderRadius = '4px';
        svgHost.style.padding = '12px';
        svgHost.style.minHeight = '120px';
        svgHost.style.overflowX = 'auto';
        svgHost.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

        wrapper.appendChild(svgHost);		this.container.appendChild(wrapper);
		this.controlsContainer = controls;
		this.svgContainer = svgHost;
	}

	render() {
		if (!this.svgContainer) return;
        this.svgContainer.innerHTML = '';

        const width = 600;
        const heightSingle = 100; // single staff height (increased for more traditional look)
        const gapBetweenStaves = 40;
        const heightGrand = heightSingle * 2 + gapBetweenStaves;
        const svgHeight = this.state.staffType === 'grand' ? heightGrand : heightSingle;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(svgHeight));
        svg.setAttribute('viewBox', `0 0 ${width} ${svgHeight}`);
        svg.style.display = 'block';
        svg.style.background = '#faf9f6'; // cream/parchment background for traditional look

        const staffLeft = 60; // increased left margin for key signature
        const staffRight = width - 20;
        const barCount = 4;
        const barWidth = (staffRight - staffLeft) / barCount;		const addLine = (x1, y1, x2, y2, opts = {}) => {
			const line = document.createElementNS(svgNS, 'line');
			line.setAttribute('x1', x1);
			line.setAttribute('y1', y1);
			line.setAttribute('x2', x2);
			line.setAttribute('y2', y2);
			line.setAttribute('stroke', opts.stroke || '#1a1a1a');
			line.setAttribute('stroke-width', opts['stroke-width'] || '1.2');
			svg.appendChild(line);
			return line;
		};

		// Helper to draw a 5‑line staff at a vertical offset
		const drawStaff = (topY, clef = 'treble') => {
			const spacing = 8; // distance between lines (increased for readability)
			for (let i = 0; i < 5; i++) {
				const y = topY + i * spacing;
				addLine(staffLeft, y, staffRight, y, { 'stroke-width': '1.2' });
			}

			// Bar lines F‑A‑C‑E vertically (4 bars)
			for (let b = 0; b <= barCount; b++) {
				const x = staffLeft + b * barWidth;
				const weight = (b === 0 || b === barCount) ? '2.5' : '1.2';
				addLine(x, topY, x, topY + 4 * spacing, { 'stroke-width': weight });
			}

			// Draw clef symbol
			const clefX = staffLeft + 10;
			if (clef === 'treble') {
				// Treble clef (𝄞): the swirl centers on G line (second from bottom = line 3 from top = topY + 3*spacing)
				const gLineY = topY + 3 * spacing;
				const clefSymbol = document.createElementNS(svgNS, 'text');
				clefSymbol.setAttribute('x', String(clefX));
				clefSymbol.setAttribute('y', String(gLineY - 2)); // slightly higher to center swirl on G line
				clefSymbol.setAttribute('font-size', '50');
				clefSymbol.setAttribute('font-family', 'Bravura, Georgia, serif');
				clefSymbol.setAttribute('fill', '#1a1a1a');
				clefSymbol.setAttribute('text-anchor', 'start');
				clefSymbol.setAttribute('dominant-baseline', 'middle');
				clefSymbol.textContent = '\u{1D11E}'; // 𝄞 treble clef
				svg.appendChild(clefSymbol);
			} else if (clef === 'bass') {
				// Bass clef (𝄢): dots surround F line (fourth from bottom = line 2 from top = topY + 2*spacing)
				const fLineY = topY + 2 * spacing;
				const clefSymbol = document.createElementNS(svgNS, 'text');
				clefSymbol.setAttribute('x', String(clefX - 2));
				clefSymbol.setAttribute('y', String(fLineY)); // center on F line
				clefSymbol.setAttribute('font-size', '40');
				clefSymbol.setAttribute('font-family', 'Bravura, Georgia, serif');
				clefSymbol.setAttribute('fill', '#1a1a1a');
				clefSymbol.setAttribute('text-anchor', 'start');
				clefSymbol.setAttribute('dominant-baseline', 'middle');
				clefSymbol.textContent = '\u{1D122}'; // 𝄢 bass clef
				svg.appendChild(clefSymbol);
			}

			return { topY, spacing, clef };
		};

	// Draw staff(s) based on staffType
	let treble = null;
	let bass = null;
	if (this.state.staffType === 'grand') {
		treble = drawStaff(20, 'treble');
		const bassTop = treble.topY + treble.spacing * 5 + gapBetweenStaves;
		bass = drawStaff(bassTop, 'bass');
		// Simple connecting brace
		addLine(staffLeft - 4, treble.topY, staffLeft - 4, bassTop + 4 * bass.spacing, { 'stroke-width': '2.5', 'stroke': '#1a1a1a' });
	} else if (this.state.staffType === 'bass') {
		bass = drawStaff(20, 'bass');
	} else {
		// default treble
		treble = drawStaff(20, 'treble');
	}

		// Determine the key signature AND scale-specific accidentals using
		// parent/relative major logic (so modes show the correct key signature)
		// and the same scaleNotes used by the Scale Circle Explorer.
		const getKeySignatureForScale = () => {
			if (!this.musicTheory || !this.musicTheory.keySignatures) return null;

			const key = this.state.key;
			const scaleId = this.state.scale;
			let scaleNotes = Array.isArray(this.state.scaleNotes) ? this.state.scaleNotes.slice() : [];

			// --- Fallback: compute scale notes if missing or too short ---
			// Prefer key-signature-aware spellings (flats in flat contexts, sharps in sharp contexts)
			if (scaleNotes.length < 5) {
				try {
					if (this.musicTheory.getScaleNotesWithKeySignature) {
						const computedKs = this.musicTheory.getScaleNotesWithKeySignature(key, scaleId);
						if (Array.isArray(computedKs) && computedKs.length >= 5) {
							scaleNotes = computedKs.slice();
						}
					}
					if (scaleNotes.length < 5 && this.musicTheory.getScaleNotes) {
						const computed = this.musicTheory.getScaleNotes(key, scaleId);
						if (Array.isArray(computed) && computed.length >= 5) {
							scaleNotes = computed.slice();
						}
					}
				} catch (e) { /* ignore */ }
			}

			// --- 1. Determine parent major key for the given tonic+scale ---

			// Helper: relative major (for natural minor / aeolian)
			const getRelativeMajor = (minorKey) => {
				const nv = this.musicTheory.noteValues || {};
				const val = nv[minorKey];
				if (val == null) return minorKey;
				const targetPc = (val + 3) % 12; // up a minor 3rd
				const majorKeysOrder = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
				for (const k of majorKeysOrder) {
					if (nv[k] != null && (nv[k] % 12) === targetPc) return k;
				}
				return minorKey;
			};

			// Helper: parent major for church modes (Ionian parent = tonic,
			// Dorian parent = a whole step below, etc.)
			const getParentMajorForMode = (tonic, modeId) => {
				const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
				const nv = this.musicTheory.noteValues || {};
				const tonicVal = nv[tonic];
				if (tonicVal == null) return null;

				// Major scale degree semitone distances from the parent tonic
				const majorDegSemis = [0, 2, 4, 5, 7, 9, 11];
				const modeIndex = {
					ionian: 0, major: 0,
					dorian: 1,
					phrygian: 2,
					lydian: 3,
					mixolydian: 4,
					aeolian: 5,
					locrian: 6
				}[modeId];
				if (modeIndex == null) return null;

				// tonic = parent + majorDegSemis[modeIndex]
				const parentPc = (tonicVal - majorDegSemis[modeIndex] + 12) % 12;

				for (const k of majorKeys) {
					if (nv[k] != null && (nv[k] % 12) === parentPc) {
						if (this.musicTheory.keySignatures[k]) return k;
					}
				}
				return null;
			};

			let parentKey = key; // default: tonic major

			// --- Simplify modal signatures: use parallel major/minor instead of relative major ---
			if (this.state.simplifyModalSignatures) {
				// For "dark" modes (minor-like), use parallel minor (relative major of tonic)
				// For "bright" modes, use parallel major (tonic major)
				if (scaleId === 'major' || scaleId === 'ionian') {
					parentKey = key;
				} else if (scaleId === 'minor' || scaleId === 'aeolian' || scaleId === 'harmonic' || scaleId === 'melodic') {
					parentKey = getRelativeMajor(key);
				} else if (['dorian', 'phrygian', 'locrian'].includes(scaleId)) {
					// Use parallel minor signature (e.g., C Locrian → C minor = Eb major signature)
					parentKey = getRelativeMajor(key);
				} else if (['lydian', 'mixolydian'].includes(scaleId)) {
					// Use parallel major signature (e.g., C Lydian → C major)
					parentKey = key;
				} else {
					// Other scales: default to tonic major
					parentKey = key;
				}
			} else {
				// Original relative-major logic (more complex for modes)
				if (scaleId === 'major' || scaleId === 'ionian') {
					parentKey = key;
				} else if (scaleId === 'minor' || scaleId === 'aeolian' || scaleId === 'harmonic' || scaleId === 'melodic') {
					parentKey = getRelativeMajor(key);
				} else if (['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'].includes(scaleId)) {
					parentKey = getParentMajorForMode(key, scaleId) || key;
				} else {
					parentKey = key;
				}
			}

			const baseSignature = this.musicTheory.keySignatures[parentKey] || { accidentals: [], type: 'natural' };

			// If we don't have explicit scale notes, return just the base signature
			if (!scaleNotes.length) {
				return {
					baseSignature,
					scaleAccidentals: []
				};
			}

			// --- 2. Compute colored accidentals by comparing parent key signature vs scaleNotes ---

			const enharmonics = {
				'C': ['C', 'B#', 'Dbb'],
				'C#': ['C#', 'Db', 'B##'],
				'Db': ['Db', 'C#', 'B##'],
				'D': ['D', 'C##', 'Ebb'],
				'D#': ['D#', 'Eb', 'Fbb'],
				'Eb': ['Eb', 'D#', 'Fbb'],
				'E': ['E', 'Fb', 'D##'],
				'Fb': ['Fb', 'E'],
				'F': ['F', 'E#', 'Gbb'],
				'F#': ['F#', 'Gb', 'E##'],
				'Gb': ['Gb', 'F#', 'E##'],
				'G': ['G', 'F##', 'Abb'],
				'G#': ['G#', 'Ab'],
				'Ab': ['Ab', 'G#'],
				'A': ['A', 'G##', 'Bbb'],
				'A#': ['A#', 'Bb', 'Cbb'],
				'Bb': ['Bb', 'A#', 'Cbb'],
				'B': ['B', 'Cb', 'A##'],
				'Cb': ['Cb', 'B', 'A##']
			};

			const getLetter = (note) => (note && note[0]) || '';
			const baseAccidentals = baseSignature.accidentals || [];
			const scaleAccidentals = [];

			['C', 'D', 'E', 'F', 'G', 'A', 'B'].forEach(letter => {
				const scaleNote = scaleNotes.find(n => getLetter(n) === letter);
				if (!scaleNote) return;

				const sigNote = baseAccidentals.find(acc => getLetter(acc) === letter) || letter;
				const sigOptions = enharmonics[sigNote] || [sigNote];

				if (sigOptions.includes(scaleNote)) return; // already covered by key signature

				if (!scaleAccidentals.includes(scaleNote)) {
					scaleAccidentals.push(scaleNote);
				}
			});

			// --- 3. Compute characteristic differences vs parallel major/minor ---
			const minorFamily = ['aeolian', 'minor', 'dorian', 'phrygian', 'locrian', 'harmonic', 'melodic'];
			const majorFamily = ['ionian', 'major', 'lydian', 'mixolydian'];

			let parallelBaseline = { accidentals: [], type: 'natural' };
			if (minorFamily.includes(scaleId)) {
				const relMaj = getRelativeMajor(key);
				parallelBaseline = this.musicTheory.keySignatures[relMaj] || parallelBaseline;
			} else if (majorFamily.includes(scaleId)) {
				parallelBaseline = this.musicTheory.keySignatures[key] || parallelBaseline;
			}

			const baseAccs = baseSignature.accidentals || [];
			const parAccs = parallelBaseline.accidentals || [];
			const setOf = (arr) => new Set(arr || []);
			const baseSet = setOf(baseAccs);
			const parSet = setOf(parAccs);

			const characteristicRecolors = baseAccs.filter(a => !parSet.has(a));
			const letterOf = (a) => (a && a[0]) || '';
			const characteristicNaturals = parAccs
				.filter(a => !baseSet.has(a))
				.map(letterOf)
				.filter((v, i, arr) => v && arr.indexOf(v) === i);

			return {
				baseSignature,
				scaleAccidentals,
				characteristic: {
					recolors: characteristicRecolors,
					naturals: characteristicNaturals
				}
			};
		};

        // Traditional key signature accidentals (per staff)
        const drawKeySignature = (staffMeta, clef = 'treble') => {
            const sigData = getKeySignatureForScale();
            if (!sigData) return;
            
            const baseAccidentals = (sigData.baseSignature && sigData.baseSignature.accidentals) || [];
            const scaleAccidentals = sigData.scaleAccidentals || [];
            const allAccidentals = [...baseAccidentals, ...scaleAccidentals];
            
            if (allAccidentals.length === 0) return;

            const sharpChar = '\u266F'; // ♯
            const flatChar = '\u266D';  // ♭
            const naturalChar = '\u266E'; // ♮
            const accSpacing = 7;
            const startX = staffLeft + 35; // Start key signature to the right of clef symbol

            // Staff step (0 = bottom line, 1 = first space, etc.) -> Y coordinate
            const yForStep = (step) => staffMeta.topY + 4 * staffMeta.spacing - step * (staffMeta.spacing / 2);

            // Standard positions per clef (adjusted for better visual alignment)
            // Treble clef: F#(top line), C#(3rd space), G#(above staff), D#(4th line), A#(above staff), E#(top space), B#(middle line)
            const trebleSharpSteps = { 'F#': 8, 'C#': 5, 'G#': 9, 'D#': 6, 'A#': 3, 'E#': 7, 'B#': 4 };
            const trebleFlatSteps  = { 'Bb': 4, 'Eb': 7, 'Ab': 3, 'Db': 6, 'Gb': 2, 'Cb': 5, 'Fb': 1 };
            // Bass clef: F#(4th line), C#(2nd space), G#(top line), D#(3rd line), A#(top space), E#(4th space), B#(2nd line)
            const bassSharpSteps   = { 'F#': 6, 'C#': 3, 'G#': 8, 'D#': 4, 'A#': 7, 'E#': 5, 'B#': 2 };
            const bassFlatSteps    = { 'Bb': 2, 'Eb': 5, 'Ab': 1, 'Db': 4, 'Gb': 0, 'Cb': 3, 'Fb': -1 };

            const isSharpSig = sigData.baseSignature && sigData.baseSignature.type === 'sharp';
            const stepMap = clef === 'bass'
                ? (isSharpSig ? bassSharpSteps : bassFlatSteps)
                : (isSharpSig ? trebleSharpSteps : trebleFlatSteps);

            allAccidentals.forEach((acc, i) => {
                const step = stepMap[acc];
                if (typeof step !== 'number') return;
                const x = startX + i * accSpacing;
                const y = yForStep(step);

                // Determine if this is a base signature accidental or scale-specific
                const isBaseAccidental = baseAccidentals.includes(acc);
                const color = isBaseAccidental ? '#1a1a1a' : '#c2410c'; // Black for traditional, red-orange for scale-specific

                const t = document.createElementNS(svgNS, 'text');
                t.setAttribute('x', String(x));
				// Fine-grained vertical alignment per accidental (center glyph on its line/space)
				let yOffset;
				if (acc.includes('#')) {
					// Default sharp baseline
					yOffset = 4.5;
					// Special case: F# on treble clef top line tends to sit slightly low; nudge it up
					if (clef === 'treble' && acc === 'F#') {
						// Reduce offset so the vertical center of the sharp spans the line evenly
						yOffset = 3.9;
					}
				} else if (acc.includes('b')) {
					// Flats sit a bit higher visually; keep existing offset
					yOffset = 3.5;
				} else {
					// Naturals slightly different baseline
					yOffset = 3.2;
				}
                t.setAttribute('y', String(y + yOffset));
                t.setAttribute('fill', color);
                t.setAttribute('font-size', '16');
                t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
                t.setAttribute('text-anchor', 'middle');
                t.textContent = acc.includes('#') ? sharpChar : (acc.includes('b') ? flatChar : naturalChar);
                svg.appendChild(t);
            });

			// Overlay: recolor characteristic accidentals inside the signature (e.g., Db in C Phrygian)
			if (sigData.characteristic && sigData.characteristic.recolors && sigData.characteristic.recolors.length) {
				const overlayColor = '#0ea5e9';
				sigData.characteristic.recolors.forEach((acc) => {
					const step = stepMap[acc];
					if (typeof step !== 'number') return;
					const i = baseAccidentals.indexOf(acc);
					if (i < 0) return; // only recolor those drawn as part of base signature
					const x = startX + i * accSpacing;
					const y = yForStep(step);

					const t = document.createElementNS(svgNS, 'text');
					t.setAttribute('x', String(x));
					let yOffset;
					if (acc.includes('#')) {
						yOffset = 4.5;
						if (clef === 'treble' && acc === 'F#') yOffset = 3.9;
					} else if (acc.includes('b')) {
						yOffset = 3.5;
					} else {
						yOffset = 3.2;
					}
					t.setAttribute('y', String(y + yOffset));
					t.setAttribute('fill', overlayColor);
					t.setAttribute('font-size', '16');
					t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
					t.setAttribute('text-anchor', 'middle');
					t.textContent = acc.includes('#') ? sharpChar : (acc.includes('b') ? flatChar : naturalChar);
					svg.appendChild(t);
				});
			}

			// Overlay: draw colored natural signs for letters flattened in parallel minor but natural in this mode (e.g., A♮ in C Dorian)
			if (sigData.characteristic && sigData.characteristic.naturals && sigData.characteristic.naturals.length) {
				const overlayColor = '#0ea5e9';
				const letterToStep = (letter) => {
					const sharpKey = `${letter}#`;
					const flatKey = `${letter}b`;
					let step = stepMap[sharpKey];
					if (typeof step !== 'number') step = stepMap[flatKey];
					return step;
				};
				sigData.characteristic.naturals.forEach((letter, idx) => {
					const step = letterToStep(letter);
					if (typeof step !== 'number') return;
					const i = allAccidentals.length + idx; // place after existing symbols
					const x = startX + i * accSpacing;
					const y = yForStep(step);

					const t = document.createElementNS(svgNS, 'text');
					t.setAttribute('x', String(x));
					// Slightly different vertical baseline to better center the natural glyph on the line/space
					t.setAttribute('y', String(y + 2.2));
					t.setAttribute('fill', overlayColor);
					t.setAttribute('font-size', '16');
					t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
					t.setAttribute('text-anchor', 'middle');
					t.setAttribute('dominant-baseline', 'middle');
					t.textContent = naturalChar;
					svg.appendChild(t);
				});
			}
		};		// Draw key signatures
		if (this.state.showKeySignature) {
			if (treble) drawKeySignature(treble, 'treble');
			if (bass) drawKeySignature(bass, 'bass');
		}

        // Small key/scale text label (for context)
        const keyText = document.createElementNS(svgNS, 'text');
        keyText.setAttribute('x', String(4));
	keyText.setAttribute('y', String((treble ? treble.topY : bass.topY) - 4));
        keyText.setAttribute('fill', '#666');
        keyText.setAttribute('font-size', '10');
        keyText.setAttribute('font-style', 'italic');
        keyText.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
        keyText.textContent = `${this.state.key} ${this.state.scale}`;
        svg.appendChild(keyText);		// Decide which chords to show
		const chordsToShow = [];
		if (this.state.barMode === 'single') {
			if (this.state.currentChord) {
				chordsToShow.push(this.state.currentChord);
			}
		} else {
			chordsToShow.push(...this.state.barChords.slice(-barCount));
		}

		// Helper to convert chord notes to key-signature-aware spelling
		const convertToKeySignatureSpelling = (noteName) => {
			if (!this.musicTheory || !this.musicTheory.noteValues) return noteName;
			
			const noteVal = this.musicTheory.noteValues[noteName];
			if (noteVal == null) return noteName;
			
			// Get the key signature info
			const sigData = getKeySignatureForScale();
			if (!sigData || !sigData.baseSignature) return noteName;
			
			const keySig = sigData.baseSignature;
			const letter = noteName.charAt(0).toUpperCase();
			
			// Check if this letter has an accidental in the key signature
			const sigAccidental = keySig.accidentals && keySig.accidentals.find(acc => acc.charAt(0) === letter);
			
			// If we have a key signature accidental for this letter, check if the note matches
			if (sigAccidental) {
				const sigVal = this.musicTheory.noteValues[sigAccidental];
				if (sigVal != null && (sigVal % 12) === (noteVal % 12)) {
					return sigAccidental; // Use the key signature spelling
				}
			}
			
			// If not in key signature, prefer sharp/flat based on key type
			const enharmonics = Object.entries(this.musicTheory.noteValues)
				.filter(([note, val]) => (val % 12) === (noteVal % 12))
				.map(([note]) => note);
			
			if (enharmonics.length === 1) return enharmonics[0];
			
			// Prefer based on key signature type
			if (keySig.type === 'sharp') {
				const sharpNote = enharmonics.find(n => n.includes('#'));
				if (sharpNote) return sharpNote;
			} else if (keySig.type === 'flat') {
				const flatNote = enharmonics.find(n => n.includes('b'));
				if (flatNote) return flatNote;
			}
			
			// Prefer natural if available
			const naturalNote = enharmonics.find(n => !n.includes('#') && !n.includes('b'));
			if (naturalNote) return naturalNote;
			
			return noteName; // fallback
		};

		// Voice a chord in close position: ensure ascending stack by raising notes by octaves as needed
		const voiceChordClose = (notesNoOctave, clef, octaveOffset) => {
			const baseOct = clef === 'bass' ? 3 : 4;
			const targetBase = baseOct + octaveOffset;
			const voiced = [];
			let prevMidi = null;
			notesNoOctave.forEach(n => {
				let oct = targetBase;
				let midi = noteNameToMidi(n + oct);
				// Raise by octaves until strictly above previous note to maintain stacked thirds
				while (prevMidi != null && midi <= prevMidi) {
					oct += 1;
					midi = noteNameToMidi(n + oct);
				}
				voiced.push(n + oct);
				prevMidi = midi;
			});
			return voiced;
		};

		// Convert note name to staff position with proper octave handling
		const noteToStaffPosition = (noteName, clef = 'treble') => {
			// Extract letter and octave from note (e.g., "D4" -> "D", 4)
			const match = noteName.match(/^([A-G][#b]?)(\d+)?$/);
			if (!match) return 0;
			
			const letter = match[1].charAt(0).toUpperCase();
			const octave = match[2] ? parseInt(match[2]) : (clef === 'bass' ? 3 : 4);
			
			// Map note letters to their position within an octave (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
			const noteOrder = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
			const noteIndex = noteOrder[letter] || 0;
			
			if (clef === 'treble') {
				// Treble clef reference: E4 = 0 (bottom line)
				const referenceOctave = 4;
				const referenceIndex = 2; // E
				const referencePosition = 0;
				
				const octaveOffset = octave - referenceOctave;
				const relativeIndex = noteIndex - referenceIndex;
				const totalOffset = relativeIndex + (octaveOffset * 7);
				
				return referencePosition + totalOffset * 0.5;
			} else {
				// Bass clef reference: G2 = 0 (bottom line)
				const referenceOctave = 2;
				const referenceIndex = 4; // G
				const referencePosition = 0;
				
				const octaveOffset = octave - referenceOctave;
				const relativeIndex = noteIndex - referenceIndex;
				const totalOffset = relativeIndex + (octaveOffset * 7);
				
				return referencePosition + totalOffset * 0.5;
			}
		};

		// Map staff position to Y coordinate
		const staffPositionToY = (position, staffMeta) => {
			// position 0 = bottom line, position 4 = top line
			// Each full step (line to line) = 2 * spacing, each half step (line to space) = spacing
			return staffMeta.topY + 4 * staffMeta.spacing - position * staffMeta.spacing;
		};

		// Enhanced note to MIDI conversion with octave detection
		const noteNameToMidi = (noteName) => {
			const noteMap = {
				'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
			};
			
			const letter = noteName.charAt(0).toUpperCase();
			let octave = 4; // Default octave
			let accidental = 0;
			
			// Extract octave if present
			const octaveMatch = noteName.match(/\d+/);
			if (octaveMatch) {
				octave = parseInt(octaveMatch[0]);
			}
			
			// Handle accidentals
			if (noteName.includes('#')) accidental = 1;
			if (noteName.includes('b')) accidental = -1;
			
			const basePitch = noteMap[letter] || 0;
			return (octave + 1) * 12 + basePitch + accidental;
		};

        // Helper function to draw ledger lines for notes outside the staff
		const drawLedgerLines = (svg, noteX, noteY, staffPosition, staffMeta, noteRadius) => {
			const lineLength = noteRadius * 2.5;
			const spacing = staffMeta.spacing;

			// Helper: draw a single ledger line at a given line index (integer positions only)
			const drawLineAt = (lineIndex) => {
				const y = staffMeta.topY + 4 * spacing - lineIndex * spacing;
				const line = document.createElementNS(svgNS, 'line');
				line.setAttribute('x1', String(noteX - lineLength));
				line.setAttribute('y1', String(y));
				line.setAttribute('x2', String(noteX + lineLength));
				line.setAttribute('y2', String(y));
				line.setAttribute('stroke', '#1a1a1a');
				line.setAttribute('stroke-width', '1.2');
				svg.appendChild(line);
			};

			// Below the staff: draw lines at -1, -2, -3, ... down to the nearest required line
			if (staffPosition < -0.5) {
				const endLine = Math.min(-1, Math.ceil(staffPosition)); // never draw the existing bottom line (0)
				for (let lineIdx = -1; lineIdx >= endLine; lineIdx -= 1) {
					drawLineAt(lineIdx);
				}
			}

			// Above the staff: draw lines at 5, 6, 7, ... up to the nearest required line
			if (staffPosition > 4.5) {
				const endLine = Math.max(5, Math.floor(staffPosition)); // start just above the top line (4)
				for (let lineIdx = 5; lineIdx <= endLine; lineIdx += 1) {
					drawLineAt(lineIdx);
				}
			}
		};

		// Draw an accidental glyph to the left of a notehead based on the note spelling
		const drawAccidentalForNote = (svg, noteX, noteY, noteName, noteRadius) => {
			// Only draw for explicit sharps/flats in the note name (e.g., F#, Eb)
			const hasSharp = noteName.includes('#');
			const hasFlat = noteName.includes('b');
			if (!hasSharp && !hasFlat) return;

			const sharpChar = '\u266F'; // ♯
			const flatChar = '\u266D';  // ♭
			const accChar = hasSharp ? sharpChar : flatChar;

			const t = document.createElementNS(svgNS, 'text');
			// Place the accidental to the left of the notehead and align vertically
			// using SVG baseline alignment so sharps/flats center on the note Y.
			const accOffsetX = noteRadius * 2.6; // slightly increased spacing
			const x = noteX - accOffsetX;
			t.setAttribute('x', String(x));
			// Align glyph vertical center to the note's center
			t.setAttribute('y', String(noteY));
			t.setAttribute('fill', '#1a1a1a');
			t.setAttribute('font-size', '14');
			t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			// Place the glyph to the left of the notehead
			t.setAttribute('text-anchor', 'end');
			// Center the glyph vertically on the given Y coordinate
			t.setAttribute('dominant-baseline', 'middle');
			t.textContent = accChar;
			svg.appendChild(t);
		};

		// Split the voiced chord across grand staff: lower to bass, upper to treble
		const drawChordSplitAcrossGrand = (chord, barIndex, trebleMeta, bassMeta) => {
			if (!chord || !chord.chordNotes || !chord.chordNotes.length) return;

			let rawNotes = chord.chordNotes;
			if (chord.diatonicNotes && chord.diatonicNotes.length > 0) {
				rawNotes = chord.diatonicNotes;
			}
			const maxInv = Math.max(0, Math.min((rawNotes.length || 1) - 1, this.state.inversion || 0));
			const invNotes = rawNotes.length ? rawNotes.slice(maxInv).concat(rawNotes.slice(0, maxInv)) : rawNotes;
			const spelled = invNotes.map(n => convertToKeySignatureSpelling(n));
			// Voice relative to treble baseline so split around middle C feels natural
			const voiced = voiceChordClose(spelled, 'treble', this.state.octaveOffset);

			// Partition by middle C (MIDI 60). Lower -> bass, Higher/Equal -> treble
			const lower = [];
			const upper = [];
			voiced.forEach(n => {
				(noteNameToMidi(n) < 60 ? lower : upper).push(n);
			});
			// Do not force a note onto each staff. If all notes sit comfortably in one clef
			// (e.g., after large octave offsets), render them only on that clef to avoid excessive ledger lines.

			const xCenter = staffLeft + (barIndex + 0.5) * barWidth;
			// Slightly larger noteheads so internal letter labels fit legibly
			const radius = 6;

			// Label once (on treble)
			const text = document.createElementNS(svgNS, 'text');
			text.setAttribute('x', String(xCenter));
			text.setAttribute('y', String(trebleMeta.topY - 8));
			text.setAttribute('fill', '#1a1a1a');
			text.setAttribute('font-size', '12');
			text.setAttribute('font-weight', 'bold');
			text.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			text.setAttribute('text-anchor', 'middle');
			const invSuffix = this.state.inversion === 0 ? '' : (this.state.inversion === 1 ? ' (1st inv)' : (this.state.inversion === 2 ? ' (2nd inv)' : ' (3rd inv)'));
			text.textContent = (chord.fullName || `${chord.root || ''}${chord.chordType || ''}`) + invSuffix;
			svg.appendChild(text);

			const drawSet = (notesArr, staffMeta) => {
				notesArr.forEach((note, idx) => {
					const staffPosition = noteToStaffPosition(note, staffMeta.clef);
					const y = staffPositionToY(staffPosition, staffMeta);
					const x = xCenter + (idx - (notesArr.length - 1) / 2) * (radius * 2.2);
					const circle = document.createElementNS(svgNS, 'circle');
					circle.setAttribute('cx', String(x));
					circle.setAttribute('cy', String(y));
					circle.setAttribute('r', String(radius));
					circle.setAttribute('fill', '#1a1a1a');
					circle.setAttribute('stroke', '#1a1a1a');
					circle.setAttribute('stroke-width', '1.2');
					svg.appendChild(circle);

					// Draw the note letter (include accidental if present) inside the notehead
					// e.g. 'C4' -> 'C', 'F#3' -> 'F#'. This helps beginners read pitches quickly.
					const m = note.match(/^([A-G][#b]?)/);
					const noteLabel = m ? m[1] : note;
					const t = document.createElementNS(svgNS, 'text');
					t.setAttribute('x', String(x));
					t.setAttribute('y', String(y));
					t.setAttribute('fill', '#ffffff');
					t.setAttribute('font-size', '8');
					t.setAttribute('font-weight', '700');
					t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
					t.setAttribute('text-anchor', 'middle');
					t.setAttribute('dominant-baseline', 'middle');
					t.textContent = noteLabel;
					svg.appendChild(t);
					if (staffPosition < -0.5 || staffPosition > 4.5) {
						drawLedgerLines(svg, x, y, staffPosition, staffMeta, radius);
					}
				});
			};

			if (trebleMeta && upper.length) drawSet(upper, trebleMeta);
			if (bassMeta && lower.length) drawSet(lower, bassMeta);
		};

        const drawChordInBar = (chord, barIndex, staffMeta) => {
            if (!chord || !chord.chordNotes || !chord.chordNotes.length) return;
            
            // ALWAYS prefer diatonicNotes when available (preserves scale-based stacking)
            // Otherwise fall back to chordNotes from formula
            let rawNotes = chord.chordNotes;
            if (chord.diatonicNotes && chord.diatonicNotes.length > 0) {
                rawNotes = chord.diatonicNotes;
            }
            
			// Apply inversion by rotating the stack (keep musical order)
			const maxInv = Math.max(0, Math.min((rawNotes.length || 1) - 1, this.state.inversion || 0));
			const invNotes = rawNotes.length ? rawNotes.slice(maxInv).concat(rawNotes.slice(0, maxInv)) : rawNotes;
            
            // Apply key signature spelling to each note (without reordering)
			const notesWithSpelling = invNotes.map(note => convertToKeySignatureSpelling(note));
            
			// Assign octaves in close position so the stack is root→3rd→5th→7th vertically
			const notes = voiceChordClose(notesWithSpelling, staffMeta.clef, this.state.octaveOffset);
            
			const xCenter = staffLeft + (barIndex + 0.5) * barWidth;
			// Slightly larger noteheads to accommodate internal labels
			const radius = 6;

            // Draw chord name above bar
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', String(xCenter));
            text.setAttribute('y', String(staffMeta.topY - 8));
            text.setAttribute('fill', '#1a1a1a');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
            text.setAttribute('text-anchor', 'middle');
			const invSuffix = maxInv === 0 ? '' : (maxInv === 1 ? ' (1st inv)' : (maxInv === 2 ? ' (2nd inv)' : ' (3rd inv)'));
			text.textContent = (chord.fullName || `${chord.root || ''}${chord.chordType || ''}`) + invSuffix;
            svg.appendChild(text);

            // Keep notes in root position (as provided, not sorted)
            notes.forEach((note, idx) => {
                // Use staff-aware positioning (note already has octave number)
                const staffPosition = noteToStaffPosition(note, staffMeta.clef);
                const y = staffPositionToY(staffPosition, staffMeta);
                const x = xCenter + (idx - (notes.length - 1) / 2) * (radius * 2.2);
                
				const circle = document.createElementNS(svgNS, 'circle');
				circle.setAttribute('cx', String(x));
				circle.setAttribute('cy', String(y));
				circle.setAttribute('r', String(radius));
				circle.setAttribute('fill', '#1a1a1a');
				circle.setAttribute('stroke', '#1a1a1a');
				circle.setAttribute('stroke-width', '1.2');
				svg.appendChild(circle);

				// Draw note label inside head (letter + accidental if present)
				const m = note.match(/^([A-G][#b]?)/);
				const noteLabel = m ? m[1] : note;
				const tNote = document.createElementNS(svgNS, 'text');
				tNote.setAttribute('x', String(x));
				tNote.setAttribute('y', String(y));
				tNote.setAttribute('fill', '#ffffff');
				tNote.setAttribute('font-size', '8');
				tNote.setAttribute('font-weight', '700');
				tNote.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
				tNote.setAttribute('text-anchor', 'middle');
				tNote.setAttribute('dominant-baseline', 'middle');
				tNote.textContent = noteLabel;
				svg.appendChild(tNote);
                
                // Add ledger lines if needed (notes above/below staff)
                if (staffPosition < -0.5 || staffPosition > 4.5) {
                    drawLedgerLines(svg, x, y, staffPosition, staffMeta, radius);
                }
            });
        };		if (chordsToShow.length === 0) {
			const empty = document.createElementNS(svgNS, 'text');
			empty.setAttribute('x', String((staffLeft + staffRight) / 2));
			const emptyY = (treble ? treble.topY : bass.topY) + (treble ? treble.spacing : bass.spacing) * 2;
			empty.setAttribute('y', String(emptyY));
			empty.setAttribute('fill', '#999');
			empty.setAttribute('font-size', '11');
			empty.setAttribute('font-style', 'italic');
			empty.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			empty.setAttribute('text-anchor', 'middle');
			empty.textContent = 'Select a chord to see it on the staff';
			svg.appendChild(empty);
		} else {
			if (this.state.barMode === 'single') {
				if (this.state.staffType === 'grand' && treble && bass && this.state.splitAcrossGrand) {
					drawChordSplitAcrossGrand(chordsToShow[0], 1, treble, bass);
				} else {
					if (treble) drawChordInBar(chordsToShow[0], 1, treble);
					if (bass) drawChordInBar(chordsToShow[0], 1, bass);
				}
			} else {
				chordsToShow.forEach((chord, idx) => {
					const barIndex = barCount - chordsToShow.length + idx;
					if (this.state.staffType === 'grand' && treble && bass && this.state.splitAcrossGrand) {
						drawChordSplitAcrossGrand(chord, barIndex, treble, bass);
					} else {
						if (treble) drawChordInBar(chord, barIndex, treble);
						if (bass) drawChordInBar(chord, barIndex, bass);
					}
				});
			}
		}

		this.svgContainer.appendChild(svg);

		// Update key pill text
		const pill = this.controlsContainer && this.controlsContainer.querySelector('#sheet-music-key-pill');
		if (pill) pill.textContent = `${this.state.key} ${this.state.scale}`;
		
		// Update octave display
		const octaveDisplay = this.controlsContainer && this.controlsContainer.querySelector('#sheet-music-octave-display');
		if (octaveDisplay) {
			const sign = this.state.octaveOffset > 0 ? '+' : '';
			octaveDisplay.textContent = `${sign}${this.state.octaveOffset}`;
		}

		// Update split control visibility and disabled state
		const splitWrap = this.controlsContainer && this.controlsContainer.querySelector('#split-across-staves-control');
		const splitCb = this.controlsContainer && this.controlsContainer.querySelector('#split-across-staves-checkbox');
		if (splitWrap) {
			splitWrap.style.display = this.state.staffType === 'grand' ? 'flex' : 'none';
		}
		if (splitCb) {
			splitCb.disabled = this.state.staffType !== 'grand';
			splitCb.checked = !!this.state.splitAcrossGrand;
		}

		// Update key signature visibility checkbox
		const ksCb = this.controlsContainer && this.controlsContainer.querySelector('#show-key-signature-checkbox');
		if (ksCb) {
			ksCb.checked = !!this.state.showKeySignature;
		}

		// Update simplify modal signatures checkbox
		const simplifyCb = this.controlsContainer && this.controlsContainer.querySelector('#simplify-modal-signatures-checkbox');
		if (simplifyCb) {
			simplifyCb.checked = !!this.state.simplifyModalSignatures;
		}
	}
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
	module.exports = SheetMusicGenerator;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
	window.SheetMusicGenerator = SheetMusicGenerator;
}

