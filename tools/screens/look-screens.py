#!/usr/bin/env python3
"""Drive the studio in headless Chrome: screenshots of every look, and checks.

Stdlib only (this machine has no Node), plus the system Google Chrome.

    python3 tools/screens/look-screens.py shots  [--size 1440x900] [--looks og,focus]
    python3 tools/screens/look-screens.py course [--size 1440x900] [--out DIR]
    python3 tools/screens/look-screens.py checks [--size 1440x900] [--only name,...]

Run from the app folder or anywhere; paths resolve from this file.

`shots` launches the studio, generates a piece from "chase, woods, dark" (the
SCREEN-BLOAT.md method) and saves tools/screens/out/<WxH>/<look>.png.

`course` saves the landing page at each course level and every studio lesson
as it opens (course.js), to tools/screens/out/course-<WxH>/.

`checks` runs each scenario in CHECKS on a freshly loaded page and prints
ok/FAIL lines like the jsc tests; the exit code is the number of failures.
Every scenario is JavaScript evaluated in the page and returns
{ok: bool, detail: any}.

The first launch shows a tour prompt; it is answered "no" before each run so
nothing blocks the page.
"""
import argparse, base64, functools, http.server, json, os, shutil, socket, struct
import subprocess, sys, tempfile, threading, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


# ---------------------------------------------------------------- server
def serve(root):
    handler = functools.partial(_Quiet, directory=root)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


# ---------------------------------------------------------------- CDP
class CDP:
    """Just enough WebSocket + DevTools Protocol to evaluate and screenshot."""

    def __init__(self, ws_url):
        host_port, path = ws_url[len('ws://'):].split('/', 1)
        host, port = host_port.split(':')
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f'GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\n'
                        f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n'
                        'Sec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.s.recv(4096)
        self.buf = buf.split(b'\r\n\r\n', 1)[1]
        self.id = 0
        self.errors = []

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.s.recv(1 << 20)
            if not chunk:
                raise EOFError('devtools closed')
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytearray([0x81])
        n = len(data)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126); hdr += struct.pack('>H', n)
        else:
            hdr.append(0x80 | 127); hdr += struct.pack('>Q', n)
        mask = os.urandom(4)
        self.s.sendall(bytes(hdr) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _recv(self):
        msg = b''
        while True:
            b0, b1 = self._read(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            payload = self._read(n)
            if (b0 & 0x0F) in (0x0, 0x1, 0x2):
                msg += payload
                if b0 & 0x80:
                    return json.loads(msg)

    def call(self, method, **params):
        self.id += 1
        me = self.id
        self._send({'id': me, 'method': method, 'params': params})
        while True:
            m = self._recv()
            if m.get('id') == me:
                if 'error' in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get('result', {})
            if m.get('method') == 'Runtime.exceptionThrown':
                d = m['params']['exceptionDetails']
                self.errors.append((d.get('exception') or {}).get('description') or d.get('text'))

    def js(self, expr):
        r = self.call('Runtime.evaluate', expression=expr, awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'].get('exception', {}).get('description')
                               or r['exceptionDetails'].get('text'))
        return r.get('result', {}).get('value')


class Browser:
    def __init__(self, width, height):
        self.profile = tempfile.mkdtemp(prefix='look-screens-')
        self.proc = subprocess.Popen(
            # --mute-audio: headless Chrome still plays sound, and the checks
            # generate music and play notes — through the speakers of whoever
            # is at the machine.
            [CHROME, '--headless=new', '--mute-audio', '--no-first-run', '--no-default-browser-check',
             f'--user-data-dir={self.profile}', '--remote-debugging-port=0',
             f'--window-size={width},{height}', 'about:blank'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        port_file = os.path.join(self.profile, 'DevToolsActivePort')
        for _ in range(100):
            if os.path.exists(port_file) and open(port_file).read().strip():
                break
            time.sleep(0.1)
        port = open(port_file).read().split()[0]
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
                page = [t for t in tabs if t.get('type') == 'page'][0]
                break
            except Exception:
                time.sleep(0.2)
        self.cdp = CDP(page['webSocketDebuggerUrl'])
        self.cdp.call('Page.enable')
        self.cdp.call('Runtime.enable')
        self.cdp.call('Emulation.setDeviceMetricsOverride', width=width, height=height,
                      deviceScaleFactor=1, mobile=False)
        # Answer the first-launch tour prompt so it cannot block the page.
        self.cdp.call('Page.addScriptToEvaluateOnNewDocument',
                      source='window.confirm=()=>false;window.alert=()=>{};')

    def close(self):
        self.proc.terminate()
        try:
            self.proc.wait(5)
        except Exception:
            self.proc.kill()
        shutil.rmtree(self.profile, ignore_errors=True)


# ---------------------------------------------------------------- page helpers
WAIT_READY = """(async () => {
  for (let i = 0; i < 200; i++) {
    if (document.readyState === 'complete' && window.StudioLooks && window.modularApp) break;
    await new Promise(r => setTimeout(r, 50));
  }
  await new Promise(r => setTimeout(r, 1500));
  return !!window.StudioLooks;
})()"""

LAUNCH = """(async () => {
  document.getElementById('launch-workspace-btn').click();
  await new Promise(r => setTimeout(r, 2000));
  return true;
})()"""

GENERATE = """(async () => {
  const inp = document.getElementById('global-word-input');
  inp.value = 'chase, woods, dark';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 800));
  const go = document.getElementById('generation-run');
  if (go) go.click();
  await new Promise(r => setTimeout(r, 6000));
  const svg = document.querySelector('#sheet-music-container svg');
  return { generated: !!go, svg: !!svg };
})()"""


def fresh(b, url, storage):
    """Load the page with this localStorage, from a clean slate."""
    b.cdp.call('Page.navigate', url=url)
    b.cdp.js(WAIT_READY)
    b.cdp.js('localStorage.clear();' + ''.join(
        f'localStorage.setItem({json.dumps(k)}, {json.dumps(v)});' for k, v in storage.items()))
    b.cdp.call('Page.navigate', url=url)
    b.cdp.js(WAIT_READY)


# ---------------------------------------------------------------- checks
# Looks a person might build but the studio no longer ships: a draggable divider,
# captioned row zones, and a mosaic. Stored as custom looks so the flows stay covered.
TEST_LOOKS = {'version': 1, 'looks': [
    {'id': 'test-two-up', 'name': 'Test Two-Up', 'tagline': 'Question left, answer right', 'principle': 'A hard split with a draggable divider.',
     'divider': {'zone': 's', 'axis': 'x'},
     'grid': {'areas': ['a s b'], 'cols': 'minmax(300px, var(--look-split, 1fr)) 8px minmax(340px, 1fr)', 'rows': 'minmax(0, 1fr)',
              'below': [{'width': 1100, 'areas': ['a', 'b'], 'cols': 'minmax(0, 1fr)', 'rows': 'auto auto'}]},
     'zones': {'a': {'label': 'ASK', 'why': 'Tools that pose a question.', 'modules': ['chords', 'relations', 'circle', 'numgen']},
               'b': {'label': 'ANSWER', 'why': 'Where the result shows up.', 'modules': ['chordstrip', 'sheet', 'solar', 'fretboard']}}},
    {'id': 'test-split', 'name': 'Test Split', 'tagline': 'Generative over evaluative', 'principle': 'Two stacked row decks with captions.',
     'divider': {'zone': 's', 'axis': 'y'},
     'grid': {'areas': ['a', 's', 'b'], 'cols': 'minmax(0, 1fr)', 'rows': 'minmax(190px, var(--look-split, 1fr)) 8px minmax(230px, 1fr)'},
     'zones': {'a': {'label': 'GENERATE', 'flow': 'row', 'why': 'Invent here.', 'modules': ['solar', 'circle', 'numgen']},
               'b': {'label': 'EVALUATE', 'flow': 'row', 'why': 'Judge what came out.', 'modules': ['chordstrip', 'sheet', 'chords', 'relations', 'fretboard']}}},
    {'id': 'test-deck', 'name': 'Test Deck', 'tagline': 'Glanceable telemetry', 'principle': 'Every module an equal tile in one mosaic.',
     'grid': {'areas': ['a'], 'cols': 'minmax(0, 1fr)', 'rows': 'minmax(0, 1fr)'},
     'zones': {'a': {'flow': 'mosaic', 'modules': ['sheet', 'circle', 'chords', 'relations', 'solar', 'fretboard', 'numgen', 'chordstrip']}}}]}
CUSTOM = {'music-theory-custom-looks': json.dumps(TEST_LOOKS)}

# name -> (localStorage, launch first?, page JavaScript returning {ok, detail})
CHECKS = {
    'saved look lays out what is actually there': ({'music-theory-look': 'focus'}, True, """
      (() => {
        // The key/scale controls live in the header: the empty module shell must
        // be neither offered as a tab nor laid out in a zone.
        const ks = document.querySelector('[data-module="keyscale"]');
        const tabs = [...document.querySelectorAll('.look-tab')].map(t => t.dataset.target);
        const laidOut = !!ks && !!ks.closest('.look-zone') && !ks.classList.contains('look-absent');
        return { ok: !!ks && !laidOut && !tabs.includes('keyscale'), detail: { tabs, laidOut } };
      })()"""),

    'focus opens on the score, with the chord strip above the tabs': ({'music-theory-look': 'focus'}, True, """
      (() => {
        const act = document.querySelector('.look-solo-active');
        const tabs = [...document.querySelectorAll('.look-tab')].map(t => t.dataset.target);
        const strip = document.getElementById('mini-chord-strip');
        const bar = document.querySelector('.look-tabbar');
        const above = strip && bar && strip.getBoundingClientRect().bottom <= bar.getBoundingClientRect().top + 1;
        return { ok: !!act && act.dataset.module === 'sheet' && !tabs.includes('chordstrip') && above,
                 detail: { active: act && act.dataset.module, tabs, stripAbove: above } };
      })()"""),

    'undocking the guitar brings it back into the look': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const cb = document.getElementById('instrument-dock-show-guitar');
        if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 1200)); }
        cb.checked = false; cb.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 1500));
        const fb = document.querySelector('[data-module="fretboard"]');
        const shown = fb && getComputedStyle(fb).display !== 'none' && fb.getBoundingClientRect().height > 40;
        return { ok: !!shown, detail: { absent: fb && fb.classList.contains('look-absent'), display: fb && getComputedStyle(fb).display } };
      })()"""),

    'focus tabs follow the modules a launch shows': ({'music-theory-look': 'focus'}, True, """
      (async () => {
        const ms = window.moduleSelector;
        const all = [].concat(ms.modules.beginner, ms.modules.intermediate, ms.modules.advanced);
        const withSheet = all.find(m => (m.workspaceModules || []).includes('sheet-music-container'));
        ms.filterWorkspaceModules([withSheet.id]);
        await new Promise(r => setTimeout(r, 600));
        const hidden = [...document.querySelectorAll('[data-module]')].filter(m => m.style.display === 'none').map(m => m.dataset.module);
        const tabs = [...document.querySelectorAll('.look-tab')].map(t => t.dataset.target);
        return { ok: hidden.length > 0 && tabs.every(t => !hidden.includes(t)), detail: { hidden, tabs } };
      })()"""),

    'full studio undoes a selected launch': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const ms = window.moduleSelector;
        const all = [].concat(ms.modules.beginner, ms.modules.intermediate, ms.modules.advanced);
        ms.filterWorkspaceModules([all[0].id]);
        ms.launchWorkspace(false);
        await new Promise(r => setTimeout(r, 600));
        // The sidebar fretboard is meant to be hidden while the guitar is docked.
        const docked = document.getElementById('instrument-dock-show-guitar').checked;
        const hidden = [...document.querySelectorAll('.workspace .studio-module')]
          .filter(m => m.style.display === 'none')
          .filter(m => !(docked && m.dataset.module === 'fretboard'))
          .map(m => m.dataset.module || m.className);
        return { ok: hidden.length === 0, detail: { hidden, docked } };
      })()"""),

    'zone order does not depend on the looks visited before': ({'music-theory-look': 'luthier'}, True, """
      (async () => {
        StudioLooks.apply('focus');
        await new Promise(r => setTimeout(r, 600));
        const order = [...document.querySelectorAll('.workspace > .look-zone')].map(z => z.dataset.zone);
        return { ok: order.indexOf('t') < order.indexOf('a'), detail: { order } };
      })()"""),

    'escape stays in the studio': ({'music-theory-look': 'og'}, True, """
      (async () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        const landing = document.getElementById('landing-page');
        return { ok: landing.style.display === 'none', detail: { landing: landing.style.display } };
      })()"""),

    'one apply settles with a single resize': ({'music-theory-look': 'og'}, True, """
      (async () => {
        let n = 0; const h = () => n++;
        window.addEventListener('resize', h);
        // a look that claims no instrument: a claim remounts the dock, which resizes once more on its own
        StudioLooks.apply('notation-desk');
        await new Promise(r => setTimeout(r, 1500));
        window.removeEventListener('resize', h);
        return { ok: n === 1, detail: { resizeEvents: n } };
      })()"""),

    'divider moves with the keyboard and is remembered': ({'music-theory-look': 'test-two-up', **CUSTOM}, True, """
      (async () => {
        if (innerWidth <= 1100) return { ok: true, detail: 'divider hidden at this width' };
        const d = document.querySelector('.look-divider');
        d.focus();
        for (let i = 0; i < 3; i++) d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        const set = document.querySelector('.workspace').style.getPropertyValue('--look-split');
        StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 300));
        StudioLooks.apply('test-two-up'); await new Promise(r => setTimeout(r, 300));
        const back = document.querySelector('.workspace').style.getPropertyValue('--look-split');
        return { ok: !!set && set === back && d.getAttribute('aria-valuenow') !== null, detail: { set, back } };
      })()"""),

    'rail fly-out stays on screen and closes on an outside click': ({'music-theory-look': 'stage-wings'}, True, """
      (async () => {
        if (innerWidth <= 860) return { ok: true, detail: 'rails are inline at this width' };
        const heads = [...document.querySelectorAll('.look-zone[data-side="right"] > .look-item:not(.look-absent) > .module-header')];
        const head = heads[heads.length - 1];
        head.click();
        await new Promise(r => setTimeout(r, 300));
        const open = document.querySelector('.look-rail-open');
        const r = open && open.getBoundingClientRect();
        const inside = !!r && r.bottom <= innerHeight + 1 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth + 1;
        document.querySelector('[data-module="sheet"] .module-content').click();
        await new Promise(r => setTimeout(r, 200));
        const closed = !document.querySelector('.look-rail-open');
        return { ok: inside && closed, detail: { rect: r && [r.top, r.bottom, r.left, r.right].map(Math.round), closed } };
      })()"""),

    'first launch offers the tour without blocking the page': ({}, True, """
      (async () => {
        await new Promise(r => setTimeout(r, 800));
        const card = document.getElementById('tour-offer');
        return { ok: !!card, detail: { card: !!card } };
      })()"""),

    'og round trip restores the original order': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const order = () => [...document.querySelectorAll('.workspace-column')].map(c =>
          [...c.children].map(x => x.dataset.module || x.id || x.className).join(','));
        const before = order();
        StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 400));
        StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 400));
        const after = order();
        return { ok: JSON.stringify(before) === JSON.stringify(after), detail: { before, after } };
      })()"""),
}


# ---------------------------------------------------------------- typing keyboard
VK = {'ArrowRight': ('ArrowRight', 39), 'ArrowLeft': ('ArrowLeft', 37), 'Escape': ('Escape', 27),
      'Backquote': ('`', 192), 'ShiftLeft': ('Shift', 16), 'CapsLock': ('CapsLock', 20)}
VK.update({'Key' + ch: (ch.lower(), ord(ch)) for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'})
VK.update({'Digit' + d: (d, ord(d)) for d in '0123456789'})
VK.update({'Comma': (',', 188), 'Period': ('.', 190), 'Slash': ('/', 191), 'Semicolon': (';', 186)})


def key(b, code, down=True, up=True, shift=False):
    """A real (trusted) key press, the way a person's keyboard sends it."""
    k, vk = VK[code]
    mods = 8 if shift else 0
    if shift and code != 'ShiftLeft':
        k = k.upper() if len(k) == 1 else k
    text = k if len(k) == 1 else None
    if down:
        ev = dict(type='keyDown', key=k, code=code, windowsVirtualKeyCode=vk, modifiers=mods)
        if text:
            ev['text'] = text
        b.cdp.call('Input.dispatchKeyEvent', **ev)
    if up:
        b.cdp.call('Input.dispatchKeyEvent', type='keyUp', key=k, code=code, windowsVirtualKeyCode=vk, modifiers=mods)


LIT = """(() => {
  const app = window.modularApp;
  return { qk: QwertyKeys.state(),
           piano: Array.from(app.pianoVisualizer._activeMidiSet || []),
           neck: Array.from(((app.guitarFretboard._held) || new Map()).keys()),
           pianoKey48: !!document.querySelector('#piano-container [data-midi="48"]') };
})()"""


def blur(b):
    b.cdp.js("document.activeElement && document.activeElement.blur(); document.body.focus(); true")


def touch_piano(b):
    b.cdp.js("""(() => { const k = document.querySelector('#piano-container .piano-white-key');
      k.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; })()""")


def chk_typing_never_plays(b):
    b.cdp.js("document.getElementById('global-word-input').value=''; document.getElementById('global-word-input').focus(); true")
    touch_piano_then_focus = b.cdp.js(LIT)
    for c in ('KeyZ', 'KeyX', 'KeyC'):
        key(b, c)
    time.sleep(0.2)
    lit = b.cdp.js(LIT)
    val = b.cdp.js("document.getElementById('global-word-input').value")
    ok = val.endswith('zxc') and not lit['piano'] and not lit['qk']['held']
    return {'ok': ok, 'detail': {'value': val, 'lit': lit, 'before': touch_piano_then_focus['qk']}}


