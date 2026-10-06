/**
 * @module LookBuilder
 * @description Build a studio look of your own — or remix one — on the real
 * studio, which rearranges behind the panel as you work.
 *
 * Start from a look you like ("Remix this look") or a skeleton, move modules
 * between zones, say what each zone is for, and name the idea behind the
 * whole thing. That sentence is what makes the built-in looks teach: each
 * is a theory of what belongs next to what, and a look you build is yours.
 *
 * Every edit goes through LookSchema.validate (the same gate the built-in
 * looks pass) before it is previewed; what fails is said in plain words.
 * Saved looks live in this browser; Export writes a .look.json file someone
 * else can Import.
 *
 * Opened by the `studio:buildlook` event (from the look picker and the ⊞
 * popover): { mode: 'remix' | 'new' | 'edit' | 'import', id?, from? }.
 */
(function () {
    'use strict';

    var SL = function () { return window.StudioLooks; };

    /* ------------------------------------------------------------------
       WHAT A MODULE IS FOR — used to deal modules into a new skeleton
       ------------------------------------------------------------------ */
    var ROLE = {
        chordstrip: 'strip', sheet: 'score',
        numgen: 'tool', circle: 'tool', chords: 'tool', relations: 'tool',
        solar: 'ref', grading: 'ref', fretboard: 'instrument'
    };

    var SKELETONS = [
        { id: 'stack', name: 'Stack', grid: { areas: ['a'], cols: 'minmax(0, 1fr)', rows: 'minmax(0, 1fr)' },
          zones: { a: { flow: 'reading', take: ['strip', 'score', 'tool', 'ref', 'instrument'] } } },
        { id: 'two', name: 'Two columns',
          grid: { areas: ['a b'], cols: 'minmax(300px, 1fr) minmax(340px, 1.2fr)', rows: 'minmax(0, 1fr)',
                  below: [{ width: 1100, areas: ['a', 'b'], cols: 'minmax(0, 1fr)', rows: 'auto auto' }] },
          zones: { a: { label: 'TOOLS', take: ['tool'] }, b: { label: 'RESULT', take: ['strip', 'score', 'ref', 'instrument'] } } },
        { id: 'three', name: 'Three columns',
          grid: { areas: ['a b c'], cols: 'minmax(260px, 0.8fr) minmax(336px, 1.4fr) minmax(260px, 0.8fr)', rows: 'minmax(0, 1fr)',
                  below: [{ width: 1240, areas: ['b b', 'a c'], cols: 'minmax(0, 1fr) minmax(0, 1fr)', rows: 'minmax(320px, 1.2fr) auto' }] },
          zones: { a: { label: 'TOOLS', take: ['tool'] }, b: { take: ['strip', 'score'] }, c: { label: 'REFERENCE', take: ['ref', 'instrument'] } } },
        { id: 'wings', name: 'Stage + wings', stage: 'sheet',
          grid: { areas: ['a b c'], cols: '52px minmax(0, 1fr) 52px', rows: 'minmax(0, 1fr)' },
          zones: { a: { flow: 'rail', side: 'left', label: 'IN', take: ['tool'] }, b: { take: ['strip', 'score'] },
                   c: { flow: 'rail', side: 'right', label: 'REF', take: ['ref', 'instrument'] } } },
        { id: 'bench', name: 'Bench + below',
          grid: { areas: ['a', 'b'], cols: 'minmax(0, 1fr)', rows: 'clamp(200px, 34vh, 330px) minmax(0, 1fr)' },
          zones: { a: { flow: 'bench', take: ['instrument'] }, b: { flow: 'row', take: ['strip', 'score', 'tool', 'ref'] } } },
        { id: 'page', name: 'Page + drawer', stage: 'sheet',
          grid: { areas: ['a b'], cols: 'minmax(336px, 1fr) 44px', rows: 'minmax(0, 1fr)' },
          zones: { a: { flow: 'page', take: ['strip', 'score'] }, b: { flow: 'drawer', side: 'right', label: 'MORE', take: ['tool', 'ref', 'instrument'] } } },
        { id: 'mosaic', name: 'Tiles',
          grid: { areas: ['a'], cols: 'minmax(0, 1fr)', rows: 'minmax(0, 1fr)' },
          zones: { a: { flow: 'mosaic', take: ['score', 'tool', 'ref', 'instrument', 'strip'] } } },
        { id: 'tabs', name: 'Tabs', tabs: { bar: 't', panes: 'a', default: 'sheet' },
          grid: { areas: ['t', 'a'], cols: 'minmax(0, 1fr)', rows: 'auto minmax(0, 1fr)' },
          zones: { t: { flow: 'tabs', take: ['strip'] }, a: { flow: 'solo', take: ['score', 'tool', 'ref', 'instrument'] } } }
    ];

    var FLOW_WORDS = [
        ['column', 'Stack — one above another'],
        ['row', 'Side by side'],
        ['rail', 'Tucked rail — flies out when clicked'],
        ['drawer', 'Drawer — behind one handle'],
        ['page', 'Page — centred, measured width'],
        ['bench', 'Bench — one instrument, full width'],
        ['compact', 'Compact list'],
        ['legend', 'Legend strip'],
        ['mosaic', 'Tiles'],
        ['reading', 'Numbered steps'],
        ['strips', 'Channel strips — scroll sideways'],
        ['orbit', 'Square, centred']
    ];
    var TONE_WORDS = [['', 'No box'], ['quiet', 'Quiet box'], ['accent', 'Accent'], ['input', 'Input colour'], ['tool', 'Tool colour']];

    /* ------------------------------------------------------------------
       DRAFT HELPERS
       ------------------------------------------------------------------ */
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function slug(s) {
        return String(s || 'look').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'look';
    }

    function uniqueId(base) {
        var id = 'my-' + slug(base), n = 2;
        while (SL().get(id)) id = 'my-' + slug(base) + '-' + (n++);
        return id;
    }

    function placedModules(draft) {
        var out = [];
        Object.keys(draft.zones).forEach(function (k) { out = out.concat(draft.zones[k].modules); });
        return out;
    }

    function placeable() {
        var mods = SL().modules();
        return Object.keys(mods).filter(function (id) { return !mods[id].relocated; });
    }

    /** Deal these modules into a skeleton's zones by what each module is for. */
    function fromSkeleton(sk, modules, keep) {
        var d = {
            id: keep.id, name: keep.name, tagline: keep.tagline || '', principle: keep.principle || '',
            grid: clone(sk.grid), zones: {}
        };
        var keys = Object.keys(sk.zones);
        keys.forEach(function (k) {
            var z = clone(sk.zones[k]);
            delete z.take;
            z.modules = [];
            d.zones[k] = z;
        });
        modules.forEach(function (m) {
            var role = ROLE[m] || 'tool';
            var k = keys.filter(function (key) { return sk.zones[key].take.indexOf(role) !== -1; })[0] || keys[keys.length - 1];
            d.zones[k].modules.push(m);
        });
        // a score first wherever it lands
        keys.forEach(function (k) {
            var ms = d.zones[k].modules, i = ms.indexOf('sheet');
            if (i > 0 && d.zones[k].flow !== 'tabs') { ms.splice(i, 1); ms.unshift('sheet'); }
            var j = ms.indexOf('chordstrip');
            if (j > 0 && d.zones[k].flow !== 'solo') { ms.splice(j, 1); ms.unshift('chordstrip'); }
        });
        if (sk.stage && modules.indexOf(sk.stage) !== -1) d.stage = sk.stage;
        if (sk.tabs) {
            d.tabs = { bar: sk.tabs.bar, panes: sk.tabs.panes };
            if (d.zones[sk.tabs.panes].modules.indexOf('sheet') !== -1) d.tabs.default = 'sheet';
        }
        return d;
    }

    /** The original layout, as a draft: three columns, the way OG groups things. */
    function ogAsDraft(keep) {
        var sk = SKELETONS.filter(function (s) { return s.id === 'three'; })[0];
        var d = fromSkeleton(sk, placeable(), keep);
        d.zones.a.modules = ['numgen', 'circle', 'chords', 'relations'];
        d.zones.b.modules = ['chordstrip', 'sheet', 'solar'];
        d.zones.c.modules = ['grading', 'fretboard'];
        return d;
    }

    /** Derived fields: a look that places the fretboard takes it out of the dock. */
    function finish(d) {
        var out = clone(d);
        var mods = placedModules(out);
        if (mods.indexOf('fretboard') !== -1) out.claims = ['fretboard']; else delete out.claims;
        if (out.stage && mods.indexOf(out.stage) === -1) delete out.stage;
        if (out.tabs && out.tabs.default && out.zones[out.tabs.panes] && out.zones[out.tabs.panes].modules.indexOf(out.tabs.default) === -1) delete out.tabs.default;
        Object.keys(out.zones).forEach(function (k) {
            var z = out.zones[k];
            if (!z.label) delete z.label;
            if (!z.why) delete z.why;
            if (!z.tone) delete z.tone;
            if (z.flow !== 'rail' && z.flow !== 'drawer') delete z.side;
            else if (!z.side) z.side = 'right';
        });
        return out;
    }

    /* ------------------------------------------------------------------
       STATE
       ------------------------------------------------------------------ */
    var panel = null, draft = null, originId = null, editingId = null, dirty = false;
    var lastValid = null, previewTimer = null, warnTimer = null;

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    /* ------------------------------------------------------------------
       OPEN / CLOSE
       ------------------------------------------------------------------ */
    function studioVisible() {
        var ws = document.querySelector('.workspace');
        return !!ws && ws.style.display !== 'none';
    }

    function open(req) {
        req = req || {};
        if (req.mode === 'import' && !req.draft) { pickFile(); return; }
        if (!studioVisible()) {
            var launch = document.getElementById('launch-workspace-btn');
            if (launch) launch.click();
            setTimeout(function () { open(req); }, 500);
            return;
        }
        if (panel && !panel.hidden) close(false);
        originId = SL().current();
        editingId = null;
        var base = req.id ? SL().get(req.id) : null;
        if (req.mode === 'edit' && base && base.custom) {
            editingId = base.id;
            draft = clone(base);
            delete draft.custom;
        } else if (req.mode === 'import' && req.draft) {
            draft = req.draft;
        } else if (req.mode === 'new' || !base) {
            draft = fromSkeleton(SKELETONS[1], placeable(), { id: uniqueId('my-look'), name: 'My look' });
        } else {
            var keep = { id: uniqueId(base.name + ' remix'), name: (base.name + ' (remix)').slice(0, 40),
                         tagline: base.tagline, principle: base.principle };
            draft = base.id === 'og' ? ogAsDraft(keep) : clone(base);
            if (base.id !== 'og') {
                draft.id = keep.id; draft.name = keep.name;
                delete draft.custom; delete draft.wire;
            }
        }
        dirty = req.mode === 'import';
        build();
        render();
        schedulePreview(0);
        panel.hidden = false;
        document.body.classList.add('lb-open');
        var first = panel.querySelector('input, textarea, select, button');
        if (first) first.focus();
    }

    function close(keep) {
        if (!panel) return;
        clearTimeout(previewTimer);
        clearTimeout(warnTimer);
        panel.hidden = true;
        document.body.classList.remove('lb-open', 'lb-peek');
        if (!keep) SL().endPreview(originId);
        draft = null;
    }

    /* ------------------------------------------------------------------
       PREVIEW + VALIDATION
       ------------------------------------------------------------------ */
    /** A structural change (zones, modules, types) redraws the panel; typing does not. */
    function change(delay, keepPanel) {
        dirty = true;
        if (!keepPanel) render();
        schedulePreview(delay == null ? 0 : delay);
    }

    /** Give a control a stable name, so focus can be put back after a redraw. */
    function fk(node, key) { node.setAttribute('data-focus-key', key); return node; }

    function schedulePreview(delay) {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(function () {
            var r = SL().preview(finish(draft));
            showErrors(r.ok ? [] : r.errors);
            if (r.ok) {
                lastValid = r.look;
                clearTimeout(warnTimer);
                warnTimer = setTimeout(sizeWarnings, 700);
            }
            var save = panel && panel.querySelector('.lb-save');
            if (save) save.disabled = !r.ok;
        }, delay);
    }

    function showErrors(errors) {
        var box = panel && panel.querySelector('.lb-errors');
        if (!box) return;
        box.textContent = '';
        if (!errors.length) { box.hidden = true; return; }
        box.hidden = false;
        box.appendChild(el('strong', null, 'Not yet a look:'));
        var ul = el('ul');
        errors.slice(0, 8).forEach(function (e) { ul.appendChild(el('li', null, e)); });
        box.appendChild(ul);
    }

    /**
     * What the preview actually gives each module, against what the module
     * needs: measured on the real layout, so it is right at this screen size.
     */
    function sizeWarnings() {
        var box = panel && panel.querySelector('.lb-warnings');
        if (!box || !draft) return;
        var mods = SL().modules();
        var notes = [];
        Object.keys(draft.zones).forEach(function (k) {
            var z = draft.zones[k];
            if (!z.modules.length) notes.push('Zone ' + k + ' has no modules, so it will not be shown.');
            if (['rail', 'drawer', 'tabs', 'solo', 'strips', 'mosaic'].indexOf(z.flow) !== -1) return;
            z.modules.forEach(function (m) {
                var node = document.querySelector('[data-module="' + m + '"]');
                if (!node || node.classList.contains('look-absent') || !node.getClientRects().length) return;
                var need = parseInt(mods[m].minW || '250', 10);
                var r = node.getBoundingClientRect();
                var got = z.flow === 'orbit' ? Math.min(r.width, r.height) : r.width;
                if (need && got < need - 2) {
                    notes.push(mods[m].label + ' needs ' + need + 'px; here it gets ' + Math.round(got) +
                               'px, so it will be scaled down or scroll.');
                }
            });
        });
        var hidden = placeable().filter(function (m) { return placedModules(draft).indexOf(m) === -1; });
        if (hidden.length) notes.push('Hidden in this look: ' + hidden.map(function (m) { return mods[m].label; }).join(', ') + '.');
        if (placedModules(draft).indexOf('fretboard') !== -1) notes.push('The guitar leaves the dock while this look is on.');
        box.textContent = '';
        box.hidden = !notes.length;
        notes.forEach(function (n) { box.appendChild(el('p', null, n)); });
    }

    /* ------------------------------------------------------------------
       PANEL
       ------------------------------------------------------------------ */
    function build() {
        if (panel) return;
        panel = el('aside', 'lb-panel');
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Build a look');
        panel.hidden = true;
        panel.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && e.target.tagName !== 'SELECT') { e.stopPropagation(); cancel(); }
        });
        document.body.appendChild(panel);
    }

    function field(labelText, input, hint) {
        var wrap = el('label', 'lb-field');
        wrap.appendChild(el('span', 'lb-field-label', labelText));
        wrap.appendChild(input);
        if (hint) wrap.appendChild(el('span', 'lb-hint', hint));
        return wrap;
    }

    function textInput(value, max, onInput, multiline, redrawOnCommit) {
        var i = el(multiline ? 'textarea' : 'input');
        if (!multiline) i.type = 'text';
        i.maxLength = max;
        i.value = value || '';
        i.addEventListener('input', function () { onInput(i.value); change(300, true); });
        if (redrawOnCommit) i.addEventListener('change', function () { render(); });
        return i;
    }

    function select(options, value, onChange, label) {
        var s = el('select');
        if (label) s.setAttribute('aria-label', label);
        options.forEach(function (o) {
            var opt = el('option', null, o[1]);
            opt.value = o[0];
            s.appendChild(opt);
        });
        s.value = value == null ? '' : value;
        s.addEventListener('change', function () { onChange(s.value); change(0); });
        return s;
    }

    function render() {
        if (!panel || !draft) return;
        var mods = SL().modules();
        var scroll = panel.querySelector('.lb-body') ? panel.querySelector('.lb-body').scrollTop : 0;
        var focused = document.activeElement && panel.contains(document.activeElement)
            ? document.activeElement.getAttribute('data-focus-key') : null;
        panel.textContent = '';

        var head = el('div', 'lb-head');
        head.appendChild(el('h2', null, editingId ? 'Edit your look' : 'Build a look'));
        var peek = el('button', 'lb-peek', 'Peek');
        peek.type = 'button';
        peek.title = 'Hide this panel to see the whole look; click again to come back';
        peek.addEventListener('click', function () { document.body.classList.toggle('lb-peek'); });
        var x = el('button', 'lb-close', '×');
        x.type = 'button';
        x.setAttribute('aria-label', 'Cancel and close');
        x.addEventListener('click', cancel);
        head.appendChild(peek);
        head.appendChild(x);
        panel.appendChild(head);

        var body = el('div', 'lb-body');

        /* -- the idea -- */
        var idea = el('section', 'lb-section');
        idea.appendChild(field('Name', textInput(draft.name, 40, function (v) { draft.name = v; })));
        idea.appendChild(field('What is this look for?', textInput(draft.principle, 300, function (v) { draft.principle = v; }, true),
            'One or two sentences: the idea behind what sits next to what. It is what the picker shows.'));
        idea.appendChild(field('Tagline', textInput(draft.tagline, 60, function (v) { draft.tagline = v; })));
        body.appendChild(idea);

        /* -- skeleton -- */
        var sk = el('section', 'lb-section');
        sk.appendChild(el('h3', null, 'Start from a skeleton'));
        sk.appendChild(el('p', 'lb-hint', 'Rearranges the modules you have placed; names and words stay.'));
        var skGrid = el('div', 'lb-skeletons');
        SKELETONS.forEach(function (s) {
            var b = el('button', 'lb-skeleton');
            b.type = 'button';
            var preview = { grid: s.grid, zones: {}, stage: s.stage, divider: null };
            Object.keys(s.zones).forEach(function (k) { preview.zones[k] = { flow: s.zones[k].flow || 'column', modules: [] }; });
            b.innerHTML = SL().wireSvg(preview, 60, 36);
            b.appendChild(el('span', null, s.name));
            fk(b, 'skeleton-' + s.id);
            b.addEventListener('click', function () {
                draft = fromSkeleton(s, placedModules(draft), draft);
                change(0);
            });
            skGrid.appendChild(b);
        });
        sk.appendChild(skGrid);
        body.appendChild(sk);

        /* -- zones -- */
        var zs = el('section', 'lb-section');
        zs.appendChild(el('h3', null, 'Zones'));
        zs.appendChild(el('p', 'lb-hint', 'Drag a module to another zone, or use its menu.'));
        var keys = Object.keys(draft.zones);
        keys.forEach(function (k) { zs.appendChild(zoneCard(k, keys, mods)); });
        body.appendChild(zs);

        /* -- hidden -- */
        var hidden = placeable().filter(function (m) { return placedModules(draft).indexOf(m) === -1; });
        var tray = el('section', 'lb-section lb-tray');
        tray.appendChild(el('h3', null, 'Hidden in this look'));
        if (!hidden.length) tray.appendChild(el('p', 'lb-hint', 'Every module has a place.'));
        var trayList = el('div', 'lb-chips');
        hidden.forEach(function (m) { trayList.appendChild(chip(m, null, keys, mods)); });
        dropTarget(tray, null);
        tray.appendChild(trayList);
        body.appendChild(tray);

        /* -- what the preview shows -- */
        var warn = el('section', 'lb-section lb-warnings');
        warn.setAttribute('aria-live', 'polite');
        warn.hidden = true;
        body.appendChild(warn);

        /* -- advanced -- */
        var adv = el('details', 'lb-section lb-advanced');
        adv.appendChild(el('summary', null, 'Advanced: the grid itself'));
        var areas = textInput(draft.grid.areas.join('\n'), 200, function (v) {
            draft.grid.areas = v.split('\n').map(function (r) { return r.trim(); }).filter(Boolean);
            // a letter in the areas that is not a zone yet becomes one
            draft.grid.areas.join(' ').split(/\s+/).forEach(function (key) {
                if (/^[a-z]$/.test(key) && !draft.zones[key] && !(draft.divider && draft.divider.zone === key)) {
                    draft.zones[key] = { flow: 'column', modules: [] };
                }
            });
        }, true, true);
        adv.appendChild(field('Areas — one row per line, a letter per zone, "." for empty', areas));
        adv.appendChild(field('Columns', textInput(draft.grid.cols, 200, function (v) { draft.grid.cols = v; })));
        adv.appendChild(field('Rows', textInput(draft.grid.rows, 200, function (v) { draft.grid.rows = v; })));
        adv.appendChild(el('p', 'lb-hint', 'Sizes like 300px, 1fr, minmax(240px, 1fr), clamp(200px, 30vh, 320px). Narrower screens use the skeleton\'s own fallback; under 860px every look stacks.'));
        body.appendChild(adv);

        var errors = el('div', 'lb-errors');
        errors.setAttribute('role', 'alert');
        errors.hidden = true;
        body.appendChild(errors);
        panel.appendChild(body);
        body.scrollTop = scroll;

        /* -- actions -- */
        var foot = el('div', 'lb-foot');
        var save = el('button', 'lb-save', editingId ? 'Save changes' : 'Save look');
        save.type = 'button';
        save.addEventListener('click', saveLook);
        var exp = el('button', null, 'Export');
        exp.type = 'button';
        exp.title = 'Download this look as a file someone else can import';
        exp.addEventListener('click', exportLook);
        var cancelBtn = el('button', null, 'Cancel');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', cancel);
        foot.appendChild(save);
        foot.appendChild(exp);
        if (editingId) {
            var del = el('button', 'lb-delete', 'Delete');
            del.type = 'button';
            del.addEventListener('click', function () { confirmDelete(foot, del); });
            foot.appendChild(del);
        }
        foot.appendChild(cancelBtn);
        panel.appendChild(foot);

        if (focused) {
            var again = panel.querySelector('[data-focus-key="' + focused + '"]');
            if (again && !again.disabled) again.focus();
        }
    }

    function zoneCard(k, keys, mods) {
        var z = draft.zones[k];
        var card = el('div', 'lb-zone');
        card.setAttribute('data-zone', k);
        var top = el('div', 'lb-zone-top');
        top.appendChild(el('span', 'lb-zone-key', k.toUpperCase()));
        var locked = z.flow === 'tabs' || z.flow === 'solo';
        if (locked) {
            top.appendChild(el('span', 'lb-zone-type', z.flow === 'tabs' ? 'Tab bar (and what sits above it)' : 'One tab at a time'));
        } else {
            top.appendChild(fk(select(FLOW_WORDS, z.flow || 'column', function (v) { z.flow = v; }, 'Zone ' + k + ' type'), 'flow-' + k));
        }
        card.appendChild(top);

        var row = el('div', 'lb-zone-row');
        var label = textInput(z.label, 24, function (v) { z.label = v; });
        label.placeholder = 'Label (optional)';
        label.setAttribute('aria-label', 'Zone ' + k + ' label');
        row.appendChild(label);
        row.appendChild(fk(select(TONE_WORDS, z.tone || '', function (v) { z.tone = v || undefined; }, 'Zone ' + k + ' tone'), 'tone-' + k));
        if (z.flow === 'rail' || z.flow === 'drawer') {
            row.appendChild(fk(select([['left', 'Left'], ['right', 'Right']], z.side || 'right', function (v) { z.side = v; }, 'Zone ' + k + ' side'), 'side-' + k));
        }
        card.appendChild(row);

        var why = textInput(z.why, 160, function (v) { z.why = v; });
        why.placeholder = 'What is this zone for? (one line)';
        why.setAttribute('aria-label', 'Zone ' + k + ': what it is for');
        card.appendChild(why);

        var list = el('div', 'lb-chips');
        z.modules.forEach(function (m) { list.appendChild(chip(m, k, keys, mods)); });
        if (!z.modules.length) list.appendChild(el('span', 'lb-hint', 'Empty — drop a module here.'));
        card.appendChild(list);
        dropTarget(card, k);
        return card;
    }

    function moveModule(m, toZone, index) {
        Object.keys(draft.zones).forEach(function (k) {
            var i = draft.zones[k].modules.indexOf(m);
            if (i !== -1) draft.zones[k].modules.splice(i, 1);
        });
        if (toZone && draft.zones[toZone]) {
            var list = draft.zones[toZone].modules;
            if (index == null || index > list.length) list.push(m); else list.splice(index, 0, m);
        }
        change(0);
    }

    function chip(m, zoneKey, keys, mods) {
        var def = mods[m] || {};
        var c = el('div', 'lb-chip');
        c.draggable = true;
        c.setAttribute('data-module', m);
        c.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', m);
            e.dataTransfer.effectAllowed = 'move';
        });
        c.appendChild(el('span', 'lb-chip-glyph', def.glyph || ''));
        c.appendChild(el('span', 'lb-chip-name', def.label || m));
        var opts = keys.map(function (k) { return [k, 'Zone ' + k.toUpperCase() + (draft.zones[k].label ? ' · ' + draft.zones[k].label : '')]; });
        opts.push(['', 'Hidden']);
        var mv = el('select', 'lb-chip-move');
        mv.setAttribute('aria-label', 'Move ' + (def.label || m) + ' to');
        opts.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; mv.appendChild(op); });
        mv.value = zoneKey || '';
        fk(mv, 'move-' + m);
        mv.addEventListener('change', function () { moveModule(m, mv.value || null); });
        c.appendChild(mv);
        if (zoneKey) {
            var list = draft.zones[zoneKey].modules, i = list.indexOf(m);
            var up = el('button', 'lb-chip-step', '↑');
            up.type = 'button';
            up.disabled = i === 0;
            up.setAttribute('aria-label', 'Move ' + (def.label || m) + ' earlier');
            up.addEventListener('click', function () { moveModule(m, zoneKey, i - 1); });
            fk(up, 'up-' + m);
            var down = el('button', 'lb-chip-step', '↓');
            down.type = 'button';
            down.disabled = i === list.length - 1;
            down.setAttribute('aria-label', 'Move ' + (def.label || m) + ' later');
            down.addEventListener('click', function () { moveModule(m, zoneKey, i + 1); });
            fk(down, 'down-' + m);
            c.appendChild(up);
            c.appendChild(down);
        }
        return c;
    }

    function dropTarget(node, zoneKey) {
        node.addEventListener('dragover', function (e) { e.preventDefault(); node.classList.add('lb-drop'); });
        node.addEventListener('dragleave', function () { node.classList.remove('lb-drop'); });
        node.addEventListener('drop', function (e) {
            e.preventDefault();
            node.classList.remove('lb-drop');
            var m = e.dataTransfer.getData('text/plain');
            if (m && placeable().indexOf(m) !== -1) moveModule(m, zoneKey);
        });
    }

    /* ------------------------------------------------------------------
       SAVE / EXPORT / IMPORT / DELETE
       ------------------------------------------------------------------ */
    function saveLook() {
        var r = SL().register(finish(draft));
        if (!r.ok) { showErrors(r.errors); return; }
        var id = r.look.id;
        close(true);
        SL().apply(id);
    }

    function cancel() { close(false); }

    function confirmDelete(foot, btn) {
        if (foot.querySelector('.lb-confirm')) return;
        var box = el('div', 'lb-confirm');
        box.appendChild(el('span', null, 'Delete "' + draft.name + '"?'));
        var yes = el('button', 'lb-delete', 'Delete');
        yes.type = 'button';
        yes.addEventListener('click', function () {
            var id = editingId;
            close(true);
            SL().unregister(id);
        });
        var no = el('button', null, 'Keep');
        no.type = 'button';
        no.addEventListener('click', function () { box.remove(); btn.focus(); });
        box.appendChild(yes);
        box.appendChild(no);
        foot.insertBefore(box, foot.firstChild);
        no.focus();
    }

    function exportLook() {
        var look = finish(draft);
        var r = window.LookSchema.validate(look, SL().schemaContext());
        if (!r.ok) { showErrors(r.errors); return; }
        var data = JSON.stringify({ format: 'music-theory-look', version: 1, look: r.look }, null, 2);
        var blob = new Blob([data], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = r.look.id + '.look.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    var MAX_IMPORT = 64 * 1024;

    function pickFile() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            if (f) importFile(f);
        });
        input.click();
    }

    /** Read a .look.json and open it in the builder to review before saving. */
    function importFile(file) {
        if (file.size > MAX_IMPORT) { toast(['That file is too large to be a look (' + Math.round(file.size / 1024) + ' KB).']); return; }
        var reader = new FileReader();
        reader.onload = function () { importText(String(reader.result || '')); };
        reader.onerror = function () { toast(['That file could not be read.']); };
        reader.readAsText(file);
    }

    function importText(text) {
        var obj = null;
        try { obj = JSON.parse(text); } catch (e) { toast(['That file is not a look: it is not valid JSON.']); return false; }
        var look = obj && obj.format === 'music-theory-look' ? obj.look : obj;
        var r = window.LookSchema.validate(look, SL().schemaContext());
        if (!r.ok) { toast(['That look cannot be used:'].concat(r.errors.slice(0, 6))); return false; }
        var d = r.look;
        var existing = SL().get(d.id);
        if (existing) d.id = uniqueId(d.name || d.id);
        open({ mode: 'import', draft: d });
        return true;
    }

    function toast(lines) {
        var t = el('div', 'lb-toast');
        t.setAttribute('role', 'alert');
        lines.forEach(function (l, i) { t.appendChild(el(i ? 'p' : 'strong', null, l)); });
        var ok = el('button', null, 'OK');
        ok.type = 'button';
        ok.addEventListener('click', function () { t.remove(); });
        t.appendChild(ok);
        document.body.appendChild(t);
        ok.focus();
        setTimeout(function () { if (t.isConnected) t.remove(); }, 12000);
    }

    /* ------------------------------------------------------------------ */
    window.addEventListener('studio:buildlook', function (e) { open((e && e.detail) || {}); });

    window.LookBuilder = {
        open: open,
        close: function () { close(false); },
        importText: importText,
        draft: function () { return draft ? finish(draft) : null; },
        skeletons: SKELETONS.map(function (s) { return s.id; }),
        // exposed for tests
        _fromSkeleton: function (id, modules, keep) {
            var s = SKELETONS.filter(function (x) { return x.id === id; })[0];
            return s ? finish(fromSkeleton(s, modules, keep || { id: 'my-test', name: 'Test' })) : null;
        }
    };
})();
