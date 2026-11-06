/**
 * COURSE RUNNER — a lesson from course.js, played inside the studio.
 *
 * Starting a lesson opens the look the lesson names, sets the modules up the
 * way it says (key and scale, the sheet's voicing, the typing keyboard's
 * mode), outlines those modules, and docks a card beside the workspace with
 * the lesson: what to know, what to hear, what to try, and a check. Leaving
 * puts back the look you came from.
 *
 * It also puts a small "Learn" chip on each module's header in every look but
 * OG, listing the lessons that use that module: the way from a tool to the
 * course material about it.
 */
(function () {
    'use strict';

    var C = function () { return window.Course; };
    var lessonId = null;      // the lesson on the card, or null for the index
    var prevLook = null;      // the look to return to on leaving
    var card = null;
    var collapsed = false;
    var playTimers = [];

    /* ---------- the studio's parts ----------------------------------- */
    function app() { return window.modularApp || null; }

    function moduleEl(mid) {
        var mods = window.StudioLooks && window.StudioLooks.modules ? window.StudioLooks.modules() : {};
        var spec = mods[mid];
        var inner = spec && document.getElementById(spec.container);
        if (!inner) return null;
        return inner.closest('.look-item') || inner.closest('.studio-module') || inner;
    }

    function showStudio() {
        ['landing-page', 'learn-piano-page', 'learn-guitar-page', 'learn-scales-page', 'learn-chords-page', 'learn-inversions-page'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el && id !== 'landing-page') el.style.display = 'none';
        });
        var ws = document.querySelector('.workspace');
        var landing = document.getElementById('landing-page');
        var studioHidden = !ws || getComputedStyle(ws).display === 'none' || (landing && landing.style.display !== 'none');
        if (studioHidden && window.moduleSelector) window.moduleSelector.launchWorkspace(false);
        // A lesson is its own guide: no tour offer on top of it.
        try { localStorage.setItem('music-theory-visited', 'true'); } catch (e) {}
        var offer = document.getElementById('tour-offer');
        if (offer) offer.remove();
    }

    /* ---------- setting a lesson up ---------------------------------- */
    function setup(s) {
        s = s || {};
        var a = app();
        if (s.key && s.scale) {
            try {
                var lib = window.scaleLibrary || (a && a.scaleLibrary);
                if (lib && (lib.getCurrentKey() !== s.key || lib.getCurrentScale() !== s.scale)) lib.setKeyAndScale(s.key, s.scale);
            } catch (e) { console.warn('[CourseRunner] key/scale', e); }
        }
        if (s.voicing) setVoicing(s.voicing);
        if (s.tab) {
            var tab = document.querySelector('.look-tab[data-target="' + s.tab + '"]');
            if (tab) tab.click();
        }
        if (s.qwerty && window.QwertyChords && window.QwertyChords.setMode) {
            try { window.QwertyChords.setMode(s.qwerty); } catch (e) {}
        }
        // Harmonize's own "Chords: Triads / Sevenths" menu, on the keyboard chip's panel
        if (s.chordSize) {
            var size = Array.prototype.filter.call(document.querySelectorAll('.qk-chords-melody select'), function (x) {
                return Array.prototype.some.call(x.options, function (o) { return o.textContent === 'Sevenths'; });
            })[0];
            if (size && size.value !== String(s.chordSize)) { size.value = String(s.chordSize); fire(size, 'change'); }
        }
    }

    function voicingSelect() {
        var a = app();
        return (a && a.sheetMusicGenerator && a.sheetMusicGenerator._voicingSelectEl) || null;
    }

    function spotlight(mids) {
        document.querySelectorAll('.course-spot').forEach(function (el) { el.classList.remove('course-spot'); });
        (mids || []).forEach(function (mid) {
            var el = moduleEl(mid);
            if (el) el.classList.add('course-spot');
        });
    }

    function flash(mid) {
        var el = moduleEl(mid);
        if (!el) return;
        var tab = document.querySelector('.look-tab[data-target="' + mid + '"]');
        if (tab && !el.classList.contains('look-solo-active')) tab.click();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        el.classList.remove('course-flash');
        void el.offsetWidth;
        el.classList.add('course-flash');
    }

    /* ---------- the controls a step points at ------------------------ */
    // Each step in course.js names a control (`at`) and maybe a setting
    // (`set`). TARGETS finds the control — opening whatever hides it — so
    // "Show me" can put a ring and a callout on it; ACTIONS makes the setting
    // ("Do it") and says when the studio is in it, so the step ticks itself.
    function q(sel) { return function () { return document.querySelector(sel); }; }
    function visible(el) { return !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0; }
    function sheet() { var a = app(); return (a && a.sheetMusicGenerator) || null; }
    function sre() { var a = app(); return (a && a.scaleRelationshipExplorer) || null; }
    function prov() { return window.__musicProvenancePanel || null; }
    function solarViz() { var a = app(); return (a && a.solarSystem) || null; }
    function norm(s) { return String(s || '').replace(/[\s,;]+/g, ' ').trim().toLowerCase(); }

    /** The sheet's <label> whose own text is `text` ("Inversion:"), the visible one. */
    function labelled(text) {
        return Array.prototype.filter.call(document.querySelectorAll('label'), function (l) {
            return l.firstChild && l.firstChild.nodeType === 3 && l.firstChild.nodeValue.trim() === text && visible(l);
        })[0] || null;
    }
    function vlWrap() {
        var t = Array.prototype.filter.call(document.querySelectorAll('.sheet-music-voicing-panel div'), function (d) {
            return d.textContent === 'VL Intensity';
        })[0];
        return t ? t.parentElement : null;
    }
    function inversionSelect() { var l = labelled('Inversion:'); return l && l.querySelector('select'); }

    /**
     * The sheet's toolbar and Voicing Options. A score-first look folds them
     * behind the header's [CONTROLS] switch, and they are tall: open, they
     * push the staff — what a voicing lesson is about — out of sight. So they
     * open only when "Show me" asks for one of them ("Do it" sets them folded),
     * through the switch itself, and the lesson folds them back when it ends.
     */
    var openedControls = false;
    function sheetControlsFolded() {
        var el = moduleEl('sheet');
        return !!el && el.hasAttribute('data-stage') && !el.hasAttribute('data-controls-open');
    }
    function openSheetControls() {
        if (!sheetControlsFolded()) return;
        var b = moduleEl('sheet').querySelector('.look-stage-toggle');
        if (b) { b.click(); openedControls = true; }
    }
    function refoldSheetControls() {
        if (!openedControls) return;
        openedControls = false;
        var el = moduleEl('sheet');
        var b = el && el.hasAttribute('data-controls-open') && el.querySelector('.look-stage-toggle');
        if (b) b.click();
    }
    var SHEET_CONTROLS = ['sheet-voicing', 'sheet-inversion', 'sheet-voice-leading', 'sheet-vl-intensity'];

    /** The panel above the score: its progression builder works before any piece is generated. */
    function openProv() {
        var p = prov();
        if (!p || !p.body) return null;
        if (!findApproach()) p.body.appendChild(p.renderNumericSection());
        if (!p.isOpen()) p.setOpen(true);
        return p;
    }
    function findApproach() {
        var p = prov();
        var t = p && p.body && Array.prototype.filter.call(p.body.querySelectorAll('strong'), function (s) { return /Approach a progression/.test(s.textContent); })[0];
        return t ? t.parentElement.parentElement : null;
    }

    /** Where a planet is drawn on the Solar System's canvas, in page coordinates. */
    function planetPoint(note) {
        var v = solarViz();
        return v ? v.planetPoint(note) : null;
    }

    var TARGETS = {
        'sheet-voicing':       { mid: 'sheet', open: openSheetControls, find: function () { var s = voicingSelect(); return s && (s.closest('label') || s); } },
        'sheet-inversion':     { mid: 'sheet', open: openSheetControls, find: function () { return labelled('Inversion:'); } },
        'sheet-voice-leading': { mid: 'sheet', open: openSheetControls, find: function () { var c = document.getElementById('voice-leading'); return c && (c.closest('label') || c.parentElement); } },
        'sheet-vl-intensity':  { mid: 'sheet', open: openSheetControls, find: vlWrap },
        'qk-mode-chords':      { find: q('.qk-mode-btn[data-mode="chords"]') },
        'qk-mode-harmonize':   { find: q('.qk-mode-btn[data-mode="harmonize"]') },
        'qk-inversion':        { find: q('.qk-inv-btn') },
        'qk-walk':             { find: q('.qk-walk-btn') },
        'qk-keys':             { find: q('.qk-chip') },
        'chord-strip':         { mid: 'chordstrip', find: q('#mini-chord-strip') },
        'cc-input':            { mid: 'chords', find: function () { return [document.getElementById('note-input'), document.getElementById('find-chords-btn')]; } },
        'sre-input':           { mid: 'relations', find: function () { return [document.getElementById('sre-chord-input'), document.getElementById('sre-analyze-btn')]; } },
        'sre-tonic':           { mid: 'relations', find: function (st) {
            var v = st && st.set && st.set.tonic;
            return (v && document.querySelector('.sre-tonic-btn[data-tonic="' + v + '"]')) || document.querySelector('.sre-tonic-btn');
        } },
        // The filters appear with the results; before a chord is analyzed, the chord box is where to start.
        'sre-mediant':         { mid: 'relations', find: function () { return document.querySelector('.sre-filter[data-filter="mediant"]') || document.getElementById('sre-chord-input'); } },
        'prov':                { mid: 'sheet', find: function () { var p = document.getElementById('music-provenance-panel'); return p && p.firstElementChild; } },
        // its title and the degrees box: the whole section, with its list of approaches, is taller than a small window
        'prov-approach':       { mid: 'sheet', open: openProv, find: function () { var w = findApproach(); return w && [w.children[0], w.children[2]]; } },
        'ng-common':           { mid: 'numgen', find: q('#common-progression-btn') },
        'ng-numbers':          { mid: 'numgen', find: q('#manual-numbers') },
        'solar':               { mid: 'solar', find: function (st) {
            var v = solarViz(), pt = st && st.set && st.set.planet && planetPoint(st.set.planet);
            if (pt) { var h = pt.size + 10; return { rect: { left: pt.x - h, top: pt.y - h, right: pt.x + h, bottom: pt.y + h, width: 2 * h, height: 2 * h } }; }
            return v && v.canvas;
        } }
    };

    /** The one rectangle around whatever a target found (an element, a list of them, or a {rect}). */
    function rectOf(found) {
        if (!found) return null;
        if (found.rect) return found.rect;
        var els = (Array.isArray(found) ? found : [found]).filter(visible);
        if (!els.length) return null;
        var r = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
        els.forEach(function (el) {
            var b = el.getBoundingClientRect();
            r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top);
            r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom);
        });
        r.width = r.right - r.left; r.height = r.bottom - r.top;
        return r.width > 0 && r.height > 0 ? r : null;
    }
    function firstEl(found) {
        if (!found || found.rect) return found && found.rect ? solarViz() && solarViz().canvas : null;
        return (Array.isArray(found) ? found : [found]).filter(visible)[0] || null;
    }

    /**
     * Whether what a target found can actually be seen: each element is the
     * one on top at its own centre — not scrolled out of its panel, not under
     * the lesson card or another panel. (A planet is seen when its canvas is.)
     */
    function shown(found) {
        if (!found) return false;
        var onTop = function (el, x, y) {
            x = Math.min(Math.max(x, 0), window.innerWidth - 1);
            y = Math.min(Math.max(y, 0), window.innerHeight - 1);
            var e = document.elementFromPoint(x, y);
            return !!e && (e === el || el.contains(e) || e.contains(el));
        };
        if (found.rect) {
            var cv = solarViz() && solarViz().canvas, r = found.rect;
            return !!cv && onTop(cv, (r.left + r.right) / 2, (r.top + r.bottom) / 2);
        }
        var els = (Array.isArray(found) ? found : [found]).filter(Boolean);
        return els.length > 0 && els.every(function (el) {
            if (!visible(el)) return false;
            var b = el.getBoundingClientRect();
            return onTop(el, b.left + b.width / 2, b.top + b.height / 2);
        });
    }

    function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }
    function selectValue(sel, v) {
        if (!sel || sel.value === String(v)) return;
        if (!Array.prototype.some.call(sel.options, function (o) { return o.value === String(v); })) return;
        sel.value = String(v);
        fire(sel, 'change');
    }
    function typeAndPress(input, value, btn) {
        if (!input || !btn) return;
        input.value = value;
        fire(input, 'input');
        btn.click();
    }

    /** One voicing for the lesson: the sheet's menu and the typing keyboard's, kept the same. */
    function setVoicing(v) {
        if (!v || v === '__none') return;
        selectValue(voicingSelect(), v);
        if (window.QwertyChords && window.QwertyChords.setVoicing) window.QwertyChords.setVoicing(v);
    }
    function keysSettings() { return window.QwertyChords && window.QwertyChords.settings ? window.QwertyChords.settings() : {}; }

    var ran = {};   // what Find Chords was last pressed with
    var ACTIONS = {
        voicing:      { act: setVoicing, done: function (v) { var s = voicingSelect(); return (!!s && s.value === v) || keysSettings().voicing === v; } },
        inversion:    { act: function (n) { selectValue(inversionSelect(), n); }, done: function (n) { var s = inversionSelect(); return !!s && s.value === String(n); } },
        voiceLeading: { act: function () { var c = document.getElementById('voice-leading'); if (c && !c.checked) c.click(); },
                        done: function () { var c = document.getElementById('voice-leading'); return !!c && c.checked; } },
        vlIntensity:  { act: function (n) { var w = vlWrap(), r = w && w.querySelector('input[type="range"]'); if (r) { r.value = String(Math.max(n, +r.value)); fire(r, 'input'); fire(r, 'change'); } },
                        done: function (n) { var w = vlWrap(), r = w && w.querySelector('input[type="range"]'); return !!r && +r.value >= n; } },
        qwerty:       { act: function (m) { if (window.QwertyChords) window.QwertyChords.setMode(m); },
                        done: function (m) { return !!window.QwertyChords && window.QwertyChords.mode() === m; } },
        walk:         { act: function () { if (window.QwertyChords && !keysSettings().walk) window.QwertyChords.toggleWalk(); },
                        done: function () { return !!keysSettings().walk; } },
        notes:        { act: function (v) { typeAndPress(document.getElementById('note-input'), v, document.getElementById('find-chords-btn')); },
                        done: function (v) { return ran.cc === norm(v); } },
        analyze:      { act: function (v) { typeAndPress(document.getElementById('sre-chord-input'), v, document.getElementById('sre-analyze-btn')); },
                        done: function (v) { var s = sre(); return !!s && norm(s.state.inputChord) === norm(v); } },
        tonic:        { act: function (v) { var b = document.querySelector('.sre-tonic-btn[data-tonic="' + v + '"]'); if (b) b.click(); },
                        done: function (v) { var s = sre(); return !!s && s.state.rootFilter === v; } },
        filter:       { act: function (v) { var b = document.querySelector('.sre-filter[data-filter="' + v + '"]'); if (b) b.click(); },
                        done: function (v) { var s = sre(); return !!s && s.state.selectedRelationshipFilter === v; } },
        open:         { act: openProv, done: function () { var p = prov(); return !!p && p.isOpen(); } },
        // Build the progression, then open the ways into its last chord.
        approach:     { act: function (v) {
                            var p = openProv(), w = findApproach();
                            var input = w && w.querySelector('input'), go = w && Array.prototype.filter.call(w.querySelectorAll('button'), function (b) { return b.textContent === 'Build'; })[0];
                            typeAndPress(input, v, go);
                            setTimeout(function () {
                                var w2 = findApproach();
                                var chords = w2 ? Array.prototype.filter.call(w2.querySelectorAll('button'), function (b) { return /^Degree/.test(b.title); }) : [];
                                if (chords.length && !/ways into/.test(w2.textContent)) chords[chords.length - 1].click();
                            }, 300);
                            return p;
                        },
                        done: function (v) {
                            var p = prov(), w = findApproach();
                            return !!p && (p.numericDegrees || []).join(' ') === norm(v).replace(/\s+/g, ' ') && !!w && /ways into/.test(w.textContent);
                        } },
        degrees:      { act: function (v) { widgetApi.loadDegrees(norm(v).split(' ').map(Number), 'C'); },
                        done: function (v) { var a = app(), ng = a && a.numberGenerator; return !!ng && (ng.getCurrentNumbers() || []).join(' ') === norm(v); } },
        planet:       { act: function (note) {
                            var v = solarViz(), pt = planetPoint(note);
                            if (!v || !pt || v.state.expandedPlanets.indexOf(note) !== -1) return;
                            v.canvas.dispatchEvent(new MouseEvent('click', { clientX: pt.x, clientY: pt.y, bubbles: true }));
                        },
                        done: function (note) { var v = solarViz(); return !!v && v.state.expandedPlanets.indexOf(note) !== -1; } }
    };

    function stepSet(st) { var k = st && st.set && Object.keys(st.set)[0]; return k ? { kind: k, value: st.set[k], action: ACTIONS[k] } : null; }

    /* ---------- the pointer: a ring on the control, a callout beside it */
    var ring = null, callout = null, pointing = null;   // pointing: { k, until }

    function ensurePointer() {
        if (ring) return;
        ring = document.createElement('div');
        ring.id = 'course-ring';
        ring.setAttribute('aria-hidden', 'true');
        callout = document.createElement('div');
        callout.id = 'course-callout';
        callout.setAttribute('role', 'status');
        document.body.appendChild(ring);
        document.body.appendChild(callout);
        callout.addEventListener('click', function (e) { if (e.target.closest('.course-callout-x')) hidePointer(); });
    }

    function hidePointer() {
        pointing = null;
        if (ring) ring.classList.remove('is-on');
        if (callout) callout.classList.remove('is-on');
        if (card) card.querySelectorAll('.course-step.is-pointed').forEach(function (s) { s.classList.remove('is-pointed'); });
    }

    /**
     * Reveal step k's control and keep the ring and callout on it while it is
     * there. `scrollCard` brings the step into view on the card too — when the
     * pointer moves on by itself, not when a lesson opens (its text comes first).
     */
    function point(k, retried, scrollCard, auto) {
        var l = lessonId && C().get(lessonId), st = l && l.steps && l.steps[k];
        var t = st && TARGETS[st.at];
        if (!t) return false;
        // pointing by itself (a lesson opening, a step ticking) never unfolds the sheet's toolbar
        if (auto && t.open === openSheetControls && sheetControlsFolded()) return false;
        ensurePointer();
        if (t.mid) {
            var tab = document.querySelector('.look-tab[data-target="' + t.mid + '"]');
            var el = moduleEl(t.mid);
            if (tab && el && !el.classList.contains('look-solo-active')) tab.click();
        }
        if (t.open) t.open();
        var found = t.find(st);
        // pointing by itself never scrolls things about either: only at what is already in sight
        if (auto && !shown(found)) return false;
        if (!rectOf(found) && !retried && window.StudioLooks && window.StudioLooks.current() !== '__lesson') {
            // the control is not in the look you switched to: go back to the lesson's layout
            stage(l);
            setTimeout(function () { point(k, true, scrollCard, auto); }, 350);
            return false;
        }
        // Scroll only if it cannot be seen — outside the band between the
        // header and the dock, or clipped by its own panel — and then to the
        // middle: at an edge it would be under one of them.
        var first = firstEl(found), r = rectOf(found), clear = clearArea();
        if (first && (!r || r.top < clear.top || r.bottom > clear.bottom || !shown(found))) first.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        pointing = { k: k, until: Date.now() + 15000 };
        // a fold or a look's re-layout can move it after the scroll: look once more when things settle
        setTimeout(function () {
            if (!pointing || pointing.k !== k) return;
            var f = t.find(st), r2 = rectOf(f), c2 = clearArea(), el2 = firstEl(f);
            if (el2 && r2 && (r2.top < c2.top || r2.bottom > c2.bottom || !shown(f))) el2.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 450);
        callout.innerHTML = '<span class="course-callout-n">' + (k + 1) + '</span><span class="course-callout-t">' + (collapsed ? st.text : tipOf(st)) + '</span>' +
            '<button type="button" class="course-callout-x" aria-label="Hide">×</button>';
        card.querySelectorAll('.course-step').forEach(function (s) { s.classList.toggle('is-pointed', +s.getAttribute('data-k') === k); });
        var li = card.querySelector('.course-step[data-k="' + k + '"]');
        if (li && scrollCard) li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        follow();
        return !!rectOf(found);
    }

    /** The band of the window between the fixed header and the instrument dock. */
    function clearArea() {
        var deck = document.querySelector('.control-deck');
        var dock = document.querySelector('.bottom-deck');
        var top = deck ? Math.max(0, deck.getBoundingClientRect().bottom) : 0;
        // the dock covers the window's foot only where it is fixed there (narrow screens scroll it with the page)
        var fixed = dock && getComputedStyle(dock).display !== 'none' && getComputedStyle(dock).position === 'fixed';
        return { top: top, bottom: fixed ? dock.getBoundingClientRect().top : window.innerHeight };
    }

    function follow() {
        if (!pointing) return;
        if (Date.now() > pointing.until) { hidePointer(); return; }
        var l = lessonId && C().get(lessonId), st = l && l.steps[pointing.k];
        var f = st && TARGETS[st.at].find(st);
        var r = f && shown(f) ? rectOf(f) : null;
        if (r) {
            var pad = 5;
            ring.style.left = (r.left - pad) + 'px'; ring.style.top = (r.top - pad) + 'px';
            ring.style.width = (r.width + 2 * pad) + 'px'; ring.style.height = (r.height + 2 * pad) + 'px';
            ring.classList.add('is-on');
            callout.classList.add('is-on');
            var cw = callout.offsetWidth, ch = callout.offsetHeight;
            var cardLeft = card && document.body.classList.contains('course-on') && !collapsed ? card.getBoundingClientRect().left : window.innerWidth;
            var maxX = Math.max(8, Math.min(window.innerWidth, cardLeft) - cw - 8);
            var x = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), maxX);
            var below = r.bottom + 12 + ch < window.innerHeight - 8;
            var y = below ? r.bottom + 12 : Math.max(8, r.top - 12 - ch);
            callout.style.left = x + 'px'; callout.style.top = y + 'px';
            callout.classList.toggle('is-above', !below);
            callout.style.setProperty('--arrow-x', Math.min(Math.max(14, r.left + r.width / 2 - x), cw - 14) + 'px');
        } else {
            ring.classList.remove('is-on');
            callout.classList.remove('is-on');
        }
        requestAnimationFrame(follow);
    }

    /* ---------- steps: ticking themselves ---------------------------- */
    var stepDone = {}, stepTimer = null;

    function nextStep(after) {
        var l = C().get(lessonId);
        for (var k = after + 1; k < l.steps.length; k++) if (!stepDone[k]) return k;
        return -1;
    }

    function tickSteps() {
        var l = lessonId && C().get(lessonId);
        if (!l || !l.steps || !card) return;
        var ticked = [];
        l.steps.forEach(function (st, k) {
            var s = stepSet(st);
            if (stepDone[k] || !s || !s.action) return;
            var ok = false;
            try { ok = s.action.done(s.value); } catch (e) {}
            if (ok) { stepDone[k] = true; ticked.push(k); }
        });
        if (!ticked.length) return;
        ticked.forEach(function (k) {
            var li = card.querySelector('.course-step[data-k="' + k + '"]');
            if (li) li.classList.add('is-done');
        });
        if (l.check && l.check.steps && l.steps.every(function (st, k) { return !st.set || stepDone[k]; })) {
            C().markDone(l.id);
            verdict(true, 'All done. On to the next one.');
        }
        // move the pointer on from a step that just ticked
        if (pointing && ticked.indexOf(pointing.k) !== -1) {
            var n = nextStep(pointing.k);
            hidePointer();
            if (n !== -1) setTimeout(function () { if (lessonId === l.id) point(n, false, true, true); }, 450);
        }
    }

    /** The callout beside a control says only what to do there — the step's bold words — while the card says the rest. */
    function tipOf(st) {
        var bits = (st.text.match(/<b>(.*?)<\/b>/g) || []).map(function (b) { return b.replace(/<\/?b>/g, ''); });
        return bits.length ? bits.map(esc).join(' → ') : st.text;
    }

    /** What "Do it" will do, on its button: "Drop 2", "Analyze Em7b5". */
    var SET_LABELS = {
        voicing: function (v) { return ({ close: 'Close', drop2: 'Drop 2', drop3: 'Drop 3', 'drop2+4': 'Drop 2+4' })[v] || v; },
        inversion: function (n) { return ['Root', '1st', '2nd', '3rd'][n]; },
        voiceLeading: function () { return 'Tick it'; },
        vlIntensity: function () { return 'Ultra-smooth'; },
        qwerty: function (m) { return m.charAt(0).toUpperCase() + m.slice(1); },
        walk: function () { return 'Walk on'; },
        notes: function (v) { return 'Find ' + v; },
        analyze: function (v) { return 'Analyze ' + v; },
        tonic: function (v) { return 'Tonic ' + v; },
        filter: function () { return '3/6 Mediant'; },
        open: function () { return 'Open it'; },
        approach: function (v) { return 'Build ' + v; },
        degrees: function (v) { return 'Load ' + v; },
        planet: function (v) { return 'Open ' + v; }
    };
    function setLabel(s) { var f = SET_LABELS[s.kind]; return f ? f(s.value) : 'Do it'; }

    function doStep(k) {
        var l = C().get(lessonId), s = stepSet(l.steps[k]);
        if (!s || !s.action) return;
        var t = TARGETS[l.steps[k].at];
        if (t && t.open && t.open !== openSheetControls) t.open();
        try { s.action.act(s.value); } catch (e) { console.warn('[CourseRunner] step', k, e); }
        point(k, false, false, true);
        setTimeout(tickSteps, 120);
        setTimeout(tickSteps, 700);
    }

    function stepsHtml(l) {
        return '<ol class="course-steps">' + (l.steps || []).map(function (st, k) {
            var s = stepSet(st);
            return '<li class="course-step' + (s ? '' : ' is-info') + (stepDone[k] ? ' is-done' : '') + '" data-k="' + k + '">' +
                '<span class="course-step-n" aria-hidden="true">' + (k + 1) + '</span>' +
                '<div class="course-step-main"><div class="course-step-text">' + st.text + '</div>' +
                '<div class="course-step-acts">' +
                    '<button type="button" class="course-step-btn" data-step-show="' + k + '">Show me</button>' +
                    (s ? '<button type="button" class="course-step-btn course-step-do" data-step-do="' + k + '" title="Do it for me">' + esc(setLabel(s)) + '</button>' : '') +
                '</div></div></li>';
        }).join('') + '</ol>';
    }

    // the Find Chords button reads its box when pressed; remember what it was pressed with
    document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'find-chords-btn') {
            var i = document.getElementById('note-input');
            ran.cc = norm(i && i.value);
        }
    }, true);

    /* ---------- hearing ---------------------------------------------- */
    function midiOf(n) {
        var a = app();
        if (a && a.musicTheory && a.musicTheory.noteToMidi) return a.musicTheory.noteToMidi(n);
        var m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
        if (!m) return 60;
        return ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    }

    /** The instrument a lesson lights and sounds: the guitar when it is the one chosen. */
    function shownInstrument() {
        var a = app();
        if (!a) return null;
        return window.LearnCommon && window.LearnCommon.instrument() === 'guitar' && a.guitarFretboard ? a.guitarFretboard : a.pianoVisualizer;
    }

    function playNote(midi, dur, time) {
        var guitar = window.LearnCommon && window.LearnCommon.guitarSound();
        if (guitar) { guitar.playNote(midi, dur, time); return; }
        var a = app(), eng = a && a.audioEngine;
        if (!eng || typeof eng.playNote !== 'function') return;
        try { if (eng.resume) eng.resume(); } catch (e) {}
        if (eng.constructor && eng.constructor.name === 'EnhancedAudioEngine') eng.playNote(midi, { duration: dur, time: time });
        else eng.playNote(midi, dur, time);
    }

    function stopPlaying() {
        playTimers.forEach(clearTimeout);
        playTimers = [];
        var pv = shownInstrument();
        if (pv && pv.clearFocusNotes) pv.clearFocusNotes();
    }

    function hear(h) {
        stopPlaying();
        var chords = h.seq || [h.notes];
        var step = chords.every(function (c) { return c.length === 1; }) ? 0.32 : 1.0;
        var pv = shownInstrument();
        chords.forEach(function (c, i) {
            c.forEach(function (n) { playNote(midiOf(n), step * 0.95, i * step); });
            if (pv && pv.setFocusNotes) {
                playTimers.push(setTimeout(function () { pv.setFocusNotes(c, { kind: c.length === 1 ? 'melody' : 'chord' }); }, i * step * 1000));
            }
        });
        playTimers.push(setTimeout(function () { if (pv && pv.clearFocusNotes) pv.clearFocusNotes(); }, (chords.length * step + 0.6) * 1000));
    }

    var focusTimer = null;
    var widgetApi = {
        playNote: playNote,
        /** Light these notes on the lesson's instrument for `ms`. */
        focus: function (names, ms) {
            var pv = shownInstrument();
            if (!pv || !pv.setFocusNotes) return;
            clearTimeout(focusTimer);
            pv.setFocusNotes(names, { kind: 'chord' });
            focusTimer = setTimeout(function () { pv.clearFocusNotes(); }, ms || 2000);
        },
        /** Put a progression (scale degrees) in the Generator, in `key` major, so the sheet and strip show it. */
        loadDegrees: function (degrees, key) {
            var a = app(), ng = a && a.numberGenerator;
            if (!ng || !ng.applyProgressionDegrees) return false;
            var lib = window.scaleLibrary || (a && a.scaleLibrary);
            var k = studioKey(key);
            try { if (lib && k && (lib.getCurrentKey() !== k || lib.getCurrentScale() !== 'major')) lib.setKeyAndScale(k, 'major'); } catch (e) {}
            return ng.applyProgressionDegrees(degrees, 'course');
        }
    };
    /** 'E♭' as the studio's key list spells it (Eb, or D# when that is all it knows). */
    function studioKey(name) {
        var a = app(), mt = a && a.musicTheory, keys = mt && mt.getKeys ? mt.getKeys() : [];
        var plain = String(name || '').replace('♭', 'b').replace('♯', '#');
        if (keys.indexOf(plain) !== -1) return plain;
        var pc = window.CourseTheory ? window.CourseTheory.pcOf(name) : null;
        var sharp = pc == null ? null : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc];
        return keys.indexOf(sharp) !== -1 ? sharp : null;
    }

    /**
     * The notes a ▶ button plays, as the lesson text writes them: "B3·E4·G4·C5 → A3·E4·G4·C5".
     * A chord named without its voicing can't be checked against the text.
     */
    function hearNotes(h) {
        var name = function (n) { return n.replace('#', '♯').replace(/^([A-G])b/, '$1♭'); };
        return (h.seq || [h.notes]).map(function (c) { return c.map(name).join('·'); }).join(isMelody(h) ? ' ' : ' → ');
    }
    function isMelody(h) { return (h.seq || [h.notes]).every(function (c) { return c.length === 1; }); }   // single notes, not chords

    /* ---------- the card --------------------------------------------- */
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function ensureCard() {
        if (card) return card;
        card = document.createElement('aside');
        card.id = 'course-card';
        card.setAttribute('aria-label', 'Lesson');
        document.body.appendChild(card);
        return card;
    }

    function place() {
        if (!card) return;
        var deck = document.querySelector('.control-deck');
        var dock = document.querySelector('.bottom-deck');
        var top = deck ? Math.max(0, deck.getBoundingClientRect().bottom) : 0;
        var dockTop = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : window.innerHeight;
        card.style.top = (top + 6) + 'px';
        card.style.maxHeight = Math.max(160, dockTop - top - 12) + 'px';
    }

    function levelName(l) {
        var lv = C().levels.filter(function (x) { return x.id === l.level; })[0];
        var u = lv && lv.units.filter(function (x) { return x.id === l.unit; })[0];
        return (lv ? lv.name : '') + (u ? ' · ' + u.title : '');
    }

    function renderLesson(l) {
        var order = C().order, i = order.indexOf(l.id);
        var mods = (l.modules || []).map(function (m) {
            return '<button type="button" class="course-modchip" data-mid="' + m + '">' + esc(C().moduleLabel(m)) + '</button>';
        }).join('');
        var hears = (l.hear || []).map(function (h, k) {
            var notes = hearNotes(h);
            var under = notes && (h.seq || [h.notes]).length <= 3 && (h.seq || [h.notes]).every(function (c) { return c.length > 1; });
            return '<button type="button" class="course-hear" data-k="' + k + '" title="' + esc(notes) + '">▶ ' + esc(h.label) +
                   (under ? '<span class="course-hear-notes">' + esc(notes) + '</span>' : '') + '</button>';
        }).join('');
        var check = '';
        if (l.check && l.check.steps) {
            check = '<div class="course-q">Do the steps above: each one ticks when the studio is set that way.</div>';
        }
        if (l.check && l.check.quiz) {
            var q = l.check.quiz;
            check += '<div class="course-q">' + esc(q.q) + '</div><div class="course-opts">' +
                q.options.map(function (o, k) { return '<button type="button" class="course-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') +
                '</div>';
        }
        card.innerHTML =
            '<div class="course-card-head">' +
                '<div class="course-card-where" title="' + esc(levelName(l)) + '">' + esc(levelName(l).split(' · ')[0]) + ' · ' + (i + 1) + '/' + order.length + '</div>' +
                '<div class="course-card-actions">' +
                    '<button type="button" class="course-icon" data-act="index" title="All lessons" aria-label="All lessons">☰</button>' +
                    '<button type="button" class="course-icon" data-act="collapse" title="Fold the lesson away" aria-label="Fold the lesson away">–</button>' +
                '</div>' +
            '</div>' +
            '<h2 class="course-card-title">' + esc(l.title) + '</h2>' +
            (C().slideText(l) ? '<div class="course-card-src">' + esc(C().source) + ' · ' + esc(C().slideText(l)) + '</div>' : '') +
            '<div class="course-card-body">' + l.body + '</div>' +
            (hears ? '<div class="course-sec">Hear it</div><div class="course-hears">' + hears + '</div>' : '') +
            '<div class="course-sec">Try it in the studio</div>' +
            stepsHtml(l) +
            '<div class="course-mods"><span class="course-mods-lead">Uses</span>' + mods + '</div>' +
            '<div class="course-sec">Check</div>' +
            '<div class="course-check">' + check + '<div class="course-verdict" aria-live="polite"></div></div>' +
            '<div class="course-card-foot">' +
                '<button type="button" class="course-nav" data-act="prev"' + (i <= 0 ? ' disabled' : '') + '>← Back</button>' +
                '<button type="button" class="course-nav course-exit" data-act="exit">Leave lesson</button>' +
                '<button type="button" class="course-nav course-next" data-act="next">' + (i >= order.length - 1 ? 'Finish →' : 'Next →') + '</button>' +
            '</div>';
        if (C().isDone(l.id)) verdict(true, 'Done. On to the next one.');

        // a lesson's hands-on part plays through the same speaker and studio piano as ▶
        var host = card.querySelector('[data-course-widget]');
        var mount = l.widget && window.CourseWidgets && window.CourseWidgets[l.widget.kind];
        if (host && mount) mount(host, l.widget, widgetApi);

        card.querySelectorAll('.course-hear').forEach(function (b) {
            b.addEventListener('click', function () { hear(l.hear[+b.getAttribute('data-k')]); });
        });
        card.querySelectorAll('.course-modchip').forEach(function (b) {
            b.addEventListener('click', function () { flash(b.getAttribute('data-mid')); });
        });
        card.querySelectorAll('.course-opt').forEach(function (b) {
            b.addEventListener('click', function () {
                var k = +b.getAttribute('data-k'), right = k === l.check.quiz.answer;
                card.querySelectorAll('.course-opt').forEach(function (o) { o.classList.remove('is-right', 'is-wrong'); });
                b.classList.add(right ? 'is-right' : 'is-wrong');
                if (right) { C().markDone(l.id); verdict(true, 'Right.'); }
                else verdict(false, 'Not quite. Hear it again and look at the modules.');
            });
        });
    }

    function verdict(ok, text) {
        var v = card && card.querySelector('.course-verdict');
        if (!v) return;
        v.className = 'course-verdict ' + (ok ? 'is-ok' : 'is-no');
        v.textContent = text;
    }

    function renderIndex(filterMid) {
        document.body.classList.remove('course-keys');
        var html ='<div class="course-card-head"><div class="course-card-where">' + (filterMid ? 'Lessons that use ' + esc(C().moduleLabel(filterMid)) : 'Course') + '</div>' +
            '<div class="course-card-actions"><button type="button" class="course-icon" data-act="close" title="Close" aria-label="Close">×</button></div></div>';
        C().levels.forEach(function (lv) {
            var units = lv.units.map(function (u) {
                var ls = u.lessons.filter(function (l) { return !filterMid || (l.modules || []).indexOf(filterMid) !== -1; });
                if (!ls.length) return '';
                return '<div class="course-idx-unit">' + esc(u.title) + '</div><ol class="course-idx">' + ls.map(function (l) {
                    return '<li><button type="button" class="course-idx-btn' + (C().isDone(l.id) ? ' is-done' : '') + (l.id === lessonId ? ' is-current' : '') + '" data-lesson="' + l.id + '">' +
                        esc(l.title) + (l.page ? ' <span class="course-idx-page">page</span>' : '') + '</button></li>';
                }).join('') + '</ol>';
            }).join('');
            if (units) html += '<div class="course-idx-level">' + esc(lv.name) + '</div>' + units;
        });
        card.innerHTML = html;
        card.querySelectorAll('.course-idx-btn').forEach(function (b) {
            b.addEventListener('click', function () { C().start(b.getAttribute('data-lesson')); });
        });
    }

    function renderRecap() {
        card.innerHTML = '<div class="course-card-head"><div class="course-card-where">Course complete</div>' +
            '<div class="course-card-actions"><button type="button" class="course-icon" data-act="index" title="All lessons" aria-label="All lessons">☰</button></div></div>' +
            '<h2 class="course-card-title">The toolkit</h2><div class="course-card-src">' + esc(C().source) + ' · slide 28</div>' +
            '<dl class="course-recap">' + C().recap.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
            '<div class="course-card-foot"><button type="button" class="course-nav course-exit" data-act="exit">Back to the studio</button></div>';
    }

    function onCardClick(e) {
        var sb = e.target.closest('[data-step-show], [data-step-do]');
        if (sb && card.contains(sb)) {
            var show = sb.hasAttribute('data-step-show'), k = +(sb.getAttribute('data-step-show') || sb.getAttribute('data-step-do'));
            // Where the card lies over the workspace, it folds to its pill so
            // the control is not under it; the callout carries the step.
            var fold = overlaid() && !collapsed;
            if (fold) setCollapsed(true);
            // after this click has finished: a control's own "click outside closes me" must not see it
            setTimeout(function () { if (show) point(k); else doStep(k); }, fold ? 120 : 0);
            return;
        }
        var b = e.target.closest('[data-act]');
        if (!b || !card.contains(b)) return;
        var act = b.getAttribute('data-act');
        var order = C().order, i = order.indexOf(lessonId);
        if (act === 'next') {
            if (i >= order.length - 1) { stopPlaying(); hidePointer(); renderRecap(); }
            else start(order[i + 1]);
        } else if (act === 'prev' && i > 0) start(order[i - 1]);
        else if (act === 'exit') leave();
        else if (act === 'close') { if (lessonId) start(lessonId); else leave(); }
        else if (act === 'index') { hidePointer(); renderIndex(null); }
        else if (act === 'collapse') setCollapsed(true);
    }

    /**
     * A lesson lays the studio out for itself. A look built for the whole
     * screen, less the card's width and the dock's height, left the tools the
     * lesson is about as small as the ones it never mentions. So the lesson's
     * own tools stand side by side at full height — the score (chord strip
     * over the sheet) beside them when the lesson uses it — and every other
     * tool waits in a drawer at the right. The guitar stays in the dock, alone there when it is the instrument chosen.
     */
    var SCORE = ['chordstrip', 'sheet'];
    function stageFor(l) {
        var mods = (l.modules || []).slice();
        (l.steps || []).forEach(function (st) {
            var t = TARGETS[st.at];
            if (t && t.mid && mods.indexOf(t.mid) === -1) mods.push(t.mid);
        });
        var tools = mods.filter(function (m) { return SCORE.indexOf(m) === -1 && m !== 'fretboard'; });
        var score = mods.some(function (m) { return SCORE.indexOf(m) !== -1; });
        var specs = window.StudioLooks ? window.StudioLooks.modules() : {};
        var all = Object.keys(specs).filter(function (m) { return !specs[m].relocated; });   // not the header's
        var zones = {}, cols = [], keys = [];
        tools.slice(0, 2).forEach(function (m, i) {
            var k = 'ab'.charAt(i);
            zones[k] = { modules: [m] };
            keys.push(k);
            cols.push('minmax(300px, 1fr)');
        });
        if (score) { zones.s = { flow: 'page', modules: SCORE.slice() }; keys.push('s'); cols.push('minmax(336px, 1.5fr)'); }
        var placed = tools.slice(0, 2).concat(score ? SCORE : []);
        zones.r = { flow: 'drawer', side: 'right', label: 'MORE TOOLS', modules: all.filter(function (m) { return placed.indexOf(m) === -1; }) };
        var grid = { areas: [keys.concat('r').join(' ')], cols: cols.concat('44px').join(' '), rows: 'minmax(0, 1fr)' };
        // two columns beside the card need ~1180px of window: below that, stack them
        if (keys.length > 1) grid.below = [{ width: 1180, areas: keys.map(function (k) { return k + ' r'; }), cols: 'minmax(0, 1fr) 44px',
                                             rows: keys.map(function (k) {
                                                 // the score and the orbit fill what they are given; the other tools are as tall as their contents
                                                 return k === 's' ? 'minmax(320px, 1fr)' : zones[k].modules[0] === 'solar' ? 'minmax(280px, 1fr)' : 'auto';
                                             }).join(' ') }];
        var look = { id: 'lesson', name: 'Lesson', grid: grid, zones: zones };
        if (score) look.stage = 'sheet';
        return look;
    }

    function stage(l) {
        if (!window.StudioLooks || !window.StudioLooks.preview) return;
        var r = window.StudioLooks.preview(stageFor(l), '__lesson');
        if (!r.ok) console.warn('[CourseRunner] lesson layout', r.errors);
    }

    /** Narrow screens: the card covers the workspace instead of sitting beside it (course.css). */
    function overlaid() { return !!(window.matchMedia && window.matchMedia('(max-width: 900px)').matches); }

    function setCollapsed(on) {
        collapsed = on;
        document.body.classList.toggle('course-folded', on);
        relayout();
    }

    function relayout() {
        place();
        // the looks size their zones from the workspace; tell them it moved
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }

    function open() {
        ensureCard();
        if (!card._wired) {
            card._wired = true;
            card.addEventListener('click', onCardClick);
        }
        document.body.classList.add('course-on');
        if (window.InstrumentDock && window.LearnCommon) window.InstrumentDock.showGuitarForCourse(window.LearnCommon.instrument() === 'guitar');
        if (collapsed) setCollapsed(false);
        relayout();
    }

    /** Does this lesson have you play on the typing keyboard? Its chip stays out of the others (course.css). */
    function usesKeys(l) {
        return (l.steps || []).some(function (st) { return /^qk-/.test(st.at || ''); });
    }

    /* ---------- public ----------------------------------------------- */
    function start(id) {
        var l = C() && C().get(id);
        if (!l) return;
        if (l.page) {
            // a Learn page is a page: leave the studio for it
            leave();
            if (window.moduleSelector) window.moduleSelector.showLandingPage();
            C().start(id);
            return;
        }
        showStudio();
        if (!lessonId && window.StudioLooks) prevLook = window.StudioLooks.current();
        if (lessonId && lessonId !== id) refoldSheetControls();
        lessonId = id;
        stopPlaying();
        hidePointer();
        stepDone = {};
        stage(l);
        document.body.classList.toggle('course-keys', usesKeys(l));
        // a new layout starts at its top, not wherever the last lesson left it scrolled
        for (var sc = document.querySelector('.workspace'); sc; sc = sc.parentElement) if (sc.scrollTop) sc.scrollTop = 0;
        window.scrollTo(0, 0);
        open();
        renderLesson(l);
        card.scrollTop = 0;
        // modules are placed by the look; set them up once they are there
        setTimeout(function () {
            setup(l.setup);
            spotlight(l.modules);
            relayout();
            tickSteps();
        }, 60);
        // then show where the first step is, once the look has settled
        setTimeout(function () {
            // on a narrow screen the card covers the studio: read it first, point when asked
            if (lessonId !== id || collapsed || overlaid()) return;
            var k = nextStep(-1);
            if (k !== -1) point(k, false, false, true);
        }, 700);
        if (!stepTimer) stepTimer = setInterval(tickSteps, 400);
        wireVoicingMirror();
    }

    /**
     * In a lesson "the voicing" is one thing: choosing it on the sheet sets the
     * typing keyboard too, and choosing it in the keyboard's ⚙ panel sets the
     * sheet. Outside a lesson the two stay independent, as they were.
     */
    function wireVoicingMirror() {
        var sel = voicingSelect();
        if (sel && !sel._courseWired) {
            sel._courseWired = true;
            sel.addEventListener('change', function () { if (lessonId) setVoicing(sel.value); });
        }
        if (!wireVoicingMirror.keys) {
            wireVoicingMirror.keys = true;
            window.addEventListener('qwerty:voicing', function (e) { if (lessonId && e.detail) setVoicing(e.detail.voicing); });
        }
    }

    function showIndex(filterMid) {
        showStudio();
        open();
        renderIndex(filterMid || null);
    }

    function leave() {
        stopPlaying();
        hidePointer();
        refoldSheetControls();
        if (stepTimer) { clearInterval(stepTimer); stepTimer = null; }
        spotlight([]);
        document.body.classList.remove('course-on', 'course-folded', 'course-keys');
        if (window.InstrumentDock) window.InstrumentDock.showGuitarForCourse(false);
        collapsed = false;
        if (card) card.innerHTML = '';
        var back = prevLook;
        lessonId = null;
        prevLook = null;
        if (back && window.StudioLooks && window.StudioLooks.current() !== back) window.StudioLooks.apply(back);
        relayout();
    }

    /* ---------- the way in: header button, fold pill, module chips --- */
    function headerButton() {
        var brand = document.querySelector('.control-deck .app-brand');
        if (!brand || document.getElementById('course-open-btn')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.id = 'course-open-btn';
        b.className = 'course-open-btn';
        // Icon only: the header is full at 1440px, and a label wrapped it.
        b.title = 'Course: the lessons, and which tools they use';
        b.setAttribute('aria-label', 'Course');
        b.innerHTML = '<span aria-hidden="true">📘</span>';
        b.addEventListener('click', function () {
            if (lessonId && document.body.classList.contains('course-on')) {
                if (collapsed) setCollapsed(false); else start(lessonId);
            } else showIndex(null);
        });
        var home = document.getElementById('return-to-landing');
        if (home) { home.title = home.title || 'Home'; home.setAttribute('aria-label', 'Home'); }
        if (home && home.nextSibling) brand.insertBefore(b, home.nextSibling); else brand.appendChild(b);

        var pill = document.createElement('button');
        pill.type = 'button';
        pill.id = 'course-pill';
        pill.textContent = '📘 Lesson';
        pill.title = 'Open the lesson again';
        pill.addEventListener('click', function () { setCollapsed(false); });
        document.body.appendChild(pill);
    }

    function chips() {
        var Cr = C();
        if (!Cr || !window.StudioLooks) return;
        var mods = window.StudioLooks.modules();
        Object.keys(mods).forEach(function (mid) {
            var el = moduleEl(mid);
            var header = el && el.querySelector(':scope > .module-header');
            if (!header) return;
            var lessons = Cr.lessonsForModule(mid);
            var chip = header.querySelector(':scope > .course-chip');
            if (!lessons.length) { if (chip) chip.remove(); return; }
            if (!chip) {
                chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'course-chip';
                chip.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    showIndex(mid);
                });
                header.appendChild(chip);
            }
            var done = lessons.filter(function (l) { return Cr.isDone(l.id); }).length;
            chip.textContent = 'Learn · ' + lessons.length;
            chip.title = 'Lessons that use ' + Cr.moduleLabel(mid) + ': ' + lessons.map(function (l) { return l.title; }).join('; ') + ' (' + done + ' done)';
        });
    }

    function init() {
        headerButton();
        chips();
        window.addEventListener('studio:lookchange', function () {
            setTimeout(function () {
                chips();
                if (lessonId) { var l = C().get(lessonId); if (l) spotlight(l.modules); }
            }, 30);
        });
        window.addEventListener('studio:modulepresence', function () { setTimeout(chips, 30); });
        window.addEventListener('course:progress', chips);
        window.addEventListener('resize', place);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pointing) hidePointer(); });
        var home = document.getElementById('return-to-landing');
        if (home) home.addEventListener('click', function () { if (lessonId || document.body.classList.contains('course-on')) leave(); });
    }

    window.CourseRunner = {
        start: start, leave: leave, index: showIndex, current: function () { return lessonId; },
        // for the browser checks: point at / do step k of the current lesson
        point: point, doStep: doStep, stepsDone: function () { return Object.keys(stepDone).map(Number); },
        targets: function () { return Object.keys(TARGETS); }, actions: function () { return Object.keys(ACTIONS); },
        pointerRect: function () { return ring && ring.classList.contains('is-on') ? ring.getBoundingClientRect().toJSON() : null; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
