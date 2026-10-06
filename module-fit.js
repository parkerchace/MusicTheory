/**
 * @module ModuleFit
 * @description Fits the studio's modules to the zones a studio look gives
 * them. OG is the reference design and is never touched (active() is false
 * there); in every other look a module keeps its design and is reflowed,
 * scaled (fit scale, below) and has its drawing sized to the room left.
 *
 * How much room does a drawing actually have? Shape-locked visualizers (circle of fifths, fretboard, solar map) must keep
 * their proportions and never be cut off. To do that they need two numbers the
 * browser does not hand over directly:
 *
 *   w  the width available to the drawing, and
 *   h  the height available to it — but ONLY if something outside the slot
 *      fixes that height (a grid track, a mosaic tile, a flex:1 pane). In an
 *      auto-height column, or a capped box that scrolls, the "available
 *      height" is whatever the drawing makes it, so sizing from it would be
 *      circular.
 *
 * measure() answers both in one synchronous layout pass: it shrinks the
 * drawing to nothing, reads the slot, grows the drawing to something huge,
 * reads the slot again, and restores it. No paint happens in between, so
 * nothing flickers. If the slot's height did not change when the drawing
 * grew, the height is definite and `h` is real; otherwise `h` is Infinity and
 * the caller should size from width alone (capped by `autoCap`).
 *
 * fitAspect() then picks the largest box of a given aspect ratio inside that.
 */
