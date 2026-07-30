/**
 * composition-controls.js
 *
 * Generate something, then change one thing about it and hear only that.
 *
 * The ladder gives a sensible baseline in one dial, but a dial can only move
 * along its own axis: there is no position on it that means "plain I–IV–V–I,
 * but with approach chords" or "everything except modulation". For learning
 * what a device actually DOES, that combination is the whole exercise — you
 * want the same piece twice, differing in exactly one thing.
 *
 * So each rung gets a three-state control:
 *
 *   AUTO   follow the ladder (the default, shown with what the ladder decided)
 *   ON     force this device on regardless of the dial
 *   OFF    force it off regardless of the dial
 *
 * Every change re-runs the generator with the SAME SEED, so the progression,
 * the form, the melody's contour and every other decision stay put and the
 * only difference you hear is the one you just made. That is what makes the
 * change attributable, and it is the reason this is a separate control from
 * "generate again".
 */

(function () {
    'use strict';

    const PANEL_ID = 'composition-controls-panel';

    function ladder() {
        return (typeof HarmonyComplexity !== 'undefined') ? HarmonyComplexity.LADDER : [];
    }

    function overrides() {
        if (typeof window === 'undefined') return {};
        if (!window.__harmonyOverrides) window.__harmonyOverrides = {};
        return window.__harmonyOverrides;
    }

    function lastMusic() {
        return (typeof window !== 'undefined') ? window.__lastMusicGenerated : null;
    }

    class CompositionControls {
        constructor() {
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
                padding: 8px 12px; background: #14213d; border-bottom: 1px solid #0f3460;
                user-select: none;
            `;
            const caret = document.createElement('span');
            caret.textContent = '▶';
            caret.style.cssText = 'color:#a78bfa; transition: transform .15s;';
            const title = document.createElement('span');
            title.innerHTML = '<strong style="color:#c4b5fd;">🎛 Adjust this take</strong>';
            const hint = document.createElement('span');
            hint.style.cssText = 'margin-left:auto; color:#64748b; font-size:10px;';
            hint.textContent = 'same seed — change one thing at a time';
            header.append(caret, title, hint);

            const body = document.createElement('div');
            body.style.cssText = 'max-height:0; overflow:hidden; transition:max-height .2s ease;';

            header.addEventListener('click', () => {
                const open = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';
                body.style.maxHeight = open ? '0px' : '70vh';
                body.style.overflowY = open ? 'hidden' : 'auto';
                caret.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
                if (!open) this.render();
            });

            panel.append(header, body);
            this.panel = panel;
            this.body = body;

            // Mounted as a sibling above the sheet: the sheet wipes its own
            // container on every render and would delete anything inside it.
            const host = document.getElementById('sheet-music-container');
            if (host && host.parentNode) host.parentNode.insertBefore(panel, host);
            else document.body.appendChild(panel);
        }

        attach() {
            document.addEventListener('musicGenerated', () => {
                if (this.body && this.body.style.maxHeight !== '0px' && this.body.style.maxHeight !== '') {
                    this.render();
                }
            });
        }

        /** Re-run with the same seed so only the changed device differs. */
        regenerate(reason) {
            if (typeof window.regenerateLastGeneration === 'function') {
                const ok = window.regenerateLastGeneration(reason);
                if (!ok) this.note('Generate something first.');
            }
        }

        note(msg) {
            if (!this._note) return;
            this._note.textContent = msg;
            clearTimeout(this._noteTimer);
            this._noteTimer = setTimeout(() => { if (this._note) this._note.textContent = ''; }, 2500);
        }

        render() {
            if (!this.body) return;
            this.body.innerHTML = '';
            const music = lastMusic();
            const cx = (typeof window !== 'undefined' && window.__arcComplexity) || {};
            const level = Number.isFinite(cx.harmony) ? cx.harmony : (Number.isFinite(cx.color) ? cx.color : 0.35);
            const gate = (typeof HarmonyComplexity !== 'undefined') ? HarmonyComplexity.gate(level) : null;
            const ov = overrides();

            if (!music) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:10px 12px; color:#64748b;';
                empty.textContent = 'Generate a piece first, then adjust it here.';
                this.body.appendChild(empty);
                return;
            }

            this.body.appendChild(this.renderTextureRow(music));
            this.body.appendChild(this.renderFormRow(music));
            this.body.appendChild(this.renderDeviceList(gate, ov));
            this.body.appendChild(this.renderFooter());
        }

        /**
         * Piano or choir. These are different crafts — one has two hands and an
         * accompaniment, the other has four independent voices and no
         * accompaniment at all — so this switches the whole texture engine
         * rather than tweaking a parameter.
         */
        renderTextureRow(music) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b; display:flex; gap:8px; align-items:center; flex-wrap:wrap;';
            const lab = document.createElement('span');
            lab.innerHTML = '<strong style="color:#c4b5fd;">🎹 Texture</strong>';
            wrap.appendChild(lab);

            const current = (typeof window !== 'undefined' && window.__textureMode) || 'piano';
            [['piano', 'Pianistic', 'Left-hand accompaniment patterns under a right-hand melody, with the '
                + 'texture thickening and thinning across the form.'],
             ['satb', 'SATB (choral)', 'Four independent voices, one line each, all sustaining. '
                + 'Soprano carries the melody; alto, tenor and bass share the lower staff.']]
            .forEach(([val, text, tip]) => {
                const b = document.createElement('button');
                b.textContent = text;
                b.title = tip;
                const active = current === val;
                b.style.cssText = `
                    background:${active ? '#c4b5fd' : 'transparent'};
                    color:${active ? '#0f172a' : '#c4b5fd'};
                    border:1px solid #c4b5fd; border-radius:4px;
                    padding:3px 10px; font-size:11px; cursor:pointer; font-weight:bold;
                `;
                b.addEventListener('click', () => {
                    window.__textureMode = val;
                    try { localStorage.setItem('textureMode', val); } catch (_) {}
                    this.regenerate('texture:' + val);
                    this.render();
                });
                wrap.appendChild(b);
            });

            const p = music && music.piano;

            // Which VOICE carries the tune. Soprano-on-top is one choral
            // texture among several — a cantus firmus lives in the tenor, and
            // an alto lead puts the melody inside the texture rather than above
            // it — so this is a real choice, not a detail.
            if ((window.__textureMode || 'piano') === 'satb') {
                const sel = document.createElement('select');
                sel.style.cssText = 'background:#0f172a; border:1px solid #334155; color:#e2e8f0; border-radius:4px; padding:3px 6px; font-size:11px;';
                [['auto', 'Lead: auto (varies by section)'],
                 ['soprano', 'Lead: soprano'], ['alto', 'Lead: alto'],
                 ['tenor', 'Lead: tenor (cantus firmus)'], ['bass', 'Lead: bass']]
                .forEach(([v, t]) => {
                    const o = document.createElement('option');
                    o.value = v; o.textContent = t;
                    sel.appendChild(o);
                });
                sel.value = (typeof window !== 'undefined' && window.__satbLead) || 'auto';
                sel.addEventListener('change', () => {
                    window.__satbLead = sel.value;
                    try { localStorage.setItem('satbLead', sel.value); } catch (_) {}
                    this.regenerate('satb-lead:' + sel.value);
                    this.render();
                });
                wrap.appendChild(sel);
            }

            const info = document.createElement('span');
            info.style.cssText = 'color:#64748b; font-size:10px;';
            if (p) {
                const patterns = () => Object.values(p.sections || {})
                    .map(x => x.name).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
                if (p.mode === 'satb') {
                    info.textContent = Object.entries(p.lead || {}).map(x => x[0] + ':' + x[1]).join(' · ');
                } else if (p.mode === 'piano-voicing') {
                    // Say which voicing is sounding, since that is now the thing
                    // the whole texture is built around.
                    info.textContent = `${p.voicingLabel || 'voicing'} held under the melody · ${patterns()}`;
                    info.title = 'The chords are voiced first and played as voiced; the melody is written '
                        + 'above the top voice. The pattern sets when the chord is struck, not which notes.';
                } else {
                    info.textContent = patterns();
                }
            }
            wrap.appendChild(info);
            return wrap;
        }

        /** Form and length — the shape of the piece, changed without retyping. */
        renderFormRow(music) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:9px 12px; border-bottom:1px solid #1e293b; display:flex; gap:8px; align-items:center; flex-wrap:wrap;';

            const lab = document.createElement('span');
            lab.innerHTML = '<strong style="color:#c4b5fd;">🏛 Form</strong>';
            wrap.appendChild(lab);

            const sel = document.createElement('select');
            sel.style.cssText = 'background:#0f172a; border:1px solid #334155; color:#e2e8f0; border-radius:4px; padding:3px 6px; font-size:11px;';
            const forms = (typeof FormPlanner !== 'undefined' && FormPlanner.FORMS) || {};
            const auto = document.createElement('option');
            auto.value = 'auto'; auto.textContent = 'Auto (from the words)';
            sel.appendChild(auto);
            Object.entries(forms).forEach(([k, f]) => {
                const o = document.createElement('option');
                o.value = k; o.textContent = f.name;
                sel.appendChild(o);
            });
            const cur = (typeof window !== 'undefined' && window.__formOverride && window.__formOverride.form) || 'auto';
            sel.value = cur;
            sel.addEventListener('change', () => {
                if (typeof window.recomposeLastGeneration === 'function') {
                    window.recomposeLastGeneration(sel.value);
                }
            });
            wrap.appendChild(sel);

            const form = music.context && music.context.form;
            if (form) {
                const info = document.createElement('span');
                info.style.cssText = 'color:#64748b; font-size:10px;';
                info.textContent = `${form.bars} bars · ${form.sections.map(s => s.label).join(' ')}`;
                info.title = form.description || '';
                wrap.appendChild(info);
            }
            return wrap;
        }

        /**
         * One row per rung: what it teaches, whether it is currently on, and
         * whether that is the ladder's doing or yours.
         */
        renderDeviceList(gate, ov) {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:4px 0;';

            const head = document.createElement('div');
            head.style.cssText = 'padding:6px 12px; color:#94a3b8; font-size:10px;';
            head.innerHTML = 'Each row: <span style="color:#64748b;">AUTO</span> follows the '
                + 'Harmony dial · <span style="color:#34d399;">ON</span> and '
                + '<span style="color:#f87171;">OFF</span> pin it regardless.';
            wrap.appendChild(head);

            ladder().forEach((step) => {
                const ladderOn = gate ? gate.allow[step.key] : true;
                const forced = Object.prototype.hasOwnProperty.call(ov, step.key) && ov[step.key] !== null
                    ? (ov[step.key] ? 'on' : 'off') : 'auto';
                const effective = forced === 'auto' ? ladderOn : forced === 'on';

                const row = document.createElement('div');
                row.style.cssText = `
                    display:flex; align-items:center; gap:8px; padding:5px 12px;
                    border-top:1px solid #14203a;
                    opacity:${effective ? '1' : '0.5'};
                `;

                const dot = document.createElement('span');
                dot.textContent = effective ? '●' : '○';
                dot.style.cssText = `color:${effective ? '#34d399' : '#475569'}; width:10px;`;

                const name = document.createElement('span');
                name.style.cssText = 'flex:1; min-width:0;';
                name.innerHTML = `<span style="color:#e2e8f0;">${step.name}</span>`
                    + `<br><span style="color:#64748b; font-size:10px;">${step.teaches}</span>`;

                const group = document.createElement('div');
                group.style.cssText = 'display:flex; gap:2px;';
                [['auto', 'AUTO', '#94a3b8'], ['on', 'ON', '#34d399'], ['off', 'OFF', '#f87171']]
                    .forEach(([val, text, colour]) => {
                        const b = document.createElement('button');
                        b.textContent = text;
                        const active = forced === val;
                        b.style.cssText = `
                            background:${active ? colour : 'transparent'};
                            color:${active ? '#0f172a' : colour};
                            border:1px solid ${colour}; border-radius:3px;
                            font-size:9px; padding:2px 6px; cursor:pointer; font-weight:bold;
                        `;
                        b.title = val === 'auto'
                            ? `Follow the dial (currently ${ladderOn ? 'on' : 'off'})`
                            : `Force ${text.toLowerCase()} regardless of the dial`;
                        b.addEventListener('click', () => {
                            if (val === 'auto') delete overrides()[step.key];
                            else overrides()[step.key] = (val === 'on');
                            this.persist();
                            this.regenerate(`device:${step.key}=${val}`);
                            this.render();
                        });
                        group.appendChild(b);
                    });

                row.append(dot, name, group);
                wrap.appendChild(row);
            });
            return wrap;
        }

        renderFooter() {
            const foot = document.createElement('div');
            foot.style.cssText = 'padding:8px 12px; border-top:2px solid #0f3460; background:#0b1220; display:flex; gap:8px; align-items:center;';

            const reset = document.createElement('button');
            reset.textContent = 'Reset to dial';
            reset.style.cssText = 'background:#0f3460; border:1px solid #94a3b8; color:#94a3b8; border-radius:4px; padding:3px 10px; font-size:11px; cursor:pointer;';
            reset.title = 'Clear every override and follow the Harmony dial again';
            reset.addEventListener('click', () => {
                if (typeof window !== 'undefined') window.__harmonyOverrides = {};
                this.persist();
                this.regenerate('reset-overrides');
                this.render();
            });

            const newTake = document.createElement('button');
            newTake.textContent = '🎲 New take';
            newTake.style.cssText = 'background:#0f3460; border:1px solid #f59e0b; color:#f59e0b; border-radius:4px; padding:3px 10px; font-size:11px; cursor:pointer;';
            newTake.title = 'Same settings, different seed — a fresh interpretation';
            newTake.addEventListener('click', () => {
                const inputs = window.__lastGenInputs;
                if (!inputs) { this.note('Generate something first.'); return; }
                inputs.seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
                this.regenerate('new-take');
            });

            this._note = document.createElement('span');
            this._note.style.cssText = 'color:#fbbf24; font-size:10px; margin-left:auto;';

            foot.append(reset, newTake, this._note);
            return foot;
        }

        persist() {
            try {
                localStorage.setItem('harmonyOverrides', JSON.stringify(window.__harmonyOverrides || {}));
            } catch (_) {}
        }

        static restore() {
            try {
                const raw = localStorage.getItem('harmonyOverrides');
                if (raw) window.__harmonyOverrides = JSON.parse(raw) || {};
            } catch (_) { window.__harmonyOverrides = {}; }
            try {
                const t = localStorage.getItem('textureMode');
                if (t === 'piano' || t === 'satb') window.__textureMode = t;
                const l = localStorage.getItem('satbLead');
                if (l) window.__satbLead = l;
            } catch (_) {}
        }
    }

    if (typeof window !== 'undefined') {
        window.CompositionControls = CompositionControls;
        CompositionControls.restore();
        const boot = () => {
            if (!window.__compositionControls) window.__compositionControls = new CompositionControls();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    }
})();