def chk_touch_arms_and_plays(b):
    blur(b)
    touch_piano(b)
    key(b, 'KeyZ', up=False)
    time.sleep(0.15)
    down = b.cdp.js(LIT)
    key(b, 'KeyZ', down=False)
    time.sleep(0.15)
    up = b.cdp.js(LIT)
    ok = (down['qk']['mode'] == 'armed' and 48 in down['piano'] and 48 in down['neck'] and down['pianoKey48']
          and not up['piano'] and not up['neck'])
    return {'ok': ok, 'detail': {'down': down, 'up': up}}


def chk_cold_burst_asks(b):
    blur(b)
    for c in ('KeyZ', 'KeyX', 'KeyC'):
        key(b, c)
    time.sleep(0.2)
    lit = b.cdp.js(LIT)
    chip = b.cdp.js("(() => { const c = document.querySelector('.qk-chip'); return c && c.dataset.state; })()")
    ok = lit['qk']['prompting'] and not lit['piano'] and lit['qk']['mode'] == 'idle' and chip == 'prompt'
    return {'ok': ok, 'detail': {'lit': lit, 'chip': chip}}


def chk_octave_and_escape(b):
    blur(b)
    touch_piano(b)
    key(b, 'ArrowRight')
    key(b, 'KeyZ', up=False)
    time.sleep(0.15)
    lit = b.cdp.js(LIT)
    key(b, 'KeyZ', down=False)
    key(b, 'Escape')
    time.sleep(0.2)
    after = b.cdp.js(LIT)
    landing = b.cdp.js("document.getElementById('landing-page').style.display")
    ok = 60 in lit['piano'] and lit['qk']['base'] == 60 and after['qk']['mode'] == 'idle' and landing == 'none'
    return {'ok': ok, 'detail': {'lit': lit['piano'], 'base': lit['qk']['base'], 'after': after['qk']['mode'], 'landing': landing}}


def chk_backquote_toggles(b):
    blur(b)
    key(b, 'Backquote')
    on = b.cdp.js("QwertyKeys.state().mode")
    key(b, 'Backquote')
    off = b.cdp.js("QwertyKeys.state().mode")
    return {'ok': on == 'armed' and off == 'idle', 'detail': {'on': on, 'off': off}}


def chk_learn_page_hears_keys(b):
    b.cdp.js("""(async () => { document.getElementById('launch-learn-notes-btn').click();
      await new Promise(r => setTimeout(r, 1500));
      const inst = window.learnPianoNotesInstance; window.__heard = [];
      if (inst && inst.midiNoteOn) { const orig = inst.midiNoteOn.bind(inst);
        inst.midiNoteOn = (m) => { window.__heard.push(m); return orig(m); }; }
      return !!inst; })()""")
    blur(b)
    key(b, 'KeyC')
    time.sleep(0.2)
    heard = b.cdp.js("window.__heard")
    mode = b.cdp.js("QwertyKeys.state().mode")
    return {'ok': heard == [52], 'detail': {'heard': heard, 'mode': mode}}


def chk_scales_quiz(b):
    """The quiz's piano is redrawn after the lesson sets up, so it must hear clicks
    on the keys that are on screen, show no answer, and grade in pitch order."""
    first = b.cdp.js("""(async () => { document.getElementById('launch-learn-scales-btn').click();
      await new Promise(r => setTimeout(r, 1500));
      document.querySelector('.lesson-dot[data-lesson="3"]').click();
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('piano-learn-scales-container').scrollIntoView({ block: 'center' });   // clear of the toasts at the bottom
      await new Promise(r => setTimeout(r, 1000));   // the piano scales itself to fit, then holds still
      const toast = document.getElementById('audio-loading-notification');   // passing; it covers the top keys at 760
      if (toast) toast.remove();
      return { marks: document.querySelectorAll('#piano-learn-scales-container .scale-degree-label').length,
               hint: getComputedStyle(document.getElementById('quiz-hints')).display }; })()""")

    missed = []

    def press(midi):
        p = b.cdp.js(f"""(() => {{ const k = document.querySelector('#piano-learn-scales-container [data-midi="{midi}"]');
          if (!k) return null; const r = k.getBoundingClientRect(); const black = k.classList.contains('piano-black-key');
          // the lowest point of the key that is not under something else
          for (const f of (black ? [0.5, 0.3] : [0.85, 0.7, 0.95])) {{
            const x = r.x + r.width / 2, y = r.y + r.height * f, t = document.elementFromPoint(x, y);
            if (t && k.contains(t)) return [x, y];
          }}
          const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height * 0.85);
          return 'covered by ' + (t ? (t.id || t.className || t.tagName) : 'nothing'); }})()""")
        if isinstance(p, list):
            _mouse(b, 'mousePressed', p[0], p[1])
            _mouse(b, 'mouseReleased', p[0], p[1])
            time.sleep(0.35)   # the notes row may wrap and move the piano down a little
        else:
            missed.append(f'{midi}: {p}')

    def check():
        return b.cdp.js("""(() => { document.getElementById('quiz-check').click();
          return document.getElementById('quiz-feedback').textContent.replace(/\\s+/g, ' ').trim(); })()""")

    for m in (78, 67, 69, 71, 72, 74, 76, 79):          # F#5 first: graded in pitch order
        press(m)
    right = check()
    b.cdp.js("document.getElementById('quiz-reset').click()")
    for m in (67, 69, 71, 72, 74, 76, 77, 79):          # F instead of F#
        press(m)
    wrong = check()
    ok = (first['marks'] == 0 and first['hint'] == 'none' and 'Perfect' in right
          and 'From E' in wrong and 'whole step' in wrong)
    return {'ok': ok, 'detail': {'first': first, 'right': right[:60], 'wrong': wrong[:120], 'missed': missed}}


CHORD_STATE = """(() => {
  const r = document.querySelector('.qk-readout');
  return { readout: r ? r.textContent : null, piano: Array.from(window.modularApp.pianoVisualizer._activeMidiSet || []).sort((a,b)=>a-b),
           neck: Array.from(((window.modularApp.guitarFretboard._held) || new Map()).values()).map(p => p.string + ':' + p.fret),
           key: window.modularApp.scaleLibrary.getCurrentKey(), scale: window.modularApp.scaleLibrary.getCurrentScale(),
           strip: (document.querySelector('.mini-chord-item.qk-strip-on') || { getAttribute: () => null }).getAttribute('data-degree') };
})()"""


def chord(b, code):
    """Hold Shift, press a key, read what sounded, let go."""
    key(b, 'ShiftLeft', up=False, shift=True)
    key(b, code, up=False, shift=True)
    time.sleep(0.12)
    st = b.cdp.js(CHORD_STATE)
    key(b, code, down=False, shift=True)
    key(b, 'ShiftLeft', down=False)
    time.sleep(0.05)
    return st


def chk_chord_mode_plays(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("window.modularApp.scaleLibrary.setKeyAndScale ? window.modularApp.scaleLibrary.setKeyAndScale('C','major') : null; true")
    time.sleep(0.4)
    st = chord(b, 'KeyV')
    pcs = sorted({m % 12 for m in st['piano']})
    ok = (st['readout'] or '').startswith('IV · F') and pcs == [0, 5, 9] and len(st['neck']) >= 3
    return {'ok': ok, 'detail': st}


def chk_chord_mode_voice_leads(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("window.modularApp.scaleLibrary.setKeyAndScale ? window.modularApp.scaleLibrary.setKeyAndScale('C','major') : null; QwertyChords.forget(); true")
    time.sleep(0.4)
    seq = [chord(b, c) for c in ('KeyZ', 'KeyN', 'KeyV', 'KeyB', 'KeyZ')]
    reads = [s['readout'] for s in seq]
    moves = []
    for r in reads[1:]:
        m = __import__('re').search(r'moved (\d+) st', r or '')
        moves.append(int(m.group(1)) if m else None)
    ok = all(m is not None and m <= 8 for m in moves)
    return {'ok': ok, 'detail': {'readouts': reads, 'moves': moves}}


def chk_chord_mode_fast_enough(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("QwertyChords.forget(); true")
    for c in ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY',
              'KeyU', 'KeyS', 'KeyG', 'KeyH', 'Digit2', 'Digit5', 'Digit6'] * 2:
        chord(b, c)
    combos = b.cdp.js("""(() => { const s = QwertyChords.settings(); return s.combos; })()""")
    t = b.cdp.js("QwertyChords.timings()")
    t = sorted(t)
    p95 = t[int(len(t) * 0.95) - 1] if t else None
    return {'ok': p95 is not None and p95 < 8, 'detail': {'n': len(t), 'p95_ms': p95, 'max_ms': t[-1] if t else None, 'combos': combos}}


def chk_chord_mode_off_on_learn(b):
    b.cdp.js("""(async () => { document.getElementById('launch-learn-notes-btn').click();
      await new Promise(r => setTimeout(r, 1500)); return true; })()""")
    blur(b)
    key(b, 'ShiftLeft', up=False, shift=True)
    act = b.cdp.js("QwertyChords.active()")
    key(b, 'ShiftLeft', down=False)
    return {'ok': act is False, 'detail': {'activeOnLearnPage': act}}


INV_STATE = """(() => { const q = QwertyKeys.state(); const r = document.querySelector('.qk-readout');
  const inv = document.querySelector('.qk-inv-btn'), walk = document.querySelector('.qk-walk-btn');
  return { sounding: q.sounding.slice().sort((a, b) => a - b), held: q.held, readout: r ? r.textContent : null,
           inv: inv ? inv.textContent : null, walking: walk ? walk.getAttribute('aria-pressed') : null,
           invShown: !!inv && inv.getClientRects().length > 0,
           saved: JSON.parse(localStorage.getItem('music-theory-chord-mode') || '{}') }; })()"""
CHORDS_PREFS = json.dumps({'version': 2, 'mode': 'chords', 'voicing': 'smart', 'voiceLeading': True, 'combos': False, 'vlIntensity': 0.5})


def strike(b, code):
    """Press a key, read what sounds, let go."""
    key(b, code, up=False)
    time.sleep(0.12)
    st = b.cdp.js(INV_STATE)
    key(b, code, down=False)
    time.sleep(0.05)
    return st


def vl_distance(a, b):
    if len(a) == len(b):
        return sum(abs(x - y) for x, y in zip(sorted(a), sorted(b)))
    near = lambda xs, ys: sum(min(abs(x - y) for y in ys) for x in xs)
    return max(near(a, b), near(b, a))


def chk_inversion_pins_bass(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("window.modularApp.scaleLibrary.setKeyAndScale('C','major'); QwertyChords.forget(); true")
    time.sleep(0.4)
    start = b.cdp.js(INV_STATE)
    key(b, 'KeyA')
    key(b, 'KeyA')                              # Auto -> Root -> 1st
    after = b.cdp.js(INV_STATE)
    key(b, 'KeyV', up=False)                    # IV in first inversion: A in the bass
    time.sleep(0.12)
    first = b.cdp.js(INV_STATE)
    key(b, 'KeyA')                              # still held: struck again as a six-four
    time.sleep(0.12)
    second = b.cdp.js(INV_STATE)
    key(b, 'KeyV', down=False)
    time.sleep(0.05)
    b.cdp.js("document.querySelector('.qk-mode-btn[data-mode=\"harmonize\"]').click(); true")
    time.sleep(0.1)
    harm = b.cdp.js(INV_STATE)
    b.cdp.js("document.querySelector('.qk-mode-btn[data-mode=\"chords\"]').click(); true")
    lo = lambda st: min(st['sounding']) % 12 if st['sounding'] else None
    ok = (start['inv'] == 'Inv Auto' and start['invShown'] and after['inv'] == 'Inv 1st' and after['saved'].get('inversion') == 1
          and lo(first) == 9 and (first['readout'] or '').startswith('IV6 · F/A')
          and lo(second) == 0 and (second['readout'] or '').startswith('IV6/4 · F/C') and second['held'] == ['KeyV']
          and not harm['invShown'])
    return {'ok': ok, 'detail': {'start': start['inv'], 'after': after['inv'], 'first': [first['sounding'], first['readout']],
                                 'second': [second['sounding'], second['readout']], 'shownInHarmonize': harm['invShown']}}


def chk_inversion_walk(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("window.modularApp.scaleLibrary.setKeyAndScale('C','major'); QwertyChords.forget(); true")
    # the walk is random: seed it, so a failure can be replayed
    b.cdp.js("(() => { let s = 20261006; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; return true; })()")
    time.sleep(0.4)
    key(b, 'KeyF')
    on = b.cdp.js(INV_STATE)
    reps = [strike(b, 'KeyZ') for _ in range(8)]          # I again and again: it climbs and falls
    changes = [strike(b, c) for c in ('KeyN', 'KeyV', 'KeyB', 'KeyZ', 'KeyX', 'KeyB', 'KeyZ')]
    key(b, 'KeyF')
    off = b.cdp.js(INV_STATE)
    t = sorted(b.cdp.js("QwertyChords.timings()") or [])
    p95 = t[int(len(t) * 0.95) - 1] if t else None
    rv = [r['sounding'] for r in reps]
    differ = all(rv[i] != rv[i - 1] for i in range(1, len(rv)))
    tones = all(set(m % 12 for m in v) <= {0, 4, 7} for v in rv)
    basses = sorted(set(min(v) % 12 for v in rv if v))
    seq = [rv[-1]] + [c['sounding'] for c in changes]
    moves = [vl_distance(seq[i - 1], seq[i]) for i in range(1, len(seq)) if seq[i - 1] and seq[i]]
    ok = (on['walking'] == 'true' and on['saved'].get('walk') is True and differ and tones and len(basses) >= 2
          # within reach of the smoothest move: Smart may hand it a wide style (drop 3) mid-walk
          and len(moves) == len(changes) and max(moves) <= 20 and sum(moves) / len(moves) <= 9
          and all((c['inv'] or '').split(' ')[-1] in ('Root', '1st', '2nd', '3rd') for c in changes)
          and off['walking'] == 'false' and p95 is not None and p95 < 8)
    return {'ok': ok, 'detail': {'repeats': rv, 'basses': basses, 'changes': [c['readout'] for c in changes], 'moves': moves,
                                 'invButton': [c['inv'] for c in changes], 'walkOff': off['walking'], 'p95_ms': p95}}


def chk_staff_on_screen_in_score_looks(b):
    b.cdp.js(GENERATE)
    seen = {}
    for lid in ('stage-wings', 'notation-desk'):
        seen[lid] = b.cdp.js(f"""(async () => {{ StudioLooks.apply('{lid}'); await new Promise(r => setTimeout(r, 2500));
          const svg = document.querySelector('#sheet-music-container svg'); const ws = document.querySelector('.workspace');
          const s = svg.getBoundingClientRect(), w = ws.getBoundingClientRect();
          return Math.round(Math.min(s.bottom, w.bottom) - Math.max(s.top, w.top)); }})()""")
    return {'ok': all(v >= 250 for v in seen.values()), 'detail': {'staffPxVisible': seen}}


OPEN_BUILDER = """(async (req) => {
  window.dispatchEvent(new CustomEvent('studio:buildlook', { detail: req }));
  await new Promise(r => setTimeout(r, 900));
  const p = document.querySelector('.lb-panel');
  return !!p && !p.hidden;
})"""

ZONE_OF = """(m => { const n = document.querySelector('[data-module="' + m + '"]'); const z = n && n.closest('.look-zone'); return z ? z.dataset.zone : null; })"""


def builder_set(b, key, value):
    b.cdp.js(f"""(async () => {{ const s = document.querySelector('[data-focus-key="{key}"]');
      s.value = {json.dumps(value)}; s.dispatchEvent(new Event('change', {{ bubbles: true }}));
      await new Promise(r => setTimeout(r, 700)); return true; }})()""")


def chk_builder_remix_moves_live(b):
    b.cdp.js("(async () => { StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 400)); return 1; })()")
    opened = b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'luthier' }})")
    cur = b.cdp.js("StudioLooks.current()")
    before = b.cdp.js(f"({ZONE_OF})('circle')")
    builder_set(b, 'move-circle', 'c')
    after = b.cdp.js(f"({ZONE_OF})('circle')")
    ok = opened and cur == '__preview' and before == 'b' and after == 'c'
    return {'ok': ok, 'detail': {'opened': opened, 'current': cur, 'circleBefore': before, 'circleAfter': after}}


def chk_builder_skeleton(b):
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'new' }})")
    b.cdp.js("""(async () => { document.querySelector('[data-focus-key="skeleton-tabs"]').click();
      await new Promise(r => setTimeout(r, 800)); return 1; })()""")
    st = b.cdp.js("""(() => ({ tabs: [...document.querySelectorAll('.look-tab')].map(t => t.dataset.target),
      active: (document.querySelector('.look-solo-active') || {dataset:{}}).dataset.module }))()""")
    ok = 'sheet' in st['tabs'] and st['active'] == 'sheet'
    return {'ok': ok, 'detail': st}


def chk_builder_save_and_reload(b):
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'luthier' }})")
    b.cdp.js("""(async () => { const i = document.querySelector('.lb-panel input[type="text"]');
      i.value = 'Practice Room'; i.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 700));
      document.querySelector('.lb-save').click(); await new Promise(r => setTimeout(r, 600)); return 1; })()""")
    saved = b.cdp.js("""(() => ({ current: StudioLooks.current(), panelOpen: !document.querySelector('.lb-panel').hidden,
      stored: JSON.parse(localStorage.getItem('music-theory-custom-looks') || '{}'),
      card: !!document.querySelector('.look-card-yours') }))()""")
    cur = saved['current']
    b.cdp.call('Page.reload')
    b.cdp.js(WAIT_READY)
    b.cdp.js(LAUNCH)
    after = b.cdp.js(f"""(() => ({{ current: StudioLooks.current(), name: (StudioLooks.get({json.dumps(cur)}) || {{}}).name,
      yoursCard: !!document.querySelector('.look-card-yours') }}))()""")
    looks = (saved['stored'] or {}).get('looks') or []
    ok = (cur.startswith('my-') and not saved['panelOpen'] and len(looks) == 1 and looks[0]['name'] == 'Practice Room'
          and saved['card'] and after['current'] == cur and after['name'] == 'Practice Room')
    return {'ok': ok, 'detail': {'saved': {k: v for k, v in saved.items() if k != 'stored'}, 'storedNames': [l.get('name') for l in looks], 'afterReload': after}}


