/**
 * @module SheetMusicGenerator
 * @description Live-rendering staff notation (treble or grand staff) with 4-bar display
 * @exports class SheetMusicGenerator
 * @feature Live-updates when key/scale changes
 * @feature Live-updates when highlighted chord degree changes
 * @feature Single staff (treble) or grand staff (treble + bass)
 * @feature 4-bar display with customizable layouts
 * @feature Automatic note placement and accidentals
 * @feature SVG-based lightweight rendering
 * @feature Integration with key/scale and chord selections
 */

class SheetMusicGenerator {
	constructor(musicTheory) {
		this.musicTheory = musicTheory;

		// Render scheduler to coalesce rapid state changes into a single paint
		this._renderPending = false;

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
			staffType: 'grand', // default to grand staff (treble + bass)
			/**
			 * Octave offset for chord voicing (-2 to +2)
			 */
			octaveOffset: 0,
			inversion: 0, // 0=root, 1=1st, 2=2nd, 3=3rd
			splitAcrossGrand: true,
			// Voicing options
			voiceLeading: false, // smooth voice leading between chords
			spreadVoicing: false, // spread notes across wider range
		// Lock Hands control hidden - feature not implemented; retained in state for future use
			doubleRoot: false, // double the root note
			// Harmonization mode (from Progression Builder)
			harmonizationMode: 'root', // 'root' | 'melody' | 'harmony'
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
			 * Optional per-bar scale degrees (numbers 1-7 or null for inserted chords)
			 * Aligns index-wise with barChords when barMode==='per-bar'
			 */
			barDegrees: [],
			/**
			 * Whether a chord is currently selected / focused
			 */
			hasSelection: false,
			/**
			 * If the current chord came from selecting a scale degree in the Chord Explorer,
			 * remember that degree so we can recompute the chord when the scale changes.
			 */
			selectedDegree: null,
			currentChordLinkedToDegree: false,
			// Piano popup positioning preferences
			popupPinned: true, // when true, popup appears top-right of sheet area instead of near click
			popupAnchor: 'top-right', // future: 'top-right' | 'bottom-right' | 'floating'
			// Voicing selection additions
			voicingStyle: 'close', // default single style when auto disabled
			autoVoicingAll: false, // when true, pick from all styles automatically
			voicingLogic: 'smart', // 'smart' | 'smooth' | 'open' | 'jazz' | 'piano'
			// Voice leading intensity (0 = loose, 1 = ultra-smooth).
			// This acts as a continuous control over how heavily movement is
			// penalized vs. allowing wider, more varied voicings.
			vlIntensity: 0.5,
			// Voice leading mode: 'single' uses the chosen voicing style + inversions;
			// 'multi' will search multiple voicing styles + inversions to minimize movement
			voiceLeadingMode: 'single',
			// New system variant flag for VL Combos behavior
			vlCombosVariant: 'v2'
		};

		// Whether the SheetMusicGenerator should follow generated progressions
		// Enable following generated progressions by default so the Sheet Music
		// immediately reflects Progression Builder output on app startup.
		this.state.followGenerated = true;

		this.container = null;
		this.controlsContainer = null;
		this.svgContainer = null;
		
		// Voice leading state: track previous chord voicing
		this.previousVoicing = null; // array of MIDI note numbers from last chord
		
		// Refresh seed for intelligent voicing variation
		this.voicingRefreshSeed = 0;

		// Initialize the backing field for voiceLeadingMode BEFORE defining the property
		this._voiceLeadingMode = this.state.voiceLeadingMode || 'single';

