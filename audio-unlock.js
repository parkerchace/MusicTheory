/**
 * audio-unlock.js - lets sound through on phones. Load before anything makes an
 * AudioContext.
 *
 * A phone starts a context only from inside a real gesture, and a finger coming
 * down is not one: only lifting it (touchend, click) counts. The tools make their
 * contexts at load and call resume() from wherever they happen to be, so a key that
 * plays on pointerdown never wakes anything. This wakes every context on each
 * gesture, whoever made it, which also brings them back after a call or the app
 * going to the background (iOS leaves them "interrupted", not "suspended").
 *
 * An iPhone also files web audio under the ringer: with the side switch on silent
 * the page plays and nothing is heard. Asking for the "playback" session puts it
 * with music and video instead.
 */
(function () {
    var Native = window.AudioContext || window.webkitAudioContext;
    if (!Native) return;

    var contexts = [];

    class TrackedAudioContext extends Native {
        constructor() {
            super(...arguments);
            contexts.push(this);
        }
    }
    window.AudioContext = TrackedAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = TrackedAudioContext;

    // Older iOS only counts a context as started once a sound has been played on it
    function playSilence(ctx) {
        var source = ctx.createBufferSource();
        source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        source.connect(ctx.destination);
        source.start(0);
    }

    var sessionSet = false;
    function wake() {
        if (!sessionSet && navigator.audioSession) {
            sessionSet = true;
            try { navigator.audioSession.type = 'playback'; } catch (e) {}
        }
        contexts = contexts.filter(function (ctx) { return ctx.state !== 'closed'; });
        contexts.forEach(function (ctx) {
            if (ctx.state === 'running') return;
            try {
                if (!ctx._woken) { ctx._woken = true; playSilence(ctx); }
                ctx.resume();
            } catch (e) {}
        });
    }

    ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (type) {
        window.addEventListener(type, wake, { capture: true, passive: true });
    });
})();