def chk_builder_cancel_restores(b):
    b.cdp.js("(async () => { StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 400)); return 1; })()")
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'luthier' }})")
    builder_set(b, 'move-solar', '')
    hidden_in_preview = b.cdp.js(f"({ZONE_OF})('solar')")
    b.cdp.js("(async () => { document.querySelector('.lb-close').click(); await new Promise(r => setTimeout(r, 600)); return 1; })()")
    st = b.cdp.js(f"""(() => ({{ current: StudioLooks.current(), solarZone: ({ZONE_OF})('solar'),
      stored: localStorage.getItem('music-theory-custom-looks') }}))()""")
    ok = hidden_in_preview is None and st['current'] == 'luthier' and st['solarZone'] == 'b' and not st['stored']
    return {'ok': ok, 'detail': {'solarDuringPreview': hidden_in_preview, **st}}


def chk_builder_import_gate(b):
    bad = json.dumps({'format': 'music-theory-look', 'version': 1, 'look': {
        'id': 'evil', 'name': 'Evil', 'grid': {'areas': ['a'], 'cols': 'url(http://x.example/a)', 'rows': '1fr'},
        'zones': {'a': {'modules': ['sheet']}}}})
    res_bad = b.cdp.js(f"(() => {{ const ok = LookBuilder.importText({json.dumps(bad)}); const t = document.querySelector('.lb-toast'); return {{ ok, toast: t ? t.textContent : null }}; }})()")
    b.cdp.js("document.querySelectorAll('.lb-toast').forEach(t => t.remove()); 1")
    good = json.dumps({'format': 'music-theory-look', 'version': 1, 'look': {
        'id': 'from-a-friend', 'name': 'From a friend', 'principle': 'Score left, everything else right.',
        'grid': {'areas': ['a b'], 'cols': '2fr 1fr', 'rows': 'minmax(0, 1fr)'},
        'zones': {'a': {'modules': ['chordstrip', 'sheet']}, 'b': {'flow': 'column', 'modules': ['circle', 'solar']}}}})
    res_good = b.cdp.js(f"""(async () => {{ const ok = LookBuilder.importText({json.dumps(good)});
      await new Promise(r => setTimeout(r, 900));
      return {{ ok, panelOpen: !document.querySelector('.lb-panel').hidden, current: StudioLooks.current(),
               sheetZone: ({ZONE_OF})('sheet') }}; }})()""")
    ok = (res_bad['ok'] is False and res_bad['toast'] and 'cols' in res_bad['toast']
          and res_good['ok'] and res_good['panelOpen'] and res_good['current'] == '__preview' and res_good['sheetZone'] == 'a')
    return {'ok': ok, 'detail': {'bad': res_bad, 'good': res_good}}


def chk_builder_export_roundtrip(b):
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'luthier' }})")
    res = b.cdp.js("""(async () => {
      const d = LookBuilder.draft();
      const text = JSON.stringify({ format: 'music-theory-look', version: 1, look: d });
      LookBuilder.close(); await new Promise(r => setTimeout(r, 300));
      const ok = LookBuilder.importText(text); await new Promise(r => setTimeout(r, 800));
      const again = LookBuilder.draft();
      // compare meaning, not key order: both through the gate, keys sorted
      const canon = (x) => { const v = LookSchema.validate(x, StudioLooks.schemaContext()).look;
        const sort = o => Array.isArray(o) ? o.map(sort) : (o && typeof o === 'object')
          ? Object.keys(o).sort().reduce((a, k) => (a[k] = sort(o[k]), a), {}) : o;
        return JSON.stringify(sort(v)); };
      const A = JSON.parse(canon(d)), B = JSON.parse(canon(again));
      return { ok, sameZones: JSON.stringify(A.zones) === JSON.stringify(B.zones), sameGrid: JSON.stringify(A.grid) === JSON.stringify(B.grid) };
    })()""")
    return {'ok': res['ok'] and res['sameZones'] and res['sameGrid'], 'detail': res}


def chk_builder_typing_is_typing(b):
    blur(b)
    touch_piano(b)
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'new' }})")
    b.cdp.js("(() => { const i = document.querySelector('.lb-panel input[type=\"text\"]'); i.value = ''; i.focus(); return 1; })()")
    for c in ('KeyZ', 'KeyX', 'KeyC'):
        key(b, c)
    time.sleep(0.3)
    st = b.cdp.js("""(() => ({ value: document.querySelector('.lb-panel input[type="text"]').value,
      lit: Array.from(window.modularApp.pianoVisualizer._activeMidiSet || []), panelOpen: !document.querySelector('.lb-panel').hidden }))()""")
    return {'ok': st['value'] == 'zxc' and not st['lit'] and st['panelOpen'], 'detail': st}


def melody_prefs(**over):
    p = {'version': 2, 'mode': 'harmonize', 'voicing': 'smart', 'voiceLeading': True, 'combos': False, 'vlIntensity': 0.5,
         'melodySize': 3, 'change': 'smart', 'chromatic': 'colour', 'bass': 'root', 'linger': 'none'}
    p.update(over)
    return json.dumps(p)


MELODY_PREFS = melody_prefs()
MELODY_STATE = """(() => { const q = QwertyKeys.state(); return { harmony: q.harmony, melody: q.melody, lingering: q.lingering, base: q.base,
  readout: (document.querySelector('.qk-readout') || {}).textContent,
  piano: Array.from(window.modularApp.pianoVisualizer._activeMidiSet || []).sort((a, b) => a - b),
  marked: Array.from(document.querySelectorAll('#piano-container .midi-melody')).map(k => +k.dataset.midi) }; })()"""
# The harmonize octave starts at C4: Z X C V B N M , are C4 D4 E4 F4 G4 A4 B4 C5.


def melody_ready(b):
    blur(b)
    touch_piano(b)
    b.cdp.js("(async () => { window.modularApp.scaleLibrary.setKeyAndScale('C', 'major'); QwertyChords.forget(); await new Promise(r => setTimeout(r, 400)); return 1; })()")


def numeral(readout):
    return (readout or '').split(' · ')[1] if readout and ' · ' in readout else None


def chk_melody_under(b):
    melody_ready(b)
    key(b, 'KeyC', up=False)          # E4
    time.sleep(0.2)
    st = b.cdp.js(MELODY_STATE)
    key(b, 'KeyC', down=False)
    time.sleep(0.2)
    after = b.cdp.js(MELODY_STATE)
    h = st['harmony']
    ok = (st['base'] == 60 and len(h) >= 2 and all(x < 64 for x in h) and 64 in st['piano'] and all(x in st['piano'] for x in h)
          and st['marked'] == [64] and (st['readout'] or '').startswith('♪ E4 · I · C')
          and not after['harmony'] and not after['piano'] and not after['marked'])
    return {'ok': ok, 'detail': {'held': st, 'released': after}}


def chk_melody_phrase(b):
    melody_ready(b)
    reads = []
    for c in ('KeyC', 'KeyV', 'KeyX', 'KeyZ'):   # E F D C, each given time to settle
        key(b, c, up=False)
        time.sleep(0.45)
        reads.append(b.cdp.js(MELODY_STATE)['readout'])
        key(b, c, down=False)
    numerals = [numeral(r) for r in reads]
    return {'ok': numerals == ['I', 'IV', 'V', 'I'], 'detail': {'numerals': numerals, 'readouts': reads}}


# What the page itself saw, with its own clock: under load, the time between
# two CDP key events is not the time between two notes, and the harmonic
# rhythm is a matter of milliseconds.
PRESS_LOG = """(() => { if (!window.__qkLog) { window.__qkLog = [];
  addEventListener('qwerty:press', e => __qkLog.push({ t: performance.now(), code: e.detail.code, readout: e.detail.info && e.detail.info.readout, retarget: !!e.detail.retarget, inner: !!e.detail.inner }));
  addEventListener('qwerty:release', e => __qkLog.push({ t: performance.now(), code: e.detail.code, up: true })); }
  __qkLog.length = 0; return 1; })()"""
SETTLE_MS = 350


def press_log(b):
    log = b.cdp.js("window.__qkLog.slice()")
    downs = [e for e in log if not e.get('up') and not e.get('inner')]
    for e in downs:
        ups = [u['t'] for u in log if u.get('up') and u['code'] == e['code'] and u['t'] >= e['t']]
        e['held'] = (ups[0] - e['t']) if ups else None
        e['chord'] = numeral(e['readout'])
        e['changed'] = bool(e['readout']) and not any(w in e['readout'] for w in ('held', 'passing'))
    return downs


def chk_melody_fast_run(b):
    melody_ready(b)
    for attempt in range(3):
        b.cdp.js("QwertyChords.forget(); 1")
        b.cdp.js(PRESS_LOG)
        for c in ('KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma'):   # a quick C major scale
            key(b, c, up=False)
            time.sleep(0.03)
            key(b, c, down=False)
            time.sleep(0.02)
        time.sleep(0.5)
        ev = press_log(b)
        keys = [e for e in ev if not e['retarget']]
        gaps = [keys[i]['t'] - keys[i - 1]['t'] for i in range(1, len(keys))]
        # fast enough to judge: the notes come quicker than the settle time,
        # and none is held long enough to settle
        fast = (len(keys) == 8 and sorted(gaps)[len(gaps) // 2] < SETTLE_MS * 0.8
                and all((e['held'] or 0) < SETTLE_MS - 20 for e in keys))
        if fast:
            break
    # The rule itself, on the page's own clock: a chord never changes sooner
    # than the settle time after the last change (the first note excepted).
    changes = [e for e in ev if e['changed']]
    early = [round(changes[i]['t'] - changes[i - 1]['t']) for i in range(1, len(changes))
             if changes[i]['t'] - changes[i - 1]['t'] < SETTLE_MS - 25]
    chords = [e['chord'] for e in keys]
    n_changes = sum(1 for i in range(1, len(chords)) if chords[i] != chords[i - 1])
    end = b.cdp.js(MELODY_STATE)
    ok = fast and chords[:1] == ['I'] and not early and n_changes <= 3 and not end['harmony']
    return {'ok': ok, 'detail': {'chords': chords, 'changes': n_changes, 'changedTooSoon': early, 'fastEnough': fast,
                                 'gapsMs': [round(g) for g in gaps], 'heldMs': [round(e['held'] or 0) for e in keys], 'tries': attempt + 1}}


def chk_melody_settles(b):
    melody_ready(b)
    for attempt in range(3):
        b.cdp.js("QwertyChords.forget(); 1")
        b.cdp.js(PRESS_LOG)
        key(b, 'KeyZ', up=False)                   # C4: I
        key(b, 'KeyZ', down=False)
        key(b, 'KeyX', up=False)                   # D4 straight after: passes over the C chord...
        time.sleep(0.7)                            # ...held: it settles, and gets a chord of its own
        later = b.cdp.js(MELODY_STATE)
        key(b, 'KeyX', down=False)
        ev = press_log(b)
        c, d = (ev + [None, None])[:2]
        if c and d and not d['retarget'] and d['t'] - c['t'] < SETTLE_MS - 50:
            break
    re_ = [e for e in ev if e['retarget']]
    ok = (bool(c and d) and d['t'] - c['t'] < SETTLE_MS - 50 and 'passing' in (d['readout'] or '') and d['chord'] == 'I'
          and len(re_) == 1 and re_[0]['chord'] not in (None, 'I') and re_[0]['t'] - c['t'] >= SETTLE_MS - 25
          and numeral(later['readout']) == re_[0]['chord'] and all(x < 62 for x in later['harmony']))
    return {'ok': ok, 'detail': {'press': [(e['readout'], round(e['t'] - ev[0]['t'])) for e in ev], 'settledHarmony': later['harmony'],
                                 'tries': attempt + 1}}


def chk_melody_legato(b):
    melody_ready(b)
    key(b, 'KeyC', up=False)                   # E: C chord
    time.sleep(0.15)
    first = b.cdp.js(MELODY_STATE)['harmony']
    key(b, 'KeyB', up=False)                   # G, still in C: the chord holds
    time.sleep(0.15)
    key(b, 'KeyC', down=False)                 # let go of E while G is held
    time.sleep(0.15)
    mid = b.cdp.js(MELODY_STATE)
    key(b, 'KeyB', down=False)
    time.sleep(0.15)
    end = b.cdp.js(MELODY_STATE)
    ok = bool(first) and mid['harmony'] == first and 'held' in (mid['readout'] or '') and not end['harmony']
    return {'ok': ok, 'detail': {'first': first, 'whileLegato': mid, 'end': end['harmony']}}


def chk_melody_top_note(b):
    melody_ready(b)
    key(b, 'KeyB', up=False)                   # G4 is the tune
    time.sleep(0.5)
    top = b.cdp.js(MELODY_STATE)
    key(b, 'KeyC', up=False)                   # E4 added underneath: a second voice, not a new tune
    time.sleep(0.2)
    both = b.cdp.js(MELODY_STATE)
    key(b, 'KeyB', down=False)                 # the top lets go: E4 is the tune now, the chord goes under it
    time.sleep(0.2)
    after = b.cdp.js(MELODY_STATE)
    key(b, 'KeyC', down=False)
    ok = (both['harmony'] == top['harmony'] and both['readout'] == top['readout'] and sorted(both['marked']) == [64, 67]
          and after['harmony'] and all(x < 64 for x in after['harmony']) and after['marked'] == [64])
    return {'ok': ok, 'detail': {'top': top, 'both': both, 'after': after}}


def chk_melody_linger(b):
    melody_ready(b)
    key(b, 'KeyC', up=False)                   # a short E4...
    time.sleep(0.1)
    key(b, 'KeyC', down=False)
    time.sleep(0.1)
    ringing = b.cdp.js(MELODY_STATE)           # ...the chord rings on after it
    time.sleep(0.9)
    gone = b.cdp.js(MELODY_STATE)              # ...for the short linger (600 ms), then stops
    key(b, 'KeyC', up=False); time.sleep(0.1); key(b, 'KeyC', down=False)
    time.sleep(0.2)
    key(b, 'KeyB', up=False)                   # the next note inside the linger takes the chord over
    time.sleep(0.15)
    over = b.cdp.js(MELODY_STATE)
    key(b, 'KeyB', down=False)
    time.sleep(1.0)
    end = b.cdp.js(MELODY_STATE)
    ok = (ringing['harmony'] and ringing['lingering'] and not ringing['melody'] and 64 not in ringing['piano']
          and not gone['harmony'] and not gone['piano'] and over['harmony'] and over['melody'] == [67]
          and not end['harmony'] and not end['piano'])
    return {'ok': ok, 'detail': {'ringing': ringing, 'gone': gone, 'nextNote': over, 'end': end}}


def chk_melody_low_goes_above(b):
    melody_ready(b)
    key(b, 'ArrowLeft')
    key(b, 'ArrowLeft')                        # bottom row from C2
    key(b, 'KeyZ', up=False)                   # C2 = 36: too low for a chord beneath
    time.sleep(0.15)
    st = b.cdp.js(MELODY_STATE)
    key(b, 'KeyZ', down=False)
    key(b, 'ArrowRight')
    key(b, 'ArrowRight')
    h = st['harmony']
    ok = bool(h) and all(x > 36 for x in h) and 'above' in (st['readout'] or '')
    return {'ok': ok, 'detail': st}


def chk_melody_midi_keyboard(b):
    melody_ready(b)
    b.cdp.js("window.modularApp.midiManager.noteOn(64, 100, 'hw'); 1")
    time.sleep(0.2)
    st = b.cdp.js(MELODY_STATE)
    qwertyLit = b.cdp.js("window.modularApp.midiManager.getActiveNotes().filter(n => n.inputId === 'qwerty').map(n => n.midi)")
    b.cdp.js("window.modularApp.midiManager.noteOff(64, 'hw'); 1")
    time.sleep(0.2)
    after = b.cdp.js(MELODY_STATE)
    left = b.cdp.js("window.modularApp.midiManager.getActiveNotes().length")
    h = st['harmony']
    ok = (h and all(x < 64 for x in h) and 64 not in qwertyLit and st['marked'] == [64] and numeral(st['readout']) == 'I'
          and not after['harmony'] and not after['piano'] and left == 0)
    return {'ok': ok, 'detail': {'held': st, 'qwertyLit': qwertyLit, 'released': after, 'activeLeft': left}}


def chk_melody_borrows(b):
    melody_ready(b)
    res = b.cdp.js("""(() => { const mt = window.modularApp.musicTheory;
      const p = { major: QwertyChords.parallelScale('major'), aeolian: QwertyChords.parallelScale('aeolian'), dorian: QwertyChords.parallelScale('dorian') };
      return { p, exist: Object.values(p).every(id => !!mt.scales[id]) }; })()""")
    key(b, 'KeyH', up=False)                   # A♭4: outside C major
    time.sleep(0.2)
    st = b.cdp.js(MELODY_STATE)
    key(b, 'KeyH', down=False)
    pcs = {x % 12 for x in st['harmony']}
    ok = res['p'] == {'major': 'aeolian', 'aeolian': 'major', 'dorian': 'major'} and res['exist'] and st['harmony'] and numeral(st['readout'])
    return {'ok': bool(ok), 'detail': {'parallel': res, 'abChord': st['readout'], 'harmonyPcs': sorted(pcs)}}


def chk_mode_switch(b):
    blur(b)
    touch_piano(b)
    res = b.cdp.js("""(async () => {
      const seg = m => document.querySelector('.qk-modes .qk-mode-btn[data-mode="' + m + '"]');
      const read = () => ({ mode: QwertyChords.mode(), kind: QwertyChords.kind(), active: QwertyChords.active(), base: QwertyKeys.state().base,
        checked: ['notes', 'chords', 'harmonize'].filter(m => seg(m).getAttribute('aria-checked') === 'true'),
        saved: (JSON.parse(localStorage.getItem('music-theory-chord-mode') || '{}')).mode });
      const out = {};
      seg('notes').click(); await new Promise(r => setTimeout(r, 80)); out.notes = read();
      seg('chords').click(); await new Promise(r => setTimeout(r, 80)); out.chords = read();
      document.querySelector('.qk-chords-btn').click(); await new Promise(r => setTimeout(r, 80));
      out.chordsPanelHidesHarmonize = document.querySelector('.qk-chords-melody').hidden;
      document.querySelector('.qk-chords-btn').click();
      seg('harmonize').click(); await new Promise(r => setTimeout(r, 80)); out.harmonize = read();
      document.querySelector('.qk-chords-btn').click(); await new Promise(r => setTimeout(r, 80));
      out.harmonizePanelShowsIt = !document.querySelector('.qk-chords-melody').hidden;
      out.lingerChoice = !!document.querySelector('.qk-chords-melody select option[value="pedal"]');
      document.querySelector('.qk-chords-btn').click();
      return out;
    })()""")
    key(b, 'ArrowRight')                       # harmonize's own octave goes up...
    time.sleep(0.1)
    up = b.cdp.js("({ base: QwertyKeys.state().base, hintZ: (window.modularApp.pianoVisualizer._keyHints || {})[72] })")
    b.cdp.js("document.querySelector('.qk-modes .qk-mode-btn[data-mode=\"notes\"]').click(); 1")
    time.sleep(0.1)
    notes_base = b.cdp.js("QwertyKeys.state().base")    # ...and the notes octave is where it was
    b.cdp.js("document.querySelector('.qk-modes .qk-mode-btn[data-mode=\"harmonize\"]').click(); 1")
    time.sleep(0.1)
    back = b.cdp.js("QwertyKeys.state().base")
    key(b, 'ArrowLeft')
    b.cdp.js("document.querySelector('.qk-modes .qk-mode-btn[data-mode=\"notes\"]').click(); 1")
    n, c, h = res['notes'], res['chords'], res['harmonize']
    ok = (n['mode'] == 'notes' and not n['active'] and n['checked'] == ['notes'] and n['base'] == 48
          and c['mode'] == 'chords' and c['kind'] == 'chords' and c['active'] and c['checked'] == ['chords'] and c['saved'] == 'chords'
          and res['chordsPanelHidesHarmonize'] and h['kind'] == 'melody' and h['base'] == 60 and h['saved'] == 'harmonize'
          and res['harmonizePanelShowsIt'] and res['lingerChoice'] and up == {'base': 72, 'hintZ': 'Z'} and notes_base == 48 and back == 72)
    return {'ok': ok, 'detail': {'switch': res, 'harmonizeUp': up, 'notesBase': notes_base, 'harmonizeAgain': back}}


def chk_old_prefs_migrate(b):
    st = b.cdp.js("({ mode: QwertyChords.mode(), s: QwertyChords.settings() })")
    ok = st['mode'] == 'harmonize' and 'latched' not in st['s'] and 'kind' not in st['s'] and st['s']['change'] == 'smart'
    return {'ok': ok, 'detail': st}


OLD_PREFS = json.dumps({'voicing': 'smart', 'voiceLeading': True, 'latched': True, 'kind': 'melody', 'change': 'needed'})
CHECKS.update({
    'harmonize: the key is the melody, and a chord sounds under it': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_under),
    'harmonize: E F D C, each let settle, is harmonized I IV V I': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_phrase),
    'harmonize: a fast scale is not a chord per note (3 changes or fewer)': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_fast_run),
    'harmonize: a passing note still held once settled gets its own chord': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_settles),
    'harmonize: legato keeps the chord sounding until the last key lifts': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_legato),
    'harmonize: the highest held note is the tune': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_top_note),
    'harmonize: staccato, the chord rings briefly and the next note takes it over': ({'music-theory-look': 'og', 'music-theory-chord-mode': melody_prefs(linger='short')}, True, chk_melody_linger),
    'harmonize: a melody too low for a chord beneath gets it above': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_low_goes_above),
    'harmonize: a MIDI keyboard is harmonized, its own note left alone': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_midi_keyboard),
    'harmonize: borrows from the real parallel minor': ({'music-theory-look': 'og', 'music-theory-chord-mode': MELODY_PREFS}, True, chk_melody_borrows),
    'typing keyboard: Notes | Chords | Harmonize on the chip, each with its own octave': ({'music-theory-look': 'og'}, True, chk_mode_switch),
    'typing keyboard: old latched melody settings become Harmonize': ({'music-theory-look': 'og', 'music-theory-chord-mode': OLD_PREFS}, True, chk_old_prefs_migrate),
})