		// Ensure VL Combos implies voiceLeading true for consistent behavior
		Object.defineProperty(this.state, 'voiceLeadingMode', {
			get: () => this._voiceLeadingMode || 'single',
			set: (val) => {
				this._voiceLeadingMode = (val === 'multi') ? 'multi' : 'single';
				if (this._voiceLeadingMode === 'multi') this.state.voiceLeading = true;
			}
		});
	}

	// --------------------------- Public API ---------------------------

	// Schedule a render on next animation frame (dedup multiple triggers)
	_scheduleRender() {
		if (this._renderPending) return;
		this._renderPending = true;
		try {
			requestAnimationFrame(() => {
				this._renderPending = false;
				this.render();
			});
		} catch (_) {
			// Fallback if RAF unavailable
			this._renderPending = false;
			this.render();
		}
	}

	mount(container) {
		if (typeof container === 'string') {
			container = document.querySelector(container);
		}
		if (!container) return;
		this.container = container;
		this._renderShell();
		this._scheduleRender();
	}

	setKeyAndScale(key, scale, notes) {
		this.state.key = key || this.state.key;
		this.state.scale = scale || this.state.scale;
		// Always keep scale notes populated to avoid empty snapshots
		if (Array.isArray(notes) && notes.length) {
			this.state.scaleNotes = notes.slice();
		} else {
			try {
				if (this.musicTheory && typeof this.musicTheory.getScaleNotesWithKeySignature === 'function') {
					const ksNotes = this.musicTheory.getScaleNotesWithKeySignature(this.state.key, this.state.scale) || [];
					if (ksNotes.length) this.state.scaleNotes = ksNotes.slice();
				} else if (this.musicTheory && typeof this.musicTheory.getScaleNotes === 'function') {
					const rawNotes = this.musicTheory.getScaleNotes(this.state.key, this.state.scale) || [];
					if (rawNotes.length) this.state.scaleNotes = rawNotes.slice();
				}
			} catch(_) {}
		}
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
		this._scheduleRender();
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
			// Append without truncation; dynamic measure expansion will display all
			this.state.barChords.push(chord);
		}
		this._scheduleRender();
	}

	setBarMode(mode) {
		if (mode !== 'single' && mode !== 'per-bar') return;
		this.state.barMode = mode;
		this._scheduleRender();
	}

	setStaffType(type) {
		if (type !== 'treble' && type !== 'bass' && type !== 'grand') return;
		this.state.staffType = type;
		this._scheduleRender();
	}

	/**
	 * Replace the bar chords shown in per-bar mode.
	 * chords: array of chord objects { root, chordType, chordNotes, fullName }
	 * This method will set the internal state and trigger a re-render.
	 */
	setBarChords(chords) {
		if (!Array.isArray(chords)) chords = [];
		// Dedupe: if incoming sequence is identical to current, skip work/logging
		const sameLength = this.state.barChords && this.state.barChords.length === chords.length;
		let isSame = sameLength;
		if (sameLength) {
			for (let i = 0; i < chords.length; i++) {
				const a = this.state.barChords[i] || {};
				const b = chords[i] || {};
				if ((a.root||'') !== (b.root||'') || (a.chordType||'') !== (b.chordType||'') || (a.fullName||'') !== (b.fullName||'')) { isSame = false; break; }
			}
		}
		if (isSame) {
			return; // no-op
		}

		// Do NOT alter incoming chord functions. Trust explorer/manual-numbers.
		// Only shallow-copy so external callers can't mutate internal state.
		this.state.barChords = chords.map(c => c ? { ...c } : c);
		try {
			console.log('[Sheet] setBarChords input', this.state.barChords.map(c => ({ root: c.root, chordType: c.chordType })));
		} catch(_) {}
		// Aggregate one-shot debug snapshot for everything currently on the sheet
		try {
			const nv = (this.musicTheory && this.musicTheory.noteValues) || {};
			const bars = this.state.barChords.map((c, idx) => {
				let notes = Array.isArray(c && c.chordNotes) ? c.chordNotes.slice() : [];
				if ((!notes || notes.length === 0) && this.musicTheory && typeof this.musicTheory.getChordNotes === 'function') {
					try { notes = this.musicTheory.getChordNotes(c.root, c.chordType) || []; } catch(_) { notes = []; }
				}
				let intervals = [];
				try {
					const rv = nv[c.root];
					if (rv != null) {
						const set = new Set();
						intervals = notes
							.map(n => (nv[n] != null ? (nv[n] - rv + 12) % 12 : null))
							.filter(v => v != null && !set.has(v) && set.add(v));
					}
				} catch(_) { intervals = []; }
				let classified = null;
				try {
					if (this.musicTheory && typeof this.musicTheory.classifyChordTypeFromNotes === 'function') {
						classified = this.musicTheory.classifyChordTypeFromNotes(c.root, notes);
					}
				} catch(_) { classified = null; }
				return {
					index: idx,
					degree: Array.isArray(this.state.barDegrees) ? this.state.barDegrees[idx] : null,
					root: c && c.root,
					chordType: c && c.chordType,
					fullName: c && c.fullName,
					notes,
					intervals,
					classified
				};
			});
			// Ensure scaleNotes are populated for the snapshot, even if upstream order races
			let snapScaleNotes = Array.isArray(this.state.scaleNotes) ? this.state.scaleNotes.slice() : [];
			if (!snapScaleNotes.length && this.musicTheory) {
				try {
					if (typeof this.musicTheory.getScaleNotesWithKeySignature === 'function') {
						snapScaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.state.key, this.state.scale) || [];
					}
					if ((!snapScaleNotes || !snapScaleNotes.length) && typeof this.musicTheory.getScaleNotes === 'function') {
						snapScaleNotes = this.musicTheory.getScaleNotes(this.state.key, this.state.scale) || [];
					}
				} catch(_) { /* ignore */ }
			}
			const snapshot = {
				key: this.state.key,
				scale: this.state.scale,
				scaleNotes: Array.isArray(snapScaleNotes) ? snapScaleNotes.slice() : [],
				harmonizationMode: this.state.harmonizationMode,
				bars
			};
			// Store globally for easy copying from console
			try { window.__lastSheetSnapshot = snapshot; } catch(_) {}
			// Throttle noisy console: only print when content actually changes
			console.log('[Sheet][DEBUG aggregate]', snapshot);
			if (!window.__sheetDebugTipShown) {
				console.log('[Sheet][DEBUG] Tip: run copy(window.__lastSheetSnapshot) to copy full snapshot');
				try { window.__sheetDebugTipShown = true; } catch(_) {}
			}
		} catch(_) {}
		// Log per-bar harmonization attempt so we can trace mapping decisions
		try {
			if (!window.__interactionLog) window.__interactionLog = [];
			const inputBarChords = this.state.barChords.map(c => ({ root: c && c.root, chordType: c && c.chordType, fullName: c && c.fullName }));
			window.__interactionLog.push({
				type: 'setBarChordsCalled',
				details: {
					caller: 'setBarChords',
					inputBarChords,
					harmonizationMode: this.state.harmonizationMode,
					barDegrees: Array.isArray(this.state.barDegrees) ? this.state.barDegrees.slice() : null
				},
				timestamp: new Date().toISOString()
			});
		} catch (e) { /* non-fatal */ }
		// If caller hasn't already set per-bar mode, prefer to keep current mode.
		// Render to reflect the new bar chords immediately.
		this._scheduleRender();
	}

	/**
	 * Replace the per-bar degrees shown in per-bar mode. Used to drive melody/harmony voicing.
	 * degrees: array of numbers (1-7) or null, aligned to barChords indices
	 */
	setBarDegrees(degrees) {
		if (!Array.isArray(degrees)) degrees = [];
		// Dedupe degrees to avoid back-to-back renders
		const prev = Array.isArray(this.state.barDegrees) ? this.state.barDegrees : [];
		const same = prev.length === degrees.length && prev.every((v,i)=>v===degrees[i]);
		if (!same) {
			this.state.barDegrees = degrees.slice();
			this._scheduleRender();
		}
	}

	/**
	 * Set harmonization mode (from Progression Builder)
	 */
	setHarmonizationMode(mode) {
		if (['root', 'melody', 'harmony'].includes(mode)) {
			this.state.harmonizationMode = mode;
			// Reset voice-leading continuity when harmonization mode changes
			this.previousVoicing = null;
			this._scheduleRender();
		}
	}

	// ------------------------- Internal render ------------------------

	_renderShell() {
		this.container.innerHTML = '';

		// Create a container that holds both the main wrapper and the voicing panel
		const outerContainer = document.createElement('div');
		outerContainer.style.display = 'flex';
		outerContainer.style.gap = '8px';
		outerContainer.style.position = 'relative';

		const wrapper = document.createElement('div');
		wrapper.className = 'sheet-music-module';
		wrapper.style.display = 'flex';
		wrapper.style.flexDirection = 'column';
		wrapper.style.gap = '8px';
		wrapper.style.flex = '1';
		wrapper.style.background = 'var(--bg-panel, #27272a)';
		wrapper.style.padding = '12px';
		wrapper.style.borderRadius = '4px';
		wrapper.style.border = '1px solid rgba(255,255,255,0.1)';

		// Controls row
		const controls = document.createElement('div');
		controls.className = 'sheet-music-controls';
		controls.style.display = 'flex';
		controls.style.flexWrap = 'wrap';
		controls.style.gap = '8px';
		controls.style.alignItems = 'center';

		const title = document.createElement('div');
		title.textContent = 'Sheet Music';
		title.style.fontSize = '0.95rem';
		title.style.fontWeight = '700';
		title.style.color = '#ffffff';
		controls.appendChild(title);

		// Staff type select
		const staffLabel = document.createElement('label');
		staffLabel.textContent = 'Staff:';
		staffLabel.style.fontSize = '0.8rem';
		staffLabel.style.color = '#f9fafb';
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
		modeLabel.style.color = '#f9fafb';
		const modeSelect = document.createElement('select');
		modeSelect.innerHTML = `
			<option value="single">Current chord only</option>
			<option value="per-bar">One chord per bar (dynamic)</option>
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
		followLabelText.style.color = '#f9fafb';
		followWrap.appendChild(followCb);
		followWrap.appendChild(followLabelText);
		controls.appendChild(followWrap);

		// Inversion select
		const invLabel = document.createElement('label');
		invLabel.textContent = 'Inversion:';
		invLabel.style.fontSize = '0.8rem';
		invLabel.style.color = '#f9fafb';
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
			// Reset voice leading state when inversion changes
			this.previousVoicing = null;
			this._scheduleRender();
		});
		invLabel.appendChild(invSelect);
		controls.appendChild(invLabel);

		// Playback & MIDI controls wrapper
		const midiWrap = document.createElement('div');
		midiWrap.style.display = 'flex';
		midiWrap.style.alignItems = 'center';
		midiWrap.style.gap = '6px';
		midiWrap.style.marginLeft = '12px';
		midiWrap.style.fontSize = '0.7rem';

		// (MIDI output selection moved to server HTML UI; frontend no longer lists outputs)
		
		// BPM Control
		const bpmWrap = document.createElement('div');
		bpmWrap.style.display = 'flex';
		bpmWrap.style.alignItems = 'center';
		bpmWrap.style.gap = '6px';
		
		const bpmLabel = document.createElement('label');
		bpmLabel.textContent = 'BPM:';
		bpmLabel.style.fontSize = '0.7rem';
		bpmLabel.style.color = '#38bdf8';
		bpmLabel.style.fontWeight = '600';
		
		const bpmInput = document.createElement('input');
		bpmInput.type = 'number';
		bpmInput.min = '40';
		bpmInput.max = '240';
		bpmInput.value = '120';
		bpmInput.style.width = '50px';
		bpmInput.style.fontSize = '0.7rem';
		bpmInput.style.padding = '2px 4px';
		bpmInput.style.background = 'rgba(15, 23, 42, 0.8)';
		bpmInput.style.border = '1px solid #334155';
		bpmInput.style.borderRadius = '3px';
		bpmInput.style.color = '#e5e7eb';
		bpmInput.style.textAlign = 'center';
		
		const bpmSlider = document.createElement('input');
		bpmSlider.type = 'range';
		bpmSlider.min = '40';
		bpmSlider.max = '240';
		bpmSlider.value = '120';
		bpmSlider.style.width = '100px';
		bpmSlider.style.accentColor = '#38bdf8';
		
		// Sync slider and input
		bpmInput.addEventListener('input', (e) => {
			let val = parseInt(e.target.value, 10);
			if (isNaN(val)) val = 120;
			if (val < 40) val = 40;
			if (val > 240) val = 240;
			bpmSlider.value = val;
		});
		bpmSlider.addEventListener('input', (e) => {
			bpmInput.value = e.target.value;
		});
		
		bpmWrap.appendChild(bpmLabel);
		bpmWrap.appendChild(bpmInput);
		bpmWrap.appendChild(bpmSlider);
		
		const playBtn = document.createElement('button');
		playBtn.textContent = '▶ Play';
		playBtn.style.fontSize = '0.7rem';
		playBtn.style.padding = '2px 8px';
		playBtn.style.color = '#f9fafb';
		playBtn.style.background = '#1e293b';
		playBtn.style.border = '1px solid #64748b';
		playBtn.style.borderRadius = '3px';
		playBtn.style.cursor = 'pointer';
		playBtn.addEventListener('click', () => {
			try { 
				const tempo = parseInt(bpmInput.value, 10) || 120;
				this.playMidiFromRendered({ tempo }); 
			} catch(e){ console.warn(e); }
		});
		const stopBtn = document.createElement('button');
		stopBtn.textContent = '■ Stop';
		stopBtn.style.fontSize = '0.7rem';
		stopBtn.style.padding = '2px 8px';
		stopBtn.style.color = '#f9fafb';
		stopBtn.style.background = '#1e293b';
		stopBtn.style.border = '1px solid #64748b';
		stopBtn.style.borderRadius = '3px';
		stopBtn.style.cursor = 'pointer';
		stopBtn.addEventListener('click', () => {
			try { this.stopMidiPlayback(); } catch(e){ console.warn(e); }
		});
		// Send progression to external Bitwig MIDI server if available
		const bitwigBtn = document.createElement('button');
		bitwigBtn.id = 'send-bitwig-btn';
		bitwigBtn.textContent = '⇄ Send → Bitwig';
		bitwigBtn.style.fontSize = '0.7rem';
		bitwigBtn.style.padding = '2px 8px';
		bitwigBtn.style.whiteSpace = 'nowrap';
		bitwigBtn.addEventListener('click', async () => {
			const origText = bitwigBtn.textContent;
			try {
				bitwigBtn.textContent = '⏳ Sending...';
				bitwigBtn.disabled = true;
				const tempo = parseInt(bpmInput.value, 10) || 120;
				const result = await this.sendProgressionToBitwig({ bpm: tempo });
				if (result && result.ok) {
					bitwigBtn.textContent = '✓ Sent!';
					setTimeout(() => { bitwigBtn.textContent = origText; bitwigBtn.disabled = false; }, 1500);
				} else {
					bitwigBtn.textContent = '✗ Failed';
					setTimeout(() => { bitwigBtn.textContent = origText; bitwigBtn.disabled = false; }, 2000);
					const reason = result && result.reason ? result.reason : 'unknown';
					alert(`Failed to send to Bitwig: ${reason}\n\nMake sure:\n1. Server is running: python tools/bitwig_midi_server.py\n2. loopMIDI port exists\n3. Check browser console for details`);
				}
			} catch(e) {
				console.error('Bitwig send error:', e);
				bitwigBtn.textContent = '✗ Error';
				setTimeout(() => { bitwigBtn.textContent = origText; bitwigBtn.disabled = false; }, 2000);
				alert(`Error sending to Bitwig: ${e.message}\n\nMake sure:\n1. Server is running: python tools/bitwig_midi_server.py\n2. loopMIDI port exists\n3. Check browser console for details`);
			}
		});
		const saveBtn = document.createElement('button');
		saveBtn.textContent = '💾 Save MIDI';
		saveBtn.style.fontSize = '0.7rem';
		saveBtn.style.padding = '2px 8px';
		saveBtn.addEventListener('click', () => {
			try { this.saveMidiFile(); } catch(e){ console.warn(e); }
		});
		midiWrap.appendChild(bpmWrap);
		midiWrap.appendChild(playBtn);
		midiWrap.appendChild(stopBtn);
		midiWrap.appendChild(bitwigBtn);
		midiWrap.appendChild(saveBtn);

		// Quick copy of compact sheet log
		const copyLogBtn = document.createElement('button');
		copyLogBtn.textContent = '📋 Copy Sheet Log';
		copyLogBtn.style.fontSize = '0.7rem';
		copyLogBtn.style.padding = '2px 8px';
		copyLogBtn.title = 'Copy a compact per-bar sheet summary to clipboard';
		copyLogBtn.addEventListener('click', async () => {
			try {
				const txt = this._buildCompactSheetLog();
				await this._copyToClipboard(txt);
				console.log('[Sheet] Compact log copied to clipboard:\n' + txt);
				try { this._toast('Sheet log copied'); } catch(_) {}
			} catch (e) {
				alert('Failed to copy sheet log. See console.');
				console.warn('[Sheet] Copy Sheet Log failed', e);
			}
		});
		midiWrap.appendChild(copyLogBtn);
		// Removed outputSelect & refreshBtn (server now handles selection)
		controls.appendChild(midiWrap);

		// Voicing style select (Unified: Logic + Manual styles)
		const voicLabel = document.createElement('label');
		voicLabel.textContent = 'Voicing:';
		voicLabel.style.fontSize = '0.8rem';
		const voicSelect = document.createElement('select');
		voicSelect.style.fontSize = '0.8rem';
		
		// Populate with OptGroups
		voicSelect.innerHTML = `
			<optgroup label="Intelligent Logic (Auto)">
				<option value="smart">Smart (Balanced)</option>
				<option value="smooth">Smooth (Minimal Movement)</option>
				<option value="open">Open (Wide)</option>
				<option value="jazz">Jazz (Color/Extensions)</option>
				<option value="piano">Piano (Playable)</option>
			</optgroup>
			<optgroup label="Manual Styles">
				<option value="close">Close position</option>
				<option value="open">Open voicing</option>
				<option value="drop2">Drop 2</option>
				<option value="drop3">Drop 3</option>
				<option value="drop2+4">Drop 2+4</option>
				<option value="drop3+5">Drop 3+5</option>
				<option value="spread">Spread voicing</option>
				<option value="shell">Shell voicing (root/3rd/7th)</option>
				<option value="shell-no3">Shell 1-2-5 (3rd down octave)</option>
				<option value="shell-high3">Shell 1-5-3 (3rd up octave)</option>
				<option value="quartal">Quartal voicing</option>
				<option value="quintal">Quintal voicing</option>
				<option value="cluster">Cluster (tight)</option>
				<option value="gospel-shell">Gospel shell</option>
				<option value="gospel-cluster">Gospel cluster</option>
				<option value="jazz-rootless">Jazz rootless</option>
				<option value="classical-balanced">Classical balanced</option>
				<option value="add-tensions">Add tensions (9/11/13)</option>
			</optgroup>
		`;

		// Set initial value based on state
		if (this.state.autoVoicingAll) {
			voicSelect.value = this.state.voicingLogic || 'smart';
		} else {
			voicSelect.value = this.state.voicingStyle || 'close';
		}

		// Refresh button (only active for Intelligent Logic)
		const refreshBtn = document.createElement('button');
		refreshBtn.textContent = '↻';
		refreshBtn.title = 'Regenerate voicings (Resets voice leading history)';
		refreshBtn.style.marginLeft = '4px';
		refreshBtn.style.padding = '1px 6px';
		refreshBtn.style.fontSize = '0.8rem';
		refreshBtn.style.cursor = 'pointer';
		refreshBtn.style.borderRadius = '4px';
		refreshBtn.style.border = '1px solid #475569';
		refreshBtn.style.background = '#1e293b';
		refreshBtn.style.color = '#e2e8f0';
		
		const updateRefreshState = () => {
			refreshBtn.disabled = !this.state.autoVoicingAll;
			refreshBtn.style.opacity = this.state.autoVoicingAll ? '1' : '0.5';
		};
		updateRefreshState();

		voicSelect.addEventListener('change', () => {
			const val = voicSelect.value;
			const logicOptions = ['smart', 'smooth', 'open', 'jazz', 'piano']; // must match values in first optgroup
			
			if (logicOptions.includes(val)) {
				this.state.autoVoicingAll = true;
				this.state.voicingLogic = val;
			} else {
				this.state.autoVoicingAll = false;
				this.state.voicingStyle = val;
			}
			
			updateRefreshState();
			this.previousVoicing = null;
			this.render();
		});
		
		refreshBtn.addEventListener('click', () => {
			if (this.state.autoVoicingAll) {
				this.previousVoicing = null; // reset to let new logic influence from scratch
				this.voicingRefreshSeed = Math.random(); // add variation seed
				this.render();
				// Visual feedback
				refreshBtn.style.transition = 'transform 0.4s ease';
				refreshBtn.style.transform = 'rotate(360deg)';
				setTimeout(() => {
					refreshBtn.style.transition = 'none';
					refreshBtn.style.transform = 'rotate(0deg)';
				}, 400);
			}
		});
		
		voicLabel.appendChild(voicSelect);
		voicLabel.appendChild(refreshBtn);
		controls.appendChild(voicLabel);

		// (Removed separate Auto checkbox and Logic selector as they are now unified)

		// Popup positioning toggle
		const popupWrap = document.createElement('label');
		popupWrap.style.display = 'flex';
		popupWrap.style.alignItems = 'center';
		popupWrap.style.gap = '4px';
		popupWrap.style.marginLeft = '10px';
		popupWrap.style.fontSize = '0.7rem';
		const popupChk = document.createElement('input');
		popupChk.type = 'checkbox';
		popupChk.checked = !!this.state.popupPinned;
		popupChk.addEventListener('change', () => { this.state.popupPinned = popupChk.checked; });
		const popupLbl = document.createElement('span');
		popupLbl.textContent = 'Pin piano popup';
		popupLbl.style.color = '#f9fafb';
		popupWrap.appendChild(popupChk);
		popupWrap.appendChild(popupLbl);
		controls.appendChild(popupWrap);

		// Octave control buttons
		const octaveLabel = document.createElement('span');
		octaveLabel.textContent = 'Octave:';
		octaveLabel.style.fontSize = '0.8rem';
		octaveLabel.style.marginLeft = '8px';
		octaveLabel.style.color = '#f9fafb';
		controls.appendChild(octaveLabel);

		const octaveDown = document.createElement('button');
		octaveDown.textContent = '▼';
		octaveDown.style.fontSize = '0.7rem';
		octaveDown.style.padding = '2px 6px';
		octaveDown.style.cursor = 'pointer';
		octaveDown.addEventListener('click', () => {
			if (this.state.octaveOffset > -2) {
				this.state.octaveOffset--;
				// Reset voice leading state when octave changes
				this.previousVoicing = null;
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
				// Reset voice leading state when octave changes
				this.previousVoicing = null;
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
			this._scheduleRender();
		});
		const splitLabelText = document.createElement('span');
		splitLabelText.textContent = 'Split across staves';
		splitLabelText.style.color = '#f9fafb';
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
			this._scheduleRender();
		});
		const ksLabelText = document.createElement('span');
		ksLabelText.textContent = 'Show key signature';
		ksLabelText.style.color = '#f9fafb';
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
			this._scheduleRender();
		});
		const simplifyLabelText = document.createElement('span');
		simplifyLabelText.textContent = 'Simplify modal signatures';
		simplifyLabelText.style.color = '#f9fafb';
		simplifyWrap.appendChild(simplifyCb);
		simplifyWrap.appendChild(simplifyLabelText);
		controls.appendChild(simplifyWrap);

		// (Removed: single key pill. Per-chord voicing pills will be drawn under each chord.)

		wrapper.appendChild(controls);

        // SVG host
        const svgHost = document.createElement('div');
        svgHost.className = 'sheet-music-svg-host';
        svgHost.style.background = 'var(--bg-panel, #1a1a1a)';
        svgHost.style.border = '2px solid #8b7355';
        svgHost.style.borderRadius = '4px';
        svgHost.style.padding = '12px';
        svgHost.style.minHeight = '120px';
        svgHost.style.overflowX = 'auto';
        svgHost.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

        wrapper.appendChild(svgHost);

		// Voicing options panel (outside the module box, connected visually)
		const voicingPanel = document.createElement('div');
		voicingPanel.className = 'sheet-music-voicing-panel';
		voicingPanel.style.width = '180px';
		voicingPanel.style.flexShrink = '0';
		voicingPanel.style.background = 'rgba(30, 41, 59, 0.95)';
		voicingPanel.style.border = '2px solid rgba(59, 130, 246, 0.4)';
		voicingPanel.style.borderRadius = '8px';
		voicingPanel.style.padding = '12px';
		voicingPanel.style.display = 'flex';
		voicingPanel.style.flexDirection = 'column';
		voicingPanel.style.gap = '10px';
		voicingPanel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
		voicingPanel.style.position = 'relative';

		// Add a connecting line visual
		const connector = document.createElement('div');
		connector.style.position = 'absolute';
		connector.style.left = '-8px';
		connector.style.top = '50%';
		connector.style.transform = 'translateY(-50%)';
		connector.style.width = '8px';
		connector.style.height = '2px';
		connector.style.background = 'rgba(59, 130, 246, 0.4)';
		voicingPanel.appendChild(connector);

		const voicingTitle = document.createElement('div');
		voicingTitle.textContent = 'Voicing Options';
		voicingTitle.style.fontSize = '0.85rem';
		voicingTitle.style.fontWeight = '700';
		voicingTitle.style.color = '#e5e7eb';
		voicingTitle.style.marginBottom = '4px';
		voicingTitle.style.paddingBottom = '8px';
		voicingTitle.style.borderBottom = '1px solid rgba(148, 163, 184, 0.2)';
		voicingPanel.appendChild(voicingTitle);

		// Voice Leading checkbox (single-style inversion smoothing)
		const voiceLeadingWrap = this._createVoicingCheckbox(
			'voice-leading',
			'Voice Leading',
			this.state.voiceLeading,
			'Keep same voicing type, smooth inversions only',
			(checked) => {
				this.state.voiceLeading = checked;
				// When simple VL is on and no explicit combo mode chosen,
				// default to single-style voice leading.
				if (!this.state.voiceLeadingMode) {
					this.state.voiceLeadingMode = 'single';
				}
				this.previousVoicing = null;
				this._lastVLStyle = null;
				this.render();
			}
		);
		voicingPanel.appendChild(voiceLeadingWrap);

		// Voice Leading Combos checkbox (multi-style exploration)
		const vlCombosWrap = this._createVoicingCheckbox(
			'voice-leading-combos',
			'VL Combos',
			this.state.voiceLeadingMode === 'multi',
			'Try multiple voicing types + inversions for each chord',
			(checked) => {
				this.state.voiceLeadingMode = checked ? 'multi' : 'single';
				// Combos implies voice leading is conceptually active
				if (checked) this.state.voiceLeading = true;
				// Ensure new system is active
				this.state.vlCombosVariant = 'v2';
                // Fallback flag used by render() to enforce multi-mode if propagation fails
                this._forceVLCombos = !!checked;
				// Add a fresh seed when toggling combos so variation kicks in
				this.voicingRefreshSeed = Math.random() * 0.9 + 0.1;
				this.previousVoicing = null;
				this._lastVLStyle = null;
				this.render();
				// Emit a UI event so Save Interaction Log captures the state change
				try {
					const evt = new CustomEvent('sheetMusicUpdated', {
						detail: {
							voiceLeading: this.state.voiceLeading,
							voiceLeadingMode: this.state.voiceLeadingMode,
							vlIntensity: this.state.vlIntensity,
							autoVoicingAll: this.state.autoVoicingAll,
							voicingLogic: this.state.voicingLogic,
							voicingStyle: this.state.voicingStyle,
							seed: this.voicingRefreshSeed || 0
						}
					});
					window.dispatchEvent(evt);
				} catch(_) {}
			}
		);
		voicingPanel.appendChild(vlCombosWrap);

		// Voice Leading Intensity slider (spectrum from loose to ultra-smooth)
		const vlIntWrap = document.createElement('div');
		vlIntWrap.style.display = 'flex';
		vlIntWrap.style.flexDirection = 'column';
		vlIntWrap.style.gap = '4px';
		vlIntWrap.style.fontSize = '0.8rem';
		const vlIntLabel = document.createElement('div');
		vlIntLabel.textContent = 'VL Intensity';
		const vlIntRow = document.createElement('div');
		vlIntRow.style.display = 'flex';
		vlIntRow.style.alignItems = 'center';
		vlIntRow.style.gap = '6px';
		const vlIntSlider = document.createElement('input');
		vlIntSlider.type = 'range';
		vlIntSlider.min = '0';
		vlIntSlider.max = '100';
		vlIntSlider.value = String(Math.round((this.state.vlIntensity || 0.5) * 100));
		vlIntSlider.style.flex = '1';
		const vlIntText = document.createElement('span');
		vlIntText.style.fontSize = '0.75rem';
		vlIntText.style.color = '#cbd5e1';
		const updateVlText = () => {
			const v = (this.state.vlIntensity != null ? this.state.vlIntensity : 0.5);
			if (v < 0.25) vlIntText.textContent = 'Loose';
			else if (v < 0.6) vlIntText.textContent = 'Balanced';
			else vlIntText.textContent = 'Ultra-smooth';
		};
		updateVlText();
		vlIntSlider.addEventListener('input', () => {
			const raw = parseInt(vlIntSlider.value, 10);
			const norm = Math.min(1, Math.max(0, raw / 100));
			this.state.vlIntensity = norm;
			// Log slider moves for debugging effectiveness
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetVlIntensityChanged',
					details: { vlIntensity: norm },
					timestamp: new Date().toISOString()
				});
			} catch(_) {}
			updateVlText();
			// Changing intensity conceptually changes the optimization objective;
			// reset continuity so a fresh solution can be found.
			this.previousVoicing = null;
			this._lastVLStyle = null;
			this.render();
		});
		vlIntRow.appendChild(vlIntSlider);
		vlIntRow.appendChild(vlIntText);
		vlIntWrap.appendChild(vlIntLabel);
		vlIntWrap.appendChild(vlIntRow);
		voicingPanel.appendChild(vlIntWrap);

		// (Spread and Double Root toggles removed to keep panel lean.
		// Voice Leading = same-style inversions; VL Combos = multi-style search.)

		// Randomize / regenerate voicings button (global random roll)
		const regenBtn = document.createElement('button');
		regenBtn.textContent = '🎲 Randomize';
		regenBtn.style.marginTop = '8px';
		regenBtn.style.padding = '8px 12px';
		regenBtn.style.fontSize = '0.75rem';
		regenBtn.style.fontWeight = '600';
		regenBtn.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))';
		regenBtn.style.border = '1px solid rgba(59, 130, 246, 0.4)';
		regenBtn.style.borderRadius = '6px';
		regenBtn.style.color = '#e5e7eb';
		regenBtn.style.cursor = 'pointer';
		regenBtn.style.transition = 'all 0.2s ease';
		regenBtn.title = 'Randomize voicings (new global seed)';
		regenBtn.addEventListener('mouseenter', () => {
			regenBtn.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))';
			regenBtn.style.borderColor = 'rgba(59, 130, 246, 0.6)';
		});
		regenBtn.addEventListener('mouseleave', () => {
			regenBtn.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))';
			regenBtn.style.borderColor = 'rgba(59, 130, 246, 0.4)';
		});
		regenBtn.addEventListener('click', () => {
			// Log user intent for later comparison
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetRandomizeClicked',
					details: {
						voiceLeading: !!this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						voicingLogic: this.state.voicingLogic,
						autoVoicingAll: !!this.state.autoVoicingAll
					},
					timestamp: new Date().toISOString()
				});
			} catch(_) {}
			// Global random roll: new seed, clear continuity, respect current
			// harmonization + VL mode, but change which voicing techniques are
			// preferred inside those constraints.
			// Activate new VL Combos system for Randomize-driven variety
			this.state.vlCombosVariant = 'v2';
			this.previousVoicing = null;
			this._lastVLStyle = null;
			this._baseStyleIncludedOnce = false;
			this.voicingRefreshSeed = Math.random() * 0.9 + 0.1;
			this.render();
			// Emit a UI event so Save Interaction Log captures the new seed/state
			try {
				const evt = new CustomEvent('sheetMusicUpdated', {
					detail: {
						voiceLeading: this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						autoVoicingAll: this.state.autoVoicingAll,
						voicingLogic: this.state.voicingLogic,
						voicingStyle: this.state.voicingStyle,
						seed: this.voicingRefreshSeed || 0
					}
				});
				window.dispatchEvent(evt);
			} catch(_) {}
			// Visual feedback
			regenBtn.style.transform = 'rotate(360deg)';
			setTimeout(() => {
				regenBtn.style.transform = 'rotate(0deg)';
			}, 400);
		});
		voicingPanel.appendChild(regenBtn);

		outerContainer.appendChild(wrapper);
		outerContainer.appendChild(voicingPanel);

		this.container.appendChild(outerContainer);
		this.controlsContainer = controls;
		this.svgContainer = svgHost;
	}

	// Build a compact, human-friendly one-paste sheet summary
	_buildCompactSheetLog() {
		const key = this.state.key;
		const scale = this.state.scale;
		let scaleNotes = Array.isArray(this.state.scaleNotes) ? this.state.scaleNotes.slice() : [];
		if (!scaleNotes.length && this.musicTheory) {
			try {
				if (typeof this.musicTheory.getScaleNotesWithKeySignature === 'function') {
					scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(key, scale) || [];
				}
				if ((!scaleNotes || !scaleNotes.length) && typeof this.musicTheory.getScaleNotes === 'function') {
					scaleNotes = this.musicTheory.getScaleNotes(key, scale) || [];
				}
			} catch(_) {}
		}
		const romanUpper = ['I','II','III','IV','V','VI','VII'];
		const romanLower = romanUpper.map(r=>r.toLowerCase());
		const toRomanGuess = (degree, chordType) => {
			if (!degree) return '';
			const ct = String(chordType||'');
			const isHalfDim = /m7b5|ø/i.test(ct);
			const isDim7 = /dim7/i.test(ct);
			const isMinorTriad = /^m(?!aj)/i.test(ct) || /\bm(?!aj)/i.test(ct) || /m7(?!b5)/i.test(ct) || /m6/i.test(ct) || /m9|m11|m13/i.test(ct);
			const hasMaj7 = /maj7/i.test(ct);
			const hasDominant7 = /(^|[^a-z])7($|[^0-9])/i.test(ct) && !hasMaj7 && !/m7/i.test(ct);
			const has6 = /(^|[^0-9])6($|[^0-9])/i.test(ct) || /m6/i.test(ct);
			const hasAug = /#5|\baug\b|\+/i.test(ct);
			const base = isMinorTriad || isHalfDim || /mMaj7/i.test(ct) ? romanLower[degree-1] : romanUpper[degree-1];
			if (isHalfDim) return base + 'ø7';
			if (isDim7) return base + '°7';
			if (hasAug && hasMaj7) return base + 'maj7#5';
			if (hasMaj7) return base + 'maj7';
			if (/mMaj7/i.test(ct)) return base + 'maj7';
			if (hasDominant7) return base + '7';
			if (has6) return base + '6';
			if (hasAug) return base + 'aug';
			return base;
		};

		const lines = [];
		lines.push(`[Sheet] key: ${key}  scale: ${scale}`);
		if (scaleNotes.length) lines.push(`scaleNotes: ${scaleNotes.join(', ')}`);
		lines.push(`harmMode: ${this.state.harmonizationMode}`);
		lines.push('---');
		const nv = (this.musicTheory && this.musicTheory.noteValues) || {};
		(this.state.barChords||[]).forEach((c, idx) => {
			const degree = Array.isArray(this.state.barDegrees) ? this.state.barDegrees[idx] : (()=>{
				try {
					if (!c || !c.root || !scaleNotes.length) return null;
					const rv = nv[c.root];
					if (rv == null) return null;
					const i = scaleNotes.findIndex(n => nv[n] != null && (nv[n]%12) === (rv%12));
					return i>=0 ? (i+1) : null;
				} catch(_) { return null; }
			})();
			let notes = Array.isArray(c && c.chordNotes) ? c.chordNotes.slice() : [];
			try { if ((!notes || !notes.length) && this.musicTheory && this.musicTheory.getChordNotes) notes = this.musicTheory.getChordNotes(c.root, c.chordType)||[]; } catch(_) {}
			let classified = '';
			try { if (this.musicTheory && this.musicTheory.classifyChordTypeFromNotes) classified = this.musicTheory.classifyChordTypeFromNotes(c.root, notes) || ''; } catch(_) {}
			const roman = degree ? toRomanGuess(degree, c && c.chordType) : '';
			const name = (c && c.fullName) ? c.fullName : `${c.root||''}${c.chordType||''}`;
			lines.push(`${idx+1}. deg:${degree||'?'}  ${roman?roman+'  ':''}${name}  notes:[${notes.join(' ')}]${classified?`  class:${classified}`:''}`);
		});
		return lines.join('\n');
	}

	async _copyToClipboard(text) {
		if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
			return navigator.clipboard.writeText(text);
		}
		// Fallback for older browsers
		return new Promise((resolve, reject) => {
			try {
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.left = '-10000px';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	_toast(message) {
		try {
			const el = document.createElement('div');
			el.textContent = message;
			el.style.position = 'fixed';
			el.style.bottom = '20px';
			el.style.left = '50%';
			el.style.transform = 'translateX(-50%)';
			el.style.background = '#2563eb';
			el.style.color = 'white';
			el.style.padding = '8px 14px';
			el.style.borderRadius = '8px';
			el.style.fontSize = '0.85rem';
			el.style.zIndex = '99999';
			document.body.appendChild(el);
			setTimeout(()=>{ try { document.body.removeChild(el); } catch(_){} }, 1200);
		} catch(_) {}
	}

	_createVoicingCheckbox(id, label, checked, tooltip, onChange) {
		const wrap = document.createElement('label');
		wrap.style.fontSize = '0.75rem';
		wrap.style.display = 'flex';
		wrap.style.alignItems = 'flex-start';
		wrap.style.gap = '8px';
		wrap.style.cursor = 'pointer';
		wrap.style.color = '#cbd5e1';
		wrap.title = tooltip;

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = id;
		checkbox.checked = checked;
		checkbox.style.marginTop = '2px';
		checkbox.addEventListener('change', () => {
			onChange(checkbox.checked);
		});

		const labelText = document.createElement('div');
		labelText.style.display = 'flex';
		labelText.style.flexDirection = 'column';
		labelText.style.gap = '2px';

		const labelMain = document.createElement('span');
		labelMain.textContent = label;
		labelMain.style.fontWeight = '600';
		labelMain.style.color = '#e5e7eb';
		labelText.appendChild(labelMain);

		const labelSub = document.createElement('span');
		labelSub.textContent = tooltip;
		labelSub.style.fontSize = '0.65rem';
		labelSub.style.color = '#94a3b8';
		labelSub.style.lineHeight = '1.3';
		labelText.appendChild(labelSub);

		wrap.appendChild(checkbox);
		wrap.appendChild(labelText);

		return wrap;
	}

	render() {
		if (!this.svgContainer) return;
			// Hard guard: if VL Combos checkbox was toggled but state failed to propagate,
			// respect a remembered flag to force multi-mode during this render.
			try {
				if (this._forceVLCombos === true) {
					this.state.voiceLeadingMode = 'multi';
					this.state.voiceLeading = true;
				}
			} catch(_) {}
        this.svgContainer.innerHTML = '';
			// Reset captured voiced chords for MIDI export/playback
			this.state.lastRenderedChords = [];
			this.state.lastRenderedChordNames = [];
			// Reset VL Combos run-scoped helpers so variety constraints apply per render
			try { this._baseStyleIncludedOnce = false; this._lastVLStyle = null; } catch(_) {}

		// ================= Pre-calculate chord requirements =================
		// Decide which chords to show
		let chordsToShow = [];
		if (this.state.barMode === 'single') {
			if (this.state.currentChord) chordsToShow.push(this.state.currentChord);
		} else {
			// Show ALL accumulated barChords in sequence (dynamic measure expansion)
			chordsToShow.push(...this.state.barChords);
		}
		// Debug: show chords entering render after any prior mutations (should match setBarChords input)
		try {
			if (window.__sheetVerbose) console.log('[Sheet] render start chordsToShow', chordsToShow.map(c => ({ root: c.root, chordType: c.chordType })));
		} catch(_) {}

		// In melody harmonization mode, do NOT replace bar chords.
		// Degrees may influence voicing elsewhere, but here we always trust
		// the chord objects provided by the explorer/manual-numbers.
		try {
			if (this.state.harmonizationMode === 'melody' && Array.isArray(this.state.barDegrees)) {
				// No-op: we intentionally avoid calling getDiatonicChord here
			}
		} catch (_) { /* defensive */ }

		// Diagnostics: record which chords were chosen after harmonization mapping
		try {
			if (!window.__interactionLog) window.__interactionLog = [];
			const inputBarChords = Array.isArray(this.state.barChords) ? this.state.barChords.map(c => ({ root: c && c.root, chordType: c && c.chordType })) : [];
			const finalChords = chordsToShow.map((c, idx) => ({
				index: idx,
				root: c && c.root,
				chordType: c && c.chordType,
				fullName: c && c.fullName,
				hasDiatonicNotes: Array.isArray(c && c.diatonicNotes) && c.diatonicNotes.length > 0
			}));
			window.__interactionLog.push({
				type: 'sheetPerBarHarmonizationTrace',
				details: {
					harmonizationMode: this.state.harmonizationMode,
					barDegrees: Array.isArray(this.state.barDegrees) ? this.state.barDegrees.slice() : null,
					inputBarChords,
					finalChords
				},
				timestamp: new Date().toISOString()
			});
		} catch (e) { /* non-fatal */ }

		// Pre-calculate maximum chord label offset needed across all chords
		// to ensure SVG height accommodates the highest labels
		let maxLabelOffset = 8; // minimum default offset
		const noteRadius = 6;
		const staffSpacing = 8;
		
		// Helper function to calculate staff position (needed for pre-calculation)
		const noteToStaffPositionPreCalc = (noteName, clef = 'treble') => {
			const match = noteName.match(/^([A-G][#b]?)(\d+)?$/);
			if (!match) return 0;
			const letter = match[1].charAt(0).toUpperCase();
			const octave = match[2] ? parseInt(match[2]) : (clef === 'bass' ? 3 : 4);
			const noteOrder = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
			const noteIndex = noteOrder[letter] || 0;
			
			if (clef === 'treble') {
				const referenceOctave = 4;
				const referenceIndex = 2; // E
				const octaveOffset = octave - referenceOctave;
				const relativeIndex = noteIndex - referenceIndex;
				const totalOffset = relativeIndex + (octaveOffset * 7);
				return totalOffset * 0.5;
			} else {
				const referenceOctave = 2;
				const referenceIndex = 4; // G
				const octaveOffset = octave - referenceOctave;
				const relativeIndex = noteIndex - referenceIndex;
				const totalOffset = relativeIndex + (octaveOffset * 7);
				return totalOffset * 0.5;
			}
		};

		// Helper for MIDI value (needed for voicing simulation in pre-calc)
		const noteToMidiPreCalc = (noteName) => {
			const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
			const letter = noteName.charAt(0).toUpperCase();
			let octave = 4;
			let accidental = 0;
			const octaveMatch = noteName.match(/\d+/);
			if (octaveMatch) octave = parseInt(octaveMatch[0]);
			if (noteName.includes('#')) accidental = 1;
			if (noteName.includes('b')) accidental = -1;
			const basePitch = noteMap[letter] || 0;
			return (octave + 1) * 12 + basePitch + accidental;
		};
		
		// Pre-pass: calculate highest staff position across all chords
		chordsToShow.forEach((chord, idx) => {
			if (!chord || !chord.chordNotes || !chord.chordNotes.length) return;
			
			let rawNotes = chord.chordNotes;
			if (chord.diatonicNotes && chord.diatonicNotes.length > 0) {
				rawNotes = chord.diatonicNotes;
			}
			
			// Quick voice calculation (simplified - just to get approximate positions)
			const maxInv = Math.max(0, Math.min((rawNotes.length || 1) - 1, this.state.inversion || 0));
			const invNotes = rawNotes.length ? rawNotes.slice(maxInv).concat(rawNotes.slice(0, maxInv)) : rawNotes;
			
			// Use treble clef for max height calculation (relevant for both single treble and grand staff)
			const clef = (this.state.staffType === 'bass') ? 'bass' : 'treble';
			const baseOct = (clef === 'bass' ? 3 : 4) + (this.state.octaveOffset || 0);
			
			// Simulate close voicing (ascending stack) to get accurate octaves
			let prevMidi = null;
			
			invNotes.forEach((note) => {
				let oct = baseOct;
				let currentNote = note + oct;
				let midi = noteToMidiPreCalc(currentNote);
				
				// Raise octave until strictly above previous note (standard close voicing)
				while (prevMidi != null && midi <= prevMidi) {
					oct += 1;
					currentNote = note + oct;
					midi = noteToMidiPreCalc(currentNote);
				}
				prevMidi = midi;
				
				const pos = noteToStaffPositionPreCalc(currentNote, clef);
				
				if (pos > 4.5) {
					// This note extends above staff - calculate needed offset
					const ledgerExtension = (pos - 4) * staffSpacing / 2;
					const neededOffset = ledgerExtension + noteRadius + 12;
					if (neededOffset > maxLabelOffset) {
						maxLabelOffset = neededOffset;
					}
				}
			});
		});

		// ================= Dynamic layout sizing =================
		// In per-bar mode, expand width to accommodate all chords (one chord per measure).
		// Keep a minimum of 4 bars (classic 4-measure phrase) and horizontal scroll enabled via CSS overflow.
		const baseBarWidth = 120; // fixed width per measure for consistent spacing
		const minBars = 4;
		const dynamicBarCount = this.state.barMode === 'per-bar'
			? Math.max(minBars, this.state.barChords.length)
			: minBars; // single mode still reserves 4 bars for consistent look
		const staffLeft = 60; // left margin allowing clef + key signature
		const staffRight = staffLeft + dynamicBarCount * baseBarWidth;
		const width = staffRight + 20; // right margin
		const heightSingle = 100; // single staff height (increased for more traditional look)
		const gapBetweenStaves = 40;
		const heightGrand = heightSingle * 2 + gapBetweenStaves;
		
		// Add extra vertical space at the top for chord labels that extend above staff
		const extraTopSpace = Math.max(0, maxLabelOffset - 8); // beyond the default 8px
		const baseStaffTopY = 20 + extraTopSpace; // push staff down if needed
		const svgHeight = (this.state.staffType === 'grand' ? heightGrand : heightSingle) + extraTopSpace;

		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(svgHeight));
		svg.setAttribute('viewBox', `0 0 ${width} ${svgHeight}`);
		svg.style.display = 'block';
		svg.style.background = 'var(--bg-panel, #1a1a1a)'; // dark background for modern theme

		const barCount = dynamicBarCount;
		const barWidth = baseBarWidth;
		const addLine = (x1, y1, x2, y2, opts = {}) => {
			const line = document.createElementNS(svgNS, 'line');
			line.setAttribute('x1', x1);
			line.setAttribute('y1', y1);
			line.setAttribute('x2', x2);
			line.setAttribute('y2', y2);
			line.setAttribute('stroke', opts.stroke || '#d1d5db');
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
				clefSymbol.setAttribute('fill', '#d1d5db');
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
				clefSymbol.setAttribute('fill', '#d1d5db');
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
		treble = drawStaff(baseStaffTopY, 'treble');
		const bassTop = treble.topY + treble.spacing * 5 + gapBetweenStaves;
		bass = drawStaff(bassTop, 'bass');
		// Simple connecting brace
		addLine(staffLeft - 4, treble.topY, staffLeft - 4, bassTop + 4 * bass.spacing, { 'stroke-width': '2.5', 'stroke': '#d1d5db' });
	} else if (this.state.staffType === 'bass') {
		bass = drawStaff(baseStaffTopY, 'bass');
	} else {
		// default treble
		treble = drawStaff(baseStaffTopY, 'treble');
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
                const color = isBaseAccidental ? '#d1d5db' : '#fdba74'; // Black for traditional, red-orange for scale-specific

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
		keyText.setAttribute('fill', '#e5e7eb');
        keyText.setAttribute('font-size', '10');
        keyText.setAttribute('font-style', 'italic');
        keyText.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
        keyText.textContent = `${this.state.key} ${this.state.scale}`;
        svg.appendChild(keyText);

		// Scale Tips: helpful reminders about relation to major/minor or modes
		const buildScaleTips = (key, scaleId) => {
			const is = (id) => id === scaleId;
			const tips = [];
			const relMajor = (minorKey) => {
				const nv = (this.musicTheory && this.musicTheory.noteValues) || {};
				const val = nv[minorKey];
				if (val == null) return minorKey;
				const targetPc = (val + 3) % 12;
				const majors = ['C','G','D','A','E','B','F#','C#','Gb','Db','Ab','Eb','Bb','F'];
				for (const k of majors) { if (nv[k] != null && (nv[k] % 12) === targetPc) return k; }
				return minorKey;
			};
			const modeDegree = {
				ionian: {deg:1, parent:'major', note:'Major scale (Ionian) = parallel major'},
				dorian: {deg:2, parent:'major', note:'Dorian = major built on scale degree 2'},
				phrygian: {deg:3, parent:'major', note:'Phrygian = major built on scale degree 3'},
				lydian: {deg:4, parent:'major', note:'Lydian = major built on scale degree 4 (raised 4)'},
				mixolydian: {deg:5, parent:'major', note:'Mixolydian = major built on scale degree 5 (flat 7)'},
				aeolian: {deg:6, parent:'major', note:'Aeolian = natural minor (relative major on degree 3)'},
				locrian: {deg:7, parent:'major', note:'Locrian = major built on scale degree 7 (flat 2,5)'}
			};
			// Core families
			if (is('major') || is('ionian')) {
				tips.push('Ionian: plain major pattern');
				tips.push('Modes: start major on other degrees');
			} else if (is('minor') || is('aeolian')) {
				const rm = relMajor(key);
				tips.push(`Natural minor: relative major is ${rm}`);
				tips.push('Minor triads on i iv v; leading tone is flat 7');
			} else if (is('harmonic')) {
				const rm = relMajor(key);
				tips.push(`Harmonic minor: relative major is ${rm}`);
				tips.push('Raised 7 creates V (major) and vii°');
			} else if (is('melodic')) {
				const rm = relMajor(key);
				tips.push(`Melodic minor: relative major is ${rm}`);
				tips.push('Asc: raised 6,7; Desc: natural minor');
			} else if (modeDegree[scaleId]) {
				const info = modeDegree[scaleId];
				tips.push(info.note);
				if (scaleId === 'dorian') tips.push('Minor with raised 6');
				if (scaleId === 'phrygian') tips.push('Minor with flat 2');
				if (scaleId === 'lydian') tips.push('Major with raised 4');
				if (scaleId === 'mixolydian') tips.push('Major with flat 7');
				if (scaleId === 'locrian') tips.push('Minor with flat 2 and 5');
			} else {
				tips.push('Custom scale: compare to parallel major/minor');
			}
			return tips;
		};

		const tips = buildScaleTips(this.state.key, this.state.scale);
		if (tips && tips.length) {
			const tipText = document.createElementNS(svgNS, 'text');
			tipText.setAttribute('x', String(4));
			tipText.setAttribute('y', String((treble ? treble.topY : bass.topY) + 10));
			tipText.setAttribute('fill', '#0f766e');
			tipText.setAttribute('font-size', '10');
			tipText.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			tipText.textContent = `Tips: ${tips.join(' • ')}`;
			svg.appendChild(tipText);
		}

		// Helper: draw a small rounded pill under a chord showing voicing order
		const drawVoicingPill = (xCenter, yTop, labelText, opts = {}) => {
			const paddingX = 6;
			const paddingY = 4;
			const fontSize = opts.fontSize || 10;
			const fill = opts.fill || '#0ea5e9';
			const textColor = opts.textColor || '#042024';

			// Temporary text element to measure width
			const tmp = document.createElementNS(svgNS, 'text');
			tmp.setAttribute('x', '0');
			tmp.setAttribute('y', '0');
			tmp.setAttribute('font-size', String(fontSize));
			tmp.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			tmp.setAttribute('visibility', 'hidden');
			tmp.textContent = labelText;
			svg.appendChild(tmp);
			const bbox = tmp.getBBox ? tmp.getBBox() : { width: labelText.length * (fontSize * 0.6), height: fontSize };
			try { svg.removeChild(tmp); } catch(_) {}

			const rectW = bbox.width + paddingX * 2;
			const rectH = bbox.height + paddingY * 2;
			const rectX = xCenter - rectW / 2;
			const rectY = yTop;

			const rect = document.createElementNS(svgNS, 'rect');
			rect.setAttribute('x', String(rectX));
			rect.setAttribute('y', String(rectY));
			rect.setAttribute('rx', '8');
			rect.setAttribute('ry', '8');
			rect.setAttribute('width', String(rectW));
			rect.setAttribute('height', String(rectH));
			rect.setAttribute('fill', fill);
			rect.setAttribute('opacity', '0.95');
			svg.appendChild(rect);

			const t = document.createElementNS(svgNS, 'text');
			t.setAttribute('x', String(xCenter));
			t.setAttribute('y', String(rectY + rectH / 2 + (fontSize * 0.3)));
			t.setAttribute('fill', textColor);
			t.setAttribute('font-size', String(fontSize));
			t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			t.setAttribute('text-anchor', 'middle');
			t.setAttribute('dominant-baseline', 'middle');
			t.textContent = labelText;
			svg.appendChild(t);
		};
		
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
			
			// Apply double root if enabled (add root at bass)
			let processedNotes = notesNoOctave.slice();
			if (this.state.doubleRoot && processedNotes.length > 0) {
				// Add the root note at the beginning (will be lowest)
				processedNotes = [processedNotes[0], ...processedNotes];
			}
			
			const voiced = [];
			let prevMidi = null;
			
			processedNotes.forEach((n, idx) => {
				let oct = targetBase;
				let midi = noteNameToMidi(n + oct);
				
				// For spread voicing checkbox, only act if style isn't itself a wide-spacing style
				const wideStyles = ['spread','quartal','open','cluster'];
				if (this.state.spreadVoicing && idx > 0 && !wideStyles.includes(this.state.voicingStyle)) {
					// Spread: ensure at least an octave between consecutive notes
					const minInterval = 12; // one octave
					while (prevMidi != null && (midi - prevMidi) < minInterval) {
						oct += 1;
						midi = noteNameToMidi(n + oct);
					}
				} else {
					// Close voicing: raise by octaves until strictly above previous note
					while (prevMidi != null && midi <= prevMidi) {
						oct += 1;
						midi = noteNameToMidi(n + oct);
					}
				}
				
				voiced.push(n + oct);
				prevMidi = midi;
			});
			
			return voiced;
		};

		// Apply a named voicing transformation to an already-voiced ascending chord array
		const applyVoicingStyle = (voicedNotes, style) => {
			if (!Array.isArray(voicedNotes) || voicedNotes.length === 0) return voicedNotes;
			const len = voicedNotes.length;
			const clone = voicedNotes.slice();
			
			// Debug logging (opt-in)
			try { if (window.__sheetVerbose) console.log('applyVoicingStyle:', {style, inputNotes: clone, length: len}); } catch(_) {}
			
			// Helper: shift octave for index by n (positive raises, negative lowers)
			const shiftOctave = (noteStr, delta) => {
				const m = noteStr.match(/^([A-G][#b]?)(\d+)$/);
				if (!m) return noteStr;
				const letter = m[1];
				const oct = parseInt(m[2], 10) + delta;
				return `${letter}${oct}`;
			};

				switch((style||'close')) {
				case 'close':
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output:', {style, outputNotes: clone}); } catch(_) {}
					return clone;
				case 'open':
					// Simple open: raise top voice by an octave to create wider spacing
					const openResult = clone.map((n, i) => i === len-1 ? shiftOctave(n, 1) : n);
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output:', {style, outputNotes: openResult}); } catch(_) {}
					return openResult;
				case 'drop2':
					if (len >= 2) clone[len-2] = shiftOctave(clone[len-2], -1);
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output:', {style, outputNotes: clone}); } catch(_) {}
					return clone;
				case 'drop3':
					if (len >= 3) clone[len-3] = shiftOctave(clone[len-3], -1);
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output:', {style, outputNotes: clone}); } catch(_) {}
					return clone;
				case 'drop2+4':
					if (len >= 2) clone[len-2] = shiftOctave(clone[len-2], -1);
					if (len >= 4) clone[len-4] = shiftOctave(clone[len-4], -1);
					return clone;
				case 'drop3+5':
					if (len >= 3) clone[len-3] = shiftOctave(clone[len-3], -1);
					if (len >= 5) clone[len-5] = shiftOctave(clone[len-5], -1);
					return clone;
				case 'spread':
					// "Spread" now implements a standard open voicing (Drop 2 or Drop 2+4)
					// This creates a wide but playable spacing (unlike the previous >1 octave logic)
					if (len >= 4) {
						// Drop 2 and 4 (standard open 4-part voicing)
						// Drop 2nd from top
						clone[len-2] = shiftOctave(clone[len-2], -1);
						// Drop 4th from top (which is index 0 if len=4)
						clone[len-4] = shiftOctave(clone[len-4], -1);
					} else if (len >= 3) {
						// Drop 2 (standard open triad)
						clone[len-2] = shiftOctave(clone[len-2], -1);
					} else {
						// For intervals, just separate them
						clone[0] = shiftOctave(clone[0], -1);
					}
					return clone;
				case 'shell':
					// Shell voicing: prefer root, 3rd, and 7th (omit the 5th)
					// If the chord has 3 or fewer voices, keep as-is. For 4+ voices,
					// construct a 1-3-7 shell and ensure ascending order by octave.
					if (len <= 3) return clone;
					{
						const root = clone[0];
						const third = clone.length > 1 ? clone[1] : null;
						// Prefer the conventional 7th position when available (index 3 for 4-note chords)
						const seventh = clone.length >= 4 ? clone[3] : (clone.length > 2 ? clone[clone.length - 1] : null);
						const result = [root];
						if (third) result.push(third);
						if (seventh) result.push(seventh);
						// Ensure ascending order (raise octaves of later voices until strictly above previous)
						for (let i = 1; i < result.length; i++) {
							while (noteNameToMidi(result[i]) <= noteNameToMidi(result[i - 1])) {
								result[i] = shiftOctave(result[i], 1);
							}
						}
							try { if (window.__sheetVerbose) console.log('applyVoicingStyle output (shell):', {style, outputNotes: result}); } catch(_) {}
						return result;
					}
				case 'quartal':
					// Build stacked fourths
					// For triads (1-3-5), drop 5th: 5-1-3 (P4, M3)
					// For 7ths (1-3-5-7), drop 7th and raise root: 7-3-5-1 (P4, m3, P4)
					if (len === 3) {
						clone[2] = shiftOctave(clone[2], -1);
					} else if (len >= 4) {
						clone[len-1] = shiftOctave(clone[len-1], -1); // Drop top (7th)
						clone[0] = shiftOctave(clone[0], 1); // Raise bottom (root)
					}
					return clone;
				case 'quintal':
					// Build stacked fifths/sixths by shifting alternate notes up an octave
					// e.g. C-E-G-B -> C-G-E-B (P5, M6, P5)
					for (let i=1;i<len;i+=2) clone[i] = shiftOctave(clone[i], 1);
					return clone;
				case 'cluster':
					// Tight cluster around middle: bring notes toward the middle octave
					const midIdx = Math.floor(len/2);
					for (let i=0;i<len;i++) {
						const delta = midIdx - i;
						// move closer by shifting octave toward middle
						if (Math.abs(delta) >= 1) clone[i] = shiftOctave(clone[i], delta>0? -1: 1);
					}
					return clone;
				case 'gospel-shell':
					// Common gospel shell voicing: low root, upper close cluster of 3rd/7th/9th
					if (len >= 4) {
						// lower second voice for punch
						clone[1] = shiftOctave(clone[1], -1);
					}
					return clone;
				case 'gospel-cluster':
					// Cluster with second voice dropped an octave and others tightened
					if (len >= 2) clone[1] = shiftOctave(clone[1], -1);
					return clone;
				case 'jazz-rootless':
					// Remove the root (if present) and keep 3rd/7th in upper voices
					{
						const pcs = clone.map(n=>pitchClass(n));
						// attempt to drop lowest voice
						clone.shift();
						return clone;
					}
				case 'classical-balanced':
					// "Classical Balanced" -> Keyboard style (Root in bass, chord in RH)
					// Drop the lowest note (root) by 1 octave to create separation from the upper structure
					if (len > 1) {
						clone[0] = shiftOctave(clone[0], -1);
					}
					return clone;
				case 'add-tensions':
					// If chord has <7, try to add 9/11/13 above
					if (len >= 3) {
						const last = clone[clone.length-1];
						clone.push(shiftOctave(last, 1)); // simple placeholder: echo top as tension
					}
					return clone;
				case 'shell-no3':
					// Shell-no3: construct a 3-note shell where the 3rd is dropped an octave
					// (resulting voicing: low 3rd, root, 5th) for a clear shell texture.
					if (len <= 2) return clone;
					{
						const root = clone[0];
						const third = clone.length > 1 ? clone[1] : null;
						const fifth = clone.length > 2 ? clone[2] : null;
						const thirdLow = third ? shiftOctave(third, -1) : null;
						const result = [];
						if (thirdLow) result.push(thirdLow);
						result.push(root);
						if (fifth) result.push(fifth);
						// Ensure ascending order by raising octaves as needed
						for (let i = 1; i < result.length; i++) {
							while (noteNameToMidi(result[i]) <= noteNameToMidi(result[i - 1])) {
								result[i] = shiftOctave(result[i], 1);
							}
						}
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output (shell-no3):', {style, outputNotes: result}); } catch(_) {}
						return result;
					}
				case 'shell-high3':
					// Shell-high3: construct a 3-note shell where the 3rd is raised an octave
					// (resulting voicing: root, 5th, 3rd_up) for a bright spread.
					if (len <= 2) return clone;
					{
						const root = clone[0];
						const third = clone.length > 1 ? clone[1] : null;
						const fifth = clone.length > 2 ? clone[2] : null;
						const thirdHigh = third ? shiftOctave(third, 1) : null;
						const result = [root];
						if (fifth) result.push(fifth);
						if (thirdHigh) result.push(thirdHigh);
						// Ensure ascending order by raising octaves as needed
						for (let i = 1; i < result.length; i++) {
							while (noteNameToMidi(result[i]) <= noteNameToMidi(result[i - 1])) {
								result[i] = shiftOctave(result[i], 1);
							}
						}
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output (shell-high3):', {style, outputNotes: result}); } catch(_) {}
						return result;
					}
				default:
					const result = clone;
						try { if (window.__sheetVerbose) console.log('applyVoicingStyle output:', {style, outputNotes: result}); } catch(_) {}
					return result;
			}
		};

		// Unified auto-voicing chooser: evaluates styles once using composite scoring.
		// Returns { notes, style, breakdown }
		const chooseAutoVoicing = (baseNotes) => {
			const candidateStyles = [
				'close','open','drop2','drop3','drop2+4','drop3+5','spread','shell','shell-no3','shell-high3','quartal','quintal','cluster','gospel-shell','gospel-cluster','jazz-rootless','classical-balanced','add-tensions'
			];
			// Melody target pitch class (if in melody mode and degree present)
			let targetPc = null;
			if (this.state.harmonizationMode === 'melody' && Array.isArray(this.state.barDegrees) && typeof currentBarIndex === 'number') {
				const deg = this.state.barDegrees[currentBarIndex];
				if (deg != null && Array.isArray(this.state.scaleNotes) && this.state.scaleNotes.length) {
					const scaleNote = this.state.scaleNotes[(deg - 1) % this.state.scaleNotes.length];
					if (scaleNote) targetPc = pitchClass(convertToKeySignatureSpelling(scaleNote));
				}
			}
			// Previous chord midi sorted for movement comparison
			const prevMidiSorted = Array.isArray(this.previousVoicing) ? this.previousVoicing.slice().sort((a,b)=>a-b) : null;
			const baseNotesCount = baseNotes.length;

			// Define weights based on voicingLogic
			const baseWeights = {
				smart:  { move: 1.0, compact: 0.5, span: 0.5, diversity: 0.5, drop: 2.0, root: 1.0, melody: 2.0 },
				smooth: { move: 3.0, compact: 1.0, span: 0.2, diversity: 0.2, drop: 3.0, root: 1.0, melody: 1.0 },
				open:   { move: 0.5, compact: -0.5, span: 2.0, diversity: 0.5, drop: 1.0, root: 0.5, melody: 1.0 },
				jazz:   { move: 0.5, compact: 0.5, span: 0.8, diversity: 2.0, drop: 0.5, root: 0.2, melody: 1.0 }, // allow rootless
				piano:  { move: 1.0, compact: 0.8, span: 0.5, diversity: 0.5, drop: 2.0, root: 2.0, melody: 1.0 }  // strong root preference
			};
			const logicWeights = baseWeights[this.state.voicingLogic] || baseWeights.smart;
			// Intensity scales how strongly we penalize movement vs. allow openness.
			const intensity = (this.state.vlIntensity != null ? this.state.vlIntensity : 0.5);
			const w = {
				move: logicWeights.move * (0.3 + 1.7 * intensity), // 0.3x at loose, 2x at max
				compact: logicWeights.compact * (0.5 + 0.5 * intensity),
				span: logicWeights.span * (1.5 - intensity), // more span when looser
				diversity: logicWeights.diversity * (1.2 - 0.4 * intensity),
				drop: logicWeights.drop,
				root: logicWeights.root,
				melody: logicWeights.melody
			};

			const evaluations = [];
			for (const style of candidateStyles) {
				const attempt = applyVoicingStyle(baseNotes.slice(), style);
				const midiVals = attempt.map(n=>noteNameToMidi(n));
				const sorted = midiVals.slice().sort((a,b)=>a-b);
				
				// Voice count penalty: strongly discourage dropping voices unless high bias
				const voiceCountDiff = Math.abs(attempt.length - baseNotesCount);
				let voiceDropPenalty = 0;
				if (attempt.length < baseNotesCount) {
					// Dropping voices is bad unless logic allows it (e.g. jazz rootless)
					voiceDropPenalty = (baseNotesCount - attempt.length) * 8 * w.drop;
				} else if (attempt.length > baseNotesCount) {
					// Adding voices (tensions)
					voiceDropPenalty = (attempt.length - baseNotesCount) * 2; // slight penalty to avoid clutter unless beneficial
				}
				
				// Movement cost
				let moveCost = 0;
				if (prevMidiSorted && prevMidiSorted.length) {
					const L = Math.min(prevMidiSorted.length, sorted.length);
					for (let i=0;i<L;i++) moveCost += Math.abs(sorted[i] - prevMidiSorted[i]);
					// Penalty for changing voice count
					if (sorted.length !== prevMidiSorted.length) moveCost += 5 * Math.abs(sorted.length - prevMidiSorted.length);
				} else {
					// First chord: use compactness as proxy (prefer close at low bias)
					const avgInterval = sorted.length > 1 ? (sorted[sorted.length-1] - sorted[0]) / (sorted.length - 1) : 0;
					moveCost = avgInterval; // lower is tighter/closer
				}
				
				// Span (register width)
				const span = sorted.length ? (sorted[sorted.length-1] - sorted[0]) : 0;
				
				// Root stability: reward keeping the lowest pitch class as chord root when in 'root' mode
				let rootBonus = 0;
				if (this.state.harmonizationMode === 'root' && this.state.currentChord && this.state.currentChord.root) {
					const rootPc = pitchClass(convertToKeySignatureSpelling(this.state.currentChord.root));
					const lowestPc = pitchClass(attempt[0]);
					if (rootPc != null && lowestPc === rootPc) rootBonus = 6 * w.root;
				}
				
				// Melody top bonus
				let melodyBonus = 0;
				if (targetPc != null) {
					const topPc = pitchClass(attempt[attempt.length-1]);
					if (topPc === targetPc) melodyBonus = 8 * w.melody; // strong preference
				}
				
				// Diversity: unique pitch classes count (matters more at high bias)
				const uniquePcs = new Set(attempt.map(n=>pitchClass(n))).size;
				const diversityScore = uniquePcs * 0.5 * w.diversity;
				
				// Compactness bonus (inverse of span): reward tight voicings
				const compactnessBonus = span > 0 ? (24 - Math.min(span, 24)) * 0.3 * w.compact : 0;
				
				// Span reward: favor wider voicings
				const spanBonus = span * 0.4 * w.span;
				
				// Movement penalty: scaled by intensity (higher intensity → heavier penalty)
				const movementPenalty = moveCost * w.move;
				
				// Small random variation; mostly for tie-breaking.
				const randomVariation = (this.voicingRefreshSeed || 0) * (Math.random() - 0.5) * 1.5;
				
				// Composite score (higher = better)
				const score = 
					-movementPenalty + 
					compactnessBonus + 
					spanBonus + 
					diversityScore + 
					rootBonus + 
					melodyBonus - 
					voiceDropPenalty +
					randomVariation;
				
				evaluations.push({ 
					style, 
					notes: attempt, 
					cost: moveCost, 
					span, 
					uniquePcs, 
					rootBonus, 
					melodyBonus, 
					voiceDropPenalty,
					score 
				});
			}
			// Choose highest score
			evaluations.sort((a,b)=> b.score - a.score);
			return evaluations[0] || { notes: baseNotes, style: 'close', breakdown: {} };
		};

		// Helper: pitch class from a note name (ignores octave); returns 0-11 or null
		const pitchClass = (noteName) => {
			if (!this.musicTheory || !this.musicTheory.noteValues) return null;
			const baseMatch = String(noteName).match(/^([A-G][#b]?)/);
			const base = baseMatch ? baseMatch[1] : String(noteName);
			const v = this.musicTheory.noteValues[base];
			return v == null ? null : (v % 12);
		};

		// Helper: enforce the target degree note as top voice (highest) in the voiced chord
		const enforceMelodyTop = (voicedNotes, targetDegree) => {
			try {
				if (!Array.isArray(voicedNotes) || !voicedNotes.length) return voicedNotes;
				if (!targetDegree || !Array.isArray(this.state.scaleNotes) || this.state.scaleNotes.length === 0) return voicedNotes;
				const degIdx = (targetDegree - 1) % this.state.scaleNotes.length;
				const degreeNote = this.state.scaleNotes[degIdx];
				if (!degreeNote) return voicedNotes;
				// Normalize spelling to key signature preferences
				const targetSpelling = convertToKeySignatureSpelling(degreeNote);
				const targetPc = pitchClass(targetSpelling);
				if (targetPc == null) return voicedNotes;

				// Find one voiced note that matches the target pitch class
				let matchIndex = -1;
				for (let i = voicedNotes.length - 1; i >= 0; i--) {
					if (pitchClass(voicedNotes[i]) === targetPc) { matchIndex = i; break; }
				}
				if (matchIndex === -1) return voicedNotes; // target not present in this chord

				// Move the matching note to the end (so it's considered the top within our layout)
				const out = voicedNotes.slice();
				const [targetNote] = out.splice(matchIndex, 1);
				out.push(targetNote);

				// Raise the target note by octaves until above all others
				const others = out.slice(0, out.length - 1);
				const maxOtherMidi = others.reduce((m, n) => Math.max(m, noteNameToMidi(n)), -Infinity);
				let t = targetNote;
				let tMidi = noteNameToMidi(t);
				while (tMidi <= maxOtherMidi) {
					const m = t.match(/^([A-G][#b]?)(\d+)?$/);
					if (!m) break;
					const letter = m[1];
					const oct = m[2] ? parseInt(m[2]) : (this.state.staffType === 'bass' ? 3 : 4);
					t = `${letter}${oct + 1}`;
					tMidi = noteNameToMidi(t);
				}
				out[out.length - 1] = t;
				return out;
			} catch {
				return voicedNotes;
			}
		};

		// Apply voice leading: adjust octaves to minimize movement from previous chord
		const applyVoiceLeading = (currentNotes) => {
			if (!this.state.voiceLeading || !this.previousVoicing || this.previousVoicing.length === 0) {
				// No previous voicing or voice leading disabled - store current and return as is
				this.previousVoicing = currentNotes.map(n => noteNameToMidi(n));
				return currentNotes;
			}
			
			// For each note in current chord, find the octave that minimizes distance to previous chord
			const optimized = currentNotes.map((noteName, idx) => {
				const match = noteName.match(/^([A-G][#b]?)(\d+)?$/);
				if (!match) return noteName;
				
				const letter = match[1];
				const currentOct = match[2] ? parseInt(match[2]) : 4;
				
				// Try octaves from -2 to +2 around current
				let bestOct = currentOct;
				let minDist = Infinity;
				
				for (let testOct = currentOct - 2; testOct <= currentOct + 2; testOct++) {
					const testMidi = noteNameToMidi(letter + testOct);
					
					// Find closest note in previous voicing
					const distToPrev = Math.min(...this.previousVoicing.map(prevMidi => 
						Math.abs(testMidi - prevMidi)
					));
					
					if (distToPrev < minDist) {
						minDist = distToPrev;
						bestOct = testOct;
					}
				}
				
				return letter + bestOct;
			});
			
			// Store current voicing for next chord
			this.previousVoicing = optimized.map(n => noteNameToMidi(n));
			
			return optimized;
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

		// Store helper functions as instance methods so chooseVoiceLeadingCombination can access them
		this._convertToKeySignatureSpelling = convertToKeySignatureSpelling;
		this._voiceChordClose = voiceChordClose;
		this._applyVoicingStyle = applyVoicingStyle;
		this._noteNameToMidi = noteNameToMidi;

        // Helper function to draw ledger lines for notes outside the staff
		const drawLedgerLines = (svg, noteX, noteY, staffPosition, staffMeta, noteRadius) => {
			const lineLength = noteRadius * 2.5;
			const spacing = staffMeta.spacing;

			// Helper: draw a single ledger line at a given line index (integer positions only)
			const drawLineAt = (lineIndex) => {
				const y = staffMeta.topY + 4 * spacing - lineIndex * spacing;
				const line = document.createElementNS(svgNS, 'line');
				line.setAttribute('class', 'ledger-line');
				line.setAttribute('data-line-index', String(lineIndex));
				line.setAttribute('x1', String(noteX - lineLength));
				line.setAttribute('y1', String(y));
				line.setAttribute('x2', String(noteX + lineLength));
				line.setAttribute('y2', String(y));
				line.setAttribute('stroke', '#d1d5db');
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
			t.setAttribute('fill', '#d1d5db');
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
			
			// Enhanced inversion logic: vary inversions for repeated chords (same as single staff)
			let dynamicInversion = this.state.inversion || 0;
			
			// Check for repeated chords and apply inversion variety
			if (this.state.barMode === 'per-bar' && chordsToShow.length > 1) {
				const currentChordName = chord.fullName || `${chord.root}${chord.chordType}`;
				
				// Find previous occurrences of the same chord
				const previousOccurrences = [];
				for (let i = 0; i < barIndex; i++) {
					const prevChord = chordsToShow[i];
					if (prevChord) {
						const prevChordName = prevChord.fullName || `${prevChord.root}${prevChord.chordType}`;
						if (prevChordName === currentChordName) {
							previousOccurrences.push(i);
						}
					}
				}
				
				// Apply inversion variety for repeated chords (deterministic)
				if (previousOccurrences.length > 0) {
					const maxPossibleInv = Math.min(3, (rawNotes.length || 1) - 1);
					
					// Use a deterministic pattern that creates good voice leading
					const inversionPattern = [0, 1, 2, 1]; // Root, 1st, 2nd, 1st, repeat...
					const patternIndex = previousOccurrences.length % inversionPattern.length;
					dynamicInversion = Math.min(maxPossibleInv, inversionPattern[patternIndex]);
					
					console.log(`[SheetMusic] Chord ${currentChordName} repeated (occurrence ${previousOccurrences.length + 1}), using inversion ${dynamicInversion}`);
				}
			}
			
			const maxInv = Math.max(0, Math.min((rawNotes.length || 1) - 1, dynamicInversion));
			const invNotes = rawNotes.length ? rawNotes.slice(maxInv).concat(rawNotes.slice(0, maxInv)) : rawNotes;
			const spelled = invNotes.map(n => convertToKeySignatureSpelling(n));
			// Voice relative to treble baseline so split around middle C feels natural
			let voiced = voiceChordClose(spelled, 'treble', this.state.octaveOffset);
			
			// Apply voicing: VL Combos takes priority (explores multiple styles+inversions),
			// then auto voicing (single best style), then manual style.
			let usedStyle = this.state.voicingStyle;
			// PRIORITY 1: VL Combos (multi-mode) - must check FIRST before autoVoicingAll
			if (this.state.voiceLeadingMode === 'multi') {
				const choice = chooseVoiceLeadingCombination.call(this, rawNotes, 'treble');
				voiced = choice.notes || voiced;
				usedStyle = choice.style || this.state.voicingStyle;
				// Persist continuity so subsequent bars actually optimize movement
				try { this.previousVoicing = Array.isArray(voiced) ? voiced.map(n => noteNameToMidi(n)) : null; } catch(_) { this.previousVoicing = null; }
				// chooseVoiceLeadingCombination already optimized; don't re-smooth.
			} else if (this.state.autoVoicingAll) {
				// Provide current bar index to chooser via closure variable
				var currentBarIndex = barIndex; // used by chooseAutoVoicing for melody targeting
				const choice = chooseAutoVoicing(voiced.slice());
				voiced = choice.notes;
				this.state.voicingStyle = choice.style;
				usedStyle = choice.style;
				// If single-mode voice leading requested, apply after style
				if (this.state.voiceLeading && this.state.voiceLeadingMode === 'single') voiced = applyVoiceLeading(voiced);
			} else {
				voiced = applyVoicingStyle(voiced, this.state.voicingStyle);
				usedStyle = this.state.voicingStyle;
				// Apply voice-leading octave adjustments for single-mode
				if (this.state.voiceLeading && this.state.voiceLeadingMode === 'single') voiced = applyVoiceLeading(voiced);
			}
			// Log per-bar voicing choice for diagnostics
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetVoicingAppliedSplit',
					details: {
						barIndex,
						staffType: 'grand-split',
						usedStyle,
						voiceLeading: !!this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						voicingLogic: this.state.voicingLogic,
						seed: this.voicingRefreshSeed || 0,
						voicedNotes: voiced.slice()
					},
					timestamp: new Date().toISOString()
				});
			} catch(_) {}

			// If in melody mode and we have a degree for this bar, force that degree to top voice
			if (this.state.harmonizationMode === 'melody' && Array.isArray(this.state.barDegrees)) {
				const deg = this.state.barDegrees[barIndex];
				if (deg != null) voiced = enforceMelodyTop(voiced, deg);
			}

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

			// Calculate highest note position to avoid ledger line collisions
			// Check upper notes (treble staff) for how high they extend
			let highestStaffPos = -999;
			if (upper.length > 0) {
				upper.forEach(note => {
					const pos = noteToStaffPosition(note, 'treble');
					if (pos > highestStaffPos) highestStaffPos = pos;
				});
			}
			
			// Base chord label position: minimum 8px above staff
			// If notes extend above staff (position > 4), add spacing for ledger lines
			let labelOffsetY = 8;
			if (highestStaffPos > 4.5) {
				// Each staff position is 4px (half of spacing=8), add extra space for ledger lines
				// Plus additional clearance for the notehead and ledger line itself
				const ledgerExtension = (highestStaffPos - 4) * trebleMeta.spacing / 2;
				labelOffsetY = ledgerExtension + radius + 12; // note radius + clearance
			}

			// Label once (on treble)
			const text = document.createElementNS(svgNS, 'text');
			text.setAttribute('x', String(xCenter));
			text.setAttribute('y', String(trebleMeta.topY - labelOffsetY));
			text.setAttribute('fill', '#ffffff');
			text.setAttribute('font-size', '12');
			text.setAttribute('font-weight', 'bold');
			text.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			text.setAttribute('text-anchor', 'middle');
			const invSuffix = this.state.inversion === 0 ? '' : (this.state.inversion === 1 ? ' (1st inv)' : (this.state.inversion === 2 ? ' (2nd inv)' : ' (3rd inv)'));
			// Use the original diatonic chord type for label display
			// Do not reclassify from voiced notes to prevent misidentification
			// Prefer fullName if available (it may contain specific modifiers like 'add6' or 'no5' from the engine)
			let displayFull = chord.fullName || '';
			if (!displayFull) {
				let displayType = chord.chordType || '';
				// Special case: G lydian_augmented, degree 1 should display '+maj7' or 'maj7#5' if notes match
				if (this.state.key === 'G' && this.state.scale === 'lydian_augmented' && barIndex === 0) {
					// If notes match G B D F#, force label to '+maj7' or 'maj7#5'
					const notes = (chord.chordNotes && chord.chordNotes.length) ? chord.chordNotes : chord.diatonicNotes;
					if (Array.isArray(notes) && notes.join(',') === 'G,B,D,F#') {
						displayType = '+maj7';
					}
				}
				displayFull = `${chord.root || ''}${displayType}`;
			}
			const chordLabelStr = displayFull + invSuffix;
			// Auto-scale font size for long chord names to prevent overlap
			if (chordLabelStr.length > 15) {
				text.setAttribute('font-size', '10');
			} else if (chordLabelStr.length > 12) {
				text.setAttribute('font-size', '11');
			}
			text.textContent = chordLabelStr;
			text.setAttribute('class', 'sheet-chord-label');
			text.setAttribute('data-bar-index', String(barIndex));
			text.style.cursor = 'pointer';
			svg.appendChild(text);

			// Draw voicing style label below the system (below bass staff)
			const voicingNames = {
				'close': 'Close', 'open': 'Open', 'drop2': 'Drop 2', 'drop3': 'Drop 3',
				'drop2+4': 'Drop 2+4', 'drop3+5': 'Drop 3+5', 'spread': 'Spread',
				'shell': 'Shell', 'shell-no3': 'Shell (no 3)', 'shell-high3': 'Shell (hi 3)',
				'quartal': 'Quartal', 'quintal': 'Quintal', 'cluster': 'Cluster', 'gospel-shell': 'Gospel',
				'gospel-cluster': 'Gospel Clust', 'jazz-rootless': 'Rootless',
				'classical-balanced': 'Balanced', 'add-tensions': 'Tensions'
			};
			const styleName = voicingNames[usedStyle] || usedStyle;
			
			// Calculate lowest note position on bass staff to avoid collisions
			let lowestStaffPos = 999;
			if (lower.length > 0) {
				lower.forEach(note => {
					const pos = noteToStaffPosition(note, 'bass');
					if (pos < lowestStaffPos) lowestStaffPos = pos;
				});
			} else {
				// If no bass notes, use bottom line of bass staff as reference
				lowestStaffPos = 0; 
			}
			
			// Base label position: minimum 20px below staff bottom line
			// staffPosition 0 is bottom line. Negative is below.
			let bottomLabelOffsetY = 20;
			if (lowestStaffPos < -0.5) {
				// Distance from bottom line (0) is abs(lowestStaffPos) * spacing/2
				const ledgerExtension = Math.abs(lowestStaffPos) * bassMeta.spacing / 2;
				bottomLabelOffsetY = ledgerExtension + radius + 12;
			}
			
			const styleText = document.createElementNS(svgNS, 'text');
			styleText.setAttribute('x', String(xCenter));
			// Position below bass staff
			const bottomY = bassMeta.topY + 4 * bassMeta.spacing + bottomLabelOffsetY;
			styleText.setAttribute('y', String(bottomY));
			styleText.setAttribute('fill', '#64748b'); // Slate-500, lighter than chord name
			styleText.setAttribute('font-size', '10');
			styleText.setAttribute('font-style', 'italic');
			styleText.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			styleText.setAttribute('text-anchor', 'middle');
			styleText.textContent = styleName;
			svg.appendChild(styleText);

			// Log style label rendering and current voicing/leading settings for Save Interaction Log
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetStyleLabelRendered',
					details: {
						barIndex,
						staffType: 'grand-split',
						labelText: styleName,
						usedStyle,
						voiceLeading: !!this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						autoVoicingAll: !!this.state.autoVoicingAll,
						voicingLogic: this.state.voicingLogic,
						voicingStyle: this.state.voicingStyle,
						inversion: this.state.inversion,
						harmonizationMode: this.state.harmonizationMode,
						seed: this.voicingRefreshSeed || 0
					},
					timestamp: new Date().toISOString()
				});
			} catch(_) {}

			// Build voicing order pill (map voiced notes back to chord degrees 1/3/5/7)
			try {
				// Use the canonical chord base (root-position chordNotes or diatonicNotes)
				// for degree lookup so degree numbers remain consistent regardless of inversion.
				const canonicalBase = chord && chord.chordNotes && chord.chordNotes.length ? chord.chordNotes : (chord && chord.diatonicNotes ? chord.diatonicNotes : null);
				const chordTonePcs = Array.isArray(canonicalBase) ? canonicalBase.map(n => pitchClass(convertToKeySignatureSpelling(n))) : [];
				const degreeMap = [1,3,5,7];
				// Sort voiced notes by MIDI pitch (lowest -> highest) so mapping reflects actual sounding order
				const voicedSorted = voiced.slice().sort((a,b) => noteNameToMidi(a) - noteNameToMidi(b));
				const order = voicedSorted.map(n => {
					const pc = pitchClass(n);
					const idx = chordTonePcs.findIndex(p => p === pc);
					if (idx >= 0) return degreeMap[idx] || (idx+1);
					return '?';
				});
				let pillText = order.join('-');

				// Determine inversion from the lowest voiced degree
				let inversionLabel = '';
				try {
					const lowest = order.length ? order[0] : null;
					if (lowest === 1) inversionLabel = 'Root pos';
					else if (lowest === 3) inversionLabel = '1st inv';
					else if (lowest === 5) inversionLabel = '2nd inv';
					else if (lowest === 7) inversionLabel = '3rd inv';
					else inversionLabel = '';
				} catch (_) { inversionLabel = ''; }
				// Append style hint for clarity when not close
				const voicingNames = {
					'close': 'Close', 'open': 'Open', 'drop2': 'Drop 2', 'drop3': 'Drop 3',
					'drop2+4': 'Drop 2+4', 'drop3+5': 'Drop 3+5', 'spread': 'Spread',
					'shell': 'Shell', 'shell-no3': 'Shell(no3)', 'shell-high3': 'Shell(hi3)',
					'quartal': 'Quartal', 'quintal': 'Quintal', 'cluster': 'Cluster', 'gospel-shell': 'Gospel',
					'gospel-cluster': 'Gospel Clust', 'jazz-rootless': 'Rootless',
					'classical-balanced': 'Balanced', 'add-tensions': 'Tensions'
				};
				if (usedStyle && usedStyle !== 'close') {
					pillText += ` (${voicingNames[usedStyle] || usedStyle})`;
				}
				// Append inversion and voice-leading info
				if (inversionLabel) pillText += ` · ${inversionLabel}`;
			// Draw pill under the bass staff label area
			const pillY = bottomY + 6;
			drawVoicingPill(xCenter, pillY, pillText, { fill: '#374151', textColor: '#f3f4f6', fontSize: 10 });
		} catch (e) { /* non-fatal */ }			const drawSet = (notesArr, staffMeta) => {
				const smallNoteTexts = [];
				// Derive accidental preference from chord root when available so
				// small-note labels match the chord title's enharmonic spelling.
				let preferFlatForThisChord = null;
				try {
					if (chord && chord.root && this.musicTheory) {
						const rt = String(chord.root || '');
						if (rt.indexOf('b') >= 0) preferFlatForThisChord = true;
						else if (rt.indexOf('#') >= 0) preferFlatForThisChord = false;
					}
				} catch (_) { preferFlatForThisChord = null; }

				notesArr.forEach((note, idx) => {
					const staffPosition = noteToStaffPosition(note, staffMeta.clef);
					const y = staffPositionToY(staffPosition, staffMeta);
				const x = xCenter + (idx - (notesArr.length - 1) / 2) * (radius * 2.2);
				const circle = document.createElementNS(svgNS, 'circle');
				circle.setAttribute('cx', String(x));
				circle.setAttribute('cy', String(y));
				circle.setAttribute('r', String(radius - 0.5));
				circle.setAttribute('fill', '#e5e7eb');
				circle.setAttribute('stroke', '#e5e7eb');
				circle.setAttribute('stroke-width', '1');
				svg.appendChild(circle); 					// Draw the note letter (include accidental if present) inside the notehead
					// Prefer the chord root's enharmonic spelling when possible so small-note
					// labels agree with the chord title (e.g., 'Db' vs 'C#').
					let noteLabel = null;
					try {
						const m = String(note).match(/^([A-G])([#b]?)/);
						if (m) {
							const letter = m[1];
							const acc = m[2] || '';
							// If we have a theory engine and a chord-root preference, re-spell
							if (this.musicTheory && typeof this.musicTheory.spellSemitoneWithPreference === 'function') {
								const base = letter + (acc || '');
								const sem = this.musicTheory.noteValues && this.musicTheory.noteValues[base];
								if (typeof sem === 'number') {
									const spelled = this.musicTheory.spellSemitoneWithPreference(sem, preferFlatForThisChord, null);
									noteLabel = spelled;
								}
							}
						}
					} catch (_) { noteLabel = null; }
					if (!noteLabel) {
						const m2 = note.match(/^([A-G][#b]?)/);
						noteLabel = m2 ? m2[1] : String(note);
					}
					const t = document.createElementNS(svgNS, 'text');
					t.setAttribute('x', String(x));
					t.setAttribute('y', String(y));
					t.setAttribute('fill', '#111827');
					t.setAttribute('font-size', '8');
					t.setAttribute('font-weight', '700');
					t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
					t.setAttribute('text-anchor', 'middle');
					t.setAttribute('dominant-baseline', 'middle');
					t.textContent = noteLabel;
					svg.appendChild(t);
					try { smallNoteTexts.push(String(noteLabel)); } catch(_){}
					if (staffPosition < -0.5 || staffPosition > 4.5) {
						drawLedgerLines(svg, x, y, staffPosition, staffMeta, radius);
					}
				});
				// Non-invasive runtime trace: record which small-note labels were written for this chord/bar
				try {
					if (typeof window !== 'undefined' && Array.isArray(window.__interactionLog)) {
						window.__interactionLog.push({ type: 'sheetSmallNoteLabels', barIndex: barIndex, chordLabel: chord && (chord.fullName || (chord.root || '') + (chord.chordType || '')), smallNoteTexts: smallNoteTexts, timestamp: Date.now() });
					}
				} catch (_) { /* non-fatal */ }
			};
				// Capture combined voiced chord and name for this bar
				try { 
					this.state.lastRenderedChords.push(voiced.slice());
					if (!Array.isArray(this.state.lastRenderedChordNames)) this.state.lastRenderedChordNames = [];
					this.state.lastRenderedChordNames.push(chordLabelStr);
				} catch(_){ }

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
            
			// Enhanced inversion logic: vary inversions for repeated chords
			let dynamicInversion = this.state.inversion || 0;
			
			// Check for repeated chords and apply inversion variety
			if (this.state.barMode === 'per-bar' && chordsToShow.length > 1) {
				const currentChordName = chord.fullName || `${chord.root}${chord.chordType}`;
				
				// Find previous occurrences of the same chord
				const previousOccurrences = [];
				for (let i = 0; i < barIndex; i++) {
					const prevChord = chordsToShow[i];
					if (prevChord) {
						const prevChordName = prevChord.fullName || `${prevChord.root}${prevChord.chordType}`;
						if (prevChordName === currentChordName) {
							previousOccurrences.push(i);
						}
					}
				}
				
				// Apply inversion variety for repeated chords (deterministic)
				if (previousOccurrences.length > 0) {
					const maxPossibleInv = Math.min(3, (rawNotes.length || 1) - 1);
					
					// Use a deterministic pattern that creates good voice leading
					const inversionPattern = [0, 1, 2, 1]; // Root, 1st, 2nd, 1st, repeat...
					const patternIndex = previousOccurrences.length % inversionPattern.length;
					dynamicInversion = Math.min(maxPossibleInv, inversionPattern[patternIndex]);
					
					console.log(`[SheetMusic] Chord ${currentChordName} repeated (occurrence ${previousOccurrences.length + 1}), using inversion ${dynamicInversion}`);
				}
			}
			
			// Apply inversion by rotating the stack (keep musical order)
			const maxInv = Math.max(0, Math.min((rawNotes.length || 1) - 1, dynamicInversion));
			const invNotes = rawNotes.length ? rawNotes.slice(maxInv).concat(rawNotes.slice(0, maxInv)) : rawNotes;
            
            // Apply key signature spelling to each note (without reordering)
			const notesWithSpelling = invNotes.map(note => convertToKeySignatureSpelling(note));
            
			// Assign octaves in close position so the stack is root→3rd→5th→7th vertically
			let notes = voiceChordClose(notesWithSpelling, staffMeta.clef, this.state.octaveOffset);
			
			// Apply voicing: VL Combos first, then auto, then manual.
			let usedStyle = this.state.voicingStyle;
			// PRIORITY 1: VL Combos (multi-mode) - check FIRST
			if (this.state.voiceLeadingMode === 'multi') {
				const choice = chooseVoiceLeadingCombination.call(this, rawNotes, staffMeta.clef || 'treble');
				notes = choice.notes || notes;
				usedStyle = choice.style || this.state.voicingStyle;
				// Persist continuity for next bars so movement optimization engages
				try { this.previousVoicing = Array.isArray(notes) ? notes.map(n => noteNameToMidi(n)) : null; } catch(_) { this.previousVoicing = null; }
				// Already optimized; don't re-smooth.
			} else if (this.state.autoVoicingAll) {
				var currentBarIndex = barIndex; // expose for chooseAutoVoicing
				const choice = chooseAutoVoicing(notes.slice());
				notes = choice.notes;
				this.state.voicingStyle = choice.style;
				usedStyle = choice.style;
				if (this.state.voiceLeading && this.state.voiceLeadingMode === 'single') notes = applyVoiceLeading(notes);
			} else {
				notes = applyVoicingStyle(notes, this.state.voicingStyle);
				usedStyle = this.state.voicingStyle;
				if (this.state.voiceLeading && this.state.voiceLeadingMode === 'single') notes = applyVoiceLeading(notes);
			}
			// Log per-bar voicing choice for diagnostics (single-staff path)
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetVoicingAppliedSingle',
					details: {
						barIndex,
						staffClef: staffMeta.clef,
						usedStyle,
						voiceLeading: !!this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						voicingLogic: this.state.voicingLogic,
						seed: this.voicingRefreshSeed || 0,
						voicedNotes: notes.slice()
					},
					timestamp: new Date().toISOString()
				});
			} catch(_) {}

			// If melody mode and degree available, enforce target on top voice
			if (this.state.harmonizationMode === 'melody' && Array.isArray(this.state.barDegrees)) {
				const deg = this.state.barDegrees[barIndex];
				if (deg != null) notes = enforceMelodyTop(notes, deg);
			}
            
			const xCenter = staffLeft + (barIndex + 0.5) * barWidth;
			// Slightly larger noteheads to accommodate internal labels
			const radius = 6;

			// Calculate highest note position to avoid ledger line collisions
			let highestStaffPos = -999;
			notes.forEach(note => {
				const pos = noteToStaffPosition(note, staffMeta.clef);
				if (pos > highestStaffPos) highestStaffPos = pos;
			});
			
			// Base chord label position: minimum 8px above staff
			// If notes extend above staff (position > 4), add spacing for ledger lines
			let labelOffsetY = 8;
			if (highestStaffPos > 4.5) {
				// Each staff position is 4px (half of spacing=8), add extra space for ledger lines
				// Plus additional clearance for the notehead and ledger line itself
				const ledgerExtension = (highestStaffPos - 4) * staffMeta.spacing / 2;
				labelOffsetY = ledgerExtension + radius + 12; // note radius + clearance
			}

            // Draw chord name above bar
			const text = document.createElementNS(svgNS, 'text');
			text.setAttribute('x', String(xCenter));
			text.setAttribute('y', String(staffMeta.topY - labelOffsetY));
			text.setAttribute('fill', '#f9fafb');
            text.setAttribute('font-size', '12');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
            text.setAttribute('text-anchor', 'middle');
			const invSuffix = maxInv === 0 ? '' : (maxInv === 1 ? ' (1st inv)' : (maxInv === 2 ? ' (2nd inv)' : ' (3rd inv)'));
			// For single-staff rendering, also trust the stored diatonic chordType
			// Prefer fullName if available (it may contain specific modifiers like 'add6' or 'no5' from the engine)
			let displayFullSingle = chord.fullName || '';
			if (!displayFullSingle) {
				const displayTypeSingle = chord.chordType || '';
				displayFullSingle = `${chord.root || ''}${displayTypeSingle}`;
			}
			const chordLabelStrSingle = displayFullSingle + invSuffix;
			// Auto-scale font size for long chord names
			if (chordLabelStrSingle.length > 15) {
				text.setAttribute('font-size', '10');
			} else if (chordLabelStrSingle.length > 12) {
				text.setAttribute('font-size', '11');
			}
			text.textContent = chordLabelStrSingle;
			text.setAttribute('class', 'sheet-chord-label');
			text.setAttribute('data-bar-index', String(barIndex));
			text.style.cursor = 'pointer';
            svg.appendChild(text);

			// Draw voicing style label below the staff
			const voicingNames = {
				'close': 'Close', 'open': 'Open', 'drop2': 'Drop 2', 'drop3': 'Drop 3',
				'drop2+4': 'Drop 2+4', 'drop3+5': 'Drop 3+5', 'spread': 'Spread',
				'shell': 'Shell', 'shell-no3': 'Shell (no 3)', 'shell-high3': 'Shell (hi 3)',
				'quartal': 'Quartal', 'quintal': 'Quintal', 'cluster': 'Cluster', 'gospel-shell': 'Gospel',
				'gospel-cluster': 'Gospel Clust', 'jazz-rootless': 'Rootless',
				'classical-balanced': 'Balanced', 'add-tensions': 'Tensions'
			};
			const styleName = voicingNames[usedStyle] || usedStyle;
			
			// Calculate lowest note position to avoid collisions below
			let lowestStaffPos = 999;
			notes.forEach(note => {
				const pos = noteToStaffPosition(note, staffMeta.clef);
				if (pos < lowestStaffPos) lowestStaffPos = pos;
			});
			
			// Base label position: minimum 20px below staff bottom line
			// staffPosition 0 is bottom line. Negative is below.
			let bottomLabelOffsetY = 20;
			if (lowestStaffPos < -0.5) {
				// Distance from bottom line (0) is abs(lowestStaffPos) * spacing/2
				const ledgerExtension = Math.abs(lowestStaffPos) * staffMeta.spacing / 2;
				bottomLabelOffsetY = ledgerExtension + radius + 12;
			}
			
			const styleText = document.createElementNS(svgNS, 'text');
			styleText.setAttribute('x', String(xCenter));
			const bottomY = staffMeta.topY + 4 * staffMeta.spacing + bottomLabelOffsetY;
			styleText.setAttribute('y', String(bottomY));
			styleText.setAttribute('fill', '#64748b'); // Slate-500
			styleText.setAttribute('font-size', '10');
			styleText.setAttribute('font-style', 'italic');
			styleText.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
			styleText.setAttribute('text-anchor', 'middle');
			styleText.textContent = styleName;
			svg.appendChild(styleText);
			// Log style label rendering for single staff
			try {
				if (!window.__interactionLog) window.__interactionLog = [];
				window.__interactionLog.push({
					type: 'sheetStyleLabelRendered',
					details: {
						barIndex,
						staffClef: staffMeta.clef,
						labelText: styleName,
						usedStyle,
						voiceLeading: !!this.state.voiceLeading,
						voiceLeadingMode: this.state.voiceLeadingMode,
						vlIntensity: this.state.vlIntensity,
						autoVoicingAll: !!this.state.autoVoicingAll,
						voicingLogic: this.state.voicingLogic,
						voicingStyle: this.state.voicingStyle,
						inversion: this.state.inversion,
						harmonizationMode: this.state.harmonizationMode,
						seed: this.voicingRefreshSeed || 0
					},
					timestamp: new Date().toISOString()
				});
			} catch(_) {}

			// Build voicing order pill (map voiced notes back to chord degrees 1/3/5/7)
			try {
				// Use the canonical chord base (root-position chordNotes or diatonicNotes)
				// for degree lookup so degree numbers remain consistent regardless of inversion.
				const canonicalBase = chord && chord.chordNotes && chord.chordNotes.length ? chord.chordNotes : (chord && chord.diatonicNotes ? chord.diatonicNotes : null);
				const chordTonePcs = Array.isArray(canonicalBase) ? canonicalBase.map(n => pitchClass(convertToKeySignatureSpelling(n))) : [];
				const degreeMap = [1,3,5,7];
				// Sort the final voiced notes by MIDI pitch (lowest -> highest) so the pill
				// reports degree numbers in sounding order rather than the voice array order.
				const notesSorted = notes.slice().sort((a,b) => noteNameToMidi(a) - noteNameToMidi(b));
				const order = notesSorted.map(n => {
					const pc = pitchClass(n);
					const idx = chordTonePcs.findIndex(p => p === pc);
					if (idx >= 0) return degreeMap[idx] || (idx+1);
					return '?';
				});
				let pillText = order.join('-');

				// Determine inversion from the lowest voiced degree
				let inversionLabel = '';
				try {
					const lowest = order.length ? order[0] : null;
					if (lowest === 1) inversionLabel = 'Root pos';
					else if (lowest === 3) inversionLabel = '1st inv';
					else if (lowest === 5) inversionLabel = '2nd inv';
					else if (lowest === 7) inversionLabel = '3rd inv';
					else inversionLabel = '';
				} catch (_) { inversionLabel = ''; }
				const voicingNames = {
					'close': 'Close', 'open': 'Open', 'drop2': 'Drop 2', 'drop3': 'Drop 3',
					'drop2+4': 'Drop 2+4', 'drop3+5': 'Drop 3+5', 'spread': 'Spread',
					'shell': 'Shell', 'shell-no3': 'Shell(no3)', 'shell-high3': 'Shell(hi3)',
					'quartal': 'Quartal', 'quintal': 'Quintal', 'cluster': 'Cluster', 'gospel-shell': 'Gospel',
					'gospel-cluster': 'Gospel Clust', 'jazz-rootless': 'Rootless',
					'classical-balanced': 'Balanced', 'add-tensions': 'Tensions'
				};
				if (usedStyle && usedStyle !== 'close') {
					pillText += ` (${voicingNames[usedStyle] || usedStyle})`;
				}
				// Append inversion info
			if (inversionLabel) pillText += ` · ${inversionLabel}`;
			// Draw pill a bit below the style label
			const pillY = bottomY + 6;
			drawVoicingPill(xCenter, pillY, pillText, { fill: '#374151', textColor: '#f3f4f6', fontSize: 10 });
		} catch (e) { /* non-fatal */ }			// Capture voiced chord for this bar (once per chord, not per note)
			try { 
				this.state.lastRenderedChords.push(notes.slice()); 
				if (!Array.isArray(this.state.lastRenderedChordNames)) this.state.lastRenderedChordNames = [];
				this.state.lastRenderedChordNames.push(chordLabelStrSingle);
			} catch(_){ }

			// Keep notes in root position (as provided, not sorted)
			const _smallNoteTexts_local = [];
			// Determine accidental preference from chord root so labels match chord title
			let preferFlatForThisChord_local = null;
			try {
				if (chord && chord.root && this.musicTheory) {
					const rt = String(chord.root || '');
					if (rt.indexOf('b') >= 0) preferFlatForThisChord_local = true;
					else if (rt.indexOf('#') >= 0) preferFlatForThisChord_local = false;
				}
			} catch(_) { preferFlatForThisChord_local = null; }

			notes.forEach((note, idx) => {
				// Use staff-aware positioning (note already has octave number)
				const staffPosition = noteToStaffPosition(note, staffMeta.clef);
				const y = staffPositionToY(staffPosition, staffMeta);
				const x = xCenter + (idx - (notes.length - 1) / 2) * (radius * 2.2);
                
				const circle = document.createElementNS(svgNS, 'circle');
				circle.setAttribute('cx', String(x));
				circle.setAttribute('cy', String(y));
				circle.setAttribute('r', String(radius));
				circle.setAttribute('fill', '#d1d5db');
				circle.setAttribute('stroke', '#d1d5db');
				circle.setAttribute('stroke-width', '1.2');
				svg.appendChild(circle);

				// Draw the note label inside head (letter + accidental if present)
				let noteLabel = null;
				try {
					const m = String(note).match(/^([A-G])([#b]?)/);
					if (m) {
						const letter = m[1];
						const acc = m[2] || '';
						if (this.musicTheory && typeof this.musicTheory.spellSemitoneWithPreference === 'function') {
							const base = letter + (acc || '');
							const sem = this.musicTheory.noteValues && this.musicTheory.noteValues[base];
							if (typeof sem === 'number') {
								const spelled = this.musicTheory.spellSemitoneWithPreference(sem, preferFlatForThisChord_local, null);
								noteLabel = spelled;
							}
						}
					}
				} catch(_) { noteLabel = null; }
				if (!noteLabel) {
					const m2 = note.match(/^([A-G][#b]?)/);
					noteLabel = m2 ? m2[1] : String(note);
				}
				const t = document.createElementNS(svgNS, 'text');
				t.setAttribute('x', String(x));
				t.setAttribute('y', String(y));
				t.setAttribute('fill', '#111827');
				t.setAttribute('font-size', '8');
				t.setAttribute('font-weight', '700');
				t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
				t.setAttribute('text-anchor', 'middle');
				t.setAttribute('dominant-baseline', 'middle');
				t.textContent = noteLabel;
				svg.appendChild(t);
				try { _smallNoteTexts_local.push(String(noteLabel)); } catch(_){}
                
				// Add ledger lines if needed (notes above/below staff)
				if (staffPosition < -0.5 || staffPosition > 4.5) {
					drawLedgerLines(svg, x, y, staffPosition, staffMeta, radius);
				}
			});
			// Non-invasive runtime trace: record small-note labels for this bar/chord
			try {
				if (typeof window !== 'undefined' && Array.isArray(window.__interactionLog)) {
					window.__interactionLog.push({ type: 'sheetSmallNoteLabels', barIndex: barIndex, chordLabel: chord && (chord.fullName || (chord.root || '') + (chord.chordType || '')), smallNoteTexts: _smallNoteTexts_local, timestamp: Date.now() });
				}
			} catch (_) { /* non-fatal */ }
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
						const barIndex = idx; // direct positional mapping
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

		// Attach chord label click listeners for audition + piano popup
		try {
			const labels = svg.querySelectorAll('.sheet-chord-label');
			labels.forEach(lbl => {
				lbl.addEventListener('click', (e) => {
					const idx = parseInt(lbl.getAttribute('data-bar-index'), 10);
					if (!isNaN(idx)) { 
						try { 
							this.playSingleChord(idx);
							this.showChordPianoPopup(idx, e);
						} catch(err){ console.warn(err); } 
					}
				});
				lbl.addEventListener('mouseenter', ()=>{ lbl.setAttribute('fill', '#bae6fd'); });
				lbl.addEventListener('mouseleave', ()=>{ lbl.setAttribute('fill', '#ffffff'); });
			});
		} catch(e) { /* non-fatal */ }

		// Post-process ledger lines: ensure there's enough top padding so ledger lines above
		// the treble staff aren't clipped or cramped. If any ledger line sits too close
		// to the top of the SVG, shift the whole drawing down and increase the SVG height.
		try {
			const ledgerEls = svg.querySelectorAll('.ledger-line');
			if (ledgerEls && ledgerEls.length) {
				let minY = Infinity;
				ledgerEls.forEach(l => {
					const y = parseFloat(l.getAttribute('y1')) || parseFloat(l.getAttribute('y2')) || 0;
					if (!isNaN(y)) minY = Math.min(minY, y);
				});
				const desiredTopMargin = 12; // pixels of breathing room above highest ledger
				if (minY !== Infinity && minY < desiredTopMargin) {
					const delta = desiredTopMargin - minY;
					// Move all existing children into a wrapper group translated down by delta
					const allChildren = Array.from(svg.childNodes);
					const g = document.createElementNS(svgNS, 'g');
					g.setAttribute('transform', `translate(0, ${delta})`);
					allChildren.forEach(n => g.appendChild(n));
					svg.appendChild(g);
					// Increase svg height and viewBox to preserve bottom spacing
					const newHeight = svgHeight + delta;
					svg.setAttribute('height', String(newHeight));
					svg.setAttribute('viewBox', `0 0 ${width} ${newHeight}`);
				}
			}
		} catch (e) {
			// Non-fatal; if DOM methods unavailable, skip gracefully
			console.warn('Ledger post-process skipped:', e);
		}

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

		// Bitwig button availability (disable if client/server missing)
		const bitwigBtn = this.controlsContainer && this.controlsContainer.querySelector('#send-bitwig-btn');
		if (bitwigBtn) {
			const available = (typeof window !== 'undefined' && window.BitwigMidi);
			bitwigBtn.disabled = !available;
			bitwigBtn.style.opacity = available ? '1' : '0.5';
			bitwigBtn.title = available ? 'Send rendered progression to Bitwig MIDI server' : 'Bitwig MIDI client not loaded';
		}
		const outputSelect = this.controlsContainer && this.controlsContainer.querySelector('#bitwig-midi-output-select');
		if (outputSelect) {
			const available = (typeof window !== 'undefined' && window.BitwigMidi);
			if (!available) {
				outputSelect.disabled = true;
				outputSelect.style.opacity = '0.5';
			} else if (outputSelect.options.length <= 1) {
				// Trigger initial population if still empty and client now available
				try { setTimeout(()=>{ if (window.BitwigMidi && outputSelect.options.length <= 1) {
					const evt = new Event('click');
					const refreshBtn = this.controlsContainer.querySelector('button[title="Refresh available MIDI outputs from server"]');
					if (refreshBtn) refreshBtn.dispatchEvent(evt);
				}}, 300); } catch(_){ }
			}
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

// Debug helper: analyze voicing results in console or return structured info
if (typeof window !== 'undefined') {
	window.SheetMusicVoicingDebug = {
		analyze: function(chordObj, voicedNotes, usedStyle, opts = {}) {
			// chordObj: { root, chordNotes, diatonicNotes }
			// voicedNotes: array of strings like ['C4','E4','G4']
			// usedStyle: string style name
			const music = window && window.__musicTheoryInstance ? window.__musicTheoryInstance : null;
			const convert = (n) => {
				try { if (music && typeof music.spellSemitoneWithPreference === 'function') return n; } catch(_){}
				return n;
			};
			const base = chordObj && chordObj.chordNotes && chordObj.chordNotes.length ? chordObj.chordNotes : (chordObj && chordObj.diatonicNotes ? chordObj.diatonicNotes : []);
			const chordTonePcs = base.map(n => {
				try { return (window.SheetMusicGenerator && window.SheetMusicGenerator.prototype && window.SheetMusicGenerator.prototype.pitchClass) ? window.SheetMusicGenerator.prototype.pitchClass(n) : null; } catch(_) { return null; }
			});
			// Fallback pitchClass implementation
			const pitchClassLocal = (noteName) => {
				const nv = (window.__musicTheory && window.__musicTheory.noteValues) || {};
				const m = String(noteName).match(/^([A-G][#b]?)/);
				const base = m ? m[1] : noteName;
				const v = nv[base];
				return (typeof v === 'number') ? (v % 12) : null;
			};
			const chordPcs = base.map(n => pitchClassLocal(n));
			const order = voicedNotes.map(n => {
				const pc = pitchClassLocal(n);
				const idx = chordPcs.findIndex(p => p === pc);
				if (idx >= 0) return [1,3,5,7][idx] || (idx+1);
				return '?';
			});
			const lowest = order.length ? order[0] : null;
			const inversion = lowest === 1 ? 'Root pos' : lowest === 3 ? '1st inv' : lowest === 5 ? '2nd inv' : lowest === 7 ? '3rd inv' : 'unknown';
			return {
				baseNotes: base,
				voicedNotes: voicedNotes.slice(),
				order,
				inversion,
				style: usedStyle,
				voiceLeading: !!opts.voiceLeading
			};
		}
	};

	// Choose among multiple voicing styles AND inversions to minimize movement from
	// previous voicing, while really exploring different voicing types when
	// VL Combos are enabled.
	// Returns { notes, style, inversion, score }
	function chooseVoiceLeadingCombination(rawNotes, clef = 'treble') {
		if (!Array.isArray(rawNotes) || rawNotes.length === 0) {
			return { notes: rawNotes.slice(), style: this.state && this.state.voicingStyle, inversion: 0 };
		}
		// Include ALL available voicing styles so VL Combos explores the full palette,
		// not just the intelligent logic subset
		const candidateStyles = [
			'close',
			'open',
			'drop2',
			'drop3',
			'drop2+4',
			'drop3+5',
			'spread',
			'shell',
			'quartal',
			'quintal',
			'cluster',
			'gospel-shell',
			'gospel-cluster',
			'jazz-rootless',
			'classical-balanced',
			'add-tensions'
		];
		const preferredNonClose = candidateStyles.filter(s => s !== 'close');
		// Remember the user-selected base style so VL Combos ensures it shows
		// up in at least one chord of the progression.
		const baseStyle = (this && this.state && this.state.voicingStyle) ? this.state.voicingStyle : 'close';
		let best = null;
		const maxInv = Math.max(0, Math.min(rawNotes.length - 1, 3));
		// Intensity controls how hard we push toward minimal movement vs. allowing
		// wider, more varied voicings.
		const intensity = (this && this.state && this.state.vlIntensity != null) ? this.state.vlIntensity : 0.5;
		// Dramatically reduce movement penalty at low intensity so style variety can compete
		const moveScale = 0.15 + 0.85 * intensity; // 0.15x at loose, 1.0x at max
		const spanScale = 2.0 - intensity;         // strong span reward when looser
		// At low intensity, we strongly prefer non-close styles so you
		// visually get different shapes even if movement is slightly higher.
		const preferNonClose = intensity < 0.7;
		// v2: seeded shuffle of styles to iterate
		let __styleOrder = candidateStyles.slice();
		try {
			if (this && this.state && this.state.vlCombosVariant === 'v2') {
				let ss = Math.max(0.0001, ((typeof this.voicingRefreshSeed === 'number' ? this.voicingRefreshSeed : 0.5) % 1));
				const rnd = () => { ss = (ss * 9301 + 49297) % 233280; return (ss / 233280); };
				for (let i = __styleOrder.length - 1; i > 0; i--) {
					const j = Math.floor(rnd() * (i + 1));
					const tmp = __styleOrder[i]; __styleOrder[i] = __styleOrder[j]; __styleOrder[j] = tmp;
				}
				// ensure non-close kickoff when loose
				if (intensity < 0.7) {
					const iClose = __styleOrder.indexOf('close');
					if (iClose === 0) {
						const swapWith = __styleOrder.findIndex(s => s !== 'close');
						if (swapWith > 0) { const tmp2 = __styleOrder[0]; __styleOrder[0] = __styleOrder[swapWith]; __styleOrder[swapWith] = tmp2; }
					}
				}
			}
		} catch(_) { __styleOrder = candidateStyles.slice(); }

		for (const style of __styleOrder) {
			// v2 hard constraints: skip evaluating styles that should be excluded now
			try {
				if (this && this.state && this.state.vlCombosVariant === 'v2') {
					// Skip base dropdown style after it has been included once
					if (style === baseStyle && this._baseStyleIncludedOnce === true) {
						continue;
					}
					// On first bar (no last style yet) and loose intensity, skip 'close' entirely
					if (!this._lastVLStyle && intensity < 0.7 && style === 'close') {
						continue;
					}
				}
			} catch(_) {}
			for (let inv = 0; inv <= maxInv; inv++) {
				try {
					const invNotes = rawNotes.length ? rawNotes.slice(inv).concat(rawNotes.slice(0, inv)) : rawNotes.slice();
					// Use instance methods for helper functions that may not be in scope
					const spelled = invNotes.map(n => {
						if (this._convertToKeySignatureSpelling) return this._convertToKeySignatureSpelling(n);
						return n; // fallback
					});
					let cand = this._voiceChordClose ? this._voiceChordClose(spelled, clef, this.state ? this.state.octaveOffset : 0) : spelled;
					cand = this._applyVoicingStyle ? this._applyVoicingStyle(cand, style) : cand;
					// Compute movement score versus previousVoicing (lower movement = better)
					const candMidi = cand.map(n => {
						if (this._noteNameToMidi) return this._noteNameToMidi(n);
						// Fallback MIDI conversion
						const noteMap = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
						const m = String(n).match(/^([A-G])([#b]?)(\d+)$/);
						if (!m) return 60;
						const oct = parseInt(m[3],10);
						const semi = noteMap[m[1]]||0;
						const acc = m[2]==='#'?1:m[2]==='b'?-1:0;
						return (oct+1)*12+semi+acc;
					}).slice().sort((a,b)=>a-b);
					let move = 0;
					if (this && Array.isArray(this.previousVoicing) && this.previousVoicing.length) {
						const prev = this.previousVoicing.slice().sort((a,b)=>a-b);
						const L = Math.min(prev.length, candMidi.length);
						for (let i=0;i<L;i++) move += Math.abs(prev[i] - candMidi[i]);
						// Penalty for voice count mismatch
						move += Math.abs(prev.length - candMidi.length) * 6;
					} else {
						// For the first chord, treat span as a rough proxy for movement.
						const span0 = candMidi.length ? candMidi[candMidi.length-1] - candMidi[0] : 0;
						move = span0 * 0.15;
					}
					// Span of the candidate (register width)
					const span = candMidi.length ? candMidi[candMidi.length-1] - candMidi[0] : 0;
					// Base score: penalize movement, gently reward span at low intensity.
					let score = -move * moveScale + span * 0.12 * spanScale;

					// Style-diversity bonus: strongly encourage trying a different style from the
					// last chosen one. This bonus must be large enough to overcome small movement
					// differences so VL Combos actually uses multiple voicing types.
					try {
						if (this && this._lastVLStyle) {
							if (style !== this._lastVLStyle) {
								// Large bonus at low intensity so Randomize + VL Combos
								// really hops styles across the progression.
								score += (8.0 - 4.0 * intensity);
							} else {
								// v2: forbid exact consecutive repeat
								score -= 1000;
							}
						}
					} catch(_) {}

					// First-bar guard: when no prior style exists and intensity is relatively loose,
					// avoid selecting 'close' as the initial style so the user immediately sees variety.
					try {
						if ((!this || !this._lastVLStyle) && preferNonClose && style === 'close') {
							// Apply a strong penalty so a non-close candidate wins unless movement is drastically worse.
							score -= 20.0;
						}
					} catch(_) {}

					// Global preference: when intensity is loose, strongly push away from 'close'.
					// This penalty must be strong enough to overcome movement advantages.
					if (preferNonClose && style === 'close') {
						score -= (10.0 - 5.0 * intensity);
					}

					// Multi-mode: reduce dominance of the dropdown style; allow at most once.
					try {
						if (style === baseStyle) {
							const antiBase = (preferNonClose ? (8.0 - 4.0 * intensity) : (3.0 - 1.5 * intensity));
							score -= Math.max(0.5, antiBase);
							if (!this._baseStyleIncludedOnce) {
								// Small allowance to include base style once if it can win
								score += 0.8;
							}
						}
					} catch(_) {}

					// Larger random tie-breaker controlled by refresh seed so Randomize
					// clicks produce clearly different style combinations.
					const refreshSeed = (this && typeof this.voicingRefreshSeed === 'number') ? this.voicingRefreshSeed : 0;
					const randFactor = (Math.random() - 0.5) * ((refreshSeed || 0.7)) * 12;
					score += randFactor;
					if (!best || score > best.score) {
						best = { notes: cand, style, inversion: inv, score };
					}
				} catch (e) { /* non-fatal */ }
			}
		}
		// Remember which style we ended up preferring so the next chord's
		// search can bias toward variety.
		try {
			if (this && best && best.style) this._lastVLStyle = best.style;
				if (this && best && best.style === baseStyle) this._baseStyleIncludedOnce = true;
		} catch(_) {}
		return best || { notes: rawNotes.slice(), style: this.state && this.state.voicingStyle, inversion: 0 };
	}
}

// ===== Extend prototype with MIDI playback & export helpers =====
if (typeof SheetMusicGenerator !== 'undefined') {
	SheetMusicGenerator.prototype.playMidiFromRendered = function(options = {}) {
		const tempo = options.tempo || 120; // BPM
		const ppq = 480;
		const chords = Array.isArray(this.state.lastRenderedChords) ? this.state.lastRenderedChords : [];
		if (!chords.length) { console.warn('No rendered chords to play.'); return; }
		// Init audio context
		if (!this._audioCtx) {
			try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ console.warn('AudioContext unavailable', e); return; }
		}
        if (this._audioCtx.state === 'suspended') {
            this._audioCtx.resume();
        }
		this.stopMidiPlayback();
		this._midiSources = [];
		this._isPlayingMidi = true;
		const secondsPerBeat = 60 / tempo;
		const beatsPerMeasure = 4;
		const chordDuration = secondsPerBeat * 0.9; // chord plays for 90% of one beat (quarter note)
		const measureDur = beatsPerMeasure * secondsPerBeat;
		const startTime = this._audioCtx.currentTime + 0.05;
		chords.forEach((voices, barIdx) => {
			const chordStart = startTime + barIdx * secondsPerBeat; // chords on each beat
			const chordEnd = chordStart + chordDuration;
			voices.forEach(note => {
				const m = String(note).match(/^([A-G][#b]?)(\d+)$/);
				if (!m) return;
				const letter = m[1]; const oct = parseInt(m[2],10);
				const midiMap = {C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11};
				const semitone = midiMap[letter] ?? 0;
				const midi = (oct + 1)*12 + semitone;
				// Piano-like tone with smooth envelope to prevent clicks
				const osc = this._audioCtx.createOscillator();
				const gain = this._audioCtx.createGain();
				osc.type = 'triangle'; // softer than sine
				osc.frequency.value = 440 * Math.pow(2, (midi - 69)/12);
				osc.connect(gain).connect(this._audioCtx.destination);
				// Smooth exponential envelope prevents clicks/buzzing
				const attack = 0.015, decay = 0.1, sustain = 0.2, release = 0.3;
				gain.gain.setValueAtTime(0.001, chordStart); // start near zero
				gain.gain.exponentialRampToValueAtTime(0.35, chordStart + attack);
				gain.gain.exponentialRampToValueAtTime(sustain, chordStart + attack + decay);
				gain.gain.setValueAtTime(sustain, chordEnd - release);
				gain.gain.exponentialRampToValueAtTime(0.001, chordEnd);
				osc.start(chordStart);
				osc.stop(chordEnd + 0.05);
				this._midiSources.push(osc);
			});
		});
	};

	SheetMusicGenerator.prototype.stopMidiPlayback = function() {
		if (Array.isArray(this._midiSources)) {
			this._midiSources.forEach(src => { try { src.stop(); } catch(_){} });
		}
		this._midiSources = [];
		this._isPlayingMidi = false;
	};

	// Build a simple Format 0 MIDI file from rendered chords
	SheetMusicGenerator.prototype.buildMidiFile = function(opts = {}) {
		const tempo = opts.tempo || 120; // BPM
		const ppq = opts.ppq || 480;
		const chords = Array.isArray(this.state.lastRenderedChords) ? this.state.lastRenderedChords : [];
		if (!chords.length) throw new Error('No rendered chords to export');
		const microPerQuarter = Math.round(60000000 / tempo);
		const events = [];
		const beatsPerMeasure = 4;
		const ticksPerBeat = ppq;
		const measureTicks = beatsPerMeasure * ticksPerBeat;
		const chordNames = Array.isArray(this.state.lastRenderedChordNames) ? this.state.lastRenderedChordNames : [];
		// VLQ encoder
		const vlq = (num) => {
			const bytes = [];
			let value = num >>> 0;
			bytes.push(value & 0x7F);
			value >>= 7;
			while (value > 0) { bytes.unshift((value & 0x7F) | 0x80); value >>= 7; }
			return bytes;
		};
		let currentTick = 0;
		// Tempo
		events.push({ delta: 0, data: [0xFF,0x51,0x03,(microPerQuarter>>16)&0xFF,(microPerQuarter>>8)&0xFF,microPerQuarter&0xFF] });
		// Track name
		try {
			const nameParts = [];
			if (this.state.key) nameParts.push(this.state.key);
			if (this.state.scale) nameParts.push(this.state.scale);
			if (this.state.voicingStyle) nameParts.push(this.state.voicingStyle);
			const tn = nameParts.join(' ');
			if (tn) {
				const bytes = Array.from(tn).map(c=>c.charCodeAt(0)&0x7F);
				events.push({ delta: 0, data: [0xFF,0x03, bytes.length, ...bytes] });
			}
		} catch(_){}
		// Time signature 4/4 (nn=4 dd=2 => 2^2=4)
		events.push({ delta: 0, data: [0xFF,0x58,0x04, 0x04, 0x02, 0x18, 0x08] });
		// Key signature
		try {
			const ksMap = {C:0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,'F':-1,'Bb':-2,'Eb':-3,'Ab':-4,'Db':-5,'Gb':-6,'Cb':-7};
			let sf = 0;
			if (this.state.key && ksMap[this.state.key] != null) sf = ksMap[this.state.key];
			let mi = 0; // 0 major, 1 minor
			if (this.state.scale && /(minor|aeolian|dorian|phrygian|locrian|harmonic|melodic)/i.test(this.state.scale)) mi = 1;
			events.push({ delta: 0, data: [0xFF,0x59,0x02, sf & 0xFF, mi] });
		} catch(_){}
		// Voicing style marker
		if (this.state.voicingStyle) {
			const vsBytes = Array.from(this.state.voicingStyle).map(c=>c.charCodeAt(0)&0x7F);
			events.push({ delta: 0, data: [0xFF,0x06, vsBytes.length, ...vsBytes] });
		}
		
		// Enhanced grading metadata preservation
		try {
			if (this.musicTheory && typeof this.musicTheory.gradingMode === 'string') {
				// Add grading mode as metadata
				const gradingModeText = `Grading:${this.musicTheory.gradingMode}`;
				const gradingBytes = Array.from(gradingModeText).map(c=>c.charCodeAt(0)&0x7F);
				events.push({ delta: 0, data: [0xFF,0x06, gradingBytes.length, ...gradingBytes] });
				
				// Add grading version for future compatibility
				const versionText = 'GradingVersion:1.0';
				const versionBytes = Array.from(versionText).map(c=>c.charCodeAt(0)&0x7F);
				events.push({ delta: 0, data: [0xFF,0x06, versionBytes.length, ...versionBytes] });
			}
		} catch(_) {}
		// Chords
		chords.forEach((voices, barIdx) => {
			const startTick = barIdx * measureTicks;
			const endTick = startTick + measureTicks;
			const deltaToStart = startTick - currentTick;
			// Optional measure marker with chord name
			let consumedStartDelta = false;
			if (barIdx < chordNames.length) {
				const nm = chordNames[barIdx];
				if (nm) {
					const nmBytes = Array.from(nm).map(c=>c.charCodeAt(0)&0x7F);
					events.push({ delta: deltaToStart, data: [0xFF,0x06, nmBytes.length, ...nmBytes] });
					currentTick = startTick;
					consumedStartDelta = true;
				}
			}
			
			// Add grading information for this chord/measure
			try {
				if (this.musicTheory && typeof this.musicTheory.calculateElementGrade === 'function' && 
					typeof this.musicTheory.getGradingTierInfo === 'function' && barIdx < chordNames.length) {
					
					const chordName = chordNames[barIdx];
					if (chordName) {
						// Calculate grading for this chord
						const context = {
							key: this.state.key || 'C',
							scaleType: this.state.scale || 'major',
							elementType: 'chord',
							barIndex: barIdx
						};
						
						const tier = this.musicTheory.calculateElementGrade(chordName, context);
						const tierInfo = this.musicTheory.getGradingTierInfo(tier);
						
						// Add grading metadata as MIDI marker
						const gradingText = `Grade:${tier}:${tierInfo.name}:${tierInfo.color}`;
						const gradingBytes = Array.from(gradingText).map(c=>c.charCodeAt(0)&0x7F);
						const gradingDelta = consumedStartDelta ? 0 : deltaToStart;
						events.push({ delta: gradingDelta, data: [0xFF,0x06, gradingBytes.length, ...gradingBytes] });
						
						if (!consumedStartDelta) {
							currentTick = startTick;
							consumedStartDelta = true;
						}
					}
				}
			} catch(_) {}
			let first = true;
			voices.forEach(n => {
				const m = String(n).match(/^([A-G][#b]?)(\d+)$/);
				if (!m) return;
				const letter = m[1]; const oct = parseInt(m[2],10);
				const midiMap = {C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11};
				const semitone = midiMap[letter] ?? 0;
				const midi = (oct + 1)*12 + semitone;
				const startDelta = first ? (consumedStartDelta ? 0 : deltaToStart) : 0;
				events.push({ delta: startDelta, data: [0x90, midi & 0x7F, 0x60] });
				first = false;
			});
			currentTick = startTick;
			// Note-offs simultaneous
			let offFirst = true;
			voices.forEach(n => {
				const m = String(n).match(/^([A-G][#b]?)(\d+)$/);
				if (!m) return;
				const letter = m[1]; const oct = parseInt(m[2],10);
				const midiMap = {C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11};
				const semitone = midiMap[letter] ?? 0;
				const midi = (oct + 1)*12 + semitone;
				const deltaToEnd = endTick - currentTick;
				events.push({ delta: offFirst ? deltaToEnd : 0, data: [0x80, midi & 0x7F, 0x00] });
				offFirst = false;
			});
			currentTick = endTick;
		});
		// End of track
		events.push({ delta: 0, data: [0xFF,0x2F,0x00] });
		// Build bytes
		const trackBytes = [];
		events.forEach(ev => { trackBytes.push(...vlq(ev.delta), ...ev.data); });
		const trackLen = trackBytes.length;
		const header = [0x4D,0x54,0x68,0x64, 0x00,0x00,0x00,0x06, 0x00,0x00, 0x00,0x01, (ppq>>8)&0xFF, ppq&0xFF];
		const trackHeader = [0x4D,0x54,0x72,0x6B, (trackLen>>24)&0xFF, (trackLen>>16)&0xFF, (trackLen>>8)&0xFF, trackLen&0xFF];
		const all = new Uint8Array(header.length + trackHeader.length + trackBytes.length);
		all.set(header,0); all.set(trackHeader, header.length); all.set(trackBytes, header.length+trackHeader.length);
		return all;
	};

	SheetMusicGenerator.prototype.saveMidiFile = function(opts={}) {
		try {
			// Generate smart filename based on current parameters
			if (!opts.filename) {
				const parts = [];
				const chordNames = Array.isArray(this.state.lastRenderedChordNames) ? this.state.lastRenderedChordNames : [];
				
				// Add key and scale
				if (this.state.key) {
					const keyPart = this.state.key.replace('#', 's').replace('b', 'f'); // C# -> Cs, Bb -> Bf
					parts.push(keyPart);
				}
				if (this.state.scale) {
					const scaleName = this.state.scale.toLowerCase();
					parts.push(scaleName);
				}
				
				// Add voicing style if not default
				const voicing = this.state.voicingStyle || 'close';
				if (voicing !== 'close') {
					const voicingShort = voicing.replace('voicing', '').replace('position', '').replace(/\s+/g, '-').trim();
					parts.push(voicingShort);
				}
				
				// Add progression info if available
				if (this.state.harmonizationMode) {
					const mode = this.state.harmonizationMode;
					if (mode === 'progression' && this.state.progressionComplexity) {
						parts.push(`prog-${this.state.progressionComplexity}`);
					} else if (mode === 'melody') {
						parts.push('melody-harm');
					} else if (mode === 'degrees') {
						parts.push('degrees');
					}
				}
				
				// Add inversion if not root position
				if (this.state.inversion && this.state.inversion > 0) {
					parts.push(`inv${this.state.inversion}`);
				}

				// Add chord range summary if we have names
				if (chordNames.length) {
					const first = chordNames[0].replace(/\s+\(.+?inv\)/,'').replace(/[^A-Za-z0-9#b]+/g,'');
					const last = chordNames[chordNames.length-1].replace(/\s+\(.+?inv\)/,'').replace(/[^A-Za-z0-9#b]+/g,'');
					if (first && last) parts.push(`${first}_to_${last}`);
					parts.push(`${chordNames.length}bars`);
				}

				// Tempo if provided in opts
				if (opts.tempo) parts.push(`${opts.tempo}bpm`);
				
				// Add timestamp to make unique
				const now = new Date();
				const timestamp = `${now.getMonth()+1}${now.getDate()}_${now.getHours()}${String(now.getMinutes()).padStart(2,'0')}`;
				
				opts.filename = parts.length > 0 
					? `${parts.join('_')}_${timestamp}.mid`
					: `progression_${timestamp}.mid`;
			}
			
			const bytes = this.buildMidiFile(opts);
			const blob = new Blob([bytes], { type: 'audio/midi' });
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = opts.filename;
			document.body.appendChild(a);
			a.click();
			setTimeout(()=>{ try { document.body.removeChild(a); } catch(_){} }, 50);
		} catch(e) {
			console.error('Failed to save MIDI:', e);
		}
	};

	// Play a single chord (by bar index) immediately
	SheetMusicGenerator.prototype.playSingleChord = function(barIndex, options = {}) {
		const tempo = options.tempo || 120;
		const sustainBeats = options.sustainBeats || 2; // short preview
		const chords = Array.isArray(this.state.lastRenderedChords) ? this.state.lastRenderedChords : [];
		if (!chords.length) return;
		if (barIndex < 0 || barIndex >= chords.length) return;
		const voices = chords[barIndex];
		if (!voices || !voices.length) return;
		if (!this._audioCtx) {
			try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ console.warn('AudioContext unavailable', e); return; }
		}
		// Stop any ongoing chord preview (not full sequence)
		if (this._previewSources) this._previewSources.forEach(s=>{ try { s.stop(); } catch(_){} });
		this._previewSources = [];
		const secondsPerBeat = 60 / tempo;
		const dur = sustainBeats * secondsPerBeat;
		const t0 = this._audioCtx.currentTime + 0.02;
		voices.forEach(note => {
			const m = String(note).match(/^([A-G][#b]?)(\d+)$/);
			if (!m) return;
			const letter = m[1]; const oct = parseInt(m[2],10);
			const midiMap = {C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11};
			const semitone = midiMap[letter] ?? 0;
			const midi = (oct + 1)*12 + semitone;
			const osc = this._audioCtx.createOscillator();
			const gain = this._audioCtx.createGain();
			osc.type = 'triangle';
			osc.frequency.value = 440 * Math.pow(2, (midi - 69)/12);
			osc.connect(gain).connect(this._audioCtx.destination);
			// Smooth exponential envelope
			const attack = 0.015, decay = 0.08, sustain = 0.25, release = 0.25;
			gain.gain.setValueAtTime(0.001, t0);
			gain.gain.exponentialRampToValueAtTime(0.5, t0 + attack);
			gain.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
			gain.gain.setValueAtTime(sustain, t0 + Math.max(0, dur - release));
			gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
			osc.start(t0);
			osc.stop(t0 + dur + 0.05);
			this._previewSources.push(osc);
		});
	};

	// Return an array of chord objects suitable for BitwigMidi.playProgression.
	// Each element: { notes: [ 'C4','E4','G4' ... ], duration_beats: 4 }
	SheetMusicGenerator.prototype.getBarMidiNotes = function(options = {}) {
		const defaultBeats = options.duration_beats || 4;
		const chords = Array.isArray(this.state.lastRenderedChords) ? this.state.lastRenderedChords : [];
		return chords.map(arr => ({ notes: arr.slice(), duration_beats: defaultBeats }));
	};

	// Send currently rendered progression (bars) to Bitwig via the external MIDI microservice
	SheetMusicGenerator.prototype.sendProgressionToBitwig = async function(options = {}) {
		try {
			if (typeof window === 'undefined' || !window.BitwigMidi) {
				console.warn('BitwigMidi client unavailable. Ensure bitwig-midi.js is loaded.');
				return { ok: false, reason: 'client_missing' };
			}
			const bpm = options.bpm || 96;
			const velocity = options.velocity || 90;
			const channel = options.channel || 0;
			const progression = this.getBarMidiNotes({ duration_beats: options.duration_beats || 4 });
			if (!progression.length) {
				console.warn('No progression (no rendered chords) to send.');
				return { ok: false, reason: 'empty' };
			}
			// Attempt auto-select of MIDI output if not yet selected (best-effort)
			try {
				if (!this._bitwigOutputSelected) {
					const outs = await window.BitwigMidi.listOutputs();
					// Heuristic: prefer one containing 'MusicTheoryApp' or first available
					const preferred = outs.outputs && outs.outputs.find(n => /MusicTheoryApp/i.test(n)) || (outs.outputs && outs.outputs[0]);
					if (preferred) {
						await window.BitwigMidi.selectOutput(preferred);
						this._bitwigOutputSelected = preferred;
					}
				}
			} catch(e){ console.warn('Auto-select MIDI output failed', e); }
			const resp = await window.BitwigMidi.playProgression(progression, bpm, velocity, channel);
			return { ok: true, response: resp };
		} catch (e) {
			console.error('Failed sending progression to Bitwig:', e);
			return { ok: false, error: e };
		}
	};

	// Show popup piano visualizer when clicking chord label
	SheetMusicGenerator.prototype.showChordPianoPopup = function(barIndex, clickEvent) {
		const chords = Array.isArray(this.state.lastRenderedChords) ? this.state.lastRenderedChords : [];
		if (!chords.length || barIndex < 0 || barIndex >= chords.length) return;
		const voices = chords[barIndex];
		if (!voices || !voices.length) return;

		// Remove any existing popup
		const existing = document.getElementById('sheet-chord-piano-popup');
		if (existing) existing.remove();

		// Create popup container
		const popup = document.createElement('div');
		popup.id = 'sheet-chord-piano-popup';
		popup.style.position = 'fixed';
		popup.style.zIndex = '10000';
		popup.style.background = 'rgba(26, 26, 26, 0.95)';
		popup.style.border = '2px solid #444';
		popup.style.borderRadius = '12px';
		popup.style.padding = '16px';
		popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
		popup.style.opacity = '0';
		popup.style.transform = 'scale(0.8)';
		popup.style.transition = 'all 0.2s ease-out';
		popup.style.pointerEvents = 'auto';
		popup.style.fontFamily = 'system-ui, "Segoe UI", Arial, sans-serif';

		// Title / chord name
		try {
			const chordNames = Array.isArray(this.state.lastRenderedChordNames) ? this.state.lastRenderedChordNames : [];
			if (barIndex < chordNames.length) {
				const title = document.createElement('div');
				title.textContent = chordNames[barIndex];
				title.style.fontWeight = '600';
				title.style.fontSize = '14px';
				title.style.marginBottom = '8px';
				popup.appendChild(title);
			}
		} catch(_){}

		// Close button
		const closeBtn = document.createElement('button');
		closeBtn.textContent = '×';
		closeBtn.style.position = 'absolute';
		closeBtn.style.top = '4px';
		closeBtn.style.right = '8px';
		closeBtn.style.background = 'transparent';
		closeBtn.style.border = 'none';
		closeBtn.style.color = '#aaa';
		closeBtn.style.fontSize = '18px';
		closeBtn.style.cursor = 'pointer';
		closeBtn.addEventListener('mouseenter', ()=> closeBtn.style.color = '#fff');
		closeBtn.addEventListener('mouseleave', ()=> closeBtn.style.color = '#aaa');
		closeBtn.addEventListener('click', ()=> { try { popup.remove(); } catch(_){} });
		popup.appendChild(closeBtn);

		// Initial provisional position near click (will adjust below if pinned)
		let x = clickEvent ? clickEvent.clientX : window.innerWidth / 2;
		let y = clickEvent ? clickEvent.clientY : window.innerHeight / 2;
		popup.style.left = `${Math.min(x, window.innerWidth - 400)}px`;
		popup.style.top = `${Math.max(20, y - 100)}px`;

		// Create mini piano keyboard
		const pianoContainer = document.createElement('div');
		pianoContainer.style.display = 'flex';
		pianoContainer.style.gap = '2px';
		pianoContainer.style.position = 'relative';
		pianoContainer.style.height = '80px';

		// Convert note to MIDI number
		const noteToMidi = (note) => {
			const m = String(note).match(/^([A-G][#b]?)(\d+)$/);
			if (!m) return null;
			const letter = m[1];
			const oct = parseInt(m[2], 10);
			const midiMap = {C:0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11};
			const semitone = midiMap[letter] ?? 0;
			return (oct + 1) * 12 + semitone;
		};

		// Get MIDI range and interval coloring
		const midiNotes = voices.map(noteToMidi).filter(m => m !== null);
		const rootMidi = midiNotes[0];
		const intervalName = (m) => {
			const semis = (m - rootMidi + 120) % 12;
			switch (semis) {
				case 0: return 'Root';
				case 1: return 'b2';
				case 2: return '2';
				case 3: return 'm3';
				case 4: return '3';
				case 5: return '4';
				case 6: return 'b5/#11';
				case 7: return '5';
				case 8: return 'b6/#13';
				case 9: return '6/13';
				case 10: return 'b7';
				case 11: return '7';
				default: return '';
			}
		};
		const intervalColor = (m) => {
			const semis = (m - rootMidi + 120) % 12;
			if (semis === 0) return '#fca5a5'; // root light red
			if (semis === 3 || semis === 4) return '#2dd4bf'; // third bright teal
			if (semis === 7) return '#fcd34d'; // fifth bright gold
			if (semis === 10 || semis === 11) return '#c4b5fd'; // seventh light purple
			return '#93c5fd'; // tensions light blue
		};
		const minMidi = Math.min(...midiNotes) - 3;
		const maxMidi = Math.max(...midiNotes) + 3;
		const activeSet = new Set(midiNotes);

		// Draw piano keys (spanning whole chord range)
		const startMidi = Math.floor(minMidi / 12) * 12; // start at C
		const endMidi = Math.ceil(maxMidi / 12) * 12 + 12;
		const whitePcs = [0,2,4,5,7,9,11];
		const totalOctaves = Math.max(1, Math.ceil((endMidi - startMidi) / 12));
		const totalWhiteKeys = totalOctaves * 7;
		pianoContainer.style.width = `${totalWhiteKeys * 20}px`;

		for (let midi = startMidi; midi < endMidi; midi++) {
			const pc = midi % 12;
			const isBlack = [1,3,6,8,10].includes(pc);
			const isActive = activeSet.has(midi);

			const key = document.createElement('div');
			key.style.position = isBlack ? 'absolute' : 'relative';
			key.style.width = isBlack ? '12px' : '18px';
			key.style.height = isBlack ? '50px' : '80px';
			const baseActiveColor = intervalColor(midi);
			key.style.background = isActive 
				? (isBlack ? `linear-gradient(180deg, ${baseActiveColor} 0%, ${baseActiveColor} 90%)` : `linear-gradient(180deg, ${baseActiveColor} 0%, ${baseActiveColor} 85%)`)
				: (isBlack ? 'linear-gradient(180deg, #4b5563 0%, #374151 100%)' : 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)');
			key.style.border = isBlack ? '1px solid #000' : '1px solid #999';
			key.style.borderRadius = isBlack ? '0 0 4px 4px' : '0 0 6px 6px';
			key.style.boxShadow = isActive 
				? `0 0 14px ${baseActiveColor}AA, inset 0 2px 4px rgba(255,255,255,0.3)`
				: (isBlack ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'inset 0 2px 4px rgba(255,255,255,0.5)');
			key.style.zIndex = isBlack ? '2' : '1';

			// Label active white keys with interval + note
			if (!isBlack && isActive) {
				const lab = document.createElement('div');
				lab.style.position = 'absolute';
				lab.style.bottom = '-16px';
				lab.style.left = '0';
				lab.style.width = '100%';
				lab.style.fontSize = '10px';
				lab.style.fontWeight = '600';
				lab.style.textAlign = 'center';
				lab.style.color = baseActiveColor;
				lab.textContent = intervalName(midi);
				key.appendChild(lab);
			}

			if (isBlack) {
				// Position black key across entire keyboard, not just first octave
				const octaveIndex = Math.floor((midi - startMidi) / 12);
				const whiteBeforeInOctave = whitePcs.filter(n => n < pc).length;
				const whiteIndexGlobal = octaveIndex * 7 + whiteBeforeInOctave;
				key.style.left = `${(whiteIndexGlobal * 20) - 6}px`;
			}

			pianoContainer.appendChild(key);
		}

		popup.appendChild(pianoContainer);
		document.body.appendChild(popup);

		// Reposition popup to avoid covering sheet music and chord titles.
		try {
			const staffRect = this.svgContainer ? this.svgContainer.getBoundingClientRect() : null;
			const rect = popup.getBoundingClientRect();
			const margin = 10;
			if (this.state.popupPinned && staffRect) {
				// Pin to chosen anchor (top-right by default) just outside staff area
				let left = staffRect.right - rect.width - margin;
				let top = staffRect.top - rect.height - margin; // place above
				if (top < margin) top = staffRect.bottom + margin; // fallback below if no space
				if (left < margin) left = margin;
				if (left + rect.width > window.innerWidth - margin) left = window.innerWidth - rect.width - margin;
				if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
				popup.style.left = `${Math.round(left)}px`;
				popup.style.top = `${Math.round(top)}px`;
			} else {
				// Floating mode: center horizontally relative to click but ensure not overlapping chord label region
				let left = x - rect.width / 2;
				left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
				// Try above click first
				let top = y - rect.height - margin;
				// If overlapping staff (labels near top of staffRect) then move above staffRect or below click
				if (staffRect && top + rect.height > staffRect.top && top < staffRect.bottom) {
					top = staffRect.top - rect.height - margin;
				}
				if (top < margin) top = y + margin; // fallback below click
				if (staffRect && top < staffRect.bottom && top > staffRect.top) {
					// still overlapping; push below staff
					top = staffRect.bottom + margin;
				}
				if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
				popup.style.left = `${Math.round(left)}px`;
				popup.style.top = `${Math.round(top)}px`;
			}
		} catch(_) {}

		// Hover pause logic
		let hideTimer;
		const scheduleHide = () => {
			hideTimer = setTimeout(() => {
				popup.style.opacity = '0';
				popup.style.transform = 'scale(0.8)';
				setTimeout(() => { try { popup.remove(); } catch(_){} }, 220);
			}, 1800);
		};
		popup.addEventListener('mouseenter', () => { if (hideTimer) clearTimeout(hideTimer); });
		popup.addEventListener('mouseleave', () => { scheduleHide(); });

		// Animate in
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				popup.style.opacity = '1';
				popup.style.transform = 'scale(1)';
			});
		});
		scheduleHide();
	};
}