(function () {
    'use strict';

    function px(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }

    function innerSize(el) {
        var cs = getComputedStyle(el);
        return {
            w: el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
            h: el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom)
        };
    }

    /**
     * @param {Element} slot     the box the drawing lives in
     * @param {Element} drawing  the element whose size we will set
     * @returns {{w:number, h:number, definite:boolean}}
     */
    function measure(slot, drawing) {
        if (!slot || !drawing || !slot.isConnected) return { w: 0, h: 0, definite: false };

        // Probe with !important so stylesheet sizing (which may itself be
        // !important to beat a visualizer's inline styles) cannot win.
        var PROPS = ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'];
        var st = drawing.style;
        var saved = PROPS.map(function (p) { return [p, st.getPropertyValue(p), st.getPropertyPriority(p)]; });
        var set = function (w, h) {
            st.setProperty('min-width', '0', 'important'); st.setProperty('min-height', '0', 'important');
            st.setProperty('max-width', 'none', 'important'); st.setProperty('max-height', 'none', 'important');
            st.setProperty('width', w, 'important'); st.setProperty('height', h, 'important');
        };

        set('0px', '0px');
        var room = innerSize(slot);
        var h0 = slot.getBoundingClientRect().height;

        set('0px', '4000px');
        var h1 = slot.getBoundingClientRect().height;

        saved.forEach(function (s) {
            if (s[1]) st.setProperty(s[0], s[1], s[2]); else st.removeProperty(s[0]);
        });

        var definite = Math.abs(h1 - h0) < 1 && room.h > 0;
        return {
            w: Math.max(0, Math.floor(room.w)),
            h: definite ? Math.max(0, Math.floor(room.h)) : Infinity,
            definite: definite
        };
    }

    /**
     * Largest w×h with w/h === aspect inside the room from measure().
     * When the height is not fixed, height is capped at `autoCap` (default
     * 70% of the viewport) so a wide module does not produce a drawing taller
     * than the screen.
     */
    function fitAspect(room, aspect, opts) {
        opts = opts || {};
        var min = opts.min || 0;
        var max = opts.max || Infinity;
        var capH = room.definite ? room.h : (opts.autoCap || Math.round(window.innerHeight * 0.7));
        var w = Math.min(room.w, capH * aspect, max);
        w = Math.max(min, w);
        return { w: Math.floor(w), h: Math.floor(w / aspect) };
    }

    /**
     * Observe `target` and call `fn` after its size settles. Ignores changes
     * under 2px so a drawing that resizes its own module cannot loop.
     */
    function observe(target, fn, delay) {
        if (!target || typeof ResizeObserver === 'undefined') return null;
        var last = { w: -1, h: -1 }, t = null;
        var ro = new ResizeObserver(function (entries) {
            var r = entries[entries.length - 1].contentRect;
            if (Math.abs(r.width - last.w) < 2 && Math.abs(r.height - last.h) < 2) return;
            last = { w: r.width, h: r.height };
            clearTimeout(t);
            t = setTimeout(function () { try { fn(); } catch (e) { /* visualizer's own problem */ } }, delay == null ? 60 : delay);
        });
        ro.observe(target);
        return ro;
    }

    /** True in any studio look except OG. OG's modules are the reference
     *  design and are left exactly as they were built. */
    function active() {
        var look = document.body && document.body.getAttribute('data-look');
        return !!look && look !== 'og';
    }

    /* ------------------------------------------------------------------
       SOLAR MAP
       The solar canvas draws from min(width, height), so any box keeps the
       system round; what it needs is the right box. With a fixed height (a
       mosaic tile, the orrery's orbit) it fills what its controls leave, or
       the whole visible height if they leave only a sliver. In an
       auto-height column there is nothing to fill, so it is given a roughly
       square height from its width.
       ------------------------------------------------------------------ */
    function fitSolar() {
        var slot = document.getElementById('solar-dock-viewport');
        var canvas = slot && slot.querySelector(':scope > canvas');
        if (!canvas) return;
        if (!active()) { canvas.style.removeProperty('min-height'); return; }
        var room = measure(slot, canvas);
        if (!room.w) return;
        var floor;
        if (!room.definite) {
            floor = Math.round(Math.max(200, Math.min(room.w * 0.86, 560)));
        } else {
            var controls = slot.querySelector(':scope > #solar-controls');
            var leftover = room.h - (controls ? controls.offsetHeight + 6 : 0);
            floor = leftover >= 150
                ? 120
                : Math.round(Math.max(160, Math.min(room.w, room.h)));
        }
        if (canvas.style.minHeight !== floor + 'px') canvas.style.minHeight = floor + 'px';
    }

    /* ------------------------------------------------------------------
       FIT SCALE
       A module's controls were designed for OG's columns. In a look they
       may land in a narrower strip or a shorter tile. What reflows, reflows
       (module-fit.css); what cannot — rows of fixed-size buttons, fixed
       grid tracks — is scaled with CSS zoom on the module body, so the
       module looks like itself, only smaller:

         width   shrink just enough that nothing scrolls sideways, down to
                 MIN_W; below that it scrolls.
         height  in a zone that fixes the height, shrink until the whole
                 module fits — but only if that happens at MIN_H or larger.
                 A module with a drawing that cannot fit whole shrinks just
                 enough to show its title and drawing, and its controls
                 scroll below. Anything else keeps its size and scrolls.

       data-fit-tight marks a module that still scrolls in a fixed-height
       zone, so its CSS can put what matters first (the sheet's staff).

       While deciding, a drawing is held at a fair share of the module — 60%
       of its width, 150–380px — so the controls are scaled to leave the
       drawing real room rather than a sliver. The drawing then fills
       whatever the controls leave (the visualizers resize themselves).
       Zoom never goes above 1: OG's size is the design size.
       ------------------------------------------------------------------ */
    // Never below 0.8: this app's control text is 10-12px, and at the old
    // 0.55 floor that became 6px. Below 0.8 a module reflows or scrolls.
    var MIN_W = 0.8;
    var MIN_H = 0.8;
    var PROFILE = {
        circle:     { drawing: '#circle-canvas', share: true },
        solar:      { drawing: '#solar-dock-viewport > canvas', share: true },
        sheet:      { height: false },   // a score is long; it scrolls
        fretboard:  { skip: true },      // rebuilds its own geometry to fit
        chordstrip: { skip: true }
    };

    function setZoom(el, z) {
        if (z >= 0.999) el.style.removeProperty('zoom');
        else el.style.zoom = z.toFixed(3);
    }
    function overX(el) { return el.scrollWidth > el.clientWidth + 1; }
    function overY(el) { return el.scrollHeight > el.clientHeight + 1; }

    function pin(el, px) {
        var st = el.style, props = ['width', 'height', 'min-height', 'max-height'];
        var saved = props.map(function (p) { return [p, st.getPropertyValue(p), st.getPropertyPriority(p)]; });
        st.setProperty('height', px + 'px', 'important');
        st.setProperty('min-height', px + 'px', 'important');
        st.setProperty('max-height', px + 'px', 'important');
        if (el.id === 'circle-canvas') st.setProperty('width', px + 'px', 'important');
        return function () {
            saved.forEach(function (s) { if (s[1]) st.setProperty(s[0], s[1], s[2]); else st.removeProperty(s[0]); });
        };
    }

    function solve(body, useHeight) {
        setZoom(body, 1);
        var z = 1;
        if (overX(body)) {
            // rigid content of width S fits in W/z when z <= W/S
            z = Math.max(MIN_W, body.clientWidth / body.scrollWidth);
            setZoom(body, z);
            for (var i = 0; i < 3 && overX(body) && z > MIN_W; i++) {
                z = Math.max(MIN_W, z * Math.min(0.97, body.clientWidth / body.scrollWidth));
                setZoom(body, z);
            }
        }
        if (!useHeight || !overY(body) || z <= MIN_H) return z;

        // content of height C fits a box of visible height V when z <= V/C;
        // C shrinks as the zoomed body gets wider, so iterate a little
        var zh = z;
        for (var j = 0; j < 4 && overY(body); j++) {
            zh = zh * Math.min(0.98, body.clientHeight / body.scrollHeight);
            if (zh < MIN_H) { setZoom(body, z); return z; }   // cannot fit legibly: scroll instead
            setZoom(body, zh);
        }
        if (overY(body)) { setZoom(body, z); return z; }
        return zh;
    }

    // bottom of `el` in `body`'s own (unzoomed, scrolled) coordinates
    function bottomIn(el, body) {
        var z = parseFloat(body.style.zoom) || 1;
        return (el.getBoundingClientRect().bottom - body.getBoundingClientRect().top) / z + body.scrollTop;
    }

    // shrink from z until the drawing's bottom is visible; null if that
    // needs less than MIN_H
    function solveVisible(body, drawing, z) {
        setZoom(body, z);
        for (var i = 0; i < 5; i++) {
            var need = bottomIn(drawing, body) + 10;
            if (need <= body.clientHeight + 1) return z;
            z = z * Math.min(0.98, body.clientHeight / need);
            if (z < MIN_H) return null;
            setZoom(body, z);
        }
        return bottomIn(drawing, body) + 10 <= body.clientHeight + 1 ? z : null;
    }

    function fitModule(mod) {
        var id = mod.getAttribute('data-module');
        var prof = PROFILE[id] || {};
        var body = mod.querySelector(':scope > .module-content');
        if (!body || prof.skip) return;
        var on = active() && mod.classList.contains('look-item') && !mod.classList.contains('look-absent');
        if (!on) {
            body.style.removeProperty('zoom');
            mod.removeAttribute('data-fit-zoom');
            mod.removeAttribute('data-fit-tight');
            return;
        }
        if (!body.getClientRects().length || getComputedStyle(body).display === 'none') return;   // collapsed rail, closed drawer

        var useHeight = prof.height !== false;
        var drawing = prof.drawing ? body.querySelector(prof.drawing) : null;
        var z;
        if (drawing) {
            setZoom(body, 1);
            var restore = pin(drawing, Math.round(Math.max(150, Math.min(body.clientWidth * 0.6, 380))));
            z = solve(body, useHeight);
            var whole = !overY(body);
            restore();
            if (useHeight && !whole) {
                restore = pin(drawing, 140);
                var zv = solveVisible(body, drawing, z);
                restore();
                if (zv) z = zv;
            }
            setZoom(body, z);
        } else {
            z = solve(body, useHeight);
        }
        if (useHeight && overY(body)) mod.setAttribute('data-fit-tight', '');
        else if (!useHeight && body.scrollHeight > body.clientHeight + 40) mod.setAttribute('data-fit-tight', '');
        else mod.removeAttribute('data-fit-tight');
        if (z < 0.999) mod.setAttribute('data-fit-zoom', z.toFixed(2));   // for debugging and styling
        else mod.removeAttribute('data-fit-zoom');
    }

    var watched = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
    var pending = null;

    /**
     * Does the look fix this zone's height, or does it come from its
     * content? Add a very tall probe and see whether the zone grows.
     */
    function markFixedZones() {
        document.querySelectorAll('.look-zone').forEach(function (z) {
            z.removeAttribute('data-fixed');
            z.removeAttribute('data-auto');
            z.style.removeProperty('min-height');
            if (!active() || !z.getClientRects().length || getComputedStyle(z).display !== 'flex') return;
            var h0 = z.getBoundingClientRect().height;
            var probe = document.createElement('div');
            probe.style.cssText = 'flex:0 0 3000px;height:3000px;min-height:3000px;width:1px;';
            z.appendChild(probe);
            var h1 = z.getBoundingClientRect().height;
            z.removeChild(probe);
            if (Math.abs(h1 - h0) < 1 && h0 > 40) { z.setAttribute('data-fixed', ''); return; }

            // A zone in an auto grid row should be as tall as what is in it,
            // up to any cap the look sets (Lab Bench's legend strip). Without
            // this the look's fixed rows took all the height and the auto row
            // collapsed to nothing.
            z.setAttribute('data-auto', '');
            var cs = getComputedStyle(z);
            var cap = cs.maxHeight === 'none' ? Math.round(window.innerHeight * 0.6) : parseFloat(cs.maxHeight);
            var content = z.scrollHeight;
            if (content <= cap) { z.style.minHeight = content + 'px'; return; }
            // More than the cap: hold the zone at the cap and treat it as
            // fixed, so its module fills it and is fitted inside (fit scale).
            z.style.minHeight = cap + 'px';
            z.removeAttribute('data-auto');
            z.setAttribute('data-fixed', '');
        });
    }

    function refitAll() {
        try { markFixedZones(); } catch (e) {}
        document.querySelectorAll('[data-module]').forEach(function (mod) {
            try { fitModule(mod); } catch (e) { /* one module's problem */ }
            watch(mod);
        });
    }
    function refitSoon(delay) {
        clearTimeout(pending);
        pending = setTimeout(refitAll, delay == null ? 120 : delay);
    }

    function watch(mod) {
        if (!watched || watched.has(mod)) return;
        watched.add(mod);
        // the module's box: a divider drag, a mosaic zoom, a window resize
        observe(mod, function () { if (active()) try { fitModule(mod); } catch (e) {} }, 80);
        // its content: a sheet re-render, a panel opening, a new progression
        var body = mod.querySelector(':scope > .module-content') || mod;
        var t = null;
        new MutationObserver(function () {
            if (!active()) return;
            clearTimeout(t);
            t = setTimeout(function () { try { fitModule(mod); } catch (e) {} }, 200);
        }).observe(body, { childList: true, subtree: true });
        // <details> panels open without a DOM mutation
        body.addEventListener('toggle', function () { if (active()) setTimeout(function () { fitModule(mod); }, 30); }, true);
    }

    function init() {
        var slot = document.getElementById('solar-dock-viewport');
        var target = slot && (slot.closest('.module-content') || slot);
        if (target) {
            observe(target, fitSolar, 60);
            // the canvas is created later, by the app
            new MutationObserver(function () { fitSolar(); }).observe(slot, { childList: true });
        }
        // After a look is applied the visualizers re-measure over ~700ms
        // (StudioLooks nudges them); fit around that and once it settles.
        window.addEventListener('studio:lookchange', function () {
            fitSolar();
            [40, 360, 900].forEach(function (ms) { setTimeout(refitAll, ms); });
        });
        window.addEventListener('resize', function () { refitSoon(160); });
        refitSoon(300);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.ModuleFit = {
        measure: measure, fitAspect: fitAspect, observe: observe,
        active: active, fitSolar: fitSolar, refit: refitAll
    };
})();