def chk_suggestions(b):
    res = b.cdp.js("""(async () => {
      const ids = () => [...document.querySelectorAll('.look-suggest-card')].map(c => c.dataset.lookId);
      const first = ids();
      document.querySelector('.skill-level-btn[data-level="advanced"]').click();
      await new Promise(r => setTimeout(r, 100));
      const adv = ids();
      const i = document.getElementById('intent-search'); i.value = 'reharmonize a song'; i.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 400));
      const intent = ids();
      document.querySelector('.look-suggest-card').click();
      await new Promise(r => setTimeout(r, 300));
      return { first, adv, intent, current: StudioLooks.current() };
    })()""")
    ok = (res['first'][0] == 'focus' and 'notation-desk' in res['adv'] and len(res['intent']) == 3
          and res['current'] == res['intent'][0])
    return {'ok': ok, 'detail': res}


def chk_captions_first_visit(b):
    res = b.cdp.js("""(async () => {
      const open = () => document.querySelector('.look-zone[data-zone="b"]').classList.contains('look-why-open');
      const shown = () => getComputedStyle(document.getElementById('look-why-b')).display !== 'none';
      StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 300));
      const first = [open(), shown()];
      StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 200));
      StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 300));
      const second = [open(), shown()];
      document.querySelector('.look-zone[data-zone="b"] .look-why-toggle').click();
      const toggled = [open(), shown()];
      return { first, second, toggled };
    })()""")
    ok = res['first'] == [True, True] and res['second'] == [False, False] and res['toggled'] == [True, True]
    return {'ok': ok, 'detail': res}


def chk_keyboard_rails_and_tiles(b):
    b.cdp.js("(async () => { StudioLooks.apply('stage-wings'); await new Promise(r => setTimeout(r, 500)); document.querySelector('.look-zone[data-side=\"right\"] > .look-item:not(.look-absent) > .module-header').focus(); return 1; })()")
    b.cdp.call('Input.dispatchKeyEvent', type='keyDown', key='Enter', code='Enter', windowsVirtualKeyCode=13)
    b.cdp.call('Input.dispatchKeyEvent', type='keyUp', key='Enter', code='Enter', windowsVirtualKeyCode=13)
    time.sleep(0.3)
    rail = b.cdp.js("(() => { const o = document.querySelector('.look-rail-open'); return { open: !!o, expanded: o && o.querySelector('.module-header').getAttribute('aria-expanded') }; })()")
    b.cdp.js("(async () => { StudioLooks.apply('test-deck'); await new Promise(r => setTimeout(r, 500)); document.querySelector('.look-zone[data-flow=\"mosaic\"] > .look-item:not(.look-absent) > .module-header').focus(); return 1; })()")
    b.cdp.call('Input.dispatchKeyEvent', type='keyDown', key=' ', code='Space', windowsVirtualKeyCode=32, text=' ')
    b.cdp.call('Input.dispatchKeyEvent', type='keyUp', key=' ', code='Space', windowsVirtualKeyCode=32)
    time.sleep(0.3)
    tile = b.cdp.js("(() => !!document.querySelector('.look-zoom'))()")
    return {'ok': rail['open'] and rail['expanded'] == 'true' and tile, 'detail': {'rail': rail, 'tileZoomed': tile}}


def chk_tour(b):
    res = b.cdp.js("""(async () => {
      document.getElementById('easy-mode-btn').click();
      await new Promise(r => setTimeout(r, 400));
      const seen = [];
      for (let i = 0; i < 8; i++) {
        const prog = document.getElementById('tutorial-progress').textContent;
        const hl = document.getElementById('tutorial-highlight');
        seen.push({ prog, highlighted: hl.style.display !== 'none' && parseFloat(hl.style.width) > 0 });
        document.getElementById('tutorial-next').click();
        await new Promise(r => setTimeout(r, 250));
      }
      return { seen, tooltips: document.querySelectorAll('.tutorial-tooltip.active').length };
    })()""")
    progs = [s['prog'] for s in res['seen']]
    ok = progs[0] == 'Step 1 of 8' and progs[-1] == 'Step 8 of 8' and all(s['highlighted'] for s in res['seen'])
    return {'ok': ok, 'detail': res}


CHECKS.update({
    'the header keeps its height whatever the scale is called': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const hs = [];
        for (const [k, sc] of [['C', 'major'], ['F#', 'harmonic_minor'], ['Bb', 'lydian_augmented_pentatonic']]) {
          window.modularApp.scaleLibrary.setKeyAndScale(k, sc);
          await new Promise(r => setTimeout(r, 300));
          hs.push(Math.round(document.querySelector('.control-deck').getBoundingClientRect().height));
        }
        return { ok: hs.every(h => h === hs[0]), detail: { heights: hs } };
      })()"""),
    "a row zone's caption sits above its modules, not beside them": ({'music-theory-look': 'og', **CUSTOM}, True, """
      (async () => {
        const out = {};
        for (const [id, z] of [['test-split', 'a'], ['test-split', 'b']]) {
          StudioLooks.apply(id); await new Promise(r => setTimeout(r, 500));
          const zone = document.querySelector('.look-zone[data-zone="' + z + '"]');
          const zr = zone.getBoundingClientRect();
          const first = zone.querySelector(':scope > .look-item:not(.look-absent)');
          out[id + ':' + z] = Math.round(first.getBoundingClientRect().left - zr.left);
        }
        return { ok: Object.values(out).every(dx => dx < 40), detail: { firstModuleOffsetPx: out } };
      })()"""),
    'landing: suggests looks for the chosen level and intent': ({'music-theory-look': 'og'}, False, chk_suggestions),
    "a look's captions open on the first visit, then fold behind ?": ({'music-theory-look': 'og'}, True, chk_captions_first_visit),
    'rail spines and tiles work from the keyboard': ({'music-theory-look': 'og', **CUSTOM}, True, chk_keyboard_rails_and_tiles),
    'the guided tour is one tour, and every step points at something real': ({'music-theory-look': 'og', 'music-theory-visited': 'true'}, True, chk_tour),
})

CHECKS.update({
    'builder: remix opens on the current look, and moves preview live': ({'music-theory-look': 'og'}, True, chk_builder_remix_moves_live),
    'builder: a skeleton redeals the modules (Tabs opens on the score)': ({'music-theory-look': 'og'}, True, chk_builder_skeleton),
    'builder: save stores it as yours, and it survives a reload': ({'music-theory-look': 'og'}, True, chk_builder_save_and_reload),
    'builder: cancel puts the previous look back and saves nothing': ({'music-theory-look': 'og'}, True, chk_builder_cancel_restores),
    'builder: import refuses a hostile look and opens a good one': ({'music-theory-look': 'og'}, True, chk_builder_import_gate),
    'builder: an export imports back unchanged': ({'music-theory-look': 'og'}, True, chk_builder_export_roundtrip),
    'builder: typing in it is typing, never notes': ({'music-theory-look': 'og'}, True, chk_builder_typing_is_typing),
})

CHECKS.update({
    'circle: names the scale, spells positions by it, and lights every scale tone': ({'music-theory-look': 'og'}, True, """
      (async () => {
        window.modularApp.scaleLibrary.setKeyAndScale('D', 'dorian');
        await new Promise(r => setTimeout(r, 400));
        const c = window.modularApp.scaleCircleExplorer;
        const order = c.getKeyOrder();
        const ctx = document.getElementById('circle-canvas').getAttribute('aria-label') || '';
        const lit = c.state.scaleNotes.every(n => c.isNoteInScale(n));
        const ok = c.state.scaleType === 'dorian' && !order.includes('E#') && c.isNoteInScale('F') && c.labelForKey('F') === 'F'
                   && /D dorian/.test(ctx) && lit;
        return { ok, detail: { scaleType: c.state.scaleType, order, ctx: ctx.replace(/\\s+/g, ' ').trim().slice(0, 80) } };
      })()"""),
    'circle: fourths mode names real keys': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const c = window.modularApp.scaleCircleExplorer;
        window.modularApp.scaleLibrary.setKeyAndScale('E', 'major');
        await new Promise(r => setTimeout(r, 300));
        const was = c.state.mode; c.state.mode = 'fourths';
        const order = c.getKeyOrder(); c.state.mode = was;
        return { ok: !order.some(k => /bb|Cb|Fb/.test(k)) && order.length === 12, detail: { order } };
      })()"""),
    'no look gives the empty key/scale shell a place': ({'music-theory-look': 'og'}, True, """
      (async () => {
        const bad = [];
        for (const l of StudioLooks.looks) {
          if (l.id === 'og') continue;
          StudioLooks.apply(l.id); await new Promise(r => setTimeout(r, 120));
          const ks = document.querySelector('[data-module="keyscale"]');
          if (ks && ks.closest('.look-zone') && !ks.classList.contains('look-absent')) bad.push(l.id);
        }
        return { ok: bad.length === 0, detail: { looksWithKeyscale: bad } };
      })()"""),
    'header never overflows, and fits one row at 1440': ({'music-theory-look': 'og'}, True, """
      (() => { const d = document.querySelector('.control-deck');
        const fits = d.scrollWidth <= d.clientWidth + 1;
        const oneRow = innerWidth < 1440 || d.getBoundingClientRect().height <= 50;
        return { ok: fits && oneRow, detail: { scrollWidth: d.scrollWidth, width: d.clientWidth, height: Math.round(d.getBoundingClientRect().height) } }; })()"""),
    'the sheet controls switch is remembered per look': ({'music-theory-look': 'stage-wings'}, True, """
      (async () => {
        const sheet = document.querySelector('[data-module="sheet"]');
        const t = sheet.querySelector('.look-stage-toggle');
        const hiddenAtFirst = getComputedStyle(sheet.querySelector('.sheet-music-controls')).display === 'none';
        t.click();
        StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 200));
        const ogToggle = !!document.querySelector('.look-stage-toggle');
        StudioLooks.apply('stage-wings'); await new Promise(r => setTimeout(r, 200));
        const open = sheet.hasAttribute('data-controls-open');
        return { ok: hiddenAtFirst && open && !ogToggle, detail: { hiddenAtFirst, rememberedOpen: open, toggleLeftInOG: ogToggle } };
      })()"""),
    'module zoom never shrinks text below 80%': ({'music-theory-look': 'og', **CUSTOM}, True, """
      (async () => {
        let min = 1, where = null;
        for (const id of ['test-deck', 'test-split', 'luthier', 'notation-desk']) {
          StudioLooks.apply(id); await new Promise(r => setTimeout(r, 1300));
          document.querySelectorAll('[data-module] > .module-content').forEach(b => {
            const z = parseFloat(b.style.zoom) || 1; if (z < min) { min = z; where = id + ':' + b.parentElement.dataset.module; } });
        }
        return { ok: min >= 0.799, detail: { minZoom: min, where } };
      })()"""),
    'score looks put at least 250px of staff on screen': ({'music-theory-look': 'og'}, True, chk_staff_on_screen_in_score_looks),
    'chord mode: Shift+V plays IV, on both instruments, with a named voicing': ({'music-theory-look': 'og'}, True, chk_chord_mode_plays),
    'chord mode: I vi IV V I voice-leads (each chord moves 8 semitones or less)': ({'music-theory-look': 'og'}, True, chk_chord_mode_voice_leads),
    'chord mode: each voicing decision takes under 8 ms (p95)': ({'music-theory-look': 'og'}, True, chk_chord_mode_fast_enough),
    'chord mode: off on Learn pages, so drills are not answered for you': ({'music-theory-look': 'og'}, False, chk_chord_mode_off_on_learn),
    'chord mode: A pins the inversion (IV6 is F/A); a held chord is struck again': ({'music-theory-look': 'og', 'music-theory-chord-mode': CHORDS_PREFS}, True, chk_inversion_pins_bass),
    'chord mode: F walks the inversions; repeats move, changes lead smoothly': ({'music-theory-look': 'og', 'music-theory-chord-mode': CHORDS_PREFS}, True, chk_inversion_walk),
    'typing keyboard: a Learn page hears it without arming': ({'music-theory-look': 'og'}, False, chk_learn_page_hears_keys),
    'learn scales: the G major quiz hears the piano, hides the answer, grades in pitch order': ({'music-theory-look': 'og'}, False, chk_scales_quiz),
    'typing keyboard: typing in the word box never plays a note': ({'music-theory-look': 'og'}, True, chk_typing_never_plays),
    'typing keyboard: touching the piano arms it; Z plays C3 on piano and fretboard': ({'music-theory-look': 'og'}, True, chk_touch_arms_and_plays),
    'typing keyboard: a burst of note keys while idle asks instead of playing': ({'music-theory-look': 'og'}, True, chk_cold_burst_asks),
    'typing keyboard: arrows move the octave; Escape disarms and stays in the studio': ({'music-theory-look': 'og'}, True, chk_octave_and_escape),
    'typing keyboard: backquote toggles it': ({'music-theory-look': 'og'}, True, chk_backquote_toggles),
})



