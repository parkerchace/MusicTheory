/**
 * Tutorial System - Easy Mode and Demo Mode for learning
 */
(function() {
    'use strict';
    
    // The tour follows how the studio actually works now: words in, music
    // out, then the tools that explain and play it. (It used to start from the
    // number generator, which no longer feeds the sheet, and pointed one step
    // at an element that does not exist.)
    const tutorialSteps = [
        {
            title: 'Welcome to Music Theory Studio',
            content: 'This studio turns words into music, and shows you why each note is there. This short tour covers the parts you will use most.',
            target: '#global-word-input',
            action: null
        },
        {
            title: 'Step 1: Start with words',
            content: 'Type a few words, like "chase, woods, dark", and press Generate. The words choose the key, the shape of the melody and the harmony.',
            target: '#global-word-input',
            action: null
        },
        {
            title: 'Step 2: The key you are in',
            content: 'Your key and scale live here in the top bar. Change them and every tool follows: the circle, the chords, the piano and the fretboard.',
            target: '#control-deck-keyscale-center',
            action: null
        },
        {
            title: 'Step 3: Read what you made',
            content: 'The score writes out what was generated. Open "Where the music comes from" to see the reason behind each choice.',
            target: '[data-module="sheet"]',
            action: null
        },
        {
            title: 'Step 4: Play it',
            content: 'Click a piano key, then play with your computer keyboard: Z S X D C… are notes, Q 2 W 3 E… are an octave up, and ← → change octave. Typing in a text box is never taken over.',
            target: '#instrument-dock-root',
            action: null
        },
        {
            title: 'Step 5: Play the chords of your scale',
            content: 'The switch on the ⌨ chip says what the keys play. Chords: Z X C V B N M are the scale\'s chords, I to vii, the row above adds sevenths, and the keys in between play the chord that leads into the next (hold Shift for this from any mode). Harmonize: the keys play a tune and a chord sounds under it. ⚙ sets how the chords are voiced.',
            target: '.qk-chip',
            action: null
        },
        {
            title: 'Step 6: Choose a look',
            content: 'The ⊞ button rearranges the same tools around a different idea: a signal chain, the score, your instrument, a lesson order. Remix any of them into a look of your own.',
            target: '#toggle-layout',
            action: null
        },
        {
            title: 'You\'re ready',
            content: 'Turn on Demo Mode in this help menu to see what any tool does when you hover over it.',
            target: '#help-dropdown-btn',
            action: null
        }
    ];

    const demoTooltips = {
        '#global-word-input': {
            title: 'Words in',
            content: 'Type words and press Generate. The words decide the key, the melody\'s shape and the harmony; the sheet explains each choice.'
        },
        '#scale-library-container': {
            title: 'Key and scale',
            content: 'Choose from hundreds of scales across different musical traditions. Every tool follows the key and scale chosen here.'
        },
        '#scale-circle-container': {
            title: 'Circle of fifths',
            content: 'All twelve keys, each a fifth from its neighbours. The lit notes are your scale, named the way your scale spells them.'
        },
        '#number-generator-container': {
            title: 'Number generator',
            content: 'Type or generate a progression as scale degrees (1 4 5 1). It plays on the chord strip and piano; generated pieces come from the words in the top bar.'
        },
        '#container-chord-container': {
            title: 'Container chord',
            content: 'Enter some notes and find the chords that contain them.'
        },
        '#scale-relationship-container': {
            title: 'Scale relations',
            content: 'Enter a chord and find the scales it lives in, rooted on any note.'
        },
        '[data-module="sheet"]': {
            title: 'The score',
            content: 'What was generated, written out. "Where the music comes from" explains it; "Adjust this take" changes it one thing at a time.'
        },
        '#piano-container': {
            title: 'Piano',
            content: 'Click keys to hear them, or play with your computer keyboard once you have clicked one. A MIDI keyboard works too.'
        },
        '.qk-chip': {
            title: 'Typing keyboard',
            content: 'Live when you have touched an instrument: Z…M and Q…P play notes, ← → octave, ↑ ↓ velocity, ` on and off, Esc stops. Hold Shift for chords.'
        },
        '.qk-modes': {
            title: 'What the keys play',
            content: 'Notes: one key, one note. Chords: Z X C V … are the scale\'s chords. Harmonize: the keys play a tune and a chord from the scale sounds under it. Each keeps its own octave.'
        },
        '.qk-chords-btn': {
            title: 'Chord and harmony settings',
            content: 'How the chords are voiced (the same choices as the sheet\'s Voicing menu, with voice leading from one chord to the next) and, for Harmonize, how often the chord changes and how long it rings.'
        },
        '#global-grading-type': {
            title: 'Grading View',
            content: 'Change how chords are colored: Functional (tonic/dominant), Emotional (happy/sad), or Color (synesthesia-inspired).'
        },
        '#theme-switcher': {
            title: 'Theme',
            content: 'Cycle through visual themes: Clean DAW, Channel Strip, Matrix FX, Steam 2000.'
        },
        '#toggle-layout': {
            title: 'Studio looks',
            content: 'Rearrange the same tools around a different idea: the signal chain, the score, your instrument, a lesson order. OG is the original layout. You can remix any look into your own.'
        }
    };
    
    let currentStep = 0;
    let easyModeActive = false;
    let demoModeActive = false;
    
    const overlay = document.getElementById('tutorial-overlay');
    const highlight = document.getElementById('tutorial-highlight');
    const tooltip = document.getElementById('tutorial-tooltip');
    const tooltipTitle = document.getElementById('tutorial-title');
    const tooltipContent = document.getElementById('tutorial-content');
    const progress = document.getElementById('tutorial-progress');
    const nextBtn = document.getElementById('tutorial-next');
    const skipBtn = document.getElementById('tutorial-skip');
    const demoTooltip = document.getElementById('demo-tooltip');
    const demoTooltipTitle = document.getElementById('demo-tooltip-title');
    const demoTooltipContent = document.getElementById('demo-tooltip-content');
    
    const easyModeBtn = document.getElementById('easy-mode-btn');
    const demoModeBtn = document.getElementById('demo-mode-btn');
    
    if (!easyModeBtn || !demoModeBtn) return;
    
    // Easy Mode Button
    easyModeBtn.addEventListener('click', () => {
        easyModeActive = !easyModeActive;
        
        if (easyModeActive) {
            startTutorial();
            easyModeBtn.style.color = 'var(--accent-secondary)';
            easyModeBtn.style.borderColor = 'var(--accent-secondary)';
            
            if (!document.querySelector('.easy-mode-badge')) {
                const badge = document.createElement('div');
                badge.className = 'easy-mode-badge';
                badge.textContent = 'Easy Mode Active';
                document.body.appendChild(badge);
            }
        } else {
            stopTutorial();
            easyModeBtn.style.color = '';
            easyModeBtn.style.borderColor = '';
            
            const badge = document.querySelector('.easy-mode-badge');
            if (badge) badge.remove();
        }
    });
    
    // Demo Mode Button
    demoModeBtn.addEventListener('click', () => {
        demoModeActive = !demoModeActive;
        
        if (demoModeActive) {
            enableDemoMode();
            demoModeBtn.style.color = 'var(--accent-primary)';
            demoModeBtn.style.borderColor = 'var(--accent-primary)';
            
            if (!document.querySelector('.demo-mode-badge')) {
                const badge = document.createElement('div');
                badge.className = 'demo-mode-badge';
                badge.textContent = 'Demo Mode Active';
                document.body.appendChild(badge);
            }
        } else {
            disableDemoMode();
            demoModeBtn.style.color = '';
            demoModeBtn.style.borderColor = '';
            
            const badge = document.querySelector('.demo-mode-badge');
            if (badge) badge.remove();
        }
    });
    
    function startTutorial() {
        currentStep = 0;
        showTutorialStep();
    }
    
    function stopTutorial() {
        if (overlay) overlay.classList.remove('active');
        if (highlight) highlight.style.display = 'none';
        if (tooltip) tooltip.classList.remove('active');
        if (progress) progress.classList.remove('active');
        easyModeActive = false;
    }
    
    function showTutorialStep() {
        if (currentStep >= tutorialSteps.length) {
            stopTutorial();
            return;
        }
        
        const step = tutorialSteps[currentStep];
        
        if (tooltipTitle) tooltipTitle.textContent = step.title;
        if (tooltipContent) tooltipContent.textContent = step.content;
        
        if (progress) {
            progress.textContent = `Step ${currentStep + 1} of ${tutorialSteps.length}`;
            progress.classList.add('active');
        }
        
        if (overlay) overlay.classList.add('active');
        if (tooltip) tooltip.classList.add('active');
        
        const target = step.target ? document.querySelector(step.target) : null;
        const visible = !!target && target.getClientRects().length > 0 && target.getBoundingClientRect().width > 0;
        if (!visible) {
            // Nothing to point at (closed, docked, not in this look): no stale
            // highlight left on the previous step's target; centre the text.
            if (highlight) highlight.style.display = 'none';
            if (tooltip) {
                tooltip.style.left = Math.max(20, (window.innerWidth - tooltip.offsetWidth) / 2) + 'px';
                tooltip.style.top = Math.max(20, window.innerHeight * 0.3) + 'px';
            }
        }
        if (visible) {
            if (target && highlight) {
                const rect = target.getBoundingClientRect();
                highlight.style.display = 'block';
                highlight.style.left = rect.left + 'px';
                highlight.style.top = rect.top + 'px';
                highlight.style.width = rect.width + 'px';
                highlight.style.height = rect.height + 'px';
                
                positionTooltip(tooltip, rect);
                
                target.style.position = 'relative';
                target.style.zIndex = '10000';
            }
        }
        
        if (step.action) step.action();
        
        if (nextBtn) {
            nextBtn.textContent = currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';
        }
    }
    
    function positionTooltip(tooltip, targetRect) {
        if (!tooltip) return;
        const tooltipRect = tooltip.getBoundingClientRect();
        const padding = 20;
        
        let left = targetRect.right + padding;
        let top = targetRect.top;
        
        if (left + tooltipRect.width > window.innerWidth) {
            left = targetRect.left - tooltipRect.width - padding;
        }
        
        if (left < 0) {
            left = targetRect.left;
            top = targetRect.bottom + padding;
        }
        
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const prevStep = tutorialSteps[currentStep];
            if (prevStep && prevStep.target) {
                const prevTarget = document.querySelector(prevStep.target);
                if (prevTarget) prevTarget.style.zIndex = '';
            }
            
            currentStep++;
            showTutorialStep();
        });
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', stopTutorial);
    }
    
    function enableDemoMode() {
        Object.keys(demoTooltips).forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.addEventListener('mouseenter', handleDemoHover);
                el.addEventListener('mouseleave', handleDemoLeave);
            });
        });
    }
    
    function disableDemoMode() {
        Object.keys(demoTooltips).forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.removeEventListener('mouseenter', handleDemoHover);
                el.removeEventListener('mouseleave', handleDemoLeave);
            });
        });
        if (demoTooltip) demoTooltip.classList.remove('show');
    }
    
    function handleDemoHover(e) {
        const el = e.currentTarget;
        
        let tooltipData = null;
        for (const selector in demoTooltips) {
            if (el.matches(selector)) {
                tooltipData = demoTooltips[selector];
                break;
            }
        }
        
        if (!tooltipData || !demoTooltip) return;
        
        if (demoTooltipTitle) demoTooltipTitle.textContent = tooltipData.title;
        if (demoTooltipContent) demoTooltipContent.textContent = tooltipData.content;
        
        const rect = el.getBoundingClientRect();
        let left = rect.right + 10;
        let top = rect.top;
        
        if (left + 300 > window.innerWidth) left = rect.left - 310;
        if (left < 10) {
            left = rect.left;
            top = rect.bottom + 10;
        }
        
        demoTooltip.style.left = left + 'px';
        demoTooltip.style.top = top + 'px';
        demoTooltip.classList.add('show');
    }
    
    function handleDemoLeave() {
        if (demoTooltip) demoTooltip.classList.remove('show');
    }
    
    function startGuidedTour() {
        easyModeActive = true;
        startTutorial();
        if (easyModeBtn) {
            easyModeBtn.style.color = 'var(--accent-secondary)';
            easyModeBtn.style.borderColor = 'var(--accent-secondary)';
        }
        const badge = document.createElement('div');
        badge.className = 'easy-mode-badge';
        badge.textContent = 'Easy Mode Active';
        document.body.appendChild(badge);
    }

    // First-time visitor prompt: only trigger after launching the full studio.
    // An in-page card, not confirm(): a native dialog froze the whole page —
    // audio, animation, everything — until it was answered.
    function promptTutorialOnStudioLaunch() {
        let hasVisited = null;
        try { hasVisited = localStorage.getItem('music-theory-visited'); } catch (_) {}
        if (hasVisited || document.getElementById('tour-offer')) return;
        setTimeout(() => {
            const card = document.createElement('div');
            card.id = 'tour-offer';
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-label', 'Guided tour');
            card.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:9000;max-width:320px;' +
                'background:var(--bg-panel);color:var(--text-main);border:1px solid var(--accent-primary);' +
                'border-radius:6px;padding:14px 16px;box-shadow:0 12px 32px rgba(0,0,0,0.5);' +
                'font-family:var(--font-ui);font-size:0.85rem;line-height:1.45;';
            const text = document.createElement('div');
            text.textContent = 'Welcome! Want a guided tour of the basics?';
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end;';
            const no = document.createElement('button');
            no.type = 'button';
            no.className = 'btn';
            no.textContent = 'Not now';
            const yes = document.createElement('button');
            yes.type = 'button';
            yes.className = 'btn-primary';
            yes.textContent = 'Take the tour';
            row.appendChild(no);
            row.appendChild(yes);
            card.appendChild(text);
            card.appendChild(row);
            const done = (take) => {
                try { localStorage.setItem('music-theory-visited', 'true'); } catch (_) {}
                card.remove();
                if (take) startGuidedTour();
            };
            no.addEventListener('click', () => done(false));
            yes.addEventListener('click', () => done(true));
            card.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
            document.body.appendChild(card);
        }, 1000);
    }

    // Listen for launch-workspace-btn click to trigger tutorial prompt
    document.addEventListener('DOMContentLoaded', () => {
        const launchBtn = document.querySelector('#launch-workspace-btn');
        if (launchBtn) {
            launchBtn.addEventListener('click', promptTutorialOnStudioLaunch);
        }
    });
})();
