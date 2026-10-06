/**
 * Theme Switcher - Manages theme cycling and persistence
 *
 * The one handler for both theme buttons (studio header and landing page).
 * The page used to carry a second, inline copy that bound the same buttons;
 * the two only agreed because both counters happened to advance together.
 *
 * The header button stays an icon: the theme's name goes in its tooltip, not
 * its text, so a long name cannot push the rest of the header off the bar.
 */
(function() {
    'use strict';

    const themeSwitcher = document.getElementById('theme-switcher');
    if (!themeSwitcher) return;

    const themeNames = ['clean-daw', 'channel-strip', 'matrix-fx', 'steam-2000'];
    const themeLabels = {
        'clean-daw': 'Clean DAW',
        'channel-strip': 'Channel Strip',
        'matrix-fx': 'Matrix FX',
        'steam-2000': 'Steam 2000'
    };

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode */ } }
    };

    // Load saved theme or use default
    let currentThemeIndex = 0;
    const savedTheme = store.get('music-theory-theme');
    if (savedTheme && themeNames.includes(savedTheme)) {
        currentThemeIndex = themeNames.indexOf(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }

    function label() {
        const name = themeLabels[themeNames[currentThemeIndex]];
        const text = `Theme: ${name} (click for the next)`;
        themeSwitcher.textContent = '🎨';
        themeSwitcher.title = text;
        themeSwitcher.setAttribute('aria-label', text);
    }

    function next() {
        currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
        const newTheme = themeNames[currentThemeIndex];
        document.body.setAttribute('data-theme', newTheme);
        store.set('music-theory-theme', newTheme);
        label();
    }

    label();
    themeSwitcher.addEventListener('click', next);

    const landingThemeBtn = document.getElementById('landing-theme-toggle');
    if (landingThemeBtn) landingThemeBtn.addEventListener('click', next);
})();