# ---------------------------------------------------------------- contour
def _mouse(b, kind, x, y):
    b.cdp.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left',
               buttons=0 if kind == 'mouseReleased' else 1, clickCount=1)


def _type_words(b, words):
    b.cdp.js(f"""(async () => {{
      const inp = document.getElementById('global-word-input');
      inp.focus(); inp.value = {json.dumps(words)};
      inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
      await new Promise(r => setTimeout(r, 600));
    }})()""")


def chk_contour_drawn_by_hand(b):
    """A stroke with the real mouse redraws the part it crosses, survives new
    words, and the piece's energy follows it."""
    _type_words(b, 'chase woods dark')
    before = b.cdp.js("""(() => { const tl = window.compositionTimeline;
      const r = tl.canvas.getBoundingClientRect();
      return { source: tl.curveSource, name: tl.suggestion && tl.suggestion.name,
               caption: tl._caption.textContent, rect: [r.left, r.top, r.width, r.height] }; })()""")
    L, T, W, H = before['rect']
    # Edge to edge: low, high in the middle, low from three-quarters on.
    path = [(0.01, 0.85), (0.15, 0.85), (0.3, 0.5), (0.5, 0.1), (0.6, 0.1), (0.75, 0.9), (0.99, 0.9)]
    xs = [(L + W * fx, T + H * fy) for fx, fy in path]
    _mouse(b, 'mousePressed', *xs[0])
    for (x0, y0), (x1, y1) in zip(xs, xs[1:]):
        for k in range(1, 9):
            _mouse(b, 'mouseMoved', x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8)
    _mouse(b, 'mouseReleased', *xs[-1])
    drawn = b.cdp.js("""(() => { const tl = window.compositionTimeline; const c = tl.curve, n = c.length - 1;
      const at = (x) => +c[Math.round(x * n)].toFixed(2);
      return { source: tl.curveSource, open: tl._isOpen, at10: at(0.1), at55: at(0.55), at75: at(0.75),
               points: tl.points.length, caption: tl._caption.textContent }; })()""")
    _type_words(b, 'chase woods dark and the long night')
    kept = b.cdp.js("""(() => { const tl = window.compositionTimeline; const c = tl.curve, n = c.length - 1;
      return { source: tl.curveSource, at55: +c[Math.round(0.55 * n)].toFixed(2) }; })()""")
    played = b.cdp.js("""(async () => {
      let got = null;
      document.addEventListener('musicGenerated', (e) => { got = e.detail; }, { once: true });
      document.getElementById('generation-run').click();
      for (let i = 0; i < 120 && !got; i++) await new Promise(r => setTimeout(r, 100));
      if (!got || !got.arc) return null;
      const ep = got.arc.energyProfile, c = window.compositionTimeline.curve;
      const curveAt = (t) => c[Math.round(t * (c.length - 1))];
      let worst = 0;
      ep.forEach((v, i) => { const t = ep.length > 1 ? i / (ep.length - 1) : 0; worst = Math.max(worst, Math.abs(v - curveAt(t))); });
      const peak = ep.indexOf(Math.max(...ep)) / Math.max(1, ep.length - 1);
      return { beats: ep.length, worstGap: +worst.toFixed(3), peakAt: +peak.toFixed(2) };
    })()""")
    ok = (before['source'] == 'suggested' and bool(before['name'])
          and drawn['source'] == 'drawn' and drawn['at10'] < 0.25 and drawn['at55'] > 0.8 and drawn['at75'] < 0.2
          and drawn['open'] and 'Your contour' in drawn['caption']
          and kept['source'] == 'drawn' and kept['at55'] == drawn['at55']
          and played is not None and played['worstGap'] < 0.08 and 0.35 <= played['peakAt'] <= 0.65)
    return {'ok': ok, 'detail': {'before': before, 'drawn': drawn, 'kept': kept, 'played': played}}


def chk_contour_touch_and_suggest(b):
    """A finger draws too, and Suggest a shape hands back a named, different shape."""
    _type_words(b, 'grief')
    res = b.cdp.js("""(async () => {
      const tl = window.compositionTimeline, cv = tl.canvas, r = cv.getBoundingClientRect();
      const ev = (type, fx, fy) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
        pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
        clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }));
      ev('pointerdown', 0.2, 0.9); ev('pointermove', 0.5, 0.05); ev('pointermove', 0.8, 0.9); ev('pointerup', 0.8, 0.9);
      await new Promise(r => setTimeout(r, 50));
      const c = tl.curve, n = c.length - 1;
      const touch = { source: tl.curveSource, at50: +c[Math.round(0.5 * n)].toFixed(2), action: getComputedStyle(cv).touchAction };
      const btn = [...document.querySelectorAll('#composition-timeline-panel button')].find(x => /Suggest a shape/.test(x.textContent));
      const names = [];
      for (let i = 0; i < 4; i++) { btn.click(); names.push(tl.suggestion && tl.suggestion.name); }
      return { touch, names, source: tl.curveSource, caption: tl._caption.textContent };
    })()""")
    names = res['names']
    ok = (res['touch']['source'] == 'drawn' and res['touch']['at50'] > 0.85 and res['touch']['action'] == 'none'
          and all(names) and len(set(names)) == len(names) and res['source'] == 'suggested'
          and res['caption'].startswith('Suggested: ' + names[-1]))
    return {'ok': ok, 'detail': res}


CHECKS.update({
    'contour: drawn by hand, kept across new words, and played as drawn': ({'music-theory-look': 'og'}, True, chk_contour_drawn_by_hand),
    'contour: a finger draws too; Suggest a shape names a different shape each press': ({'music-theory-look': 'og'}, True, chk_contour_touch_and_suggest),
    'words: no lexicon libraries load, and words still set the mood': ({'music-theory-look': 'og'}, True, """
      (() => {
        const gone = typeof window.nlp === 'undefined' && !window.NRC_DATA && !window.WORD_SENSES_DATA
          && typeof window.WordDatabase === 'undefined';
        const lex = (t) => new ContextEngine().parseInput(t).metadata.lexical;
        const grief = lex('grief'), joy = lex('she laughed and the room lit up'), none = lex('asdf qwerty');
        return { ok: gone && grief.avgValence < -0.4 && joy.avgValence > 0.3 && none.avgValence === 0,
                 detail: { gone, grief: grief.avgValence, joy: joy.avgValence, unknown: none.avgValence } };
      })()"""),
})

def chk_course_landing(b):
    res = b.cdp.js("""(async () => {
      const shown = () => [...document.querySelectorAll('#course-path .course-level')]
        .filter(l => getComputedStyle(l).display !== 'none').map(l => l.dataset.level);
      const lessons = (lv) => document.querySelectorAll('#course-path .course-level[data-level="' + lv + '"] .course-lesson').length;
      const out = { start: shown() };
      for (const lv of ['intermediate', 'advanced', 'all']) {
        document.querySelector('.skill-level-btn[data-level="' + lv + '"]').click();
        await new Promise(r => setTimeout(r, 100));
        out[lv] = shown();
      }
      out.counts = { beginner: lessons('beginner'), intermediate: lessons('intermediate'), advanced: lessons('advanced') };
      out.toolCards = [...document.querySelectorAll('#module-grid .module-card')].map(c => c.dataset.moduleId);
      out.learnButtons = ['launch-learn-notes-btn', 'launch-learn-scales-btn', 'launch-learn-chords-btn', 'launch-learn-inversions-btn']
        .every(id => !!document.getElementById(id));
      return out;
    })()""")
    ok = (res['start'] == ['beginner'] and res['intermediate'] == ['intermediate'] and res['advanced'] == ['advanced']
          and len(res['all']) == 3 and res['counts']['intermediate'] >= 6 and res['counts']['advanced'] >= 6
          and 'learn-scales' not in res['toolCards'] and 'guitar-fretboard' in res['toolCards'] and res['learnButtons'])
    return {'ok': ok, 'detail': res}


def chk_course_lesson_roundtrip(b):
    res = b.cdp.js("""(async () => {
      StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 300));
      Course.start('i-bebop-major'); await new Promise(r => setTimeout(r, 900));
      const during = { look: StudioLooks.current(), scale: modularApp.scaleLibrary.getCurrentScale(),
        spots: [...document.querySelectorAll('.course-spot')].length, card: !!document.querySelector('#course-card h2'),
        strip: [...document.querySelectorAll('#mini-chord-strip .mini-name')].map(n => n.textContent) };
      document.querySelector('#course-card [data-act="next"]').click(); await new Promise(r => setTimeout(r, 900));
      const next = { lesson: CourseRunner.current(), mode: QwertyChords.mode() };
      document.querySelector('#course-card [data-act="exit"]').click(); await new Promise(r => setTimeout(r, 500));
      return { during, next, after: StudioLooks.current(), on: document.body.classList.contains('course-on') };
    })()""")
    d = res['during']
    ok = (d['look'] == '__lesson' and d['scale'] == 'bebop_major' and d['spots'] >= 1 and d['card']
          and d['strip'][:3] == ['C6', 'D°7', 'C6/E'] and res['next']['lesson'] == 'i-harmonize-6-dim'
          and res['next']['mode'] == 'harmonize' and res['after'] == 'luthier' and not res['on'])
    return {'ok': ok, 'detail': res}


def chk_course_lessons_roomy(b):
    """Each lesson lays the studio out for itself: its own tools get the room,
    and no tool it never mentions sits on screen beside them (looks built for the
    whole window, less the card and the dock, left them tiny)."""
    res = b.cdp.js("""(async () => {
      const out = [];
      for (const id of Course.order) {
        const l = Course.get(id);
        if (!l || l.page) continue;
        Course.start(id); await new Promise(r => setTimeout(r, 900));
        const mods = StudioLooks.modules(), size = {}, extra = [];
        l.modules.filter(m => m !== 'fretboard').forEach(m => {
          const el = document.getElementById(mods[m].container), item = el && (el.closest('.look-item') || el);
          const r = item ? item.getBoundingClientRect() : { width: 0, height: 0 };
          size[m] = [Math.round(r.width), Math.round(r.height)];
        });
        document.querySelectorAll('.workspace > .look-zone:not([data-flow="drawer"]) > .look-item').forEach(it => {
          if (it.getClientRects().length && !l.modules.includes(it.dataset.module) && !['sheet', 'chordstrip'].includes(it.dataset.module)) extra.push(it.dataset.module);
        });
        out.push({ id, look: StudioLooks.current(), size, extra });
      }
      CourseRunner.leave();
      return out;
    })()""")
    floor = {'sheet': (336, 280), 'solar': (280, 240), 'chordstrip': (280, 0)}
    bad = [r for r in res if r['look'] != '__lesson' or r['extra']
           or any(w < floor.get(m, (280, 150))[0] or h < floor.get(m, (280, 150))[1] for m, (w, h) in r['size'].items())]
    return {'ok': bool(res) and not bad, 'detail': bad or res}


def chk_course_checks_and_progress(b):
    res = b.cdp.js("""(async () => {
      const w = (ms) => new Promise(r => setTimeout(r, ms));
      Course.start('i-drop-2'); await w(900);
      const before = Course.isDone('i-drop-2');
      // the way a player sets it: the typing keyboard's own menu, behind its gear
      document.querySelector('.qk-chords-btn').click(); await w(150);
      const keys = document.querySelector('.qk-chords-voicing select');
      keys.value = 'drop2'; keys.dispatchEvent(new Event('change', { bubbles: true }));
      await w(700);
      const sheetFollowed = modularApp.sheetMusicGenerator._voicingSelectEl.value;
      const firstTicked = CourseRunner.stepsDone().includes(0);
      const partDone = Course.isDone('i-drop-2');
      const steps = Course.get('i-drop-2').steps;
      for (let k = 1; k < steps.length; k++) if (steps[k].set) { CourseRunner.doStep(k); await w(700); }
      const voiced = Course.isDone('i-drop-2');
      Course.start('a-five-of'); await w(900);
      const opts = [...document.querySelectorAll('#course-card .course-opt')];
      opts[0].click(); const wrong = Course.isDone('a-five-of');
      opts[1].click(); const right = Course.isDone('a-five-of');
      const stored = JSON.parse(localStorage.getItem('music-theory-course-progress') || '{}');
      return { before, sheetFollowed, firstTicked, partDone, voiced, wrong, right, stored: Object.keys(stored) };
    })()""")
    ok = (not res['before'] and res['sheetFollowed'] == 'drop2' and res['firstTicked'] and not res['partDone']
          and res['voiced'] and not res['wrong'] and res['right']
          and 'i-drop-2' in res['stored'] and 'a-five-of' in res['stored'])
    return {'ok': ok, 'detail': res}


def chk_course_steps_point(b):
    """Every step of every lesson, in that lesson's look: "Show me" lands a ring
    on screen and clear of the lesson card, and "Do it for me" ticks the step."""
    res = b.cdp.js("""(async () => {
      const w = (ms) => new Promise(r => setTimeout(r, ms));
      const bad = [];
      let steps = 0;
      for (const id of Course.order) {
        const l = Course.get(id);
        if (l.page) continue;
        Course.start(id); await w(1000);
        const cardEl = document.getElementById('course-card');
        for (let k = 0; k < l.steps.length; k++) {
          steps++;
          // the buttons themselves: on a narrow screen they fold the card out of the way
          cardEl.querySelector('[data-step-show="' + k + '"]').click();
          // the ring shows once the control is in sight (opening the sheet's toolbar re-lays the look out first)
          let r = null;
          for (let t = 0; t < 12 && !r; t++) { await w(250); r = CourseRunner.pointerRect(); }
          const card = cardEl.getBoundingClientRect();
          const where = id + ' #' + (k + 1) + ' ' + l.steps[k].at;
          if (!r) { bad.push(where + ': not in sight'); continue; }
          // on screen, and not under the fixed header or behind the instrument dock (the qk chip lives in the dock)
          const deck = document.querySelector('.control-deck').getBoundingClientRect().bottom;
          const dockEl = document.querySelector('.bottom-deck');
          const inDock = dockEl && dockEl.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          const dockFixed = dockEl && getComputedStyle(dockEl).display !== 'none' && getComputedStyle(dockEl).position === 'fixed';
          const dock = !inDock && dockFixed ? dockEl.getBoundingClientRect().top : innerHeight;
          if (r.top < deck - 2 || r.left < -2 || r.bottom > dock + 2 || r.right > innerWidth + 2) bad.push(where + ': off screen [' + [r.top, r.bottom, deck, dock].map(Math.round) + ']');
          if (r.right > card.left + 4 && r.left < card.right && r.bottom > card.top && r.top < card.bottom) bad.push(where + ': under the card');
          if (l.steps[k].set) {
            cardEl.querySelector('[data-step-do="' + k + '"]').click(); await w(900);
            if (!CourseRunner.stepsDone().includes(k)) bad.push(where + ': Do it did not tick it');
          }
        }
      }
      CourseRunner.leave();
      return { steps, bad };
    })()""")
    return {'ok': res['steps'] >= 30 and not res['bad'], 'detail': res}


def chk_course_chips(b):
    res = b.cdp.js("""(async () => {
      StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 300));
      const og = [...document.querySelectorAll('.course-chip')].filter(c => getComputedStyle(c).display !== 'none').length;
      StudioLooks.apply('luthier'); await new Promise(r => setTimeout(r, 600));
      const chip = document.querySelector('[data-module="relations"] > .module-header > .course-chip')
        || [...document.querySelectorAll('.course-chip')].find(c => c.closest('.look-item') && c.closest('.look-item').querySelector('#scale-relationship-container'));
      const visible = chip ? getComputedStyle(chip).display !== 'none' : false;
      if (chip) chip.click();
      await new Promise(r => setTimeout(r, 300));
      const listed = [...document.querySelectorAll('#course-card .course-idx-btn')].map(x => x.dataset.lesson);
      return { og, visible, text: chip && chip.textContent, listed };
    })()""")
    ok = res['og'] == 0 and res['visible'] and 'a-scales-as-moods' in res['listed'] and 'a-chromatic-mediants' in res['listed']
    return {'ok': ok, 'detail': res}


CHIP_SEEN = "(() => { const c = document.querySelector('.qk-chip'); return !!c && c.getClientRects().length > 0; })()"


def chk_course_keys_chip(b):
    wrong = b.cdp.js("""(async () => {
      const seen = () => { const c = document.querySelector('.qk-chip'); return !!c && c.getClientRects().length > 0; };
      const out = [];
      for (const id of Course.order) {
        Course.start(id); await new Promise(r => setTimeout(r, 150));
        const uses = (Course.get(id).steps || []).some(s => /^qk-/.test(s.at || ''));
        if (seen() !== uses) out.push(id);
      }
      return out;
    })()""")
    # a lesson with no use for it, card folded: the studio is back, chip and all
    b.cdp.js("(async () => { Course.start('a-five-of'); await new Promise(r => setTimeout(r, 200)); })()")
    b.cdp.js("document.querySelector('#course-card [data-act=\"collapse\"]').click(); 1")
    folded = b.cdp.js(CHIP_SEEN)
    b.cdp.js("document.getElementById('course-pill').click(); 1")
    unfolded = b.cdp.js(CHIP_SEEN)
    # it may still have to ask
    blur(b)
    for c in ('KeyZ', 'KeyX', 'KeyC'):
        key(b, c)
    time.sleep(0.2)
    asks = b.cdp.js(CHIP_SEEN) and b.cdp.js("QwertyKeys.state().prompting")
    b.cdp.js("QwertyKeys.disarm(); 1")
    # leaving the course puts it back in the dock
    b.cdp.js("(async () => { CourseRunner.leave(); await new Promise(r => setTimeout(r, 200)); })()")
    left = b.cdp.js(CHIP_SEEN)
    # a Learn page: no chip, and the keys still play
    b.cdp.js("(async () => { Course.start('b-chords'); await new Promise(r => setTimeout(r, 1200)); })()")
    page = b.cdp.js("(() => { const p = document.getElementById('learn-chords-page'); return !!p && p.getClientRects().length > 0; })()")
    learn_chip = b.cdp.js(CHIP_SEEN)
    blur(b)
    key(b, 'KeyZ', up=False)
    time.sleep(0.15)
    plays = b.cdp.js("QwertyKeys.state().sounding")
    key(b, 'KeyZ', down=False)
    ok = (not wrong and folded and not unfolded and asks and left and page and not learn_chip and len(plays) == 1)
    return {'ok': ok, 'detail': {'wrong': wrong, 'folded': folded, 'unfolded': unfolded, 'asks': asks, 'left': left,
                                 'page': page, 'learn_chip': learn_chip, 'plays': plays}}


