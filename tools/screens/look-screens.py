#!/usr/bin/env python3
"""Drive the studio in headless Chrome: screenshots of every look, and checks.

Stdlib only (this machine has no Node), plus the system Google Chrome.

    python3 tools/screens/look-screens.py shots  [--size 1440x900] [--looks og,focus]
    python3 tools/screens/look-screens.py checks [--size 1440x900] [--only name,...]

Run from the app folder or anywhere; paths resolve from this file.

`shots` launches the studio, generates a piece from "chase, woods, dark" (the
SCREEN-BLOAT.md method) and saves tools/screens/out/<WxH>/<look>.png.

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

    'undocking the guitar brings it back into the look': ({'music-theory-look': 'command-deck'}, True, """
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

    'zone order does not depend on the looks visited before': ({'music-theory-look': 'signal-chain'}, True, """
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
        StudioLooks.apply('orrery');
        await new Promise(r => setTimeout(r, 1500));
        window.removeEventListener('resize', h);
        return { ok: n === 1, detail: { resizeEvents: n } };
      })()"""),

    'divider moves with the keyboard and is remembered': ({'music-theory-look': 'two-up'}, True, """
      (async () => {
        if (innerWidth <= 1100) return { ok: true, detail: 'divider hidden at this width' };
        const d = document.querySelector('.look-divider');
        d.focus();
        for (let i = 0; i < 3; i++) d.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        const set = document.querySelector('.workspace').style.getPropertyValue('--look-split');
        StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 300));
        StudioLooks.apply('two-up'); await new Promise(r => setTimeout(r, 300));
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
        StudioLooks.apply('two-up'); await new Promise(r => setTimeout(r, 400));
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
    b.cdp.js("(async () => { StudioLooks.apply('signal-chain'); await new Promise(r => setTimeout(r, 400)); return 1; })()")
    opened = b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'signal-chain' }})")
    cur = b.cdp.js("StudioLooks.current()")
    before = b.cdp.js(f"({ZONE_OF})('circle')")
    builder_set(b, 'move-circle', 'c')
    after = b.cdp.js(f"({ZONE_OF})('circle')")
    ok = opened and cur == '__preview' and before == 'a' and after == 'c'
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
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'orrery' }})")
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
    b.cdp.js("(async () => { StudioLooks.apply('orrery'); await new Promise(r => setTimeout(r, 400)); return 1; })()")
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'orrery' }})")
    builder_set(b, 'move-solar', '')
    hidden_in_preview = b.cdp.js(f"({ZONE_OF})('solar')")
    b.cdp.js("(async () => { document.querySelector('.lb-close').click(); await new Promise(r => setTimeout(r, 600)); return 1; })()")
    st = b.cdp.js(f"""(() => ({{ current: StudioLooks.current(), solarZone: ({ZONE_OF})('solar'),
      stored: localStorage.getItem('music-theory-custom-looks') }}))()""")
    ok = hidden_in_preview is None and st['current'] == 'orrery' and st['solarZone'] == 'b' and not st['stored']
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
        'zones': {'a': {'modules': ['chordstrip', 'sheet']}, 'b': {'flow': 'column', 'modules': ['circle', 'grading']}}}})
    res_good = b.cdp.js(f"""(async () => {{ const ok = LookBuilder.importText({json.dumps(good)});
      await new Promise(r => setTimeout(r, 900));
      return {{ ok, panelOpen: !document.querySelector('.lb-panel').hidden, current: StudioLooks.current(),
               sheetZone: ({ZONE_OF})('sheet') }}; }})()""")
    ok = (res_bad['ok'] is False and res_bad['toast'] and 'cols' in res_bad['toast']
          and res_good['ok'] and res_good['panelOpen'] and res_good['current'] == '__preview' and res_good['sheetZone'] == 'a')
    return {'ok': ok, 'detail': {'bad': res_bad, 'good': res_good}}


def chk_builder_export_roundtrip(b):
    b.cdp.js(f"({OPEN_BUILDER})({{ mode: 'remix', id: 'lab-bench' }})")
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
    ok = (res['first'][0] == 'curriculum' and 'lab-bench' in res['adv'] and len(res['intent']) == 3
          and res['current'] == res['intent'][0])
    return {'ok': ok, 'detail': res}


def chk_captions_first_visit(b):
    res = b.cdp.js("""(async () => {
      const open = () => document.querySelector('.look-zone[data-zone="a"]').classList.contains('look-why-open');
      const shown = () => getComputedStyle(document.getElementById('look-why-a')).display !== 'none';
      StudioLooks.apply('signal-chain'); await new Promise(r => setTimeout(r, 300));
      const first = [open(), shown()];
      StudioLooks.apply('og'); await new Promise(r => setTimeout(r, 200));
      StudioLooks.apply('signal-chain'); await new Promise(r => setTimeout(r, 300));
      const second = [open(), shown()];
      document.querySelector('.look-zone[data-zone="a"] .look-why-toggle').click();
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
    b.cdp.js("(async () => { StudioLooks.apply('command-deck'); await new Promise(r => setTimeout(r, 500)); document.querySelector('.look-zone[data-flow=\"mosaic\"] > .look-item:not(.look-absent) > .module-header').focus(); return 1; })()")
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
    "a row zone's caption sits above its modules, not beside them": ({'music-theory-look': 'og'}, True, """
      (async () => {
        const out = {};
        for (const [id, z] of [['lab-bench', 'f'], ['split-brain', 'a'], ['split-brain', 'b']]) {
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
    'rail spines and tiles work from the keyboard': ({'music-theory-look': 'og'}, True, chk_keyboard_rails_and_tiles),
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
        const ctx = (document.querySelector('.current-context') || {}).textContent || '';
        const lit = c.state.scaleNotes.every(n => c.isNoteInScale(n));
        const ok = c.state.scaleType === 'dorian' && !order.includes('E#') && c.isNoteInScale('F') && c.labelForKey('F') === 'F'
                   && !/sharp|flat/i.test(ctx) && lit;
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
    'module zoom never shrinks text below 80%': ({'music-theory-look': 'og'}, True, """
      (async () => {
        let min = 1, where = null;
        for (const id of ['command-deck', 'orrery', 'lab-bench', 'split-brain', 'console']) {
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
    'typing keyboard: typing in the word box never plays a note': ({'music-theory-look': 'og'}, True, chk_typing_never_plays),
    'typing keyboard: touching the piano arms it; Z plays C3 on piano and fretboard': ({'music-theory-look': 'og'}, True, chk_touch_arms_and_plays),
    'typing keyboard: a burst of note keys while idle asks instead of playing': ({'music-theory-look': 'og'}, True, chk_cold_burst_asks),
    'typing keyboard: arrows move the octave; Escape disarms and stays in the studio': ({'music-theory-look': 'og'}, True, chk_octave_and_escape),
    'typing keyboard: backquote toggles it': ({'music-theory-look': 'og'}, True, chk_backquote_toggles),
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
    fresh(b, url, {'music-theory-look': 'og'})
    b.cdp.js(LAUNCH)
    print('generate:', b.cdp.js(GENERATE))
    ids = looks or b.cdp.js('StudioLooks.looks.map(l => l.id)')
    for lid in ids:
        b.cdp.js(f"(async () => {{ StudioLooks.apply({json.dumps(lid)}); await new Promise(r => setTimeout(r, 3200)); }})()")
        shot = b.cdp.call('Page.captureScreenshot', format='png')
        with open(os.path.join(out, f'{lid}.png'), 'wb') as f:
            f.write(base64.b64decode(shot['data']))
        print('  shot', lid)


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
    ap.add_argument('mode', choices=['shots', 'checks', 'geometry', 'compare'])
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
