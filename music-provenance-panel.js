/**
 * music-provenance-panel.js
 *
 * An expandable panel that answers "where did that come from?" — not just for
 * chords. Renamed from approach-provenance-panel.js/"Where the chords come
 * from": the same question applies to a word's disambiguated sense as much
 * as a borrowed chord, and both belong in one place a listener can look
 * things up, rather than splitting explanations between a transient toast
 * and a persistent panel depending on which engine happened to produce them.
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

    const PANEL_ID = 'music-provenance-panel';

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

    class MusicProvenancePanel {
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
            title.innerHTML = '<strong style="color:#22d3ee;">🔍 Where the music comes from</strong>';
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

            // What the words themselves meant, first — everything else in
            // this panel was built FROM that reading, so it comes before the
            // key, the form and the chords rather than after them.
            this.body.appendChild(this.renderWordSensesSection());

            const home = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile) || {};
            const homeLine = document.createElement('div');
            homeLine.style.cssText = 'padding:8px 12px; border-bottom:1px solid #1e293b; color:#94a3b8;';
            const notes = Array.isArray(home.scaleNotes) && home.scaleNotes.length
                ? ` <span style="color:#64748b;">(${home.scaleNotes.join(' ')})</span>` : '';
            homeLine.innerHTML = `Home key: <strong style="color:#e2e8f0;">${home.root || '?'} ${this.pretty(home.recommendedScale)}</strong>${notes}`;
            this.body.appendChild(homeLine);

            this.countEl.textContent = runs.length ? `${runs.length} borrowed run${runs.length === 1 ? '' : 's'}` : 'all diatonic';

            // Most of the chords are the DIATONIC ones — those used to never
            // be listed at all, so the panel only ever explained the
            // exceptions. The progression and its form come first; the
            // borrowed runs are then read as departures from something the
            // reader can actually see.
            this.body.appendChild(this.renderFormSection());
            this.body.appendChild(this.renderExcursionSection());
            this.body.appendChild(this.renderDiatonicSection());
            this.body.appendChild(this.renderMelodySection());
            this.body.appendChild(this.renderTextureSection());

            const runsHead = document.createElement('div');
            runsHead.style.cssText = 'padding:8px 12px; border-top:2px solid #0f3460; background:#0b1220;';
            runsHead.innerHTML = '<strong style="color:#22d3ee;">🎨 Chords borrowed from outside the key</strong>';
            this.body.appendChild(runsHead);

            if (!runs.length) {
                const none = document.createElement('div');
                none.style.cssText = 'padding:10px 12px; color:#64748b;';
                none.textContent = 'This take stayed inside the home scale — raise the 🎨 Color slider for more borrowing.';
                this.body.appendChild(none);
            }

            // Voicing controls live in the sheet generator's Voicing Options
            // panel only — this panel is about where the music came from.
            runs.forEach((run) => this.body.appendChild(this.renderRun(run)));
            this.body.appendChild(this.renderNumericSection());
        }

        /**
         * Which sense a word was read as, when it had more than one on offer
         * — "light" as weight, not brightness — the same kind of provenance
         * this panel already gives a chord, applied one level upstream, to
         * the input the whole piece was built from. Lives here rather than
         * as a toast: a word choice isn't tied to a moment in the music the
         * way a chord or a chromatic note is, so there's no bar for it to
         * flash past — it's context worth having sit still and be read.
         */
        renderWordSensesSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            const senses = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.metadata
                && this.lastMusic.context.metadata.lexical && this.lastMusic.context.metadata.lexical.senseChoices) || [];
            if (!senses.length) { wrap.style.display = 'none'; return wrap; }

            const head = document.createElement('div');
            head.innerHTML = '<strong style="color:#22d3ee;">📖 What the words meant</strong>';
            head.style.marginBottom = '5px';
            wrap.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'color:#94a3b8; font-size:11px; line-height:1.6;';
            list.innerHTML = senses.map((s) =>
                `<strong style="color:#e2e8f0;">"${s.word}"</strong> read as ` +
                `<em style="color:#fbbf24;">${s.gloss}</em>` +
                `<span style="color:#64748b;"> (${this.posName(s.pos)})</span>`
            ).join('<br>');
            wrap.appendChild(list);
            return wrap;
        }

        posName(pos) {
            return { a: 'adjective', n: 'noun', v: 'verb', r: 'adverb' }[pos] || pos || '';
        }

        /** The planned shape: which sections exist and what each one is for. */
        renderFormSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            const form = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.form) || null;
            if (!form || !Array.isArray(form.sections) || !form.sections.length) {
                wrap.style.display = 'none';
                return wrap;
            }
            const head = document.createElement('div');
            head.innerHTML = `<strong style="color:#22d3ee;">🏛 Form</strong> ` +
                `<span style="color:#e2e8f0;">${form.name}</span> ` +
                `<span style="color:#64748b;">· ${form.bars} bars · ${form.unitBars} per section</span>`;
            wrap.appendChild(head);

            const desc = document.createElement('div');
            desc.style.cssText = 'color:#64748b; margin:3px 0 6px;';
            desc.textContent = form.description || '';
            wrap.appendChild(desc);

            const strip = document.createElement('div');
            strip.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap;';
            form.sections.forEach((s) => {
                const chip = document.createElement('span');
                chip.title = `${s.role} · bars ${s.startBar + 1}–${s.endBar + 1} · ${s.cadence} cadence`;
                chip.textContent = `${s.label} ${s.startBar + 1}–${s.endBar + 1}`;
                const hot = s.letter !== 'A';
                chip.style.cssText = `
                    background:${hot ? '#3b2a1e' : '#1e3a5f'}; color:${hot ? '#fbbf24' : '#7dd3fc'};
                    padding:2px 8px; border-radius:10px; font-size:10px; letter-spacing:.03em;
                `;
                strip.appendChild(chip);
            });
            wrap.appendChild(strip);
            return wrap;
        }

        /**
         * WHERE THE MUSIC WENT, AND WHERE IT CAME BACK.
         *
         * A borrowed colour is now a span rather than a chord (see
         * planModalExcursions in arc-ui-init.js), and a span is exactly the
         * thing a per-bar list cannot show: the reader would see three lines
         * that each mention "C Aeolian" and have to infer that they are one
         * gesture. So the excursion gets its own row — source, reading, the
         * bars it occupies and the bar it lands on — above the progression it
         * is a departure from.
         */
        renderExcursionSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            const excursions = (this.lastMusic && this.lastMusic.harmony && this.lastMusic.harmony.excursions) || [];
            if (!excursions.length) { wrap.style.display = 'none'; return wrap; }

            const home = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile) || {};
            const homeLabel = `${home.root || '?'} ${this.pretty(home.recommendedScale)}`;

            const head = document.createElement('div');
            head.innerHTML = '<strong style="color:#22d3ee;">🚪 Where the music left the key — and came back</strong>';
            head.style.marginBottom = '5px';
            wrap.appendChild(head);

            const READING = {
                'modal-interchange': 'the parallel mode, borrowed in quantity',
                'tonicization': 'the borrowed root heard as a tonic of its own'
            };

            const list = document.createElement('div');
            list.style.cssText = 'color:#94a3b8; font-size:11px; line-height:1.7;';
            list.innerHTML = excursions.map((e) => {
                const chords = (e.chords || []).map(c => c.fullName || `${c.root}${c.chordType}`).join(' → ');
                const notes = Array.isArray(e.sourceNotes) && e.sourceNotes.length
                    ? ` <span style="color:#64748b;">(${e.sourceNotes.join(' ')})</span>` : '';
                return `<span style="color:#64748b;">bars ${e.startBar + 1}–${e.endBar + 1}</span> ` +
                    `<strong style="color:#e2e8f0;">${e.label}</strong>${notes}<br>` +
                    `<span style="margin-left:10px; color:#fbbf24;">${chords}</span> ` +
                    `<span style="color:#64748b;">— ${READING[e.reading] || e.reading}; ` +
                    `bar ${e.returnBar + 1} returns to ${homeLabel}</span>`;
            }).join('<br>');
            wrap.appendChild(list);
            return wrap;
        }

        /**
         * Every bar's main chord, with the degree it is and why it is there.
         * A chord being ordinary is itself an explanation — "vi of the home
         * scale" is what the reader needs in order to see that the ♭VI two bars
         * later is a departure.
         */
        renderDiatonicSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';

            const seq = (this.lastMusic && this.lastMusic.harmony && this.lastMusic.harmony.chordSequence) || [];
            const home = (this.lastMusic && this.lastMusic.context && this.lastMusic.context.harmonicProfile) || {};
            const core = seq.filter(ev => ev && !ev.approachStrategy);
            if (!core.length) { wrap.style.display = 'none'; return wrap; }

            const head = document.createElement('div');
            head.innerHTML = '<strong style="color:#22d3ee;">🎼 The progression itself</strong>';
            head.style.marginBottom = '5px';
            wrap.appendChild(head);

            // Which standard progression each section is playing, by DEGREE.
            // "2-5-1" is the point: the second, fifth and first chords of the
            // scale in force, whatever qualities that scale gives them.
            const progs = (this.lastMusic && this.lastMusic.harmony && this.lastMusic.harmony.sectionProgressions) || {};
            const progEntries = Object.entries(progs).filter(([, v]) => v && v.name);
            if (progEntries.length) {
                const list = document.createElement('div');
                list.style.cssText = 'margin-bottom:7px; color:#94a3b8; font-size:11px; line-height:1.6;';
                list.innerHTML = progEntries.map(([label, p]) => {
                    const degs = Array.isArray(p.degrees) && p.degrees.length
                        ? `<code style="color:#fbbf24;">${p.degrees.join('–')}</code> ` : '';
                    return `<strong style="color:#e2e8f0;">${label}</strong>: ${degs}${p.name}`;
                }).join('<br>');
                wrap.appendChild(list);
            }

            // Compositional devices applied on top of that core.
            const devices = (this.lastMusic && this.lastMusic.harmony && this.lastMusic.harmony.devices) || [];
            if (devices.length) {
                const dl = document.createElement('div');
                dl.style.cssText = 'margin-bottom:7px; color:#a3b8cc; font-size:11px; line-height:1.6;';
                dl.innerHTML = devices.map(d =>
                    `<span style="color:#c084fc;">▸</span> bar ${d.bar + 1}: <em>${d.explain}</em>`
                ).join('<br>');
                wrap.appendChild(dl);
            }

            const homePcs = this.pitchClassesOf(home.scaleNotes);

            // One row per bar; a bar restating its chord is one harmonic event.
            const seen = new Set();
            const table = document.createElement('div');
            table.style.cssText = 'display:grid; grid-template-columns:auto auto 1fr; gap:2px 10px; align-items:baseline;';

            core.forEach((ev) => {
                const k = `${ev.bar}|${ev.chord}`;
                if (seen.has(k)) return;
                seen.add(k);

                const barCell = document.createElement('span');
                barCell.style.cssText = 'color:#64748b; font-size:11px;';
                barCell.textContent = `${ev.section ? ev.section + ' · ' : ''}bar ${ev.bar + 1}`;

                const chordCell = document.createElement('span');
                chordCell.style.cssText = 'color:#e2e8f0; font-weight:bold;';
                chordCell.textContent = `${ev.chord}${ev.roman ? ` (${ev.roman})` : ''}`;

                const whyCell = document.createElement('span');
                whyCell.style.cssText = 'color:#94a3b8; font-size:11px;';
                whyCell.innerHTML = ev.explain
                    ? `<em style="color:#fbbf24;">${ev.explain}</em>`
                    : this.diatonicReason(ev, home, homePcs);

                table.appendChild(barCell);
                table.appendChild(chordCell);
                table.appendChild(whyCell);
            });
            wrap.appendChild(table);
            return wrap;
        }

        /**
         * Every melody note that leaves the sounding scale carries a
         * `chromaticReason` naming the exact relationship that licenses it —
         * a chord tone, a leading tone that resolves up into its root. This
         * used to be a toast (queueChordOriginToasts, arc-ui-init.js); it
         * lives here now for the same reason a word's sense does — it isn't
         * tied to a moment the way a fresh chord attack is, and grouping
         * every accidental of the take in one place makes the PATTERN
         * visible (e.g. every one of them resolving upward) in a way a
         * sequence of one-at-a-time toasts never could.
         */
        renderMelodySection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            const notes = ((this.lastMusic && this.lastMusic.melody && this.lastMusic.melody.notes) || [])
                .filter(n => n && typeof n.chromaticReason === 'string' && n.chromaticReason.trim().length);
            if (!notes.length) { wrap.style.display = 'none'; return wrap; }

            const head = document.createElement('div');
            head.innerHTML = '<strong style="color:#22d3ee;">🎵 Why the melody leaves the scale</strong>';
            head.style.marginBottom = '5px';
            wrap.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'color:#94a3b8; font-size:11px; line-height:1.6;';
            list.innerHTML = notes.map((n) =>
                `<span style="color:#64748b;">bar ${(n.bar || 0) + 1}</span> ` +
                `<strong style="color:#e2e8f0;">${n.noteName}</strong> — ` +
                `<em style="color:#fbbf24;">${n.chromaticReason}</em>`
            ).join('<br>');
            wrap.appendChild(list);
            return wrap;
        }

        /**
         * The texture engine has always written an explanation for each of
         * its orchestrational exceptions — descant, tenor lead, crossover,
         * bass melody, covering voice — one per device that changes how the
         * two hands are laid out rather than what chord is sounding. Also
         * moved here from a toast, for the same reason as the melody section
         * above: "the descant takes over for two bars starting here" is
         * something worth being able to look up, not something that needs
         * to be caught as it flashes past.
         */
        renderTextureSection() {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b;';
            const exceptions = ((this.lastMusic && this.lastMusic.piano && this.lastMusic.piano.exceptions) || [])
                .filter(x => x && typeof x.explain === 'string' && x.explain.trim().length);
            if (!exceptions.length) { wrap.style.display = 'none'; return wrap; }

            const head = document.createElement('div');
            head.innerHTML = '<strong style="color:#22d3ee;">🎹 How the texture changes</strong>';
            head.style.marginBottom = '5px';
            wrap.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'color:#94a3b8; font-size:11px; line-height:1.6;';
            list.innerHTML = exceptions
                .slice()
                .sort((a, b) => (Number(a.startBar) || 0) - (Number(b.startBar) || 0))
                .map((x) =>
                    `<span style="color:#64748b;">bar ${(Number(x.startBar) || 0) + 1}</span> ` +
                    `<strong style="color:#e2e8f0;">${this.pretty(x.type)}</strong> — ` +
                    `<em style="color:#fbbf24;">${x.explain}</em>`
                ).join('<br>');
            wrap.appendChild(list);
            return wrap;
        }

        pitchClassesOf(noteNames) {
            const theory = mt();
            const out = new Set();
            (noteNames || []).forEach((n) => {
                const pc = String(n || '').replace(/-?\d+$/, '');
                const v = theory && theory.noteValues ? theory.noteValues[pc] : null;
                if (Number.isFinite(v)) out.add(((v % 12) + 12) % 12);
            });
            return out;
        }

        /**
         * Why an un-annotated chord is where it is.
         *
         * This used to decide "altered" by checking whether the roman
         * numeral's own SPELLING carried a flat or sharp — but roman
         * numerals in this app are spelled relative to the PARALLEL MAJOR
         * scale, so almost any non-major scale's own diatonic chords need
         * one: E Mixolydian ♭6's degree 6 chord reads as "♭VI" because
         * major's 6th isn't flat, not because that chord is borrowed from
         * outside E Mixolydian ♭6 — the flat IS the scale, it's the note the
         * scale is named for. Checking that FIRST meant a scale's own notes
         * were routinely announced as "borrowed in for colour" whenever the
         * scale itself wasn't major, which is what actually was random about
         * it — a listener has no way to tell a real borrowed chord from a
         * mislabelled ordinary one if everything gets called the same thing.
         * Whether the chord's ACTUAL tones are outside the ACTUAL scale is
         * the only version of this question that tells them apart.
         */
        diatonicReason(ev, home, homePcs) {
            const roman = String(ev.roman || '');
            const scaleLabel = `${home.root || '?'} ${this.pretty(home.recommendedScale)}`;
            const degree = romanToDegreeNum(roman);
            const hasAccidental = /[b#]/.test(roman);

            // Does every tone belong to the home scale?
            const tones = (ev.chordObj && (ev.chordObj.chordNotes || ev.chordObj.diatonicNotes)) || [];
            const tonePcs = this.pitchClassesOf(tones);
            let outside = 0;
            tonePcs.forEach(pc => { if (homePcs.size && !homePcs.has(pc)) outside++; });

            if (outside > 0) {
                return `Altered — <strong style="color:#e2e8f0;">${roman}</strong>: ${outside} tone${outside === 1 ? '' : 's'} ` +
                    `${outside === 1 ? 'sits' : 'sit'} outside ${scaleLabel}; borrowed in for colour.`;
            }
            const accidentalNote = hasAccidental
                ? ` — spelled <strong style="color:#e2e8f0;">${roman}</strong> because that degree differs from ` +
                  `the major scale, but every tone of it is native to ${scaleLabel}`
                : '';

            const FUNCTION = {
                1: 'tonic — home, the chord everything else is heard against',
                2: 'supertonic — a pre-dominant, it leans toward V',
                3: 'mediant — shares two tones with the tonic, so it colours rather than moves',
                4: 'subdominant — the step away from home',
                5: 'dominant — the strongest pull back to the tonic',
                6: 'submediant — the tonic\'s relative, used to soften or deceive',
                7: 'leading-tone chord — unstable, it resolves upward to the tonic'
            };
            const fn = degree ? FUNCTION[degree] : null;
            return `Diatonic: degree ${degree || '?'} of <strong style="color:#e2e8f0;">${scaleLabel}</strong>` +
                (fn ? ` — ${fn}` : '') + accidentalNote + '.';
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

            // What the run is FOR. A strategy id alone ("plane:dim7:…") is only
            // meaningful to someone who already knows the catalog; the family
            // says what kind of motion this is, and naming the target says what
            // the whole gesture is aimed at.
            const targetRoman = run.target && run.target.roman ? ` (${run.target.roman})` : '';
            const purpose = `${this.familyMeaning(run.family)} into <strong style="color:#e2e8f0;">${targetName}${targetRoman}</strong>` +
                (run.chords[0] && run.chords[0].intoSection
                    ? ` — the top of section ${run.chords[0].intoSection}` : '');

            detail.innerHTML = `${purpose}<br>${origin}<br>` +
                `<span style="color:#64748b;">bar ${run.bar + 1}, beat ${run.beat + 1} · strategy <code style="color:#7dd3fc;">${run.strategy}</code></span>` +
                (run.explain ? `<br><em style="color:#a3b8cc;">${run.explain}</em>` : '');
            row.appendChild(detail);
            return row;
        }

        /** Plain-language reading of an approach family. */
        familyMeaning(family) {
            switch (String(family || '')) {
                case 'dominant':
                    return 'A dominant-function approach: a V7 (or its tritone sub / backdoor equivalent) resolving';
                case 'planing':
                    return 'Planing: one chord shape slid in parallel toward the target, arriving by half or whole steps';
                case 'pivot':
                    return 'A pivot walk: chords taken from another scale that also contains the target, walking';
                case 'sharedRoot':
                    return 'A shared-root approach: the same root re-coloured by a different scale, resolving';
                case 'chain':
                    return 'A two-step cell (V/V→V, iiø→V7♭9) setting up';
                default:
                    return 'An approach';
            }
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
        if (window.__musicProvenancePanel) return;
        try {
            window.__musicProvenancePanel = new MusicProvenancePanel();
        } catch (e) {
            console.warn('[MusicProvenance] init failed', e);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    if (typeof window !== 'undefined') window.MusicProvenancePanel = MusicProvenancePanel;
})();