def chk_solar_rings_in_every_look(b):
    """In every look: the drawing is as big as its box (never stretched) and at
    least usable, every note has its own ring inside the box, the bar is one
    line, and clicking a planet moves in on its moons with their numbers."""
    res = b.cdp.js("""(async () => {
      const w = (ms) => new Promise(r => setTimeout(r, ms));
      const bad = [], sizes = {};
      for (const look of StudioLooks.looks.map(l => l.id)) {
        StudioLooks.apply(look); await w(900);
        const tab = [...document.querySelectorAll('.look-tabbar button')].find(x => /solar/i.test(x.textContent));
        if (tab) tab.click();
        const rail = document.querySelector('.look-zone[data-flow="rail"] > [data-module="solar"] > .module-header');
        if (rail) rail.click();
        const drawer = document.querySelector('.look-zone[data-flow="drawer"]:has([data-module="solar"]) > .look-drawer-handle');
        if (drawer) drawer.click();
        await w(900);
        const s = window.modularApp.solarSystem, c = s.canvas, r = c.getBoundingClientRect();
        sizes[look] = [Math.round(r.width), Math.round(r.height)];
        if (Math.abs(c.width / (window.devicePixelRatio || 1) - r.width) > 2 || Math.abs(c.height / (window.devicePixelRatio || 1) - r.height) > 2) bad.push(look + ': buffer ' + c.width + 'x' + c.height + ' in a ' + r.width + 'x' + r.height + ' box');
        if (r.width < 280 || r.height < 200) bad.push(look + ': only ' + r.width + 'x' + r.height);
        const radii = s.state.planets.map(p => p.orbitRadius);
        if (new Set(radii.map(Math.round)).size !== s.state.notes.length) bad.push(look + ': rings ' + radii.map(Math.round));
        if (radii.some((v, i) => i && v <= radii[i - 1])) bad.push(look + ': rings do not widen ' + radii.map(Math.round));
        const outer = Math.max(...radii);
        if (outer > r.width / 2 || outer * s.geo.flatten > r.height / 2) bad.push(look + ': outer ring leaves the box');
        if (document.getElementById('solar-controls').offsetHeight > 34) bad.push(look + ': the bar wrapped');
        const pt = s.planetPoint('D');
        c.dispatchEvent(new MouseEvent('click', { clientX: pt.x, clientY: pt.y, bubbles: true }));
        await w(1000);
        if (s.state.focusPlanet !== 'D' || s.cam.z < 1.3) bad.push(look + ': no move in on D, zoom ' + s.cam.z);
        const five = s.moonPanel.querySelector('[data-idx="4"]');
        if (s.moonPanel.hidden || !five || !/5\\s*A7/.test(five.textContent.replace(/\\s+/g, ' '))) bad.push(look + ': the 5 moon reads ' + (five && five.textContent));
        const after = s.planetPoint('D');
        c.dispatchEvent(new MouseEvent('click', { clientX: after.x, clientY: after.y, bubbles: true }));
        await w(800);
        if (s.state.focusPlanet || s.state.expandedPlanets.length || s.cam.z !== 1) bad.push(look + ': did not come back out');
        if (drawer) drawer.click();
      }
      return { bad, sizes };
    })()""")
    return {'ok': not res['bad'], 'detail': res}


def chk_circle_in_every_look(b):
    """In every look: nothing is cut off or scrolled sideways, the drawing is crisp
    for its box and the whole circle fits in it; clicking a wedge changes the key
    without rebuilding the module, and the relative-minor ring changes the scale."""
    res = b.cdp.js("""(async () => {
      const w = (ms) => new Promise(r => setTimeout(r, ms));
      const bad = [], sizes = {};
      const app = window.modularApp, c = app.scaleCircleExplorer;
      const hit = (x, y) => c.canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
      for (const look of StudioLooks.looks.map(l => l.id)) {
        app.scaleLibrary.setKeyAndScale('C', 'major');
        StudioLooks.apply(look); await w(900);
        const tab = [...document.querySelectorAll('.look-tabbar button')].find(x => /circle/i.test(x.textContent));
        if (tab) tab.click();
        const rail = document.querySelector('.look-zone[data-flow="rail"] > [data-module="circle"] > .module-header');
        if (rail) rail.click();
        const drawer = document.querySelector('.look-zone[data-flow="drawer"]:has([data-module="circle"]) > .look-drawer-handle');
        if (drawer) drawer.click();
        await w(900);
        const cv = c.canvas, r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
        const body = cv.closest('.module-content');
        sizes[look] = [Math.round(r.width), Math.round(r.height)];
        if (Math.abs(cv.width - r.width * dpr) > 2 || Math.abs(cv.height - r.height * dpr) > 2) bad.push(look + ': buffer ' + cv.width + 'x' + cv.height + ' in a ' + r.width + 'x' + r.height + ' box');
        if (body.scrollWidth > body.clientWidth + 1) bad.push(look + ': sideways ' + body.scrollWidth + ' in ' + body.clientWidth);
        if (r.width < 200 || r.height < 200) bad.push(look + ': only ' + r.width + 'x' + r.height);
        const g = c.currentLayout();
        if (g.cx - g.R < -1 || g.cy - g.R < -1 || g.cx + g.R > g.W + 1 || g.cy + g.R > g.H + 1) bad.push(look + ': circle leaves its box');
        cv.scrollIntoView({ block: 'center' }); await w(150);
        const node = cv, pt = c.keyPoint('G');
        hit(pt.x, pt.y); await w(500);
        if (c.state.currentKey !== 'G' || app.scaleLibrary.getCurrentKey() !== 'G') bad.push(look + ': clicking G gave ' + c.state.currentKey);
        if (document.getElementById('circle-canvas') !== node) bad.push(look + ': the key change rebuilt the module');
        const g2 = c.currentLayout(), r2 = c.canvas.getBoundingClientRect(), p = c.polar(g2, 0, (g2.r1 + g2.r2) / 2);
        hit(r2.left + p.x, r2.top + p.y); await w(500);
        if (c.state.currentKey !== 'A' || app.scaleLibrary.getCurrentScale() !== 'aeolian') bad.push(look + ': the Am wedge gave ' + c.state.currentKey + ' ' + app.scaleLibrary.getCurrentScale());
        if (c.scaleSignatureText() !== 'no ♯ or ♭') bad.push(look + ': A aeolian reads ' + c.scaleSignatureText());
        if (drawer) drawer.click();
      }
      app.scaleLibrary.setKeyAndScale('C', 'major');
      return { bad, sizes };
    })()""")
    return {'ok': not res['bad'], 'detail': res}


CHECKS.update({
    'circle: fits every look, whole and crisp, and its wedges change the key': ({'music-theory-look': 'og'}, True, chk_circle_in_every_look),
})

CHECKS.update({
    'solar: every note its own ring and every moon its number, in every look': ({'music-theory-look': 'og'}, True, chk_solar_rings_in_every_look),
})

CHECKS.update({
    'course: the keyboard chip is only in the lessons played on it, and never on a Learn page': ({'music-theory-look': 'og'}, True, chk_course_keys_chip),
    'course: levels switch the lessons; tools stand apart and all show': ({'music-theory-look': 'og'}, False, chk_course_landing),
    'course: a lesson lays out its modules, and leaving puts the look back': ({'music-theory-look': 'og'}, True, chk_course_lesson_roundtrip),
    "course: a lesson gives its own tools the room, and shows no others": ({'music-theory-look': 'og'}, True, chk_course_lessons_roomy),
    'course: steps tick from either voicing menu, quizzes pass on the right answer, progress is kept by id': ({'music-theory-look': 'og'}, True, chk_course_checks_and_progress),
    "course: a module's Learn chip lists its lessons (and OG has none)": ({'music-theory-look': 'og'}, True, chk_course_chips),
    'course: every step points at its control on screen, and "Do it" ticks it': ({'music-theory-look': 'og'}, True, chk_course_steps_point),
})


# ---------------------------------------------------------------- scale picker
PICKER_OPEN = """(async () => { document.getElementById('scale-picker-btn').click(); await new Promise(r => setTimeout(r, 400)); return true; })()"""


def chk_picker_families(b):
    """The family tree keeps the user's families, each broken down by its own system, with the names a family uses."""
    b.cdp.js(PICKER_OPEN)
    res = b.cdp.js(r"""(() => {
      const t = modularApp.scaleLibrary.getTaxonomyMeta();
      const fams = [...document.querySelectorAll('#scale-pyramid-tree .pyramid-node')].map(n => n.firstChild.textContent.trim());
      const open = (name) => { const n = [...document.querySelectorAll('#scale-pyramid-tree .pyramid-node')].find(x => x.firstChild.textContent.trim() === name);
        const m = n && n.querySelector('.pyramid-submenu'); if (m) m.style.display = 'block'; return m; };
      const carn = open('Indian Classical: Carnatic (Melakarta)');
      const heads = carn ? [...carn.querySelectorAll(':scope > .nested-category-box > .nested-category-header')].map(h => h.textContent.trim().replace(/\s+/g, ' ')) : [];
      const firstRows = carn ? [...carn.querySelectorAll('.scale-item')].slice(0, 3).map(e => e.textContent.trim()) : [];
      const blues = t.byFamily['Blues Roots & Blue-Notes'];
      const bluesCount = blues ? Object.values(blues.categories).reduce((n, c) => n + Object.values(c.subcategories).reduce((m, s) => m + Object.values(s.subSubcategories).reduce((k, l) => k + l.length, 0), 0), 0) : 0;
      return { fams, heads: heads.slice(0, 3), firstRows, bluesCount, americas: fams.includes('South & Central American Traditions'),
               tabs: [...document.querySelectorAll('.scale-view-tab')].map(x => x.dataset.view),
               note: (document.querySelector('.scale-picker-note') || {}).textContent || '' };
    })()""")
    ok = (res['fams'][:1] == ['MAJOR'] and 'Indian Classical: Carnatic (Melakarta)' in res['fams']
          and bool(res['heads']) and res['heads'][0].startswith('The 72 Melakarta :: Indu chakra (1–6)')
          and bool(res['firstRows']) and res['firstRows'][0].startswith('1 Kanak')
          and 0 < res['bluesCount'] < 80 and not res['americas']
          and res['tabs'] == ['tree', 'special', 'major', 'minor'] and 'approximation' in res['note'])
    return {'ok': ok, 'detail': res}


def chk_picker_distance_views(b):
    """From Major and From Minor list every scale by what changed, Lydian under "adds ♯4"."""
    b.cdp.js(PICKER_OPEN)
    res = b.cdp.js(r"""(async () => {
      document.querySelector('.scale-view-tab[data-view=major]').click(); await new Promise(r => setTimeout(r, 300));
      const v = document.getElementById('scale-distance-view');
      const heads = [...v.querySelectorAll(':scope > .nested-category-box > .nested-category-header')].map(h => h.textContent.trim().replace(/\s+/g, ' '));
      const one = [...v.querySelectorAll('.nested-category-header')].find(h => /^1 note changed/.test(h.textContent.trim()));
      one.click(); await new Promise(r => setTimeout(r, 100));
      const sharp4 = [...v.querySelectorAll('.nested-category-header')].find(h => /adds ♯4/.test(h.textContent));
      sharp4.click(); await new Promise(r => setTimeout(r, 100));
      const rows = [...sharp4.nextElementSibling.querySelectorAll('.scale-item')].map(e => e.textContent.trim());
      const width = v.querySelector(':scope > .nested-category-box').getBoundingClientRect().width;
      document.querySelector('.scale-view-tab[data-view=minor]').click(); await new Promise(r => setTimeout(r, 300));
      const minorHeads = [...v.querySelectorAll(':scope > .nested-category-box > .nested-category-header')].map(h => h.textContent.trim().replace(/\s+/g, ' '));
      return { heads: heads.slice(0, 3), rows: rows.slice(0, 3), width, minorHeads: minorHeads.slice(0, 2), shown: getComputedStyle(v).display };
    })()""")
    ok = (len(res['heads']) > 1 and res['heads'][1].startswith('1 note changed (30)')
          and res['rows'][:1] == ['Lydian'] and res['width'] > 400 and res['shown'] == 'block'
          and len(res['minorHeads']) > 1 and res['minorHeads'][1].startswith('1 note changed (30)'))
    return {'ok': ok, 'detail': res}


def chk_picker_search(b):
    """Search finds every name a scale answers to, whatever the spelling, says what matched, and clears cleanly."""
    b.cdp.js(PICKER_OPEN)
    res = b.cdp.js("""(async () => {
      const i = document.getElementById('scale-search-input');
      const type = async (q) => { i.value = q; i.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 250));
        const r = document.getElementById('scale-search-results');
        return { summary: (r.querySelector('.scale-search-summary') || {}).textContent || '', rows: [...r.querySelectorAll('.scale-item')].slice(0, 4).map(e => e.textContent.trim()),
                 titles: [...r.querySelectorAll('.scale-item')].slice(0, 2).map(e => e.title), tree: document.getElementById('scale-pyramid-tree').style.display }; };
      const out = {};
      out.kafi = await type('kafi');
      out.raga = await type('raga bhim');
      out.ragaOnly = await type('raga');
      out.b6 = await type('mixolydian b6');
      out.flat = await type('Mixolydian ♭6');
      out.altered = await type('altered');
      out.none = await type('xyzzy');
      await type('');
      out.cleared = { results: document.getElementById('scale-search-results').style.display, tree: document.getElementById('scale-pyramid-tree').style.display };
      await type('kafi');
      document.querySelector('#scale-search-results .scale-item').click(); await new Promise(r => setTimeout(r, 200));
      out.picked = { scale: modularApp.scaleLibrary.state.currentScale, modal: document.getElementById('scale-picker-modal').style.display, input: i.value };
      return out;
    })()""")
    k = res['kafi']; r = res['raga']; b6 = res['b6']; fl = res['flat']; al = res['altered']; no = res['none']; cl = res['cleared']; pk = res['picked']
    ragaText = ' '.join(r['rows'])
    ok = (bool(k['rows']) and 'Dorian' in k['rows'][0] and 'matched: ' in (k['titles'][0] or '') and k['tree'] == 'none'
          and ('Bhimpalasi' in ragaText or 'Bheempalasi' in ragaText)
          and res['ragaOnly']['summary'].split(' ')[0].isdigit() and int(res['ragaOnly']['summary'].split(' ')[0]) > 200
          and b6['rows'][:1] == ['Mixolydian ♭6'] and fl['rows'][:1] == ['Mixolydian ♭6']
          and al['summary'].startswith('2') and no['summary'].startswith('No scale has a name containing')
          and cl == {'results': 'none', 'tree': 'block'}
          and pk['scale'] == 'dorian' and pk['modal'] == 'none' and pk['input'] == '')
    return {'ok': ok, 'detail': res}


CHECKS.update({
    'picker: the families are the user\'s, broken down by their own systems, with the family\'s own names': ({'music-theory-look': 'og'}, True, chk_picker_families),
    'picker: From Major and From Minor step outward from the scale you know': ({'music-theory-look': 'og'}, True, chk_picker_distance_views),
    'picker: search finds any name in any spelling, says what matched, and clears': ({'music-theory-look': 'og'}, True, chk_picker_search),
})


# ---------------------------------------------------------------- guitar tuning
TUNING_READ = """(() => {
  const neck = [0, 1, 2, 3, 4, 5].map(s =>
    +modularApp.guitarFretboard.gridEl.querySelector('.fret-cell[data-string-index="' + s + '"][data-fret="0"]').dataset.midi);
  return { neck, neck5: +modularApp.guitarFretboard.gridEl.querySelector('.fret-cell[data-string-index="0"][data-fret="5"]').dataset.midi,
           selects: [...document.querySelectorAll('.gt-select')].map(s => s.value),
           stored: localStorage.getItem('music-theory-guitar-tuning') };
})()"""


def chk_tuning_dock_syncs(b):
    """The docked dropdown retunes the neck, a chord shape, every other dropdown, and survives a reload."""
    res = b.cdp.js("""(async () => {
      const app = modularApp, gf = app.guitarFretboard;
      const dock = document.querySelector('#instrument-dock-root .instrument-dock-settings .gt-select');
      const out = { dockShown: !!dock && dock.getClientRects().length > 0 };
      gf.midiChordOn([48, 52, 55]);
      dock.value = 'drop-d';
      dock.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      out.heldLetGo = gf._held.size === 0;
      out.open = [...gf.gridEl.querySelectorAll('.fret-cell[data-fret="0"]')].map(c => +c.dataset.midi).sort((a, b) => a - b);
      gf.midiNoteOn(38);                       // only reachable with the 6th string dropped
      out.lowD = gf._held.get(38) || null;
      gf.clearMidiNotes();
      return out;
    })()""")
    r1 = b.cdp.js(TUNING_READ)
    b.cdp.call('Page.reload')
    b.cdp.js(WAIT_READY)
    r2 = b.cdp.js(TUNING_READ)
    ok = (res['dockShown'] and res['heldLetGo'] and res['open'][0] == 38 and res['lowD'] and res['lowD']['string'] == 0
          and res['lowD']['fret'] == 0 and r1['neck'][0] == 38 and r1['neck5'] == 43 and len(set(r1['selects'])) == 1
          and len(r1['selects']) >= 3 and r1['selects'][0] == 'drop-d' and r2['neck'][0] == 38 and r2['selects'][0] == 'drop-d')
    return {'ok': ok, 'detail': {'res': res, 'after': r1, 'reloaded': r2}}


