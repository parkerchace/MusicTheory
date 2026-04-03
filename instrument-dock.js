// Instrument Dock controller
// - Switches between Piano-only, Guitar-only, or both.
// - Docks the GuitarFretboardVisualizer either in the right sidebar or in the bottom deck.

(function () {
    const STORAGE_KEYS = {
        showPiano: 'instrumentDockShowPiano',
        showGuitar: 'instrumentDockShowGuitar'
    };

    function $(id) {
        return document.getElementById(id);
    }

    function safeClosestModule(el) {
        if (!el) return null;
        return el.closest('.studio-module') || el.closest('.module') || el.parentElement;
    }

    function ensureVisible(el, visible) {
        if (!el) return;
        el.style.display = visible ? '' : 'none';
    }

    function clearElement(el) {
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    function moveGuitarMount(targetContainerId) {
        const target = $(targetContainerId);
        if (!target) return;

        const existingInstance = window.modularApp && window.modularApp.guitarFretboard;
        if (existingInstance && typeof existingInstance.mount === 'function') {
            clearElement(target);
            existingInstance.mount('#' + targetContainerId);
            return;
        }

        // Fallback: static mount (if the implementation exposes it)
        if (window.GuitarFretboardVisualizer && typeof window.GuitarFretboardVisualizer.mount === 'function') {
            clearElement(target);
            window.GuitarFretboardVisualizer.mount('#' + targetContainerId);
        }
    }

    function applyDockMode(mode) {
        const dockGrid = $('instrument-dock');
        const panePiano = $('instrument-pane-piano');
        const paneGuitar = $('instrument-pane-guitar');
        const dockGuitarContainer = $('guitar-dock-container');
        const sidebarGuitarContainer = $('guitar-fretboard-container');

        const sidebarGuitarModule = safeClosestModule(sidebarGuitarContainer);

        if (mode === 'piano') {
            if (dockGrid) dockGrid.style.gridTemplateColumns = '1fr';
            ensureVisible(panePiano, true);
            ensureVisible(paneGuitar, false);
            // Put guitar back in the sidebar (if the sidebar container exists)
            if (sidebarGuitarContainer) {
                ensureVisible(sidebarGuitarModule, true);
                moveGuitarMount('guitar-fretboard-container');
            }
        } else if (mode === 'guitar') {
            if (dockGrid) dockGrid.style.gridTemplateColumns = '1fr';
            ensureVisible(panePiano, false);
            ensureVisible(paneGuitar, true);
            // Dock guitar to the bottom deck and hide sidebar module to prevent duplicates
            ensureVisible(sidebarGuitarModule, false);
            if (dockGuitarContainer) moveGuitarMount('guitar-dock-container');
        } else {
            // both
            if (dockGrid) dockGrid.style.gridTemplateColumns = '1fr 1fr';
            ensureVisible(panePiano, true);
            ensureVisible(paneGuitar, true);
            ensureVisible(sidebarGuitarModule, false);
            if (dockGuitarContainer) moveGuitarMount('guitar-dock-container');
        }
    }

    function readBool(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            if (v === null || v === undefined) return fallback;
            return v === 'true';
        } catch (_) {
            return fallback;
        }
    }

    function writeBool(key, value) {
        try { localStorage.setItem(key, value ? 'true' : 'false'); } catch (_) {}
    }

    function getModeFromSelection(showPiano, showGuitar) {
        if (showPiano && showGuitar) return 'both';
        if (showPiano) return 'piano';
        if (showGuitar) return 'guitar';
        return 'both';
    }

    function togglePanel(panel, open) {
        if (!panel) return;
        panel.classList.toggle('open', !!open);
    }

    function init() {
        const btn = $('instrument-dock-settings-btn');
        const panel = $('instrument-dock-settings-panel');
        const cbPiano = $('instrument-dock-show-piano');
        const cbGuitar = $('instrument-dock-show-guitar');

        if (!cbPiano || !cbGuitar) return;

        // Restore persisted state
        cbPiano.checked = readBool(STORAGE_KEYS.showPiano, true);
        cbGuitar.checked = readBool(STORAGE_KEYS.showGuitar, true);

        // Enforce at least one instrument selected
        if (!cbPiano.checked && !cbGuitar.checked) cbPiano.checked = true;

        const applyFromCheckboxes = () => {
            // Enforce at least one checked
            if (!cbPiano.checked && !cbGuitar.checked) {
                cbPiano.checked = true;
            }
            writeBool(STORAGE_KEYS.showPiano, cbPiano.checked);
            writeBool(STORAGE_KEYS.showGuitar, cbGuitar.checked);

            const mode = getModeFromSelection(cbPiano.checked, cbGuitar.checked);
            applyDockMode(mode);

            // If the app mounts modules after DOMContentLoaded, give it a moment and re-apply
            setTimeout(() => applyDockMode(mode), 250);
            setTimeout(() => applyDockMode(mode), 1000);
        };

        applyFromCheckboxes();

        cbPiano.addEventListener('change', applyFromCheckboxes);
        cbGuitar.addEventListener('change', applyFromCheckboxes);

        // Panel behavior (small cog, out of the way)
        if (btn && panel) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePanel(panel, !panel.classList.contains('open'));
            });

            document.addEventListener('click', (e) => {
                const anchor = btn.parentElement;
                if (panel.classList.contains('open') && anchor && !anchor.contains(e.target)) {
                    togglePanel(panel, false);
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') togglePanel(panel, false);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
