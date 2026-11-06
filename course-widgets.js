/**
 * THE LESSONS' HANDS-ON PARTS — small players that sit in a lesson's card,
 * where the reading is, so you can hear and change what the text describes.
 *
 *   symbols      the chord-symbol table: pick a root, hear a row, count its
 *                half steps out on a little keyboard (3+3+3 …)
 *   cadences     the four endings in any key, and a game: hear one, name it
 *   progressions the common progressions in any key, looped, or sent to the
 *                studio's Generator
 *   approach     a target chord and a way into it, from home: the 5-of and
 *                4-of in any colour, or a whole progression borrowed from a
 *                scale on the target (D major's Em7 A7 into Dm7)
 *
 * A lesson names its widget in course.js (`widget: { kind, … }`) and leaves a
 * `<div data-course-widget>` in its body; the runner mounts it and lends it
 * `api`: { playNote(midi, dur, time), focus(names, ms), loadDegrees(degrees, key) }.
 * The chords themselves come from course-theory.js, spelled by letter.
 */
(function (root) {
    'use strict';

    var T = function () { return root.CourseTheory; };
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /** A widget's own clock: everything it scheduled stops together. */
    function clock(host) {
        var timers = [];
        return {
            later: function (ms, fn) { timers.push(setTimeout(function () { if (host.isConnected) fn(); }, ms)); },
            stop: function () { timers.forEach(clearTimeout); timers = []; }
        };
    }
    /**
     * Play voiced chords ({all: midis}) one after another, lighting each on
     * the studio piano. `beats` gives each chord's length in seconds.
     */
    function playRun(api, clk, voiced, beats, onChord) {
        var t = 0;
        voiced.forEach(function (v, i) {
            var len = beats[i] || beats[beats.length - 1];
            v.all.forEach(function (m) { api.playNote(m, len * 0.95, t); });
            (function (at) {
                clk.later(at * 1000, function () {
                    if (api.focus) api.focus(v.all.map(T().midiName), len * 1000 + 200);
                    if (onChord) onChord(i);
                });
            })(t);
            t += len;
        });
        return t;
    }
    function keyRow(keys, current, lead) {
        return '<div class="cw-roots" role="group" aria-label="' + esc(lead) + '"><span class="cw-lead">' + esc(lead) + '</span>' +
            keys.map(function (k) { return '<button type="button" class="cw-root' + (k === current ? ' is-on' : '') + '" data-root="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') +
            '</div>';
    }
    /**
     * A chord of a major key from a progression token: '5' is the key's own
     * chord on 5 (a triad, or `size` notes), '5^7' its seventh chord, '5d'
     * a dominant 7th on 5 whatever the key says (the blues' C7, F7, G7).
     */
    function keyChord(key, tok, size) {
        var m = /^(\d)(\^7|d)?$/.exec(tok);
        var n = parseInt(m[1], 10);
        if (m[2] === 'd') {
            var r = T().spell(key, String(n));
            return T().chordFrom(r, '1 3 5 b7', '7');
        }
        return T().scaleChord(key, 'major', n - 1, m[2] === '^7' ? 4 : (size || 3));
    }
    function tokNumber(tok) { return tok.replace(/\^7|d/, ''); }

    /* ---------- the chord-symbol table -------------------------------- */
    var KB_LO = 60, KB_HI = 88;    // C4 to E6: room for a major 9th on B, and a slash chord above it
    function isBlack(m) { return [1, 3, 6, 8, 10].indexOf(m % 12) !== -1; }
    function keyboardHtml() {
        var whites = [], blacks = [], w = 0;
        for (var m = KB_LO; m <= KB_HI; m++) {
            if (isBlack(m)) blacks.push('<span class="csym-key is-black" data-midi="' + m + '" style="left:calc(' + w + ' * var(--csym-w) - var(--csym-w) * 0.3)"><i></i></span>');
            else { whites.push('<span class="csym-key" data-midi="' + m + '"><i></i></span>'); w++; }
        }
        return '<div class="csym-kb" style="--csym-n:' + w + '">' + whites.join('') + blacks.join('') + '</div>';
    }
    /** One row of the table on one root: `d` is its numbers, bottom note first. */
    function symbolChord(rootName, row) {
        var Th = T(), r = Th.parseNote(rootName);
        var degs = row.d.split(/\s+/);
        var base = 60 + r.pc;
        var names = degs.map(function (t) { return Th.spell(rootName, t); });
        var midis = degs.map(function (t) { return base + Th.semis(Th.parseDegree(t)); });
        var steps = midis.slice(1).map(function (m, i) { return m - midis[i]; });
        var symbol = row.slash ? rootName + '/' + Th.spell(rootName, row.slash) : rootName + row.sym;
        return { symbol: symbol, alt: row.alt ? rootName + row.alt : '', say: row.say, numbers: degs.map(Th.numberLabel), names: names, midis: midis, steps: steps };
    }

    function mountSymbols(host, data, api) {
        var rootName = data.roots[0], selected = -1, clk = clock(host);
        // the root and the keys stay in view while you scroll the rows
        host.innerHTML =
            '<div class="csym-head">' + keyRow(data.roots, rootName, 'Root') + keyboardHtml() +
                '<div class="cw-status" aria-live="polite"></div>' +
            '</div>' +
            '<table class="course-symbols csym-table"><thead><tr><th>Symbol</th><th>Numbers · notes</th><th>Half steps</th></tr></thead><tbody></tbody></table>';
        var tbody = host.querySelector('tbody'), status = host.querySelector('.cw-status');

        function keyEl(m) { return host.querySelector('.csym-key[data-midi="' + m + '"]'); }
        function clearKeys() {
            host.querySelectorAll('.csym-key').forEach(function (k) { k.classList.remove('is-tone', 'is-pass', 'is-root'); k.querySelector('i').textContent = ''; });
        }
        function lightTone(c, i) {
            var k = keyEl(c.midis[i]);
            if (!k) return;
            k.classList.remove('is-pass');
            k.classList.add('is-tone');
            if (i === 0) k.classList.add('is-root');
            k.querySelector('i').textContent = c.numbers[i];
        }
        function playChord(c) {
            c.midis.forEach(function (m) { api.playNote(m, 1.4, 0); });
            if (api.focus) api.focus(c.midis.map(T().midiName), 2000);
        }
        /** Each number over the note it names: ♭3 over E♭. */
        function degreesHtml(c) {
            return c.names.map(function (n, i) {
                var s = T().soundsAs(n, c.midis[i]);
                return '<span class="csym-dn"><b>' + esc(c.numbers[i]) + '</b>' + esc(n) +
                       (s ? '<span class="csym-sounds" title="sounds ' + esc(s) + '">=' + esc(s) + '</span>' : '') + '</span>';
            }).join('');
        }
        function select(k) {
            selected = k;
            tbody.querySelectorAll('tr').forEach(function (tr) { tr.classList.toggle('is-on', +tr.getAttribute('data-k') === k); });
        }
        /** Hear row k: all its notes lit at once, with their numbers. */
        function hearRow(k) {
            clk.stop(); clearKeys(); select(k);
            var c = symbolChord(rootName, data.rows[k]);
            c.midis.forEach(function (m, i) { lightTone(c, i); });
            status.innerHTML = '<b>' + esc(c.symbol) + '</b> ' + esc(c.say) + ': ' + c.numbers.join(' ') + ' · ' + c.steps.join('+') + ' half steps';
            playChord(c);
        }
        /** Count row k out: from the bottom note, one half step at a time, each chord note sounding as it is reached. */
        function countRow(k) {
            clk.stop(); clearKeys(); select(k);
            var c = symbolChord(rootName, data.rows[k]);
            var STEP = 230, LAND = 320, t = 0;
            var said = [esc(c.names[0])];
            lightTone(c, 0);
            api.playNote(c.midis[0], 0.5, 0);
            status.innerHTML = 'Start on <b>' + esc(c.names[0]) + '</b>, then count half steps up.';
            c.steps.forEach(function (n, s) {
                var from = c.midis[s];
                t += LAND;
                for (var h = 1; h <= n; h++) {
                    (function (h, at) {
                        clk.later(at, function () {
                            var key = keyEl(from + h);
                            if (!key) return;
                            if (h < n) { key.classList.add('is-pass'); key.querySelector('i').textContent = h; }
                            else {
                                lightTone(c, s + 1);
                                api.playNote(from + h, 0.5, 0);
                                said.push('<span class="cw-count">+' + n + '</span> ' + esc(c.names[s + 1]));
                                status.innerHTML = said.join(' ');
                            }
                        });
                    })(h, t + h * STEP);
                }
                t += n * STEP;
                clk.later(t + 120, function () {    // the counted-over keys go quiet, the chord's note stays
                    for (var h = 1; h < n; h++) { var key = keyEl(from + h); if (key && !key.classList.contains('is-tone')) { key.classList.remove('is-pass'); key.querySelector('i').textContent = ''; } }
                });
            });
            clk.later(t + LAND + 200, function () {
                status.innerHTML = said.join(' ') + ' = <b>' + esc(c.symbol) + '</b> (' + c.steps.join('+') + ')';
                playChord(c);
            });
        }
        function render() {
            clk.stop(); clearKeys(); selected = -1;
            status.innerHTML = 'Click a symbol to hear it, or its half steps to count them out on the keys.';
            host.querySelectorAll('.cw-root').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-root') === rootName); });
            tbody.innerHTML = data.rows.map(function (row, k) {
                var c = symbolChord(rootName, row);
                return '<tr data-k="' + k + '">' +
                    '<td><button type="button" class="cw-play" data-k="' + k + '" title="Hear ' + esc(c.symbol) + '">▶ ' + esc(c.symbol) + '</button>' +
                        '<span class="cw-say">' + esc(c.say) + (c.alt ? ' · ' + esc(c.alt) : '') + '</span></td>' +
                    '<td class="csym-num">' + degreesHtml(c) + '</td>' +
                    '<td><button type="button" class="csym-steps" data-k="' + k + '" title="Count the half steps on the keys">' + c.steps.join('+') + '</button></td></tr>';
            }).join('');
        }
        host.addEventListener('click', function (e) {
            var r = e.target.closest('.cw-root'), p = e.target.closest('.cw-play'), s = e.target.closest('.csym-steps');
            if (r) { rootName = r.getAttribute('data-root'); var was = selected; render(); if (was >= 0) hearRow(was); }
            else if (p) hearRow(+p.getAttribute('data-k'));
            else if (s) countRow(+s.getAttribute('data-k'));
        });
        render();
    }

    /* ---------- cadences: the four endings, and a game ---------------- */
    function mountCadences(host, data, api) {
        var key = data.keys[0], clk = clock(host), mystery = -1, streak = 0;
        host.innerHTML = keyRow(data.keys, key, 'Key') + '<div class="cw-status" aria-live="polite"></div><div class="cw-rows"></div>' +
            '<div class="cw-game"><button type="button" class="cw-btn cw-mystery">🎧 Guess the ending</button><div class="cw-guesses" hidden></div></div>';
        var rows = host.querySelector('.cw-rows'), status = host.querySelector('.cw-status');
        var game = host.querySelector('.cw-guesses');

        function phrase(e) {
            var toks = e.phrase.split(' ');
            var chords = toks.map(function (t) { return keyChord(key, t); });
            return { toks: toks, chords: chords, voiced: T().voiceRun(chords) };
        }
        function play(k, quiet) {
            clk.stop();
            var e = data.endings[k], p = phrase(e);
            var beats = p.chords.map(function (c, i) { return i === p.chords.length - 1 ? 1.8 : 0.9; });
            rows.querySelectorAll('.cw-row').forEach(function (r) { r.classList.toggle('is-on', !quiet && +r.getAttribute('data-k') === k); });
            playRun(api, clk, p.voiced, beats, function (i) {
                if (quiet) return;
                var cells = rows.querySelectorAll('.cw-row[data-k="' + k + '"] .cw-ch');
                cells.forEach(function (c, j) { c.classList.toggle('is-now', j === i); });
            });
        }
        function render() {
            clk.stop();
            host.querySelectorAll('.cw-root').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-root') === key); });
            status.textContent = 'Every phrase starts at home, on 1. Listen to where it stops.';
            rows.innerHTML = data.endings.map(function (e, k) {
                var p = phrase(e);
                var chords = p.chords.map(function (c, i) {
                    return (i === p.chords.length - 1 ? '<span class="cw-arrow">→</span>' : '') +
                        '<span class="cw-ch' + (i === p.chords.length - 1 ? ' is-last' : '') + '"><b>' + esc(c.symbol) + '</b><i>' + esc(tokNumber(p.toks[i])) + '</i></span>';
                }).join('');
                return '<div class="cw-row" data-k="' + k + '">' +
                    '<button type="button" class="cw-play" data-k="' + k + '">▶ ' + esc(e.nick) + '</button>' +
                    '<span class="cw-say">' + esc(e.name) + '</span>' +
                    '<div class="cw-chords">' + chords + '</div>' +
                    '<div class="cw-says">' + esc(e.says) + '</div></div>';
            }).join('');
        }
        function ask() {
            mystery = Math.floor(Math.random() * data.endings.length);
            play(mystery, true);
            game.hidden = false;
            game.innerHTML = '<span class="cw-lead">Which was it?</span>' + data.endings.map(function (e, k) {
                return '<button type="button" class="cw-btn cw-guess" data-k="' + k + '">' + esc(e.nick) + '</button>';
            }).join('') + '<button type="button" class="cw-btn cw-again" title="Hear it again">↻</button><div class="cw-verdict"></div>';
        }
        host.addEventListener('click', function (e) {
            var r = e.target.closest('.cw-root'), p = e.target.closest('.cw-play'), g = e.target.closest('.cw-guess');
            if (r) { key = r.getAttribute('data-root'); render(); }
            else if (p) play(+p.getAttribute('data-k'));
            else if (e.target.closest('.cw-mystery')) ask();
            else if (e.target.closest('.cw-again') && mystery >= 0) play(mystery, true);
            else if (g && mystery >= 0) {
                var k = +g.getAttribute('data-k'), right = k === mystery, v = game.querySelector('.cw-verdict');
                streak = right ? streak + 1 : 0;
                v.className = 'cw-verdict ' + (right ? 'is-ok' : 'is-no');
                v.textContent = right ? 'Yes: the ' + data.endings[k].nick.toLowerCase() + '. ' + (streak > 1 ? streak + ' in a row.' : '') + ' Press 🎧 for another.'
                                      : 'Not that one. It was the ' + data.endings[mystery].nick.toLowerCase() + ': press ▶ on it above to hear it again.';
                if (!right) mystery = -1;
            }
        });
        render();
    }

    /* ---------- common progressions ----------------------------------- */
    function mountProgressions(host, data, api) {
        var key = data.keys[0], clk = clock(host), playing = -1, loop = false;
        host.innerHTML = keyRow(data.keys, key, 'Key') +
            '<div class="cw-bar"><div class="cw-status" aria-live="polite"></div><label class="cw-loop"><input type="checkbox"> Loop</label></div>' +
            '<div class="cw-rows"></div>';
        var rows = host.querySelector('.cw-rows'), status = host.querySelector('.cw-status');

        function chordsOf(p) { return p.d.split(' ').map(function (t) { return keyChord(key, t); }); }
        function stop() {
            clk.stop(); playing = -1;
            rows.querySelectorAll('.cw-play').forEach(function (b) { b.textContent = '▶ ' + b.getAttribute('data-name'); });
            rows.querySelectorAll('.cw-ch').forEach(function (c) { c.classList.remove('is-now'); });
        }
        function play(k) {
            stop();
            playing = k;
            var p = data.list[k], chords = chordsOf(p), voiced = T().voiceRun(chords);
            var b = rows.querySelector('.cw-play[data-k="' + k + '"]');
            if (b) b.textContent = '■ ' + p.name;
            var cells = rows.querySelectorAll('.cw-row[data-k="' + k + '"] .cw-ch');
            var len = playRun(api, clk, voiced, chords.map(function () { return p.beat || 0.85; }), function (i) {
                cells.forEach(function (c, j) { c.classList.toggle('is-now', j === i); });
            });
            clk.later(len * 1000, function () { if (loop && playing === k) play(k); else stop(); });
        }
        function render() {
            stop();
            host.querySelectorAll('.cw-root').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-root') === key); });
            status.textContent = 'Each number is the key’s chord on that note. ▶ to hear one; ⇢ puts it in the Generator.';
            rows.innerHTML = data.list.map(function (p, k) {
                var toks = p.d.split(' ');
                var chords = chordsOf(p).map(function (c, i) {
                    return '<span class="cw-ch"><b>' + esc(c.symbol) + '</b><i>' + esc(tokNumber(toks[i])) + '</i></span>';
                }).join('');
                return '<div class="cw-row" data-k="' + k + '">' +
                    '<button type="button" class="cw-play" data-k="' + k + '" data-name="' + esc(p.name) + '">▶ ' + esc(p.name) + '</button>' +
                    (api.loadDegrees ? '<button type="button" class="cw-btn cw-send" data-k="' + k + '" title="Put it in the Generator, so the sheet and the chord strip show it">⇢</button>' : '') +
                    (p.known ? '<span class="cw-say">' + esc(p.known) + '</span>' : '') +
                    '<div class="cw-chords">' + chords + '</div></div>';
            }).join('');
        }
        host.addEventListener('change', function (e) { if (e.target.closest('.cw-loop')) loop = e.target.checked; });
        host.addEventListener('click', function (e) {
            var r = e.target.closest('.cw-root'), p = e.target.closest('.cw-play'), s = e.target.closest('.cw-send');
            if (r) { key = r.getAttribute('data-root'); render(); }
            else if (p) { var k = +p.getAttribute('data-k'); if (playing === k) stop(); else play(k); }
            else if (s) {
                var pr = data.list[+s.getAttribute('data-k')];
                var ok = api.loadDegrees(pr.d.split(' ').map(function (t) { return parseInt(t, 10); }), key);
                status.textContent = ok ? 'In the Generator now: ' + tokNumbers(pr.d) + ' in ' + key + ' major. The sheet and chord strip follow.' : 'The Generator isn’t open in this layout.';
            }
        });
        function tokNumbers(d) { return d.split(' ').map(tokNumber).join(' '); }
        render();
    }

    /* ---------- approach a target ------------------------------------- */
    /**
     * Home → the way in → the target. In 'of' mode the way in is the target's
     * 5-of or 4-of, in a colour you pick (C7, B♭maj7, B♭m6 …); in 'scale'
     * mode it is a progression borrowed from a scale built on the target, and
     * the target stands in for that scale's own 1 chord.
     */
    function mountApproach(host, data, api) {
        var st = { key: data.keys[0], target: data.targets[0], move: 0, quality: 0, pattern: 0, scale: data.scales ? data.scales[0] : null };
        var clk = clock(host), voiced = null, seq = null;
        var ofMode = data.mode === 'of';

        function sel(name, label, opts, value) {
            return '<label class="cw-field"><span>' + esc(label) + '</span><select data-f="' + name + '">' +
                opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
                '</select></label>';
        }
        function homeChord() { return T().scaleChord(st.key, 'major', 0, 4); }
        function targetChord() { return T().scaleChord(st.key, 'major', st.target - 1, 4); }
        function build() {
            var home = homeChord(), target = targetChord(), tRoot = target.names[0], out = [];
            out.push({ c: home, label: '1 of ' + st.key + ' · home' });
            if (ofMode) {
                var mv = data.moves[st.move], q = mv.qualities[Math.min(st.quality, mv.qualities.length - 1)];
                var r = T().spell(tRoot, mv.interval);
                out.push({ c: T().chordFrom(r, q.d, q.s), label: mv.interval + ' of ' + tRoot });
            } else {
                var sc = T().SCALES[st.scale];
                data.patterns[st.pattern].split(' ').forEach(function (num) {
                    var c = T().scaleChord(tRoot, st.scale, num, 4);
                    out.push({ c: c, label: c.label + ' of ' + tRoot + ' ' + sc.name });
                });
            }
            out.push({ c: target, label: 'target' });
            return out;
        }
        function caption(s) {
            var target = s[s.length - 1].c, tRoot = target.names[0];
            if (ofMode) {
                var mv = data.moves[st.move], ap = s[1].c;
                return '<b>' + esc(ap.names[0]) + '</b> is ' + esc(mv.say) + ' <b>' + esc(tRoot) + '</b>, so ' + esc(ap.symbol) + ' leads into ' + esc(target.symbol) + '.';
            }
            var own = T().scaleChord(tRoot, st.scale, 0, 4);
            return 'Make <b>' + esc(tRoot) + '</b> the 1 and borrow from ' + esc(tRoot) + ' ' + esc(T().SCALES[st.scale].name) + ', then land on <b>' + esc(target.symbol) +
                   '</b> in place of that scale’s own 1, ' + esc(own.symbol) + '.';
        }
        function render() {
            clk.stop();
            var targets = data.targets.map(function (t) { return [t, T().scaleChord(st.key, 'major', t - 1, 4).symbol + ' (' + t + ')']; });
            var fields = sel('key', 'Key', data.keys.map(function (k) { return [k, k + ' major']; }), st.key) + sel('target', 'Target', targets, st.target);
            if (ofMode) {
                var mv = data.moves[st.move];
                fields += sel('move', 'Way in', data.moves.map(function (m, i) { return [i, m.name]; }), st.move) +
                          sel('quality', 'As a', mv.qualities.map(function (q, i) { return [i, q.name]; }), Math.min(st.quality, mv.qualities.length - 1));
            } else {
                fields += sel('pattern', 'Progression', data.patterns.map(function (p, i) { return [i, p.split(' ').join('-') + ' → 1']; }), st.pattern) +
                          sel('scale', 'From the scale', data.scales.map(function (id) { return [id, T().SCALES[id].name]; }), st.scale);
            }
            seq = build();
            voiced = T().voiceRun(seq.map(function (x) { return x.c; }));
            var homePcs = T().scaleTokens('major').map(function (t) { return T().pcOf(T().spell(st.key, t)); });
            var chips = seq.map(function (x, i) {
                var prev = i ? voiced[i - 1].upper : null;
                var notes = voiced[i].upper.map(function (m) {
                    var pc = m % 12, name = x.c.names[x.c.pcs.indexOf(pc)] || T().SOUNDS[pc];
                    var cls = (homePcs.indexOf(pc) === -1 ? ' is-out' : '') + (prev && prev.indexOf(m) === -1 ? ' is-moved' : '');
                    return '<span class="cw-n' + cls + '">' + esc(name) + '</span>';
                }).join('');
                return (i ? '<span class="cw-arrow">→</span>' : '') +
                    '<button type="button" class="cw-chip' + (i === seq.length - 1 ? ' is-target' : '') + '" data-i="' + i + '" title="Hear ' + esc(x.c.symbol) + '">' +
                    '<b>' + esc(x.c.symbol) + '</b><i>' + esc(x.label) + '</i><span class="cw-ns">' + notes + '</span></button>';
            }).join('');
            // what you are hearing first; the examples to try under it
            host.innerHTML =
                '<div class="cw-fields">' + fields + '</div>' +
                '<div class="cw-seq">' + chips + '</div>' +
                '<div class="cw-foot"><button type="button" class="cw-btn cw-go">▶ Play it</button>' +
                    '<span class="cw-key"><span class="cw-n is-out">x</span> outside ' + esc(st.key) + ' major · <span class="cw-n is-moved">x</span> moved</span></div>' +
                '<div class="cw-status">' + caption(seq) + '</div>' +
                (data.presets ? '<div class="cw-presets"><span class="cw-lead">Try</span>' + data.presets.map(function (p, i) {
                    return '<button type="button" class="cw-btn cw-preset" data-p="' + i + '">' + esc(p.label) + '</button>'; }).join('') + '</div>' : '');
        }
        function playAll() {
            clk.stop();
            var chips = host.querySelectorAll('.cw-chip');
            var beats = seq.map(function (x, i) { return i === seq.length - 1 ? 2.0 : 1.05; });
            var len = playRun(api, clk, voiced, beats, function (i) { chips.forEach(function (c, j) { c.classList.toggle('is-now', j === i); }); });
            clk.later(len * 1000, function () { chips.forEach(function (c) { c.classList.remove('is-now'); }); });
        }
        function playOne(i) {
            clk.stop();
            voiced[i].all.forEach(function (m) { api.playNote(m, 1.4, 0); });
            if (api.focus) api.focus(voiced[i].all.map(T().midiName), 1600);
        }
        host.addEventListener('change', function (e) {
            var f = e.target.getAttribute('data-f');
            if (!f) return;
            var v = e.target.value;
            if (f === 'key' || f === 'scale') st[f] = v; else st[f] = parseInt(v, 10);
            if (f === 'move') st.quality = 0;
            render();
        });
        host.addEventListener('click', function (e) {
            var c = e.target.closest('.cw-chip'), p = e.target.closest('.cw-preset');
            if (c) playOne(+c.getAttribute('data-i'));
            else if (e.target.closest('.cw-go')) playAll();
            else if (p) {
                // a preset names its choices: pattern '2 5', move '4', quality 'm6'
                var pre = data.presets[+p.getAttribute('data-p')];
                if (pre.key) st.key = pre.key;
                if (pre.target) st.target = pre.target;
                if (pre.scale) st.scale = pre.scale;
                if (pre.pattern) st.pattern = Math.max(0, data.patterns.indexOf(pre.pattern));
                if (pre.move) st.move = Math.max(0, data.moves.map(function (m) { return m.interval; }).indexOf(pre.move));
                if (pre.quality) st.quality = Math.max(0, data.moves[st.move].qualities.map(function (q) { return q.s; }).indexOf(pre.quality));
                render(); playAll();
            }
        });
        render();
    }

    root.CourseWidgets = {
        symbols: mountSymbols, cadences: mountCadences, progressions: mountProgressions, approach: mountApproach,
        // for tools/course-test.js
        symbolChord: symbolChord, keyChord: keyChord
    };
})(typeof window !== 'undefined' ? window : this);