def chk_tuning_typed(b):
    """A typed tuning: real keys, no notes played, a half-typed one changes nothing."""
    b.cdp.js("""(async () => {
      const sel = document.querySelector('#instrument-dock-root .instrument-dock-settings .gt-select');
      sel.value = 'custom';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      const box = sel.parentElement.querySelector('.gt-custom');
      box.focus(); box.value = ''; box.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()""")
    for ch in 'dadf':
        b.cdp.call('Input.insertText', text=ch)
    mid = b.cdp.js("""(() => { const box = document.activeElement; return { cls: box.className,
       midi: GuitarTuning.midi(), played: modularApp.pianoVisualizer._activeMidiSet ? modularApp.pianoVisualizer._activeMidiSet.size : 0 }; })()""")
    for ch in '#ad':
        b.cdp.call('Input.insertText', text=ch)
    done = b.cdp.js("""(async () => {
      const box = document.activeElement;
      const out = { focused: box.classList.contains('gt-custom'), midi: GuitarTuning.midi(), id: GuitarTuning.current().id,
                    bad: box.classList.contains('gt-bad'), others: [...document.querySelectorAll('.gt-select')].map(s => s.value) };
      box.value = 'nonsense'; box.dispatchEvent(new Event('input', { bubbles: true }));
      out.badNow = box.classList.contains('gt-bad');
      box.blur();
      await new Promise(r => setTimeout(r, 30));
      out.restored = box.value;
      out.midiAfter = GuitarTuning.midi();
      return out;
    })()""")
    ok = ('gt-bad' in mid['cls'] and mid['midi'][0] == 40 and mid['played'] == 0 and done['focused']
          and done['midi'] == [38, 45, 50, 54, 57, 62] and done['id'] == 'custom' and not done['bad']
          and set(done['others']) == {'custom'} and done['badNow'] and done['restored'] == 'dadf#ad'
          and done['midiAfter'] == [38, 45, 50, 54, 57, 62])
    return {'ok': ok, 'detail': {'mid': mid, 'done': done}}


def chk_tuning_learn_notes(b):
    """Learn Notes: the words, the demos and a clicked fret all follow the tuning, from the course's own lesson."""
    res = b.cdp.js("""(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      moduleSelector.selectInstrument('guitar');
      const landing = document.querySelector('#course-tuning .gt-select');
      const out = { landingShown: !!landing && landing.getClientRects().length > 0 };
      Course.start('b-notes');
      await sleep(1500);
      const page = document.getElementById('learn-guitar-page');
      out.pageShown = page.getClientRects().length > 0;
      const lgn = window._learnGuitarInstance;
      const cards = () => page.querySelector('.lgn-right').textContent.replace(/\\s+/g, ' ');
      const readout = () => document.getElementById('lgn-readout').textContent;
      const clickDemo = async (d) => { page.querySelector('[data-demo="' + d + '"]').click(); await sleep(60); return readout(); };
      const lit = () => [...lgn._posMarks.keys()];
      out.std = { cards: cards(), welcome: readout() };

      // landing and page show one setting
      landing.value = 'dadgad'; landing.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(100);
      out.dadgad = { pageSelect: page.querySelector('#lgn-tuning .gt-select').value, cards: cards(), welcome: readout(), open: await clickDemo('open'),
                     bc: await clickDemo('bc'), up: await clickDemo('up'), fifth: await clickDemo('fifth') };
      lgn._stopAll();

      // Open G, every note demo must land on the note it says
      const hear = async (d) => {
        const played = []; const real = lgn._play; lgn._play = (m) => { played.push(m); };
        page.querySelector('[data-demo="' + d + '"]').click();
        await sleep(1400);
        lgn._play = real;
        return played;
      };
      GuitarTuning.select('open-g');
      await sleep(60);
      out.openG = { sharp: await hear('sharp'), flat: await hear('flat'), bc: await hear('bc'), fifth: await hear('fifth'), cards: cards() };

      // E flat: the open string reads as the tuning names it, on neck and in words
      GuitarTuning.select('e-flat');
      await sleep(60);
      out.eFlat = { label: lgn._cell(0, 0).querySelector('.fret-label').textContent, up: await clickDemo('up'), cards: cards() };
      lgn._stopAll();

      // a clicked fret is named and sounded for this tuning
      GuitarTuning.type('C G D G B D');
      await sleep(60);
      lgn._cell(0, 3).click();
      await sleep(60);
      out.typed = readout();
      GuitarTuning.select('standard');
      await sleep(60);
      out.back = cards();
      return out;
    })()""")
    d, g, e = res['dadgad'], res['openG'], res['eFlat']
    pcs = lambda ms: [m % 12 for m in ms]
    ok = (res['landingShown'] and res['pageShown']
          and 'E A D G B E' in res['std']['cards'] and 'Eddie' in res['std']['cards']
          and 'Both outside strings are E, two octaves apart' in res['std']['cards']
          and 'except on the G string, where it is the 4th fret' in res['std']['cards']
          and 'thin high E string' in res['std']['welcome'] and '5th fret of low E = open A' in res['std']['cards']
          and d['pageSelect'] == 'dadgad' and 'D A D G A D' in d['cards'] and 'Eddie' not in d['cards']
          and 'thin high D string' in d['welcome'] and 'D A D G A D' in d['open']
          and 'on the low A string' in d['bc'] and 'open low D' in d['up'] and '7th fret of low D = open A' in d['cards']
          and pcs(g['sharp']) == [5, 6] and pcs(g['flat']) == [7, 6] and pcs(g['bc']) == [11, 0]
          and g['fifth'][0] == g['fifth'][1]
          and 'E♭' in e['label'] and 'E♭ → E' in e['up'] and 'Every string is 1 half step lower' in e['cards']
          and 'fret 3' in res['typed'] and res['typed'].startswith('D♯')
          and res['back'] == res['std']['cards'])
    return {'ok': ok, 'detail': res}


def chk_tuning_learn_scales(b):
    """Learn Scales' neck has the dropdown and the shared tuning."""
    res = b.cdp.js("""(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      moduleSelector.selectInstrument('guitar');
      GuitarTuning.select('open-d');
      Course.start('b-scales');
      await sleep(1800);
      const host = document.querySelector('#piano-learn-scales-container');
      const inst = window.learnScales || window.learnScalesInstance || null;
      const open = host ? [...host.querySelectorAll('.fret-cell[data-fret="0"]')].map(c => +c.dataset.midi).sort((a, b) => a - b) : null;
      const sel = host && host.querySelector('.gt-select');
      const out = { open, select: sel && sel.value, shown: !!sel && sel.getClientRects().length > 0 };
      GuitarTuning.select('standard');
      await sleep(80);
      out.after = host ? [...host.querySelectorAll('.fret-cell[data-fret="0"]')].map(c => +c.dataset.midi).sort((a, b) => a - b) : null;
      return out;
    })()""")
    ok = (res['open'] == [38, 45, 50, 54, 57, 62] and res['select'] == 'open-d' and res['shown']
          and res['after'] == [40, 45, 50, 55, 59, 64])
    return {'ok': ok, 'detail': res}


def chk_tuning_every_neck(b):
    """Whichever instruments the dock shows: a neck on screen has a whole, clickable dropdown on screen."""
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const seen = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        let L = r.left, R = r.right, T = r.top, B = r.bottom;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const st = getComputedStyle(p);
          if (st.display === 'none' || st.visibility === 'hidden') return null;
          if (/(hidden|auto|scroll|clip)/.test(st.overflowX + st.overflowY)) {
            const q = p.getBoundingClientRect();
            L = Math.max(L, q.left); R = Math.min(R, q.right); T = Math.max(T, q.top); B = Math.min(B, q.bottom);
          }
        }
        R = Math.min(R, innerWidth); B = Math.min(B, innerHeight);
        const w = R - L, h = B - T;
        if (w <= 0 || h <= 0) return null;
        const top = document.elementFromPoint((L + R) / 2, (T + B) / 2);
        return { w: Math.round(w), h: Math.round(h), whole: w >= r.width - 1 && h >= r.height - 1, hit: top === el || el.contains(top) };
      };
      const gf = modularApp.guitarFretboard, bad = [], looked = [];
      const p = document.getElementById('instrument-dock-show-piano'), g = document.getElementById('instrument-dock-show-guitar');
      for (const [pi, gu] of [[true, true], [false, true], [true, false]]) {
        if (p.checked !== pi) p.click();
        if (g.checked !== gu) g.click();
        await wait(250);
        for (const l of StudioLooks.looks) {
          StudioLooks.apply(l.id);
          await wait(600);
          // an ordinary visitor scrolls to a neck in a module: put it in view as they would
          if (gf.element && gf.element.getBoundingClientRect().width) gf.element.scrollIntoView({ block: 'start', inline: 'start' });
          await wait(80);
          const neck = seen(gf.gridEl);
          if (!neck || neck.h < 40) { looked.push(l.id + ':no neck in view'); continue; }
          const docked = !!(gf.element && gf.element.closest('#guitar-dock-container'));
          const sel = docked ? document.querySelector('.instrument-dock-settings .gt-select') : gf._tuningEl && gf._tuningEl.querySelector('select');
          const c = seen(sel);
          looked.push(l.id + ':' + (docked ? 'dock' : 'module'));
          if (!c || !c.whole || !c.hit) bad.push({ look: l.id, pi, gu, docked, neck, select: c });
        }
      }
      if (!p.checked) p.click();
      if (!g.checked) g.click();
      return { bad, looked: looked.length, modules: looked.filter(x => x.endsWith('module')).length };
    })()""")
    return {'ok': not res['bad'] and res['modules'] > 0, 'detail': res}


OPEN_COURSE_PAGE = """(async (title) => {
  const card = [...document.querySelectorAll('#course-path button, #course-path a, #course-path [role=button]')]
    .find(e => (e.innerText || '').trim().startsWith(title));
  if (!card) return false;
  card.click();
  await new Promise(r => setTimeout(r, 1500));
  return true;
})"""


def chk_tuning_chord_necks(b):
    res = {}
    for title, page in (('Chords from intervals', 'learn-chords-page'), ('Inversions', 'learn-inversions-page')):
        ok = b.cdp.js(OPEN_COURSE_PAGE + f"({json.dumps(title)})")
        res[page] = b.cdp.js("""(async (page) => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const el = document.getElementById(page), panel = el.querySelector('.lc-neck');
          if (!panel) return { panel: false };
          const heldCells = () => [...panel.querySelectorAll('.fret-cell')]
            .filter(c => c.style.boxShadow.includes('34, 211, 238')).map(c => c.dataset.stringIndex + ':' + c.dataset.fret + '=' + c.dataset.midi).sort();
          const before = heldCells(), sel = panel.querySelector('.gt-select');
          sel.value = 'open-g'; sel.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(150);
          const after = heldCells();
          const midis = c => c.map(x => +x.split('=')[1]).sort((a, b) => a - b).join();
          GuitarTuning.select('standard');
          await wait(100);
          return { panel: true, width: Math.round(panel.getBoundingClientRect().width), before, after, sameNotes: midis(before) === midis(after),
                   moved: before.join() !== after.join(), selShown: sel.getClientRects().length > 0 };
        })""" + f"({json.dumps(page)})")
        res[page]['opened'] = ok
        b.cdp.js("window.showAppPage('landing-page')")
    inv = b.cdp.js("""(async () => {
      const panel = document.querySelector('#learn-inversions-page .lc-neck');
      window.showAppPage('learn-inversions-page');
      const app = window.learnInversionsApp;
      app.rootNote = 'C'; app.rootMidi = 60; app.quality = 'min'; app.inversion = 0; app.updateVisualization();
      await new Promise(r => setTimeout(r, 200));
      const names = [...panel.querySelectorAll('.fret-cell')].filter(c => c.style.boxShadow.includes('34, 211, 238')).map(c => c.querySelector('.fret-label').textContent);
      window.showAppPage('landing-page');
      return names;
    })()""")
    res['c minor names'] = inv
    ok = all(res[p].get('panel') and res[p].get('opened') and len(res[p]['before']) == 3 and res[p]['sameNotes'] and res[p]['moved'] and res[p]['selShown']
             for p in ('learn-chords-page', 'learn-inversions-page')) and 'E♭' in inv and 'D#' not in inv
    errs = (b.cdp.errors or [])[:6]
    return {'ok': ok and not errs, 'detail': {**res, 'errors': errs}}


def chk_tuning_piano_no_neck(b):
    res = {}
    for title, page in (('Chords from intervals', 'learn-chords-page'), ('Inversions', 'learn-inversions-page')):
        b.cdp.js(OPEN_COURSE_PAGE + f"({json.dumps(title)})")
        res[page] = b.cdp.js(f"""({{ neck: !!document.querySelector('#{page} .lc-neck'), shown: document.getElementById('{page}').style.display, text: document.getElementById('{page}').innerText.length }})""")
        b.cdp.js("window.showAppPage('landing-page')")
    errs = (b.cdp.errors or [])[:6]
    ok = all(not res[p]['neck'] and res[p]['shown'] == 'block' and res[p]['text'] > 100 for p in res) and not errs
    return {'ok': ok, 'detail': {**res, 'errors': errs}}


def chk_tuning_practice(b):
    b.cdp.js(OPEN_COURSE_PAGE + "('Notes on your instrument')")
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const L = window._learnGuitarInstance, page = document.getElementById('learn-guitar-page');
      page.querySelector('#lgn-practice').click();
      const cell = () => L._cellsFor(L._p.target.pc)[0];
      const c = cell(), first = L._p.target.pc;
      L._onPick(+c.dataset.stringIndex, +c.dataset.fret);
      const busy = L._p.busy;
      GuitarTuning.select('dadgad');
      await wait(100);
      const out = { busy, stillBusy: L._p.busy, prompt: page.querySelector('#lgn-prompt').innerText.slice(0, 60) };
      const again = cell();
      L._onPick(+again.dataset.stringIndex, +again.dataset.fret);
      out.answered = L._p.total;
      page.querySelector('#lgn-practice').click();
      GuitarTuning.select('standard');
      return out;
    })()""")
    ok = res['busy'] and not res['stillBusy'] and res['answered'] == 2 and res['prompt'].startswith('Find')
    return {'ok': ok, 'detail': res}


def chk_tuning_scales_neck(b):
    b.cdp.js(OPEN_COURSE_PAGE + "('Scales')")
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const g = window.learnScalesInstance._localGuitar, calls = [];
      const e = g.options.audioEngine;
      if (!e) return { engine: false };
      const orig = e.playNote; e.playNote = m => { calls.push(m); return 0; };
      const sel = g.element.querySelector('.gt-select');
      const above = sel.getBoundingClientRect().bottom <= g.gridEl.getBoundingClientRect().top + 1;
      GuitarTuning.select('drop-d');
      await wait(100);
      g.gridEl.querySelector('.fret-cell[data-string-index="0"][data-fret="2"]').click();
      await wait(100);
      e.playNote = orig;
      GuitarTuning.select('standard');
      return { engine: true, above, calls };
    })()""")
    return {'ok': res.get('engine') and res['above'] and 40 in res['calls'], 'detail': res}


GUITAR_CHOSEN = {'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'guitar'}


def chk_guitar_all_scale_lessons(b):
    b.cdp.js(OPEN_COURSE_PAGE + "('Scales')")
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const L = window.learnScalesInstance, page = document.getElementById('learn-scales-page'), out = [], bad = [];
      for (let i = 0; i < L.lessons.length; i++) {
        L.currentLesson = i; L.render();
        await wait(250);
        const box = page.querySelector('#piano-learn-scales-container');
        const row = { lesson: i + 1, cells: box.querySelectorAll('.fret-cell').length, keys: box.querySelectorAll('.piano-key, .piano-white-key, .piano-black-key').length,
                      label: page.querySelector('#instrument-label').innerText.trim(),
                      words: (document.getElementById('lesson-content').innerText.match(/piano|white key|black key|keyboard/ig) || []) };
        out.push(row);
        if (!row.cells || row.keys || !/guitar/i.test(row.label) || row.words.length) bad.push(row);
      }
      return { bad, lessons: out.length };
    })()""")
    errs = (b.cdp.errors or [])[:6]
    return {'ok': not res['bad'] and res['lessons'] >= 9 and not errs, 'detail': {**res, 'errors': errs}}


