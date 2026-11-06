/**
 * What every Learn page shares, so they read as one course: the header
 * (Home, title, theme), the one-question check, and Complete → next lesson
 * with a cheer that names what was just learned.
 *
 * Styles are in course.css (.lc-*). Pages call these when they render;
 * nothing here runs on load.
 */
(function (root) {
    'use strict';

    var THEMES = ['clean-daw', 'channel-strip', 'matrix-fx', 'steam-2000'];

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function goHome() { root.showAppPage('landing-page'); }

    function cycleTheme() {
        var cur = document.body.getAttribute('data-theme');
        var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
        document.body.setAttribute('data-theme', next);
        try { localStorage.setItem('music-theory-theme', next); } catch (e) {}
    }

    /**
     * The bar at the top of a Learn page.
     * o: { title, icon, subtitle, homeId, themeId, extra: [elements for the right side] }
     * homeId/themeId keep the ids a page has always had.
     */
    function header(o) {
        var bar = document.createElement('div');
        bar.className = 'lc-header';
        bar.innerHTML =
            '<button type="button" class="lc-btn lc-home"' + (o.homeId ? ' id="' + o.homeId + '"' : '') + '>← Home</button>' +
            '<div class="lc-title-wrap"><h2 class="lc-title">' + (o.icon ? '<span aria-hidden="true">' + o.icon + '</span> ' : '') + esc(o.title) + '</h2>' +
            (o.subtitle ? '<div class="lc-subtitle">' + o.subtitle + '</div>' : '') + '</div>' +
            '<div class="lc-extra"></div>' +
            '<button type="button" class="lc-btn lc-theme"' + (o.themeId ? ' id="' + o.themeId + '"' : '') + ' aria-label="Change colour theme" title="Change colour theme">🌓</button>';
        bar.querySelector('.lc-home').addEventListener('click', goHome);
        bar.querySelector('.lc-theme').addEventListener('click', cycleTheme);
        var extra = bar.querySelector('.lc-extra');
        (o.extra || []).forEach(function (el) { extra.appendChild(el); });
        return bar;
    }

    /** The instrument chosen for the course: 'piano' or 'guitar'. */
    function instrument() {
        try { return localStorage.getItem('music-theory-instrument') === 'guitar' ? 'guitar' : 'piano'; } catch (e) { return 'piano'; }
    }

    /**
     * With the guitar chosen, its sound; otherwise null. It takes what the
     * pages' own engines take: a duration or an options object, then a start time.
     */
    function guitarSound() {
        var eng = instrument() === 'guitar' && root.modularApp && root.modularApp.guitarEngine;
        if (!eng) return null;
        return {
            playNote: function (midi, o, time) {
                var opts = typeof o === 'number' ? { duration: o } : Object.assign({}, o);
                if (time) opts.time = time;
                eng.playNote(midi, opts);
            },
            playChord: function (midis, o) { eng.playChord(midis, o); }
        };
    }

    /**
     * A small drawing of notes as one hand shape, in the tuning on now: the
     * top line is the thinnest string, as on the big neck. Drawn again by the
     * page when the tuning changes.
     */
    function chordBox(host, midis, names) {
        var GF = root.GuitarFretboardVisualizer, open = root.GuitarTuning.midi(), cells = [];
        open.forEach(function (m, string) {
            for (var fret = 0; fret <= 15; fret++) cells.push({ midi: m + fret, fret: fret, string: string });
        });
        var placed = GF.placeOnNeck(midis, cells, 5, { span: 4 });
        if (!placed) { host.textContent = names.join(' · '); return; }
        var fretted = placed.map(function (p) { return p.fret; }).filter(function (f) { return f > 0; });
        var first = fretted.length ? Math.min.apply(null, fretted) : 1;
        var COUNT = 5, LEFT = 24, TOP = 8, FRET = 26, GAP = 11;
        var x = function (f) { return f === 0 ? LEFT - 12 : LEFT + (f - first + 0.5) * FRET; };
        var y = function (s) { return TOP + (5 - s) * GAP; };
        var svg = '';
        for (var s = 0; s < 6; s++) svg += '<line x1="' + LEFT + '" x2="' + (LEFT + COUNT * FRET) + '" y1="' + y(s) + '" y2="' + y(s) + '" stroke="#b9a27a"/>';
        for (var f = 0; f <= COUNT; f++) svg += '<line x1="' + (LEFT + f * FRET) + '" x2="' + (LEFT + f * FRET) + '" y1="' + TOP + '" y2="' + (TOP + 5 * GAP) + '" stroke="#8a8a8a"' + (f === 0 && first === 1 ? ' stroke-width="3"' : '') + '/>';
        placed.forEach(function (p) {
            var i = midis.indexOf(p.midi), name = names[i] || '';
            svg += '<circle cx="' + x(p.fret) + '" cy="' + y(p.string) + '" r="7" fill="var(--accent-secondary)"/>' +
                '<text x="' + x(p.fret) + '" y="' + (y(p.string) + 3) + '" text-anchor="middle" font-size="8" font-weight="700" fill="#000">' + esc(name) + '</text>';
        });
        svg += '<text x="' + (LEFT + FRET / 2) + '" y="' + (TOP + 5 * GAP + 13) + '" text-anchor="middle" font-size="9" fill="var(--text-muted)">fret ' + first + '</text>';
        host.innerHTML = '<svg class="lc-chord-box" viewBox="0 0 ' + (LEFT + COUNT * FRET + 6) + ' ' + (TOP + 5 * GAP + 18) + '" role="img" aria-label="' + esc(names.join(', ')) + ' on the guitar">' + svg + '</svg>';
    }

    /**
     * With the guitar chosen: a page's chord on a neck, one hand shape where a
     * hand can hold it, in the tuning on now. A page keeps one across visits:
     * put(parent) when it renders, and show(midis, names) when its chord changes.
     * o.title: a heading, when the neck is not already the page's instrument.
     */
    function chordNeck(o) {
        var panel = null, neck = null, said = null, midis = [], names = [];

        function draw() {
            if (!neck) return;
            neck.state.spelling = names;
            neck.clearFocusNotes();
            neck.clearMidiNotes();
            if (!midis.length) return;
            var held = neck.midiChordOn(midis);
            if (!held) neck.setFocusNotes(names);
            said.textContent = held
                ? 'The lit notes are one hand shape in this tuning. Change the tuning and the shape moves.'
                : 'Too wide for one hand in this tuning, so every place these notes live is lit.';
        }

        function build() {
            panel = document.createElement('div');
            panel.className = 'lc-neck';
            panel.innerHTML = (o && o.title ? '<div class="lc-neck-title">' + esc(o.title) + '</div>' : '') +
                '<div class="lc-neck-board"></div><div class="lc-neck-said"></div>';
            said = panel.querySelector('.lc-neck-said');
        }

        return {
            put: function (parent) {
                var app = root.modularApp;
                if (instrument() !== 'guitar' || !root.GuitarFretboardVisualizer) { if (panel) panel.remove(); return; }
                if (!panel) build();
                if (panel.parentNode !== parent) parent.appendChild(panel);
                if (!neck) {
                    neck = new root.GuitarFretboardVisualizer({
                        audioEngine: app && app.guitarEngine, frets: 15, showNoteLabels: true, legend: false
                    });
                    neck.mount(panel.querySelector('.lc-neck-board'));
                    root.addEventListener('guitar-tuning:change', draw);   // after the neck's own listener: it has retuned by then
                }
                draw();
            },
            show: function (list, spelled) {
                midis = list || [];
                names = spelled || [];
                draw();
            }
        };
    }

    /**
     * One question. It teaches rather than grades: a wrong answer says why,
     * and you can try again. It never blocks moving on.
     * o: { q, options: [..], answer: index, why: 'html shown when right', wrong: optional [per-option html] }
     */
    function quiz(host, o) {
        var box = document.createElement('div');
        box.className = 'lc-quiz';
        box.innerHTML = '<div class="lc-quiz-q"><span class="lc-quiz-tag">Check</span> ' + o.q + '</div><div class="lc-quiz-options"></div><div class="lc-quiz-say" role="status"></div>';
        var opts = box.querySelector('.lc-quiz-options');
        var say = box.querySelector('.lc-quiz-say');
        o.options.forEach(function (text, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'lc-btn lc-quiz-opt';
            b.innerHTML = text;
            b.addEventListener('click', function () {
                opts.querySelectorAll('.lc-quiz-opt').forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
                if (i === o.answer) {
                    b.classList.add('is-right');
                    say.className = 'lc-quiz-say is-right';
                    say.innerHTML = '<b>Right.</b> ' + (o.why || '');
                } else {
                    b.classList.add('is-wrong');
                    say.className = 'lc-quiz-say is-wrong';
                    say.innerHTML = '<b>Not quite.</b> ' + ((o.wrong && o.wrong[i]) || 'Try another.');
                }
            });
            opts.appendChild(b);
        });
        if (host) host.appendChild(box);
        return box;
    }

    /* ---------- finishing a lesson --------------------------------------- */
    var CHEERS = [
        'Nice work!', 'You got it!', 'That’s one more in the bag.', 'Look at you go!',
        'Solid. Onward!', 'Your ears are getting sharper.', 'Another one down!',
        'That’s real progress.', 'Keep that momentum!', 'Well played!'
    ];
    var lastCheer = -1;

    /** A short toast: a cheer that is never the same twice running, what was learned, what's next. */
    function cheer(learned, upNext) {
        var i;
        do { i = Math.floor(Math.random() * CHEERS.length); } while (i === lastCheer);
        lastCheer = i;
        var old = document.getElementById('lc-cheer');
        if (old) old.remove();
        var toast = document.createElement('div');
        toast.id = 'lc-cheer';
        toast.className = 'lc-cheer';
        toast.setAttribute('role', 'status');
        toast.innerHTML = '<div class="lc-cheer-big">🎉 ' + CHEERS[i] + '</div>' +
            (learned ? '<div class="lc-cheer-learned">' + learned + '</div>' : '') +
            (upNext ? '<div class="lc-cheer-next">Up next: ' + esc(upNext) + '</div>' : '');
        var close = function () { toast.style.opacity = '0'; setTimeout(function () { toast.remove(); }, 400); };
        toast.addEventListener('click', close);
        document.body.appendChild(toast);
        setTimeout(close, 3000);
    }

    /** Mark a course lesson done, cheer, and open the next lesson in the course. */
    function finish(id, learned) {
        var C = root.Course;
        var next = C && C.next ? C.next(id) : null;
        if (C && C.markDone && id !== 'b-scales') C.markDone(id);   // Learn Scales counts its own nine
        if (next) C.start(next.id);
        else root.showAppPage('landing-page');
        cheer(learned, next ? next.title : '');
    }

    /** The button at the end of a lesson. o: { id, learned, label } */
    function completeBar(host, o) {
        var bar = document.createElement('div');
        bar.className = 'lc-complete';
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lc-btn lc-complete-btn';
        b.textContent = o.label || 'Complete lesson →';
        b.addEventListener('click', function () { finish(o.id, o.learned); });
        bar.appendChild(b);
        if (host) host.appendChild(bar);
        return bar;
    }

    /* ---------- spelling on the piano ------------------------------------ */
    var COMMON_BLACK = { 1: 'D♭', 3: 'E♭', 6: 'F♯', 8: 'A♭', 10: 'B♭' };   // the course's root list
    var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

    function glyphs(name) { return String(name).replace(/#/g, '♯').replace(/b/g, '♭'); }

    function pcOfName(name) {
        var m = /^([A-G])([#♯b♭]*)$/.exec(name);
        if (!m) return null;
        var pc = LETTER_PC[m[1]];
        m[2].split('').forEach(function (a) { pc += (a === '#' || a === '♯') ? 1 : -1; });
        return ((pc % 12) + 12) % 12;
    }

    /**
     * Relabel a PianoVisualizer's black keys: the visible text only, data-note
     * stays as it is. The keys say C#4 whatever you are playing; here they use
     * the scale's own name for a key when it has one (E♭ in C minor), else the
     * course's common name. Call it again after the piano redraws.
     */
    function spellPianoKeys(pianoEl, scaleNames) {
        if (!pianoEl) return;
        var byPc = {};
        (scaleNames || []).forEach(function (n) { var pc = pcOfName(n); if (pc !== null) byPc[pc] = glyphs(n); });
        pianoEl.querySelectorAll('.piano-black-key[data-midi]').forEach(function (key) {
            var pc = parseInt(key.getAttribute('data-midi'), 10) % 12;
            var name = byPc[pc] || COMMON_BLACK[pc];
            var octave = key.getAttribute('data-octave');
            var kids = key.children;
            for (var i = 0; i < kids.length; i++) {
                if (/^[A-G][#♯b♭]+\d$/.test(kids[i].textContent.trim())) { kids[i].textContent = name + octave; break; }
            }
        });
    }

    root.LearnCommon = {
        instrument: instrument, guitarSound: guitarSound, chordBox: chordBox, chordNeck: chordNeck, header: header, quiz: quiz, cheer: cheer, finish: finish, completeBar: completeBar, goHome: goHome, spellPianoKeys: spellPianoKeys, commonBlack: COMMON_BLACK };
})(window);
