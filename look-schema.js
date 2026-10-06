/**
 * @module LookSchema
 * @description What a studio look IS, as data — so a look can be checked,
 * previewed and, eventually, written by the person using the studio.
 *
 *   {
 *     id, name, tagline, principle,          // words: what the look is for
 *     grid: {                                // where the zones go
 *       areas: ['a b c'],                    //   rows of zone keys ('.' = empty)
 *       cols:  '52px minmax(0, 1fr) 52px',   //   CSS track lists
 *       rows:  'minmax(0, 1fr)',
 *       below: [{ width: 1100, areas, cols, rows }]   // narrower screens
 *     },
 *     zones: { a: { flow, label, why, side, tone, height, maxHeight, modules: [] } },
 *     divider: { zone: 's', axis: 'x' | 'y' },
 *     tabs:    { bar: 't', panes: 'a', default: 'sheet' },
 *     stage:   'sheet',                      // the module the look is about
 *     claims:  ['fretboard'],                // instruments it takes out of the dock
 *     dock:    { height: 'clamp(210px, 30vh, 380px)' }
 *   }
 *
 * The grid is applied through CSS custom properties (--look-areas, ...), not
 * inline grid-template-*, so the stylesheet's small-screen fallback (which
 * stacks every look into one column under 860px) still overrides it.
 *
 * validate() is the gate every look passes through — built-in looks at
 * load, and any look a person makes or imports. It accepts only known
 * fields, known modules and zone types, short strings, CSS lengths built
 * from a small vocabulary (no url(), no quotes, no semicolons) and
 * rectangular grid areas; it returns a clean copy, never the input.
 *
 * Pure: no DOM. Loaded before studio-looks.js.
 */
