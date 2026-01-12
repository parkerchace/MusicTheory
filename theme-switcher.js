/**
 * Theme Switcher - Manages theme cycling and persistence
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
    
    // Load saved theme or use default
    let currentThemeIndex = 0;
    const savedTheme = localStorage.getItem('music-theory-theme');
    if (savedTheme && themeNames.includes(savedTheme)) {
        currentThemeIndex = themeNames.indexOf(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }
    
    // Update button text to show current theme
    themeSwitcher.textContent = `[${themeLabels[themeNames[currentThemeIndex]]}]`;
    
    // Cycle through themes on click
    themeSwitcher.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
        const newTheme = themeNames[currentThemeIndex];
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('music-theory-theme', newTheme);
        themeSwitcher.textContent = `[${themeLabels[newTheme]}]`;
        console.log('Theme switched to:', newTheme);
    });
    
    // Setup landing page theme button
    const landingThemeBtn = document.getElementById('landing-theme-toggle');
    if (landingThemeBtn) {
        landingThemeBtn.addEventListener('click', () => {
            currentThemeIndex = (currentThemeIndex + 1) % themeNames.length;
            const newTheme = themeNames[currentThemeIndex];
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('music-theory-theme', newTheme);
            themeSwitcher.textContent = `[${themeLabels[newTheme]}]`;
            console.log('Theme switched to:', newTheme);
        });
    }
})();