def chk_guitar_quiz(b):
    b.cdp.js(OPEN_COURSE_PAGE + "('Scales')")
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const L = window.learnScalesInstance, out = {};
      L.currentLesson = L.lessons.findIndex(l => /quiz/i.test(l.title)); L.render();
      await wait(300);
      const box = document.querySelector('#piano-learn-scales-container');
      const scaleLit = [...box.querySelectorAll('.fret-cell')].filter(c => /16, 185, 129/.test(c.style.background)).length;
      out.onNeck = box.querySelectorAll('.fret-cell').length > 0;
      out.scaleLit = scaleLit;
      out.how = document.getElementById('quiz-how').innerText;
      const click = m => L.neckCell(m).click();
      const G = [55, 57, 59, 60, 62, 64, 66, 67];
      for (const m of G) { click(m); await wait(200); }
      out.marked = box.querySelectorAll('.fret-cell.quiz-picked').length;
      out.chips = document.querySelectorAll('.quiz-chip').length;
      // the same pitch in another place on the neck moves the pick; it does not take it back
      const other = [...box.querySelectorAll('.fret-cell[data-midi="60"]')].find(c => !c.classList.contains('quiz-picked'));
      if (other) { other.click(); await wait(200); }
      out.afterMove = { chips: document.querySelectorAll('.quiz-chip').length, there: !!other && other.classList.contains('quiz-picked'), marked: box.querySelectorAll('.fret-cell.quiz-picked').length };
      GuitarTuning.select('dadgad');
      await wait(150);
      out.afterRetune = { chips: document.querySelectorAll('.quiz-chip').length, marked: box.querySelectorAll('.fret-cell.quiz-picked').length,
                          right: [...box.querySelectorAll('.fret-cell.quiz-picked')].map(c => +c.dataset.midi).sort((a, b) => a - b).join() };
      GuitarTuning.select('standard');
      await wait(150);
      // a switch of instrument keeps the work, and the words and the landing page follow
      document.getElementById('change-instrument-btn').click();
      await wait(500);
      out.toPiano = { chips: document.querySelectorAll('.quiz-chip').length, keys: box.querySelectorAll('.piano-white-key, .piano-key').length > 0, how: document.getElementById('quiz-how').innerText.slice(0, 24),
                      landing: document.getElementById('instrument-select').value };
      document.getElementById('change-instrument-btn').click();
      await wait(500);
      out.back = { chips: document.querySelectorAll('.quiz-chip').length, cells: box.querySelectorAll('.fret-cell').length > 0, landing: document.getElementById('instrument-select').value };
      document.getElementById('quiz-check').click();
      await wait(100);
      out.feedback = document.getElementById('quiz-feedback').innerText.slice(0, 60);
      return out;
    })()""")
    want = '55,57,59,60,62,64,66,67'
    ok = (res['onNeck'] and res['scaleLit'] == 0 and 'neck' in res['how'] and res['marked'] == 8 and res['chips'] == 8
          and res['afterMove']['chips'] == 8 and res['afterMove']['there'] and res['afterMove']['marked'] == 8
          and res['afterRetune']['chips'] == 8 and res['afterRetune']['marked'] == 8 and res['afterRetune']['right'] == want
          and res['toPiano']['chips'] == 8 and res['toPiano']['keys'] and 'piano' in res['toPiano']['how'] and res['toPiano']['landing'] == 'piano'
          and res['back']['chips'] == 8 and res['back']['cells'] and res['back']['landing'] == 'guitar' and 'Perfect' in res['feedback'])
    errs = (b.cdp.errors or [])[:6]
    return {'ok': ok and not errs, 'detail': {**res, 'errors': errs}}


def chk_guitar_no_piano_pages(b):
    res = {}
    for title, page in (('Chords from intervals', 'learn-chords-page'), ('Inversions', 'learn-inversions-page')):
        b.cdp.js(OPEN_COURSE_PAGE + f"({json.dumps(title)})")
        res[page] = b.cdp.js(f"""(() => {{
          const el = document.getElementById('{page}');
          return {{ keys: el.querySelectorAll('.inv-piano-key, .inv-mini-key, [class^="key-piano-"]').length,
                    necks: el.querySelectorAll('.lc-neck .fret-cell').length, boxes: el.querySelectorAll('.lc-chord-box').length, strings: el.querySelectorAll('.lc-string').length,
                    icon: el.querySelector('.lc-title').innerText.includes('🎸'),
                    words: (el.innerText.match(/on the piano|keyboard\b(?! on)|right hand example/ig) || []) }}; }})()""")
        b.cdp.js("window.showAppPage('landing-page')")
    c, i = res['learn-chords-page'], res['learn-inversions-page']
    errs = (b.cdp.errors or [])[:6]
    ok = c['keys'] == 0 and c['necks'] > 0 and c['strings'] >= 3 and c['icon'] and i['keys'] == 0 and i['necks'] > 0 and i['boxes'] == 3 and i['icon'] and not errs
    return {'ok': ok, 'detail': {**res, 'errors': errs}}


def chk_guitar_studio_lesson(b):
    res = b.cdp.js("""(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const dock = document.getElementById('instrument-dock-root');
      const out = { before: dock.className };
      CourseRunner.start('i-bebop-major');
      await wait(1800);
      out.on = document.body.classList.contains('course-on');
      out.during = dock.className;
      const gf = modularApp.guitarFretboard, e = modularApp.guitarEngine, played = [];
      const orig = e.playNote; e.playNote = (m, o) => { played.push(m); return 0; };
      const hear = document.querySelector('.course-hear');
      out.hasHear = !!hear;
      if (hear) { hear.click(); await wait(700); }
      out.played = played.length;
      out.lit = (gf.state.focusNotes || []).length;
      e.playNote = orig;
      out.tuning = (s => !!s && s.getClientRects().length > 0)(document.querySelector('.instrument-dock-settings .gt-select'));
      out.fills = gf.gridEl.getBoundingClientRect().width / document.getElementById('guitar-dock-container').getBoundingClientRect().width;
      window.showAppPage('landing-page');
      await wait(400);
      out.after = dock.className;
      return out;
    })()""")
    on = res.get('on')
    ok = (on and 'dock-mode-guitar' in res['during'] and res['tuning'] and res['fills'] > 0.9 and 'dock-mode-guitar' not in res['after']
          and (not res['hasHear'] or (res['played'] > 0 and res['lit'] > 0)))
    return {'ok': ok, 'detail': res}


def chk_piano_quiz(b):
    b.cdp.js(OPEN_COURSE_PAGE + "('Scales')")
    res = b.cdp.js("""(async () => {
      const L = window.learnScalesInstance;
      L.currentLesson = L.lessons.findIndex(l => /quiz/i.test(l.title)); L.render();
      await new Promise(r => setTimeout(r, 400));
      const box = document.querySelector('#piano-learn-scales-container');
      const key = box.querySelector('[data-midi="67"]');
      key.click();
      await new Promise(r => setTimeout(r, 150));
      return { cells: box.querySelectorAll('.fret-cell').length, picked: box.querySelectorAll('.quiz-picked').length, chips: document.querySelectorAll('.quiz-chip').length, how: document.getElementById('quiz-how').innerText.slice(0, 20) };
    })()""")
    return {'ok': res['cells'] == 0 and res['picked'] == 1 and res['chips'] == 1 and 'piano' in res['how'], 'detail': res}


CHECKS.update({
    'guitar tuning: the dock dropdown retunes the neck and every dropdown, and survives a reload': ({'music-theory-look': 'og'}, True, chk_tuning_dock_syncs),
    'guitar tuning: a typed tuning takes effect when whole; half-typed changes nothing and plays nothing': ({'music-theory-look': 'og'}, True, chk_tuning_typed),
    'guitar tuning: the course lesson on notes recalculates its words and demos': ({'music-theory-look': 'og', 'music-theory-visited': 'true'}, False, chk_tuning_learn_notes),
    'guitar tuning: the Learn Scales neck follows it': ({'music-theory-look': 'og', 'music-theory-visited': 'true'}, False, chk_tuning_learn_scales),
    'guitar tuning: every neck in every look has a dropdown you can reach': ({'music-theory-look': 'og', 'music-theory-visited': 'true'}, True, chk_tuning_every_neck),
    'guitar tuning: with the guitar chosen, Learn Chords and Inversions show the chord on a neck that follows it': ({'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'guitar'}, False, chk_tuning_chord_necks),
    'the chosen guitar: every Learn Scales lesson stays on the neck, in its words too': (GUITAR_CHOSEN, False, chk_guitar_all_scale_lessons),
    'the chosen guitar: the build-a-scale quiz is played on the neck and survives a retune and a switch': (GUITAR_CHOSEN, False, chk_guitar_quiz),
    'the chosen guitar: Learn Chords and Inversions have no piano at all': (GUITAR_CHOSEN, False, chk_guitar_no_piano_pages),
    'the chosen guitar: a studio lesson docks it alone, lights it and sounds it, then gives the dock back': (GUITAR_CHOSEN, False, chk_guitar_studio_lesson),
    'the chosen piano: the build-a-scale quiz stays on the piano': ({'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'piano'}, False, chk_piano_quiz),
    'guitar tuning: with the piano chosen, Learn Chords and Inversions have no neck': ({'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'piano'}, False, chk_tuning_piano_no_neck),
    'guitar tuning: retuning just after an answer does not strand the notes practice': ({'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'guitar'}, False, chk_tuning_practice),
    'guitar tuning: the Learn Scales neck shows the dropdown above it and sounds the retuned pitch': ({'music-theory-look': 'og', 'music-theory-visited': 'true', 'music-theory-instrument': 'guitar'}, False, chk_tuning_scales_neck),
    'guitar tuning: Luthier has the dropdown on the neck, and no second one in the dock': ({'music-theory-look': 'luthier', 'music-theory-visited': 'true'}, True, """
      (() => {
        const shown = (el) => !!el && el.getClientRects().length > 0;
        const inBoard = document.querySelector('#guitar-fretboard-container .gt-select');
        const inDock = document.querySelector('#instrument-dock-root .instrument-dock-settings .gt-select');
        const board = document.querySelector('#guitar-fretboard-container .guitar-fretboard');
        const clipped = board && inBoard && inBoard.getBoundingClientRect().bottom > board.getBoundingClientRect().bottom + 1;
        return { ok: shown(inBoard) && !shown(inDock) && !clipped, detail: { inBoard: shown(inBoard), inDock: shown(inDock), clipped } };
      })()"""),
})


def run_checks(b, url, only, relaunch=None, shard=(0, 1)):
    fails = 0
    errors = []
    for i, (name, (storage, launch, js)) in enumerate(CHECKS.items()):
        if only and not any(o in name for o in only):
            continue
        if i % shard[1] != shard[0]:
            continue
        t0 = time.time()
        for attempt in (1, 2):
            try:
                fresh(b, url, storage)
                if launch:
                    b.cdp.js(LAUNCH)
                res = (js(b) if callable(js) else b.cdp.js(js)) or {}
                break
            except (EOFError, BrokenPipeError, ConnectionError, OSError) as e:
                # The browser itself went away: start a new one and try this check once more.
                res = {'ok': False, 'detail': f'browser lost: {e}'}
                if relaunch is None or attempt == 2:
                    break
                errors.extend(b.cdp.errors)
                b = relaunch(b)
            except Exception as e:
                res = {'ok': False, 'detail': f'error: {e}'}
                break
        ok = bool(res.get('ok'))
        fails += 0 if ok else 1
        dt = time.time() - t0
        print(f"  {'ok  ' if ok else 'FAIL'} {name}" + (f'   ({dt:.0f}s)' if dt >= 20 else '')
              + ('' if ok else f"\n       {json.dumps(res.get('detail'))}"))
    errors.extend(b.cdp.errors)
    if errors:
        print('\npage exceptions:')
        for e in sorted(set(map(str, errors)))[:12]:
            print('  ' + str(e).splitlines()[0])
    return fails


def run_shots(b, url, looks, out):
    os.makedirs(out, exist_ok=True)
    # visited: the first-launch tour offer would sit over every shot
    fresh(b, url, {'music-theory-look': 'og', 'music-theory-visited': 'true'})
    b.cdp.js(LAUNCH)
    print('generate:', b.cdp.js(GENERATE))
    ids = looks or b.cdp.js('StudioLooks.looks.map(l => l.id)')
    for lid in ids:
        b.cdp.js(f"(async () => {{ StudioLooks.apply({json.dumps(lid)}); await new Promise(r => setTimeout(r, 3200)); }})()")
        shot = b.cdp.call('Page.captureScreenshot', format='png')
        with open(os.path.join(out, f'{lid}.png'), 'wb') as f:
            f.write(base64.b64decode(shot['data']))
        print('  shot', lid)


def run_course(b, url, out):
    """The course: the landing page at each level, then every studio lesson as it opens."""
    os.makedirs(out, exist_ok=True)
    fresh(b, url, {'music-theory-look': 'og', 'music-theory-visited': 'true'})
    for lvl in ['beginner', 'intermediate', 'advanced']:
        b.cdp.js(f"""(async () => {{ document.querySelector('.skill-level-btn[data-level="{lvl}"]').click();
          document.getElementById('course-section').scrollIntoView(); await new Promise(r => setTimeout(r, 400)); }})()""")
        shot = b.cdp.call('Page.captureScreenshot', format='png')
        with open(os.path.join(out, f'landing-{lvl}.png'), 'wb') as f:
            f.write(base64.b64decode(shot['data']))
        print('  shot landing', lvl)
    for lid in b.cdp.js('Course.order'):
        b.cdp.js(f"(async () => {{ Course.start({json.dumps(lid)}); await new Promise(r => setTimeout(r, 2600)); }})()")
        shot = b.cdp.call('Page.captureScreenshot', format='png')
        with open(os.path.join(out, f'lesson-{lid}.png'), 'wb') as f:
            f.write(base64.b64decode(shot['data']))
        print('  shot lesson', lid)


GEOMETRY = """(async (id) => {
  StudioLooks.apply(id);
  await new Promise(r => setTimeout(r, 1600));
  const rect = el => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const out = { zones: {}, modules: {} };
  document.querySelectorAll('.workspace > .look-zone').forEach(z => {
    if (getComputedStyle(z).display === 'none') return;
    out.zones[z.dataset.zone] = { rect: rect(z), flow: z.dataset.flow || null, border: getComputedStyle(z).borderTopColor + ' ' + getComputedStyle(z).borderTopWidth };
  });
  document.querySelectorAll('[data-module]').forEach(m => {
    if (getComputedStyle(m).display === 'none' || !m.getClientRects().length) return;
    const body = m.querySelector(':scope > .module-content');
    out.modules[m.dataset.module] = { rect: rect(m), zone: (m.closest('.look-zone') || {dataset:{}}).dataset.zone || null,
                                      zoom: body ? (parseFloat(body.style.zoom) || 1) : 1 };
  });
  const ws = document.querySelector('.workspace');
  out.workspace = { rect: rect(ws), cols: getComputedStyle(ws).gridTemplateColumns, rows: getComputedStyle(ws).gridTemplateRows };
  return out;
})"""


def run_geometry(b, url, looks, out_path):
    """Every zone and module rectangle in every look: compare before and after a refactor."""
    fresh(b, url, {'music-theory-look': 'og', 'music-theory-visited': 'true'})
    b.cdp.js(LAUNCH)
    b.cdp.js(GENERATE)
    ids = looks or b.cdp.js('StudioLooks.looks.map(l => l.id)')
    result = {}
    for lid in ids:
        result[lid] = b.cdp.js(f'({GEOMETRY})({json.dumps(lid)})')
        print('  measured', lid)
    with open(out_path, 'w') as f:
        json.dump(result, f, indent=1, sort_keys=True)
    print('wrote', out_path)


def compare_geometry(a_path, b_path, tol=2):
    a, b = json.load(open(a_path)), json.load(open(b_path))
    diffs = 0
    for lid in sorted(set(a) | set(b)):
        la, lb = a.get(lid, {}), b.get(lid, {})
        for kind in ('zones', 'modules'):
            for k in sorted(set(la.get(kind, {})) | set(lb.get(kind, {}))):
                x, y = la.get(kind, {}).get(k), lb.get(kind, {}).get(k)
                if x is None or y is None:
                    print(f'  {lid} {kind[:-1]} {k}: {"missing after" if y is None else "new after"}'); diffs += 1; continue
                # Modules in auto-height columns grow with the generated music, which
                # differs every run: compare their x and width, not y and height.
                idx = (0, 1, 2, 3) if kind == 'zones' else (0, 2)
                d = max(abs(x['rect'][i] - y['rect'][i]) for i in idx)
                extra = [f for f in ('flow', 'zone', 'zoom', 'border') if f in x and x.get(f) != y.get(f)]
                if d > tol or extra:
                    print(f'  {lid} {kind[:-1]} {k}: {x["rect"]} -> {y["rect"]}' + (f' {[(f, x.get(f), y.get(f)) for f in extra]}' if extra else ''))
                    diffs += 1
    print(f'{diffs} difference(s) beyond {tol}px')
    return diffs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['shots', 'course', 'checks', 'geometry', 'compare'])
    ap.add_argument('files', nargs='*')
    ap.add_argument('--size', default='1440x900')
    ap.add_argument('--looks', default='')
    ap.add_argument('--only', default='')
    ap.add_argument('--out', default='')
    ap.add_argument('--shard', default='0/1', help='i/n: run every n-th check from the i-th, to split a run across browsers')
    a = ap.parse_args()
    if a.mode == 'compare':
        return 1 if compare_geometry(a.files[0], a.files[1]) else 0
    w, h = (int(x) for x in a.size.lower().split('x'))
    srv = serve(APP)
    url = f'http://127.0.0.1:{srv.server_address[1]}/modular-music-theory.html'
    b = Browser(w, h)
    try:
        if a.mode == 'shots':
            run_shots(b, url, [x for x in a.looks.split(',') if x],
                      a.out or os.path.join(HERE, 'out', f'{w}x{h}'))
            return 0
        if a.mode == 'course':
            run_course(b, url, a.out or os.path.join(HERE, 'out', f'course-{w}x{h}'))
            return 0
        if a.mode == 'geometry':
            run_geometry(b, url, [x for x in a.looks.split(',') if x],
                         a.out or os.path.join(HERE, 'out', f'geometry-{w}x{h}.json'))
            return 0
        print(f'checks at {w}x{h}')
        holder = {'b': b}

        def relaunch(old):
            try:
                old.close()
            except Exception:
                pass
            holder['b'] = Browser(w, h)
            return holder['b']
        try:
            si, sn = (int(x) for x in a.shard.split('/'))
            return run_checks(b, url, [x for x in a.only.split(',') if x], relaunch, (si, sn))
        finally:
            b = holder['b']
    finally:
        b.close()
        srv.shutdown()


if __name__ == '__main__':
    sys.exit(main())
