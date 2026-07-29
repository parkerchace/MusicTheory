/**
 * approach-provenance-panel.js
 *
 * An expandable panel that answers "where did that chord come from?".
 *
 * The approach catalog can produce 100+ ways into a single chord, so a chord
 * appearing on the staff is meaningless without its provenance: which scale it
 * was borrowed from, which strategy produced it, and what it is approaching.
 * This panel lists every borrowed run in the current generation, groups the
 * chords of a run together, and lets you audition each one.
 *
 * It also drives the numeric workflow: type a progression like "2 5 1", pick
 * which degree to decorate, and browse/apply real approaches into it.
 */

(function () {
    'use strict';

    const PANEL_ID = 'approach-provenance-panel';

    function mt() {
        return (window.modularApp && window.modularApp.musicTheory) || null;
    }

    function romanToDegreeNum(token) {
        const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };
        const m = String(token || '').trim().match(/^([b#]?)([ivx]+)/i);
        if (m) return map[m[2].toLowerCase()] || null;
        const n = parseInt(String(token), 10);
        return Number.isFinite(n) && n >= 1 && n <= 7 ? n : null;
    }

    class ApproachProvenancePanel {
        constructor() {
            this.lastMusic = null;
            this.numericDegrees = [];
            this.selectedIndex = null;
            this.appliedApproaches = {};
            this.build();
            this.attach();
        }

        build() {
            if (document.getElementById(PANEL_ID)) return;
            const panel = document.createElement('div');
            panel.id = PANEL_ID;
            panel.style.cssText = `
                margin: 8px 0; border: 1px solid #334155; border-radius: 6px;
                background: #0f172a; color: #e2e8f0; font-size: 12px; overflow: hidden;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                display: flex; align-items: center; gap: 8px; cursor: pointer;
                padding: 8px 12px; background: #0f2741; border-bottom: 1px solid #0f3460;
                user-select: none;
            `;
            const caret = document.createElement('span');
            caret.textContent = '▶';
            caret.style.cssText = 'color:#38bdf8; transition: transform .15s;';
            const title = document.createElement('span');
            title.innerHTML = '<strong style="color:#22d3ee;">🔍 Where the chords come from</strong>';
            const count = document.createElement('span');
            count.id = 'approach-prov-count';
            count.style.cssText = 'margin-left:auto; color:#94a3b8;';
            header.appendChild(caret);
            header.appendChild(title);
            header.appendChild(count);

            const body = document.createElement('div');
            body.id = 'approach-prov-body';
            body.style.cssText = 'max-height:0; overflow:hidden; transition: max-height .2s ease;';

            header.addEventListener('click', () => {
                const open = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';
                body.style.maxHeight = open ? '0px' : '60vh';
                body.style.overflowY = open ? 'hidden' : 'auto';
                caret.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
            });

            panel.appendChild(header);
            panel.appendChild(body);
            this.panel = panel;
            this.body = body;
            this.countEl = count;

            // Mount as a SIBLING above the sheet container — the sheet clears
            // its own container on every render, which would delete the panel.
            const sheetHost = document.getElementById('sheet-music-container');
            if (sheetHost && sheetHost.parentNode) {
                sheetHost.parentNode.insertBefore(panel, sheetHost);
            } else {
                document.body.appendChild(panel);
            }
        }

        attach() {
            document.addEventListener('musicGenerated', (e) => {
                this.lastMusic = (e && e.detail) || null;
                this.render();
            });
            document.addEventListener('sheetChordSelected', (e) => {
                const chord = e && e.detail && e.detail.chord;
                if (!chord) return;
                this.highlight(chord);
            });
        }

        /** Group consecutive approach chords that share a strategy into one run. */
        collectRuns() {
            const seq = (this.lastMusic && this.lastMusic.harmony && this.lastMusic.harmony.chordSequence) || [];
            const runs = [];
            let current = null;
            seq.forEach((ev) => {
                if (!ev) return;
                if (!ev.approachStrategy) { current = null; return; }
                if (current && current.strategy === ev.approachStrategy && current.bar === ev.bar) {
                    current.chords.push(ev);
                    return;
                }
                current = {
                    strategy: ev.approachStrategy,
                    family: ev.approachFamily || 'approach',
                    bar: ev.bar,
                    beat: ev.beat,
                    scaleHint: ev.scaleHint || null,
                    explain: ev.explain || null,
                    chords: [ev]
                };
                runs.push(current);
            });
            // Attach the target: the next non-approach chord after the run.
            runs.forEach((run) => {
                const lastIdx = seq.indexOf(run.chords[run.chords.length - 1]);
                for (let i = lastIdx + 1; i < seq.length; i++) {
                    if (seq[i] && !seq[i].approachStrategy) { run.target = seq[i]; break; }
                }
            });
            return runs;
        }

        render() {
            if (!this.body) return;
            this.body.innerHTML = '';
            const runs = this.collectRuns();

            const home = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile) || {};
            const homeLine = document.createElement('div');
            homeLine.style.cssText = 'padding:8px 12px; border-bottom:1px solid #1e293b; color:#94a3b8;';
            homeLine.innerHTML = `Home key: <strong style="color:#e2e8f0;">${home.root || '?'} ${this.pretty(home.recommendedScale)}</strong>`;
            this.body.appendChild(homeLine);

            this.countEl.textContent = runs.length ? `${runs.length} borrowed run${runs.length === 1 ? '' : 's'}` : 'all diatonic';

            if (!runs.length) {
                const none = document.createElement('div');
                none.style.cssText = 'padding:10px 12px; color:#64748b;';
                none.textContent = 'This take stayed inside the home scale — raise the 🎨 Color slider for more borrowing.';
                this.body.appendChild(none);
            }

            // Voicing controls live in the sheet generator's Voicing Options
            // panel only — this panel is about where chords came from.
            runs.forEach((run) => this.body.appendChild(this.renderRun(run)));
            this.body.appendChild(this.renderNumericSection());
        }

        pretty(name) {
            return String(name || '')
                .replace(/_/g, ' ')
                .replace(/\bb(\d+)/g, '♭$1')
                .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
        }

        renderRun(run) {
            const row = document.createElement('div');
            row.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            row.dataset.chords = run.chords.map(c => c.chord).join(',');

            const chordNames = run.chords.map(c => c.chord).join(' → ');
            const targetName = run.target ? run.target.chord : '?';
            const sh = run.scaleHint;

            const head = document.createElement('div');
            head.style.cssText = 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

            const chip = document.createElement('span');
            chip.textContent = run.family;
            chip.style.cssText = `
                background:#1e3a5f; color:#7dd3fc; padding:1px 7px; border-radius:10px;
                font-size:10px; text-transform:uppercase; letter-spacing:.04em;
            `;
            const label = document.createElement('strong');
            label.style.color = '#fbbf24';
            label.textContent = chordNames;
            const arrow = document.createElement('span');
            arrow.style.color = '#94a3b8';
            arrow.textContent = `→ ${targetName}`;

            const play = document.createElement('button');
            play.textContent = '▶';
            play.title = 'Hear this approach run into its target';
            play.style.cssText = `
                margin-left:auto; background:#0f3460; border:1px solid #38bdf8; color:#38bdf8;
                border-radius:4px; cursor:pointer; padding:1px 8px; font-size:11px;
            `;
            play.addEventListener('click', () => this.playRun(run));

            head.appendChild(chip);
            head.appendChild(label);
            head.appendChild(arrow);
            head.appendChild(play);
            row.appendChild(head);

            const detail = document.createElement('div');
            detail.style.cssText = 'margin-top:4px; color:#94a3b8; line-height:1.5;';
            const origin = sh
                ? `Borrowed from <strong style="color:#e2e8f0;">${sh.root} ${this.pretty(sh.scaleName)}</strong>` +
                  (Array.isArray(sh.scaleNotes) && sh.scaleNotes.length
                    ? ` <span style="color:#64748b;">(${sh.scaleNotes.join(' ')})</span>` : '')
                : 'Chromatic — not drawn from a single parent scale';
            detail.innerHTML = `${origin}<br>` +
                `<span style="color:#64748b;">bar ${run.bar + 1}, beat ${run.beat + 1} · strategy <code style="color:#7dd3fc;">${run.strategy}</code></span>` +
                (run.explain ? `<br><em style="color:#a3b8cc;">${run.explain}</em>` : '');
            row.appendChild(detail);
            return row;
        }

        /**
         * Audition a run. Each chord is cut off before the next begins —
         * previously every chord rang for ~1.1s while the next started 0.42s
         * later, so three chords smeared into one cluster and you could not
         * hear the individual voicings.
         */
        playRun(run) {
            const sheet = (window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator;
            if (!sheet || typeof sheet._playSingleNote !== 'function') return;

            const chords = run.chords.slice();
            if (run.target) chords.push(run.target);
            if (!chords.length) return;

            if (!sheet._audioCtx) {
                try { sheet._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
                catch (e) { return; }
            }
            if (sheet._audioCtx.state === 'suspended') sheet._audioCtx.resume();
            if (typeof sheet.stopMidiPlayback === 'function') sheet.stopMidiPlayback();
            if (!Array.isArray(sheet._midiSources)) sheet._midiSources = [];

            const step = 0.55;          // time between chord onsets
            const gap = 0.09;           // silence before the next chord starts
            const start = sheet._audioCtx.currentTime + 0.05;

            chords.forEach((c, i) => {
                const obj = c.chordObj || {};
                const notes = (obj.diatonicNotes && obj.diatonicNotes.length ? obj.diatonicNotes : obj.chordNotes) || [];
                if (!notes.length) return;
                const isTarget = (i === chords.length - 1);
                const t0 = start + i * step;
                // Target rings out; approach chords are clipped short so each
                // one is distinctly audible.
                const t1 = isTarget ? (t0 + 1.5) : (t0 + step - gap);
                notes.forEach((n, ni) => {
                    const raw = String(n || '').trim();
                    if (!raw) return;
                    const named = /-?\d+$/.test(raw) ? raw : (raw + (ni === 0 ? 3 : 4));
                    sheet._playSingleNote(named, t0, t1, isTarget ? 0.26 : 0.2);
                });
            });
        }

        highlight(chordName) {
            if (!this.body) return;
            const rows = this.body.querySelectorAll('[data-chords]');
            rows.forEach((r) => {
                const match = String(r.dataset.chords || '').split(',').includes(chordName);
                r.style.background = match ? 'rgba(56,189,248,0.12)' : '';
                if (match) {
                    this.body.style.maxHeight = '60vh';
                    this.body.style.overflowY = 'auto';
                    r.scrollIntoView({ block: 'nearest' });
                }
            });
        }

        // ---- Numeric progression + approach application ----
        renderNumericSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:10px 12px; border-top:2px solid #0f3460; background:#0b1220;';

            const title = document.createElement('div');
            title.innerHTML = '<strong style="color:#22d3ee;">🎯 Approach a progression</strong>';
            title.style.marginBottom = '6px';
            wrap.appendChild(title);

            const hint = document.createElement('div');
            hint.style.cssText = 'color:#64748b; margin-bottom:6px;';
            hint.textContent = 'Type degrees (e.g. "2 5 1" or "1 4 5"), pick a chord, then choose how to approach it.';
            wrap.appendChild(hint);

            const controls = document.createElement('div');
            controls.style.cssText = 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;';

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '251  ·  1 4 5  ·  ii V I';
            const live = document.getElementById('global-manual-numbers');
            input.value = this.numericDegrees.length
                ? this.numericDegrees.join(' ')
                : ((live && live.value.trim()) || '');
            input.style.cssText = 'width:110px; padding:3px 7px; background:#0f172a; border:1px solid #334155; color:#e2e8f0; border-radius:4px; font-size:12px;';

            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.value = this.numericKey || (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile && this.lastMusic.context.harmonicProfile.root) || 'C';
            keyInput.style.cssText = 'width:48px; padding:3px 7px; background:#0f172a; border:1px solid #334155; color:#e2e8f0; border-radius:4px; font-size:12px;';
            keyInput.title = 'Key';

            const go = document.createElement('button');
            go.textContent = 'Build';
            go.style.cssText = 'background:#0f3460; border:1px solid #10b981; color:#10b981; border-radius:4px; cursor:pointer; padding:3px 12px; font-size:11px; font-weight:bold;';

            controls.appendChild(input);
            controls.appendChild(document.createTextNode('in'));
            controls.appendChild(keyInput);
            controls.appendChild(go);
            wrap.appendChild(controls);

            const result = document.createElement('div');
            result.style.marginTop = '8px';
            wrap.appendChild(result);

            const build = () => {
                const raw = String(input.value || '');
                if (window.NumericProgression) {
                    // Single source of truth: the same parser that drives the
                    // number input, so the panel and the sheet agree.
                    this.numericDegrees = window.NumericProgression.parseDegrees(raw).map(d => d.degree);
                } else {
                    this.numericDegrees = raw.split(/[^a-zA-Z0-9#b]+/).filter(Boolean)
                        .map(romanToDegreeNum).filter(Boolean);
                }
                this.numericKey = (keyInput.value || 'C').trim();
                if (window.NumericProgression) {
                    window.NumericProgression.state.key = this.numericKey;
                    window.NumericProgression.setInput(raw);
                }
                this.renderNumericResult(result);
            };
            go.addEventListener('click', build);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') build(); });
            if (this.numericDegrees.length) this.renderNumericResult(result);

            return wrap;
        }

        renderNumericResult(container) {
            container.innerHTML = '';
            const theory = mt();
            if (!theory || !this.numericDegrees.length) return;

            const key = this.numericKey || 'C';
            const scaleName = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile
                && this.lastMusic.context.harmonicProfile.recommendedScale) || 'major';

            const chords = this.numericDegrees.map((deg) => {
                try { return theory.getDiatonicChord(deg, key, scaleName); } catch (_) { return null; }
            });

            const strip = document.createElement('div');
            strip.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; align-items:center;';

            chords.forEach((c, i) => {
                if (!c) return;
                const applied = this.appliedApproaches[i];
                if (applied) {
                    applied.events.forEach((ev) => {
                        const ap = document.createElement('span');
                        const evAn = (window.NumericProgression && ev.root)
                            ? window.NumericProgression.analyzeInKey(ev.root, ev.chordType, this.numericKey || 'C')
                            : null;
                        ap.innerHTML = evAn
                            ? `<strong>${evAn.roman}</strong> <span style="opacity:.6; font-size:10px;">${ev.fullName}</span>`
                            : ev.fullName;
                        ap.title = applied.explain || applied.id;
                        ap.style.cssText = 'background:#3b2f0b; border:1px solid #fbbf24; color:#fbbf24; padding:3px 8px; border-radius:4px;';
                        strip.appendChild(ap);
                    });
                    const ar = document.createElement('span');
                    ar.textContent = '→';
                    ar.style.color = '#64748b';
                    strip.appendChild(ar);
                }

                const btn = document.createElement('button');
                // Lead with the ROMAN NUMERAL + interval — the function is what
                // matters when choosing an approach; the symbol is secondary.
                const an = (window.NumericProgression && c.root)
                    ? window.NumericProgression.analyzeInKey(c.root, c.chordType, this.numericKey || 'C')
                    : null;
                btn.innerHTML = an
                    ? `<span style="font-size:13px; font-weight:bold;">${an.roman}</span>` +
                      `<span style="opacity:.65; font-size:10px; margin-left:5px;">${an.interval}</span><br>` +
                      `<span style="opacity:.8; font-size:10px;">${c.fullName}</span>`
                    : `${c.fullName}`;
                const isSel = this.selectedIndex === i;
                btn.style.cssText = `
                    background:${isSel ? '#0f3460' : '#111c33'};
                    border:1px solid ${isSel ? '#38bdf8' : '#334155'};
                    color:${isSel ? '#38bdf8' : '#cbd5e1'};
                    padding:3px 10px; border-radius:4px; cursor:pointer; font-size:12px;
                `;
                btn.title = `Degree ${this.numericDegrees[i]} — click to choose an approach into this chord`;
                btn.addEventListener('click', () => {
                    this.selectedIndex = (this.selectedIndex === i) ? null : i;
                    this.renderNumericResult(container);
                });
                strip.appendChild(btn);
            });
            container.appendChild(strip);

            if (this.selectedIndex === null || !chords[this.selectedIndex]) return;
            container.appendChild(this.renderApproachChooser(chords[this.selectedIndex], this.selectedIndex, container));
        }

        renderApproachChooser(targetChord, index, container) {
            const box = document.createElement('div');
            box.style.cssText = 'margin-top:8px; border:1px solid #334155; border-radius:5px; background:#0f172a;';

            if (typeof ApproachEngine === 'undefined' || !mt()) {
                box.textContent = 'Approach engine unavailable.';
                return box;
            }
            const engine = new ApproachEngine(mt());
            const catalog = engine.buildCatalog({
                root: targetChord.root,
                chordType: targetChord.chordType,
                fullName: targetChord.fullName,
                roman: targetChord.roman || String(this.numericDegrees[index])
            }, { maxBeats: 2 });

            const head = document.createElement('div');
            head.style.cssText = 'padding:7px 10px; border-bottom:1px solid #1e293b; display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
            head.innerHTML = `<strong style="color:#fbbf24;">${catalog.length}</strong> <span style="color:#94a3b8;">ways into ${targetChord.fullName}</span>`;

            const famSel = document.createElement('select');
            famSel.style.cssText = 'margin-left:auto; font-size:11px; background:#0f172a; color:#e2e8f0; border:1px solid #334155; border-radius:4px;';
            const families = ['all', ...Array.from(new Set(catalog.map(p => p.family)))];
            families.forEach((f) => {
                const o = document.createElement('option');
                o.value = f; o.textContent = f;
                famSel.appendChild(o);
            });
            head.appendChild(famSel);

            const clear = document.createElement('button');
            clear.textContent = 'clear';
            clear.style.cssText = 'background:#1e293b; border:1px solid #475569; color:#cbd5e1; border-radius:4px; cursor:pointer; padding:2px 8px; font-size:11px;';
            clear.addEventListener('click', () => {
                delete this.appliedApproaches[index];
                this.renderNumericResult(container);
            });
            head.appendChild(clear);
            box.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'max-height:190px; overflow-y:auto;';
            box.appendChild(list);

            const fill = () => {
                list.innerHTML = '';
                const fam = famSel.value;
                catalog
                    .filter(p => fam === 'all' || p.family === fam)
                    .sort((a, b) => a.spice - b.spice)
                    .forEach((plan) => {
                        let events = null;
                        try { events = plan.build(); } catch (_) { events = null; }
                        if (!events || !events.length) return;

                        const item = document.createElement('div');
                        item.style.cssText = 'padding:5px 10px; border-bottom:1px solid #16233b; display:flex; gap:8px; align-items:center;';

                        const names = document.createElement('span');
                        const key = this.numericKey || 'C';
                        const parts = events.map((e) => {
                            const a = (window.NumericProgression && e.root)
                                ? window.NumericProgression.analyzeInKey(e.root, e.chordType, key) : null;
                            return a ? `<strong style="color:#fbbf24;">${a.roman}</strong>` +
                                       `<span style="opacity:.55;">(${e.fullName})</span>` : e.fullName;
                        });
                        names.innerHTML = parts.join(' <span style="opacity:.4;">→</span> ');
                        names.style.cssText = 'color:#e2e8f0; min-width:190px; font-size:11px;';

                        const src = document.createElement('span');
                        const hint = events[0].scaleHint;
                        src.textContent = hint ? `${hint.root} ${this.pretty(hint.scaleName)}` : 'chromatic';
                        src.style.cssText = 'color:#7dd3fc; font-size:11px;';

                        const spice = document.createElement('span');
                        spice.textContent = '🌶'.repeat(Math.max(1, Math.round(plan.spice * 4)));
                        spice.style.cssText = 'font-size:10px; margin-left:auto;';

                        const hear = document.createElement('button');
                        hear.textContent = '▶';
                        hear.style.cssText = 'background:#0f3460; border:1px solid #38bdf8; color:#38bdf8; border-radius:4px; cursor:pointer; padding:0 7px; font-size:11px;';
                        hear.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.playRun({ chords: events.map(ev => ({ chordObj: ev })), target: { chordObj: targetChord } });
                        });

                        const applied = this.appliedApproaches[index];
                        const isApplied = applied && applied.id === plan.id;

                        const use = document.createElement('button');
                        use.textContent = isApplied ? '✓ on sheet' : 'Add to sheet';
                        use.title = isApplied
                            ? 'Applied — click to remove this approach'
                            : `Insert ${events.map(e => e.fullName).join(' → ')} before ${targetChord.fullName} on the sheet`;
                        use.style.cssText = `
                            background:${isApplied ? '#10b981' : '#0f3460'};
                            border:1px solid #10b981;
                            color:${isApplied ? '#04241a' : '#10b981'};
                            border-radius:4px; cursor:pointer; padding:2px 10px;
                            font-size:11px; font-weight:bold; white-space:nowrap;
                        `;
                        use.addEventListener('click', () => {
                            if (isApplied) {
                                delete this.appliedApproaches[index];
                                if (window.NumericProgression) window.NumericProgression.setApproach(index, null);
                            } else {
                                const record = {
                                    id: plan.id,
                                    family: plan.family,
                                    events,
                                    explain: events[0].explain || plan.id
                                };
                                this.appliedApproaches[index] = record;
                                // Actually write it onto the sheet, not just this panel.
                                if (window.NumericProgression) window.NumericProgression.setApproach(index, record);
                                use.textContent = '✓ on sheet';
                            }
                            this.renderNumericResult(container);
                        });
                        if (isApplied) item.style.background = 'rgba(16,185,129,0.10)';

                        item.appendChild(names);
                        item.appendChild(src);
                        item.appendChild(spice);
                        item.appendChild(hear);
                        item.appendChild(use);
                        list.appendChild(item);
                    });
            };
            famSel.addEventListener('change', fill);
            fill();
            return box;
        }
    }

    function init() {
        if (window.__approachProvenancePanel) return;
        try {
            window.__approachProvenancePanel = new ApproachProvenancePanel();
        } catch (e) {
            console.warn('[ApproachProvenance] init failed', e);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    if (typeof window !== 'undefined') window.ApproachProvenancePanel = ApproachProvenancePanel;
})();
