/**
 * @module StudioLooks
 * @description Layout "looks" for the full studio.
 *
 * A look is a reorganization of the studio modules according to an explicit
 * organizing principle (signal flow, abstraction level, instrument, pedagogy...).
 *
 * DESIGN CONTRACT — "og" is sacred:
 *   The original layout is the `og` look. It is implemented as the *absence* of
 *   any override: no module is moved, no zone is shown, and every rule in
 *   studio-looks.css is scoped under body[data-look="<non-og-id>"]. Selecting
 *   `og` restores each module to the exact parent and sibling index it had at
 *   page load. OG renders byte-identically to the pre-looks studio.
 *
 * GEOMETRY LIVES IN CSS, NOT HERE. This file assigns modules to zones;
 * studio-looks.css owns every grid-template-*. The split is deliberate:
 * inline styles cannot be overridden by media queries, so geometry written
 * from JS would be frozen at whatever screen size it was authored for.
 *
 * LAYOUT IS RECONCILED, NOT COMPUTED ONCE. Which modules are actually there
 * changes after a look is applied: the app moves the key/scale controls into
 * the header after this file has run, the instrument dock takes the guitar
 * and gives it back, and "Launch Selected Modules" hides some. apply() places
 * modules; reconcile() decides what is present, numbers the steps, hides
 * empty zones and builds the tabs — and it runs again on launch and on every
 * `studio:modulepresence` event.
 *
 * Modules travel as whole `.studio-module` wrappers, so the inner mount points
 * (#sheet-music-container, #solar-dock-viewport, ...) survive relocation.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'music-theory-look';
    var STATE_KEY = 'music-theory-look-state';   // per-look: last tab, divider split

    /* ==================================================================
       MODULE REGISTRY
       Keyed by the stable inner container id already present in the HTML.
       minW / minH / idealW: measured from each module's own render code —
         circle     scale-circle-explorer.js sizes a square canvas off its width;
                    under 272px it overflows its box
         solar      draws from min(width, height), so it wants a square
         sheet      survives narrow (it scrolls) but is only useful wide
         fretboard  very wide aspect
       They reach the stylesheet as --m-min-w / --m-min-h / --m-ideal-w.
       ================================================================== */
    var SIZE_DEFAULT = { minW: '250px', minH: '180px', idealW: '320px' };
    var MODULES = {
        numgen:    { container: 'number-generator-container',  label: 'Generator',      glyph: '🎲', minW: '260px', minH: '200px',
                     purpose: 'Type a progression as numbers (1 4 5 1)' },
        // The key/scale controls live in the header bar in every look; this
        // module is an empty shell, so no look gives it a place.
        keyscale:  { container: 'scale-library-container',     label: 'Key / Scale',    glyph: '🔑', relocated: 'header', minW: '252px', minH: '190px' },
        circle:    { container: 'scale-circle-container',      label: 'Circle of 5ths', glyph: '🧭', minW: '272px', minH: '336px', idealW: '344px',
                     purpose: 'Every key, and its neighbours a fifth away' },
        chords:    { container: 'container-chord-container',   label: 'Container Chord',glyph: '🎯', minW: '244px', minH: '200px',
                     purpose: 'Find the chords that hold these notes' },
        relations: { container: 'scale-relationship-container',label: 'Scale Relations',glyph: '🌍', minW: '288px', minH: '220px', idealW: '368px',
                     purpose: 'Find the scales that hold this chord' },
        sheet:     { container: 'sheet-music-container',       label: 'Sheet Music',    glyph: '🎼', minW: '336px', minH: '220px', idealW: '560px',
                     purpose: 'The music, written out' },
        solar:     { container: 'solar-dock-viewport',         label: 'Solar System',   glyph: '☀️', minW: '280px', minH: '280px', idealW: '420px',
                     purpose: 'Your scale as orbits around its tonic' },
        grading:   { container: 'grading-key-sidebar',         label: 'Grading Key',    glyph: '🗝️', minW: '208px', minH: '120px', idealW: '280px',
                     purpose: 'What the chord colours mean' },
        fretboard: { container: 'guitar-fretboard-container',  label: 'Fretboard',      glyph: '🎸', minW: '336px', minH: '168px', idealW: '620px',
                     purpose: 'The scale on a guitar neck' },
        chordstrip:{ container: 'mini-chord-strip',            label: 'Chord Strip',    glyph: '▤', bare: true, minW: '200px', minH: '40px', idealW: '100%' }
    };

    var ALL_IDS = Object.keys(MODULES);

    /* ==================================================================
       LOOK MANIFEST — every look is data; see look-schema.js for the format.
       grid     where the zones go, and how that changes on narrower screens
       zones    flow: column | row | rail | drawer | reading | strips | orbit |
                      page | bench | compact | legend | mosaic | tabs | solo
                label, why (one line saying what the zone is for), side, tone,
                height / maxHeight, modules
       divider  { zone, axis: 'x' | 'y' } — a draggable split between zones
       tabs     { bar, panes, default } — the bar zone, the zone whose modules
                become tabs, and the tab shown first
       stage    the module this look is about; it shows its main view first
                (the sheet: staff above its panels, controls folded away)
       claims   instruments this look takes out of the dock
       dock     { height } — the instrument dock's height in this look
       Wireframe previews are drawn from the grid (LookSchema.wireFromGrid);
       only OG, which has no grid, keeps a drawn one.
       ================================================================== */
    var LOOKS = [
        {
            id: 'og',
            name: 'OG',
            tagline: 'The original',
            principle: 'The studio as it was built. Three columns, everything on screen at once, nothing moved.',
            wire: [[4,4,30,20,0],[4,26,30,20,0],[4,48,30,20,0],[36,4,50,40,1],[36,46,50,22,1],[88,4,28,30,0],[88,36,28,32,0]]
        },

        {
            id: 'signal-chain',
            name: 'Signal Chain',
            tagline: 'Data flow, left to right',
            principle: 'Four numbered stages mirroring how a phrase is actually made: source → transform → render → monitor. You read the studio like a patch cable.',
            // Four stages need ~1230px of content; below that, render on top, then 2x2.
            grid: {
                areas: ['a b c d'],
                cols: 'minmax(272px, 0.85fr) minmax(288px, 0.9fr) minmax(336px, 1.6fr) minmax(336px, 0.8fr)',
                rows: 'minmax(0, 1fr)',
                below: [{ width: 1340, areas: ['c c', 'a b', 'd d'], cols: 'minmax(0, 1fr) minmax(0, 1fr)',
                          rows: 'minmax(300px, 1.4fr) minmax(260px, 1fr) auto' }]
            },
            zones: {
                a: { label: '01 · SOURCE',    why: 'A phrase starts in the top bar: type words, press Generate. The circle shows the key it lands in.',
                     modules: ['circle', 'numgen'] },
                b: { label: '02 · TRANSFORM', why: 'Turn material into harmony: chords that hold your notes, scales that hold a chord, the scale as orbits.',
                     modules: ['chords', 'relations', 'solar'] },
                c: { label: '03 · RENDER',    why: 'What comes out: the chords of your key, and the generated score.',
                     modules: ['chordstrip', 'sheet'] },
                d: { label: '04 · MONITOR',   why: 'Check the result: what the chord colours mean, and the notes on a guitar neck.',
                     modules: ['grading', 'fretboard'] }
            }
        },

        {
            id: 'stage-wings',
            name: 'Stage & Wings',
            tagline: 'The score is the work',
            principle: 'Sheet music takes the whole stage. Every other module collapses to a labelled spine on the edges and flies out over the score only when you call for it.',
            stage: 'sheet',
            grid: { areas: ['a b c'], cols: '52px minmax(0, 1fr) 52px', rows: 'minmax(0, 1fr)' },
            zones: {
                a: { label: 'IN',  flow: 'rail', side: 'left',  modules: ['circle', 'numgen'] },
                b: { flow: 'column', modules: ['chordstrip', 'sheet'] },
                c: { label: 'REF', flow: 'rail', side: 'right', modules: ['chords', 'relations', 'solar', 'grading', 'fretboard'] }
            }
        },

        {
            id: 'two-up',
            name: 'Two-Up',
            tagline: 'Question left, answer right',
            principle: 'A hard split between everything that poses a question and everything that shows a result. Drag the divider to weight one side over the other.',
            divider: { zone: 's', axis: 'x' },
            // Both halves must clear their widest member (sheet 336 / relations 288);
            // stacked, the split means nothing and the divider is not placed.
            grid: {
                areas: ['a s b'],
                cols: 'minmax(300px, var(--look-split, 1fr)) 8px minmax(340px, 1fr)',
                rows: 'minmax(0, 1fr)',
                below: [{ width: 1100, areas: ['a', 'b'], cols: 'minmax(0, 1fr)', rows: 'auto auto' }]
            },
            zones: {
                a: { label: 'ASK',    why: 'Tools that pose a question: which chords, which scales, which key.',
                     modules: ['chords', 'relations', 'circle', 'numgen'] },
                b: { label: 'ANSWER', why: 'Where the result shows up: the score, the orbits, the colours, the neck.',
                     modules: ['chordstrip', 'sheet', 'solar', 'grading', 'fretboard'] }
            }
        },

        {
            id: 'console',
            name: 'Console',
            tagline: 'Mixer channel strips',
            principle: 'Every module gets an identical vertical strip with a rotated nameplate, scrolling horizontally. No module outranks another; the piano dock is the master bus.',
            grid: { areas: ['b', 'a'], cols: 'minmax(0, 1fr)', rows: 'auto minmax(0, 1fr)' },
            zones: {
                b: { flow: 'column', maxHeight: '60px', modules: ['chordstrip'] },
                a: { flow: 'strips',  modules: ['sheet', 'circle', 'chords', 'relations', 'solar', 'grading', 'fretboard', 'numgen'] }
            }
        },

        {
            id: 'orrery',
            name: 'Orrery',
            tagline: 'Exploration before output',
            principle: 'The solar visualizer becomes the centre of gravity. Scale, chord and circle tools orbit it at the corners; notation drops to a thin ribbon you glance at rather than stare at.',
            // Satellites clear the circle tool's 272px floor; the top corners get the
            // larger share of the height the orbit spans. Too narrow for satellites
            // either side: orbit on top, tools beneath.
            grid: {
                areas: ['a b c', 'd b e', 'f f f'],
                cols: 'clamp(288px, 21vw, 344px) minmax(0, 1fr) clamp(288px, 21vw, 344px)',
                rows: 'minmax(0, 1.3fr) minmax(0, 0.7fr) auto',
                below: [{ width: 1180, areas: ['b b', 'a c', 'd e', 'f f'], cols: 'minmax(0, 1fr) minmax(0, 1fr)',
                          rows: 'minmax(300px, 46vh) auto auto auto' }]
            },
            zones: {
                a: { modules: ['circle'] },                // alone, so it sizes to its corner
                b: { flow: 'orbit', modules: ['solar'] },
                c: { modules: ['relations', 'grading'] },
                d: { modules: ['numgen'] },
                e: { modules: ['chords'] },
                f: { flow: 'row', label: 'RIBBON', why: 'The score to glance at, not stare at: chords, staff and the neck in one strip.', height: 'clamp(150px, 22vh, 240px)', maxHeight: 'clamp(150px, 22vh, 240px)',
                     modules: ['chordstrip', 'sheet', 'fretboard'] }
            }
        },

        {
            id: 'notation-desk',
            name: 'Notation Desk',
            tagline: 'Engraving mindset',
            principle: 'The page and what changes it — the words and Generate in the top bar, the sheet\'s own controls — stay on the desk. Everything referential goes behind one drawer, so the page keeps page proportions instead of fighting for width.',
            stage: 'sheet',
            grid: { areas: ['b c'], cols: 'minmax(336px, 1fr) 44px', rows: 'minmax(0, 1fr)' },
            zones: {
                b: { flow: 'page', label: 'SCORE', why: 'Change it from the top bar (words, then Generate) and from the sheet\'s Controls.',
                     modules: ['chordstrip', 'sheet'] },
                c: { label: 'REFERENCE', flow: 'drawer', side: 'right', modules: ['circle', 'chords', 'relations', 'solar', 'grading', 'fretboard', 'numgen'] }
            }
        },

        {
            id: 'luthier',
            name: 'Luthier',
            tagline: 'Instrument first, theory second',
            principle: 'For players rather than analysts. The fretboard is promoted to a full-width bench across the top, theory shrinks to a compact rail, and the piano dock grows.',
            claims: ['fretboard'],   // pull the guitar out of the dock and onto the bench
            stage: 'sheet',
            dock: { height: 'clamp(210px, 30vh, 380px)' },
            grid: {
                areas: ['a a', 'b c'],
                cols: 'clamp(288px, 23vw, 344px) minmax(336px, 1fr)',
                rows: 'clamp(200px, 34vh, 330px) minmax(0, 1fr)',
                below: [{ width: 1040, areas: ['a', 'c', 'b'], cols: 'minmax(0, 1fr)',
                          rows: 'clamp(190px, 30vh, 280px) minmax(300px, 1fr) auto' }]
            },
            zones: {
                a: { flow: 'bench', modules: ['fretboard'] },
                b: { label: 'THEORY', flow: 'compact', why: 'Theory kept small, beside the instrument: open a tool when you need it.',
                     modules: ['circle', 'chords', 'relations', 'solar', 'numgen'] },
                c: { modules: ['chordstrip', 'sheet', 'grading'] }
            }
        },

        {
            id: 'lab-bench',
            name: 'Lab Bench',
            tagline: 'Analysis on top',
            principle: 'Inverts the default hierarchy. The two analysis tools run side by side across the top with the grading key as a full-width legend beneath them; the score and the solar map become evidence below.',
            stage: 'sheet',
            grid: {
                areas: ['a b', 'c c', 'd e', 'f f'],
                cols: 'minmax(336px, 1fr) minmax(288px, 1fr)',
                rows: 'minmax(200px, 1fr) auto minmax(220px, 1.1fr) auto',
                below: [{ width: 1040, areas: ['a', 'b', 'c', 'd', 'e', 'f'], cols: 'minmax(0, 1fr)',
                          rows: 'auto auto auto auto auto auto' }]
            },
            zones: {
                a: { label: 'ANALYSE', why: 'Which chords hold a set of notes.', modules: ['chords'] },
                b: { label: 'RELATE',  why: 'Which scales a chord belongs to.', modules: ['relations'] },
                // a strip, so it states its height (as an auto row it got 62px at 1920)
                c: { flow: 'legend', height: 'clamp(120px, 20vh, 200px)', maxHeight: 'none', modules: ['grading'] },
                d: { modules: ['chordstrip', 'sheet'] },
                e: { modules: ['solar'] },
                f: { flow: 'row', label: 'REFERENCE', why: 'Reference while you analyse: the circle of keys, the neck, a typed progression.', height: 'clamp(170px, 26vh, 260px)', maxHeight: 'clamp(170px, 26vh, 260px)',
                     modules: ['circle', 'fretboard', 'numgen'] }
            }
        },

        {
            id: 'focus',
            name: 'Focus',
            tagline: 'One thing at a time',
            principle: 'One module at a time, full bleed, with the chord strip kept above the tabs. Nothing competes for attention and nothing scrolls past the fold. For when you already know what you are working on.',
            tabs: { bar: 't', panes: 'a', default: 'sheet' },
            grid: { areas: ['t', 'a'], cols: 'minmax(0, 1fr)', rows: 'auto minmax(0, 1fr)' },
            zones: {
                t: { flow: 'tabs', modules: ['chordstrip'] },
                a: { flow: 'solo', modules: ['sheet', 'circle', 'chords', 'relations', 'solar', 'grading', 'fretboard', 'numgen'] }
            }
        },

        {
            id: 'command-deck',
            name: 'Command Deck',
            tagline: 'Glanceable telemetry',
            principle: 'Every module becomes an equal tile in one mosaic sized to the viewport. Nothing scrolls, everything is visible at once, and clicking a nameplate zooms that tile to 2×2.',
            grid: { areas: ['a'], cols: 'minmax(0, 1fr)', rows: 'minmax(0, 1fr)' },
            zones: {
                a: { flow: 'mosaic', modules: ['sheet', 'circle', 'chords', 'relations', 'solar', 'grading', 'fretboard', 'numgen', 'chordstrip'] }
            }
        },

        {
            id: 'curriculum',
            name: 'Curriculum',
            tagline: 'Pedagogical order, one column',
            principle: 'The studio read top to bottom as a lesson: learn the map, build chords, find relations, generate from words in the top bar, read it, play it. Numbered steps in a single measured column.',
            stage: 'sheet',
            grid: { areas: ['a'], cols: 'minmax(0, 1fr)', rows: 'minmax(0, 1fr)' },
            zones: {
                a: { flow: 'reading', modules: ['circle', 'chords', 'relations', 'chordstrip', 'sheet', 'solar', 'grading', 'fretboard', 'numgen'],
                     steps: {
                         circle: 'Learn the map: every key, and its neighbours a fifth away.',
                         chords: 'Build chords: which chords hold the notes you have.',
                         relations: 'Find relations: which scales a chord belongs to.',
                         sheet: 'Type words in the top bar, press Generate, and read what came out.',
                         solar: 'See your scale as orbits around its tonic.',
                         grading: 'What the chord colours on the score mean.',
                         fretboard: 'Play it: the scale on a guitar neck.',
                         numgen: 'Or type a progression by hand, as numbers.'
                     } }
            }
        },

        {
            id: 'split-brain',
            name: 'Split Brain',
            tagline: 'Generative over evaluative',
            principle: 'Two stacked decks divided by what they are for. Above the line, everything that invents; below it, everything that judges. Drag the divider as the work shifts.',
            divider: { zone: 's', axis: 'y' },
            grid: {
                areas: ['a', 's', 'b'],
                cols: 'minmax(0, 1fr)',
                rows: 'minmax(190px, var(--look-split, 1fr)) 8px minmax(230px, 1fr)'
            },
            zones: {
                a: { label: 'GENERATE', flow: 'row', why: 'Invent from the top bar — words, then Generate — and explore the key here.',
                     modules: ['solar', 'circle', 'numgen'] },
                b: { label: 'EVALUATE', flow: 'row', why: 'Judge what came out: read the score, check the colours, analyse the chords.',
                     modules: ['chordstrip', 'sheet', 'grading', 'chords', 'relations', 'fretboard'] }
            }
        }
    ];

    /* Every look goes through the same gate a person's own look will. */
    var SCHEMA_CTX = {
        modules: ALL_IDS,
        relocated: ALL_IDS.filter(function (id) { return MODULES[id].relocated; })
    };
    if (window.LookSchema) {
        LOOKS.forEach(function (l) {
            if (l.id === 'og') return;
            var r = window.LookSchema.validate(l, SCHEMA_CTX);
            if (!r.ok) console.warn('[StudioLooks] built-in look "' + l.id + '" is invalid:', r.errors);
        });
    }

    var LOOK_BY_ID = {};
    LOOKS.forEach(function (l) { LOOK_BY_ID[l.id] = l; });
    var BUILT_IN_COUNT = LOOKS.length;

    /* ==================================================================
       YOUR LOOKS — built, remixed or imported by the person using the
       studio. Kept in localStorage, and validated on the way in and again
       on every load: a stored look is data from outside this file.
       ================================================================== */
    var CUSTOM_KEY = 'music-theory-custom-looks';
    var CUSTOM_VERSION = 1;

    function readCustom() {
        var raw = null;
        try { raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || 'null'); } catch (e) { raw = null; }
        var list = raw && Array.isArray(raw.looks) ? raw.looks : [];
        var out = [];
        list.forEach(function (l) {
            if (!window.LookSchema) return;
            var r = window.LookSchema.validate(l, SCHEMA_CTX);
            if (r.ok && !LOOK_BY_ID[r.look.id]) { r.look.custom = true; out.push(r.look); }
        });
        return out;
    }

    function plain(look) {
        var copy = JSON.parse(JSON.stringify(look));
        delete copy.custom;
        return copy;
    }

    function writeCustom() {
        try {
            localStorage.setItem(CUSTOM_KEY, JSON.stringify({
                version: CUSTOM_VERSION,
                looks: LOOKS.filter(function (l) { return l.custom; }).map(plain)
            }));
        } catch (e) { /* private mode: the look lasts this session */ }
    }

    readCustom().forEach(function (l) { LOOKS.push(l); LOOK_BY_ID[l.id] = l; });

    /* ==================================================================
       STATE
       ================================================================== */
    var homes = {};          // moduleId -> { parent, index }
    var els = {};            // moduleId -> element
    var zoneEls = {};        // zoneKey -> element
    var currentId = 'og';
    var captured = false;
    var syntheticResize = false;

    function workspace() { return document.querySelector('.workspace'); }

    function readState() {
        try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function lookState(id) { return readState()[id] || {}; }
    function saveLookState(id, patch) {
        try {
            var all = readState();
            var cur = all[id] || {};
            Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
            all[id] = cur;
            localStorage.setItem(STATE_KEY, JSON.stringify(all));
        } catch (e) { /* private mode */ }
    }

    function elementFor(id) {
        var def = MODULES[id];
        if (!def) return null;
        var inner = document.getElementById(def.container);
        if (!inner) return null;
        return def.bare ? inner : (inner.closest('.studio-module') || inner);
    }

    /** Record each module's exact original parent + sibling index, once. */
    function captureHomes() {
        if (captured) return;
        ALL_IDS.forEach(function (id) {
            var el = elementFor(id);
            if (!el || !el.parentNode) return;
            els[id] = el;
            el.setAttribute('data-module', id);
            homes[id] = {
                parent: el.parentNode,
                index: Array.prototype.indexOf.call(el.parentNode.children, el)
            };
        });
        captured = true;
    }

    /**
     * Put every module back exactly where the page put it.
     * Restores ascending by original index so that, as each slot refills,
     * children[index] is the correct reference node (or undefined -> append).
     */
    function restoreOG(only) {
        ALL_IDS.slice()
            .filter(function (id) { return els[id] && homes[id] && homes[id].parent && (!only || only.indexOf(id) !== -1); })
            .sort(function (x, y) { return homes[x].index - homes[y].index; })
            .forEach(function (id) {
                var el = els[id], home = homes[id];
                var ref = home.parent.children[home.index] || null;
                if (ref === el) return;
                home.parent.insertBefore(el, ref);
            });
    }

    /* ==================================================================
       ZONES
       ================================================================== */
    function ensureZone(key) {
        if (zoneEls[key] && zoneEls[key].isConnected) return zoneEls[key];
        var ws = workspace();
        if (!ws) return null;
        var z = ws.querySelector('.look-zone[data-zone="' + key + '"]');
        if (!z) {
            z = document.createElement('div');
            z.className = 'look-zone';
            z.setAttribute('data-zone', key);
            ws.appendChild(z);
        }
        zoneEls[key] = z;
        return z;
    }

    function clearZones() {
        var ws = workspace();
        if (!ws) return;
        ws.querySelectorAll('.look-zone').forEach(function (z) {
            z.querySelectorAll('.look-zone-label, .look-zone-why, .look-tabbar, .look-drawer-handle').forEach(function (n) { n.remove(); });
            z.removeAttribute('data-flow');
            z.removeAttribute('data-side');
            z.removeAttribute('data-tone');
            z.removeAttribute('data-off-grid');
            ['grid-area', 'height', 'max-height'].forEach(function (p) { z.style.removeProperty(p); });
            z.classList.remove('look-drawer-open', 'look-has-why', 'look-why-open');
        });
        ws.querySelectorAll('.look-divider').forEach(function (d) { d.remove(); });
    }

    /**
     * Zone keys in the order the look lists them, with the divider's zone
     * between the first two. Zones are re-appended in this order on every
     * apply: below 860px every look stacks its zones in DOM order, so that
     * order must be the look's own, not the order zones happened to be
     * created in earlier this session.
     */
    function zoneOrder(look) {
        var keys = Object.keys(look.zones || {});
        if (look.divider && keys.indexOf(look.divider.zone) === -1) keys.splice(1, 0, look.divider.zone);
        return keys;
    }

    /**
     * A module is absent when the app has moved its content elsewhere — the
     * key/scale controls live in the header bar, leaving an empty shell — or
     * hidden it, as the instrument dock does with the fretboard while the
     * guitar is docked, and as "Launch Selected Modules" does with whatever
     * was not selected. Looks lay out only what is actually there.
     */
    function isPresent(id) {
        var el = els[id], def = MODULES[id];
        if (!el) return false;
        if (!def.bare) {
            var inner = document.getElementById(def.container);
            if (!inner || !el.contains(inner)) return false;
        }
        return el.style.display !== 'none';
    }

    /** Strip every transient class this engine adds to modules. */
    function resetModules() {
        ALL_IDS.forEach(function (id) {
            var el = els[id];
            if (!el) return;
            el.classList.remove('look-item', 'look-rail-open', 'look-zoom', 'look-solo-active', 'look-absent');
            el.style.removeProperty('top');
            el.style.removeProperty('left');
            el.style.removeProperty('right');
            el.removeAttribute('data-step');
            el.removeAttribute('data-stage');
            el.removeAttribute('data-controls-open');
            ['--m-min-w', '--m-min-h', '--m-ideal-w'].forEach(function (p) { el.style.removeProperty(p); });
            var header = el.querySelector(':scope > .module-header');
            if (header) {
                ['data-step-text', 'tabindex', 'role', 'aria-expanded', 'aria-label'].forEach(function (a) { header.removeAttribute(a); });
                var t = header.querySelector(':scope > span[data-purpose]');
                if (t) t.removeAttribute('data-purpose');
            }
            el.querySelectorAll(':scope > .module-header > .look-stage-toggle').forEach(function (b) { b.remove(); });
        });
    }

    /* ==================================================================
       GRID — the look's geometry, as data
       Applied through custom properties, not grid-template-* directly, so
       the stylesheet's small-screen fallback (one stacked column under
       860px, with !important) still overrides it. A look's own narrower
       layouts (grid.below) are chosen here by viewport width.
       ================================================================== */
    var gridSig = null;

    /** @returns {boolean} whether the grid in force changed */
    function applyGrid(look) {
        var ws = workspace();
        if (!ws) return false;
        if (!look || !look.grid || !window.LookSchema) {
            ['--look-areas', '--look-cols', '--look-rows'].forEach(function (p) { ws.style.removeProperty(p); });
            gridSig = null;
            return false;
        }
        var g = window.LookSchema.gridAt(look.grid, window.innerWidth);
        ws.style.setProperty('--look-areas', g.areas.map(function (r) { return '"' + r + '"'; }).join(' '));
        ws.style.setProperty('--look-cols', g.cols);
        ws.style.setProperty('--look-rows', g.rows);
        // A zone this layout does not place (Two-Up's divider when stacked) is hidden,
        // or the grid would auto-place it as a phantom row.
        var placed = {};
        g.areas.join(' ').split(/\s+/).forEach(function (k) { placed[k] = true; });
        zoneOrder(look).forEach(function (k) {
            if (zoneEls[k]) zoneEls[k].toggleAttribute('data-off-grid', !placed[k]);
        });
        var sig = look.id + '|' + (g.width || 'base');
        var changed = sig !== gridSig;
        gridSig = sig;
        return changed;
    }

    /**
     * Module size contract -> the --m-* variables the flows size against;
     * and, for the person reading, the module's plain-language purpose under
     * its code name (REF::CIRCLE_OF_FIFTHS says little to a learner).
     */
    function applySizes(el, id, spec) {
        var def = MODULES[id] || {};
        el.style.setProperty('--m-min-w', def.minW || SIZE_DEFAULT.minW);
        el.style.setProperty('--m-min-h', def.minH || SIZE_DEFAULT.minH);
        el.style.setProperty('--m-ideal-w', def.idealW || SIZE_DEFAULT.idealW);
        var header = el.querySelector(':scope > .module-header');
        var title = header && header.querySelector(':scope > span');
        if (title && def.purpose) title.setAttribute('data-purpose', def.purpose);
        var step = spec && spec.steps && spec.steps[id];
        if (header && step) header.setAttribute('data-step-text', step);
        // A rail spine or a tile nameplate opens its module: make it a real control.
        if (header && spec && (spec.flow === 'rail' || spec.flow === 'mosaic')) {
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            header.setAttribute('aria-expanded', 'false');
            header.setAttribute('aria-label', (def.label || id) + (spec.flow === 'rail' ? ': open' : ': enlarge'));
        }
    }

    /** A look may resize the instrument dock (Luthier grows it). */
    function applyDock(look) {
        var body = document.body;
        if (look && look.dock && look.dock.height) {
            body.style.setProperty('--look-dock-height', look.dock.height);
            body.setAttribute('data-look-dock', '');
        } else {
            body.style.removeProperty('--look-dock-height');
            body.removeAttribute('data-look-dock');
        }
    }

    /**
     * The module a look is about shows its main view first. For the sheet:
     * the staff above its panels, and its toolbar and voicing column folded
     * behind a [CONTROLS] switch in the header — in a score-first look the
     * staff used to start under ~300px of controls.
     */
    function applyStage(look) {
        var el = look.stage && els[look.stage];
        if (!el) return;
        el.setAttribute('data-stage', look.stage);
        if (look.stage !== 'sheet') return;
        var header = el.querySelector(':scope > .module-header');
        if (!header) return;
        var open = !!lookState(look.id).controls;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-icon look-stage-toggle';
        b.title = 'Show or hide the sheet\'s controls';
        function show(on) {
            el.toggleAttribute('data-controls-open', on);
            b.textContent = on ? '[HIDE CONTROLS]' : '[CONTROLS]';
            b.setAttribute('aria-expanded', String(on));
        }
        show(open);
        b.addEventListener('click', function () {
            var on = !el.hasAttribute('data-controls-open');
            show(on);
            saveLookState(look.id, { controls: on });
            nudge();
        });
        var last = header.lastElementChild;
        header.insertBefore(b, last && last.classList.contains('btn-icon') ? last : null);
    }

    /* ==================================================================
       APPLY — place the modules
       ================================================================== */
    function apply(lookId, opts) {
        var look = LOOK_BY_ID[lookId] || LOOK_BY_ID.og;
        captureHomes();
        resetModules();
        clearZones();

        var ws = workspace();
        var body = document.body;

        // Before placing anything: a look that features an instrument takes
        // it out of the dock, which changes which modules are present.
        if (window.InstrumentDock && window.InstrumentDock.claimGuitar) {
            window.InstrumentDock.claimGuitar((look.claims || []).indexOf('fretboard') !== -1);
        }

        if (currentId !== look.id && currentId !== 'og' && currentId !== '__preview') saveLookState(currentId, { introSeen: true });
        currentId = look.id;
        if (ws) ws.style.removeProperty('--look-split');   // each look keeps its own split

        applyDock(look);
        if (look.id === 'og') {
            restoreOG();
            applyGrid(null);
            body.setAttribute('data-look', 'og');
        } else {
            zoneOrder(look).forEach(function (key) {
                var z = ensureZone(key);
                if (z && ws) ws.appendChild(z);
            });

            Object.keys(look.zones || {}).forEach(function (key) {
                var spec = look.zones[key];
                var z = ensureZone(key);
                if (!z) return;
                z.setAttribute('data-flow', spec.flow || 'column');
                if (spec.side) z.setAttribute('data-side', spec.side);
                if (spec.tone) z.setAttribute('data-tone', spec.tone);
                z.style.gridArea = key;
                if (spec.height) z.style.height = spec.height;
                if (spec.maxHeight) z.style.maxHeight = spec.maxHeight;

                var lab = null;
                if (spec.label) {
                    lab = document.createElement('div');
                    lab.className = 'look-zone-label';
                    lab.appendChild(document.createTextNode(spec.label));
                    z.appendChild(lab);
                }
                if (spec.why) {
                    var why = document.createElement('div');
                    why.className = 'look-zone-why';
                    why.id = 'look-why-' + key;
                    why.textContent = spec.why;
                    z.appendChild(why);
                    if (lab) {
                        z.classList.add('look-has-why');
                        var q = document.createElement('button');
                        q.type = 'button';
                        q.className = 'look-why-toggle';
                        q.textContent = '?';
                        q.setAttribute('aria-controls', why.id);
                        q.setAttribute('aria-label', 'What is ' + spec.label + ' for?');
                        q.addEventListener('click', function (zone, btn) {
                            return function () {
                                var open = !zone.classList.contains('look-why-open');
                                zone.classList.toggle('look-why-open', open);
                                btn.setAttribute('aria-expanded', String(open));
                            };
                        }(z, q));
                        lab.appendChild(q);
                        var first = !lookState(look.id).introSeen;
                        z.classList.toggle('look-why-open', first);
                        q.setAttribute('aria-expanded', String(first));
                    }
                }
                (spec.modules || []).forEach(function (mid) {
                    var el = els[mid];
                    if (!el) return;
                    el.classList.add('look-item');
                    applySizes(el, mid, spec);
                    z.appendChild(el);
                });
            });

            // A module this look leaves out (a look someone built may hide some)
            // goes back to its original slot — hidden in every look but OG —
            // rather than staying wherever the previous look had put it.
            var placed = [];
            Object.keys(look.zones || {}).forEach(function (k) { placed = placed.concat(look.zones[k].modules || []); });
            restoreOG(ALL_IDS.filter(function (id) { return placed.indexOf(id) === -1; }));

            if (look.divider) {
                var dz = ensureZone(look.divider.zone);
                if (dz) {
                    dz.setAttribute('data-flow', 'divider');
                    dz.style.gridArea = look.divider.zone;
                    makeDivider(dz, look);
                }
            }
            applyGrid(look);

            body.setAttribute('data-look', look.id);
            applyStage(look);

            Object.keys(look.zones || {}).forEach(function (key) {
                if ((look.zones[key].flow) === 'drawer') buildDrawerHandle(key, look.zones[key]);
            });

            var split = lookState(look.id).split;
            if (ws && look.divider && split) ws.style.setProperty('--look-split', split);
        }

        reconcile();

        if (!opts || !opts.preview) {
            try { localStorage.setItem(STORAGE_KEY, look.id); } catch (e) { /* private mode */ }
        }

        syncWorkspaceDisplay();
        syncButtons();
        nudge();

        if (!opts || !opts.silent) {
            window.dispatchEvent(new CustomEvent('studio:lookchange', { detail: { look: look.id } }));
        }
    }

    /* ==================================================================
       RECONCILE — decide what is actually there
       Safe to call at any time; does nothing in OG.
       ================================================================== */
    function reconcile() {
        if (currentId === 'og') return;
        var look = LOOK_BY_ID[currentId];
        var ws = workspace();
        if (!look || !ws) return;

        Object.keys(look.zones || {}).forEach(function (key) {
            var step = 0;
            (look.zones[key].modules || []).forEach(function (mid) {
                var el = els[mid];
                if (!el) return;
                var here = isPresent(mid);
                el.classList.toggle('look-absent', !here);
                if (here) el.setAttribute('data-step', ++step);
                else el.removeAttribute('data-step');
            });
        });

        if (look.tabs) syncTabs(look);

        var inLook = zoneOrder(look);
        ws.querySelectorAll('.look-zone').forEach(function (z) {
            var used = inLook.indexOf(z.getAttribute('data-zone')) !== -1 && !z.hasAttribute('data-off-grid');
            var hasContent = used && Array.prototype.some.call(z.children, function (c) {
                if (c.classList.contains('look-zone-label') || c.classList.contains('look-zone-why')) return false;
                if (!c.classList.contains('look-item')) return true;   // tabs, divider, drawer handle
                return !c.classList.contains('look-absent');
            });
            if (hasContent) z.style.removeProperty('display');
            else z.style.display = 'none';
            z.setAttribute('data-count', z.querySelectorAll(':scope > .look-item:not(.look-absent)').length);
        });
    }

    /**
     * ModuleSelector writes inline display on .workspace ('none' on the landing
     * page, 'flex' on launch). That would outrank this engine's stylesheet, so
     * reconcile it here rather than escalating to !important:
     *   - while the workspace is hidden, leave it hidden;
     *   - once launched, hand display back to CSS for a look, or restore the
     *     original inline 'flex' for OG.
     */
    function syncWorkspaceDisplay() {
        var ws = workspace();
        if (!ws) return;
        if (ws.style.display === 'none') return;            // still on the landing page

        if (currentId === 'og') {
            ws.style.display = 'flex';                      // exactly what launchWorkspace() sets
        } else {
            ws.style.removeProperty('display');             // let .workspace's grid rules govern
            document.querySelectorAll('.studio-module').forEach(function (m) {
                if (m.style.display && m.style.display !== 'none') m.style.removeProperty('display');
            });
        }
    }

    /**
     * Canvas- and SVG-backed modules re-measure themselves with
     * ResizeObservers (ModuleFit.observe, the solar map's and the piano's own).
     * One window resize, after layout has settled, is for the older listeners
     * that only watch the window.
     */
    var nudgePending = false;
    function nudge() {
        if (nudgePending) return;
        nudgePending = true;
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                nudgePending = false;
                syntheticResize = true;
                try { window.dispatchEvent(new Event('resize')); } catch (e) {}
                syntheticResize = false;
            });
        });
    }

    /* ==================================================================
       BEHAVIOURS
       ================================================================== */
    function makeDivider(zoneEl, look) {
        var axis = (look.divider && look.divider.axis) || 'x';
        var vertical = axis === 'y';   // splits top from bottom
        var d = document.createElement('div');
        d.className = 'look-divider';
        d.setAttribute('data-axis', axis);
        d.setAttribute('role', 'separator');
        d.setAttribute('tabindex', '0');
        d.setAttribute('aria-orientation', vertical ? 'horizontal' : 'vertical');
        d.setAttribute('aria-label', vertical ? 'Resize the top and bottom decks' : 'Resize the left and right halves');
        d.setAttribute('aria-valuemin', '15');
        d.setAttribute('aria-valuemax', '85');
        zoneEl.appendChild(d);

        function current() {
            var v = parseFloat(lookState(look.id).split);
            if (isFinite(v)) return v;
            var ws = workspace(), a = zoneEls[Object.keys(look.zones)[0]];
            if (!ws || !a) return 50;
            var r = ws.getBoundingClientRect(), ar = a.getBoundingClientRect();
            return vertical ? (ar.height / r.height) * 100 : (ar.width / r.width) * 100;
        }
        function set(pct) {
            pct = Math.min(85, Math.max(15, pct));
            var ws = workspace();
            if (ws) ws.style.setProperty('--look-split', pct.toFixed(2) + '%');
            d.setAttribute('aria-valuenow', String(Math.round(pct)));
            return pct;
        }
        function persist(pct) { saveLookState(look.id, { split: pct.toFixed(2) + '%' }); }

        d.setAttribute('aria-valuenow', String(Math.round(parseFloat(lookState(look.id).split) || 50)));

        var dragging = false, last = null;
        d.addEventListener('pointerdown', function (e) {
            dragging = true;
            d.setPointerCapture(e.pointerId);
            document.body.classList.add('look-dragging');
            document.body.setAttribute('data-drag-axis', axis);
            e.preventDefault();
        });
        d.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var ws = workspace();
            if (!ws) return;
            var r = ws.getBoundingClientRect();
            var frac = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
            last = set(frac * 100);
        });
        function stop(e) {
            if (!dragging) return;
            dragging = false;
            try { d.releasePointerCapture(e.pointerId); } catch (err) {}
            document.body.classList.remove('look-dragging');
            document.body.removeAttribute('data-drag-axis');
            if (last != null) persist(last);
            nudge();
        }
        d.addEventListener('pointerup', stop);
        d.addEventListener('pointercancel', stop);

        d.addEventListener('keydown', function (e) {
            var step = e.shiftKey ? 10 : 2;
            var back = vertical ? 'ArrowUp' : 'ArrowLeft';
            var fwd = vertical ? 'ArrowDown' : 'ArrowRight';
            var pct;
            if (e.key === back) pct = set(current() - step);
            else if (e.key === fwd) pct = set(current() + step);
            else if (e.key === 'Home') {
                var ws = workspace();
                if (ws) ws.style.removeProperty('--look-split');
                saveLookState(look.id, { split: null });
                d.setAttribute('aria-valuenow', '50');
                e.preventDefault();
                nudge();
                return;
            } else return;
            e.preventDefault();
            persist(pct);
            nudge();
        });
    }

    /* ---------- tabs (Focus) ------------------------------------------- */
    function syncTabs(look) {
        var spec = look.tabs;
        var barZone = zoneEls[spec.bar];
        if (!barZone) return;
        var present = ((look.zones[spec.panes] || {}).modules || []).filter(function (m) {
            return els[m] && isPresent(m);
        });
        var sig = present.join(',');
        var bar = barZone.querySelector(':scope > .look-tabbar');
        if (!bar || bar.getAttribute('data-set') !== sig) {
            if (bar) bar.remove();
            bar = buildTabBar(look, present);
            bar.setAttribute('data-set', sig);
            barZone.appendChild(bar);
        }
        var active = null;
        present.forEach(function (m) { if (els[m].classList.contains('look-solo-active')) active = m; });
        var pick = [active, lookState(look.id).tab, spec.default, present[0]].filter(function (m) {
            return m && present.indexOf(m) !== -1;
        })[0];
        if (pick) setSolo(pick, false);
    }

    function buildTabBar(look, present) {
        var bar = document.createElement('div');
        bar.className = 'look-tabbar';
        bar.setAttribute('role', 'tablist');
        bar.setAttribute('aria-label', 'Studio modules');
        present.forEach(function (mid) {
            var def = MODULES[mid];
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'look-tab';
            b.setAttribute('role', 'tab');
            b.setAttribute('data-target', mid);
            b.setAttribute('aria-selected', 'false');
            b.setAttribute('tabindex', '-1');
            var glyph = document.createElement('span');
            glyph.className = 'look-tab-glyph';
            glyph.setAttribute('aria-hidden', 'true');
            glyph.textContent = def.glyph;
            b.appendChild(glyph);
            b.appendChild(document.createTextNode(def.label));
            b.addEventListener('click', function () { setSolo(mid, true); });
            bar.appendChild(b);
        });
        bar.addEventListener('keydown', function (e) {
            var tabs = Array.prototype.slice.call(bar.querySelectorAll('.look-tab'));
            var i = tabs.indexOf(document.activeElement);
            if (i === -1) return;
            var j = null;
            if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
            else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
            else if (e.key === 'Home') j = 0;
            else if (e.key === 'End') j = tabs.length - 1;
            if (j === null) return;
            e.preventDefault();
            tabs[j].focus();
            setSolo(tabs[j].getAttribute('data-target'), true);
        });
        return bar;
    }

    function setSolo(mid, remember) {
        var changed = false;
        ALL_IDS.forEach(function (id) {
            if (!els[id]) return;
            var on = id === mid;
            if (els[id].classList.contains('look-solo-active') !== on) changed = true;
            els[id].classList.toggle('look-solo-active', on);
        });
        document.querySelectorAll('.look-tab').forEach(function (t) {
            var on = t.getAttribute('data-target') === mid;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', String(on));
            t.setAttribute('tabindex', on ? '0' : '-1');
        });
        if (remember) saveLookState(currentId, { tab: mid });
        if (changed) nudge();
    }

    /* ---------- drawer ------------------------------------------------- */
    function buildDrawerHandle(key, spec) {
        var z = zoneEls[key];
        if (!z) return;
        var h = document.createElement('button');
        h.type = 'button';
        h.className = 'look-drawer-handle';
        h.setAttribute('aria-expanded', 'false');
        var icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '≡';
        var word = document.createElement('span');
        word.className = 'look-drawer-word';
        word.textContent = spec.label || 'MORE';
        h.appendChild(icon);
        h.appendChild(word);
        h.addEventListener('click', function () { setDrawer(z, !z.classList.contains('look-drawer-open')); });
        z.insertBefore(h, z.firstChild);
    }

    function setDrawer(z, open) {
        z.classList.toggle('look-drawer-open', open);
        var h = z.querySelector(':scope > .look-drawer-handle');
        if (h) h.setAttribute('aria-expanded', String(open));
        nudge();
        if (open) reconcile();
    }

    /* ---------- rail fly-out + mosaic zoom ----------------------------- */
    function closeRails(except) {
        document.querySelectorAll('.look-rail-open').forEach(function (m) {
            if (m === except) return;
            var h = m.querySelector(':scope > .module-header');
            if (h && h.getAttribute('role') === 'button') h.setAttribute('aria-expanded', 'false');
            m.classList.remove('look-rail-open');
            m.style.removeProperty('top');
            m.style.removeProperty('left');
            m.style.removeProperty('right');
        });
    }

    function openRail(mod, zone, header) {
        var r = header.getBoundingClientRect();
        var zr = zone.getBoundingClientRect();
        mod.classList.add('look-rail-open');
        if (zone.getAttribute('data-side') === 'right') {
            mod.style.right = Math.max(8, window.innerWidth - zr.left + 10) + 'px';
        } else {
            mod.style.left = (zr.right + 10) + 'px';
        }
        // Keep the whole fly-out on screen: place it, measure it, then clamp.
        mod.style.top = r.top + 'px';
        var h = mod.getBoundingClientRect().height;
        var top = Math.min(r.top, window.innerHeight - h - 8);
        mod.style.top = Math.max(48, top) + 'px';
        nudge();
    }

    document.addEventListener('click', function (e) {
        var header = e.target.closest && e.target.closest('.module-header');
        if (!header) return;
        if (e.target.closest('.btn-icon')) return;   // never hijack [-] / [PRINT] / [UNDOCK]
        var mod = header.closest('.studio-module');
        if (!mod) return;
        var zone = mod.closest('.look-zone');
        if (!zone) return;
        var flow = zone.getAttribute('data-flow');

        if (flow === 'rail') {
            var wasOpen = mod.classList.contains('look-rail-open');
            closeRails();
            if (!wasOpen) openRail(mod, zone, header);
            header.setAttribute('aria-expanded', String(!wasOpen));
        } else if (flow === 'mosaic') {
            var zoomed = mod.classList.toggle('look-zoom');
            header.setAttribute('aria-expanded', String(zoomed));
            nudge();
        }
    }, true);

    // Enter / Space on a rail spine or tile nameplate does what a click does.
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var h = e.target;
        if (!h || !h.classList || !h.classList.contains('module-header') || h.getAttribute('role') !== 'button') return;
        e.preventDefault();
        h.click();
    });

    // A click anywhere outside an open fly-out puts it away.
    document.addEventListener('click', function (e) {
        var open = document.querySelector('.look-rail-open');
        if (!open || !e.target.closest) return;
        if (e.target.closest('.look-rail-open')) return;
        if (e.target.closest('.look-zone[data-flow="rail"] .module-header')) return;
        closeRails();
    });

    /** Escape puts away whatever the look has opened, most transient first. */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (popover && popover.classList.contains('open')) {
            closePopover();
            var btn = document.getElementById('toggle-layout');
            if (btn) btn.focus();
            return;
        }
        closeRails();
        document.querySelectorAll('.look-zone.look-drawer-open').forEach(function (z) { setDrawer(z, false); });
        document.querySelectorAll('.look-zoom').forEach(function (m) { m.classList.remove('look-zoom'); });
    });

    /* ==================================================================
       WIREFRAME PREVIEWS
       ================================================================== */
    function wireSvg(look, w, h) {
        var parts = ['<svg class="look-wire" viewBox="0 0 120 72" width="' + w + '" height="' + h + '" aria-hidden="true">'];
        parts.push('<rect x="0" y="0" width="120" height="72" rx="2" class="look-wire-bg"/>');
        var wire = look.wire || (window.LookSchema ? window.LookSchema.wireFromGrid(look) : []);
        wire.forEach(function (r) {
            var kind = r[4] || 0;
            if (kind === 3) {
                parts.push('<ellipse cx="' + (r[0] + r[2] / 2) + '" cy="' + (r[1] + r[3] / 2) +
                           '" rx="' + (r[2] / 2) + '" ry="' + (r[3] / 2) + '" class="look-wire-k3"/>');
            } else {
                parts.push('<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] +
                           '" rx="1.5" class="look-wire-k' + kind + '"/>');
            }
        });
        parts.push('</svg>');
        return parts.join('');
    }

    /* ==================================================================
       SUGGESTIONS — three looks for what the person says they want
       The landing page already asks for a skill level, an intent and an
       instrument; twelve equal cards is a lot to choose from cold.
       ================================================================== */
    var SUGGEST_BY_LEVEL = {
        beginner: [['curriculum', 'The tools in lesson order, one numbered step at a time'],
                   ['focus', 'One tool on screen and nothing else'],
                   ['luthier', 'Your instrument first, the theory beside it']],
        intermediate: [['signal-chain', 'See how a phrase is made, stage by stage'],
                       ['two-up', 'Questions on one side, answers on the other'],
                       ['stage-wings', 'The score, with every tool a click away']],
        advanced: [['lab-bench', 'Analysis first, the score as evidence'],
                   ['command-deck', 'Everything visible at once'],
                   ['split-brain', 'Invent above the line, judge below it']]
    };
    var SUGGEST_BY_INTENT = [
        [/learn|begin|basic|lesson|start|study/i, 'beginner'],
        [/guitar|fret|improv|play|practi|piano|keys/i, [['luthier', 'Your instrument first, the theory beside it'],
            ['focus', 'One tool at a time while you play'], ['stage-wings', 'The score in the middle, tools tucked away']]],
        [/write|compos|score|notat|sheet|song|arrang/i, [['notation-desk', 'The page, and what changes it'],
            ['stage-wings', 'The score is the work'], ['two-up', 'Questions left, answers right']]],
        [/analy|reharmon|theor|chord|scale|function|harmon/i, [['lab-bench', 'The analysis tools first'],
            ['signal-chain', 'Follow a phrase from source to result'], ['orrery', 'Explore the scale before the score']]],
        [/explor|discover|visual|orbit|wander|idea/i, [['orrery', 'Exploration before output'],
            ['command-deck', 'Everything at a glance'], ['split-brain', 'Invent above, judge below']]]
    ];
    var suggestCtx = { level: 'beginner', intent: '', instrument: 'piano' };

    function suggestions() {
        var text = String(suggestCtx.intent || '').trim();
        for (var i = 0; text && i < SUGGEST_BY_INTENT.length; i++) {
            var m = SUGGEST_BY_INTENT[i];
            if (!m[0].test(text)) continue;
            var items = typeof m[1] === 'string' ? SUGGEST_BY_LEVEL[m[1]] : m[1];
            return { reason: 'For “' + text.slice(0, 40) + '”:', items: items };
        }
        var level = SUGGEST_BY_LEVEL[suggestCtx.level] ? suggestCtx.level : 'intermediate';
        var list = SUGGEST_BY_LEVEL[level].slice();
        if (suggestCtx.instrument === 'guitar' && level !== 'advanced') {
            list = list.filter(function (x) { return x[0] !== 'luthier'; });
            list.unshift(['luthier', 'A guitarist\'s look: the fretboard across the top']);
            list = list.slice(0, 3);
        }
        var said = { beginner: 'just starting', intermediate: 'finding your way', advanced: 'experienced' }[level] || '';
        return { reason: suggestCtx.level === 'all' ? 'A good place to start:' : 'For someone ' + said + ':', items: list };
    }

    function renderSuggestions() {
        var box = document.getElementById('look-suggest');
        if (!box) return;
        var sug = suggestions();
        box.textContent = '';
        box.appendChild(Object.assign(document.createElement('h4'), { textContent: 'Suggested for you' }));
        box.appendChild(Object.assign(document.createElement('p'), { className: 'look-suggest-reason', textContent: sug.reason }));
        var row = document.createElement('div');
        row.className = 'look-suggest-row';
        sug.items.forEach(function (it) {
            var look = LOOK_BY_ID[it[0]];
            if (!look) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'look-suggest-card';
            b.setAttribute('data-look-id', look.id);
            b.innerHTML = '<span class="look-card-wire">' + wireSvg(look, 72, 43) + '</span>';
            var words = document.createElement('span');
            words.className = 'look-suggest-words';
            words.appendChild(Object.assign(document.createElement('strong'), { textContent: look.name }));
            words.appendChild(Object.assign(document.createElement('span'), { textContent: it[1] }));
            b.appendChild(words);
            b.addEventListener('click', function () { apply(look.id); });
            b.addEventListener('focus', function () { describe(look); });
            b.addEventListener('mouseenter', function () { describe(look); });
            row.appendChild(b);
        });
        box.appendChild(row);
        syncButtons();
    }

    /* ==================================================================
       LANDING PICKER
       ================================================================== */
    function renderLandingPicker() {
        var mount = document.getElementById('look-picker');
        if (!mount || mount.dataset.built === '1') return;
        mount.dataset.built = '1';
        mount.textContent = '';

        var head = document.createElement('div');
        head.className = 'look-picker-head';
        var h3 = document.createElement('h3');
        h3.textContent = 'Choose a look';
        var p = document.createElement('p');
        p.appendChild(document.createTextNode('Same studio, same tools — ' + (BUILT_IN_COUNT - 1) +
            ' different theories of what belongs next to what, plus the original. You can change this at any time from the '));
        var kbd = document.createElement('span');
        kbd.className = 'look-kbd';
        kbd.textContent = '⊞';
        p.appendChild(kbd);
        p.appendChild(document.createTextNode(' button in the studio header.'));
        head.appendChild(h3);
        head.appendChild(p);
        mount.appendChild(head);

        var sug = document.createElement('div');
        sug.id = 'look-suggest';
        sug.className = 'look-suggest';
        mount.appendChild(sug);
        renderSuggestions();

        var all = document.createElement('h4');
        all.className = 'look-picker-all';
        all.textContent = 'All looks';
        mount.appendChild(all);

        var rail = document.createElement('div');
        rail.className = 'look-picker-rail';
        LOOKS.forEach(function (look) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'look-card';
            card.setAttribute('data-look-id', look.id);
            card.setAttribute('aria-pressed', 'false');
            card.title = look.principle;
            card.innerHTML = '<span class="look-card-wire">' + wireSvg(look, 120, 72) + '</span>';
            var name = document.createElement('span');
            name.className = 'look-card-name';
            name.textContent = look.name;
            var tag = document.createElement('span');
            tag.className = 'look-card-tag';
            tag.textContent = look.custom ? 'Yours' + (look.tagline ? ' · ' + look.tagline : '') : look.tagline;
            if (look.custom) card.classList.add('look-card-yours');
            card.appendChild(name);
            card.appendChild(tag);
            card.addEventListener('click', function () { apply(look.id); });
            rail.appendChild(card);
        });
        if (window.LookBuilder) {
            var build = document.createElement('button');
            build.type = 'button';
            build.className = 'look-card look-card-build';
            var plus = document.createElement('span');
            plus.className = 'look-card-plus';
            plus.setAttribute('aria-hidden', 'true');
            plus.textContent = '+';
            var bname = document.createElement('span');
            bname.className = 'look-card-name';
            bname.textContent = 'Build your own';
            var btag = document.createElement('span');
            btag.className = 'look-card-tag';
            btag.textContent = 'Start from any look and rearrange it';
            build.appendChild(plus);
            build.appendChild(bname);
            build.appendChild(btag);
            build.addEventListener('click', function () { requestBuilder({ mode: 'remix', id: currentId, from: 'landing' }); });
            rail.appendChild(build);
        }
        mount.appendChild(rail);

        var note = document.createElement('div');
        note.className = 'look-picker-note';
        note.id = 'look-picker-note';
        mount.appendChild(note);

        rail.addEventListener('mouseover', function (e) {
            var c = e.target.closest && e.target.closest('.look-card');
            if (c) describe(LOOK_BY_ID[c.getAttribute('data-look-id')]);
        });
        rail.addEventListener('mouseleave', function () { describe(LOOK_BY_ID[currentId]); });
        rail.addEventListener('focusin', function (e) {
            var c = e.target.closest && e.target.closest('.look-card');
            if (c && LOOK_BY_ID[c.getAttribute('data-look-id')]) describe(LOOK_BY_ID[c.getAttribute('data-look-id')]);
        });

        describe(LOOK_BY_ID[currentId] || LOOKS[0]);
    }

    function describe(look) {
        var note = document.getElementById('look-picker-note');
        if (!note || !look) return;
        note.textContent = '';
        var strong = document.createElement('strong');
        strong.textContent = look.name;
        note.appendChild(strong);
        note.appendChild(document.createTextNode(' — ' + look.principle));
    }

    /* ==================================================================
       IN-STUDIO POPOVER  (reuses the previously dead #toggle-layout button)
       ================================================================== */
    var popover = null;

    function buildPopover() {
        if (popover) return popover;
        popover = document.createElement('div');
        popover.className = 'look-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', 'Studio look');
        var headEl = document.createElement('div');
        headEl.className = 'look-popover-head';
        headEl.textContent = 'STUDIO LOOK';
        popover.appendChild(headEl);

        var grid = document.createElement('div');
        grid.className = 'look-popover-grid';
        LOOKS.forEach(function (look) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'look-pop-item';
            item.setAttribute('data-look-id', look.id);
            item.title = look.principle;
            item.innerHTML = '<span class="look-pop-wire">' + wireSvg(look, 72, 43) + '</span>';
            var name = document.createElement('span');
            name.className = 'look-pop-name';
            name.textContent = look.name;
            item.appendChild(name);
            item.addEventListener('click', function () {
                apply(look.id);
                closePopover();
            });
            grid.appendChild(item);
        });
        popover.appendChild(grid);

        var foot = document.createElement('div');
        foot.className = 'look-popover-foot';
        foot.id = 'look-popover-foot';
        popover.appendChild(foot);

        if (window.LookBuilder) {
            var actions = document.createElement('div');
            actions.className = 'look-popover-actions';
            var mk = function (text, title, req) {
                var b = document.createElement('button');
                b.type = 'button';
                b.textContent = text;
                b.title = title;
                b.addEventListener('click', function () { closePopover(); requestBuilder(req()); });
                actions.appendChild(b);
                return b;
            };
            mk('Remix this look', 'Start a look of your own from the one you are in', function () { return { mode: 'remix', id: currentId }; });
            mk('New look', 'Start from a blank skeleton', function () { return { mode: 'new' }; });
            var edit = mk('Edit', 'Change this look of yours', function () { return { mode: 'edit', id: currentId }; });
            edit.className = 'look-pop-edit';
            mk('Import…', 'Add a look someone exported', function () { return { mode: 'import' }; });
            popover.appendChild(actions);
        }

        var explain = function (e) {
            var it = e.target.closest && e.target.closest('.look-pop-item');
            if (!it) return;
            var l = LOOK_BY_ID[it.getAttribute('data-look-id')];
            if (l) foot.textContent = l.principle;
        };
        grid.addEventListener('mouseover', explain);
        grid.addEventListener('focusin', explain);

        document.body.appendChild(popover);
        return popover;
    }

    function openPopover() {
        var p = buildPopover();
        var btn = document.getElementById('toggle-layout');
        p.classList.add('open');
        if (btn) {
            var r = btn.getBoundingClientRect();
            p.style.top = (r.bottom + 6) + 'px';
            p.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
        }
        var l = LOOK_BY_ID[currentId];
        var foot = document.getElementById('look-popover-foot');
        if (foot && l) foot.textContent = l.principle;
        syncButtons();
        if (btn) btn.setAttribute('aria-expanded', 'true');
        var sel = p.querySelector('.look-pop-item.selected') || p.querySelector('.look-pop-item');
        if (sel) sel.focus();
    }

    function closePopover() {
        if (popover) popover.classList.remove('open');
        var btn = document.getElementById('toggle-layout');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function syncButtons() {
        document.querySelectorAll('.look-card').forEach(function (c) {
            var on = c.getAttribute('data-look-id') === currentId;
            c.classList.toggle('selected', on);
            c.setAttribute('aria-pressed', String(on));
        });
        document.querySelectorAll('.look-pop-item, .look-suggest-card').forEach(function (c) {
            c.classList.toggle('selected', c.getAttribute('data-look-id') === currentId);
        });
        var cur = LOOK_BY_ID[currentId];
        document.querySelectorAll('.look-pop-edit').forEach(function (b) { b.hidden = !(cur && cur.custom); });
        var l = LOOK_BY_ID[currentId];
        describe(l);
        var btn = document.getElementById('toggle-layout');
        if (btn) {
            btn.title = 'Studio look: ' + (l ? l.name : 'OG');
            btn.setAttribute('aria-label', btn.title);
        }
        var line = document.getElementById('look-current-line');
        if (line && l) {
            line.textContent = 'LAUNCHING IN · ' + l.name.toUpperCase() +
                (l.id === 'og' ? ' (ORIGINAL)' : '');
        }
    }

    /* ==================================================================
       INIT
       ================================================================== */
    function init() {
        captureHomes();

        var saved = 'og';
        try { saved = localStorage.getItem(STORAGE_KEY) || 'og'; } catch (e) {}
        if (!LOOK_BY_ID[saved]) saved = 'og';

        // What the landing page has been told: skill level, intent, instrument.
        try {
            var inst = document.getElementById('instrument-select');
            if (inst) suggestCtx.instrument = inst.value || 'piano';
        } catch (e) {}
        document.addEventListener('click', function (e) {
            var lvl = e.target.closest && e.target.closest('.skill-level-btn');
            if (lvl) { suggestCtx.level = lvl.getAttribute('data-level') || 'beginner'; renderSuggestions(); }
        });
        var intent = document.getElementById('intent-search');
        var intentTimer = null;
        if (intent) intent.addEventListener('input', function () {
            clearTimeout(intentTimer);
            intentTimer = setTimeout(function () { suggestCtx.intent = intent.value; renderSuggestions(); }, 200);
        });
        var instSel = document.getElementById('instrument-select');
        if (instSel) instSel.addEventListener('change', function () { suggestCtx.instrument = instSel.value; renderSuggestions(); });

        renderLandingPicker();
        apply(saved, { silent: true });

        var btn = document.getElementById('toggle-layout');
        if (btn) {
            btn.setAttribute('aria-haspopup', 'dialog');
            btn.setAttribute('aria-expanded', 'false');
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (popover && popover.classList.contains('open')) closePopover();
                else openPopover();
            });
        }
        document.addEventListener('click', function (e) {
            if (!popover || !popover.classList.contains('open')) return;
            if (popover.contains(e.target)) return;
            if (e.target.closest && e.target.closest('#toggle-layout')) return;
            closePopover();
        });

        // This file runs before the app mounts its modules (the app starts on
        // DOMContentLoaded), so a saved look was laid out before the key/scale
        // controls moved to the header. Launching is when the studio is
        // actually on screen: lay out what is there now.
        ['launch-workspace-btn', 'launch-selected-btn'].forEach(function (id) {
            var b = document.getElementById(id);
            if (b) b.addEventListener('click', function () {
                setTimeout(function () {                    // after ModuleSelector's own handler
                    syncWorkspaceDisplay();
                    reconcile();
                    nudge();
                }, 0);
            });
        });

        // The instrument dock and the module selector announce when they
        // show or hide a module.
        window.addEventListener('studio:modulepresence', function () {
            syncWorkspaceDisplay();
            reconcile();
        });

        window.addEventListener('resize', function () {
            if (syntheticResize) return;
            closePopover();
            // Crossing one of the look's own widths switches its layout.
            if (currentId !== 'og' && applyGrid(LOOK_BY_ID[currentId])) {
                reconcile();
                nudge();
            }
        });

        // The header bar wraps onto a second row on narrow screens. Publish its
        // real height so what is placed under it (the sticky sidebar, the
        // notation desk's drawer) follows instead of assuming 38px.
        var deck = document.querySelector('.control-deck');
        if (deck && typeof ResizeObserver !== 'undefined') {
            var publishHeader = function () {
                var h = deck.getBoundingClientRect().height;
                if (h > 0) document.documentElement.style.setProperty('--header-height', Math.round(h) + 'px');
            };
            new ResizeObserver(publishHeader).observe(deck);
            publishHeader();
        }
    }

    /* ==================================================================
       BUILDING LOOKS — the API look-builder.js uses
       ================================================================== */
    function requestBuilder(detail) {
        window.dispatchEvent(new CustomEvent('studio:buildlook', { detail: detail }));
    }

    /** Rebuild the landing picker and the popover after the set of looks changes. */
    function rebuildPickers() {
        var mount = document.getElementById('look-picker');
        if (mount) { mount.dataset.built = ''; renderLandingPicker(); }
        if (popover) {
            var wasOpen = popover.classList.contains('open');
            popover.remove();
            popover = null;
            if (wasOpen) openPopover();
        }
        syncButtons();
    }

    /** Save a look of the person's own. Returns { ok, errors, look }. */
    function register(input) {
        if (!window.LookSchema) return { ok: false, errors: ['looks cannot be checked (look-schema.js missing)'], look: null };
        var r = window.LookSchema.validate(input, SCHEMA_CTX);
        if (!r.ok) return r;
        var existing = LOOK_BY_ID[r.look.id];
        if (existing && !existing.custom) return { ok: false, errors: ['"' + r.look.id + '" is a built-in look; save yours under another name'], look: null };
        r.look.custom = true;
        if (existing) LOOKS.splice(LOOKS.indexOf(existing), 1, r.look);
        else LOOKS.push(r.look);
        LOOK_BY_ID[r.look.id] = r.look;
        writeCustom();
        rebuildPickers();
        return r;
    }

    function unregister(id) {
        var l = LOOK_BY_ID[id];
        if (!l || !l.custom) return false;
        LOOKS.splice(LOOKS.indexOf(l), 1);
        delete LOOK_BY_ID[id];
        writeCustom();
        if (currentId === id) apply('og');
        rebuildPickers();
        return true;
    }

    /** Lay out an unsaved look, without making it the saved current look. */
    function preview(input) {
        if (!window.LookSchema) return { ok: false, errors: ['look-schema.js missing'], look: null };
        var r = window.LookSchema.validate(input, SCHEMA_CTX);
        if (!r.ok) return r;
        var look = JSON.parse(JSON.stringify(r.look));
        look.id = '__preview';
        LOOK_BY_ID.__preview = look;
        apply('__preview', { preview: true });
        return r;
    }

    function endPreview(restoreId) {
        delete LOOK_BY_ID.__preview;
        apply(LOOK_BY_ID[restoreId] ? restoreId : 'og');
    }

    window.StudioLooks = {
        apply: apply,
        reconcile: reconcile,
        looks: LOOKS,
        current: function () { return currentId; },
        open: openPopover,
        get: function (id) { return LOOK_BY_ID[id] ? JSON.parse(JSON.stringify(LOOK_BY_ID[id])) : null; },
        register: register,
        unregister: unregister,
        preview: preview,
        endPreview: endPreview,
        schemaContext: function () { return JSON.parse(JSON.stringify(SCHEMA_CTX)); },
        modules: function () { return JSON.parse(JSON.stringify(MODULES)); },
        wireSvg: wireSvg,
        rebuild: rebuildPickers
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