(function (root) {
    'use strict';

    var FLOWS = ['column', 'row', 'rail', 'drawer', 'reading', 'strips', 'orbit', 'page',
                 'bench', 'compact', 'legend', 'mosaic', 'tabs', 'solo'];
    var TONES = ['plain', 'quiet', 'accent', 'input', 'tool'];
    var MAX = { name: 40, tagline: 60, principle: 300, label: 24, why: 160, zones: 8, rows: 8, cols: 8, below: 4, css: 200 };

    function str(v, max) {
        if (v == null) return '';
        // printable text only: no control characters
        return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
    }

    /** Split a CSS track list at top-level spaces: "a minmax(1px, 2fr) b" -> 3 tracks. */
    function tracks(list) {
        var out = [], depth = 0, cur = '';
        String(list || '').trim().split('').forEach(function (ch) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
            if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; }
            else cur += ch;
        });
        if (cur) out.push(cur);
        return depth === 0 ? out : null;
    }

    /**
     * A CSS length or track list from a small, safe vocabulary: numbers with
     * units, a handful of sizing functions and keywords, and the one variable
     * looks use (the divider's --look-split). No url(), quotes, semicolons or
     * anything else.
     */
    var CSS_OK = /^[a-z0-9.%(),\s+\-*/]+$/i;
    var CSS_ALLOWED = ['minmax', 'clamp', 'min', 'max', 'calc', 'auto', 'none',
                       'min-content', 'max-content', 'fit-content'];
    function cssValue(v) {
        if (v == null || v === '') return null;
        var s = String(v).trim();
        if (!s || s.length > MAX.css || !CSS_OK.test(s)) return null;
        var probe = s.replace(/var\(\s*--look-split\s*(?:,\s*\d+(?:\.\d+)?(?:fr|px|%)\s*)?\)/g, ' ');
        if (/var\(|--/.test(probe)) return null;
        probe = probe.replace(/\d+(?:\.\d+)?(?:px|fr|vh|vw|em|rem|ch|%)?/g, ' ');
        var words = probe.match(/[a-z][a-z-]*/gi) || [];
        if (words.some(function (w) { return CSS_ALLOWED.indexOf(w.toLowerCase()) === -1; })) return null;
        var depth = 0;
        for (var i = 0; i < s.length; i++) {
            if (s[i] === '(') depth++;
            if (s[i] === ')' && --depth < 0) return null;
        }
        return depth === 0 ? s : null;
    }

    /** Grid areas: rows of zone keys, same width, every key a rectangle. */
    function checkAreas(areas, errors, where) {
        if (!Array.isArray(areas) || !areas.length || areas.length > MAX.rows) {
            errors.push(where + ': areas must be 1–' + MAX.rows + ' rows'); return null;
        }
        var rows = areas.map(function (r) { return String(r).trim().split(/\s+/); });
        var width = rows[0].length;
        if (width > MAX.cols || rows.some(function (r) { return r.length !== width; })) {
            errors.push(where + ': every row of areas needs the same number of columns (at most ' + MAX.cols + ')'); return null;
        }
        if (rows.some(function (r) { return r.some(function (k) { return !/^([a-z]|\.)$/.test(k); }); })) {
            errors.push(where + ': areas may only use single letters a–z and "."'); return null;
        }
        var box = {};
        rows.forEach(function (r, y) {
            r.forEach(function (k, x) {
                if (k === '.') return;
                var b = box[k] || (box[k] = { x0: x, x1: x, y0: y, y1: y, n: 0 });
                b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x);
                b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
                b.n++;
            });
        });
        var bad = Object.keys(box).filter(function (k) {
            var b = box[k];
            return b.n !== (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
        });
        if (bad.length) { errors.push(where + ': zone ' + bad.join(', ') + ' is not a rectangle'); return null; }
        return { rows: rows.map(function (r) { return r.join(' '); }), keys: Object.keys(box), box: box, width: width, height: rows.length };
    }

    function checkGrid(g, errors, where, needKeys) {
        if (!g || typeof g !== 'object') { errors.push(where + ': missing'); return null; }
        var a = checkAreas(g.areas, errors, where);
        if (!a) return null;
        var out = { areas: a.rows };
        ['cols', 'rows'].forEach(function (k) {
            var v = cssValue(g[k]);
            var want = k === 'cols' ? a.width : a.height;
            var t = v && tracks(v);
            if (!v || !t || t.length !== want) {
                errors.push(where + ': ' + k + ' must be ' + want + ' CSS track(s) (got "' + str(g[k], 60) + '")');
            } else out[k] = v;
        });
        (needKeys || []).forEach(function (k) {
            if (a.keys.indexOf(k) === -1 && where.indexOf('below') === -1) errors.push(where + ': zone ' + k + ' is not placed in the areas');
        });
        out._keys = a.keys;
        return out;
    }

    /**
     * @param {Object} input a look, as written or imported
     * @param {{modules: string[], relocated?: string[]}} ctx the studio's module ids
     * @returns {{ok: boolean, errors: string[], look: Object|null}}
     */
    function validate(input, ctx) {
        var errors = [];
        var modules = (ctx && ctx.modules) || [];
        var relocated = (ctx && ctx.relocated) || [];
        if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['not a look'], look: null };

        var look = {};
        var id = String(input.id || '');
        if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(id)) errors.push('id must be lowercase letters, digits and dashes (at most 40)');
        look.id = id;
        look.name = str(input.name, MAX.name);
        if (!look.name) errors.push('a look needs a name');
        look.tagline = str(input.tagline, MAX.tagline);
        look.principle = str(input.principle, MAX.principle);

        var zones = input.zones;
        var keys = zones && typeof zones === 'object' ? Object.keys(zones) : [];
        if (!keys.length || keys.length > MAX.zones) errors.push('a look needs 1–' + MAX.zones + ' zones');
        look.zones = {};
        var seen = {};
        keys.slice(0, MAX.zones).forEach(function (k) {
            if (!/^[a-z]$/.test(k)) { errors.push('zone "' + str(k, 10) + '" must be a single letter a–z'); return; }
            var z = zones[k] || {};
            var flow = z.flow == null ? 'column' : String(z.flow);
            if (FLOWS.indexOf(flow) === -1) errors.push('zone ' + k + ': unknown zone type "' + str(flow, 20) + '"');
            var out = { flow: flow, modules: [] };
            if (z.label) out.label = str(z.label, MAX.label);
            if (z.why) out.why = str(z.why, MAX.why);
            if (z.side != null) {
                if (z.side !== 'left' && z.side !== 'right') errors.push('zone ' + k + ': side is left or right');
                else out.side = z.side;
            }
            if (z.tone != null) {
                if (TONES.indexOf(z.tone) === -1) errors.push('zone ' + k + ': unknown tone "' + str(z.tone, 20) + '"');
                else out.tone = z.tone;
            }
            ['height', 'maxHeight'].forEach(function (p) {
                if (z[p] == null) return;
                var v = z[p] === 'none' ? 'none' : cssValue(z[p]);
                if (!v) errors.push('zone ' + k + ': ' + p + ' is not a CSS length this studio accepts');
                else out[p] = v;
            });
            (Array.isArray(z.modules) ? z.modules : []).forEach(function (m) {
                m = String(m);
                if (modules.indexOf(m) === -1) errors.push('zone ' + k + ': no module called "' + str(m, 30) + '"');
                else if (relocated.indexOf(m) !== -1) errors.push('zone ' + k + ': "' + m + '" lives in the header, not in a look');
                else if (seen[m]) errors.push('module "' + m + '" is in two zones (' + seen[m] + ' and ' + k + ')');
                else { seen[m] = k; out.modules.push(m); }
            });
            // steps: a line of text per module, for a zone read as a lesson
            if (z.steps && typeof z.steps === 'object') {
                Object.keys(z.steps).forEach(function (m) {
                    if (out.modules.indexOf(m) === -1) return;   // text for a module not here is dropped
                    var t = str(z.steps[m], MAX.why);
                    if (t) (out.steps || (out.steps = {}))[m] = t;
                });
            }
            look.zones[k] = out;
        });

        if (input.divider != null) {
            var d = input.divider;
            if (!d || !/^[a-z]$/.test(d.zone) || (d.axis !== 'x' && d.axis !== 'y')) errors.push('divider needs a zone letter and an axis (x or y)');
            else if (look.zones[d.zone]) errors.push('divider zone ' + d.zone + ' cannot also hold modules');
            else look.divider = { zone: d.zone, axis: d.axis };
        }
        if (input.tabs != null) {
            var t = input.tabs;
            if (!t || !look.zones[t.bar] || !look.zones[t.panes]) errors.push('tabs need a bar zone and a panes zone that exist');
            else {
                look.tabs = { bar: t.bar, panes: t.panes };
                if (look.zones[t.panes].flow !== 'solo') errors.push('the tabs\' panes zone must be of type solo');
                if (t.default) {
                    if (look.zones[t.panes].modules.indexOf(t.default) === -1) errors.push('the default tab must be one of the panes');
                    else look.tabs.default = t.default;
                }
            }
        }
        if (input.stage != null) {
            if (!seen[input.stage]) errors.push('stage must be a module the look places');
            else look.stage = input.stage;
        }
        if (input.claims != null) {
            var claims = (Array.isArray(input.claims) ? input.claims : []).filter(function (c) { return c === 'fretboard'; });
            if (claims.length) look.claims = claims;
        }
        if (input.dock != null) {
            var h = input.dock && cssValue(input.dock.height);
            if (!h) errors.push('dock.height is not a CSS length this studio accepts');
            else look.dock = { height: h };
        }

        var placeable = Object.keys(look.zones).concat(look.divider ? [look.divider.zone] : []);
        var grid = checkGrid(input.grid, errors, 'grid', placeable);
        if (grid) {
            grid._keys.forEach(function (k) {
                if (placeable.indexOf(k) === -1) errors.push('grid places zone ' + k + ', which the look does not define');
            });
            delete grid._keys;
            var below = Array.isArray(input.grid.below) ? input.grid.below.slice(0, MAX.below) : [];
            if (below.length) {
                grid.below = [];
                below.forEach(function (b, i) {
                    var w = parseInt(b && b.width, 10);
                    if (!(w >= 320 && w <= 3000)) { errors.push('grid.below[' + i + ']: width must be 320–3000'); return; }
                    var g = checkGrid(b, errors, 'grid.below[' + i + ']', null);
                    if (!g) return;
                    g._keys.forEach(function (k) {
                        if (placeable.indexOf(k) === -1) errors.push('grid.below[' + i + '] places zone ' + k + ', which the look does not define');
                    });
                    delete g._keys;
                    g.width = w;
                    grid.below.push(g);
                });
                grid.below.sort(function (x, y) { return y.width - x.width; });
            }
            look.grid = grid;
        }

        return { ok: errors.length === 0, errors: errors, look: errors.length ? null : look };
    }

    /** The grid in force at this viewport width: the narrowest `below` that applies, else the base. */
    function gridAt(grid, width) {
        if (!grid) return null;
        var pick = grid;
        (grid.below || []).forEach(function (b) { if (width <= b.width && (pick === grid || b.width < pick.width)) pick = b; });
        return pick;
    }

    /* ------------------------------------------------------------------
       WIREFRAMES FROM THE GRID
       A rough reading of the track list (px as px, fr as shares, vw/vh of a
       1440×900 screen) is enough to draw a recognisable thumbnail.
       ------------------------------------------------------------------ */
    function px(token, axisTotal) {
        var m = String(token).match(/^(-?\d+(?:\.\d+)?)(px|vw|vh|%)?$/);
        if (!m) return null;
        var n = parseFloat(m[1]);
        if (m[2] === 'vw') return n * 14.4;
        if (m[2] === 'vh') return n * 9;
        if (m[2] === '%') return n * axisTotal / 100;
        return n;
    }

    function readTrack(t, axisTotal) {
        var m = t.match(/^(minmax|clamp)\((.*)\)$/);
        if (m) {
            var args = [], depth = 0, cur = '';
            m[2].split('').forEach(function (ch) {
                if (ch === '(') depth++;
                if (ch === ')') depth--;
                if (ch === ',' && depth === 0) { args.push(cur.trim()); cur = ''; } else cur += ch;
            });
            args.push(cur.trim());
            if (m[1] === 'clamp') {
                var lo = px(args[0], axisTotal), mid = px(args[1], axisTotal), hi = px(args[2], axisTotal);
                var v = mid == null ? (lo || 100) : mid;
                return { px: Math.max(lo || 0, Math.min(hi || Infinity, v)) };
            }
            var maxT = readTrack(args[1], axisTotal);
            var minPx = px(args[0], axisTotal) || 0;
            if (maxT.fr != null) return { fr: maxT.fr, min: minPx };
            return { px: Math.max(minPx, maxT.px || 0) };
        }
        var fr = t.match(/^(\d+(?:\.\d+)?)fr$/);
        if (fr) return { fr: parseFloat(fr[1]) };
        if (/^var\(--look-split/.test(t)) return { fr: 1 };
        if (t === 'auto' || /content/.test(t)) return { fr: 0.45 };
        var p = px(t, axisTotal);
        return p == null ? { fr: 1 } : { px: p };
    }

    function sizes(list, n, total) {
        var t = tracks(list) || [];
        if (t.length !== n) t = new Array(n).fill('1fr');
        var read = t.map(function (x) { return readTrack(x, total); });
        var fixed = read.reduce(function (a, r) { return a + (r.px || 0); }, 0);
        var frs = read.reduce(function (a, r) { return a + (r.fr || 0); }, 0);
        var left = Math.max(0, total - fixed);
        var out = read.map(function (r) { return r.px != null ? r.px : (frs ? left * r.fr / frs : 0); });
        out = out.map(function (v, i) { return Math.max(v, read[i].min || 0); });
        var sum = out.reduce(function (a, b) { return a + b; }, 0) || 1;
        return out.map(function (v) { return v / sum; });
    }

    function wireFromGrid(look) {
        if (!look || !look.grid) return [];
        var g = look.grid;
        var rows = g.areas.map(function (r) { return r.trim().split(/\s+/); });
        var W = 114, H = 64, X0 = 3, Y0 = 4, GAP = 2;
        var nc = rows[0].length, nr = rows.length;
        var cw = sizes(g.cols, nc, 1440), rh = sizes(g.rows, nr, 640);
        var usableW = W - GAP * (nc - 1), usableH = H - GAP * (nr - 1);
        var xs = [X0], ys = [Y0];
        cw.forEach(function (f, i) { xs.push(xs[i] + f * usableW + GAP); });
        rh.forEach(function (f, i) { ys.push(ys[i] + f * usableH + GAP); });
        var box = {};
        rows.forEach(function (r, y) {
            r.forEach(function (k, x) {
                if (k === '.') return;
                var b = box[k] || (box[k] = { x0: x, x1: x, y0: y, y1: y });
                b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x);
                b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
            });
        });
        var stageMod = look.stage || 'sheet';
        var out = [];
        var round = function (v) { return Math.round(v * 2) / 2; };
        Object.keys(box).forEach(function (k) {
            var b = box[k];
            var x = xs[b.x0], y = ys[b.y0];
            var w = xs[b.x1 + 1] - GAP - x, h = ys[b.y1 + 1] - GAP - y;
            var zone = (look.zones || {})[k];
            var isDivider = look.divider && look.divider.zone === k;
            var flow = isDivider ? 'divider' : (zone ? zone.flow : 'column');
            var mods = zone ? zone.modules : [];
            var kind = (flow === 'rail' || flow === 'drawer' || flow === 'tabs' || flow === 'divider') ? 2
                : flow === 'orbit' ? 3
                : mods.indexOf(stageMod) !== -1 ? 1 : 0;
            var n = mods.length;
            if (flow === 'mosaic' && n > 1) {
                var cols = Math.max(1, Math.round(Math.sqrt(n * w / h)));
                var rowsN = Math.ceil(n / cols);
                var tw = (w - GAP * (cols - 1)) / cols, th = (h - GAP * (rowsN - 1)) / rowsN;
                mods.forEach(function (m, i) {
                    out.push([round(x + (i % cols) * (tw + GAP)), round(y + Math.floor(i / cols) * (th + GAP)), round(tw), round(th), m === stageMod ? 1 : 0]);
                });
            } else if ((flow === 'strips' || flow === 'row') && n > 1) {
                var sw = (w - GAP * (n - 1)) / n;
                mods.forEach(function (m, i) { out.push([round(x + i * (sw + GAP)), round(y), round(sw), round(h), m === stageMod ? 1 : 0]); });
            } else if (flow === 'reading' && n > 1) {
                var shown = Math.min(n, 6), bw = w * 0.5, bh = (h - GAP * (shown - 1)) / shown;
                for (var i = 0; i < shown; i++) out.push([round(x + (w - bw) / 2), round(y + i * (bh + GAP)), round(bw), round(bh), mods[i] === stageMod ? 1 : 0]);
            } else {
                out.push([round(x), round(y), round(w), round(h), kind]);
            }
        });
        return out;
    }

    root.LookSchema = {
        FLOWS: FLOWS, TONES: TONES, MAX: MAX,
        validate: validate, gridAt: gridAt, wireFromGrid: wireFromGrid,
        tracks: tracks, cssValue: cssValue
    };
})(typeof window !== 'undefined' ? window : this);
